-- Shared by launch implementations; does not establish mid-run expiry policy.
create function private.require_infinite_run_launch_access(p_user uuid)
returns void language plpgsql stable set search_path=pg_catalog,pg_temp as $$
begin
  if p_user is null or private.account_erasure_blocked(p_user)
    or not private.has_paid_activity_access(p_user) then
    raise insufficient_privilege using message='An active subscription is required to start Infinite Run.';
  end if;
end;
$$;

revoke all on function private.require_infinite_run_launch_access(uuid)
  from public,anon,authenticated,service_role;
