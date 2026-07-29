-- Lift Off Exams team account baseline
-- Creates team accounts, per-team roles, groups, invites, assignments, recipients, and attempts.

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active'
    check (status in ('active', 'archived', 'suspended')),
  billing_owner_user_id uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_memberships (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'student'
    check (role in ('team_admin', 'co_admin', 'student')),
  role_label text not null default 'Student',
  status text not null default 'invited'
    check (status in ('active', 'invited', 'removed', 'suspended')),
  managed_by uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or email is not null)
);

create unique index if not exists team_memberships_team_user_key
on public.team_memberships(team_id, user_id)
where user_id is not null;

create unique index if not exists team_memberships_team_email_key
on public.team_memberships(team_id, lower(email))
where email is not null;

create index if not exists team_memberships_team_role_idx
on public.team_memberships(team_id, role, status);

create table if not exists public.team_groups (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(team_id, name)
);

create table if not exists public.team_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.team_groups(id) on delete cascade,
  membership_id uuid not null references public.team_memberships(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(group_id, membership_id)
);

create table if not exists public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  email text not null,
  role text not null default 'student'
    check (role in ('team_admin', 'co_admin', 'student')),
  role_label text not null default 'Student',
  token_hash text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired')),
  created_by uuid references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists team_invites_team_status_idx
on public.team_invites(team_id, status, expires_at);

alter table public.team_invites
add column if not exists email_sent_at timestamptz;

alter table public.team_invites
add column if not exists send_count integer not null default 0;

alter table public.team_invites
add column if not exists last_send_error text;

create table if not exists public.team_assignments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  group_id uuid references public.team_groups(id) on delete set null,
  title text not null,
  description text,
  assignment_type text not null default 'blueprint_snapshot'
    check (assignment_type in ('test_id', 'blueprint_snapshot')),
  test_id text,
  blueprint_snapshot jsonb,
  assignment_settings jsonb not null default '{}'::jsonb,
  due_at timestamptz,
  attempt_limit integer not null default 1 check (attempt_limit > 0),
  status text not null default 'draft'
    check (status in ('draft', 'assigned', 'closed', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (assignment_type = 'test_id' and test_id is not null)
    or (assignment_type = 'blueprint_snapshot' and blueprint_snapshot is not null)
  )
);

create index if not exists team_assignments_team_status_idx
on public.team_assignments(team_id, status, due_at);

create table if not exists public.team_assignment_recipients (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.team_assignments(id) on delete cascade,
  membership_id uuid not null references public.team_memberships(id) on delete cascade,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'submitted', 'overdue', 'excused')),
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(assignment_id, membership_id)
);

create index if not exists team_assignment_recipients_membership_idx
on public.team_assignment_recipients(membership_id, status);

create table if not exists public.team_assignment_attempts (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.team_assignment_recipients(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  test_id text,
  attempt_number integer not null default 1 check (attempt_number > 0),
  correct integer not null default 0,
  total integer not null default 0,
  percent integer not null default 0,
  elapsed_seconds integer,
  topic_results jsonb not null default '[]'::jsonb,
  question_results jsonb not null default '[]'::jsonb,
  attempt_state jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(recipient_id, attempt_number)
);

create index if not exists team_assignment_attempts_user_idx
on public.team_assignment_attempts(user_id, submitted_at desc);

create or replace function public.current_team_role(p_team_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select tm.role
  from public.team_memberships tm
  where tm.team_id = p_team_id
    and tm.user_id = auth.uid()
    and tm.status = 'active'
  order by case tm.role
    when 'team_admin' then 1
    when 'co_admin' then 2
    else 3
  end
  limit 1;
$$;

create or replace function public.can_admin_team(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_team_role(p_team_id) = 'team_admin', false)
    or exists (
      select 1
      from public.teams t
      where t.id = p_team_id
        and t.created_by = auth.uid()
    );
$$;

create or replace function public.can_manage_team(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_team_role(p_team_id) in ('team_admin', 'co_admin'), false)
    or exists (
      select 1
      from public.teams t
      where t.id = p_team_id
        and t.created_by = auth.uid()
    );
$$;

alter table public.teams enable row level security;
alter table public.team_memberships enable row level security;
alter table public.team_groups enable row level security;
alter table public.team_group_members enable row level security;
alter table public.team_invites enable row level security;
alter table public.team_assignments enable row level security;
alter table public.team_assignment_recipients enable row level security;
alter table public.team_assignment_attempts enable row level security;

drop policy if exists "Team members can read teams" on public.teams;
create policy "Team members can read teams"
on public.teams for select
using (public.current_team_role(id) is not null or created_by = auth.uid());

drop policy if exists "Authenticated users can create teams" on public.teams;
create policy "Authenticated users can create teams"
on public.teams for insert
with check (auth.uid() is not null and created_by = auth.uid());

drop policy if exists "Team admins can update teams" on public.teams;
create policy "Team admins can update teams"
on public.teams for update
using (public.can_admin_team(id))
with check (public.can_admin_team(id));

drop policy if exists "Team admins can delete teams" on public.teams;
create policy "Team admins can delete teams"
on public.teams for delete
using (public.can_admin_team(id));

drop policy if exists "Team members can read memberships" on public.team_memberships;
create policy "Team members can read memberships"
on public.team_memberships for select
using (
  public.can_manage_team(team_id)
  or user_id = auth.uid()
  or lower(email) = lower(auth.jwt() ->> 'email')
);

drop policy if exists "Team managers can insert memberships" on public.team_memberships;
create policy "Team managers can insert memberships"
on public.team_memberships for insert
with check (
  public.can_admin_team(team_id)
  or (
    public.can_manage_team(team_id)
    and role = 'student'
  )
  or exists (
    select 1 from public.teams t
    where t.id = team_id
      and t.created_by = auth.uid()
  )
);

drop policy if exists "Team managers can update memberships" on public.team_memberships;
create policy "Team managers can update memberships"
on public.team_memberships for update
using (
  public.can_admin_team(team_id)
  or (
    public.can_manage_team(team_id)
    and role = 'student'
  )
)
with check (
  public.can_admin_team(team_id)
  or (
    public.can_manage_team(team_id)
    and role = 'student'
  )
);

drop policy if exists "Team admins can delete memberships" on public.team_memberships;
create policy "Team admins can delete memberships"
on public.team_memberships for delete
using (public.can_admin_team(team_id));

drop policy if exists "Team members can read groups" on public.team_groups;
create policy "Team members can read groups"
on public.team_groups for select
using (public.current_team_role(team_id) is not null);

drop policy if exists "Team managers can write groups" on public.team_groups;
create policy "Team managers can write groups"
on public.team_groups for all
using (public.can_manage_team(team_id))
with check (public.can_manage_team(team_id));

drop policy if exists "Team members can read group members" on public.team_group_members;
create policy "Team members can read group members"
on public.team_group_members for select
using (
  exists (
    select 1
    from public.team_groups tg
    where tg.id = group_id
      and public.current_team_role(tg.team_id) is not null
  )
);

drop policy if exists "Team managers can write group members" on public.team_group_members;
create policy "Team managers can write group members"
on public.team_group_members for all
using (
  exists (
    select 1
    from public.team_groups tg
    where tg.id = group_id
      and public.can_manage_team(tg.team_id)
  )
)
with check (
  exists (
    select 1
    from public.team_groups tg
    where tg.id = group_id
      and public.can_manage_team(tg.team_id)
  )
);

drop policy if exists "Team managers can read invites" on public.team_invites;
create policy "Team managers can read invites"
on public.team_invites for select
using (public.can_manage_team(team_id) or lower(email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "Team managers can write invites" on public.team_invites;
create policy "Team managers can write invites"
on public.team_invites for all
using (public.can_manage_team(team_id))
with check (
  public.can_admin_team(team_id)
  or (
    public.can_manage_team(team_id)
    and role = 'student'
  )
);

drop policy if exists "Team members can read assignments" on public.team_assignments;
create policy "Team members can read assignments"
on public.team_assignments for select
using (public.current_team_role(team_id) is not null);

drop policy if exists "Team managers can write assignments" on public.team_assignments;
create policy "Team managers can write assignments"
on public.team_assignments for all
using (public.can_manage_team(team_id))
with check (public.can_manage_team(team_id));

drop policy if exists "Team assignment recipients can read own rows" on public.team_assignment_recipients;
create policy "Team assignment recipients can read own rows"
on public.team_assignment_recipients for select
using (
  exists (
    select 1
    from public.team_assignments ta
    join public.team_memberships tm on tm.team_id = ta.team_id
    where ta.id = assignment_id
      and (
        public.can_manage_team(ta.team_id)
        or (tm.id = membership_id and tm.user_id = auth.uid())
      )
  )
);

drop policy if exists "Team managers can write assignment recipients" on public.team_assignment_recipients;
create policy "Team managers can write assignment recipients"
on public.team_assignment_recipients for all
using (
  exists (
    select 1
    from public.team_assignments ta
    where ta.id = assignment_id
      and public.can_manage_team(ta.team_id)
  )
)
with check (
  exists (
    select 1
    from public.team_assignments ta
    where ta.id = assignment_id
      and public.can_manage_team(ta.team_id)
  )
);

drop policy if exists "Team attempts visible to managers and owner" on public.team_assignment_attempts;
create policy "Team attempts visible to managers and owner"
on public.team_assignment_attempts for select
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.team_assignment_recipients tar
    join public.team_assignments ta on ta.id = tar.assignment_id
    where tar.id = recipient_id
      and public.can_manage_team(ta.team_id)
  )
);

drop policy if exists "Students can create own attempts" on public.team_assignment_attempts;
create policy "Students can create own attempts"
on public.team_assignment_attempts for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.team_assignment_recipients tar
    join public.team_memberships tm on tm.id = tar.membership_id
    where tar.id = recipient_id
      and tm.user_id = auth.uid()
      and tm.status = 'active'
  )
);

drop policy if exists "Students can update own attempts" on public.team_assignment_attempts;
create policy "Students can update own attempts"
on public.team_assignment_attempts for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create or replace function public.accept_team_invite(p_token_hash text)
returns table(team_id uuid, membership_id uuid, role text, role_label text)
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.team_invites%rowtype;
  member_row public.team_memberships%rowtype;
  current_email text := lower(auth.jwt() ->> 'email');
  current_name text := coalesce(
    auth.jwt() -> 'user_metadata' ->> 'display_name',
    auth.jwt() -> 'user_metadata' ->> 'full_name',
    auth.jwt() -> 'user_metadata' ->> 'name',
    split_part(current_email, '@', 1)
  );
begin
  if auth.uid() is null then
    raise exception 'Sign in before accepting a team invite';
  end if;

  if coalesce(p_token_hash, '') = '' then
    raise exception 'Invite token is required';
  end if;

  select *
  into invite_row
  from public.team_invites
  where token_hash = p_token_hash
  for update;

  if not found then
    raise exception 'Invalid team invite';
  end if;

  if invite_row.status <> 'pending' then
    raise exception 'Team invite is not pending';
  end if;

  if invite_row.expires_at <= now() then
    update public.team_invites
    set status = 'expired',
        updated_at = now()
    where id = invite_row.id;
    raise exception 'Team invite has expired';
  end if;

  if lower(invite_row.email) <> current_email then
    raise exception 'This invite belongs to a different email address';
  end if;

  update public.team_invites
  set status = 'accepted',
      accepted_by = auth.uid(),
      accepted_at = now(),
      updated_at = now()
  where id = invite_row.id;

  update public.team_memberships
  set user_id = auth.uid(),
      email = invite_row.email,
      display_name = coalesce(display_name, current_name),
      role = invite_row.role,
      role_label = invite_row.role_label,
      status = 'active',
      updated_at = now()
  where team_id = invite_row.team_id
    and lower(email) = lower(invite_row.email)
  returning * into member_row;

  if member_row.id is null then
    insert into public.team_memberships (
      team_id,
      user_id,
      email,
      display_name,
      role,
      role_label,
      status,
      created_by,
      updated_at
    )
    values (
      invite_row.team_id,
      auth.uid(),
      invite_row.email,
      current_name,
      invite_row.role,
      invite_row.role_label,
      'active',
      invite_row.created_by,
      now()
    )
    returning * into member_row;
  end if;

  return query
  select invite_row.team_id, member_row.id, member_row.role, member_row.role_label;
end;
$$;

grant execute on function public.accept_team_invite(text) to authenticated;
