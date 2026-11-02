begin;
create extension if not exists pgtap with schema extensions;
create schema if not exists tests;
create function tests.practice_fails(statement text, expected text) returns boolean
language plpgsql as $$ begin execute statement; return false;
exception when others then return sqlerrm ilike '%' || expected || '%'; end; $$;
grant usage on schema tests to authenticated;
grant execute on function tests.practice_fails(text,text) to authenticated;
select no_plan();
select ok(not has_function_privilege('anon', 'public.generate_custom_practice(uuid,text,integer,text[],text[],integer,boolean,boolean,text,text)', 'EXECUTE'), 'anonymous generation execution is explicitly revoked');
select ok(not has_function_privilege('anon', 'public.get_practice_session_settings(uuid)', 'EXECUTE'), 'anonymous settings execution is explicitly revoked');
select ok(not has_function_privilege('anon', 'public.get_practice_feedback(uuid,uuid)', 'EXECUTE'), 'anonymous study execution is explicitly revoked');
select ok(not has_function_privilege('authenticated', 'public.snapshot_practice_settings()', 'EXECUTE'), 'internal trigger functions are not client callable');

insert into auth.users(id, email, aud, role, raw_user_meta_data, raw_app_meta_data)
values ('00000000-0000-0000-0000-000000012001','practice@example.test','authenticated','authenticated','{}','{}'),
  ('00000000-0000-0000-0000-000000012002','other-practice@example.test','authenticated','authenticated','{}','{}');
insert into public.blueprint_versions(id,blueprint_name,cluster,level,category,version,total_questions,distribution,change_reason)
values ('ac000000-0000-0000-0000-000000000001','Practice fixture','Finance','State','Finance','1',4,
  '{"strata":[{"id":"law","count":3,"tags":["Business Law"]},{"id":"analysis","count":1,"tags":["Financial Analysis"]}]}', 'Fixture');
insert into public.questions(partition_key,question_type,question_text,options,correct_option_id,explanation,difficulty,tags,lifecycle_state)
select 'Finance','Definition','Practice fixture ' || n, '["A","B","C","D"]','A','Protected explanation','Easy',
  case when n <= 8 then array['Business Law'] else array['Financial Analysis'] end,'Active'
from generate_series(1,12) n;
create temporary table practice_runtime(key text primary key, value jsonb);
grant all on practice_runtime to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000012001',true);

select ok(tests.practice_fails($q$select public.generate_custom_practice('ac000000-0000-0000-0000-000000000001','1',2,array['Easy'],array['Business Law'],60,true,false,'seed','premium-denied')$q$, 'premium'), 'free users cannot enable study answers');
select ok(tests.practice_fails($q$select public.generate_custom_practice('ac000000-0000-0000-0000-000000000001','1',2,array['Easy'],array['Channel Management'],60,false,false,'seed','topic-denied')$q$, 'Topic tags'), 'unrelated topics are rejected');
select ok(tests.practice_fails($q$select public.generate_custom_practice('ac000000-0000-0000-0000-000000000001','1',2,array['Easy'],array['Business Law'],1000,false,false,'seed','timer-denied')$q$, 'Timer'), 'timer limits are enforced');
insert into practice_runtime values ('test',public.generate_custom_practice('ac000000-0000-0000-0000-000000000001','1',2,array['Easy'],array['Business Law'],1,false,false,'seed','custom-1'));
select is((select value->>'success' from practice_runtime where key='test'),'true','custom test generates successfully');
select is((select (value->>'selected_count')::integer from practice_runtime where key='test'),2,'custom count is exact');
select is((select total_questions from public.blueprint_versions where id = 'ac000000-0000-0000-0000-000000000001' and practice_parent_id is null),4,'approved templates are unchanged');
select is((select public.generate_custom_practice('ac000000-0000-0000-0000-000000000001','1',2,array['Easy'],array['Business Law'],1,false,false,'seed','custom-1')->>'test_id'),(select value->>'test_id' from practice_runtime where key='test'),'idempotent retries return the same Test ID');
select ok(tests.practice_fails($q$select public.generate_custom_practice('ac000000-0000-0000-0000-000000000001','1',3,array['Easy'],array['Business Law'],1,false,false,'seed','custom-1')$q$,'Idempotency'),'changed settings cannot reuse an idempotency key');
insert into practice_runtime select 'session',to_jsonb(s) from public.start_test_session((select value->>'test_id' from practice_runtime where key='test'),'start-custom') s;
select is((select public.get_practice_session_settings((value->>'session_id')::uuid)->>'timer_seconds' from practice_runtime where key='session'),'60','session snapshots custom timer');
select is((select count(*)::integer from public.get_test_session((select (value->>'session_id')::uuid from practice_runtime where key='session')) where tags @> array['Business Law']),2,'only selected topic questions are included');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000012002',true);
select is((select count(*)::integer from public.blueprint_versions where practice_parent_id is not null),0,'derived configurations are private');
select ok(tests.practice_fails(format('select public.get_practice_session_settings(%L)',(select value->>'session_id' from practice_runtime where key='session')),'not found'),'cross-user timer access is denied');
select ok(tests.practice_fails(format('select public.get_practice_feedback(%L,%L)',(select value->>'session_id' from practice_runtime where key='session'),gen_random_uuid()),'not found'),'cross-user feedback access is denied');

reset role;
-- Expire the active period without sleeping; only local trusted test setup can do this.
alter table public.test_sessions disable trigger test_session_practice_clock;
update public.test_sessions set active_period_started_at = now() - interval '2 minutes'
where id = (select (value->>'session_id')::uuid from practice_runtime where key='session');
alter table public.test_sessions enable trigger test_session_practice_clock;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000012001',true);
select ok(tests.practice_fails(format('select public.pause_test_session(%L,1)',(select value->>'session_id' from practice_runtime where key='session')),'expired'),'expired tests cannot be paused to evade the deadline');
select ok(tests.practice_fails(format('select * from public.save_test_session_answer(%L,%L,''A'',1)',
  (select value->>'session_id' from practice_runtime where key='session'),
  (select question_id from public.get_test_session((select (value->>'session_id')::uuid from practice_runtime where key='session')) limit 1)),'expired'),'server rejects answers after expiry');
select is((select public.get_practice_session_settings((value->>'session_id')::uuid)->>'status' from practice_runtime where key='session'),'submitted','expired test is automatically submitted on synchronization');
select is((select active_duration_seconds from public.get_test_result((select (value->>'session_id')::uuid from practice_runtime where key='session')) limit 1),60,'result duration is capped at the timer');

reset role;
insert into public.subscriptions(user_id,status,current_period_end)
values ('00000000-0000-0000-0000-000000012001','active',now()+interval '30 days');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000012001',true);
insert into practice_runtime values ('study',public.generate_custom_practice('ac000000-0000-0000-0000-000000000001','1',3,array['Easy'],array['Business Law','Financial Analysis'],null,true,true,'seed','study-1'));
select is((select value->>'success' from practice_runtime where key='study'),'true','premium study mode generates');
insert into practice_runtime select 'study-session',to_jsonb(s) from public.start_test_session((select value->>'test_id' from practice_runtime where key='study'),'start-study') s;
insert into practice_runtime select 'question',to_jsonb(question_id) from public.get_test_session((select (value->>'session_id')::uuid from practice_runtime where key='study-session')) limit 1;
select ok(tests.practice_fails(format('select public.get_practice_feedback(%L,%L)',
  (select value->>'session_id' from practice_runtime where key='study-session'),(select value#>>'{}' from practice_runtime where key='question')),'Answer this'),'feedback is hidden before answering');
select lives_ok(format('select * from public.save_test_session_answer(%L,%L,''B'',1)',
  (select value->>'session_id' from practice_runtime where key='study-session'),(select value#>>'{}' from practice_runtime where key='question')),'study answer saves');
select is(public.get_practice_feedback((select (value->>'session_id')::uuid from practice_runtime where key='study-session'),(select (value#>>'{}')::uuid from practice_runtime where key='question'))->>'explanation','Protected explanation','premium study explanation is returned after answering');
select is((select public.get_practice_session_settings((value->>'session_id')::uuid)->>'timer_seconds' from practice_runtime where key='study-session'),null::text,'no-timer mode stays untimed');

select * from finish();
rollback;
