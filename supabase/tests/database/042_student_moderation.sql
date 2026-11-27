begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users(id,email,aud,role)
select ('42000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,
  'moderation-'||n||'@example.test','authenticated','authenticated' from generate_series(1,4)n;
update public.profiles set role='admin' where user_id='42000000-0000-0000-0000-000000000001';
update public.profiles set role='owner' where user_id='42000000-0000-0000-0000-000000000004';
create function pg_temp.reject_moderation_audit() returns trigger language plpgsql as $$
begin
 if new.reason='Rollback moderation test' then raise exception 'Synthetic moderation audit failure';end if;
 return new;
end;$$;
create trigger moderation_test_failure before insert on public.admin_audit_logs
for each row execute function pg_temp.reject_moderation_audit();
set local role authenticated;
select set_config('request.jwt.claim.sub','42000000-0000-0000-0000-000000000002',true);
select throws_ok($$select public.moderate_student('42000000-0000-0000-0000-000000000003','suspend','No student moderation','42000000-0000-0000-0000-000000000011')$$,'42501',null,'student cannot moderate another account');
select set_config('request.jwt.claim.sub','42000000-0000-0000-0000-000000000001',true);
select throws_ok($$select public.moderate_student('42000000-0000-0000-0000-000000000003','suspend','Rollback moderation test',
 '42000000-0000-0000-0000-000000000019')$$,'P0001','Synthetic moderation audit failure','audit failure aborts suspension and email queue');
select is((select suspended_until from public.profiles where user_id='42000000-0000-0000-0000-000000000003'),null::timestamptz,
 'failed moderation preserved original account state');
select throws_ok($$select public.moderate_student('42000000-0000-0000-0000-000000000004','suspend','Cannot suspend owners','42000000-0000-0000-0000-000000000012')$$,'P0001',null,'owner governance remains authoritative');
create temp table active_suspension as select public.moderate_student('42000000-0000-0000-0000-000000000002','suspend',
 'Synthetic moderation reason','42000000-0000-0000-0000-000000000013',null,null,7) id;
select is(public.moderate_student('42000000-0000-0000-0000-000000000002','suspend','Synthetic moderation reason',
 '42000000-0000-0000-0000-000000000013',null,null,7),(select id from active_suspension),'same request safely retries');
select set_config('request.jwt.claim.sub','42000000-0000-0000-0000-000000000002',true);
select ok((public.get_my_suspension()->>'suspended')::boolean,'suspended account can read own status');
select set_config('request.path','/test_results',true);
select throws_ok('select public.enforce_account_lifecycle()','42501','Account suspension access only.','old signed-in token cannot read results through the API');
select set_config('request.path','/rpc/start_quiz',true);
select throws_ok('select public.enforce_account_lifecycle()','42501',null,'old token cannot launch activities');
select set_config('request.path','/rpc/submit_suspension_appeal',true);
select lives_ok('select public.enforce_account_lifecycle()','appeal remains allowed');
select ok(public.submit_suspension_appeal((select id from active_suspension),'Please review the supporting information.') ? 'record','own appeal submitted');
select ok(public.submit_suspension_appeal((select id from active_suspension),'Please review the supporting information.') ? 'record','appeal retry does not duplicate');
select throws_ok($$select public.submit_suspension_appeal((select id from active_suspension),'A different appeal')$$,'P0001',null,'one appeal per suspension');
select set_config('request.jwt.claim.sub','42000000-0000-0000-0000-000000000003',true);
select throws_ok($$select public.submit_suspension_appeal((select id from active_suspension),'Cross user appeal')$$,'42501',null,'another account cannot use this appeal');
select set_config('request.jwt.claim.sub','42000000-0000-0000-0000-000000000004',true);
select lives_ok($$select public.moderate_student('42000000-0000-0000-0000-000000000002','approve','Appeal approved on review',
 '42000000-0000-0000-0000-000000000014',(select id from active_suspension),1)$$,'owner approval restores access');
select throws_ok($$select public.moderate_student('42000000-0000-0000-0000-000000000002','deny','A stale decision',
 '42000000-0000-0000-0000-000000000015',(select id from active_suspension),1)$$,'P0001',null,'competing stale decision is rejected');
select set_config('request.jwt.claim.sub','42000000-0000-0000-0000-000000000002',true);
select ok(not (public.get_my_suspension()->>'suspended')::boolean,'access restored immediately after approved appeal');
select set_config('request.path','/rpc/start_quiz',true);
select lives_ok('select public.enforce_account_lifecycle()','restored user passes API gate');
reset role;
select is((select count(*) from private.moderation_mail),3::bigint,'one durable notice per suspension, appeal receipt and approval');
set local role authenticated;
select set_config('request.jwt.claim.sub','42000000-0000-0000-0000-000000000001',true);
select public.moderate_student('42000000-0000-0000-0000-000000000003','suspend','Temporary suspension','42000000-0000-0000-0000-000000000016',null,null,1);
reset role;
update private.student_suspensions set expires_at=now()-interval '1 second' where user_id='42000000-0000-0000-0000-000000000003';
update public.profiles set suspended_until=now()-interval '1 second' where user_id='42000000-0000-0000-0000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','42000000-0000-0000-0000-000000000003',true);
select ok(not (public.get_my_suspension()->>'suspended')::boolean,'expiry restores access without scheduler');
select set_config('request.path','/test_sessions',true);
select lives_ok('select public.enforce_account_lifecycle()','expired account can access normal paths');
select set_config('request.jwt.claim.sub','42000000-0000-0000-0000-000000000001',true);
create temp table indefinite as select public.moderate_student('42000000-0000-0000-0000-000000000003',
 'suspend','Indefinite fixture restriction','42000000-0000-0000-0000-000000000030') id;
select set_config('request.jwt.claim.sub','42000000-0000-0000-0000-000000000003',true);
select is(public.get_my_suspension()->'record'->>'expires_at',null::text,'indefinite suspension has no guessed expiry');
select public.submit_suspension_appeal((select id from indefinite),'Please reconsider this indefinite restriction.');
select set_config('request.jwt.claim.sub','42000000-0000-0000-0000-000000000001',true);
select lives_ok($$select public.moderate_student('42000000-0000-0000-0000-000000000003','deny','Appeal denied with reason',
 '42000000-0000-0000-0000-000000000031',(select id from indefinite),1)$$,'appeal denial records the staff decision');
select lives_ok($$select public.moderate_student('42000000-0000-0000-0000-000000000003','modify','Reduce the restriction period',
 '42000000-0000-0000-0000-000000000032',(select id from indefinite),2,30)$$,'staff can change reason and duration after denial');
select lives_ok($$select public.moderate_student('42000000-0000-0000-0000-000000000003','restore','Manual staff reinstatement',
 '42000000-0000-0000-0000-000000000033',(select id from indefinite),3)$$,'manual staff reinstatement restores a denied appeal account');
reset role;
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
create temporary table mail_claim as select public.claim_moderation_mail() m;
select ok((select m is not null from mail_claim),'worker leases durable mail');
select ok((select public.finish_moderation_mail((m->>'id')::uuid,(m->>'lease')::uuid,false) from mail_claim),'failed adapter schedules retry');
select ok(not (select public.finish_moderation_mail((m->>'id')::uuid,(m->>'lease')::uuid,true) from mail_claim),'stale worker cannot acknowledge a released lease');
reset role;
select * from finish();
rollback;
