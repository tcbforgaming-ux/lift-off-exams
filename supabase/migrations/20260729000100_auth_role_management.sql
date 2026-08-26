-- Milestone 3: trusted authentication role-management foundation.
-- Roles remain trusted database data. Browser clients cannot update protected
-- role columns directly; owner-approved changes go through this audited RPC.

create or replace function public.bootstrap_initial_owner(
  p_target_user_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_role text;
begin
  if p_target_user_id is null then
    raise exception 'Target user is required.';
  end if;

  if exists (
    select 1
    from public.profiles
    where role = 'owner'
      and owner_privileges_suspended = false
      and (
        suspended_until is null
        or suspended_until < now()
      )
  ) then
    raise exception 'Initial owner bootstrap is only available before any active owner exists.';
  end if;

  select role
  into previous_role
  from public.profiles
  where user_id = p_target_user_id;

  insert into public.profiles(user_id, role, account_tier)
  values (p_target_user_id, 'owner', 'premium')
  on conflict (user_id) do update
  set role = 'owner',
      account_tier = greatest(public.profiles.account_tier, excluded.account_tier),
      updated_at = now();

  insert into public.admin_audit_logs(
    actor_user_id,
    action,
    resource_type,
    resource_id,
    reason,
    metadata
  )
  values (
    null,
    'Initial owner bootstrapped',
    'profile',
    p_target_user_id::text,
    nullif(trim(coalesce(p_reason, '')), ''),
    jsonb_build_object(
      'target_user_id', p_target_user_id,
      'previous_role', previous_role,
      'new_role', 'owner',
      'trusted_bootstrap', true
    )
  );
end;
$$;

create or replace function public.set_user_platform_role(
  p_target_user_id uuid,
  p_new_role text,
  p_reason text,
  p_governance_vote_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_profile public.profiles%rowtype;
  normalized_role text := lower(trim(coalesce(p_new_role, '')));
begin
  if not public.is_owner() then
    raise exception 'Owner access is required to change platform roles.';
  end if;

  if actor_id is null then
    raise exception 'Authenticated owner context is required.';
  end if;

  if p_target_user_id is null then
    raise exception 'Target user is required.';
  end if;

  if normalized_role not in ('student', 'admin') then
    raise exception 'Only standard-user and administrator role changes are supported by this workflow.';
  end if;

  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'A reason is required for role changes.';
  end if;

  select *
  into target_profile
  from public.profiles
  where user_id = p_target_user_id
  for update;

  if not found then
    raise exception 'Target profile was not found.';
  end if;

  if target_profile.role = 'owner' then
    raise exception 'Owner changes require the owner-governance workflow.';
  end if;

  update public.profiles
  set role = normalized_role,
      updated_at = now()
  where user_id = p_target_user_id;

  insert into public.admin_audit_logs(
    actor_user_id,
    action,
    resource_type,
    resource_id,
    reason,
    metadata
  )
  values (
    actor_id,
    'Platform role changed',
    'profile',
    p_target_user_id::text,
    trim(p_reason),
    jsonb_build_object(
      'acting_user_id', actor_id,
      'target_user_id', p_target_user_id,
      'previous_role', target_profile.role,
      'new_role', normalized_role,
      'governance_vote_id', p_governance_vote_id
    )
  );
end;
$$;

comment on function public.bootstrap_initial_owner(uuid, text) is
  'Service-role-only bootstrap procedure for creating the first owner. Never exposed from the public application.';

comment on function public.set_user_platform_role(uuid, text, text, uuid) is
  'Owner-only audited workflow for granting or revoking administrator access. Owner creation/removal is intentionally excluded.';

revoke execute on function public.bootstrap_initial_owner(uuid, text) from public;
grant execute on function public.bootstrap_initial_owner(uuid, text) to service_role;

revoke execute on function public.set_user_platform_role(uuid, text, text, uuid) from public;
grant execute on function public.set_user_platform_role(uuid, text, text, uuid)
to authenticated, service_role;
