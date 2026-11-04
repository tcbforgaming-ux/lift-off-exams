create function private.require_recent_owner_authentication() returns void
language plpgsql stable set search_path=pg_catalog,pg_temp as $$
declare methods jsonb:=auth.jwt()->'amr';
begin
  if auth.uid() is null or jsonb_typeof(methods) is distinct from 'array' then
    raise insufficient_privilege using message='Reauthenticate before changing owner access.';
  end if;
  if not exists (
    select 1 from jsonb_array_elements(methods) m
    where m->>'method' in ('password','oauth')
      and case when jsonb_typeof(m->'timestamp')='number'
        then (m->>'timestamp')::numeric between extract(epoch from now())-300 and extract(epoch from now())+30
        else false end
  ) then raise insufficient_privilege using message='Reauthenticate before changing owner access.'; end if;
end;
$$;
revoke all on function private.require_recent_owner_authentication() from public,anon,authenticated,service_role;

do $$
declare definition text:=pg_get_functiondef('public.set_own_owner_privileges_suspended(boolean)'::regprocedure);
  anchor text:=$a$  perform pg_advisory_xact_lock(64352884011);$a$;
begin
  if strpos(definition,anchor)=0 then raise exception 'Unexpected self-suspension implementation'; end if;
  definition:=replace(definition,anchor,$r$  perform private.require_recent_owner_authentication();
  perform pg_advisory_xact_lock(64352884011);$r$);
  definition:=replace(definition,$a$    or profile_row.owner_state <> 'self_suspended' then$a$,
    $r$    or profile_row.owner_state not in ('self_suspended','inactive_suspended')
    or (profile_row.suspended_until is not null and profile_row.suspended_until>=now()) then$r$);
  execute definition;
end;
$$;

create or replace function private.owner_action_quorum(p_kind text) returns integer
language sql stable set search_path=pg_catalog,public,pg_temp as $$
  select greatest(1,case when p_kind in ('owner_invite','owner_suspend','owner_restore')
    then public.get_active_owner_count() else least(2,public.get_active_owner_count()) end)
$$;

create function private.owner_action_target_matches(p_kind text,p_target uuid) returns boolean
language sql stable set search_path=pg_catalog,public,pg_temp as $$
  select exists(select 1 from public.profiles p where p.user_id=p_target and case p_kind
    when 'admin_create' then p.role='student' and p.owner_state='active' and (p.suspended_until is null or p.suspended_until<now())
    when 'admin_suspend' then p.role='admin' and p.owner_state='active' and (p.suspended_until is null or p.suspended_until<now())
    when 'admin_restore' then p.role='admin' and p.owner_state='active' and p.suspended_until='infinity'
    when 'owner_suspend' then public.is_eligible_owner(p_target) and public.get_active_owner_count()>1
    when 'owner_restore' then p.role='owner' and p.owner_state='governance_suspended'
      and (p.suspended_until is null or p.suspended_until<now())
    else false end)
$$;
revoke all on function private.owner_action_target_matches(text,uuid) from public,anon,authenticated,service_role;

do $$
declare definition text; anchor text;
begin
  definition:=pg_get_functiondef('public.request_owner_action(text,uuid,text,text)'::regprocedure);
  anchor:=$a$  elsif p_kind='admin_create' then
    if email is not null or not exists(select 1 from public.profiles p where p.user_id=p_target and p.role='student'
      and p.owner_state='active' and (p.suspended_until is null or p.suspended_until<now()))
    then raise exception 'Select an active standard user.'; end if;$a$;
  if strpos(definition,anchor)=0 then raise exception 'Unexpected proposal request target check'; end if;
  definition:=replace(definition,anchor,$r$  elsif p_kind in ('admin_create','admin_suspend','admin_restore','owner_suspend','owner_restore') then
    if email is not null or p_target=actor or not private.owner_action_target_matches(p_kind,p_target)
    then raise exception 'Select an eligible target for this action.'; end if;$r$);
  definition:=replace(definition,$a$private.owner_action_quorum(p_kind),reason$a$,
    $r$case when p_kind='owner_suspend' then greatest(1,private.owner_action_quorum(p_kind)-1)
      else private.owner_action_quorum(p_kind) end,reason$r$);
  execute replace(definition,$a$case when p_kind='owner_invite' then 'Invite owner' else 'Grant administrator access' end$a$,
    $r$case p_kind when 'owner_invite' then 'Invite owner' when 'admin_create' then 'Grant administrator access'
      when 'admin_suspend' then 'Suspend administrator' when 'admin_restore' then 'Restore administrator'
      when 'owner_suspend' then 'Suspend owner by governance' when 'owner_restore' then 'Restore owner by governance' end$r$);

  definition:=pg_get_functiondef('public.act_on_owner_proposal(uuid,text)'::regprocedure);
  anchor:=$a$  if not found then raise exception 'Proposal not found.'; end if;$a$;
  if strpos(definition,anchor)=0 then raise exception 'Unexpected proposal lookup'; end if;
  definition:=replace(definition,$a$vote_kind in ('admin_create','owner_invite')$a$,
    $r$vote_kind in ('admin_create','admin_suspend','admin_restore','owner_invite','owner_suspend','owner_restore')$r$);
  definition:=replace(definition,anchor,$r$  if not found then raise exception 'Proposal not found.'; end if;
  if v.target_user_id=actor then raise insufficient_privilege using message='The target cannot act on this proposal.'; end if;$r$);
  definition:=replace(definition,$a$  if approvals<private.owner_action_quorum(v.vote_kind) then$a$,$r$  if approvals<(case when v.vote_kind='owner_suspend'
    then greatest(1,private.owner_action_quorum(v.vote_kind)-1) else private.owner_action_quorum(v.vote_kind) end) then$r$);
  anchor:=$a$  else
    token:=encode(extensions.gen_random_bytes(32),'hex');$a$;
  if strpos(definition,anchor)=0 then raise exception 'Unexpected proposal execution'; end if;
  execute replace(definition,anchor,$r$  elsif v.vote_kind in ('admin_suspend','admin_restore','owner_suspend','owner_restore') then
    if not private.owner_action_target_matches(v.vote_kind,v.target_user_id)
    then raise exception 'Target role or eligibility changed.'; end if;
    if v.vote_kind in ('admin_suspend','admin_restore') then
      update public.profiles set suspended_until=case when v.vote_kind='admin_suspend' then 'infinity'::timestamptz else null end,
        updated_at=now() where user_id=v.target_user_id;
    else
      update public.profiles set owner_state=case when v.vote_kind='owner_suspend' then 'governance_suspended' else 'active' end,
        owner_privileges_suspended=v.vote_kind='owner_suspend',
        owner_state_updated_at=now(),last_owner_activity_at=now(),updated_at=now()
      where user_id=v.target_user_id;
    end if;
  else
    token:=encode(extensions.gen_random_bytes(32),'hex');$r$);

  definition:=pg_get_functiondef('public.list_owner_governance(text,timestamptz,uuid)'::regprocedure);
  anchor:=$a$          when v.vote_kind='owner_invite' and v.status='Open' then greatest(1,public.get_active_owner_count())$a$;
  if strpos(definition,anchor)=0 then raise exception 'Unexpected governance list threshold'; end if;
  definition:=replace(definition,anchor,$r$          when v.vote_kind in ('owner_invite','owner_restore') and v.status='Open' then private.owner_action_quorum(v.vote_kind)
          when v.vote_kind='owner_suspend' and v.status='Open' then greatest(1,private.owner_action_quorum(v.vote_kind)-1)$r$);
  execute replace(definition,$a$        (select decision from public.governance_ballots$a$,$r$        (select case when i.consumed_at is not null then 'Accepted'
          when i.revoked_at is not null then 'Revoked' when i.expires_at<=now() then 'Expired' else 'Issued' end
          from private.owner_invitations i where i.proposal_id=v.id) as invitation_status,
        (select decision from public.governance_ballots$r$);
end;
$$;

create function public.record_owner_activity() returns void
language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
begin
  update public.profiles set last_owner_activity_at=now()
  where user_id=auth.uid() and public.is_eligible_owner(auth.uid())
    and last_owner_activity_at<now()-interval '1 hour';
end;
$$;
revoke all on function public.record_owner_activity() from public,anon,authenticated,service_role;
grant execute on function public.record_owner_activity() to authenticated;

create or replace function public.mark_inactive_owners(p_before timestamptz default now()-interval '7 days')
returns integer language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare changed integer;
begin
  perform private.assert_server_context();
  perform pg_advisory_xact_lock(64352884011);
  with suspended as (
    update public.profiles set owner_state='inactive_suspended',owner_privileges_suspended=true,
      owner_state_updated_at=now(),updated_at=now()
    where public.is_eligible_owner(user_id) and last_owner_activity_at<least(p_before,now()-interval '7 days')
      and user_id<>(select p.user_id from public.profiles p where public.is_eligible_owner(p.user_id)
        order by p.last_owner_activity_at desc,p.user_id limit 1)
    returning user_id
  )
  insert into public.admin_audit_logs(action,resource_type,resource_id,reason)
  select 'governance.inactivity_suspended','profile',user_id::text,'Owner inactivity exceeded seven days' from suspended;
  get diagnostics changed=row_count;
  return changed;
end;
$$;
