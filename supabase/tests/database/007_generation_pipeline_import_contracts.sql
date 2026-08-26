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
      or sqlerrm ilike '%permission denied%'
      or sqlerrm ilike '%row-level security%' then
      return true;
    end if;
    raise notice 'Expected authorization denial, got [%] %', sqlstate, sqlerrm;
    return false;
end;
$$;

grant usage on schema tests to authenticated;
grant execute on all functions in schema tests to authenticated;

select plan(18);

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
  ('00000000-0000-0000-0000-000000007001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student-pipeline@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000007002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-pipeline@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000007003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-pipeline@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

update public.profiles
set role = case user_id
    when '00000000-0000-0000-0000-000000007002' then 'admin'
    when '00000000-0000-0000-0000-000000007003' then 'owner'
    else 'student'
  end,
  owner_state = 'active',
  owner_privileges_suspended = false
where user_id in (
  '00000000-0000-0000-0000-000000007001',
  '00000000-0000-0000-0000-000000007002',
  '00000000-0000-0000-0000-000000007003'
);

insert into public.generation_queue_v3 (
  id,
  partition_key,
  partition_keys,
  category,
  performance_indicator,
  indicator_code,
  scenario_needed,
  definition_needed,
  fill_needed,
  all_except_needed,
  priority
)
values
  (
    '70000000-0000-0000-0000-000000000001',
    'Marketing',
    '["Marketing","Business Administration Core"]'::jsonb,
    'Marketing',
    'PI-MERGED',
    'PI-MERGED',
    20,
    20,
    20,
    20,
    1
  ),
  (
    '70000000-0000-0000-0000-000000000002',
    'Finance',
    '["Finance"]'::jsonb,
    'Finance',
    'PI-SATISFIED',
    'PI-SATISFIED',
    0,
    0,
    0,
    0,
    2
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
  lifecycle_state
)
values
  ('Marketing', 'PI-MERGED', 'Scenario', 'Active scenario counts', '[{"id":"A","text":"A"},{"id":"B","text":"B"},{"id":"C","text":"C"},{"id":"D","text":"D"}]'::jsonb, 'A', 'Explanation', 'Easy', array['Marketing'], 'Active'),
  ('Marketing', 'PI-MERGED', 'definition', 'Active definition alias counts', '[{"id":"A","text":"A"},{"id":"B","text":"B"},{"id":"C","text":"C"},{"id":"D","text":"D"}]'::jsonb, 'A', 'Explanation', 'Medium', array['Marketing'], 'Active'),
  ('Marketing', 'PI-MERGED', 'Fill-in-the-Blank', 'Active fill alias counts', '[{"id":"A","text":"A"},{"id":"B","text":"B"},{"id":"C","text":"C"},{"id":"D","text":"D"}]'::jsonb, 'A', 'Explanation', 'Hard', array['Marketing'], 'Active'),
  ('Marketing', 'PI-MERGED', 'All Except', 'Active all-except counts', '[{"id":"A","text":"A"},{"id":"B","text":"B"},{"id":"C","text":"C"},{"id":"D","text":"D"}]'::jsonb, 'A', 'Explanation', 'Easy', array['Marketing'], 'Active'),
  ('Marketing', 'PI-MERGED', 'Scenario', 'Retired scenario does not count', '[{"id":"A","text":"A"},{"id":"B","text":"B"},{"id":"C","text":"C"},{"id":"D","text":"D"}]'::jsonb, 'A', 'Explanation', 'Easy', array['Marketing'], 'Retired');

select is(
  public.normalize_generated_question_type('Fill-in-the-Blank'),
  'F',
  'question-type aliases normalize to compact type codes'
);

select is(
  public.normalize_generated_difficulty('hard'),
  'H',
  'difficulty aliases normalize to compact difficulty codes'
);

select is(
  public.recalculate_generation_queue_needed(20),
  2,
  'queue recalculation touches existing generation rows'
);

select is(
  (
    select scenario_needed
    from public.generation_queue_v3
    where id = '70000000-0000-0000-0000-000000000001'
  ),
  19,
  'active scenario questions count toward target while retired questions do not'
);

select is(
  (
    select definition_needed
    from public.generation_queue_v3
    where id = '70000000-0000-0000-0000-000000000001'
  ),
  19,
  'legacy definition aliases count toward normalized targets'
);

select ok(
  (
    select partition_keys = '["Marketing", "Business Administration Core"]'::jsonb
    from public.generation_queue_v3
    where id = '70000000-0000-0000-0000-000000000001'
  ),
  'merged partition keys are retained as JSONB metadata'
);

select ok(
  (select row_count from public.build_deca_batch_jsonl(10) limit 1) = 2,
  'batch builder selects every generation-needed queue row'
);

select is(
  (
    select count(distinct line->>'custom_id')
    from regexp_split_to_table((select jsonl from public.build_deca_batch_jsonl(10) limit 1), E'\n') raw(line_text)
    cross join lateral (select raw.line_text::jsonb as line) parsed
  ),
  0::bigint,
  'second builder run is blocked while a batch is active'
);

select is(
  (
    select open_batch.status
    from public.deca_batch_jobs open_batch
    where open_batch.status = 'built'
    order by open_batch.created_at desc
    limit 1
  ),
  'built',
  'batch job remains built after claiming candidates'
);

select is(
  (
    select locked_queue.status
    from public.generation_queue_v3 locked_queue
    where locked_queue.id = '70000000-0000-0000-0000-000000000001'
  ),
  'locked',
  'candidate row is locked after JSONL build'
);

select is(
  (
    select source_custom_id
    from public.generated_question_candidates
    where false
    limit 1
  ),
  null,
  'candidate fixture starts without imported generated questions'
);

select is(
  (
    select imported_count
    from public.insert_generated_questions(
      '70000000-0000-0000-0000-000000000001',
      '[
        {"t":"S","q":"Generated scenario?","o":["A","B","C","D"],"a":0,"e":"A explains the scenario.","d":"E"},
        {"t":"definition","q":"Generated definition?","o":["A","B","C","D"],"a":"optionB","e":"B explains the definition.","d":"medium"}
      ]'::jsonb,
      'fixture-batch:queue-1'
    )
  ),
  2,
  'p_queue_id import inserts valid generated questions'
);

select is(
  (
    select count(*)::integer
    from public.generated_question_candidates
    where source_custom_id = '70000000-0000-0000-0000-000000000001'
  ),
  2,
  'queue id is retained as generated candidate source_custom_id'
);

select is(
  (
    select skipped_count
    from public.insert_generated_questions(
      '70000000-0000-0000-0000-000000000001',
      '[
        {"t":"S","q":"Generated scenario?","o":["A","B","C","D"],"a":0,"e":"A explains the scenario.","d":"E"},
        {"t":"definition","q":"Generated definition?","o":["A","B","C","D"],"a":"optionB","e":"B explains the definition.","d":"medium"}
      ]'::jsonb,
      'fixture-batch:queue-1'
    )
  ),
  2,
  'retrying the same import identity is idempotent'
);

select is(
  (
    select count(*)::integer
    from public.generation_import_receipts
    where import_identity = 'fixture-batch:queue-1'
  ),
  1,
  'import receipt is durable and unique'
);

select tests.authenticate_as('00000000-0000-0000-0000-000000007001', 'student-pipeline@example.test');

select ok(
  tests.expect_denied($sql$
    select * from public.search_generation_pipeline(25)
  $sql$),
  'standard users cannot view generation pipeline status'
);

reset role;
select tests.authenticate_as('00000000-0000-0000-0000-000000007002', 'admin-pipeline@example.test');

select ok(
  exists (
    select 1
    from public.search_generation_pipeline(25)
    where queue_id = '70000000-0000-0000-0000-000000000001'
      and partition_keys = '["Marketing", "Business Administration Core"]'::jsonb
  ),
  'administrators can view paginated pipeline status with merged partition keys'
);

reset role;
select tests.authenticate_as('00000000-0000-0000-0000-000000007003', 'owner-pipeline@example.test');

select ok(
  exists (
    select 1
    from public.search_generation_pipeline(25, null, null, 'queued')
  ),
  'owners can filter generation pipeline status'
);

select * from finish();

rollback;
