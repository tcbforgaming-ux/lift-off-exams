-- Milestone 4: staff question repository.
-- Repository reads are bounded through RPCs so the browser never needs a
-- complete question-bank query. Lifecycle changes are transactional and audited.

create table public.question_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete restrict,
  previous_state text not null check (previous_state in ('Active', 'Retired')),
  new_state text not null check (new_state in ('Active', 'Retired')),
  actor_user_id uuid references auth.users(id) on delete set null,
  reason text not null,
  created_at timestamptz not null default now()
);

comment on table public.question_lifecycle_events is
  'Append-only audit trail for Active/Retired question lifecycle changes.';

alter table public.question_lifecycle_events enable row level security;

create policy question_lifecycle_events_staff_select
on public.question_lifecycle_events
for select
to authenticated
using (public.is_admin());

drop policy if exists questions_select_public on public.questions;

create policy questions_select_active_public
on public.questions
for select
to anon, authenticated
using (lifecycle_state = 'Active');

revoke update on public.questions from authenticated;

create index if not exists questions_repository_order_idx
on public.questions(lifecycle_state, updated_at desc, id desc);

create index if not exists questions_repository_pi_idx
on public.questions(performance_indicator, updated_at desc, id desc)
where performance_indicator is not null;

create index if not exists questions_repository_type_difficulty_idx
on public.questions(question_type, difficulty, updated_at desc, id desc);

create or replace function public.escape_repository_like(p_value text)
returns text
language sql
immutable
strict
as $$
  select replace(replace(replace(p_value, '\', '\\'), '%', '\%'), '_', '\_');
$$;

create or replace function public.search_question_repository(
  p_page_size integer default 25,
  p_cursor_updated_at timestamptz default null,
  p_cursor_id uuid default null,
  p_search text default null,
  p_lifecycle_state text default null,
  p_partition_keys text[] default null,
  p_performance_indicators text[] default null,
  p_difficulties text[] default null,
  p_question_types text[] default null,
  p_tags text[] default null,
  p_created_from timestamptz default null,
  p_created_to timestamptz default null
)
returns table (
  question_id uuid,
  partition_key text,
  performance_indicator text,
  question_type text,
  question_text text,
  difficulty text,
  tags text[],
  lifecycle_state text,
  created_at timestamptz,
  updated_at timestamptz,
  question_hash text,
  has_next_page boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_limit integer := coalesce(p_page_size, 25);
  bounded_limit integer;
  normalized_search text := nullif(trim(coalesce(p_search, '')), '');
  escaped_search text;
  normalized_difficulties text[];
  normalized_question_types text[];
  normalized_tags text[];
  normalized_partitions text[];
  normalized_indicators text[];
begin
  if not public.is_admin() then
    raise exception 'Administrator or Owner access is required for the question repository.';
  end if;

  if requested_limit < 1 then
    raise exception 'Page size must be at least 1.';
  end if;

  bounded_limit := least(requested_limit, 100);

  if (p_cursor_updated_at is null) <> (p_cursor_id is null) then
    raise exception 'Both cursor timestamp and cursor question id are required for cursor pagination.';
  end if;

  if p_lifecycle_state is not null and p_lifecycle_state not in ('Active', 'Retired') then
    raise exception 'Invalid lifecycle state filter.';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_difficulties, '{}'::text[])) value
    where value not in ('Easy', 'Medium', 'Hard', 'E', 'M', 'H')
  ) then
    raise exception 'Invalid difficulty filter.';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_question_types, '{}'::text[])) value
    where value not in (
      'S',
      'D',
      'F',
      'A',
      'Scenario',
      'Definition',
      'Fill In The Blank',
      'All Except',
      'Multiple Choice'
    )
  ) then
    raise exception 'Invalid question type filter.';
  end if;

  if normalized_search is not null and length(normalized_search) < 2 then
    normalized_search := null;
  end if;

  if normalized_search is not null then
    normalized_search := left(normalized_search, 120);
    escaped_search := '%' || public.escape_repository_like(lower(normalized_search)) || '%';
  end if;

  select coalesce(array_agg(distinct mapped), '{}'::text[])
  into normalized_difficulties
  from (
    select case value
      when 'E' then 'Easy'
      when 'M' then 'Medium'
      when 'H' then 'Hard'
      else value
    end as mapped
    from unnest(coalesce(p_difficulties, '{}'::text[])) value
    where nullif(trim(value), '') is not null
  ) values_to_map;

  select coalesce(array_agg(distinct mapped), '{}'::text[])
  into normalized_question_types
  from (
    select case value
      when 'S' then 'Scenario'
      when 'D' then 'Definition'
      when 'F' then 'Fill In The Blank'
      when 'A' then 'All Except'
      else value
    end as mapped
    from unnest(coalesce(p_question_types, '{}'::text[])) value
    where nullif(trim(value), '') is not null
  ) values_to_map;

  select coalesce(array_agg(distinct trim(value)), '{}'::text[])
  into normalized_tags
  from unnest(coalesce(p_tags, '{}'::text[])) value
  where nullif(trim(value), '') is not null;

  select coalesce(array_agg(distinct trim(value)), '{}'::text[])
  into normalized_partitions
  from unnest(coalesce(p_partition_keys, '{}'::text[])) value
  where nullif(trim(value), '') is not null;

  select coalesce(array_agg(distinct trim(value)), '{}'::text[])
  into normalized_indicators
  from unnest(coalesce(p_performance_indicators, '{}'::text[])) value
  where nullif(trim(value), '') is not null;

  return query
  with filtered as (
    select questions.*
    from public.questions
    where (p_lifecycle_state is null or questions.lifecycle_state = p_lifecycle_state)
      and (
        cardinality(normalized_partitions) = 0
        or questions.partition_key = any(normalized_partitions)
      )
      and (
        cardinality(normalized_indicators) = 0
        or questions.performance_indicator = any(normalized_indicators)
      )
      and (
        cardinality(normalized_difficulties) = 0
        or questions.difficulty = any(normalized_difficulties)
      )
      and (
        cardinality(normalized_question_types) = 0
        or questions.question_type = any(normalized_question_types)
      )
      and (
        cardinality(normalized_tags) = 0
        or questions.tags && normalized_tags
      )
      and (p_created_from is null or questions.created_at >= p_created_from)
      and (p_created_to is null or questions.created_at <= p_created_to)
      and (
        p_cursor_updated_at is null
        or (questions.updated_at, questions.id) < (p_cursor_updated_at, p_cursor_id)
      )
      and (
        normalized_search is null
        or lower(questions.question_text) like escaped_search escape '\'
        or lower(coalesce(questions.explanation, '')) like escaped_search escape '\'
        or lower(coalesce(questions.performance_indicator, '')) like escaped_search escape '\'
        or lower(questions.id::text) like escaped_search escape '\'
        or lower(coalesce(questions.question_hash, '')) like escaped_search escape '\'
        or exists (
          select 1
          from unnest(questions.tags) tag
          where lower(tag) like escaped_search escape '\'
        )
      )
    order by questions.updated_at desc, questions.id desc
    limit bounded_limit + 1
  ),
  numbered as (
    select filtered.*, row_number() over (order by filtered.updated_at desc, filtered.id desc) as page_row
    from filtered
  )
  select
    numbered.id,
    numbered.partition_key,
    numbered.performance_indicator,
    numbered.question_type,
    left(numbered.question_text, 360),
    numbered.difficulty,
    numbered.tags,
    numbered.lifecycle_state,
    numbered.created_at,
    numbered.updated_at,
    numbered.question_hash,
    exists (select 1 from numbered extra where extra.page_row > bounded_limit)
  from numbered
  where numbered.page_row <= bounded_limit
  order by numbered.updated_at desc, numbered.id desc;
end;
$$;

create or replace function public.set_question_lifecycle_state(
  p_question_id uuid,
  p_new_state text,
  p_reason text
)
returns table (
  question_id uuid,
  lifecycle_state text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  question_row public.questions%rowtype;
  actor_id uuid := auth.uid();
  previous_state text;
  clean_reason text := trim(coalesce(p_reason, ''));
begin
  if not public.is_admin() then
    raise exception 'Administrator or Owner access is required to change question lifecycle.';
  end if;

  if actor_id is null then
    raise exception 'Authenticated actor is required.';
  end if;

  if p_new_state not in ('Active', 'Retired') then
    raise exception 'Invalid lifecycle state.';
  end if;

  if length(clean_reason) < 5 then
    raise exception 'A lifecycle reason of at least 5 characters is required.';
  end if;

  select *
  into question_row
  from public.questions
  where id = p_question_id
  for update;

  if not found then
    raise exception 'Question was not found.';
  end if;

  previous_state := question_row.lifecycle_state;

  if previous_state = p_new_state then
    question_id := question_row.id;
    lifecycle_state := question_row.lifecycle_state;
    updated_at := question_row.updated_at;
    return next;
    return;
  end if;

  update public.questions
  set lifecycle_state = p_new_state
  where id = p_question_id
  returning * into question_row;

  insert into public.question_lifecycle_events (
    question_id,
    previous_state,
    new_state,
    actor_user_id,
    reason
  )
  values (
    p_question_id,
    previous_state,
    p_new_state,
    actor_id,
    clean_reason
  );

  insert into public.admin_audit_logs (
    actor_user_id,
    actor_email,
    action,
    resource_type,
    resource_id,
    reason,
    metadata
  )
  values (
    actor_id,
    (select email from auth.users where id = actor_id),
    case when p_new_state = 'Retired' then 'Question retired' else 'Question restored' end,
    'question',
    p_question_id::text,
    clean_reason,
    jsonb_build_object(
      'previous_state', previous_state,
      'new_state', p_new_state
    )
  );

  question_id := question_row.id;
  lifecycle_state := question_row.lifecycle_state;
  updated_at := question_row.updated_at;
  return next;
end;
$$;

create or replace function public.is_question_eligible_for_test_generation(p_question_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select questions.lifecycle_state = 'Active'
      from public.questions
      where questions.id = p_question_id
    ),
    false
  );
$$;

revoke execute on function public.escape_repository_like(text) from public;
revoke execute on function public.search_question_repository(
  integer,
  timestamptz,
  uuid,
  text,
  text,
  text[],
  text[],
  text[],
  text[],
  text[],
  timestamptz,
  timestamptz
) from public;
revoke execute on function public.set_question_lifecycle_state(uuid, text, text) from public;
revoke execute on function public.is_question_eligible_for_test_generation(uuid) from public;

grant execute on function public.search_question_repository(
  integer,
  timestamptz,
  uuid,
  text,
  text,
  text[],
  text[],
  text[],
  text[],
  text[],
  timestamptz,
  timestamptz
) to authenticated, service_role;
grant execute on function public.set_question_lifecycle_state(uuid, text, text)
to authenticated, service_role;
grant execute on function public.is_question_eligible_for_test_generation(uuid)
to authenticated, service_role;

grant select on public.question_lifecycle_events to authenticated;
grant all privileges on public.question_lifecycle_events to service_role;
