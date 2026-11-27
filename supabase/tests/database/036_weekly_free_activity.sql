begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users(id,email,aud,role) values
 ('00000000-0000-0000-0000-000000036001','weekly-free@example.test','authenticated','authenticated'),
 ('00000000-0000-0000-0000-000000036002','weekly-expired@example.test','authenticated','authenticated'),
 ('00000000-0000-0000-0000-000000036003','weekly-paid@example.test','authenticated','authenticated'),
 ('00000000-0000-0000-0000-000000036004','weekly-staff@example.test','authenticated','authenticated');
update public.profiles set account_tier='premium' where user_id='00000000-0000-0000-0000-000000036003';
update public.profiles set role='admin' where user_id='00000000-0000-0000-0000-000000036004';
insert into public.subscriptions(user_id,status,current_period_end)
values('00000000-0000-0000-0000-000000036002','active',now()-interval '1 day');

select is(private.free_activity_week('2026-11-15 23:59:59.999999+00'), '2026-11-09 00:00:00+00'::timestamptz,'Sunday remains in previous week');
select is(private.free_activity_week('2026-11-16 00:00:00+00'), '2026-11-16 00:00:00+00'::timestamptz,'reset is inclusive Monday midnight UTC');
select ok(not has_function_privilege('anon','public.get_my_weekly_activity_allowance()','execute'),'anonymous cannot read a balance');
select ok(not has_table_privilege('authenticated','private.weekly_free_activity_claims','select'),'browser cannot query receipts');
select ok(not has_table_privilege('authenticated','private.weekly_free_activity_claims','insert'),'browser cannot mint receipts');
select ok(not has_function_privilege('authenticated','private.release_activity_reservation(uuid,text,uuid)','execute'),'no direct release');
select ok(not has_function_privilege('anon','public.abandon_test_session(uuid)','execute'),'no anonymous abandon');

insert into public.blueprint_versions(id,blueprint_name,cluster,level,category,version,total_questions,distribution,change_reason)
values ('00000000-0000-0000-0000-000000036010','Weekly Finance','Finance','State','Finance','1',2,
 '{"strata":[{"id":"weekly","count":2,"tags":["Business Law"]}]}','Fixture');
insert into public.questions(id,partition_key,question_type,question_text,options,correct_option_id,explanation,difficulty,tags,lifecycle_state)
select ('36000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'Finance','Definition','Weekly fixture '||n,
 '["A","B","C","D"]','A','Fixture protected explanation','Medium',array['Business Law'],'Active'
from generate_series(1,21) n;
insert into public.test_ids(id,definition_id,mode,category,question_count,pool_timestamp,generation_status,selected_question_count)
select 'WEEKLY'||lpad(n::text,6,'0'),('36100000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,
 'Test','Finance',1,now(),'Ready',1 from generate_series(1,8) n;
insert into public.test_definition_questions(test_definition_id,question_id,position,stratum_id,content_hash,question_updated_at)
select definition_id,'36000000-0000-0000-0000-000000000001',1,'weekly','fixture',now()
from public.test_ids where id like 'WEEKLY%';

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000036001',true);
select is((select generated_remaining from public.get_my_weekly_activity_allowance()),3,'cutover begins with three generated slots');
select throws_ok($$select public.generate_test_from_blueprint('00000000-0000-0000-0000-000000036010','wrong',2)$$,'P0001',null,'failed generation rejected');
select is((select generated_remaining from public.get_my_weekly_activity_allowance()),3,'failed generation leaves balance unchanged');
select set_config('weekly.generated',(select test_id from public.generate_test_from_blueprint(
 '00000000-0000-0000-0000-000000036010','1',2,null,'weekly-saved')),true);
select ok(length(current_setting('weekly.generated'))=12,'saved generation consumes first slot');
select ok(public.generate_custom_practice('00000000-0000-0000-0000-000000036010','1',2,array['Medium'],
 array['Business Law'],60,false,false,null,'weekly-custom') @> '{"success":true}','custom generation consumes second slot');
select ok(public.generate_updated_test(current_setting('weekly.generated'),'weekly-updated') @> '{"success":true}','updated generation consumes third slot');
select is((select generated_remaining from public.get_my_weekly_activity_allowance()),0,'third generation uses final slot');
select throws_ok($$select public.generate_test_from_blueprint('00000000-0000-0000-0000-000000036010','1',2,null,'fourth')$$,
 '42501','Weekly generated Test allowance reached. It resets Monday at 00:00 UTC.','fourth saved generation denied');
select throws_ok($$select public.generate_custom_practice('00000000-0000-0000-0000-000000036010','1',2,array['Medium'],
 array['Business Law'],60,false,false,null,'fourth')$$,'42501',null,'custom cannot bypass generation limit');
select throws_ok($$select public.generate_updated_test(current_setting('weekly.generated'),'fourth')$$,'42501',null,'regeneration cannot bypass limit');
select is((select test_id from public.generate_test_from_blueprint(
 '00000000-0000-0000-0000-000000036010','1',2,null,'weekly-saved')),current_setting('weekly.generated'),'same-key generation succeeds at cap');

select ok((select original_question_count from public.get_test_id_preview(current_setting('weekly.generated')))=2,'preview works');
select is((select test_id_remaining from public.get_my_weekly_activity_allowance()),7,'preview is not charged');
select set_config('weekly.first',(select session_id from public.start_test_session(current_setting('weekly.generated'),'first-own'))::text,true);
select is((select test_id_remaining from public.get_my_weekly_activity_allowance()),6,'first launch of own generated Test uses an ID slot');
select is((public.start_test_session_configured(current_setting('weekly.generated'),'first-alias',null)->>'session_id'),
 current_setting('weekly.first'),'alternate launch key recovers same open attempt');
select is((select test_id_remaining from public.get_my_weekly_activity_allowance()),6,'existing attempt and alias do not charge');
select lives_ok($$select public.pause_test_session(current_setting('weekly.first')::uuid,1)$$,'pause succeeds without release');
select lives_ok($$select public.resume_test_session(current_setting('weekly.first')::uuid,2)$$,'resume succeeds without charge');
select is((select shared_remaining from public.get_my_weekly_activity_allowance()),9,'one shared reservation after pause/resume');
select is(public.abandon_test_session(current_setting('weekly.first')::uuid),'abandoned','explicit abandonment closes the Test');
select is(public.abandon_test_session(current_setting('weekly.first')::uuid),'abandoned','abandon retry is safe');
select is((public.start_test_session_configured(current_setting('weekly.generated'),'first-alias',null)->>'status'),'abandoned','alias replay cannot relaunch a closed session');
select is((select shared_remaining from public.get_my_weekly_activity_allowance()),10,'only shared reservation refunded');
select is((select test_id_remaining from public.get_my_weekly_activity_allowance()),6,'abandonment does not refund ID use');
select ok((select session_id::text from public.start_test_session(current_setting('weekly.generated'),'retake'))<>current_setting('weekly.first'),'new key after closure creates repeat attempt');
select ok((select bool_and(public.start_test_session_configured('WEEKLY'||lpad(n::text,6,'0'),'new-'||n,null) ? 'session_id')
 from generate_series(1,5) n),'new attempts through configured path consume ID slots');
select is((select test_id_remaining from public.get_my_weekly_activity_allowance()),0,'seventh use succeeds');
select throws_ok($$select public.start_test_session('WEEKLY000006','eighth')$$,'42501',
 'Weekly Test ID allowance reached. It resets Monday at 00:00 UTC.','eighth legacy launch denied');
select throws_ok($$select public.start_test_session_configured('WEEKLY000006','eighth',null)$$,'42501',null,'eighth configured launch denied');
select is((select shared_remaining from public.get_my_weekly_activity_allowance()),4,'denied Test ID attempts consume no shared slots');

select set_config('weekly.quiz',(public.start_quiz('00000000-0000-0000-0000-000000036021')->>'session_id'),true);
select ok(public.get_practice_session_settings(current_setting('weekly.quiz')::uuid) @> '{"mode":"Quiz","timer_seconds":null}','free Quiz is untimed');
select is((select count(*)::int from public.get_test_session(current_setting('weekly.quiz')::uuid)),20,'free Quiz has 20 questions');
select is((public.start_quiz('00000000-0000-0000-0000-000000036021')->>'session_id'),current_setting('weekly.quiz'),'lost-response Quiz retry returns original session');
select is((select shared_remaining from public.get_my_weekly_activity_allowance()),3,'Quiz only charges shared allowance');
select set_config('weekly.hc',(public.start_hardcore(gen_random_uuid())->>'id'),true);
select ok(public.start_quiz(gen_random_uuid()) ? 'session_id','mixed launch can use ninth shared slot');
select ok(public.start_hardcore(gen_random_uuid()) ? 'id','Hardcore takes the tenth shared slot');
select is((select shared_remaining from public.get_my_weekly_activity_allowance()),0,'shared allowance exhausted across Test, Quiz, Hardcore');
select throws_ok($$select public.start_quiz(gen_random_uuid())$$,'42501',
 'Weekly Test, Quiz and Hardcore allowance reached. It resets Monday at 00:00 UTC.','free Quiz blocked before answering');
select throws_ok($$select public.start_hardcore(gen_random_uuid())$$,'42501',null,'Hardcore obeys shared allowance');
select lives_ok($$select public.submit_test_session(current_setting('weekly.quiz')::uuid,1)$$,'reserved Quiz can finish at cap without a second charge');
select ok(public.get_my_activity_analytics() @> '{"test_count":1}','completed free Quiz is in combined analytics');
select throws_ok($$select public.get_test_result_explanations(current_setting('weekly.quiz')::uuid)$$,'P0001',null,'free Quiz explanations denied');
select is(public.abandon_hardcore(current_setting('weekly.hc')::uuid)->>'closed_without_result','abandoned','Hardcore explicit abandonment closes without score');
select is((select shared_remaining from public.get_my_weekly_activity_allowance()),1,'Hardcore abandonment refunds shared slot');
select throws_ok($$select public.advance_hardcore(current_setting('weekly.hc')::uuid,1,gen_random_uuid(),'A')$$,'22023',null,'abandoned run cannot advance');

-- Move one authenticated launch receipt back a week using only the trusted
-- fixture role. Finishing in the new week must not consume another slot.
select set_config('weekly.rollover',(public.start_quiz(gen_random_uuid())->>'session_id'),true);
reset role;
update private.weekly_free_activity_claims set week_start=week_start-interval '168 hours'
where operation_id=current_setting('weekly.rollover')::uuid;
set local role authenticated;
select is((select shared_remaining from public.get_my_weekly_activity_allowance()),1,'prior launch week ignored by current balance');
select lives_ok($$select public.submit_test_session(current_setting('weekly.rollover')::uuid,1)$$,'run started last week can complete');
select is((select shared_remaining from public.get_my_weekly_activity_allowance()),1,'cross-reset completion never charges this week');
select set_config('weekly.expire',(public.start_quiz(gen_random_uuid())->>'session_id'),true);
reset role;
update public.test_sessions set status='expired',active_period_started_at=null
where id=current_setting('weekly.expire')::uuid;
set local role authenticated;
select is((select shared_remaining from public.get_my_weekly_activity_allowance()),1,'terminal no-result expiry refunds original shared reservation');
select is(public.abandon_test_session(current_setting('weekly.expire')::uuid),'expired','closed expiry remains terminal');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000036002',true);
select throws_ok($$select public.abandon_test_session(current_setting('weekly.quiz')::uuid)$$,'42501',null,'another user cannot abandon a session');
select ok(public.start_quiz(gen_random_uuid()) ? 'session_id','expired subscription still has free Quiz access');
select is((select shared_remaining from public.get_my_weekly_activity_allowance()),9,'expired subscription uses its own free slots');
select set_config('weekly.timed',(select session_id from public.start_test_session('WEEKLY000008','timed'))::text,true);
reset role;
update public.test_sessions set timer_seconds=60,active_period_started_at=now()-interval '61 seconds'
where id=current_setting('weekly.timed')::uuid;
set local role authenticated;
select is(public.abandon_test_session(current_setting('weekly.timed')::uuid),'submitted','elapsed timer auto-submits instead of abandoning');
select is((select shared_remaining from public.get_my_weekly_activity_allowance()),8,'scored auto-submit keeps its shared slot');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000036003',true);
select ok(public.start_quiz(gen_random_uuid()) ? 'session_id','trusted Premium profile can launch without Stripe');
select ok((select paid and shared_remaining=10 from public.get_my_weekly_activity_allowance()),'Premium launch does not charge');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000036004',true);
select ok(public.start_quiz(gen_random_uuid()) ? 'session_id','unpaid staff can start a free Quiz');
select ok((select not paid and shared_remaining=9 from public.get_my_weekly_activity_allowance()),'unpaid staff uses free allowance');
reset role;
select * from finish();
rollback;
