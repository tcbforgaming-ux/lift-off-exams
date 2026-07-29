create table if not exists public.user_question_status (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  status text not null default 'Unseen' check (status in ('Unseen', 'Seen', 'Answered correctly', 'Answered incorrectly')),
  seen_count integer not null default 0,
  last_seen_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

alter table public.user_question_status enable row level security;

drop policy if exists "Users manage own question statuses" on public.user_question_status;
create policy "Users manage own question statuses"
on public.user_question_status
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'light' check (theme in ('light', 'dark')),
  account_tier text not null default 'free' check (account_tier in ('free', 'premium')),
  selected_settings jsonb not null default '{}',
  notification_settings jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.profiles
add column if not exists account_tier text not null default 'free'
check (account_tier in ('free', 'premium'));

alter table public.profiles
add column if not exists account_type text;

alter table public.profiles
add column if not exists owner_privileges_suspended boolean not null default false;

alter table public.profiles
add column if not exists owner_privileges_suspended_at timestamptz;

alter table public.profiles
add column if not exists owner_privileges_restored_at timestamptz;

update public.profiles
set account_tier = coalesce(account_tier, account_type, 'free')
where account_tier is null;

alter table public.user_preferences enable row level security;

drop policy if exists "Users manage own preferences" on public.user_preferences;
create policy "Users manage own preferences"
on public.user_preferences
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique not null,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  status text not null default 'inactive',
  price_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.billing_customers enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "Users read own billing customer" on public.billing_customers;
create policy "Users read own billing customer"
on public.billing_customers
for select
using (auth.uid() = user_id);

drop policy if exists "Users read own subscription" on public.subscriptions;
create policy "Users read own subscription"
on public.subscriptions
for select
using (auth.uid() = user_id);

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  stripe_created_at timestamptz,
  processed_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;

create index if not exists stripe_webhook_events_processed_at_idx
on public.stripe_webhook_events (processed_at desc);

create table if not exists public.user_test_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_id text not null,
  mode text not null,
  completed_at timestamptz not null default now(),
  correct integer not null default 0,
  total integer not null default 0,
  percent integer not null default 0,
  topics text[] not null default '{}',
  category text,
  difficulty text,
  blueprint text,
  question_count integer not null default 0,
  metadata jsonb not null default '{}',
  unique (user_id, test_id)
);

alter table public.user_test_history enable row level security;

drop policy if exists "Users manage own test history" on public.user_test_history;
create policy "Users manage own test history"
on public.user_test_history
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.user_topic_stats (
  user_id uuid not null references auth.users(id) on delete cascade,
  stat_type text not null check (stat_type in ('topic', 'difficulty', 'confidence')),
  label text not null,
  correct integer not null default 0,
  unsure integer not null default 0,
  total integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, stat_type, label)
);

alter table public.user_topic_stats enable row level security;

drop policy if exists "Users manage own performance stats" on public.user_topic_stats;
create policy "Users manage own performance stats"
on public.user_topic_stats
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.user_custom_blueprints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  cluster text not null,
  level text not null,
  category text not null,
  version text not null default '2026.1',
  distribution jsonb not null default '{}',
  total_questions integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.user_custom_blueprints enable row level security;

drop policy if exists "Users manage own custom blueprints" on public.user_custom_blueprints;
create policy "Users manage own custom blueprints"
on public.user_custom_blueprints
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.user_active_sessions (
  user_id uuid not null references auth.users(id) on delete cascade,
  session_type text not null default 'paused_test',
  test_id text,
  mode text,
  current_index integer not null default 0,
  question_count integer not null default 0,
  timer_seconds_remaining integer,
  session_state jsonb not null default '{}',
  saved_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, session_type)
);

alter table public.user_active_sessions enable row level security;

drop policy if exists "Users manage own active sessions" on public.user_active_sessions;
create policy "Users manage own active sessions"
on public.user_active_sessions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  delivery_status text not null default 'Queued' check (delivery_status in ('Queued', 'Sent', 'Failed', 'Read')),
  metadata jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_notifications enable row level security;

drop policy if exists "Users read own notifications" on public.user_notifications;
create policy "Users read own notifications"
on public.user_notifications
for select
using (auth.uid() = user_id);

drop policy if exists "Users update own notification reads" on public.user_notifications;
create policy "Users update own notification reads"
on public.user_notifications
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Owners create user notifications" on public.user_notifications;
create policy "Owners create user notifications"
on public.user_notifications
for insert
with check (public.current_user_role() = 'owner');

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'Requested' check (status in ('Requested', 'Final warning sent', 'Cancelled', 'Completed')),
  reason text,
  requested_at timestamptz not null default now(),
  recoverable_until timestamptz not null,
  final_warning_at timestamptz not null,
  execution_note text,
  cancelled_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.account_deletion_requests
add column if not exists execution_note text;

alter table public.account_deletion_requests enable row level security;

drop policy if exists "Users create own deletion requests" on public.account_deletion_requests;
create policy "Users create own deletion requests"
on public.account_deletion_requests
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users read own deletion requests" on public.account_deletion_requests;
create policy "Users read own deletion requests"
on public.account_deletion_requests
for select
using (auth.uid() = user_id);

drop policy if exists "Users cancel own deletion requests" on public.account_deletion_requests;
create policy "Users cancel own deletion requests"
on public.account_deletion_requests
for update
using (auth.uid() = user_id and status in ('Requested', 'Final warning sent'))
with check (auth.uid() = user_id and status in ('Cancelled', 'Requested', 'Final warning sent'));

drop policy if exists "Owners read account deletion requests" on public.account_deletion_requests;
drop policy if exists "Admins and owners read account deletion requests" on public.account_deletion_requests;
create policy "Admins and owners read account deletion requests"
on public.account_deletion_requests
for select
using (public.current_user_role() in ('admin', 'owner'));

drop policy if exists "Owners update account deletion requests" on public.account_deletion_requests;
create policy "Owners update account deletion requests"
on public.account_deletion_requests
for update
using (public.current_user_role() = 'owner')
with check (public.current_user_role() = 'owner');

-- Apply admin-controls.sql after this file to enable shared moderation,
-- broadcasts, governance ballots, audit logs, duplicate review, banned-term
-- detection, and blueprint version history.
