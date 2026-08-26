-- Core public learning content and Test ID metadata.
-- Test IDs store reproducibility metadata, including blueprint snapshots, but
-- not completed user answer sessions.

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  partition_key text not null,
  performance_indicator text,
  question_type text not null default 'Multiple Choice',
  question_text text not null,
  options jsonb not null,
  correct_option_id text not null check (correct_option_id in ('A', 'B', 'C', 'D')),
  explanation text,
  difficulty text not null check (difficulty in ('Easy', 'Medium', 'Hard')),
  tags text[] not null default '{}',
  lifecycle_state text not null default 'Active'
    check (lifecycle_state in ('Active', 'Retired')),
  question_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint questions_options_array_check
    check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) = 4)
);

comment on table public.questions is
  'Global question repository. Retired questions remain for historical Test IDs but are excluded from new generation.';

create unique index questions_question_hash_key
on public.questions(question_hash)
where question_hash is not null;

create index questions_partition_difficulty_idx
on public.questions(partition_key, difficulty)
where lifecycle_state = 'Active';

create index questions_tags_gin_idx
on public.questions using gin(tags);

create trigger questions_set_updated_at
before update on public.questions
for each row execute function public.set_updated_at();

create table public.question_versions (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  version_number integer not null,
  snapshot jsonb not null,
  change_reason text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  unique(question_id, version_number)
);

comment on table public.question_versions is
  'Short-term question edit history used for PRD reversion and Test ID update warnings.';

create table public.blueprint_versions (
  id uuid primary key default gen_random_uuid(),
  blueprint_name text not null,
  cluster text not null,
  level text not null,
  category text not null,
  version text not null,
  distribution jsonb not null default '{}'::jsonb,
  total_questions integer not null default 0 check (total_questions >= 0),
  status text not null default 'Active'
    check (status in ('Active', 'Retired', 'Rolled Back')),
  change_reason text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(blueprint_name, version)
);

comment on table public.blueprint_versions is
  'Versioned blueprint definitions. Test IDs store snapshots so older pools remain reproducible.';

create table public.test_ids (
  id text primary key check (id ~ '^[A-Z0-9]{12}$'),
  mode text not null default 'Test'
    check (mode in ('Test', 'Quiz', 'Infinite Run', 'Hardcore Run', 'Demo Test')),
  category text not null,
  difficulties text[] not null default '{}',
  topic_tags text[] not null default '{}',
  question_count integer not null check (question_count between 1 and 250),
  pool_timestamp timestamptz not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  blueprint_version_id uuid references public.blueprint_versions(id) on delete set null,
  blueprint_snapshot jsonb,
  generation_metadata jsonb not null default '{}'::jsonb
);

comment on table public.test_ids is
  'Seed metadata for reproducible tests. Stores pool and blueprint metadata, not generated answer sessions.';

create index test_ids_created_by_idx
on public.test_ids(created_by, created_at desc);

create table public.question_reports (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references public.questions(id) on delete set null,
  test_id text references public.test_ids(id) on delete set null,
  reason text not null default 'User reported question',
  status text not null default 'Open'
    check (status in ('Open', 'Valid', 'Invalid', 'Spam', 'Fixed', 'Work In Progress')),
  reporter_id uuid references auth.users(id) on delete set null,
  report_snapshot jsonb not null default '{}'::jsonb,
  admin_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index question_reports_status_created_idx
on public.question_reports(status, created_at desc);

create trigger question_reports_set_updated_at
before update on public.question_reports
for each row execute function public.set_updated_at();

alter table public.questions enable row level security;
alter table public.question_versions enable row level security;
alter table public.blueprint_versions enable row level security;
alter table public.test_ids enable row level security;
alter table public.question_reports enable row level security;
