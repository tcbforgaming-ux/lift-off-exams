begin;

create extension if not exists pgtap with schema extensions;
create schema if not exists tests;

create or replace function tests.authenticate_as(user_id uuid, email text)
returns void
language plpgsql
as $$
begin
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', user_id::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', user_id::text, 'email', email, 'role', 'authenticated')::text,
    true
  );
end;
$$;

create or replace function tests.authenticate_anon()
returns void
language plpgsql
as $$
begin
  execute 'set local role anon';
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{}'::text, true);
end;
$$;

create or replace function tests.expect_fails(sql text, expected_message text)
returns boolean
language plpgsql
as $$
begin
  execute sql;
  return false;
exception
  when others then
    return sqlerrm ilike '%' || expected_message || '%';
end;
$$;

create or replace function tests.expect_denied(sql text)
returns boolean
language plpgsql
as $$
begin
  execute sql;
  return false;
exception
  when insufficient_privilege or check_violation then
    return true;
  when others then
    return sqlerrm ilike '%required%'
      or sqlerrm ilike '%permission denied%'
      or sqlerrm ilike '%row-level security%';
end;
$$;

grant usage on schema tests to anon, authenticated;
grant execute on all functions in schema tests to anon, authenticated;

select plan(30);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  ('00000000-0000-0000-0000-000000009001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'free@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000009002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'premium@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000009003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

update public.profiles
set role = case
      when user_id = '00000000-0000-0000-0000-000000009003' then 'admin'
      else 'student'
    end,
    account_tier = case
      when user_id = '00000000-0000-0000-0000-000000009002' then 'premium'
      else account_tier
    end
where user_id in (
  '00000000-0000-0000-0000-000000009001',
  '00000000-0000-0000-0000-000000009002',
  '00000000-0000-0000-0000-000000009003'
);

insert into public.subscriptions (
  user_id,
  status,
  current_period_end
)
values (
  '00000000-0000-0000-0000-000000009002',
  'active',
  now() + interval '30 days'
);

insert into public.questions (
  id,
  partition_key,
  performance_indicator,
  question_type,
  question_text,
  options,
  correct_option_id,
  explanation,
  difficulty,
  tags,
  lifecycle_state,
  question_hash,
  created_at,
  updated_at
)
values
  (
    '91000000-0000-0000-0000-000000000001',
    'Marketing',
    'SEC:001',
    'Scenario',
    'Protected question one?',
    '[{"id":"A","text":"A"},{"id":"B","text":"B"},{"id":"C","text":"C"},{"id":"D","text":"D"}]'::jsonb,
    'A',
    'Premium explanation one.',
    'Easy',
    array['Safety'],
    'Active',
    'safety-hash-1',
    '2026-08-20 00:00:00+00',
    '2026-08-20 00:00:00+00'
  ),
  (
    '91000000-0000-0000-0000-000000000002',
    'Marketing',
    'SEC:002',
    'Definition',
    'Protected question two?',
    '[{"id":"A","text":"A"},{"id":"B","text":"B"},{"id":"C","text":"C"},{"id":"D","text":"D"}]'::jsonb,
    'B',
    'Premium explanation two.',
    'Medium',
    array['Safety'],
    'Active',
    'safety-hash-2',
    '2026-08-20 00:00:01+00',
    '2026-08-20 00:00:01+00'
  );

insert into public.blueprint_versions (
  id,
  blueprint_name,
  cluster,
  level,
  category,
  version,
  distribution,
  total_questions,
  status,
  change_reason,
  created_by
)
values (
  '92000000-0000-0000-0000-000000000001',
  'Safety Blueprint',
  'Marketing',
  'State',
  'Marketing',
  '1.0.0',
  '{"schema_version":1,"strata":[{"id":"safety","count":2,"tags":["Safety"]}]}'::jsonb,
  2,
  'Active',
  'Safety contract fixture',
  '00000000-0000-0000-0000-000000009003'
);

insert into public.test_ids (
  id,
  category,
  question_count,
  pool_timestamp,
  created_by,
  blueprint_snapshot
)
values
  ('LEGACY000001', 'Marketing', 2, now(), '00000000-0000-0000-0000-000000009001', '{"blueprint_name":"Legacy One","blueprint_version":"legacy"}'::jsonb),
  ('LEGACY000002', 'Marketing', 2, now(), '00000000-0000-0000-0000-000000009001', '{"blueprint_name":"Legacy Two","blueprint_version":"legacy"}'::jsonb),
  ('LEGACY000003', 'Marketing', 2, now(), '00000000-0000-0000-0000-000000009001', '{"blueprint_name":"Legacy Three","blueprint_version":"legacy"}'::jsonb),
  ('LEGACY000004', 'Marketing', 2, now(), '00000000-0000-0000-0000-000000009001', '{"blueprint_name":"Legacy Four","blueprint_version":"legacy"}'::jsonb);

select tests.authenticate_as('00000000-0000-0000-0000-000000009001', 'free@example.test');

create temporary table ready_test as
select *
from public.generate_test_from_blueprint(
  '92000000-0000-0000-0000-000000000001',
  '1.0.0',
  2,
  'safety-seed',
  'safety-ready-test'
);

grant select on ready_test to anon, authenticated;

select is(
  (select count(*)::integer from public.questions),
  0,
  'authenticated standard users see no protected question rows through staff-only RLS'
);

select is(
  (
    select count(*)::integer
    from public.get_generated_test_manifest((select test_id from ready_test))
  ),
  2,
  'the bounded manifest RPC still returns launch content after direct reads are revoked'
);

select ok(
  tests.expect_fails(
    format(
      'select * from public.get_test_question_explanation(%L, %L::uuid)',
      (select test_id from ready_test),
      '91000000-0000-0000-0000-000000000001'
    ),
    'Premium access'
  ),
  'free users cannot retrieve explanations'
);

select ok(
  tests.expect_denied($sql$
    select public.has_premium_explanation_access(
      '00000000-0000-0000-0000-000000009002'
    )
  $sql$),
  'browser users cannot probe another account subscription through the private helper'
);

select is(
  (
    select content_policy
    from public.test_ids
    where definition_id = (select test_definition_id from ready_test)
  ),
  'current_with_warning',
  'generated definitions explicitly record the current-content warning policy'
);

select is(
  (
    select original_question_count
    from public.get_test_id_preview('LEGACY000001')
  ),
  2,
  'unresolved legacy Test IDs retain a safe preview'
);

select is(
  (
    select launch_available
    from public.get_test_id_preview('LEGACY000001')
  ),
  false,
  'unresolved legacy Test IDs cannot launch'
);

select is(
  (
    select count(*)::integer
    from public.get_generated_test_manifest('LEGACY000001')
  ),
  0,
  'the manifest RPC returns no content for unresolved legacy Test IDs'
);

select ok(
  tests.expect_denied($sql$
    select public.backfill_legacy_test_membership(
      'LEGACY000001',
      array[
        '91000000-0000-0000-0000-000000000001'::uuid,
        '91000000-0000-0000-0000-000000000002'::uuid
      ],
      'Student should not backfill'
    )
  $sql$),
  'students cannot backfill legacy membership'
);

select ok(
  tests.expect_denied($sql$
    select public.resolve_legacy_test_id(
      'LEGACY000003',
      'Retired',
      null,
      'Student should not resolve'
    )
  $sql$),
  'students cannot resolve legacy Test IDs'
);

select is(
  (select count(*)::integer from public.legacy_test_id_resolutions),
  0,
  'students see no rows from the legacy resolution audit table'
);

reset role;
select tests.authenticate_as('00000000-0000-0000-0000-000000009002', 'premium@example.test');

select is(
  (
    select explanation
    from public.get_test_question_explanation(
      (select test_id from ready_test),
      '91000000-0000-0000-0000-000000000001'
    )
  ),
  'Premium explanation one.',
  'an active premium subscriber can retrieve an in-test explanation'
);

select ok(
  tests.expect_fails(
    format(
      'select * from public.get_test_question_explanation(%L, %L::uuid)',
      (select test_id from ready_test),
      '00000000-0000-0000-0000-000000000999'
    ),
    'not part'
  ),
  'premium access cannot retrieve an explanation outside the Test ID membership'
);

reset role;
select tests.authenticate_as('00000000-0000-0000-0000-000000009003', 'admin@example.test');

select is(
  (
    select explanation
    from public.get_test_question_explanation(
      (select test_id from ready_test),
      '91000000-0000-0000-0000-000000000002'
    )
  ),
  'Premium explanation two.',
  'administrators can inspect explanations without a paid subscription'
);

select is(
  public.backfill_legacy_test_membership(
    'LEGACY000001',
    array[
      '91000000-0000-0000-0000-000000000002'::uuid,
      '91000000-0000-0000-0000-000000000001'::uuid
    ],
    'Exact ordered source list recovered'
  ),
  2,
  'staff can backfill an exact ordered legacy membership'
);

select is(
  (select generation_status from public.get_test_id_preview('LEGACY000001')),
  'Ready',
  'successful legacy backfill promotes the definition to Ready'
);

select is(
  (
    select array_agg(question_id order by question_position)
    from public.get_generated_test_manifest('LEGACY000001')
  ),
  array[
    '91000000-0000-0000-0000-000000000002'::uuid,
    '91000000-0000-0000-0000-000000000001'::uuid
  ],
  'legacy backfill preserves the supplied question order exactly'
);

select is(
  (
    select resolution_status
    from public.legacy_test_id_resolutions
    where legacy_test_id = 'LEGACY000001'
  ),
  'Backfilled',
  'legacy backfill creates an audited resolution record'
);

select is(
  (
    select launch_available
    from public.get_test_id_preview('LEGACY000001')
  ),
  true,
  'a completely backfilled legacy Test ID becomes launchable'
);

select ok(
  tests.expect_fails($sql$
    select public.backfill_legacy_test_membership(
      'LEGACY000002',
      array[
        '91000000-0000-0000-0000-000000000001'::uuid,
        '91000000-0000-0000-0000-000000000001'::uuid
      ],
      'Duplicate list must be rejected'
    )
  $sql$, 'duplicate'),
  'legacy backfill rejects duplicate question IDs'
);

select lives_ok(
  $sql$
    select public.resolve_legacy_test_id(
      'LEGACY000003',
      'Retired',
      null,
      'Original membership unavailable'
    )
  $sql$,
  'staff can explicitly retire an unrecoverable legacy Test ID'
);

select is(
  (select generation_status from public.get_test_id_preview('LEGACY000003')),
  'Retired',
  'retired legacy resolution updates the Test ID lifecycle'
);

select is(
  (select launch_available from public.get_test_id_preview('LEGACY000003')),
  false,
  'retired legacy Test IDs remain previewable but cannot launch'
);

select lives_ok(
  format(
    'select public.resolve_legacy_test_id(%L, %L, %L, %L)',
    'LEGACY000004',
    'Replaced',
    (select test_id from ready_test),
    'Original membership unavailable; replacement generated'
  ),
  'staff can map an unrecoverable legacy ID to a complete replacement'
);

select is(
  (
    select replacement_test_id
    from public.get_test_id_preview('LEGACY000004')
  ),
  (select test_id from ready_test),
  'legacy preview exposes the audited replacement Test ID'
);

reset role;

select lives_ok(
  $sql$insert into public.deca_batch_jobs(status) values ('imported')$sql$,
  'the batch contract accepts the importer terminal status'
);

select lives_ok(
  $sql$insert into public.deca_batch_jobs(status) values ('completed')$sql$,
  'the batch contract retains the completed paging status'
);

select ok(
  tests.expect_fails(
    $sql$insert into public.deca_batch_jobs(status) values ('unknown')$sql$,
    'deca_batch_jobs_status_check'
  ),
  'the batch contract still rejects unknown statuses'
);

select tests.authenticate_anon();

select ok(
  tests.expect_denied($sql$select * from public.questions limit 1$sql$),
  'anonymous users cannot read protected question rows directly'
);

select ok(
  tests.expect_denied($sql$
    select * from public.get_test_question_explanation(
      'LEGACY000001',
      '91000000-0000-0000-0000-000000000001'
    )
  $sql$),
  'anonymous users cannot retrieve explanations'
);

select * from finish();

rollback;
