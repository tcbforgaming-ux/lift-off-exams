create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  partition_key text not null,
  performance_indicator text,
  question_type text,
  question_text text not null,
  options jsonb not null,
  correct_option_id text not null check (correct_option_id in ('A', 'B', 'C', 'D')),
  explanation text,
  difficulty text not null check (difficulty in ('Easy', 'Medium', 'Hard')),
  tags text[] not null default '{}',
  status text not null default 'Unseen' check (status in ('Unseen', 'Seen', 'Answered correctly', 'Answered incorrectly')),
  seen_count integer not null default 0,
  lifecycle_state text not null default 'Active' check (lifecycle_state in ('Active', 'Retired')),
  question_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.questions
add column if not exists status text not null default 'Unseen'
check (status in ('Unseen', 'Seen', 'Answered correctly', 'Answered incorrectly'));

alter table public.questions
add column if not exists seen_count integer not null default 0;

alter table public.questions
add column if not exists lifecycle_state text not null default 'Active'
check (lifecycle_state in ('Active', 'Retired'));

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  role text not null default 'student' check (role in ('student', 'admin', 'owner')),
  account_tier text not null default 'free' check (account_tier in ('free', 'premium')),
  suspended_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.profiles
add column if not exists display_name text;

alter table public.profiles
add column if not exists phone text;

alter table public.profiles
add column if not exists role text not null default 'student'
check (role in ('student', 'admin', 'owner'));

alter table public.profiles
add column if not exists account_tier text not null default 'free'
check (account_tier in ('free', 'premium'));

alter table public.profiles
add column if not exists account_type text;

update public.profiles
set account_tier = coalesce(account_tier, account_type, 'free')
where account_tier is null;

alter table public.profiles
add column if not exists suspended_until timestamptz;

alter table public.profiles
add column if not exists owner_privileges_suspended boolean not null default false;

alter table public.profiles
add column if not exists owner_privileges_suspended_at timestamptz;

alter table public.profiles
add column if not exists owner_privileges_restored_at timestamptz;

alter table public.profiles
add column if not exists created_at timestamptz not null default now();

alter table public.profiles
add column if not exists updated_at timestamptz not null default now();

create unique index if not exists profiles_user_id_key
on public.profiles(user_id)
where user_id is not null;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    auth.jwt() -> 'app_metadata' ->> 'role',
    (select role from public.profiles where user_id = auth.uid()),
    'student'
  );
$$;

create table if not exists public.generated_question_batches (
  id uuid primary key default gen_random_uuid(),
  openai_batch_id text unique,
  input_file_id text,
  output_file_id text,
  status text not null default 'Draft'
    check (status in ('Draft', 'Submitted', 'Building', 'Built', 'Validating', 'In Progress', 'Generated', 'Completed', 'Importing', 'Imported', 'Under Review', 'Partially Published', 'Published', 'Failed', 'Cancelled', 'building', 'built', 'validating', 'in_progress', 'finalizing')),
  prompt_template_version text,
  model_name text,
  requested_count integer not null default 0,
  imported_count integer not null default 0,
  failed_count integer not null default 0,
  import_offset integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  error text,
  metadata jsonb not null default '{}'
);

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'generated_question_batches'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%status%'
  loop
    execute format('alter table public.generated_question_batches drop constraint if exists %I', constraint_name);
  end loop;
end $$;

alter table public.generated_question_batches
add constraint generated_question_batches_status_check
check (status in ('Draft', 'Submitted', 'Building', 'Built', 'Validating', 'In Progress', 'Generated', 'Completed', 'Importing', 'Imported', 'Under Review', 'Partially Published', 'Published', 'Failed', 'Cancelled', 'building', 'built', 'validating', 'in_progress', 'finalizing'));

create table if not exists public.generated_question_candidates (
  id uuid primary key default gen_random_uuid(),
  batch_job_id uuid references public.generated_question_batches(id) on delete set null,
  source_custom_id text,
  performance_indicator text,
  partition_keys jsonb not null default '[]'::jsonb,
  category text,
  question_type text not null,
  question_text text not null,
  options jsonb not null,
  correct_option_id text not null check (correct_option_id in ('A', 'B', 'C', 'D')),
  explanation text,
  difficulty text not null check (difficulty in ('Easy', 'Medium', 'Hard')),
  tags text[] not null default '{}',
  question_hash text,
  validation_status text not null default 'Unchecked'
    check (validation_status in ('Unchecked', 'Valid', 'Invalid', 'Needs Review')),
  validation_errors text[] not null default '{}',
  review_status text not null default 'Pending Review'
    check (review_status in ('Pending Review', 'Approved', 'Rejected', 'Needs Edit', 'Published')),
  quality_score numeric(5,2),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  published_question_id uuid references public.questions(id) on delete set null,
  raw_response jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists generated_question_candidates_review_idx
on public.generated_question_candidates(review_status, validation_status, created_at desc);

create index if not exists generated_question_candidates_hash_idx
on public.generated_question_candidates(question_hash);

create index if not exists generated_question_candidates_tags_idx
on public.generated_question_candidates using gin(tags);

create index if not exists generated_question_candidates_batch_idx
on public.generated_question_candidates(batch_job_id, created_at desc);

create index if not exists generated_question_candidates_category_idx
on public.generated_question_candidates(category, created_at desc);

alter table public.generated_question_batches enable row level security;
alter table public.generated_question_candidates enable row level security;

drop policy if exists "Allow admin generated batch reads" on public.generated_question_batches;
create policy "Allow admin generated batch reads"
on public.generated_question_batches
for select
using (public.current_user_role() in ('admin', 'owner'));

drop policy if exists "Allow admin generated batch writes" on public.generated_question_batches;
create policy "Allow admin generated batch writes"
on public.generated_question_batches
for all
using (public.current_user_role() in ('admin', 'owner'))
with check (public.current_user_role() in ('admin', 'owner'));

drop policy if exists "Allow admin generated candidate reads" on public.generated_question_candidates;
create policy "Allow admin generated candidate reads"
on public.generated_question_candidates
for select
using (public.current_user_role() in ('admin', 'owner'));

drop policy if exists "Allow admin generated candidate writes" on public.generated_question_candidates;
create policy "Allow admin generated candidate writes"
on public.generated_question_candidates
for all
using (public.current_user_role() in ('admin', 'owner'))
with check (public.current_user_role() in ('admin', 'owner'));

create or replace function public.publish_generated_question(p_candidate_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_candidate public.generated_question_candidates%rowtype;
  v_partition_key text;
  v_published_question_id uuid;
  v_total_candidates integer;
  v_published_candidates integer;
begin
  if public.current_user_role() not in ('admin', 'owner') then
    raise exception 'Administrator or Owner access is required to publish generated questions.';
  end if;

  select *
  into v_candidate
  from public.generated_question_candidates
  where id = p_candidate_id
  for update;

  if not found then
    raise exception 'Generated question candidate % was not found.', p_candidate_id;
  end if;

  if v_candidate.review_status = 'Published' then
    return v_candidate.published_question_id;
  end if;

  if v_candidate.review_status <> 'Approved' then
    raise exception 'Candidate must be approved before publishing. Current review_status: %', v_candidate.review_status;
  end if;

  if v_candidate.reviewed_by is null or v_candidate.reviewed_at is null then
    raise exception 'Candidate requires one recorded admin or owner approval before publishing.';
  end if;

  if v_candidate.validation_status <> 'Valid' then
    raise exception 'Candidate must be valid before publishing. Current validation_status: %', v_candidate.validation_status;
  end if;

  if v_candidate.question_hash is not null and exists (
    select 1
    from public.questions q
    where q.question_hash = v_candidate.question_hash
  ) then
    raise exception 'A live question with this question_hash already exists.';
  end if;

  select value
  into v_partition_key
  from jsonb_array_elements_text(v_candidate.partition_keys)
  limit 1;

  v_partition_key := coalesce(nullif(v_partition_key, ''), nullif(v_candidate.category, ''), 'Business Administration Core');

  insert into public.questions (
    partition_key,
    performance_indicator,
    question_type,
    question_text,
    options,
    correct_option_id,
    explanation,
    difficulty,
    tags,
    status,
    seen_count,
    lifecycle_state,
    question_hash,
    updated_at
  )
  values (
    v_partition_key,
    v_candidate.performance_indicator,
    v_candidate.question_type,
    v_candidate.question_text,
    v_candidate.options,
    v_candidate.correct_option_id,
    v_candidate.explanation,
    v_candidate.difficulty,
    v_candidate.tags,
    'Unseen',
    0,
    'Active',
    v_candidate.question_hash,
    now()
  )
  returning id into v_published_question_id;

  update public.generated_question_candidates
  set
    review_status = 'Published',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    published_question_id = v_published_question_id,
    updated_at = now()
  where id = p_candidate_id;

  if v_candidate.batch_job_id is not null then
    select
      count(*),
      count(*) filter (where review_status = 'Published')
    into
      v_total_candidates,
      v_published_candidates
    from public.generated_question_candidates
    where batch_job_id = v_candidate.batch_job_id;

    update public.generated_question_batches
    set
      status = case
        when v_total_candidates > 0 and v_published_candidates = v_total_candidates then 'Published'
        when v_published_candidates > 0 then 'Partially Published'
        else 'Under Review'
      end,
      imported_count = greatest(imported_count, v_total_candidates),
      completed_at = case
        when v_total_candidates > 0 and v_published_candidates = v_total_candidates then now()
        else completed_at
      end,
      metadata = jsonb_set(
        jsonb_set(metadata, '{published_count}', to_jsonb(v_published_candidates), true),
        '{candidate_count}',
        to_jsonb(v_total_candidates),
        true
      )
    where id = v_candidate.batch_job_id;
  end if;

  return v_published_question_id;
end;
$$;

alter table public.questions enable row level security;

create policy "Allow public read for questions"
on public.questions
for select
using (true);

-- Production-style insert policy.
-- Staff roles can come from public.profiles.role or app_metadata.role.
create policy "Allow admin question inserts"
on public.questions
for insert
with check (public.current_user_role() in ('admin', 'owner'));

alter table public.profiles enable row level security;

create policy "Users read own profile"
on public.profiles
for select
using (auth.uid() = user_id);

create policy "Admins and owners read profiles"
on public.profiles
for select
using (public.current_user_role() in ('admin', 'owner'));

create policy "Users create own profile"
on public.profiles
for insert
with check (auth.uid() = user_id and role = 'student');

drop policy if exists "Users update own basic profile" on public.profiles;
create policy "Users update own basic profile"
on public.profiles
for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and role = (select role from public.profiles where user_id = auth.uid())
);

create policy "Owners update staff roles"
on public.profiles
for update
using (public.current_user_role() = 'owner')
with check (public.current_user_role() = 'owner');

create table if not exists public.admin_access_links (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token_hash text not null,
  requested_role text not null default 'admin' check (requested_role in ('admin', 'owner')),
  status text not null default 'Pending Owner Approval' check (status in ('Pending Owner Approval', 'Approved', 'Rejected', 'Used', 'Expired')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

alter table public.admin_access_links enable row level security;

create policy "Admins and owners create admin access links"
on public.admin_access_links
for insert
with check (public.current_user_role() in ('admin', 'owner'));

create policy "Owners read admin access links"
on public.admin_access_links
for select
using (public.current_user_role() = 'owner');

create table if not exists public.governance_votes (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  threshold text not null,
  status text not null default 'Open' check (status in ('Open', 'Approved', 'Rejected')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.governance_votes enable row level security;

create policy "Owners manage governance votes"
on public.governance_votes
for all
using (public.current_user_role() = 'owner')
with check (public.current_user_role() = 'owner');

create policy "Allow admin question updates"
on public.questions
for update
using (public.current_user_role() in ('admin', 'owner'))
with check (public.current_user_role() in ('admin', 'owner'));

-- Prototype-only alternative. Do not use this on a public app.
-- create policy "Allow anon question inserts for prototype"
-- on public.questions
-- for insert
-- with check (true);
-- create policy "Allow anon question updates for prototype"
-- on public.questions
-- for update
-- using (true)
-- with check (true);

create table if not exists public.test_ids (
  id text primary key,
  mode text not null default 'Test',
  category text not null,
  difficulties text[] not null default '{}',
  topic_tags text[] not null default '{}',
  question_count integer not null check (question_count > 0),
  pool_timestamp timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.test_ids
add column if not exists mode text not null default 'Test';

alter table public.test_ids enable row level security;

create policy "Allow public read for test ids"
on public.test_ids
for select
using (true);

create policy "Allow authenticated test id creation"
on public.test_ids
for insert
with check (auth.role() = 'authenticated');

create policy "Allow authenticated test id updates"
on public.test_ids
for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create table if not exists public.question_reports (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references public.questions(id) on delete set null,
  test_id text,
  reason text not null default 'User reported question',
  status text not null default 'Open' check (status in ('Open', 'Valid', 'Invalid', 'Spam', 'Fixed', 'Work In Progress')),
  reporter_id uuid references auth.users(id) on delete set null,
  report_snapshot jsonb not null default '{}',
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.question_reports enable row level security;

create policy "Allow authenticated report creation"
on public.question_reports
for insert
with check (auth.role() = 'authenticated');

create policy "Allow admin report reads"
on public.question_reports
for select
using (public.current_user_role() in ('admin', 'owner'));

create policy "Allow admin report updates"
on public.question_reports
for update
using (public.current_user_role() in ('admin', 'owner'))
with check (public.current_user_role() in ('admin', 'owner'));

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

-- Final account deletion execution should run in a trusted backend context
-- such as a Supabase Edge Function or scheduled job using the service-role key.
-- The browser records owner review state only; it must not receive service-role access.

-- Apply admin-controls.sql after this schema to enable shared moderation,
-- broadcasts, governance ballots, audit logs, duplicate review, banned-term
-- detection, and blueprint version history.
