begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users(id,email,aud,role,email_confirmed_at)
select ('00000000-0000-0000-0000-00000002600'||n)::uuid,
 'export-'||n||'@example.test','authenticated','authenticated',now() from generate_series(1,5) n;
insert into public.subscriptions(user_id,status,current_period_end) values
 ('00000000-0000-0000-0000-000000026001','active',now()+interval '1 day'),
 ('00000000-0000-0000-0000-000000026003','active',now()-interval '1 day');
update public.profiles set role='admin' where user_id='00000000-0000-0000-0000-000000026004';
update public.profiles set account_tier='premium' where user_id='00000000-0000-0000-0000-000000026002';
insert into public.questions(id,partition_key,question_type,question_text,options,correct_option_id,difficulty)
values('00000000-0000-0000-0000-000000026010','Finance','Scenario','Current edited text',
 '["A","B","C","D"]','B','Hard');
insert into public.test_ids(id,definition_id,mode,category,difficulties,topic_tags,question_count,pool_timestamp,blueprint_snapshot)
values('EXPORTS00001','00000000-0000-0000-0000-000000026011','Test','Finance',array['Easy'],'{}',1,now(),
 '{"schema_version":1,"blueprint_id":"export-fixture","total_questions":1,"strata":[{"count":1,"tags":["Tag 01"]}]}');
insert into public.test_sessions(id,test_definition_id,user_id,status,mode,question_count,idempotency_key,active_period_started_at,submitted_at)
select ('00000000-0000-0000-0000-000000026'||lpad(n::text,3,'0'))::uuid,
 '00000000-0000-0000-0000-000000026011',
 ('00000000-0000-0000-0000-00000002600'||case when n<351 then 1 else n-349 end)::uuid,
 'submitted','Test',1,'exports-'||n,null,
 case when n between 101 and 201 then '2026-01-02 00:00:00+00'::timestamptz + (n-101)*interval '1 second'
 else '2026-01-01 23:59:59+00'::timestamptz end
from generate_series(101,354) n;
insert into public.test_sessions(id,test_definition_id,user_id,status,mode,question_count,idempotency_key,active_period_started_at)
values('00000000-0000-0000-0000-000000026360','00000000-0000-0000-0000-000000026011',
 '00000000-0000-0000-0000-000000026001','in_progress','Test',1,'exports-unfinished',now());
insert into public.test_results(session_id,user_id,test_definition_id,total_questions,answered_questions,unanswered_questions,correct_answers,incorrect_answers,raw_score,percentage,scoring_rule_version,explanation_policy_version,active_duration_seconds,submitted_at)
select id,user_id,test_definition_id,1,1,0,0,1,0,0,'single-choice-v1','stripe-entitlement-v1',0,submitted_at
from public.test_sessions where idempotency_key like 'exports-%' and status='submitted';
insert into public.test_result_items(session_id,position,question_id,question_type,question_text,options,difficulty,tags,selected_option_id,correct_option_id,is_correct,explanation_snapshot)
select s.id,1,q.id,'Scenario','Original saved text','[{"text":"A","private":"internal sentinel"},"B","C","D"]','Easy',
 array(select 'Tag '||lpad(n::text,2,'0') from generate_series(1,26) n)||array['Tag 01'],
 case when idempotency_key='exports-101' then 'UNKNOWN' else 'B' end,'A',false,'Premium snapshot'
from public.test_sessions s cross join public.questions q
where s.idempotency_key like 'exports-%' and s.status='submitted' and q.id='00000000-0000-0000-0000-000000026010';

select ok(not has_function_privilege('anon','public.prepare_my_test_export(text,text,uuid,uuid,text,date,date)','execute'),'anonymous cannot execute');
select ok(not has_table_privilege('authenticated','private.test_export_receipts','select'),'receipts are private');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000026001',true);
select is(jsonb_array_length(public.prepare_my_test_export('history','pdf',gen_random_uuid())->'history'),
 250,'history accepts the exact limit and excludes unfinished attempts');
-- Add one more completed result before asserting the 251-row sentinel.
reset role;
insert into public.test_sessions(id,test_definition_id,user_id,status,mode,question_count,idempotency_key,active_period_started_at,submitted_at)
values('00000000-0000-0000-0000-000000026361','00000000-0000-0000-0000-000000026011',
 '00000000-0000-0000-0000-000000026001','submitted','Test',1,'exports-extra',null,'2026-01-01 22:00:00+00');
insert into public.test_results(session_id,user_id,test_definition_id,total_questions,answered_questions,unanswered_questions,correct_answers,incorrect_answers,raw_score,percentage,scoring_rule_version,explanation_policy_version,active_duration_seconds,submitted_at)
select id,user_id,test_definition_id,1,0,1,0,1,0,0,'single-choice-v1','stripe-entitlement-v1',0,submitted_at
from public.test_sessions where idempotency_key='exports-extra';
set local role authenticated;
select throws_ok($q$select public.prepare_my_test_export('history','pdf',gen_random_uuid())$q$,'P0001',
 'Export exceeds 250 tests. Choose a shorter date range.','oversized history is refused rather than truncated');
select is(jsonb_array_length(public.prepare_my_test_export('history','csv',gen_random_uuid(),p_range=>'custom',p_from=>'2026-01-02',p_to=>'2026-01-02')->'history'),101,'history includes all 101 completed tests in UTC date');
with x as (select public.prepare_my_test_export('analytics','csv',gen_random_uuid(),p_range=>'custom',p_from=>'2026-01-02',p_to=>'2026-01-02') j)
select ok(jsonb_array_length(j->'history')=101 and jsonb_array_length(j->'topics')=26
 and (j->'confidence'->>'uncertain')::int=1 and j->'uncertainty'->0->>'explanation'='Premium snapshot'
 and (j->'topics'->0->>'total')::int=101,'analytics exports complete, deduped snapshots and paid uncertainty explanation') from x;
with x as (select public.prepare_my_test_export('result','pdf',gen_random_uuid(),'00000000-0000-0000-0000-000000026101')->'questions'->0 j)
select ok(j->>'question'='Original saved text' and j->>'explanation'='Premium snapshot' and j->>'answer'='UNKNOWN'
 and j->'options'='["A","B","C","D"]'::jsonb,'paid result uses saved text and strips unknown option fields') from x;
select throws_ok($q$select public.prepare_my_test_export('result','pdf',gen_random_uuid(),'00000000-0000-0000-0000-000000026360')$q$,
 '42501','Completed Test result unavailable.','unfinished result denied');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000026002',true);
select throws_ok($q$select public.prepare_my_test_export('result','csv',gen_random_uuid(),'00000000-0000-0000-0000-000000026101')$q$,
 '42501','Completed Test result unavailable.','cross-user export denied');
select is(public.prepare_my_test_export('history','pdf',gen_random_uuid(),p_range=>'custom',p_from=>'2026-01-02',p_to=>'2026-01-02'),
 '{"empty":true}'::jsonb,'empty range explicitly reported');
select ok(not ((public.prepare_my_test_export('result','csv','00000000-0000-0000-0000-000000026401','00000000-0000-0000-0000-000000026351')->'questions'->0)?'explanation'),
 'profile tier cannot grant paid fields');
select lives_ok($q$select public.prepare_my_test_export('result','csv','00000000-0000-0000-0000-000000026401','00000000-0000-0000-0000-000000026351')$q$,'same receipt retries without additional charge');
select lives_ok($q$select public.prepare_my_test_export('history','csv',gen_random_uuid())$q$,'second export');
select lives_ok($q$select public.prepare_my_test_export('analytics','pdf',gen_random_uuid())$q$,'third export');
select throws_ok($q$select public.prepare_my_test_export('history','pdf',gen_random_uuid())$q$,'42501',
 'Weekly export limit reached. It resets Monday at 00:00 UTC.','fourth export denied');
reset role;
select is((select count(*)::int from private.test_export_receipts where user_id='00000000-0000-0000-0000-000000026002'
 and charged_week=date_trunc('week',now() at time zone 'UTC')::date),3,'Monday UTC receipt bucket');
update private.test_export_receipts set charged_week=charged_week-7 where user_id='00000000-0000-0000-0000-000000026002';
set local role authenticated;
select lives_ok($q$select public.prepare_my_test_export('history','pdf',gen_random_uuid())$q$,'prior week receipts do not consume allowance');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000026003',true);
select ok(not ((public.prepare_my_test_export('result','pdf',gen_random_uuid(),'00000000-0000-0000-0000-000000026352')->'questions'->0)?'explanation'),'expired subscriber follows unpaid rule');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000026004',true);
select ok(not ((public.prepare_my_test_export('result','pdf',gen_random_uuid(),'00000000-0000-0000-0000-000000026353')->'questions'->0)?'explanation'),'unpaid staff cannot export protected explanations');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000026002',true);
select set_config('request.jwt.claims',jsonb_build_object('amr',jsonb_build_array(
 jsonb_build_object('method','password','timestamp',extract(epoch from now()))))::text,true);
select lives_ok($q$select public.request_account_deletion('DELETE')$q$,'student enters recovery-only lifecycle');
select throws_ok($q$select public.prepare_my_test_export('history','csv',gen_random_uuid())$q$,'42501',null,'recovery-only accounts cannot export');
reset role;
select * from finish();
rollback;
