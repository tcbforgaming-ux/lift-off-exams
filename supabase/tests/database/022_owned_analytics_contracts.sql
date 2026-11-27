begin;
create extension if not exists pgtap with schema extensions;
select plan(8);
insert into auth.users(id,email,aud,role) values
 ('00000000-0000-0000-0000-000000022001','analytics-one@example.test','authenticated','authenticated'),
 ('00000000-0000-0000-0000-000000022002','analytics-two@example.test','authenticated','authenticated');
update public.profiles set account_tier='premium' where user_id='00000000-0000-0000-0000-000000022001';
insert into public.test_ids(id,definition_id,mode,category,difficulties,topic_tags,question_count,pool_timestamp)
values('ANALYTICS001','00000000-0000-0000-0000-000000022011','Test','Finance',array['Easy'],'{}',1,now());
insert into public.test_sessions(id,test_definition_id,user_id,status,mode,question_count,idempotency_key,active_period_started_at,submitted_at)
select id,'00000000-0000-0000-0000-000000022011',actor,'submitted','Test',1,id::text,null,now()-interval '1 minute'
from (values ('00000000-0000-0000-0000-000000022012'::uuid,'00000000-0000-0000-0000-000000022001'::uuid),
 ('00000000-0000-0000-0000-000000022013','00000000-0000-0000-0000-000000022002')) v(id,actor);
insert into public.test_results(session_id,user_id,test_definition_id,total_questions,answered_questions,unanswered_questions,correct_answers,incorrect_answers,
 raw_score,percentage,scoring_rule_version,explanation_policy_version,active_duration_seconds,submitted_at)
select id,user_id,test_definition_id,1,1,0,c,1-c,c,c*100,'single-choice-v1','stripe-entitlement-v1',0,submitted_at
from public.test_sessions cross join lateral (select (id='00000000-0000-0000-0000-000000022013')::integer c) scores
where id in ('00000000-0000-0000-0000-000000022012','00000000-0000-0000-0000-000000022013');
select ok(not has_function_privilege('anon','public.get_my_test_analytics(text,date,date)','EXECUTE'),'anonymous cannot query analytics');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000022001',true);
select is(public.get_my_test_analytics()->>'premium','false','profile tier is not billing authority');
select is((public.get_my_test_analytics()->>'average_score')::numeric,0::numeric,'other user score does not affect average');
select is(public.get_my_test_analytics()->>'test_count','1','only owned tests count');
select throws_ok($q$select public.get_my_test_analytics('lifetime')$q$,'42501','Premium access is required for analytics ranges.','free caller cannot request premium ranges');
reset role;
insert into public.subscriptions(user_id,status,current_period_end) values('00000000-0000-0000-0000-000000022001','active',now()+interval '1 day');
set local role authenticated;
select is(public.get_my_test_analytics('lifetime')->'history'->0->>'session_id','00000000-0000-0000-0000-000000022012','premium history returns only owned session');
select is(public.get_my_test_analytics('custom',date '2000-01-01',date '2000-01-02')->>'test_count','0','custom date filter applied');
select ok(not (public.get_my_test_analytics()::text like '%explanation%'),'analytics does not expose explanations');
reset role;
select * from finish();
rollback;
