-- Retain historical prototype records without trusting their status or deadlines.
revoke insert,update,delete,truncate on public.account_deletion_requests from public,anon,authenticated;
drop policy account_deletion_requests_insert_own on public.account_deletion_requests;
drop policy account_deletion_requests_update_own on public.account_deletion_requests;

create table private.account_erasure_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  state text not null default 'pending' check(state in ('pending','cancelled','finalizing','completed')),
  requested_at timestamptz not null,
  base_deadline timestamptz not null,
  warning_due_at timestamptz not null,
  warning_sent_at timestamptz,
  warning_id uuid references public.user_notifications(id) on delete set null,
  billing_done_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  last_failure text check(last_failure in ('warning','billing','finish')),
  check ((state='completed')=(user_id is null))
);
create unique index account_erasure_one_open on private.account_erasure_jobs(user_id)
where state in ('pending','finalizing');
create index account_erasure_status on private.account_erasure_jobs(user_id,requested_at desc,id desc);
revoke all on private.account_erasure_jobs from public,anon,authenticated,service_role;

create function private.account_erasure_blocked(p_user uuid) returns boolean
language sql stable set search_path=pg_catalog,pg_temp as $$
  select exists(select 1 from private.account_erasure_jobs where user_id=p_user and state in ('pending','finalizing'))
$$;
create function private.account_erasure_deadline(j private.account_erasure_jobs) returns timestamptz
language sql immutable set search_path=pg_catalog,pg_temp as $$
  select greatest(j.base_deadline,j.warning_sent_at+interval '168 hours')
$$;
revoke all on function private.account_erasure_blocked(uuid),private.account_erasure_deadline(private.account_erasure_jobs)
from public,anon,authenticated,service_role;

do $$
declare definition text; anchor text;
begin
  definition:=pg_get_functiondef('public.is_eligible_owner(uuid)'::regprocedure);
  anchor:='where user_id = p_user_id';
  if strpos(definition,anchor)=0 then raise exception 'Unexpected owner eligibility definition'; end if;
  execute replace(definition,anchor,anchor||' and not private.account_erasure_blocked(p_user_id)');
  definition:=pg_get_functiondef('public.current_user_role()'::regprocedure);
  anchor:='where profiles.user_id = auth.uid()';
  if strpos(definition,anchor)=0 then raise exception 'Unexpected role definition'; end if;
  execute replace(definition,anchor,anchor||' and not private.account_erasure_blocked(auth.uid())');
end;
$$;

create function private.require_account_owner_successor(p_user uuid) returns void
language plpgsql stable set search_path=pg_catalog,public,pg_temp as $$
begin
  if exists(select 1 from public.profiles p where p.user_id=p_user
    and (p.role='owner' or p.owner_state in ('self_suspended','inactive_suspended','governance_suspended')))
    and not exists(select 1 from public.profiles p where p.user_id<>p_user and public.is_eligible_owner(p.user_id))
  then raise exception 'Complete an approved ownership transfer to another eligible owner before deleting this account.'; end if;
end;
$$;
revoke all on function private.require_account_owner_successor(uuid) from public,anon,authenticated,service_role;

create function public.get_account_deletion_status() returns jsonb
language sql stable security definer set search_path=pg_catalog,pg_temp as $$
  select coalesce((select jsonb_build_object('state',j.state,'requested_at',j.requested_at,
    'deadline',private.account_erasure_deadline(j),'warning_sent_at',j.warning_sent_at,
    'recoverable',j.state='pending' and (j.warning_sent_at is null or now()<private.account_erasure_deadline(j)))
    from private.account_erasure_jobs j where user_id=auth.uid()
    order by requested_at desc,id desc limit 1),'{"state":"active"}'::jsonb)
$$;

create function public.request_account_deletion(p_confirmation text) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare actor uuid:=auth.uid(); stamp timestamptz; deadline timestamptz;
begin
  if actor is null then raise insufficient_privilege using message='Sign in first.'; end if;
  perform pg_advisory_xact_lock(hashtextextended('account-erasure:'||actor::text,0));
  perform pg_advisory_xact_lock(64352884011);
  if private.account_erasure_blocked(actor) then return public.get_account_deletion_status(); end if;
  perform private.require_recent_owner_authentication();
  if p_confirmation is distinct from 'DELETE' then raise exception 'Type DELETE to confirm.'; end if;
  if not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null and email is not null)
  then raise exception 'A confirmed email address is required for the final warning.'; end if;
  perform private.require_account_owner_successor(actor);
  stamp:=clock_timestamp();
  deadline:=((stamp at time zone 'UTC')+interval '3 months') at time zone 'UTC';
  insert into private.account_erasure_jobs(user_id,requested_at,base_deadline,warning_due_at)
  values(actor,stamp,deadline,deadline-interval '168 hours');
  insert into public.admin_audit_logs(actor_user_id,action,resource_type,reason)
  values(actor,'account_erasure.requested','account_lifecycle','Account holder confirmed recoverable deletion');
  return public.get_account_deletion_status();
end;
$$;

create function public.recover_account_from_deletion() returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare actor uuid:=auth.uid(); j private.account_erasure_jobs;
begin
  if actor is null then raise insufficient_privilege using message='Sign in first.'; end if;
  perform private.require_recent_owner_authentication();
  perform pg_advisory_xact_lock(hashtextextended('account-erasure:'||actor::text,0));
  perform pg_advisory_xact_lock(64352884011);
  select * into j from private.account_erasure_jobs where user_id=actor
    order by requested_at desc,id desc limit 1 for update;
  if j.state='cancelled' then return public.get_account_deletion_status(); end if;
  if j.state is distinct from 'pending' or (j.warning_sent_at is not null and clock_timestamp()>=private.account_erasure_deadline(j))
  then raise exception 'The recovery window is closed.'; end if;
  update private.account_erasure_jobs set state='cancelled',cancelled_at=clock_timestamp() where id=j.id;
  delete from public.user_notifications where id=j.warning_id and delivery_status<>'Sent';
  insert into public.admin_audit_logs(actor_user_id,action,resource_type,reason)
  values(actor,'account_erasure.recovered','account_lifecycle','Account holder restored the account');
  return public.get_account_deletion_status();
end;
$$;

-- The API gate applies to existing as well as newly minted user JWTs. Shared
-- account locks let in-flight ordinary requests finish before deactivation.
create function public.enforce_account_lifecycle() returns void
language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
declare actor uuid:=auth.uid(); endpoint text:=current_setting('request.path',true);
begin
  if actor is null or current_setting('role',true)<>'authenticated' then return; end if;
  if endpoint not in ('/rpc/request_account_deletion','/rpc/recover_account_from_deletion') then
    perform pg_advisory_xact_lock_shared(hashtextextended('account-erasure:'||actor::text,0));
  end if;
  if not exists(select 1 from auth.users where id=actor) then
    raise insufficient_privilege using message='Account no longer exists.';
  end if;
  if private.account_erasure_blocked(actor)
    and coalesce(endpoint,'') not in ('/rpc/get_account_deletion_status','/rpc/request_account_deletion','/rpc/recover_account_from_deletion')
  then raise insufficient_privilege using message='Account recovery only.',detail='account_recovery_only'; end if;
end;
$$;
revoke all on function public.get_account_deletion_status(),public.request_account_deletion(text),
  public.recover_account_from_deletion(),public.enforce_account_lifecycle() from public,anon,authenticated,service_role;
grant execute on function public.get_account_deletion_status(),public.request_account_deletion(text),
  public.recover_account_from_deletion() to authenticated;
grant execute on function public.enforce_account_lifecycle() to anon,authenticated,service_role;
alter role authenticator set pgrst.db_pre_request='public.enforce_account_lifecycle';
notify pgrst,'reload config';
