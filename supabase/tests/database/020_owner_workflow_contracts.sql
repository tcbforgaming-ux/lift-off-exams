begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at,aud,role) values
 ('00000000-0000-0000-0000-000000020001','phase-d-owner@example.test',now(),'authenticated','authenticated'),
 ('00000000-0000-0000-0000-000000020002','phase-d-recipient@example.test',now(),'authenticated','authenticated'),
 ('00000000-0000-0000-0000-000000020003','phase-d-standard@example.test',now(),'authenticated','authenticated'),
 ('00000000-0000-0000-0000-000000020004','phase-d-other@example.test',now(),'authenticated','authenticated');
update public.profiles set role='owner' where user_id='00000000-0000-0000-0000-000000020001';
create temp table phase_d(key text primary key,id uuid,token text);
grant all on phase_d to authenticated;
create function pg_temp.reject_governance_audit() returns trigger language plpgsql as $$
begin
  if new.action='governance.executed' and new.reason='Audit failure fixture' then raise exception 'Injected governance audit failure'; end if;
  return new;
end;
$$;
create trigger reject_governance_audit before insert on public.admin_audit_logs for each row execute function pg_temp.reject_governance_audit();
select ok(not has_table_privilege('authenticated','public.governance_ballots','INSERT'),'browser cannot forge a ballot');
select ok(not has_table_privilege('authenticated','private.owner_invitations','SELECT'),'browser cannot read invitation hashes');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000020003',true);
select throws_ok($q$select public.list_owner_governance('roles')$q$,'42501','Eligible owner access required.','student cannot list governance');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000020001',true);
insert into phase_d(key,id) values('admin',public.request_owner_action('admin_create','00000000-0000-0000-0000-000000020003',null,'Sole owner approval'));
select throws_ok($q$select public.act_on_owner_proposal((select id from phase_d where key='admin'),'execute')$q$,'P0001','Not enough eligible approvals. Refresh the proposal.','execution requires a ballot');
select public.act_on_owner_proposal((select id from phase_d where key='admin'),'approve');
select is(public.act_on_owner_proposal((select id from phase_d where key='admin'),'execute')->>'status','Executed','sole owner can approve admin promotion');
select throws_ok($q$select public.act_on_owner_proposal((select id from phase_d where key='admin'),'execute')$q$,'P0001','Proposal is closed or expired.','repeated execution denied');
insert into phase_d(key,id) values('audit',public.request_owner_action('admin_create','00000000-0000-0000-0000-000000020004',null,'Audit failure fixture'));
select public.act_on_owner_proposal((select id from phase_d where key='audit'),'approve');
select throws_ok($q$select public.act_on_owner_proposal((select id from phase_d where key='audit'),'execute')$q$,'P0001','Injected governance audit failure','audit failure rolls back role change');
insert into phase_d(key,id) values('invite',public.request_owner_action('owner_invite',null,'phase-d-recipient@example.test','New owner fixture'));
select public.act_on_owner_proposal((select id from phase_d where key='invite'),'approve');
update phase_d set token=public.act_on_owner_proposal(id,'execute')->>'token' where key='invite';
insert into phase_d(key,id) values('revoked',public.request_owner_action('owner_invite',null,'phase-d-other@example.test','Revoked fixture'));
select public.act_on_owner_proposal((select id from phase_d where key='revoked'),'approve');
update phase_d set token=public.act_on_owner_proposal(id,'execute')->>'token' where key='revoked';
select is(public.act_on_owner_proposal((select id from phase_d where key='revoked'),'revoke')->>'status','Revoked','eligible owner revokes an unused invitation');
insert into phase_d(key,id) values('expired',public.request_owner_action('owner_invite',null,'phase-d-other@example.test','Expired fixture'));
select public.act_on_owner_proposal((select id from phase_d where key='expired'),'approve');
update phase_d set token=public.act_on_owner_proposal(id,'execute')->>'token' where key='expired';
reset role;
update private.owner_invitations set expires_at=now()-interval '1 second' where proposal_id=(select id from phase_d where key='expired');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000020004',true);
select throws_ok($q$select public.accept_owner_invitation((select token from phase_d where key='revoked'))$q$,'P0001','Invalid or expired owner invitation.','revoked invitation cannot be accepted');
select throws_ok($q$select public.accept_owner_invitation((select token from phase_d where key='expired'))$q$,'P0001','Invalid or expired owner invitation.','expired invitation cannot be accepted');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000020003',true);
select throws_ok($q$select public.accept_owner_invitation((select token from phase_d where key='invite'))$q$,'42501','Sign in with the confirmed email this invitation was sent to.','wrong recipient denied');
select throws_ok($q$select public.list_owner_governance('history')$q$,'42501','Eligible owner access required.','administrator cannot read governance');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000020002',true);
select lives_ok($q$select public.accept_owner_invitation((select token from phase_d where key='invite'))$q$,'confirmed recipient can accept');
select throws_ok($q$select public.accept_owner_invitation((select token from phase_d where key='invite'))$q$,'P0001','Invalid or expired owner invitation.','invitation replay denied');
select throws_ok($q$select public.set_user_platform_role('00000000-0000-0000-0000-000000020004','admin','Bypass quorum')$q$,
 'P0001','Use an approved role proposal when multiple eligible owners exist.','legacy role RPC cannot bypass multi-owner quorum');
select throws_ok($q$select public.act_on_owner_proposal((select id from phase_d where key='audit'),'execute')$q$,
 'P0001','Not enough eligible approvals. Refresh the proposal.','two owners require two distinct approvals');
reset role;
select is((select role from public.profiles where user_id='00000000-0000-0000-0000-000000020004'),'student','audit rollback left target unchanged');
select is((select actor_user_id::text from public.admin_audit_logs where action='governance.invitation_accepted'),'00000000-0000-0000-0000-000000020002','acceptance audit attributes the recipient');
update public.profiles set role='owner' where user_id='00000000-0000-0000-0000-000000020004';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000020001',true);
insert into phase_d(key,id) values('removal',public.initiate_owner_removal_vote('00000000-0000-0000-0000-000000020004','Two eligible non-target owners'));
select is(public.cast_owner_removal_vote((select id from phase_d where key='removal'),'Approve'),'Recorded','one of two approvals does not remove owner');
select is(public.get_owner_removal_required_approvals('00000000-0000-0000-0000-000000020004'),2,'two eligible non-target owners require both ballots');
reset role;
update public.profiles set role='owner' where user_id='00000000-0000-0000-0000-000000020003';
update public.profiles set owner_state='governance_suspended',owner_privileges_suspended=true where user_id='00000000-0000-0000-0000-000000020001';
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('amr',jsonb_build_array(
 jsonb_build_object('method','password','timestamp',extract(epoch from now()))))::text,true);
select throws_ok($q$select public.set_own_owner_privileges_suspended(false)$q$,'P0001','This owner state requires governance restoration.','governance-suspended owner cannot self-restore');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000020002',true);
select is(public.cast_owner_removal_vote((select id from phase_d where key='removal'),'Approve'),'Recorded','ineligible prior ballot no longer counts');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000020003',true);
select is(public.cast_owner_removal_vote((select id from phase_d where key='removal'),'Approve'),'Executed','two currently eligible non-target approvals execute removal');
select throws_ok($q$select public.cast_owner_removal_vote((select id from phase_d where key='removal'),'Approve')$q$,
 'P0001','Owner-removal vote is no longer open.','closed removal cannot execute twice');
reset role;
select is((select count(*)::integer from public.admin_audit_logs where action='Owner removed'),1,'removal writes one audit event');
insert into auth.users(id,email,aud,role) values ('00000000-0000-0000-0000-000000020005','phase-d-admin@example.test','authenticated','authenticated');
update public.profiles set role='admin' where user_id='00000000-0000-0000-0000-000000020005';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000020002',true);
insert into phase_d(key,id) values('suspend-admin',public.request_owner_action('admin_suspend','00000000-0000-0000-0000-000000020005',null,'Suspend synthetic administrator'));
select public.act_on_owner_proposal((select id from phase_d where key='suspend-admin'),'approve');
select throws_ok($q$select public.act_on_owner_proposal((select id from phase_d where key='suspend-admin'),'execute')$q$,
 'P0001','Not enough eligible approvals. Refresh the proposal.','admin suspension requires two owners when available');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000020003',true);
select public.act_on_owner_proposal((select id from phase_d where key='suspend-admin'),'approve');
select is(public.act_on_owner_proposal((select id from phase_d where key='suspend-admin'),'execute')->>'status','Executed','two owners suspend administrator');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000020005',true);
select is(public.current_user_role(),'student','suspended admin loses staff authority');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000020003',true);
insert into phase_d(key,id) values('suspend-owner',public.request_owner_action('owner_suspend','00000000-0000-0000-0000-000000020002',null,'Suspend synthetic owner'));
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000020002',true);
select throws_ok($q$select public.act_on_owner_proposal((select id from phase_d where key='suspend-owner'),'approve')$q$,
 '42501','The target cannot act on this proposal.','owner suspension excludes target vote');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000020003',true);
select public.act_on_owner_proposal((select id from phase_d where key='suspend-owner'),'approve');
select is(public.act_on_owner_proposal((select id from phase_d where key='suspend-owner'),'execute')->>'status','Executed','sole non-target owner is unanimous');
insert into phase_d(key,id) values('restore-owner',public.request_owner_action('owner_restore','00000000-0000-0000-0000-000000020002',null,'Restore synthetic owner'));
select public.act_on_owner_proposal((select id from phase_d where key='restore-owner'),'approve');
select is(public.act_on_owner_proposal((select id from phase_d where key='restore-owner'),'execute')->>'status','Executed','unanimous eligible peers restore owner');
select ok(public.is_eligible_owner('00000000-0000-0000-0000-000000020002'),'restored owner is eligible again');
insert into phase_d(key,id) values('reject',public.request_owner_action('admin_restore','00000000-0000-0000-0000-000000020005',null,'Reject synthetic restoration'));
select is(public.act_on_owner_proposal((select id from phase_d where key='reject'),'reject')->>'status','Rejected',
 'proposal closes when remaining eligible approvals cannot reach quorum');
select throws_ok($q$select public.act_on_owner_proposal((select id from phase_d where key='reject'),'approve')$q$,
 'P0001','Proposal is closed or expired.','rejected proposal cannot be re-opened by approval');
insert into phase_d(key,id) values('expired-removal',public.initiate_owner_removal_vote('00000000-0000-0000-0000-000000020002','Expired removal fixture'));
reset role;
select is((select count(*)::integer from public.user_notifications where type='owner_governance'
 and metadata->>'proposal_id'=(select id::text from phase_d where key='reject')),3,'proposal queues one notification for each owner');
update public.governance_votes set expires_at=now()-interval '1 second' where id=(select id from phase_d where key='expired-removal');
set local role authenticated;
select throws_ok($q$select public.cast_owner_removal_vote((select id from phase_d where key='expired-removal'),'Approve')$q$,
 'P0001','Owner-removal vote has expired.','expired removal cannot execute');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000020002',true);
select is(public.set_own_owner_privileges_suspended(true),'Suspended','eligible owner may self-suspend with a remaining peer');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000020003',true);
insert into phase_d(key,id) values('self-suspended-removal',public.initiate_owner_removal_vote(
 '00000000-0000-0000-0000-000000020002','Self-suspended owner remains removable'));
select is(public.cast_owner_removal_vote((select id from phase_d where key='self-suspended-removal'),'Approve'),
 'Executed','one eligible non-target owner can remove a self-suspended owner');
select throws_ok($q$select public.initiate_owner_removal_vote('00000000-0000-0000-0000-000000020003','Last eligible owner')$q$,
 'P0001','At least one eligible non-target owner is required for owner removal.','last eligible owner cannot be removed');
reset role;
select * from finish();
rollback;
