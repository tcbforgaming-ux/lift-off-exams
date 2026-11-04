create function private.reject_owner_proposal_if_blocked(p_id uuid,p_required integer) returns boolean
language plpgsql set search_path=pg_catalog,public,pg_temp as $$
declare v public.governance_votes; eligible integer; rejections integer;
begin
  select * into strict v from public.governance_votes where id=p_id;
  select count(*) into eligible from public.profiles p
  where p.user_id is distinct from v.target_user_id and public.is_eligible_owner(p.user_id);
  select count(*) into rejections from public.governance_ballots b where b.vote_id=p_id
    and b.decision='Reject' and b.withdrawn_at is null
    and b.owner_user_id is distinct from v.target_user_id and public.is_eligible_owner(b.owner_user_id);
  if rejections=0 or eligible-rejections>=p_required then return false; end if;
  update public.governance_votes set status='Rejected',resolved_at=clock_timestamp(),
    metadata=metadata||jsonb_build_object('rejections',rejections,'eligible_voters',eligible)
  where id=p_id and status='Open';
  if not found then return false; end if;
  perform public.write_admin_audit('governance.rejected','governance_vote',p_id::text,v.reason,
    jsonb_build_object('rejections',rejections,'eligible_voters',eligible,'required_approvals',p_required));
  return true;
end;
$$;
revoke all on function private.reject_owner_proposal_if_blocked(uuid,integer) from public,anon,authenticated,service_role;

do $$
declare definition text; anchor text;
begin
  definition:=pg_get_functiondef('public.cast_owner_removal_vote(uuid,text)'::regprocedure);
  anchor:=$a$  select count(*)::integer
  into approve_count$a$;
  if strpos(definition,anchor)=0 then raise exception 'Unexpected removal quorum calculation'; end if;
  execute replace(definition,anchor,$r$  if private.reject_owner_proposal_if_blocked(p_vote_id,public.get_owner_removal_required_approvals(vote_row.target_user_id)) then
    return 'Rejected';
  end if;
  select count(*)::integer
  into approve_count$r$);

  definition:=pg_get_functiondef('public.act_on_owner_proposal(uuid,text)'::regprocedure);
  anchor:=$a$  if p_action='approve' then
    insert into public.governance_ballots(vote_id,owner_user_id,decision)
    values(p_id,actor,'Approve') on conflict(vote_id,owner_user_id)
    do update set decision='Approve',withdrawn_at=null
    where governance_ballots.withdrawn_at is not null or governance_ballots.decision<>'Approve';
    if found then perform public.write_admin_audit('governance.approved','governance_vote',p_id::text,v.reason,'{}'); end if;
    return jsonb_build_object('status','Recorded');$a$;
  if strpos(definition,anchor)=0 then raise exception 'Unexpected proposal ballot implementation'; end if;
  execute replace(definition,anchor,$r$  if p_action in ('approve','reject') then
    insert into public.governance_ballots(vote_id,owner_user_id,decision)
    values(p_id,actor,initcap(p_action)) on conflict(vote_id,owner_user_id)
    do update set decision=excluded.decision,withdrawn_at=null
    where governance_ballots.withdrawn_at is not null or governance_ballots.decision<>excluded.decision;
    if found then perform public.write_admin_audit('governance.ballot_cast','governance_vote',p_id::text,v.reason,
      jsonb_build_object('decision',initcap(p_action))); end if;
    if private.reject_owner_proposal_if_blocked(p_id,case when v.vote_kind='owner_suspend'
      then greatest(1,private.owner_action_quorum(v.vote_kind)-1) else private.owner_action_quorum(v.vote_kind) end)
    then return jsonb_build_object('status','Rejected'); end if;
    return jsonb_build_object('status','Recorded');$r$);
end;
$$;

create function private.queue_owner_proposal_notice() returns trigger
language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
begin
  insert into public.user_notifications(user_id,type,title,message,metadata)
  select p.user_id,'owner_governance','New owner governance proposal',
    'Review the proposal in Owner Governance.',jsonb_build_object('proposal_id',new.id)
  from public.profiles p where p.role='owner' or p.owner_state='self_suspended';
  return new;
end;
$$;
revoke all on function private.queue_owner_proposal_notice() from public,anon,authenticated,service_role;
create trigger queue_owner_proposal_notice after insert on public.governance_votes for each row
when (new.vote_kind in ('owner_removal','admin_create','admin_suspend','admin_restore','owner_invite','owner_suspend','owner_restore'))
execute function private.queue_owner_proposal_notice();
