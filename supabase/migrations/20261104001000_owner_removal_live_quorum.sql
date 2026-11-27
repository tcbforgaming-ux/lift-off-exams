-- Keep the approved automatic execution workflow, but serialize governance
-- changes and count only owners eligible at the moment of execution.
do $$
declare
  definition text;
  anchor text;
begin
  definition:=pg_get_functiondef('public.cast_owner_removal_vote(uuid,text)'::regprocedure);
  anchor:=$a$  if not public.is_eligible_owner(actor_id) then$a$;
  if strpos(definition,anchor)=0 then raise exception 'Unexpected removal authorization'; end if;
  definition:=replace(definition,anchor,$r$  perform pg_advisory_xact_lock(64352884011);
  if not public.is_eligible_owner(actor_id) then$r$);
  anchor:=$a$    and withdrawn_at is null;

  if approve_count >= vote_row.required_approvals then$a$;
  if strpos(definition,anchor)=0 then raise exception 'Unexpected removal ballot count'; end if;
  definition:=replace(definition,anchor,$r$    and withdrawn_at is null
    and owner_user_id <> vote_row.target_user_id
    and public.is_eligible_owner(owner_user_id);

  if approve_count >= public.get_owner_removal_required_approvals(vote_row.target_user_id) then$r$);
  anchor:=$a$      and role = 'owner';

    update public.governance_votes$a$;
  if strpos(definition,anchor)=0 then raise exception 'Unexpected removal target update'; end if;
  execute replace(definition,anchor,$r$      and (role = 'owner' or owner_state = 'self_suspended')
      and owner_state <> 'unavailable';
    if not found then raise exception 'Target owner is no longer removable.'; end if;

    update public.governance_votes$r$);

  definition:=pg_get_functiondef('public.initiate_owner_removal_vote(uuid,text,timestamptz)'::regprocedure);
  anchor:=$a$  if not public.is_eligible_owner(actor_id) then$a$;
  if strpos(definition,anchor)=0 then raise exception 'Unexpected removal initiation'; end if;
  definition:=replace(definition,anchor,$r$  perform pg_advisory_xact_lock(64352884011);
  if not public.is_eligible_owner(actor_id) then$r$);
  definition:=replace(definition,$a$if p_expires_at <= now() then$a$,
    $r$if p_expires_at is null or p_expires_at <= now() or p_expires_at > now() + interval '7 days' then$r$);
  execute definition;

  definition:=pg_get_functiondef('public.set_own_owner_privileges_suspended(boolean)'::regprocedure);
  anchor:=$a$  select *
  into profile_row$a$;
  if strpos(definition,anchor)=0 then raise exception 'Unexpected owner suspension'; end if;
  definition:=replace(definition,anchor,$r$  perform pg_advisory_xact_lock(64352884011);
  select *
  into profile_row$r$);
  anchor:=$a$    update public.profiles
    set role = 'admin',$a$;
  if strpos(definition,anchor)=0 then raise exception 'Unexpected owner suspension transition'; end if;
  execute replace(definition,anchor,$r$    if public.get_active_owner_count() <= 1 then
      raise exception 'The last eligible owner cannot suspend owner privileges.';
    end if;
    update public.profiles
    set role = 'admin',$r$);

  definition:=pg_get_functiondef('public.mark_inactive_owners(timestamptz)'::regprocedure);
  anchor:=$a$  update public.profiles$a$;
  if strpos(definition,anchor)=0 then raise exception 'Unexpected inactivity maintenance'; end if;
  definition:=replace(definition,anchor,$r$  perform pg_advisory_xact_lock(64352884011);
  update public.profiles$r$);
  execute replace(definition,$a$    and last_owner_activity_at < p_before;$a$,$r$    and last_owner_activity_at < p_before
    and user_id <> coalesce(
      (select user_id from public.profiles where public.is_eligible_owner(user_id)
        order by last_owner_activity_at desc,user_id limit 1),
      '00000000-0000-0000-0000-000000000000'::uuid
    );$r$);
end;
$$;

create function public.list_owner_governance(p_view text,p_before timestamptz default null,p_before_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public,pg_temp as $$
begin
  if not public.is_eligible_owner(auth.uid()) then
    raise insufficient_privilege using message='Eligible owner access required.';
  end if;
  if (p_before is null)<>(p_before_id is null) then raise exception 'Invalid governance cursor.'; end if;
  if p_view='roles' then
    return (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id desc),'[]') from (
      select p.user_id as id,p.display_name,p.role,p.owner_state,p.suspended_until,p.created_at,
        public.is_eligible_owner(p.user_id) as eligible
      from public.profiles p
      where p_before is null or (p.created_at,p.user_id)<(p_before,p_before_id)
      order by p.created_at desc,p.user_id desc limit 26
    ) x);
  elsif p_view='proposals' then
    return (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id desc),'[]') from (
      select v.id,v.action,v.vote_kind,v.target_user_id,v.target_email,v.created_by,v.reason,v.created_at,v.expires_at,
        case when v.status='Open' and v.expires_at<=now() then 'Expired' else v.status end as status,
        case when v.vote_kind='owner_removal' and v.status='Open'
          then public.get_owner_removal_required_approvals(v.target_user_id)
          when v.vote_kind='owner_invite' and v.status='Open' then greatest(1,public.get_active_owner_count())
          when v.vote_kind like 'admin_%' and v.status='Open' then greatest(1,least(2,public.get_active_owner_count()))
          else v.required_approvals end as required_approvals,
        coalesce((v.metadata->>'executed_approvals')::integer,(v.metadata->>'executed_by_vote_count')::integer,
        (select count(*) from public.governance_ballots b where b.vote_id=v.id and b.decision='Approve'
          and b.withdrawn_at is null and public.is_eligible_owner(b.owner_user_id)
          and b.owner_user_id is distinct from v.target_user_id)) as approvals,
        (select decision from public.governance_ballots b where b.vote_id=v.id
          and b.owner_user_id=auth.uid() and b.withdrawn_at is null) as own_ballot
      from public.governance_votes v
      where p_before is null or (v.created_at,v.id)<(p_before,p_before_id)
      order by v.created_at desc,v.id desc limit 26
    ) x);
  elsif p_view='history' then
    return (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id desc),'[]') from (
      select a.id,a.actor_user_id,a.action,a.resource_id,a.reason,a.created_at
      from public.admin_audit_logs a
      where (a.resource_type='governance_vote' or a.action in ('Owner removed','Owner privileges suspended','Owner privileges restored','Platform role changed')
        or a.action like 'governance.%')
        and (p_before is null or (a.created_at,a.id)<(p_before,p_before_id))
      order by a.created_at desc,a.id desc limit 26
    ) x);
  end if;
  raise exception 'Unknown governance view.';
end;
$$;
revoke all on function public.list_owner_governance(text,timestamptz,uuid) from public,anon,authenticated,service_role;
grant execute on function public.list_owner_governance(text,timestamptz,uuid) to authenticated;
