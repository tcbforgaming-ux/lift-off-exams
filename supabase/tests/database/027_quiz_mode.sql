begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users(id,email,aud,role) values
 ('00000000-0000-0000-0000-000000027001','quiz-paid@example.test','authenticated','authenticated'),
 ('00000000-0000-0000-0000-000000027002','quiz-free@example.test','authenticated','authenticated');
insert into public.subscriptions(user_id,status,current_period_end)
values('00000000-0000-0000-0000-000000027001','active',now()+interval '1 day');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000027002',true);
select throws_ok($$select public.start_quiz(gen_random_uuid())$$,'42501',null,'free launch fails closed');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000027001',true);
select throws_ok($$select public.start_quiz(gen_random_uuid(),19)$$,'P0001',null,'unsupported count denied');
select throws_ok($$select public.start_quiz(gen_random_uuid())$$,'P0001',
 'There are not enough active questions to start a 20-question Quiz.','short bank rejected');
reset role;
insert into public.questions(partition_key,question_type,question_text,options,correct_option_id,difficulty,explanation)
select 'Finance','Scenario','Quiz contract '||n,'["First","Second","Third","Fourth"]','A','Easy','Protected Quiz fixture'
from generate_series(1,20) n;
set local role authenticated;
select set_config('quiz.fixture',public.start_quiz('00000000-0000-0000-0000-000000027011')::text,true);
select is(public.start_quiz('00000000-0000-0000-0000-000000027011'),current_setting('quiz.fixture')::jsonb,'launch retry returns same attempt');
select ok(public.get_practice_session_settings((current_setting('quiz.fixture')::jsonb->>'session_id')::uuid)
 @> '{"mode":"Quiz","timer_seconds":null,"show_answers":false,"show_explanations":false}','trusted Quiz is untimed');
select is((select count(*)::int from public.get_test_session((current_setting('quiz.fixture')::jsonb->>'session_id')::uuid)),20,'all questions delivered');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000027002',true);
select throws_ok($$select public.start_test_session(current_setting('quiz.fixture')::jsonb->>'test_id','quiz-shared-free')$$,
 '42501',null,'shared ID cannot bypass launch entitlement');
select throws_ok($$select public.get_test_result_explanations((current_setting('quiz.fixture')::jsonb->>'session_id')::uuid)$$,
 'P0001',null,'other user cannot retrieve explanations');
reset role;
select * from finish();
rollback;
