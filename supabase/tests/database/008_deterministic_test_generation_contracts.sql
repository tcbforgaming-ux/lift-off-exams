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

select plan(43);

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
  ('00000000-0000-0000-0000-000000008001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'generator-a@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000008002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'generator-b@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000008003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'blueprint-admin@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000008004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'blueprint-owner@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

update public.profiles
set role = case
  when user_id = '00000000-0000-0000-0000-000000008003' then 'admin'
  when user_id = '00000000-0000-0000-0000-000000008004' then 'owner'
  else 'student'
end
where user_id in (
  '00000000-0000-0000-0000-000000008001',
  '00000000-0000-0000-0000-000000008002',
  '00000000-0000-0000-0000-000000008003',
  '00000000-0000-0000-0000-000000008004'
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
select
  ('81000000-0000-0000-0000-' || lpad(series.value::text, 12, '0'))::uuid,
  'Marketing',
  case when series.value % 2 = 0 then 'PI-MKT-A' else 'PI-MKT-B' end,
  case (series.value - 1) % 4
    when 0 then 'Scenario'
    when 1 then 'Definition'
    when 2 then 'Fill In The Blank'
    else 'All Except'
  end,
  'Deterministic fixture question ' || series.value,
  '[{"id":"A","text":"A"},{"id":"B","text":"B"},{"id":"C","text":"C"},{"id":"D","text":"D"}]'::jsonb,
  'A',
  'Fixture explanation ' || series.value,
  case series.value % 3 when 0 then 'Hard' when 1 then 'Easy' else 'Medium' end,
  case
    when series.value = 1 then array['Core', 'Overlap', 'Narrow']
    when series.value = 2 then array['Core', 'Overlap']
    else array['Core']
  end,
  case when series.value = 13 then 'Retired' else 'Active' end,
  encode(extensions.digest(convert_to('fixture-' || series.value, 'UTF8'), 'sha256'), 'hex'),
  '2026-08-01 00:00:00+00'::timestamptz + make_interval(secs => series.value),
  '2026-08-01 00:00:00+00'::timestamptz + make_interval(secs => series.value)
from generate_series(1, 16) series(value);

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
select
  ('82000000-0000-0000-0000-' || lpad(series.value::text, 12, '0'))::uuid,
  'Finance',
  'PI-FIN-' || ((series.value % 5) + 1),
  case (series.value - 1) % 4
    when 0 then 'Scenario'
    when 1 then 'Definition'
    when 2 then 'Fill In The Blank'
    else 'All Except'
  end,
  'Large deterministic fixture question ' || series.value,
  '[{"id":"A","text":"A"},{"id":"B","text":"B"},{"id":"C","text":"C"},{"id":"D","text":"D"}]'::jsonb,
  'B',
  'Large fixture explanation ' || series.value,
  case series.value % 3 when 0 then 'Hard' when 1 then 'Easy' else 'Medium' end,
  array['Large Pool', 'Finance'],
  'Active',
  '2026-08-02 00:00:00+00'::timestamptz + make_interval(secs => series.value),
  '2026-08-02 00:00:00+00'::timestamptz + make_interval(secs => series.value)
from generate_series(1, 260) series(value);

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
select
  ('83000000-0000-0000-0000-' || lpad(series.value::text, 12, '0'))::uuid,
  'Entrepreneurship',
  'PI-ENT',
  'Definition',
  'Insufficient fixture question ' || series.value,
  '[{"id":"A","text":"A"},{"id":"B","text":"B"},{"id":"C","text":"C"},{"id":"D","text":"D"}]'::jsonb,
  'C',
  'Insufficient fixture explanation ' || series.value,
  'Medium',
  array['Short Pool'],
  'Active',
  '2026-08-03 00:00:00+00'::timestamptz + make_interval(secs => series.value),
  '2026-08-03 00:00:00+00'::timestamptz + make_interval(secs => series.value)
from generate_series(1, 249) series(value);

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
  created_by,
  created_at
)
values
  (
    '84000000-0000-0000-0000-000000000001',
    'Deterministic Small Blueprint',
    'Marketing',
    'State',
    'Marketing',
    '1.0.0',
    '{"schema_version":1,"strata":[
      {"id":"scenario","priority":1,"count":1,"question_types":["S"],"difficulties":["E"],"tags":["Core"]},
      {"id":"definition","priority":2,"count":1,"question_types":["D"],"difficulties":["M"],"tags":["Core"]},
      {"id":"fill","priority":3,"count":1,"question_types":["F"],"difficulties":["H"],"tags":["Core"]},
      {"id":"all-except","priority":4,"count":1,"question_types":["A"],"tags":["Core"]}
    ]}'::jsonb,
    4,
    'Active',
    'Deterministic test fixture',
    '00000000-0000-0000-0000-000000008003',
    '2026-08-04 00:00:00+00'
  ),
  (
    '84000000-0000-0000-0000-000000000002',
    'Overlapping Strata Blueprint',
    'Marketing',
    'State',
    'Marketing',
    '1.0.0',
    '{"schema_version":1,"strata":[
      {"id":"broad","priority":2,"count":1,"tags":["Overlap"]},
      {"id":"narrow","priority":1,"count":1,"tags":["Overlap","Narrow"]}
    ]}'::jsonb,
    2,
    'Active',
    'Overlap allocation fixture',
    '00000000-0000-0000-0000-000000008003',
    '2026-08-04 00:00:01+00'
  ),
  (
    '84000000-0000-0000-0000-000000000003',
    'Maximum Test Blueprint',
    'Finance',
    'ICDC',
    'Finance',
    '1.0.0',
    '{"schema_version":1,"strata":[{"id":"finance","priority":1,"count":250,"tags":["Large Pool"]}]}'::jsonb,
    250,
    'Active',
    'Maximum count fixture',
    '00000000-0000-0000-0000-000000008003',
    '2026-08-04 00:00:02+00'
  ),
  (
    '84000000-0000-0000-0000-000000000004',
    'Insufficient Test Blueprint',
    'Entrepreneurship',
    'State',
    'Entrepreneurship',
    '1.0.0',
    '{"schema_version":1,"strata":[{"id":"entrepreneurship","priority":1,"count":250,"tags":["Short Pool"]}]}'::jsonb,
    250,
    'Active',
    'Insufficient count fixture',
    '00000000-0000-0000-0000-000000008003',
    '2026-08-04 00:00:03+00'
  ),
  (
    '84000000-0000-0000-0000-000000000005',
    'Over Limit Blueprint',
    'Finance',
    'ICDC',
    'Finance',
    '1.0.0',
    '{"schema_version":1,"strata":[{"id":"too-large","priority":1,"count":251,"tags":["Large Pool"]}]}'::jsonb,
    251,
    'Active',
    'Over-limit fixture',
    '00000000-0000-0000-0000-000000008003',
    '2026-08-04 00:00:04+00'
  );

select tests.authenticate_as('00000000-0000-0000-0000-000000008001', 'generator-a@example.test');

reset role;

select is(
  public.normalize_test_seed('000123'),
  '000123',
  'seed normalization preserves leading zeros'
);

select is(
  public.normalize_test_seed('seed-α'),
  'seed-α',
  'seed normalization preserves valid Unicode UTF-8 text'
);

select ok(
  tests.expect_fails($sql$select public.normalize_test_seed(' bad ')$sql$, 'whitespace'),
  'seed normalization rejects outer whitespace'
);

select ok(
  tests.expect_fails(
    $sql$select public.normalize_test_seed(repeat('x', 129))$sql$,
    '128 UTF-8 bytes'
  ),
  'seed normalization rejects oversized values'
);

select tests.authenticate_as('00000000-0000-0000-0000-000000008001', 'generator-a@example.test');

select is(
  public.canonicalize_test_blueprint('84000000-0000-0000-0000-000000000001', '1.0.0')
    #>> '{strata,0,question_types,0}',
  'Scenario',
  'canonical blueprint normalizes compact question types'
);

select is(
  public.canonicalize_test_blueprint('84000000-0000-0000-0000-000000000001', '1.0.0')
    ->> 'tag_semantics',
  'AND',
  'canonical blueprint persists AND tag semantics'
);

select is(
  public.canonicalize_test_blueprint('84000000-0000-0000-0000-000000000001', '1.0.0')
    #>> '{strata,0,difficulties,0}',
  'Easy',
  'canonical blueprint normalizes compact difficulties'
);

select ok(
  tests.expect_fails(
    $sql$select * from public.generate_test_from_blueprint(
      '84000000-0000-0000-0000-000000000005', '1.0.0', 251, 'seed', 'over-limit'
    )$sql$,
    'between 1 and 250'
  ),
  'a request for 251 questions is rejected'
);

select ok(
  tests.expect_fails(
    $sql$select * from public.generate_test_from_blueprint(
      '84000000-0000-0000-0000-000000000001', '1.0.0', 3, 'seed', 'count-mismatch'
    )$sql$,
    'must equal the approved blueprint total'
  ),
  'a requested count cannot silently change explicit blueprint strata'
);

create temporary table first_generation as
select *
from public.generate_test_from_blueprint(
  '84000000-0000-0000-0000-000000000001',
  '1.0.0',
  4,
  '000123',
  'small-first'
);

grant select on first_generation to anon, authenticated;

select ok((select success from first_generation), 'valid blueprint generation succeeds');
select is((select generation_status from first_generation), 'Ready', 'successful generation becomes Ready');
select is(length((select test_id from first_generation)), 12, 'server generates a 12-character Test ID');
select ok(
  (select test_id ~ '^[A-Z0-9]{12}$' from first_generation),
  'generated Test ID uses uppercase letters and numbers'
);
select is((select selected_count from first_generation), 4, 'generation selects exactly the requested count');
select is(
  (
    select count(*)::integer
    from public.test_definition_questions membership
    where membership.test_definition_id = (select test_definition_id from first_generation)
  ),
  4,
  'ordered membership persists all selected questions'
);
select is(
  (
    select count(distinct question_id)::integer
    from public.test_definition_questions membership
    where membership.test_definition_id = (select test_definition_id from first_generation)
  ),
  4,
  'one generated test cannot contain duplicate question IDs'
);
select is(
  (
    select array_agg(position order by position)
    from public.test_definition_questions membership
    where membership.test_definition_id = (select test_definition_id from first_generation)
  ),
  array[1, 2, 3, 4],
  'question positions are unique and contiguous'
);
select ok(
  not exists (
    select 1
    from public.test_definition_questions membership
    join public.questions question on question.id = membership.question_id
    where membership.test_definition_id = (select test_definition_id from first_generation)
      and question.lifecycle_state = 'Retired'
  ),
  'retired questions never enter a generated test'
);
select is(
  (select algorithm_version from public.test_ids where definition_id = (select test_definition_id from first_generation)),
  'sha256-strata-v1',
  'algorithm version is persisted'
);
select is(
  (select blueprint_snapshot ->> 'blueprint_version' from public.test_ids where definition_id = (select test_definition_id from first_generation)),
  '1.0.0',
  'immutable blueprint version metadata is persisted'
);

select is(
  (
    select array_agg(question_id order by position)
    from public.test_definition_questions
    where test_definition_id = (select test_definition_id from first_generation)
  ),
  array[
    '81000000-0000-0000-0000-000000000001'::uuid,
    '81000000-0000-0000-0000-000000000012'::uuid,
    '81000000-0000-0000-0000-000000000015'::uuid,
    '81000000-0000-0000-0000-000000000002'::uuid
  ],
  'golden seed fixture preserves the expected ordered question IDs'
);

create temporary table repeated_generation as
select *
from public.generate_test_from_blueprint(
  '84000000-0000-0000-0000-000000000001',
  '1.0.0',
  4,
  '000123',
  'small-second'
);

select is(
  (
    select array_agg(question_id order by position)
    from public.test_definition_questions
    where test_definition_id = (select test_definition_id from first_generation)
  ),
  (
    select array_agg(question_id order by position)
    from public.test_definition_questions
    where test_definition_id = (select test_definition_id from repeated_generation)
  ),
  'same blueprint, pool, seed, and algorithm produce the same ordered IDs'
);

create temporary table different_seed_generation as
select *
from public.generate_test_from_blueprint(
  '84000000-0000-0000-0000-000000000001',
  '1.0.0',
  4,
  'different-seed',
  'small-different-seed'
);

select isnt(
  (
    select array_agg(question_id order by position)
    from public.test_definition_questions
    where test_definition_id = (select test_definition_id from first_generation)
  ),
  (
    select array_agg(question_id order by position)
    from public.test_definition_questions
    where test_definition_id = (select test_definition_id from different_seed_generation)
  ),
  'a different seed changes selection or ordering when alternatives exist'
);

create temporary table idempotent_retry as
select *
from public.generate_test_from_blueprint(
  '84000000-0000-0000-0000-000000000001',
  '1.0.0',
  4,
  '000123',
  'small-first'
);

select is(
  (select test_definition_id from idempotent_retry),
  (select test_definition_id from first_generation),
  'an idempotent retry returns the original test definition'
);
select is(
  (select count(*)::integer from public.test_ids where created_by = '00000000-0000-0000-0000-000000008001' and idempotency_key = 'small-first'),
  1,
  'an idempotent retry does not create another test'
);
select ok(
  tests.expect_fails(
    $sql$select * from public.generate_test_from_blueprint(
      '84000000-0000-0000-0000-000000000001', '1.0.0', 4, 'changed-seed', 'small-first'
    )$sql$,
    'different generation request'
  ),
  'reusing an idempotency key for different inputs is rejected'
);

create temporary table overlap_generation as
select *
from public.generate_test_from_blueprint(
  '84000000-0000-0000-0000-000000000002',
  '1.0.0',
  2,
  'overlap-seed',
  'overlap-test'
);

select is(
  (
    select stratum_id
    from public.test_definition_questions
    where test_definition_id = (select test_definition_id from overlap_generation)
      and question_id = '81000000-0000-0000-0000-000000000001'
  ),
  'narrow',
  'most-constrained-first allocation reserves the overlapping narrow question'
);

create temporary table insufficient_generation as
select *
from public.generate_test_from_blueprint(
  '84000000-0000-0000-0000-000000000004',
  '1.0.0',
  250,
  'short-seed',
  'short-test'
);

select ok(not (select success from insufficient_generation), '249 eligible questions cannot satisfy a request for 250');
select is(
  (select shortage #>> '{unsatisfied_strata,0,available}' from insufficient_generation),
  '249',
  'shortage response reports the available count accurately'
);
select is(
  (select count(*)::integer from public.test_ids where idempotency_key = 'short-test'),
  0,
  'insufficient inventory leaves no partial test definition'
);

create temporary table maximum_generation as
select *
from public.generate_test_from_blueprint(
  '84000000-0000-0000-0000-000000000003',
  '1.0.0',
  250,
  'maximum-seed',
  'maximum-test'
);

select ok((select success from maximum_generation), 'a valid 250-question request succeeds');
select is((select selected_count from maximum_generation), 250, '250-question response records the exact selected count');
select is(
  (
    select count(*)::integer
    from public.test_definition_questions
    where test_definition_id = (select test_definition_id from maximum_generation)
  ),
  250,
  'a 250-question test persists exactly 250 relationships'
);
select is(
  (
    select max(position)
    from public.test_definition_questions
    where test_definition_id = (select test_definition_id from maximum_generation)
  ),
  250,
  '250-question positions remain contiguous through position 250'
);

select ok(
  tests.expect_denied($sql$
    insert into public.test_ids(
      id, category, question_count, pool_timestamp, created_by
    ) values (
      'CLIENTMADE01', 'Marketing', 1, now(), '00000000-0000-0000-0000-000000008001'
    )
  $sql$),
  'authenticated clients cannot submit their own Test ID'
);

select ok(
  tests.expect_denied($sql$
    insert into public.test_definition_questions(
      test_definition_id, question_id, position, stratum_id, content_hash, question_updated_at
    ) values (
      (select test_definition_id from first_generation),
      '81000000-0000-0000-0000-000000000016',
      5,
      'forged',
      'forged',
      now()
    )
  $sql$),
  'authenticated clients cannot forge generated membership'
);

reset role;
select tests.authenticate_as('00000000-0000-0000-0000-000000008002', 'generator-b@example.test');

select is(
  (select count(*)::integer from public.test_ids where definition_id = (select test_definition_id from first_generation)),
  0,
  'one user cannot directly read another user private test definition'
);
select is(
  (
    select count(*)::integer
    from public.get_generated_test_manifest((select test_id from first_generation))
  ),
  4,
  'an authenticated holder of an exact Test ID can retrieve its bounded launch manifest'
);

reset role;
select tests.authenticate_as('00000000-0000-0000-0000-000000008003', 'blueprint-admin@example.test');

select ok(
  (
    select success
    from public.generate_test_from_blueprint(
      '84000000-0000-0000-0000-000000000001', '1.0.0', 4, 'admin-seed', 'admin-generation'
    )
  ),
  'administrators can generate tests'
);

reset role;
select tests.authenticate_as('00000000-0000-0000-0000-000000008004', 'blueprint-owner@example.test');

select ok(
  (
    select success
    from public.generate_test_from_blueprint(
      '84000000-0000-0000-0000-000000000001', '1.0.0', 4, 'owner-seed', 'owner-generation'
    )
  ),
  'owners can generate tests'
);

reset role;
select tests.authenticate_anon();

select is(
  (
    select original_question_count
    from public.get_test_id_preview((select test_id from first_generation))
  ),
  4,
  'anonymous exact-code preview exposes safe test metadata'
);
select ok(
  tests.expect_denied($sql$
    select * from public.get_generated_test_manifest((select test_id from first_generation))
  $sql$),
  'anonymous users cannot launch a Test ID'
);

reset role;

update public.questions
set question_text = question_text || ' updated',
    updated_at = '2026-08-10 00:00:00+00'
where id = (
  select question_id
  from public.test_definition_questions
  where test_definition_id = (select test_definition_id from first_generation)
  order by position
  limit 1
);

select is(
  (
    select updated_question_count
    from public.get_test_id_preview((select test_id from first_generation))
  ),
  1,
  'preview reports questions changed after generation'
);

select * from finish();

rollback;
