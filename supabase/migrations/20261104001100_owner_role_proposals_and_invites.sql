create table private.owner_invitations (
  proposal_id uuid primary key references public.governance_votes(id),
  token_hash bytea not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  revoked_at timestamptz
);
revoke all on private.owner_invitations from public,anon,authenticated,service_role;

create function private.owner_action_quorum(p_kind text) returns integer
language sql stable set search_path=pg_catalog,public,pg_temp as $$
  select greatest(1,case when p_kind='owner_invite' then public.get_active_owner_count()
    else least(2,public.get_active_owner_count()) end)
$$;
revoke all on function private.owner_action_quorum(text) from public,anon,authenticated,service_role;

-- Preserve the legacy sole-owner action, but a supplied vote UUID can never
-- bypass the live multi-owner approval requirement.
do $$
declare definition text:=pg_get_functiondef('public.set_user_platform_role(uuid,text,text,uuid)'::regprocedure);
  anchor text:=$a$  if not public.is_owner() then$a$;
begin
  if strpos(definition,anchor)=0 then raise exception 'Unexpected legacy role guard'; end if;
  execute replace(definition,anchor,$r$  perform pg_advisory_xact_lock(64352884011);
  if public.is_eligible_owner(actor_id) and public.get_active_owner_count()<>1 then
    raise exception 'Use an approved role proposal when multiple eligible owners exist.';
  end if;
  if not public.is_owner() then$r$);
end;
$$;

create function public.request_owner_action(p_kind text,p_target uuid,p_email text,p_reason text)
returns uuid language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare actor uuid:=auth.uid(); proposal uuid; email text:=lower(btrim(p_email)); reason text:=btrim(p_reason);
begin
  perform pg_advisory_xact_lock(64352884011);
  if not public.is_eligible_owner(actor) then raise insufficient_privilege using message='Eligible owner access required.'; end if;
  if coalesce(length(reason),0) not between 1 and 1000 then raise exception 'Provide a reason of up to 1000 characters.'; end if;
  if p_kind='owner_invite' then
    if p_target is not null or email is null or length(email)>254 or email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    then raise exception 'Enter the intended recipient email.'; end if;
  elsif p_kind='admin_create' then
    if email is not null or not exists(select 1 from public.profiles p where p.user_id=p_target and p.role='student'
      and p.owner_state='active' and (p.suspended_until is null or p.suspended_until<now()))
    then raise exception 'Select an active standard user.'; end if;
  else raise exception 'Unsupported governance action.'; end if;
  if exists(select 1 from public.governance_votes v where v.vote_kind=p_kind and v.status='Open' and v.expires_at>now()
    and v.target_user_id is not distinct from p_target and v.target_email is not distinct from email)
  then raise exception 'An open proposal already exists for this action.'; end if;
  insert into public.governance_votes(action,vote_kind,target_user_id,target_email,threshold,required_approvals,reason,created_by,expires_at)
  values(case when p_kind='owner_invite' then 'Invite owner' else 'Grant administrator access' end,
    p_kind,p_target,email,'Live eligible owner quorum',private.owner_action_quorum(p_kind),reason,actor,now()+interval '7 days')
  returning id into proposal;
  perform public.write_admin_audit('governance.proposed','governance_vote',proposal::text,reason,
    jsonb_build_object('kind',p_kind,'target_user_id',p_target,'target_email',email));
  return proposal;
end;
$$;

create function public.act_on_owner_proposal(p_id uuid,p_action text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare actor uuid:=auth.uid(); v public.governance_votes; approvals integer; token text; until_at timestamptz;
begin
  perform pg_advisory_xact_lock(64352884011);
  if not public.is_eligible_owner(actor) then raise insufficient_privilege using message='Eligible owner access required.'; end if;
  select * into v from public.governance_votes where id=p_id and vote_kind in ('admin_create','owner_invite') for update;
  if not found then raise exception 'Proposal not found.'; end if;
  if p_action='revoke' and v.vote_kind='owner_invite' then
    update private.owner_invitations set revoked_at=now()
    where proposal_id=p_id and consumed_at is null and revoked_at is null and expires_at>now();
    if not found then raise exception 'No active invitation to revoke.'; end if;
    perform public.write_admin_audit('governance.invitation_revoked','governance_vote',p_id::text,v.reason,'{}');
    return jsonb_build_object('status','Revoked');
  end if;
  if v.status<>'Open' or v.expires_at<=now() then raise exception 'Proposal is closed or expired.'; end if;
  if p_action='approve' then
    insert into public.governance_ballots(vote_id,owner_user_id,decision)
    values(p_id,actor,'Approve') on conflict(vote_id,owner_user_id)
    do update set decision='Approve',withdrawn_at=null
    where governance_ballots.withdrawn_at is not null or governance_ballots.decision<>'Approve';
    if found then perform public.write_admin_audit('governance.approved','governance_vote',p_id::text,v.reason,'{}'); end if;
    return jsonb_build_object('status','Recorded');
  elsif p_action='withdraw' then
    update public.governance_ballots set withdrawn_at=now() where vote_id=p_id and owner_user_id=actor and withdrawn_at is null;
    if not found then raise exception 'No active approval to withdraw.'; end if;
    perform public.write_admin_audit('governance.withdrawn','governance_vote',p_id::text,v.reason,'{}');
    return jsonb_build_object('status','Withdrawn');
  elsif p_action is distinct from 'execute' then raise exception 'Unsupported proposal action.'; end if;
  select count(*) into approvals from public.governance_ballots
  where vote_id=p_id and decision='Approve' and withdrawn_at is null and public.is_eligible_owner(owner_user_id);
  if approvals<private.owner_action_quorum(v.vote_kind) then raise exception 'Not enough eligible approvals. Refresh the proposal.'; end if;
  if v.vote_kind='admin_create' then
    update public.profiles set role='admin',updated_at=now()
    where user_id=v.target_user_id and role='student' and owner_state='active' and (suspended_until is null or suspended_until<now());
    if not found then raise exception 'Target role or eligibility changed.'; end if;
  else
    token:=encode(extensions.gen_random_bytes(32),'hex');
    until_at:=now()+interval '7 days';
    insert into private.owner_invitations values(p_id,extensions.digest(token,'sha256'),until_at,null,null);
  end if;
  update public.governance_votes set status='Executed',resolved_at=now(),executed_at=now(),
    metadata=metadata||jsonb_build_object('executed_approvals',approvals) where id=p_id;
  perform public.write_admin_audit('governance.executed','governance_vote',p_id::text,v.reason,
    jsonb_build_object('kind',v.vote_kind,'target_user_id',v.target_user_id,'target_email',v.target_email,'approvals',approvals));
  return jsonb_build_object('status','Executed','token',token,'expires_at',until_at);
end;
$$;

create function public.accept_owner_invitation(p_token text)
returns void language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare actor uuid:=auth.uid(); invitation private.owner_invitations; v public.governance_votes; approvals integer;
begin
  perform pg_advisory_xact_lock(64352884011);
  if actor is null or p_token is null or p_token !~ '^[0-9a-f]{64}$' then raise exception 'Invalid owner invitation.'; end if;
  select * into invitation from private.owner_invitations
  where token_hash=extensions.digest(p_token,'sha256') and consumed_at is null and revoked_at is null and expires_at>now() for update;
  if not found then raise exception 'Invalid or expired owner invitation.'; end if;
  select * into v from public.governance_votes where id=invitation.proposal_id;
  if not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null and lower(email)=v.target_email)
  then raise insufficient_privilege using message='Sign in with the confirmed email this invitation was sent to.'; end if;
  select count(*) into approvals from public.governance_ballots
  where vote_id=v.id and decision='Approve' and withdrawn_at is null and public.is_eligible_owner(owner_user_id);
  if approvals<private.owner_action_quorum('owner_invite') then raise exception 'Owner eligibility changed. Request a fresh invitation.'; end if;
  update public.profiles set role='owner',owner_state='active',owner_privileges_suspended=false,
    owner_state_updated_at=now(),last_owner_activity_at=now(),updated_at=now()
  where user_id=actor and role in ('student','admin') and owner_state='active' and (suspended_until is null or suspended_until<now());
  if not found then raise exception 'This account is not eligible to accept an owner invitation.'; end if;
  update private.owner_invitations set consumed_at=now() where proposal_id=v.id;
  perform public.write_admin_audit('governance.invitation_accepted','governance_vote',v.id::text,v.reason,
    jsonb_build_object('new_owner_id',actor));
end;
$$;
revoke all on function public.request_owner_action(text,uuid,text,text),public.act_on_owner_proposal(uuid,text),
  public.accept_owner_invitation(text) from public,anon,authenticated,service_role;
grant execute on function public.request_owner_action(text,uuid,text,text),public.act_on_owner_proposal(uuid,text),
  public.accept_owner_invitation(text) to authenticated;
