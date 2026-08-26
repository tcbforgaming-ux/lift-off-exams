-- User-owned data. These tables require strict owner-scoped RLS because they
-- contain sessions, results, analytics, preferences, and billing state.

create table public.user_question_status (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  status text not null default 'Unseen'
    check (status in ('Unseen', 'Seen', 'Answered correctly', 'Answered incorrectly')),
  seen_count integer not null default 0 check (seen_count >= 0),
  last_seen_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'light' check (theme in ('light', 'dark')),
  account_tier text not null default 'free' check (account_tier in ('free', 'premium')),
  selected_settings jsonb not null default '{}'::jsonb,
  notification_settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.user_test_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_id text not null,
  mode text not null,
  completed_at timestamptz not null default now(),
  correct integer not null default 0 check (correct >= 0),
  total integer not null default 0 check (total >= 0),
  percent integer not null default 0 check (percent between 0 and 100),
  topics text[] not null default '{}',
  category text,
  difficulty text,
  blueprint text,
  question_count integer not null default 0 check (question_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  unique (user_id, test_id)
);

create table public.user_topic_stats (
  user_id uuid not null references auth.users(id) on delete cascade,
  stat_type text not null check (stat_type in ('topic', 'difficulty', 'confidence')),
  label text not null,
  correct integer not null default 0 check (correct >= 0),
  unsure integer not null default 0 check (unsure >= 0),
  total integer not null default 0 check (total >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, stat_type, label)
);

create table public.user_active_sessions (
  user_id uuid not null references auth.users(id) on delete cascade,
  session_type text not null default 'paused_test',
  test_id text,
  mode text,
  current_index integer not null default 0 check (current_index >= 0),
  question_count integer not null default 0 check (question_count >= 0),
  timer_seconds_remaining integer check (timer_seconds_remaining is null or timer_seconds_remaining >= 0),
  session_state jsonb not null default '{}'::jsonb,
  saved_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, session_type)
);

comment on table public.user_active_sessions is
  'Private paused-session storage. Users may access only their own active session rows.';

create table public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  delivery_status text not null default 'Queued'
    check (delivery_status in ('Queued', 'Sent', 'Failed', 'Read')),
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique not null,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.billing_customers is
  'Server-managed Stripe customer map. Users may read their own row; writes are server-only.';

create table public.subscriptions (
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

comment on table public.subscriptions is
  'Server-managed Stripe subscription state synchronized by webhooks.';

create table public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  stripe_created_at timestamptz,
  processed_at timestamptz not null default now()
);

comment on table public.stripe_webhook_events is
  'Server-only idempotency ledger for Stripe webhook processing.';

create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'Requested'
    check (status in ('Requested', 'Final warning sent', 'Cancelled', 'Completed')),
  reason text,
  requested_at timestamptz not null default now(),
  recoverable_until timestamptz not null,
  final_warning_at timestamptz not null,
  execution_note text,
  cancelled_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index user_test_history_user_completed_idx
on public.user_test_history(user_id, completed_at desc);

create index user_notifications_user_created_idx
on public.user_notifications(user_id, created_at desc);

create index stripe_webhook_events_processed_at_idx
on public.stripe_webhook_events(processed_at desc);

create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

create trigger user_active_sessions_set_updated_at
before update on public.user_active_sessions
for each row execute function public.set_updated_at();

create trigger user_notifications_set_updated_at
before update on public.user_notifications
for each row execute function public.set_updated_at();

create trigger billing_customers_set_updated_at
before update on public.billing_customers
for each row execute function public.set_updated_at();

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

create trigger account_deletion_requests_set_updated_at
before update on public.account_deletion_requests
for each row execute function public.set_updated_at();

alter table public.user_question_status enable row level security;
alter table public.user_preferences enable row level security;
alter table public.user_test_history enable row level security;
alter table public.user_topic_stats enable row level security;
alter table public.user_active_sessions enable row level security;
alter table public.user_notifications enable row level security;
alter table public.billing_customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_webhook_events enable row level security;
alter table public.account_deletion_requests enable row level security;
