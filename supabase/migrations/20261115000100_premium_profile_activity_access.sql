-- A trusted profile tier grants app access independently of provider billing.
-- Keep subscription access for users whose billing state grants it.
create or replace function private.has_paid_activity_access(p_user uuid)
returns boolean
language sql stable set search_path=pg_catalog,public,pg_temp as $$
  select exists(
    select 1 from public.profiles p
    where p.user_id=p_user and p.account_tier='premium'
  ) or exists(
    select 1 from public.subscriptions s
    where s.user_id=p_user and s.status in ('active','trialing')
      and (s.current_period_end is null or s.current_period_end>now())
  )
$$;

revoke all on function private.has_paid_activity_access(uuid)
  from public,anon,authenticated,service_role;
