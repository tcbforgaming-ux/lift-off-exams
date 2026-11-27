begin;
create extension if not exists pgtap with schema extensions;
select plan(4);
insert into auth.users(id,email,aud,role)
values('00000000-0000-0000-0000-000000031001','hardcore-quota@example.test','authenticated','authenticated');
insert into private.hardcore_runs(user_id,request_id,cap,allow_unknown,strikes,committed,finished_at)
select '00000000-0000-0000-0000-000000031001',gen_random_uuid(),1,true,1,1,
  date_trunc('week', now() at time zone 'UTC') at time zone 'UTC'
from generate_series(1,10);
insert into public.test_ids(id,definition_id,mode,category,question_count,pool_timestamp)
values('QUOTATEST001','00000000-0000-0000-0000-000000031011','Test','Finance',1,now());
insert into public.test_sessions(id,test_definition_id,user_id,status,mode,question_count,
  idempotency_key,active_period_started_at,submitted_at)
values('00000000-0000-0000-0000-000000031021','00000000-0000-0000-0000-000000031011',
  '00000000-0000-0000-0000-000000031001','submitted','Test',1,'quota-test',null,now());
insert into public.test_results(session_id,user_id,test_definition_id,total_questions,answered_questions,
  unanswered_questions,correct_answers,incorrect_answers,raw_score,percentage,
  scoring_rule_version,explanation_policy_version,active_duration_seconds,submitted_at)
select id,user_id,test_definition_id,1,1,0,1,0,1,100,
  'single-choice-v1','stripe-entitlement-v1',0,now()
from public.test_sessions where id='00000000-0000-0000-0000-000000031021';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000031001',true);
select is((select shared_remaining from public.get_my_weekly_activity_allowance()),10,
  'legacy completions are not reclassified as launch reservations');
select is((select count(*)::integer from public.get_test_history(10)),1,
  'legacy Test remains available in history');
select ok(public.get_my_activity_analytics() @> '{"test_count":1}',
  'Hardcore runs do not enter the combined analytics overview');
select is(public.prepare_my_test_export('history','csv',gen_random_uuid())->>'count','1',
  'Hardcore runs do not enter the Test history export');
reset role;
select * from finish();
rollback;
