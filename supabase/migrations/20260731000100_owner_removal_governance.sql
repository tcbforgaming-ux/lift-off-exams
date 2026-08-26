-- Milestone 3: Version 1 owner-removal governance foundation.
-- This extends the generic governance tables with owner-state, expiring votes,
-- vote withdrawal, and transactional owner-removal execution.

alter table public.profiles
add column if not exists owner_state text not null default 'active',
add column if not exists owner_state_updated_at timestamptz not null default now(),
add column if not exists last_owner_activity_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_owner_state_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
    add constraint profiles_owner_state_check
    check (
      owner_state in (
        'active',
        'self_suspended',
        'inactive_suspended',
        'governance_suspended',
        'unavailable'
      )
    );
  end if;
end;
$$;

alter table public.governance_votes
add column if not exists vote_kind text not null default 'general',
add column if not exists expires_at timestamptz,
add column if not exists executed_at timestamptz,
add column if not exists metadata jsonb not null default '{}';

alter table public.governance_votes
drop constraint if exists governance_votes_status_check;

alter table public.governance_votes
add constraint governance_votes_status_check
check (status in ('Open', 'Approved', 'Rejected', 'Expired', 'Cancelled', 'Executed'));

alter table public.governance_ballots
add column if not exists withdrawn_at timestamptz;

create index if not exists profiles_owner_state_idx
on public.profiles(role, owner_state, last_owner_activity_at);

create index if not exists governance_votes_owner_removal_idx
on public.governance_votes(vote_kind, status, expires_at);

create or replace function public.is_eligible_owner(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = p_user_id
      and role = 'owner'
      and owner_state = 'active'
      and owner_privileges_suspended is not true
      and (
        suspended_until is null
        or suspended_until < now()
      )
  );
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select case
        when profiles.role = 'owner'
          and (
            profiles.owner_privileges_suspended
            or profiles.owner_state <> 'active'
          ) then 'admin'
        else profiles.role
      end
      from public.profiles
      where profiles.user_id = auth.uid()
        and (
          profiles.suspended_until is null
          or profiles.suspended_until < now()
        )
    ),
    'student'
  );
$$;

create or replace function public.get_active_owner_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.profiles
  where public.is_eligible_owner(user_id);
$$;

create or replace function public.get_owner_removal_required_approvals(
  p_target_user_id uuid
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case
    when count(*) >= 3 then 3
    else greatest(count(*)::integer, 1)
  end
  from public.profiles
  where public.is_eligible_owner(user_id)
    and user_id <> p_target_user_id;
$$;

create or replace function public.initiate_owner_removal_vote(
  p_target_user_id uuid,
  p_reason text,
  p_expires_at timestamptz default now() + interval '7 days'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  required_count integer;
  vote_id uuid;
begin
  if not public.is_eligible_owner(actor_id) then
    raise exception 'Eligible owner access is required to initiate owner removal.';
  end if;

  if p_target_user_id is null then
    raise exception 'Target owner is required.';
  end if;

  if not exists (
    select 1 from public.profiles
    where user_id = p_target_user_id
      and role = 'owner'
      and owner_state <> 'unavailable'
  ) then
    raise exception 'Target owner was not found or is already unavailable.';
  end if;

  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'A reason is required for owner-removal votes.';
  end if;

  if p_expires_at <= now() then
    raise exception 'Owner-removal votes must expire in the future.';
  end if;

  required_count := public.get_owner_removal_required_approvals(p_target_user_id);

  if not exists (
    select 1
    from public.profiles
    where public.is_eligible_owner(user_id)
      and user_id <> p_target_user_id
  ) then
    raise exception 'At least one eligible non-target owner is required for owner removal.';
  end if;

  insert into public.governance_votes(
    action,
    vote_kind,
    target_user_id,
    threshold,
    required_approvals,
    required_rejections,
    reason,
    status,
    created_by,
    expires_at,
    metadata
  )
  values (
    'Owner removal',
    'owner_removal',
    p_target_user_id,
    case when required_count = 3 then 'three eligible non-target owners' else 'all eligible non-target owners' end,
    required_count,
    1,
    trim(p_reason),
    'Open',
    actor_id,
    p_expires_at,
    jsonb_build_object(
      'initiating_owner_id', actor_id,
      'target_owner_id', p_target_user_id,
      'eligible_non_target_owner_threshold', required_count
    )
  )
  returning id into vote_id;

  perform public.write_admin_audit(
    'Owner removal vote initiated',
    'governance_vote',
    vote_id::text,
    trim(p_reason),
    jsonb_build_object(
      'acting_user_id', actor_id,
      'target_user_id', p_target_user_id,
      'required_approvals', required_count,
      'expires_at', p_expires_at
    )
  );

  return vote_id;
end;
$$;

create or replace function public.cast_owner_removal_vote(
  p_vote_id uuid,
  p_decision text default 'Approve'
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  vote_row public.governance_votes%rowtype;
  approve_count integer;
  normalized_decision text := initcap(lower(trim(coalesce(p_decision, ''))));
begin
  if not public.is_eligible_owner(actor_id) then
    raise exception 'Eligible owner access is required to vote.';
  end if;

  if normalized_decision not in ('Approve', 'Reject') then
    raise exception 'Owner-removal vote decision must be Approve or Reject.';
  end if;

  select *
  into vote_row
  from public.governance_votes
  where id = p_vote_id
    and vote_kind = 'owner_removal'
  for update;

  if not found then
    raise exception 'Owner-removal vote was not found.';
  end if;

  if vote_row.status <> 'Open' then
    raise exception 'Owner-removal vote is no longer open.';
  end if;

  if vote_row.expires_at <= now() then
    update public.governance_votes
    set status = 'Expired',
        resolved_at = now()
    where id = p_vote_id;
    raise exception 'Owner-removal vote has expired.';
  end if;

  if vote_row.target_user_id = actor_id then
    raise exception 'Target owners cannot vote on their own removal.';
  end if;

  insert into public.governance_ballots(vote_id, owner_user_id, decision, withdrawn_at)
  values (p_vote_id, actor_id, normalized_decision, null)
  on conflict (vote_id, owner_user_id) do update
  set decision = excluded.decision,
      withdrawn_at = null,
      updated_at = now();

  perform public.write_admin_audit(
    'Owner removal ballot cast',
    'governance_vote',
    p_vote_id::text,
    vote_row.reason,
    jsonb_build_object(
      'acting_user_id', actor_id,
      'target_user_id', vote_row.target_user_id,
      'decision', normalized_decision
    )
  );

  select count(*)::integer
  into approve_count
  from public.governance_ballots
  where vote_id = p_vote_id
    and decision = 'Approve'
    and withdrawn_at is null;

  if approve_count >= vote_row.required_approvals then
    update public.profiles
    set role = 'admin',
        owner_state = 'unavailable',
        owner_privileges_suspended = true,
        owner_state_updated_at = now(),
        updated_at = now()
    where user_id = vote_row.target_user_id
      and role = 'owner';

    update public.governance_votes
    set status = 'Executed',
        resolved_at = now(),
        executed_at = now(),
        metadata = metadata || jsonb_build_object(
          'executed_by_vote_count', approve_count,
          'executed_at', now()
        )
    where id = p_vote_id;

    perform public.write_admin_audit(
      'Owner removed',
      'profile',
      vote_row.target_user_id::text,
      vote_row.reason,
      jsonb_build_object(
        'acting_user_id', actor_id,
        'target_user_id', vote_row.target_user_id,
        'governance_vote_id', p_vote_id,
        'approval_count', approve_count,
        'previous_role', 'owner',
        'new_role', 'admin',
        'new_owner_state', 'unavailable'
      )
    );

    return 'Executed';
  end if;

  return 'Recorded';
end;
$$;

create or replace function public.withdraw_owner_removal_vote(p_vote_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  vote_row public.governance_votes%rowtype;
begin
  if not public.is_eligible_owner(actor_id) then
    raise exception 'Eligible owner access is required to withdraw a vote.';
  end if;

  select *
  into vote_row
  from public.governance_votes
  where id = p_vote_id
    and vote_kind = 'owner_removal'
  for update;

  if not found then
    raise exception 'Owner-removal vote was not found.';
  end if;

  if vote_row.status <> 'Open' then
    raise exception 'Votes cannot be withdrawn after the governance action closes.';
  end if;

  if vote_row.expires_at <= now() then
    update public.governance_votes
    set status = 'Expired',
        resolved_at = now()
    where id = p_vote_id;
    raise exception 'Owner-removal vote has expired.';
  end if;

  update public.governance_ballots
  set withdrawn_at = now(),
      updated_at = now()
  where vote_id = p_vote_id
    and owner_user_id = actor_id
    and withdrawn_at is null;

  if not found then
    raise exception 'No active ballot exists to withdraw.';
  end if;

  perform public.write_admin_audit(
    'Owner removal ballot withdrawn',
    'governance_vote',
    p_vote_id::text,
    vote_row.reason,
    jsonb_build_object(
      'acting_user_id', actor_id,
      'target_user_id', vote_row.target_user_id
    )
  );
end;
$$;

create or replace function public.expire_owner_removal_votes()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_count integer;
begin
  if auth.role() <> 'service_role'
    and not public.is_owner() then
    raise exception 'Owner or service-role access is required to expire owner-removal votes.';
  end if;

  update public.governance_votes
  set status = 'Expired',
      resolved_at = now()
  where vote_kind = 'owner_removal'
    and status = 'Open'
    and expires_at <= now();

  get diagnostics expired_count = row_count;
  return expired_count;
end;
$$;

create or replace function public.mark_inactive_owners(
  p_before timestamptz default now() - interval '7 days'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update public.profiles
  set owner_state = 'inactive_suspended',
      owner_privileges_suspended = true,
      owner_state_updated_at = now(),
      updated_at = now()
  where role = 'owner'
    and owner_state = 'active'
    and last_owner_activity_at < p_before;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

create or replace function public.set_own_owner_privileges_suspended(suspend_value boolean)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  profile_row public.profiles%rowtype;
begin
  select *
  into profile_row
  from public.profiles
  where user_id = auth.uid();

  if not found then
    raise exception 'Profile not found';
  end if;

  if suspend_value then
    if not public.is_eligible_owner(auth.uid()) then
      raise exception 'Active owner access required to suspend owner privileges';
    end if;

    update public.profiles
    set role = 'admin',
        owner_state = 'self_suspended',
        owner_privileges_suspended = true,
        owner_privileges_suspended_at = now(),
        owner_state_updated_at = now(),
        updated_at = now()
    where user_id = auth.uid();

    perform public.write_admin_audit(
      'Owner privileges suspended',
      'profile',
      auth.uid()::text,
      'Owner self-suspension',
      jsonb_build_object('owner_state', 'self_suspended')
    );

    return 'Suspended';
  end if;

  if profile_row.owner_state in ('governance_suspended', 'unavailable') then
    raise exception 'This owner state requires governance restoration.';
  end if;

  if profile_row.owner_privileges_suspended is not true
    or profile_row.owner_state <> 'self_suspended' then
    raise exception 'Owner privileges are not self-suspended for this account';
  end if;

  update public.profiles
  set role = 'owner',
      owner_state = 'active',
      owner_privileges_suspended = false,
      owner_privileges_restored_at = now(),
      owner_state_updated_at = now(),
      last_owner_activity_at = now(),
      updated_at = now()
  where user_id = auth.uid();

  perform public.write_admin_audit(
    'Owner privileges restored',
    'profile',
    auth.uid()::text,
    'Owner self-restoration',
    jsonb_build_object('owner_state', 'active')
  );

  return 'Restored';
end;
$$;

comment on column public.profiles.owner_state is
  'Owner eligibility state. active owners can vote; self_suspended owners may self-restore; governance_suspended and unavailable require governance/server recovery.';

comment on function public.initiate_owner_removal_vote(uuid, text, timestamptz) is
  'Active-owner RPC for opening expiring owner-removal votes. The target owner cannot vote.';

comment on function public.cast_owner_removal_vote(uuid, text) is
  'Active-owner RPC for casting or replacing an owner-removal ballot. Execution is transactional at threshold.';

comment on function public.withdraw_owner_removal_vote(uuid) is
  'Active-owner RPC for withdrawing an open owner-removal ballot before execution or expiry.';

revoke execute on function public.is_eligible_owner(uuid) from public;
grant execute on function public.is_eligible_owner(uuid) to authenticated, service_role;

revoke execute on function public.get_owner_removal_required_approvals(uuid) from public;
grant execute on function public.get_owner_removal_required_approvals(uuid)
to authenticated, service_role;

revoke execute on function public.initiate_owner_removal_vote(uuid, text, timestamptz) from public;
grant execute on function public.initiate_owner_removal_vote(uuid, text, timestamptz)
to authenticated, service_role;

revoke execute on function public.cast_owner_removal_vote(uuid, text) from public;
grant execute on function public.cast_owner_removal_vote(uuid, text)
to authenticated, service_role;

revoke execute on function public.withdraw_owner_removal_vote(uuid) from public;
grant execute on function public.withdraw_owner_removal_vote(uuid)
to authenticated, service_role;

revoke execute on function public.expire_owner_removal_votes() from public;
grant execute on function public.expire_owner_removal_votes() to authenticated, service_role;

revoke execute on function public.mark_inactive_owners(timestamptz) from public;
grant execute on function public.mark_inactive_owners(timestamptz) to service_role;
