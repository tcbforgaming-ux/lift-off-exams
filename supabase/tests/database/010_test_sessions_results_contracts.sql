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
  when insufficient_privilege or check_violation then return true;
  when others then
    return sqlerrm ilike '%permission denied%'
      or sqlerrm ilike '%row-level security%'
      or sqlerrm ilike '%required%';
end;
$$;

grant usage on schema tests to authenticated;
grant execute on all functions in schema tests to authenticated;

select plan(50);

select ok(
  has_table_privilege('service_role', 'public.test_definition_questions', 'DELETE'),
  'trusted backend can maintain deterministic test memberships'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000010001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'session-free@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000010002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'session-other@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.questions (
  id, partition_key, performance_indicator, question_type, question_text,
  options, correct_option_id, explanation, difficulty, tags,
  lifecycle_state, question_hash, created_at, updated_at
)
select
  ('a7000000-0000-0000-0000-' || lpad(series.value::text, 12, '0'))::uuid,
  'Finance',
  'M7:' || series.value,
  'Scenario',
  'Milestone 7 fixture question ' || series.value,
  '[{"id":"A","text":"Correct"},{"id":"B","text":"Wrong B"},{"id":"C","text":"Wrong C"},{"id":"D","text":"Wrong D"}]'::jsonb,
  'A',
  'Protected explanation ' || series.value,
  case series.value % 3 when 0 then 'Hard' when 1 then 'Easy' else 'Medium' end,
  array['Milestone 7', 'Finance'],
  'Active',
  encode(extensions.digest(convert_to('m7-' || series.value, 'UTF8'), 'sha256'), 'hex'),
  '2026-08-26 00:00:00+00'::timestamptz + make_interval(secs => series.value),
  '2026-08-26 00:00:00+00'::timestamptz + make_interval(secs => series.value)
from generate_series(1, 250) series(value);

insert into public.test_ids (
  id, definition_id, mode, category, difficulties, topic_tags,
  question_count, pool_timestamp, created_by, blueprint_snapshot,
  canonical_seed, algorithm_version, eligibility_rule_version,
  generation_status, selected_question_count, completed_at
)
values
  (
    'M7SMALL00001', 'a7100000-0000-0000-0000-000000000001', 'Test', 'Finance',
    array['Easy', 'Medium', 'Hard'], array['Milestone 7'], 4, now(),
    '00000000-0000-0000-0000-000000010001',
    '{"blueprint_name":"Milestone 7 Small","version":"1.0.0"}'::jsonb,
    'm7-small', 'sha256-strata-v1', 'active-complete-v1', 'Ready', 4, now()
  ),
  (
    'M7LARGE00001', 'a7100000-0000-0000-0000-000000000002', 'Test', 'Finance',
    array['Easy', 'Medium', 'Hard'], array['Milestone 7'], 250, now(),
    '00000000-0000-0000-0000-000000010001',
    '{"blueprint_name":"Milestone 7 Large","version":"1.0.0"}'::jsonb,
    'm7-large', 'sha256-strata-v1', 'active-complete-v1', 'Ready', 250, now()
  );

insert into public.test_definition_questions (
  test_definition_id, question_id, position, stratum_id,
  content_hash, question_updated_at
)
select
  'a7100000-0000-0000-0000-000000000001',
  question.id,
  row_number() over (order by question.id),
  'small',
  question.question_hash,
  question.updated_at
from public.questions question
order by question.id
limit 4;

insert into public.test_definition_questions (
  test_definition_id, question_id, position, stratum_id,
  content_hash, question_updated_at
)
select
  'a7100000-0000-0000-0000-000000000002',
  question.id,
  row_number() over (order by question.id),
  'large',
  question.question_hash,
  question.updated_at
from public.questions question
order by question.id;

create temporary table m7_runtime (
  key text primary key,
  value text not null
);
grant all on m7_runtime to authenticated;

select has_table('public', 'test_sessions', 'test_sessions exists');
select has_table('public', 'test_session_questions', 'test_session_questions exists');
select has_table('public', 'test_session_answers', 'test_session_answers exists');
select has_table('public', 'test_results', 'test_results exists');
select has_table('public', 'test_result_items', 'test_result_items exists');

select is(
  (select count(*)::integer from pg_class
   where oid in ('public.test_sessions'::regclass, 'public.test_session_questions'::regclass,
     'public.test_session_answers'::regclass, 'public.test_results'::regclass,
     'public.test_result_items'::regclass) and relrowsecurity),
  5,
  'RLS is enabled on every Milestone 7 table'
);

select tests.authenticate_as('00000000-0000-0000-0000-000000010001', 'session-free@example.test');

select ok(
  tests.expect_denied($sql$
    insert into public.user_active_sessions(user_id, session_type)
    values ('00000000-0000-0000-0000-000000010001', 'unsafe-client-state')
  $sql$),
  'deprecated session storage is not client writable'
);

insert into m7_runtime(key, value)
select 'free_session', session_id::text
from public.start_test_session('M7SMALL00001', 'free-start-1');

select ok(
  (select value::uuid is not null from m7_runtime where key = 'free_session'),
  'session IDs are generated by the server'
);

select is(
  (select max(total_questions) from public.get_test_session((select value::uuid from m7_runtime where key = 'free_session'))),
  4,
  'starting a session preserves the Test ID question count'
);

select is(
  (select array_agg(question_id order by question_position)::text
   from public.get_test_session((select value::uuid from m7_runtime where key = 'free_session'))),
  (select array_agg(question_id order by position)::text
   from public.test_definition_questions
   where test_definition_id = 'a7100000-0000-0000-0000-000000000001'),
  'the session uses exact persisted Milestone 6 order'
);

select is(
  (select session_id::text from public.start_test_session('M7SMALL00001', 'free-start-1')),
  (select value from m7_runtime where key = 'free_session'),
  'repeating a start idempotency key returns the same session'
);

select is(
  (select session_id::text from public.start_test_session('M7SMALL00001', 'free-start-2')),
  (select value from m7_runtime where key = 'free_session'),
  'a second start returns the existing unfinished attempt'
);

reset role;
select tests.authenticate_as('00000000-0000-0000-0000-000000010002', 'session-other@example.test');

select ok(
  tests.expect_fails(
    format('select * from public.get_test_session(%L::uuid)', (select value from m7_runtime where key = 'free_session')),
    'not found'
  ),
  'another user cannot read a session by ID'
);

reset role;
select ok(
  pg_get_function_result('public.get_test_session(uuid)'::regprocedure) not ilike '%correct_option%'
    and pg_get_function_result('public.get_test_session(uuid)'::regprocedure) not ilike '%explanation%',
  'the pre-submission session response has no answer keys or explanations'
);

select tests.authenticate_as('00000000-0000-0000-0000-000000010001', 'session-free@example.test');

insert into m7_runtime(key, value)
select 'question_one', question_id::text
from public.get_test_session((select value::uuid from m7_runtime where key = 'free_session'))
where question_position = 1;

insert into m7_runtime(key, value)
select 'version', session_version::text
from public.get_test_session((select value::uuid from m7_runtime where key = 'free_session'))
limit 1;

insert into m7_runtime(key, value)
select 'save_version', session_version::text
from public.save_test_session_answer(
  (select value::uuid from m7_runtime where key = 'free_session'),
  (select value::uuid from m7_runtime where key = 'question_one'),
  'B',
  (select value::bigint from m7_runtime where key = 'version')
);

select is((select value::bigint from m7_runtime where key = 'save_version'), 2::bigint, 'saving an answer advances the session version');
select is((select max(answered_questions) from public.get_test_session((select value::uuid from m7_runtime where key = 'free_session'))), 1, 'saving an answer updates trusted progress');

update m7_runtime set value = result.answer_version::text
from public.save_test_session_answer(
  (select value::uuid from m7_runtime where key = 'free_session'),
  (select value::uuid from m7_runtime where key = 'question_one'),
  'B',
  (select value::bigint from m7_runtime where key = 'save_version')
) result
where key = 'version';

select is((select value::bigint from m7_runtime where key = 'version'), 2::bigint, 'changing an answer advances its answer version');
select is((select max(answered_questions) from public.get_test_session((select value::uuid from m7_runtime where key = 'free_session'))), 1, 'changing an answer does not increase progress');

select ok(
  tests.expect_fails(
    format(
      'select * from public.save_test_session_answer(%L::uuid,%L::uuid,%L,%s)',
      (select value from m7_runtime where key = 'free_session'),
      (select value from m7_runtime where key = 'question_one'), 'E', 3
    ), 'A, B, C, or D'
  ),
  'invalid option IDs are rejected'
);

select ok(
  tests.expect_fails(
    format(
      'select * from public.save_test_session_answer(%L::uuid,%L::uuid,%L,%s)',
      (select value from m7_runtime where key = 'free_session'),
      'a7000000-0000-0000-0000-000000000250', 'A', 3
    ), 'does not belong'
  ),
  'questions outside the session cannot be answered'
);

select ok(
  tests.expect_fails(
    format(
      'select * from public.save_test_session_answer(%L::uuid,%L::uuid,%L,%s)',
      (select value from m7_runtime where key = 'free_session'),
      (select value from m7_runtime where key = 'question_one'), 'A', 1
    ), 'version conflict'
  ),
  'stale answer writes are rejected'
);

update m7_runtime
set value = public.pause_test_session(
  (select value::uuid from m7_runtime where key = 'free_session'), 3
)::text
where key = 'version';

select is((select value::bigint from m7_runtime where key = 'version'), 4::bigint, 'pause advances the session version');
select is((select max(session_status) from public.get_test_session((select value::uuid from m7_runtime where key = 'free_session'))), 'paused', 'pause persists server-side');

select ok(
  tests.expect_fails(
    format(
      'select * from public.save_test_session_answer(%L::uuid,%L::uuid,%L,%s)',
      (select value from m7_runtime where key = 'free_session'),
      (select value from m7_runtime where key = 'question_one'), 'A', 4
    ), 'in progress'
  ),
  'paused answers cannot be changed'
);

select ok(
  tests.expect_fails(
    format('select public.pause_test_session(%L::uuid,4)', (select value from m7_runtime where key = 'free_session')),
    'in-progress'
  ),
  'repeated pause is rejected'
);

update m7_runtime
set value = public.resume_test_session(
  (select value::uuid from m7_runtime where key = 'free_session'), 4
)::text
where key = 'version';

select is((select value::bigint from m7_runtime where key = 'version'), 5::bigint, 'resume advances the session version');
select is((select selected_option_id from public.get_test_session((select value::uuid from m7_runtime where key = 'free_session')) where question_position = 1), 'B', 'pause and resume preserve saved answers');

update m7_runtime
set value = result.session_version::text
from public.save_test_session_answer(
  (select value::uuid from m7_runtime where key = 'free_session'),
  (select value::uuid from m7_runtime where key = 'question_one'),
  'A', 5
) result
where key = 'version';

select is((select value::bigint from m7_runtime where key = 'version'), 6::bigint, 'answering after resume remains supported');

select is(
  (select correct_answers from public.submit_test_session(
    (select value::uuid from m7_runtime where key = 'free_session'), 6)),
  1,
  'submission calculates correctness from trusted question data'
);

select is((select percentage from public.get_test_result((select value::uuid from m7_runtime where key = 'free_session')) limit 1), 25.00::numeric, 'percentage uses explicit two-decimal scoring');
select is((select session_status from public.get_test_session((select value::uuid from m7_runtime where key = 'free_session')) limit 1), 'submitted', 'submission makes the session terminal');
select is((select count(distinct session_id)::integer from public.get_test_result((select value::uuid from m7_runtime where key = 'free_session'))), 1, 'submission creates one authoritative result');
select is((select count(*)::integer from public.get_test_result((select value::uuid from m7_runtime where key = 'free_session'))), 4, 'submission snapshots every result item');

select is(
  (select count(*)::integer from public.submit_test_session(
    (select value::uuid from m7_runtime where key = 'free_session'), 1)),
  1,
  'repeated submission returns the same result'
);

select ok(
  tests.expect_fails(
    format(
      'select * from public.save_test_session_answer(%L::uuid,%L::uuid,%L,%s)',
      (select value from m7_runtime where key = 'free_session'),
      (select value from m7_runtime where key = 'question_one'), 'B', 7
    ), 'in progress'
  ),
  'submitted answers cannot be changed'
);

select is((select correct_option_id from public.get_test_result((select value::uuid from m7_runtime where key = 'free_session')) where question_position = 1), 'A', 'free users may review correct answers after submission');
select is((select bool_or(can_view_explanations) from public.get_test_result((select value::uuid from m7_runtime where key = 'free_session'))), false, 'missing entitlement defaults to no explanation access');

select ok(
  tests.expect_fails(
    format('select * from public.get_test_result_explanations(%L::uuid)', (select value from m7_runtime where key = 'free_session')),
    'Premium access'
  ),
  'free result responses cannot retrieve explanations'
);

reset role;
insert into public.subscriptions(user_id, status, current_period_end)
values ('00000000-0000-0000-0000-000000010001', 'active', now() + interval '30 days');
select tests.authenticate_as('00000000-0000-0000-0000-000000010001', 'session-free@example.test');

select is((select explanation from public.get_test_result_explanations((select value::uuid from m7_runtime where key = 'free_session')) where question_id = (select value::uuid from m7_runtime where key = 'question_one')), 'Protected explanation 1', 'trusted premium entitlement unlocks protected explanations');
select is((select count(*)::integer from public.get_test_history(20, null, null, null) where session_status = 'submitted'), 1, 'history returns the authenticated user submitted result');

insert into m7_runtime(key, value)
select 'retake_session', session_id::text
from public.start_test_session('M7SMALL00001', 'free-retake-1');

select isnt((select value from m7_runtime where key = 'retake_session'), (select value from m7_runtime where key = 'free_session'), 'a submitted Test ID may be retaken in a new session');

reset role;
select tests.authenticate_as('00000000-0000-0000-0000-000000010002', 'session-other@example.test');

select ok(
  tests.expect_fails(
    format('select * from public.get_test_result(%L::uuid)', (select value from m7_runtime where key = 'free_session')),
    'not found'
  ),
  'another user cannot read a result by ID'
);

select is((select count(*)::integer from public.get_test_history(20, null, null, null)), 0, 'history never returns another user records');

insert into m7_runtime(key, value)
select 'large_session', session_id::text
from public.start_test_session('M7LARGE00001', 'large-start-1');

select is((select count(*)::integer from public.get_test_session((select value::uuid from m7_runtime where key = 'large_session'))), 250, 'a 250-question session starts in one bounded response');

select is(
  (select total_questions from public.submit_test_session(
    (select value::uuid from m7_runtime where key = 'large_session'), 1)),
  250,
  'a fully unanswered 250-question session submits and scores deterministically'
);

reset role;
select is((select count(*)::integer from public.test_result_items where session_id = (select value::uuid from m7_runtime where key = 'large_session')), 250, 'a 250-question result contains exactly 250 immutable items');

select ok(
  tests.expect_fails(
    format('update public.test_results set percentage = 100 where session_id = %L::uuid', (select value from m7_runtime where key = 'free_session')),
    'immutable'
  ),
  'authoritative results cannot be modified after submission'
);

select ok((select count(*) >= 4 from public.admin_audit_logs where resource_type = 'test_session'), 'critical session transitions create trusted audit events');

select tests.authenticate_as('00000000-0000-0000-0000-000000010001', 'session-free@example.test');
select ok(tests.expect_denied('select * from public.test_session_answers'), 'clients cannot directly read or mutate authoritative answer storage');

select * from finish();
rollback;
