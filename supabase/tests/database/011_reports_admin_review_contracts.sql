begin;

create extension if not exists pgtap with schema extensions;
create schema if not exists tests;

create or replace function tests.authenticate_as(user_id uuid, email text)
returns void language plpgsql as $$
begin
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', user_id::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', user_id::text, 'email', email, 'role', 'authenticated'
  )::text, true);
end;
$$;

create or replace function tests.authenticate_anon()
returns void language plpgsql as $$
begin
  execute 'set local role anon';
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{}'::text, true);
end;
$$;

create or replace function tests.expect_fails(sql text, expected_message text)
returns boolean language plpgsql as $$
begin
  execute sql;
  return false;
exception when others then
  return sqlerrm ilike '%' || expected_message || '%';
end;
$$;

create or replace function tests.expect_denied(sql text)
returns boolean language plpgsql as $$
begin
  execute sql;
  return false;
exception
  when insufficient_privilege or check_violation then return true;
  when others then return sqlerrm ilike '%permission denied%'
    or sqlerrm ilike '%required%'
    or sqlerrm ilike '%row-level security%'
    or sqlerrm ilike '%append-only%';
end;
$$;

grant usage on schema tests to anon, authenticated;
grant execute on all functions in schema tests to anon, authenticated;

select plan(55);

insert into auth.users(
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000011001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','reporter@example.test','x',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000011002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','other@example.test','x',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000011003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','review-admin@example.test','x',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000011004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','review-owner@example.test','x',now(),'{}','{}',now(),now());

update public.profiles set role = case
  when user_id = '00000000-0000-0000-0000-000000011003' then 'admin'
  when user_id = '00000000-0000-0000-0000-000000011004' then 'owner'
  else 'student' end
where user_id in (
  '00000000-0000-0000-0000-000000011001','00000000-0000-0000-0000-000000011002',
  '00000000-0000-0000-0000-000000011003','00000000-0000-0000-0000-000000011004'
);

insert into public.questions(
  id, partition_key, performance_indicator, question_type, question_text,
  options, correct_option_id, explanation, difficulty, tags,
  lifecycle_state, question_hash, created_at, updated_at
) values (
  'b8000000-0000-4000-8000-000000000001', 'Finance', 'M8-PI', 'Scenario',
  'Original report fixture question?',
  '[{"id":"A","text":"Original correct"},{"id":"B","text":"Future correct"},{"id":"C","text":"C"},{"id":"D","text":"D"}]',
  'A', 'Original protected explanation.', 'Medium', array['Milestone 8'],
  'Active', 'm8-question-1', '2026-08-26 10:00:00+00', '2026-08-26 10:00:00+00'
);

insert into public.test_ids(
  id, definition_id, mode, category, difficulties, topic_tags, question_count,
  pool_timestamp, created_by, blueprint_snapshot, canonical_seed,
  algorithm_version, eligibility_rule_version, generation_status,
  selected_question_count, completed_at
) values (
  'M8REPORT0001', 'b8100000-0000-4000-8000-000000000001', 'Test', 'Finance',
  array['Medium'], array['Milestone 8'], 1, now(),
  '00000000-0000-0000-0000-000000011001',
  '{"blueprint_name":"Milestone 8 Reports","version":"1.0.0"}',
  'm8-report', 'sha256-strata-v1', 'active-complete-v1', 'Ready', 1, now()
);

insert into public.test_definition_questions(
  test_definition_id, question_id, position, stratum_id, content_hash, question_updated_at
) values (
  'b8100000-0000-4000-8000-000000000001',
  'b8000000-0000-4000-8000-000000000001', 1, 'm8', 'm8-question-1',
  '2026-08-26 10:00:00+00'
);

create temporary table m8_runtime(key text primary key, value text not null);
grant all on m8_runtime to authenticated;

select has_column('public','question_reports','version','reports have optimistic versions');
select has_column('public','question_reports','encountered_snapshot','reports preserve encountered context');
select has_column('public','question_versions','previous_snapshot','corrections preserve before values');
select has_column('public','test_session_questions','correct_option_id_at_start','sessions preserve scoring keys');
select ok((select relrowsecurity from pg_class where oid='public.question_reports'::regclass),'report table has RLS');

select tests.authenticate_as('00000000-0000-0000-0000-000000011001','reporter@example.test');

insert into m8_runtime(key,value)
select 'historical_session', session_id::text
from public.start_test_session('M8REPORT0001','m8-historical-start');

select lives_ok(format(
  'select public.save_test_session_answer(%L::uuid,%L::uuid,%L,1)',
  (select value from m8_runtime where key='historical_session'),
  'b8000000-0000-4000-8000-000000000001','A'
),'historical session answer saves');

select lives_ok(format(
  'select public.submit_test_session(%L::uuid,2)',
  (select value from m8_runtime where key='historical_session')
),'historical result submits before correction');

insert into m8_runtime(key,value)
select 'active_session', session_id::text
from public.start_test_session('M8REPORT0001','m8-active-start');

insert into m8_runtime(key,value)
select 'report_one', report_id::text
from public.submit_question_report(
  (select value::uuid from m8_runtime where key='active_session'),
  'b8000000-0000-4000-8000-000000000001',
  'incorrect_answer','The listed correct answer appears to be incorrect.','report-one'
);

select ok((select value::uuid is not null from m8_runtime where key='report_one'),'report id is server generated');

reset role;
select is(
  (select reporter_id from public.question_reports where id=(select value::uuid from m8_runtime where key='report_one')),
  '00000000-0000-0000-0000-000000011001'::uuid,
  'reporter identity comes from authentication'
);
select ok(
  not ((select encountered_snapshot from public.question_reports where id=(select value::uuid from m8_runtime where key='report_one')) ? 'correct_option_id'),
  'encountered report snapshot excludes answer key'
);
select ok(
  position('explanation' in (select encountered_snapshot::text from public.question_reports where id=(select value::uuid from m8_runtime where key='report_one'))) = 0,
  'encountered report snapshot excludes explanation'
);

select tests.authenticate_as('00000000-0000-0000-0000-000000011001','reporter@example.test');
select is(
  (select report_id from public.submit_question_report(
    (select value::uuid from m8_runtime where key='active_session'),
    'b8000000-0000-4000-8000-000000000001','incorrect_answer',
    'The listed correct answer appears to be incorrect.','report-one'
  )),
  (select value::uuid from m8_runtime where key='report_one'),
  'report submission is idempotent'
);
select ok(tests.expect_fails($sql$
  select public.submit_question_report(
    (select value::uuid from m8_runtime where key='active_session'),
    'b8000000-0000-4000-8000-000000000001','unknown','Long enough description','bad-category')
$sql$,'Invalid report category'),'invalid report category fails');
select ok(tests.expect_fails($sql$
  select public.submit_question_report(
    (select value::uuid from m8_runtime where key='active_session'),
    'b8000000-0000-4000-8000-000000000001','other','short','short-description')
$sql$,'between 10 and 2000'),'short descriptions fail');

select tests.authenticate_as('00000000-0000-0000-0000-000000011002','other@example.test');
select ok(tests.expect_fails(format(
  'select public.submit_question_report(%L::uuid,%L::uuid,%L,%L,%L)',
  (select value from m8_runtime where key='active_session'),
  'b8000000-0000-4000-8000-000000000001','other',
  'Trying to report another users session.','cross-user'
),'not found'),'cross-user session reports fail');

select tests.authenticate_anon();
select ok(tests.expect_denied($sql$select public.submit_question_report(
  gen_random_uuid(),gen_random_uuid(),'other','Anonymous reports are not allowed.','anonymous'
)$sql$),'anonymous reports fail');

select tests.authenticate_as('00000000-0000-0000-0000-000000011001','reporter@example.test');
select is((select count(*)::integer from public.get_own_question_reports()),1,'reporter sees own report status');
select ok(tests.expect_denied($sql$select * from public.search_question_report_queue()$sql$),'standard user cannot access queue');
select ok(tests.expect_denied(format('select * from public.get_question_report_detail(%L::uuid)',(select value from m8_runtime where key='report_one'))),'standard user cannot access report detail');
select ok(tests.expect_denied($sql$select * from public.search_admin_audit_logs()$sql$),'standard user cannot access audit log');
select ok(tests.expect_denied($sql$update public.question_reports set status='resolved'$sql$),'standard user cannot update reports directly');
select ok(tests.expect_denied($sql$insert into public.question_versions(question_id,version_number,snapshot,change_reason)
  values('b8000000-0000-4000-8000-000000000001',99,'{}','forged')$sql$),'standard user cannot forge revisions');
select ok(tests.expect_denied($sql$insert into public.admin_audit_logs(action,resource_type) values('forged','question')$sql$),'standard user cannot forge audits');
select ok(tests.expect_denied($sql$update public.questions set lifecycle_state='Retired' where id='b8000000-0000-4000-8000-000000000001'$sql$),'standard user cannot retire directly');

select tests.authenticate_as('00000000-0000-0000-0000-000000011003','review-admin@example.test');
select is((select count(*)::integer from public.search_question_report_queue()),1,'administrator can read bounded queue');
select is((select reporter_email from public.search_question_report_queue()),'reporter@example.test','queue exposes approved reporter identity to staff');
select is((select correct_option_id from public.get_question_report_detail((select value::uuid from m8_runtime where key='report_one'))),'A','staff detail includes answer key');
select is((select explanation from public.get_question_report_detail((select value::uuid from m8_runtime where key='report_one'))),'Original protected explanation.','staff detail includes explanation');

select lives_ok(format(
  'select public.transition_question_report(%L::uuid,1,%L,null,null,null,%L,%L)',
  (select value from m8_runtime where key='report_one'),'in_review','Administrator began review.','review-one'
),'open report enters review');
select ok(tests.expect_fails(format(
  'select public.transition_question_report(%L::uuid,1,%L,%L,%L,null,%L,%L)',
  (select value from m8_runtime where key='report_one'),'rejected','not_an_issue',
  'No issue found.','Stale decision.','stale-review'
),'version conflict'),'stale report transition fails');

-- Create independent reports for correction, duplicate, and lifecycle workflows.
select tests.authenticate_as('00000000-0000-0000-0000-000000011001','reporter@example.test');
insert into m8_runtime(key,value)
select 'correction_report', report_id::text from public.submit_question_report(
  (select value::uuid from m8_runtime where key='active_session'),
  'b8000000-0000-4000-8000-000000000001','bad_options',
  'The answer options and answer key need correction.','correction-report'
);
insert into m8_runtime(key,value)
select 'duplicate_report', report_id::text from public.submit_question_report(
  (select value::uuid from m8_runtime where key='active_session'),
  'b8000000-0000-4000-8000-000000000001','bad_options',
  'This is a second report for the same option problem.','duplicate-report'
);

select tests.authenticate_as('00000000-0000-0000-0000-000000011003','review-admin@example.test');
select ok(tests.expect_fails(format(
  'select public.correct_reported_question(%L::uuid,1,%L::timestamptz,%L,%L::jsonb,%L,%L,%L,%L,%L,%L,%L::text[],%L,%L,%L)',
  (select value from m8_runtime where key='correction_report'),'2026-08-26 10:00:00+00',
  'Corrected question text?','["A","B","C"]','B','Corrected explanation.',
  'M8-PI','Finance','S','M','{Milestone 8}','Valid correction reason.','Question corrected.','bad-options'
),'Exactly four'),'correction requires exactly four options');

select lives_ok(format(
  'select public.correct_reported_question(%L::uuid,1,%L::timestamptz,%L,%L::jsonb,%L,%L,%L,%L,%L,%L,%L::text[],%L,%L,%L)',
  (select value from m8_runtime where key='correction_report'),'2026-08-26 10:00:00+00',
  'Corrected report fixture question?',
  '[{"id":"A","text":"Former answer"},{"id":"B","text":"Correct answer"},{"id":"C","text":"C"},{"id":"D","text":"D"}]',
  'B','The corrected answer is now B.','M8-PI','Finance','S','M','{"Milestone 8"}',
  'Correct answer and wording reviewed.','We corrected the answer and wording.','correct-report'
),'trusted correction succeeds');

reset role;
select is((select correct_option_id from public.questions where id='b8000000-0000-4000-8000-000000000001'),'B','correction updates current question');
select is((select status from public.question_reports where id=(select value::uuid from m8_runtime where key='correction_report')),'resolved','correction resolves report');
select is((select count(*)::integer from public.question_versions where report_id=(select value::uuid from m8_runtime where key='correction_report')),1,'correction creates immutable revision');
select is((select count(*)::integer from public.admin_audit_logs where report_id=(select value::uuid from m8_runtime where key='correction_report') and action='question.corrected'),1,'correction creates audit event');
select is((select count(*)::integer from public.test_definition_questions where test_definition_id='b8100000-0000-4000-8000-000000000001'),1,'correction preserves Test ID membership');
select is((select correct_answers from public.test_results where session_id=(select value::uuid from m8_runtime where key='historical_session')),1,'correction does not rescore submitted result');

select tests.authenticate_as('00000000-0000-0000-0000-000000011001','reporter@example.test');
select lives_ok(format(
  'select public.save_test_session_answer(%L::uuid,%L::uuid,%L,1)',
  (select value from m8_runtime where key='active_session'),
  'b8000000-0000-4000-8000-000000000001','A'
),'active pre-correction session saves encountered answer');
select lives_ok(format(
  'select public.submit_test_session(%L::uuid,2)',
  (select value from m8_runtime where key='active_session')
),'active pre-correction session submits after correction');

reset role;
select is((select correct_answers from public.test_results where session_id=(select value::uuid from m8_runtime where key='active_session')),1,'active session uses answer key captured before correction');

select tests.authenticate_as('00000000-0000-0000-0000-000000011003','review-admin@example.test');
select lives_ok(format(
  'select public.transition_question_report(%L::uuid,1,%L,%L,%L,%L::uuid,%L,%L)',
  (select value from m8_runtime where key='duplicate_report'),'duplicate','duplicate',
  'This report duplicates the primary review.',(select value from m8_runtime where key='report_one'),
  'Linked duplicate report.','duplicate-link'
),'duplicate report links to primary');
select ok(tests.expect_fails(format(
  'select public.transition_question_report(%L::uuid,2,%L,%L,%L,null,%L,%L)',
  (select value from m8_runtime where key='duplicate_report'),'rejected','not_an_issue',
  'Changed decision.','Attempt to reopen.','reopen-final'
),'Finalized'),'terminal report cannot reopen');

-- New post-correction session supplies a lifecycle report.
select tests.authenticate_as('00000000-0000-0000-0000-000000011001','reporter@example.test');
insert into m8_runtime(key,value)
select 'lifecycle_session', session_id::text from public.start_test_session('M8REPORT0001','m8-lifecycle-start');
insert into m8_runtime(key,value)
select 'lifecycle_report', report_id::text from public.submit_question_report(
  (select value::uuid from m8_runtime where key='lifecycle_session'),
  'b8000000-0000-4000-8000-000000000001','outdated_content',
  'This question should be retired from future generation.','lifecycle-report'
);

reset role;
insert into m8_runtime(key,value)
select 'question_updated_after_correction', updated_at::text from public.questions
where id='b8000000-0000-4000-8000-000000000001';

select tests.authenticate_as('00000000-0000-0000-0000-000000011004','review-owner@example.test');
select is((select count(*)::integer from public.search_question_report_queue(p_status=>'open')),1,'owner can filter report queue');
select lives_ok(format(
  'select public.resolve_report_with_question_lifecycle(%L::uuid,1,%L::timestamptz,%L,%L,%L,%L)',
  (select value from m8_runtime where key='lifecycle_report'),
  (select value from m8_runtime where key='question_updated_after_correction'),
  'Retired','Content is outdated and should be retired.','We retired this question.','retire-report'
),'owner can retire through report workflow');

reset role;
select is((select lifecycle_state from public.questions where id='b8000000-0000-4000-8000-000000000001'),'Retired','report lifecycle action retires question');
select is(public.is_question_eligible_for_test_generation('b8000000-0000-4000-8000-000000000001'),false,'retired question is excluded from future generation');
select is((select count(*)::integer from public.test_definition_questions where test_definition_id='b8100000-0000-4000-8000-000000000001'),1,'retirement preserves historical Test ID membership');
select is((select count(*)::integer from public.test_result_items where session_id=(select value::uuid from m8_runtime where key='historical_session')),1,'retirement preserves historical result detail');
select is((select count(*)::integer from public.question_lifecycle_events where id=(select lifecycle_event_id from public.question_reports where id=(select value::uuid from m8_runtime where key='lifecycle_report'))),1,'retirement links lifecycle event');

select tests.authenticate_as('00000000-0000-0000-0000-000000011003','review-admin@example.test');
select ok(tests.expect_denied($sql$update public.admin_audit_logs set action='rewritten'$sql$),'administrator cannot rewrite audits');
select ok(tests.expect_denied($sql$delete from public.question_versions$sql$),'administrator cannot delete revisions');
select ok(tests.expect_denied($sql$delete from public.question_lifecycle_events$sql$),'administrator cannot delete lifecycle history');
select ok((select count(*) <= 100 from public.search_admin_audit_logs(p_page_size=>500)),'audit pagination is bounded');
select ok((select count(*) >= 1 from public.search_admin_audit_logs(p_report_id=>(select value::uuid from m8_runtime where key='correction_report'))),'audit filters include correction report');

select * from finish();
rollback;
