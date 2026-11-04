begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at,aud,role) values
 ('00000000-0000-0000-0000-000000021001','erase-user@example.test',now(),'authenticated','authenticated'),
 ('00000000-0000-0000-0000-000000021002','erase-owner@example.test',now(),'authenticated','authenticated'),
 ('00000000-0000-0000-0000-000000021003','erase-successor@example.test',now(),'authenticated','authenticated');
update public.profiles set role='owner' where user_id='00000000-0000-0000-0000-000000021002';
insert into public.subscriptions(user_id,stripe_subscription_id,status)
values('00000000-0000-0000-0000-000000021001','sub_fixture_erasure','active');
insert into public.question_reports(id,reporter_id,description,status)
values('00000000-0000-0000-0000-000000021010','00000000-0000-0000-0000-000000021001','Private report fixture','open');
insert into public.question_reports(reporter_id,description,status,duplicate_of,resolved_at,resolution_category,resolution_message)
values('00000000-0000-0000-0000-000000021003','Other account report','duplicate','00000000-0000-0000-0000-000000021010',now(),'duplicate','Duplicate fixture');
insert into public.admin_audit_logs(action,resource_type,reason,metadata,report_id)
values('Synthetic report moderation','question_report','erase-user@example.test',
 '{"linked_user":"00000000-0000-0000-0000-000000021001"}','00000000-0000-0000-0000-000000021010');
insert into public.test_ids(id,definition_id,mode,category,difficulties,topic_tags,question_count,pool_timestamp,created_by)
values('ERASURE00001','00000000-0000-0000-0000-000000021011','Test','Finance',array['Easy'],'{}',1,now(),'00000000-0000-0000-0000-000000021001');
insert into public.test_sessions(id,test_definition_id,user_id,status,mode,question_count,idempotency_key,active_period_started_at,submitted_at)
values('00000000-0000-0000-0000-000000021012','00000000-0000-0000-0000-000000021011','00000000-0000-0000-0000-000000021001','submitted','Test',1,'erase-fixture',null,now());
insert into public.test_results(session_id,user_id,test_definition_id,total_questions,answered_questions,unanswered_questions,correct_answers,incorrect_answers,
 raw_score,percentage,scoring_rule_version,explanation_policy_version,active_duration_seconds,submitted_at)
values('00000000-0000-0000-0000-000000021012','00000000-0000-0000-0000-000000021001','00000000-0000-0000-0000-000000021011',1,0,1,0,1,0,0,'single-choice-v1','stripe-entitlement-v1',0,now());

create temp table erasure_fixture(k text primary key,id uuid);
grant all on erasure_fixture to authenticated,service_role;
select ok(not has_function_privilege('authenticated','public.advance_account_erasure(uuid,text)','EXECUTE'),'browser cannot run worker');
select ok(not has_table_privilege('authenticated','public.account_deletion_requests','INSERT'),'legacy direct deletion requests denied');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000021001',true);
select throws_ok($q$select public.request_account_deletion('DELETE')$q$,'42501','Reauthenticate before changing owner access.','request requires recent authentication');
select set_config('request.jwt.claims',jsonb_build_object('amr',jsonb_build_array(
 jsonb_build_object('method','password','timestamp',extract(epoch from now()))))::text,true);
select is(public.request_account_deletion('DELETE')->>'state','pending','self-service request is pending');
select is(public.request_account_deletion('DELETE'),public.get_account_deletion_status(),'repeat keeps original deadline');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000021003',true);
select is(public.get_account_deletion_status()->>'state','active','unrelated user cannot see the pending request');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000021002',true);
select throws_ok($q$select public.request_account_deletion('DELETE')$q$,'P0001',
 'Complete an approved ownership transfer to another eligible owner before deleting this account.','last owner cannot request deletion');
reset role;
update public.profiles set role='owner' where user_id='00000000-0000-0000-0000-000000021003';
set local role authenticated;
select is(public.request_account_deletion('DELETE')->>'state','pending','completed successor promotion permits request');
select ok(not public.is_eligible_owner('00000000-0000-0000-0000-000000021002'),'pending owner excluded from governance quorum');
select is(public.recover_account_from_deletion()->>'state','cancelled','owner can recover before deadline');
select ok(public.is_eligible_owner('00000000-0000-0000-0000-000000021002'),'recovery restores prior eligibility without granting a role');
reset role;
insert into erasure_fixture select 'main',id from private.account_erasure_jobs where user_id='00000000-0000-0000-0000-000000021001';
update private.account_erasure_jobs set warning_due_at=now()-interval '8 days',base_deadline=now()-interval '1 day'
where id=(select id from erasure_fixture where k='main');
set local role service_role;
select is(public.advance_account_erasure((select id from erasure_fixture where k='main'),'warning'),'warning_failed','failed warning is retryable');
select is(public.advance_account_erasure((select id from erasure_fixture where k='main')),'warning_sent','fixture warning delivered');
select is(public.advance_account_erasure((select id from erasure_fixture where k='main')),'waiting','late delivery extends recovery by seven days');
reset role;
select is((select count(*)::integer from public.user_notifications where type='account_deletion_warning'),1,'warning retry creates one notification');
select is((select delivery_status from public.user_notifications where type='account_deletion_warning'),'Sent','delivery status tracks acknowledgement');
update private.account_erasure_jobs set warning_sent_at=now()-interval '8 days' where id=(select id from erasure_fixture where k='main');
update public.subscriptions set stripe_subscription_id=null where user_id='00000000-0000-0000-0000-000000021001';
set local role service_role;
select throws_ok($q$select public.advance_account_erasure((select id from erasure_fixture where k='main'))$q$,
 'P0001','The active subscription has no provider reference.','ambiguous billing blocks irreversible claim');
reset role;
update public.subscriptions set stripe_subscription_id='sub_fixture_erasure' where user_id='00000000-0000-0000-0000-000000021001';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000021001',true);
select throws_ok($q$select public.recover_account_from_deletion()$q$,'P0001','The recovery window is closed.','recovery denied at cutoff');
reset role;
set local role service_role;
select is(public.advance_account_erasure((select id from erasure_fixture where k='main')),'claimed','worker commits finalization claim');
select is(public.advance_account_erasure((select id from erasure_fixture where k='main'),'billing'),'billing_failed','failed billing retains finalization');
select is(public.advance_account_erasure((select id from erasure_fixture where k='main')),'billing_captured','fake provider receipt durable before acknowledgement');
select is(public.advance_account_erasure((select id from erasure_fixture where k='main')),'billing_checkpointed','retry consumes durable billing receipt');
select is(public.advance_account_erasure((select id from erasure_fixture where k='main'),'finish'),'finish_failed','failure after Auth deletion rolls back atomically');
reset role;
select is((select count(*)::integer from auth.users where email='erase-user@example.test'),1,'failed transaction leaves Auth identity intact');
select is((select count(*)::integer from public.test_results where user_id='00000000-0000-0000-0000-000000021001'),1,'failed transaction leaves saved result intact');
select is((select count(*)::integer from private.account_erasure_fixture_receipts where operation='billing'),1,'billing executed once');
set local role service_role;
select is(public.advance_account_erasure((select id from erasure_fixture where k='main')),'completed','retry deletes account and commits completion');
select is(public.advance_account_erasure((select id from erasure_fixture where k='main')),'completed','lost completion acknowledgement is safely replayed');
reset role;
select is((select count(*)::integer from auth.users where email='erase-user@example.test'),0,'Auth identity removed');
select is((select count(*)::integer from public.test_results where user_id='00000000-0000-0000-0000-000000021001'),0,'restricted result removed');
select is((select count(*)::integer from public.question_reports where reporter_id='00000000-0000-0000-0000-000000021001'),0,'personal report removed');
select is((select status from public.question_reports where reporter_id='00000000-0000-0000-0000-000000021003'),'in_review','another reporter remains without a dangling duplicate reference');
select is((select metadata from public.admin_audit_logs where action='Synthetic report moderation'),'{"anonymized":true}'::jsonb,'audit payload anonymized');
select ok(exists(select 1 from public.test_ids where id='ERASURE00001' and created_by is null),'shared Test ID retained without creator');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000021002',true);
select is(public.request_account_deletion('DELETE')->>'state','pending','eligible successor still permits a new request after recovery');
reset role;
insert into erasure_fixture select 'owner',id from private.account_erasure_jobs
where user_id='00000000-0000-0000-0000-000000021002' and state='pending';
update private.account_erasure_jobs set base_deadline=now()-interval '1 day',warning_sent_at=now()-interval '8 days'
where id=(select id from erasure_fixture where k='owner');
update public.profiles set owner_state='governance_suspended',owner_privileges_suspended=true
where user_id='00000000-0000-0000-0000-000000021003';
set local role service_role;
select throws_ok($q$select public.advance_account_erasure((select id from erasure_fixture where k='owner'))$q$,'P0001',
 'Complete an approved ownership transfer to another eligible owner before deleting this account.','finalization blocks when the successor is no longer eligible');
reset role;
select is((select state from private.account_erasure_jobs where id=(select id from erasure_fixture where k='owner')),
 'pending','failed owner prerequisite does not start irreversible work');
select * from finish();
rollback;
