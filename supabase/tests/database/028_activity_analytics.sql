begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users(id,email,aud,role)
select ('00000000-0000-0000-0000-00000002800'||n)::uuid,'activities-'||n||'@example.test','authenticated','authenticated'
from generate_series(1,4) n;
insert into public.subscriptions(user_id,status,current_period_end) values
 ('00000000-0000-0000-0000-000000028001','active',now()+interval '1 day'),
 ('00000000-0000-0000-0000-000000028002','active',now()-interval '1 day');
update public.profiles set role='admin' where user_id='00000000-0000-0000-0000-000000028004';
insert into public.questions(id,partition_key,question_type,question_text,options,correct_option_id,difficulty)
values('00000000-0000-0000-0000-000000028010','Finance','Scenario','Analytics snapshot fixture','["A","B","C","D"]','A','Easy');
insert into public.test_ids(id,definition_id,mode,category,question_count,pool_timestamp)
values ('ACTIVITYT001','00000000-0000-0000-0000-000000028011','Test','Finance',5,now()),
 ('ACTIVITYQ001','00000000-0000-0000-0000-000000028012','Quiz','Mixed practice',5,now());
insert into public.test_sessions(id,test_definition_id,user_id,status,mode,question_count,idempotency_key,active_period_started_at,submitted_at)
select ('00000000-0000-0000-0000-0000000280'||n)::uuid,
 ('00000000-0000-0000-0000-00000002801'||case when n=21 then 1 else 2 end)::uuid,
 '00000000-0000-0000-0000-000000028001',case when n=23 then 'in_progress' else 'submitted' end,
 case when n=21 then 'Test' else 'Quiz' end,5,'activity-'||n,
 case when n=23 then now() end,
 case n when 21 then (date_trunc('day',now() at time zone 'UTC') at time zone 'UTC')-interval '1 day'
 when 22 then (date_trunc('day',now() at time zone 'UTC') at time zone 'UTC')-interval '1 second' end
from generate_series(21,23) n;
insert into public.test_results(session_id,user_id,test_definition_id,total_questions,answered_questions,unanswered_questions,correct_answers,incorrect_answers,raw_score,percentage,scoring_rule_version,explanation_policy_version,active_duration_seconds,submitted_at)
select id,user_id,test_definition_id,5,5,0,c,5-c,c,c*20,'single-choice-v1','stripe-entitlement-v1',0,submitted_at
from public.test_sessions cross join lateral (select case when mode='Test' then 4 else 3 end c) x
where idempotency_key in ('activity-21','activity-22');
insert into public.test_result_items(session_id,position,question_id,question_type,question_text,options,difficulty,tags,selected_option_id,correct_option_id,is_correct)
select s.id,1,q.id,'Scenario','Saved question',q.options,'Easy',
 case when s.mode='Test' then array['Test topic','Test topic'] else array['Quiz topic'] end,
 case when s.mode='Test' then 'B' else 'UNKNOWN' end,'A',false
from public.test_sessions s cross join public.questions q
where s.idempotency_key in ('activity-21','activity-22') and q.id='00000000-0000-0000-0000-000000028010';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000028001',true);
select ok(public.get_my_activity_analytics() @> '{"premium":true,"test_count":2,"average_score":70}','default includes both completed activities');
select ok(public.get_my_activity_analytics('Test') @> '{"test_count":1,"average_score":80,"extremes":{"highest":{"mode":"Test"}}}','Test filter scopes score and extrema');
select ok(public.get_my_activity_analytics('Quiz') @> '{"test_count":1,"average_score":60,"extremes":{"highest":{"mode":"Quiz"}}}','Quiz filter scopes score and extrema');
select is(public.get_my_activity_analytics_detail('history')->'items'->0->>'mode','Quiz','mode label in newest score');
select is(public.get_my_activity_analytics_detail('history','Test')->'items'->0->>'mode','Test','mode label in filtered score');
select ok(public.get_my_activity_analytics_detail('confidence','Quiz') @> '{"uncertain":1,"answered":1,"percentage":100}','uncertainty is mode-scoped');
select ok(public.get_my_activity_analytics_detail('topics','Quiz')->'items'->0 @> '{"tag":"Quiz topic","required":null,"eligible":false}','Quiz shows raw topic counts');
select is(public.get_my_activity_analytics_detail('recommendations')->'items','[]'::jsonb,'combined has no sample classifications');
select ok(public.get_my_activity_analytics('all','custom',
 (now() at time zone 'UTC')::date-1,(now() at time zone 'UTC')::date-1) @> '{"test_count":2}','UTC inclusive dates include midnight and last second');
select is(public.prepare_my_test_export('history','csv',gen_random_uuid())->>'count','1','existing exports still exclude Quiz');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000028002',true);
select throws_ok($$select public.get_my_activity_analytics('Quiz')$$,'42501',null,'expired subscription cannot filter');
select throws_ok($$select public.get_my_activity_analytics_detail('history')$$,'42501',null,'expired subscription cannot fetch details');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000028003',true);
select ok(public.get_my_activity_analytics() @> '{"premium":false,"test_count":0,"average_score":null}','free overview excludes other users');
select throws_ok($$select public.get_my_activity_analytics('Test')$$,'42501',null,'free mode filter denied');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000028004',true);
select throws_ok($$select public.get_my_activity_analytics_detail('topics','Quiz')$$,'42501',null,'staff alone does not grant combined detail');
reset role;
select * from finish();
rollback;
