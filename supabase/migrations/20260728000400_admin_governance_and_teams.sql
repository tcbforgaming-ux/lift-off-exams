-- Staff moderation, governance, and V1 team/assignment baseline.

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  resource_type text not null,
  resource_id text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.admin_audit_logs is
  'Append-only administrative audit log. Client updates and deletes are intentionally not granted.';

create table public.admin_access_links (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token_hash text not null unique,
  requested_role text not null default 'admin' check (requested_role in ('admin', 'owner')),
  status text not null default 'Pending Owner Approval'
    check (status in ('Pending Owner Approval', 'Approved', 'Rejected', 'Used', 'Expired')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create table public.name_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  submitted_name text not null,
  matched_term text,
  status text not null default 'Pending'
    check (status in ('Pending', 'Approved', 'Modified', 'Rejected')),
  replacement_name text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.banned_terms (
  id uuid primary key default gen_random_uuid(),
  term text not null unique,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.notification_broadcasts (
  id uuid primary key default gen_random_uuid(),
  audience text not null check (audience in ('all', 'premium', 'free', 'admin', 'owner')),
  title text not null,
  message text not null,
  status text not null default 'Queued'
    check (status in ('Queued', 'Sent', 'Failed', 'Cancelled')),
  recipient_count integer not null default 0 check (recipient_count >= 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table public.governance_votes (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  target_email text,
  threshold text not null,
  required_approvals integer not null default 1 check (required_approvals > 0),
  required_rejections integer not null default 1 check (required_rejections > 0),
  reason text,
  status text not null default 'Open' check (status in ('Open', 'Approved', 'Rejected')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.governance_ballots (
  vote_id uuid not null references public.governance_votes(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  decision text not null check (decision in ('Approve', 'Reject')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (vote_id, owner_user_id)
);

create table public.duplicate_question_reviews (
  id uuid primary key default gen_random_uuid(),
  candidate_hash text not null,
  candidate_question jsonb not null,
  matching_question_id uuid references public.questions(id) on delete set null,
  similarity integer not null default 0 check (similarity between 0 and 100),
  status text not null default 'Pending'
    check (status in ('Pending', 'Upload Anyway', 'Edit', 'Cancelled')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.teams (
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

create table public.team_memberships (
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

create unique index team_memberships_team_user_key
on public.team_memberships(team_id, user_id)
where user_id is not null;

create unique index team_memberships_team_email_key
on public.team_memberships(team_id, lower(email))
where email is not null;

create index team_memberships_team_role_idx
on public.team_memberships(team_id, role, status);

create table public.team_groups (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(team_id, name)
);

create table public.team_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.team_groups(id) on delete cascade,
  membership_id uuid not null references public.team_memberships(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(group_id, membership_id)
);

create table public.team_invites (
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
  email_sent_at timestamptz,
  send_count integer not null default 0 check (send_count >= 0),
  last_send_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index team_invites_team_status_idx
on public.team_invites(team_id, status, expires_at);

create table public.team_assignments (
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

create index team_assignments_team_status_idx
on public.team_assignments(team_id, status, due_at);

create table public.team_assignment_recipients (
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

create index team_assignment_recipients_membership_idx
on public.team_assignment_recipients(membership_id, status);

create table public.team_assignment_attempts (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.team_assignment_recipients(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  test_id text,
  attempt_number integer not null default 1 check (attempt_number > 0),
  correct integer not null default 0 check (correct >= 0),
  total integer not null default 0 check (total >= 0),
  percent integer not null default 0 check (percent between 0 and 100),
  elapsed_seconds integer check (elapsed_seconds is null or elapsed_seconds >= 0),
  topic_results jsonb not null default '[]'::jsonb,
  question_results jsonb not null default '[]'::jsonb,
  attempt_state jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(recipient_id, attempt_number)
);

create index team_assignment_attempts_user_idx
on public.team_assignment_attempts(user_id, submitted_at desc);

create trigger name_reviews_set_updated_at
before update on public.name_reviews
for each row execute function public.set_updated_at();

create trigger governance_ballots_set_updated_at
before update on public.governance_ballots
for each row execute function public.set_updated_at();

create trigger teams_set_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

create trigger team_memberships_set_updated_at
before update on public.team_memberships
for each row execute function public.set_updated_at();

create trigger team_groups_set_updated_at
before update on public.team_groups
for each row execute function public.set_updated_at();

create trigger team_invites_set_updated_at
before update on public.team_invites
for each row execute function public.set_updated_at();

create trigger team_assignments_set_updated_at
before update on public.team_assignments
for each row execute function public.set_updated_at();

create trigger team_assignment_attempts_set_updated_at
before update on public.team_assignment_attempts
for each row execute function public.set_updated_at();

alter table public.admin_audit_logs enable row level security;
alter table public.admin_access_links enable row level security;
alter table public.name_reviews enable row level security;
alter table public.banned_terms enable row level security;
alter table public.notification_broadcasts enable row level security;
alter table public.governance_votes enable row level security;
alter table public.governance_ballots enable row level security;
alter table public.duplicate_question_reviews enable row level security;
alter table public.teams enable row level security;
alter table public.team_memberships enable row level security;
alter table public.team_groups enable row level security;
alter table public.team_group_members enable row level security;
alter table public.team_invites enable row level security;
alter table public.team_assignments enable row level security;
alter table public.team_assignment_recipients enable row level security;
alter table public.team_assignment_attempts enable row level security;
