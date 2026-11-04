begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users(id,email,aud,role) values
 ('00000000-0000-0000-0000-000000025001','detail-paid@example.test','authenticated','authenticated'),
 ('00000000-0000-0000-0000-000000025002','detail-expired@example.test','authenticated','authenticated'),
 ('00000000-0000-0000-0000-000000025003','detail-staff@example.test','authenticated','authenticated');
insert into public.subscriptions(user_id,status,current_period_end) values
 ('00000000-0000-0000-0000-000000025001','active',now()+interval '1 day'),
 ('00000000-0000-0000-0000-000000025002','active',now()-interval '1 day');
update public.profiles set role='admin' where user_id='00000000-0000-0000-0000-000000025003';
insert into public.questions(id,partition_key,question_type,question_text,options,correct_option_id,difficulty)
values('00000000-0000-0000-0000-000000025010','Finance','Scenario','Current edited text',
 '[{"id":"A","text":"A"},{"id":"B","text":"B"},{"id":"C","text":"C"},{"id":"D","text":"D"}]','B','Hard');
insert into public.test_ids(id,definition_id,mode,category,difficulties,topic_tags,question_count,pool_timestamp,blueprint_snapshot)
values('DETAILS00001','00000000-0000-0000-0000-000000025011','Test','Finance',array['Easy'],'{}',1,now(),
 '{"schema_version":1,"blueprint_id":"fixed-fixture","total_questions":1,"strata":[{"count":1,"tags":["Tag 01","Tag 01"]}]}');
insert into public.test_sessions(id,test_definition_id,user_id,status,mode,question_count,idempotency_key,active_period_started_at,submitted_at)
select ('00000000-0000-0000-0000-000000025'||lpad(n::text,3,'0'))::uuid,
 '00000000-0000-0000-0000-000000025011','00000000-0000-0000-0000-000000025001','submitted','Test',1,'details-'||n,null,
 case when n=300 then '2026-01-01 23:59:59+00'::timestamptz else '2026-01-02 00:00:00+00'::timestamptz + (n-200)*interval '1 second' end
from generate_series(200,300) n;
insert into public.test_results(session_id,user_id,test_definition_id,total_questions,answered_questions,unanswered_questions,correct_answers,incorrect_answers,raw_score,percentage,scoring_rule_version,explanation_policy_version,active_duration_seconds,submitted_at)
select id,user_id,test_definition_id,1,case when idempotency_key='details-200' then 0 else 1 end,case when idempotency_key='details-200' then 1 else 0 end,0,1,0,0,'single-choice-v1','stripe-entitlement-v1',0,submitted_at
from public.test_sessions where idempotency_key like 'details-%';
insert into public.test_result_items(session_id,position,question_id,question_type,question_text,options,difficulty,tags,selected_option_id,correct_option_id,is_correct)
select s.id,1,q.id,'Scenario','Original saved text',q.options,'Easy',
 array(select 'Tag '||lpad(n::text,2,'0') from generate_series(1,26) n)||array['Tag 01'],
 case s.idempotency_key when 'details-200' then null when 'details-300' then 'UNKNOWN' else 'B' end,'A',false
from public.test_sessions s cross join public.questions q
where s.idempotency_key like 'details-%' and q.id='00000000-0000-0000-0000-000000025010';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000025001',true);
select is(public.get_my_test_analytics('lifetime')->>'test_count','101','range aggregate includes all 101');
select is(public.get_my_test_analytics_detail('history','lifetime',p_page=>3)->>'has_more','true','history continues beyond 100 scores');
select is(jsonb_array_length(public.get_my_test_analytics_detail('history','lifetime',p_page=>4)->'items'),1,'101st score reachable');
select is(public.get_my_test_analytics_detail('topics','lifetime',p_page=>1)->'items'->0->>'tag','Tag 26','26th tag reachable');
select ok(public.get_my_test_analytics_detail('topics','lifetime')->'items'->0 @> '{"total":101,"answered":100,"required":101,"eligible":false}','duplicate tags deduped and below threshold ineligible');
select ok(public.get_my_test_analytics_detail('topics','custom','2026-01-01','2026-01-01')->'items'->0 @> '{"total":1,"answered":1,"required":1,"eligible":true}','inclusive UTC through-date and exactly-at threshold');
select ok(public.get_my_test_analytics_detail('confidence','lifetime') @> '{"uncertain":1,"answered":100,"skipped":1,"wrong_choices":99,"percentage":1}','confidence counts once across overlapping tags');
select is(public.get_my_test_analytics_detail('uncertainty','lifetime')->'items'->0->>'question_text','Original saved text','drill-down reads immutable snapshot');
select is(public.get_my_test_analytics_detail('recommendations','custom','2026-01-01','2026-01-01')->'items','["Tag 01"]'::jsonb,'does not pad qualifying suggestions');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000025002',true);
select throws_ok($q$select public.get_my_test_analytics_detail('history','lifetime')$q$,'42501',null,'expired subscription denied');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000025003',true);
select is(public.get_my_test_analytics_detail('history','lifetime')->'items','[]'::jsonb,'staff exception still cannot see another user');
reset role;
select * from finish();
rollback;
