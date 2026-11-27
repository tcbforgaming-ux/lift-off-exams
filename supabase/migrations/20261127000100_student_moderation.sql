create table private.student_suspensions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check(length(reason) between 5 and 1000),
  expires_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  closed_at timestamptz,
  version bigint not null default 0,
  appeal text check(length(appeal) between 5 and 5000),
  appeal_at timestamptz,
  appeal_decision text check(appeal_decision in ('approved','denied')),
  decision_reason text
);
create unique index student_suspensions_one_open on private.student_suspensions(user_id) where closed_at is null;
create index student_suspensions_history on private.student_suspensions(user_id,created_at desc,id desc);
-- Preserve existing student restrictions and give those accounts an appeal path.
-- No historical staff reason can be inferred from a bare profile timestamp.
insert into private.student_suspensions(user_id,reason,expires_at)
select user_id,'Existing account suspension; contact staff for the original reason.',
 case when suspended_until='infinity' then null else suspended_until end
from public.profiles where role='student' and suspended_until>now();
create table private.moderation_requests (
  actor uuid references auth.users(id) on delete cascade,
  key uuid not null,
  payload jsonb not null,
  result uuid not null,
  target_user uuid not null references auth.users(id) on delete cascade,
  primary key(actor,key)
);
create table private.moderation_mail (
  id uuid primary key references public.user_notifications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  attempts integer not null default 0,
  lease uuid,
  leased_until timestamptz,
  sent_at timestamptz,
  retry_at timestamptz not null default now()
);
revoke all on private.student_suspensions,private.moderation_requests,private.moderation_mail from public,anon,authenticated,service_role;

create function private.student_suspended(p_user uuid) returns boolean
language sql stable security definer set search_path=pg_catalog,pg_temp as $$
  select exists(select 1 from public.profiles where user_id=p_user and role='student'
    and (suspended_until='infinity' or suspended_until>now()))
$$;
revoke all on function private.student_suspended(uuid) from public,anon,authenticated,service_role;

create function private.queue_moderation_email(p_user uuid,p_title text,p_body text,p_metadata jsonb)
returns void language plpgsql set search_path=pg_catalog,pg_temp as $$
declare notification uuid;
begin
  insert into public.user_notifications(user_id,type,title,message,metadata)
    values(p_user,'moderation',p_title,p_body,p_metadata) returning id into notification;
  insert into private.moderation_mail(id,user_id) values(notification,p_user);
end;
$$;
revoke all on function private.queue_moderation_email(uuid,text,text,jsonb) from public,anon,authenticated,service_role;

create function public.get_my_suspension() returns jsonb
language sql stable security definer set search_path=pg_catalog,pg_temp as $$
  select jsonb_build_object('suspended',private.student_suspended(auth.uid()),'record',
    (select to_jsonb(s) from private.student_suspensions s where user_id=auth.uid()
     order by (closed_at is null) desc,created_at desc,id desc limit 1))
$$;

create function public.list_student_moderation(p_before timestamptz default null,p_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,pg_temp as $$
begin
  if not coalesce(public.is_admin(),false) then raise insufficient_privilege; end if;
  if (p_before is null)<>(p_id is null) then raise invalid_parameter_value; end if;
  return (select coalesce(jsonb_agg(to_jsonb(t) order by created_at desc,id desc),'[]') from
    (select s.*,p.display_name,
      (s.closed_at is null and (s.expires_at is null or s.expires_at>now())) as active
     from private.student_suspensions s join public.profiles p on p.user_id=s.user_id
     where p_before is null or (s.created_at,s.id)<(p_before,p_id)
     order by s.created_at desc,s.id desc limit 26) t);
end;
$$;

create function public.moderate_student(
  p_user uuid,p_action text,p_reason text,p_key uuid,p_id uuid default null,
  p_version bigint default null,p_days integer default null
) returns uuid language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
declare actor uuid:=auth.uid(); s private.student_suspensions; prior private.moderation_requests;
  request jsonb:=jsonb_build_array(p_user,p_action,btrim(p_reason),p_id,p_version,p_days);
  stamp timestamptz:=clock_timestamp(); title text;
begin
  if not coalesce(public.is_admin(),false) or private.account_erasure_blocked(actor) then raise insufficient_privilege; end if;
  if p_key is null or length(btrim(coalesce(p_reason,''))) not between 5 and 1000
     or coalesce(p_action,'') not in ('suspend','restore','approve','deny','modify')
     or (p_days is not null and p_days not between 1 and 3650) then raise invalid_parameter_value; end if;
  perform pg_advisory_xact_lock(hashtextextended('account-erasure:'||p_user::text,0));
  perform 1 from public.profiles where user_id=p_user and role='student' for update;
  if not found then raise exception 'Only standard student accounts may be moderated here.'; end if;
  select r.* into prior from private.moderation_requests r where r.actor=auth.uid() and r.key=p_key;
  if found then
    if prior.payload is distinct from request then raise exception 'Request key already used.'; end if;
    return prior.result;
  end if;
  if p_action='suspend' then
    update private.student_suspensions set closed_at=stamp,version=version+1
      where user_id=p_user and closed_at is null and expires_at<=now();
    if exists(select 1 from private.student_suspensions where user_id=p_user and closed_at is null) then
      raise exception 'Account already suspended; reload the active suspension.';
    end if;
    insert into private.student_suspensions(user_id,reason,expires_at)
      values(p_user,btrim(p_reason),case when p_days is not null then stamp+make_interval(days=>p_days) end) returning * into s;
  else
    select * into s from private.student_suspensions where id=p_id and user_id=p_user for update;
    if not found or s.version is distinct from p_version or s.closed_at is not null
      or s.expires_at<=now() then raise exception 'Suspension changed or expired; reload.'; end if;
    if p_action in ('approve','deny') and (s.appeal is null or s.appeal_decision is not null) then
      raise exception 'No pending appeal to decide.';
    end if;
    update private.student_suspensions set
      closed_at=case when p_action in ('restore','approve') then stamp else closed_at end,
      expires_at=case when p_action='modify' then case when p_days is not null then stamp+make_interval(days=>p_days) end else expires_at end,
      reason=case when p_action='modify' then btrim(p_reason) else reason end,
      appeal_decision=case p_action when 'approve' then 'approved' when 'deny' then 'denied' else appeal_decision end,
      decision_reason=btrim(p_reason),version=version+1 where id=s.id returning * into s;
  end if;
  update public.profiles set suspended_until=case when s.closed_at is not null then null else coalesce(s.expires_at,'infinity') end
    where user_id=p_user;
  title:=case when p_action in ('restore','approve') then 'Account access restored'
    when p_action='deny' then 'Suspension appeal reviewed' else 'Account suspension' end;
  perform private.queue_moderation_email(p_user,title,
    btrim(p_reason)||E'\n'||case when s.closed_at is not null then 'Access restored.'
      when s.expires_at is null then 'Suspended indefinitely.'
      else 'Suspended until '||to_char(s.expires_at at time zone 'UTC','YYYY-MM-DD HH24:MI')||' UTC. Duration from this notice: '||
        greatest(0,ceil(extract(epoch from (s.expires_at-stamp))/86400))::text||' days.' end,
    jsonb_build_object('suspension_id',s.id,'path','/account/suspension','expires_at',s.expires_at));
  insert into public.admin_audit_logs(actor_user_id,actor_role,action,resource_type,resource_id,reason,new_values)
    values(actor,public.current_user_role(),'student.'||p_action,'suspension',s.id::text,btrim(p_reason),
      jsonb_build_object('user_id',p_user,'version',s.version,'expires_at',s.expires_at));
  insert into private.moderation_requests values(actor,p_key,request,s.id,p_user);
  return s.id;
end;
$$;

create function public.submit_suspension_appeal(p_id uuid,p_text text) returns jsonb
language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
declare s private.student_suspensions;
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  if length(btrim(coalesce(p_text,''))) not between 5 and 5000 then raise invalid_parameter_value; end if;
  perform pg_advisory_xact_lock(hashtextextended('account-erasure:'||auth.uid()::text,0));
  select * into s from private.student_suspensions where id=p_id and user_id=auth.uid() for update;
  if not found then raise insufficient_privilege; end if;
  if s.appeal is not null then
    if s.appeal<>btrim(p_text) then raise exception 'One appeal is allowed per suspension.'; end if;
    return public.get_my_suspension();
  end if;
  if not private.student_suspended(auth.uid()) or s.closed_at is not null then raise exception 'Suspension is not active.'; end if;
  update private.student_suspensions set appeal=btrim(p_text),appeal_at=clock_timestamp(),version=version+1 where id=s.id;
  insert into public.admin_audit_logs(actor_user_id,action,resource_type,resource_id,reason)
    values(auth.uid(),'student.appeal','suspension',s.id::text,'Account holder submitted an appeal');
  perform private.queue_moderation_email(auth.uid(),'Suspension appeal received','Your appeal has been queued for staff review.',
    jsonb_build_object('suspension_id',s.id,'path','/account/suspension'));
  return public.get_my_suspension();
end;
$$;

-- Preserve deletion recovery precedence and its existing request lock.
alter function public.enforce_account_lifecycle() rename to enforce_account_erasure;
do $$
declare ddl text:=pg_get_functiondef('public.enforce_account_erasure()'::regprocedure);
begin
  if strpos(ddl,'''/rpc/request_account_deletion'',''/rpc/recover_account_from_deletion''')=0 then
    raise exception 'Unexpected lifecycle gate definition';
  end if;
  execute replace(ddl,'''/rpc/request_account_deletion'',''/rpc/recover_account_from_deletion''',
    '''/rpc/request_account_deletion'',''/rpc/recover_account_from_deletion'',''/rpc/submit_suspension_appeal''');
end;
$$;
revoke all on function public.enforce_account_erasure() from public,anon,authenticated,service_role;
create function public.enforce_account_lifecycle() returns void
language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
declare endpoint text:=current_setting('request.path',true); actor uuid:=auth.uid();
begin
  perform public.enforce_account_erasure();
  if actor is null or current_setting('role',true)<>'authenticated' then return; end if;
  if private.account_erasure_blocked(actor) then return; end if;
  if private.student_suspended(actor) and coalesce(endpoint,'') not in
    ('/rpc/get_my_suspension','/rpc/submit_suspension_appeal') then
    raise insufficient_privilege using message='Account suspension access only.',detail='account_suspension_only';
  end if;
end;
$$;
-- Appeal upgrades to the exclusive same-account lock inside the transaction;
-- advisory locks are reentrant for the owning backend.
create or replace function public.account_lifecycle_allows_actor(p_actor uuid) returns boolean
language plpgsql stable security definer set search_path=pg_catalog,pg_temp as $$
begin
  perform private.assert_server_context();
  return exists(select 1 from auth.users where id=p_actor)
    and not private.account_erasure_blocked(p_actor) and not private.student_suspended(p_actor);
end;
$$;

-- Defense in depth for direct owned-table requests, independent of frontend routes.
do $$
declare t record;
begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' and c.relrowsecurity
      and exists(select 1 from pg_policy where polrelid=c.oid)
  loop
    execute format('create policy student_suspension_gate on public.%I as restrictive for all to authenticated using (not private.student_suspended(auth.uid())) with check (not private.student_suspended(auth.uid()))',t.relname);
  end loop;
end;
$$;
grant usage on schema private to authenticated;
grant execute on function private.student_suspended(uuid) to authenticated;
revoke all on function public.get_my_suspension(),public.list_student_moderation(timestamptz,uuid),
 public.moderate_student(uuid,text,text,uuid,uuid,bigint,integer),public.submit_suspension_appeal(uuid,text),
 public.enforce_account_lifecycle() from public,anon,authenticated,service_role;
grant execute on function public.get_my_suspension(),public.submit_suspension_appeal(uuid,text),
 public.list_student_moderation(timestamptz,uuid),public.moderate_student(uuid,text,text,uuid,uuid,bigint,integer) to authenticated;
grant execute on function public.enforce_account_lifecycle() to anon,authenticated,service_role;
notify pgrst,'reload config';
