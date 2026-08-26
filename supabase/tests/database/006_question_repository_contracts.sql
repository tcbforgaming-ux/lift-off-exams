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
    jsonb_build_object(
      'sub', user_id::text,
      'email', email,
      'role', 'authenticated'
    )::text,
    true
  );
end;
$$;

create or replace function tests.expect_lives(sql text)
returns boolean
language plpgsql
as $$
begin
  execute sql;
  return true;
exception
  when others then
    raise notice 'Expected statement to succeed, got [%] %', sqlstate, sqlerrm;
    return false;
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
    if sqlerrm ilike '%required%'
      or sqlerrm ilike '%repository%'
      or sqlerrm ilike '%row-level security%'
      or sqlerrm ilike '%permission denied%' then
      return true;
    end if;
    raise notice 'Expected authorization denial, got [%] %', sqlstate, sqlerrm;
    return false;
end;
$$;

grant usage on schema tests to authenticated;
grant execute on all functions in schema tests to authenticated;

select plan(25);

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
  ('00000000-0000-0000-0000-000000006001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student-repo@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000006002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-repo@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000006003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-repo@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

update public.profiles
set role = case user_id
    when '00000000-0000-0000-0000-000000006002' then 'admin'
    when '00000000-0000-0000-0000-000000006003' then 'owner'
    else 'student'
  end,
  owner_state = 'active',
  owner_privileges_suspended = false
where user_id in (
  '00000000-0000-0000-0000-000000006001',
  '00000000-0000-0000-0000-000000006002',
  '00000000-0000-0000-0000-000000006003'
);

insert into public.questions (
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
  created_at,
  updated_at
)
select
  case when series.value % 2 = 0 then 'Marketing' else 'Finance' end,
  case when series.value % 3 = 0 then 'PI-REPO-A' else 'PI-REPO-B' end,
  case when series.value % 4 = 0 then 'Scenario' else 'Definition' end,
  'Repository contract sample question ' || series.value,
  '[{"id":"A","text":"A"},{"id":"B","text":"B"},{"id":"C","text":"C"},{"id":"D","text":"D"}]'::jsonb,
  'A',
  'Repository explanation ' || series.value,
  case when series.value % 3 = 0 then 'Hard' when series.value % 3 = 1 then 'Easy' else 'Medium' end,
  case when series.value % 2 = 0 then array['Marketing', 'Channel Management'] else array['Finance', 'Accounting'] end,
  case when series.value in (5, 6) then 'Retired' else 'Active' end,
  '2026-07-01 00:00:00+00'::timestamptz + make_interval(secs => series.value),
  '2026-07-01 00:00:00+00'::timestamptz + make_interval(secs => series.value)
from generate_series(1, 130) as series(value);

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
  created_at,
  updated_at
)
values
  (
    '60000000-0000-0000-0000-000000000001',
    'Marketing',
    'PI-TIE',
    'Definition',
    'Tie breaker lower uuid',
    '[{"id":"A","text":"A"},{"id":"B","text":"B"},{"id":"C","text":"C"},{"id":"D","text":"D"}]'::jsonb,
    'A',
    'Tie explanation',
    'Easy',
    array['Marketing'],
    'Active',
    '2026-07-02 00:00:00+00',
    '2026-07-02 00:00:00+00'
  ),
  (
    '60000000-0000-0000-0000-000000000002',
    'Marketing',
    'PI-TIE',
    'Definition',
    'Tie breaker higher uuid',
    '[{"id":"A","text":"A"},{"id":"B","text":"B"},{"id":"C","text":"C"},{"id":"D","text":"D"}]'::jsonb,
    'A',
    'Tie explanation',
    'Easy',
    array['Marketing'],
    'Active',
    '2026-07-02 00:00:00+00',
    '2026-07-02 00:00:00+00'
  );

select tests.authenticate_as('00000000-0000-0000-0000-000000006001', 'student-repo@example.test');

select ok(
  tests.expect_denied($sql$
    select * from public.search_question_repository(25)
  $sql$),
  'standard users cannot access the administrative repository RPC'
);

select ok(
  tests.expect_denied($sql$
    select * from public.search_question_repository(25)
  $sql$),
  'missing elevated role is denied repository access'
);

select ok(
  tests.expect_denied($sql$
    select public.set_question_lifecycle_state(
      (select id from public.questions where lifecycle_state = 'Active' limit 1),
      'Retired',
      'student attempt'
    )
  $sql$),
  'standard users cannot change lifecycle state through RPC'
);

select ok(
  tests.expect_denied($sql$
    update public.questions
    set lifecycle_state = 'Retired'
    where id = '60000000-0000-0000-0000-000000000001'
  $sql$),
  'standard users cannot directly update lifecycle state'
);

select ok(
  tests.expect_denied($sql$
    delete from public.questions
    where id = '60000000-0000-0000-0000-000000000001'
  $sql$),
  'application roles have no permanent question delete path'
);

reset role;
select tests.authenticate_as('00000000-0000-0000-0000-000000006002', 'admin-repo@example.test');

select ok(
  (select count(*) from public.search_question_repository(25)) = 25,
  'administrator repository query returns the requested bounded page'
);

select ok(
  (select count(*) from public.search_question_repository(500)) = 100,
  'repository query enforces the maximum page size'
);

select is(
  (select question_id from public.search_question_repository(5) limit 1),
  '60000000-0000-0000-0000-000000000002'::uuid,
  'pagination ordering uses updated_at desc with id desc tie-breaker'
);

select ok(
  (select bool_and(lifecycle_state = 'Active') from public.search_question_repository(50, null, null, null, 'Active')),
  'active lifecycle filter returns only active questions'
);

select ok(
  exists (
    select 1
    from public.search_question_repository(50, null, null, null, 'Retired')
    where lifecycle_state = 'Retired'
  ),
  'retired lifecycle filter exposes retired questions to administrators'
);

select ok(
  (select count(*) from public.search_question_repository(1, null, null, 'Repository')) = 1,
  'search remains paginated'
);

select ok(
  (select bool_or(has_next_page) from public.search_question_repository(1, null, null, 'Repository')),
  'search reports that another page exists when one is available'
);

select ok(
  (
    select bool_and(difficulty = 'Easy')
    from public.search_question_repository(30, null, null, null, 'Active', null, null, array['E'])
  ),
  'compact difficulty filters normalize to stored values'
);

select ok(
  (
    select bool_and(question_type = 'Scenario')
    from public.search_question_repository(30, null, null, null, 'Active', null, null, null, array['S'])
  ),
  'compact question-type filters normalize to stored values'
);

select ok(
  (
    select bool_and(partition_key = 'Marketing' and tags && array['Channel Management'])
    from public.search_question_repository(
      30,
      null,
      null,
      null,
      'Active',
      array['Marketing'],
      null,
      null,
      null,
      array['Channel Management']
    )
  ),
  'combined filters use AND semantics between filter groups and OR semantics within each group'
);

select ok(
  not public.is_question_eligible_for_test_generation(
    (select id from public.questions where lifecycle_state = 'Retired' limit 1)
  ),
  'retired questions are excluded from test-generation eligibility'
);

select ok(
  tests.expect_denied($sql$
    select public.set_question_lifecycle_state(
      '60000000-0000-0000-0000-000000000001',
      'Retired',
      'bad'
    )
  $sql$),
  'invalid lifecycle reason is denied'
);

select is(
  (
    select lifecycle_state
    from public.questions
    where id = '60000000-0000-0000-0000-000000000001'
  ),
  'Active',
  'failed lifecycle change leaves the question state unchanged'
);

select ok(
  tests.expect_lives($sql$
    select public.set_question_lifecycle_state(
      '60000000-0000-0000-0000-000000000001',
      'Retired',
      'Retire duplicate or outdated question'
    )
  $sql$),
  'administrator can retire an active question'
);

select is(
  (
    select lifecycle_state
    from public.questions
    where id = '60000000-0000-0000-0000-000000000001'
  ),
  'Retired',
  'retirement updates lifecycle state'
);

select is(
  (
    select count(*)::integer
    from public.question_lifecycle_events
    where question_id = '60000000-0000-0000-0000-000000000001'
      and previous_state = 'Active'
      and new_state = 'Retired'
  ),
  1,
  'lifecycle transition creates one audit event'
);

select ok(
  exists (
    select 1
    from public.admin_audit_logs
    where action = 'Question retired'
      and resource_id = '60000000-0000-0000-0000-000000000001'
  ),
  'lifecycle transition writes admin audit log'
);

select public.set_question_lifecycle_state(
  '60000000-0000-0000-0000-000000000001',
  'Retired',
  'Retry same retirement operation'
);

select is(
  (
    select count(*)::integer
    from public.question_lifecycle_events
    where question_id = '60000000-0000-0000-0000-000000000001'
  ),
  1,
  'repeated lifecycle requests are idempotent and do not duplicate audit events'
);

select ok(
  tests.expect_lives($sql$
    select public.set_question_lifecycle_state(
      '60000000-0000-0000-0000-000000000001',
      'Active',
      'Restore question after review'
    )
  $sql$),
  'administrator can restore a retired question'
);

reset role;
select tests.authenticate_as('00000000-0000-0000-0000-000000006003', 'owner-repo@example.test');

select ok(
  tests.expect_lives($sql$
    select public.set_question_lifecycle_state(
      '60000000-0000-0000-0000-000000000002',
      'Retired',
      'Owner retirement review'
    )
  $sql$),
  'owner can retire an active question'
);

select * from finish();

rollback;
