-- Milestone 6: deterministic Test IDs and persisted test definitions.
-- Existing 12-character test_ids.id values remain the public compatibility key.
-- definition_id is the internal identity used for ordered question relationships.

alter table public.test_ids
add column if not exists definition_id uuid default gen_random_uuid(),
add column if not exists canonical_seed text,
add column if not exists algorithm_version text,
add column if not exists eligibility_rule_version text,
add column if not exists generation_status text default 'Legacy',
add column if not exists selected_question_count integer default 0,
add column if not exists resolved_distribution jsonb default '{}'::jsonb,
add column if not exists eligibility_snapshot jsonb default '{}'::jsonb,
add column if not exists failure_metadata jsonb default '{}'::jsonb,
add column if not exists idempotency_key text,
add column if not exists request_hash text,
add column if not exists completed_at timestamptz,
add column if not exists retired_at timestamptz;

update public.test_ids
set definition_id = gen_random_uuid()
where definition_id is null;

alter table public.test_ids
alter column definition_id set default gen_random_uuid(),
alter column definition_id set not null,
alter column selected_question_count set default 0,
alter column selected_question_count set not null,
alter column resolved_distribution set default '{}'::jsonb,
alter column resolved_distribution set not null,
alter column eligibility_snapshot set default '{}'::jsonb,
alter column eligibility_snapshot set not null,
alter column failure_metadata set default '{}'::jsonb,
alter column failure_metadata set not null;

create unique index if not exists test_ids_definition_id_key
on public.test_ids(definition_id);

create unique index if not exists test_ids_creator_idempotency_key
on public.test_ids(created_by, idempotency_key)
where created_by is not null and idempotency_key is not null;

create index if not exists test_ids_generation_status_idx
on public.test_ids(generation_status, created_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'test_ids_generation_status_check'
      and conrelid = 'public.test_ids'::regclass
  ) then
    alter table public.test_ids
    add constraint test_ids_generation_status_check
    check (generation_status in ('Legacy', 'Creating', 'Ready', 'Failed', 'Retired'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'test_ids_selected_question_count_check'
      and conrelid = 'public.test_ids'::regclass
  ) then
    alter table public.test_ids
    add constraint test_ids_selected_question_count_check
    check (selected_question_count between 0 and 250);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'test_ids_seed_length_check'
      and conrelid = 'public.test_ids'::regclass
  ) then
    alter table public.test_ids
    add constraint test_ids_seed_length_check
    check (canonical_seed is null or octet_length(canonical_seed) between 1 and 128);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'test_ids_idempotency_length_check'
      and conrelid = 'public.test_ids'::regclass
  ) then
    alter table public.test_ids
    add constraint test_ids_idempotency_length_check
    check (idempotency_key is null or length(idempotency_key) between 1 and 128);
  end if;
end;
$$;

create table public.test_definition_questions (
  test_definition_id uuid not null references public.test_ids(definition_id) on delete restrict,
  question_id uuid not null references public.questions(id) on delete restrict,
  position integer not null check (position between 1 and 250),
  stratum_id text not null,
  content_hash text not null,
  question_updated_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (test_definition_id, position),
  unique (test_definition_id, question_id)
);

comment on table public.test_definition_questions is
  'Immutable ordered question membership for generated test definitions. Answer keys remain on questions and are not returned by launch RPCs.';

create index test_definition_questions_question_idx
on public.test_definition_questions(question_id, test_definition_id);

alter table public.test_definition_questions enable row level security;

create or replace function public.generate_test_share_code()
returns text
language plpgsql
volatile
set search_path = public, extensions
as $$
declare
  alphabet constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  random_bytes bytea := extensions.gen_random_bytes(12);
  result text := '';
  index_value integer;
begin
  for index_value in 0..11 loop
    result := result || substr(alphabet, (get_byte(random_bytes, index_value) % 36) + 1, 1);
  end loop;

  return result;
end;
$$;

create or replace function public.normalize_test_seed(p_seed text)
returns text
language plpgsql
immutable
set search_path = public
as $$
begin
  if p_seed is null then
    return null;
  end if;

  if p_seed <> btrim(p_seed) then
    raise exception 'Seed cannot begin or end with whitespace.';
  end if;

  if octet_length(p_seed) < 1 or octet_length(p_seed) > 128 then
    raise exception 'Seed must contain between 1 and 128 UTF-8 bytes.';
  end if;

  return p_seed;
end;
$$;

create or replace function public.test_blueprint_text_array(
  p_value jsonb,
  p_field_name text
)
returns text[]
language plpgsql
immutable
set search_path = public
as $$
declare
  normalized text[];
begin
  if p_value is null then
    return '{}'::text[];
  end if;

  if jsonb_typeof(p_value) <> 'array' then
    raise exception 'Blueprint field % must be an array.', p_field_name;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_value) item
    where jsonb_typeof(item) <> 'string'
      or nullif(btrim(item #>> '{}'), '') is null
  ) then
    raise exception 'Blueprint field % must contain non-empty strings.', p_field_name;
  end if;

  select coalesce(array_agg(distinct btrim(item #>> '{}') order by btrim(item #>> '{}')), '{}'::text[])
  into normalized
  from jsonb_array_elements(p_value) item;

  return normalized;
end;
$$;

create or replace function public.normalize_test_question_types(p_values text[])
returns text[]
language plpgsql
immutable
set search_path = public
as $$
declare
  result text[];
begin
  if exists (
    select 1
    from unnest(coalesce(p_values, '{}'::text[])) value
    where lower(value) not in (
      's', 'scenario', 'scenario question',
      'd', 'definition', 'definition question',
      'f', 'fill in the blank', 'fill-in-the-blank',
      'a', 'all except', 'all-except'
    )
  ) then
    raise exception 'Blueprint contains an unknown question type.';
  end if;

  select coalesce(array_agg(distinct normalized order by normalized), '{}'::text[])
  into result
  from (
    select case
      when lower(value) in ('s', 'scenario', 'scenario question') then 'Scenario'
      when lower(value) in ('d', 'definition', 'definition question') then 'Definition'
      when lower(value) in ('f', 'fill in the blank', 'fill-in-the-blank') then 'Fill In The Blank'
      when lower(value) in ('a', 'all except', 'all-except') then 'All Except'
    end as normalized
    from unnest(coalesce(p_values, '{}'::text[])) value
  ) mapped;

  return result;
end;
$$;

create or replace function public.normalize_test_difficulties(p_values text[])
returns text[]
language plpgsql
immutable
set search_path = public
as $$
declare
  result text[];
begin
  if exists (
    select 1
    from unnest(coalesce(p_values, '{}'::text[])) value
    where lower(value) not in ('e', 'easy', 'm', 'medium', 'h', 'hard')
  ) then
    raise exception 'Blueprint contains an unknown difficulty.';
  end if;

  select coalesce(array_agg(distinct normalized order by normalized), '{}'::text[])
  into result
  from (
    select case
      when lower(value) in ('e', 'easy') then 'Easy'
      when lower(value) in ('m', 'medium') then 'Medium'
      when lower(value) in ('h', 'hard') then 'Hard'
    end as normalized
    from unnest(coalesce(p_values, '{}'::text[])) value
  ) mapped;

  return result;
end;
$$;

create or replace function public.canonicalize_test_blueprint(
  p_blueprint_id uuid,
  p_expected_version text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  blueprint_row public.blueprint_versions%rowtype;
  raw_stratum jsonb;
  canonical_strata jsonb := '[]'::jsonb;
  stratum_id text;
  stratum_count integer;
  stratum_priority integer;
  partitions text[];
  indicators text[];
  question_types text[];
  difficulties text[];
  tags text[];
  excluded_tags text[];
  total_count integer := 0;
  ordinal integer := 0;
begin
  select *
  into blueprint_row
  from public.blueprint_versions
  where id = p_blueprint_id;

  if not found then
    raise exception 'Blueprint was not found.';
  end if;

  if blueprint_row.status <> 'Active' then
    raise exception 'Only active blueprint versions can generate tests.';
  end if;

  if p_expected_version is not null and blueprint_row.version <> p_expected_version then
    raise exception 'Blueprint version changed. Refresh before generating.';
  end if;

  if blueprint_row.total_questions < 1 or blueprint_row.total_questions > 250 then
    raise exception 'Blueprint question count must be between 1 and 250.';
  end if;

  if jsonb_typeof(blueprint_row.distribution) <> 'object'
     or jsonb_typeof(blueprint_row.distribution -> 'strata') <> 'array'
     or jsonb_array_length(blueprint_row.distribution -> 'strata') = 0 then
    raise exception 'Blueprint distribution must contain a non-empty strata array.';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(blueprint_row.distribution) key
    where key not in ('schema_version', 'strata')
  ) then
    raise exception 'Blueprint distribution contains an unknown top-level field.';
  end if;

  if coalesce((blueprint_row.distribution ->> 'schema_version')::integer, 1) <> 1 then
    raise exception 'Unsupported blueprint schema version.';
  end if;

  for raw_stratum in
    select value
    from jsonb_array_elements(blueprint_row.distribution -> 'strata')
  loop
    ordinal := ordinal + 1;

    if jsonb_typeof(raw_stratum) <> 'object' then
      raise exception 'Every blueprint stratum must be an object.';
    end if;

    if exists (
      select 1
      from jsonb_object_keys(raw_stratum) key
      where key not in (
        'id', 'priority', 'count', 'partition_keys', 'performance_indicators',
        'question_types', 'difficulties', 'tags', 'excluded_tags'
      )
    ) then
      raise exception 'Blueprint stratum contains an unknown field.';
    end if;

    stratum_id := btrim(coalesce(raw_stratum ->> 'id', ''));
    if stratum_id !~ '^[a-z0-9][a-z0-9_-]{0,63}$' then
      raise exception 'Blueprint stratum id must use 1-64 lowercase letters, numbers, underscores, or hyphens.';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(canonical_strata) existing
      where existing ->> 'id' = stratum_id
    ) then
      raise exception 'Blueprint stratum ids must be unique.';
    end if;

    if jsonb_typeof(raw_stratum -> 'count') <> 'number'
       or (raw_stratum ->> 'count') !~ '^[0-9]+$' then
      raise exception 'Blueprint stratum % count must be a non-negative integer.', stratum_id;
    end if;
    stratum_count := (raw_stratum ->> 'count')::integer;
    if stratum_count < 1 or stratum_count > 250 then
      raise exception 'Blueprint stratum % count must be between 1 and 250.', stratum_id;
    end if;

    if raw_stratum ? 'priority' then
      if jsonb_typeof(raw_stratum -> 'priority') <> 'number'
         or (raw_stratum ->> 'priority') !~ '^[0-9]+$' then
        raise exception 'Blueprint stratum % priority must be a non-negative integer.', stratum_id;
      end if;
      stratum_priority := (raw_stratum ->> 'priority')::integer;
    else
      stratum_priority := ordinal;
    end if;

    if stratum_priority > 10000 then
      raise exception 'Blueprint stratum priority cannot exceed 10000.';
    end if;

    partitions := public.test_blueprint_text_array(raw_stratum -> 'partition_keys', 'partition_keys');
    if cardinality(partitions) = 0 then
      partitions := array[blueprint_row.category];
    end if;
    if exists (select 1 from unnest(partitions) value where value <> blueprint_row.category) then
      raise exception 'Every stratum partition key must match the blueprint category.';
    end if;

    indicators := public.test_blueprint_text_array(raw_stratum -> 'performance_indicators', 'performance_indicators');
    question_types := public.normalize_test_question_types(
      public.test_blueprint_text_array(raw_stratum -> 'question_types', 'question_types')
    );
    difficulties := public.normalize_test_difficulties(
      public.test_blueprint_text_array(raw_stratum -> 'difficulties', 'difficulties')
    );
    tags := public.test_blueprint_text_array(raw_stratum -> 'tags', 'tags');
    excluded_tags := public.test_blueprint_text_array(raw_stratum -> 'excluded_tags', 'excluded_tags');

    if tags && excluded_tags then
      raise exception 'Blueprint stratum % requires and excludes the same tag.', stratum_id;
    end if;

    total_count := total_count + stratum_count;
    canonical_strata := canonical_strata || jsonb_build_array(
      jsonb_build_object(
        'id', stratum_id,
        'priority', stratum_priority,
        'count', stratum_count,
        'partition_keys', to_jsonb(partitions),
        'performance_indicators', to_jsonb(indicators),
        'question_types', to_jsonb(question_types),
        'difficulties', to_jsonb(difficulties),
        'tags', to_jsonb(tags),
        'excluded_tags', to_jsonb(excluded_tags)
      )
    );
  end loop;

  if total_count <> blueprint_row.total_questions then
    raise exception 'Blueprint stratum counts (%) must equal total_questions (%).', total_count, blueprint_row.total_questions;
  end if;

  return jsonb_build_object(
    'schema_version', 1,
    'blueprint_id', blueprint_row.id,
    'blueprint_name', blueprint_row.blueprint_name,
    'blueprint_version', blueprint_row.version,
    'cluster', blueprint_row.cluster,
    'level', blueprint_row.level,
    'category', blueprint_row.category,
    'total_questions', blueprint_row.total_questions,
    'tag_semantics', 'AND',
    'allocation_policy', 'most_constrained_first_v1',
    'strata', canonical_strata
  );
end;
$$;

create or replace function public.generate_test_from_blueprint(
  p_blueprint_id uuid,
  p_expected_blueprint_version text,
  p_requested_count integer,
  p_seed text default null,
  p_idempotency_key text default null
)
returns table (
  success boolean,
  test_definition_id uuid,
  test_id text,
  generation_status text,
  requested_count integer,
  selected_count integer,
  canonical_seed text,
  algorithm_version text,
  blueprint_summary jsonb,
  shortage jsonb
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  canonical_blueprint jsonb;
  normalized_seed text;
  request_seed_marker text;
  clean_idempotency_key text := nullif(btrim(coalesce(p_idempotency_key, '')), '');
  request_fingerprint text;
  existing_test public.test_ids%rowtype;
  algorithm_name constant text := 'sha256-strata-v1';
  eligibility_version constant text := 'active-complete-v1';
  generated_code text;
  generated_definition_id uuid := gen_random_uuid();
  code_attempt integer;
  stratum record;
  selected_for_stratum integer;
  shortage_payload jsonb := '[]'::jsonb;
  resolved_payload jsonb;
  all_difficulties text[];
  all_tags text[];
  eligibility_updated_at timestamptz;
  total_eligible integer;
begin
  if actor_id is null then
    raise exception 'Authentication is required to generate a test.';
  end if;

  if not exists (
    select 1
    from public.profiles profile
    where profile.user_id = actor_id
      and (profile.suspended_until is null or profile.suspended_until < now())
  ) then
    raise exception 'An active profile is required to generate a test.';
  end if;

  if p_requested_count is null
     or p_requested_count < 1
     or p_requested_count > 250 then
    raise exception 'Requested question count must be an integer between 1 and 250.';
  end if;

  if clean_idempotency_key is not null and length(clean_idempotency_key) > 128 then
    raise exception 'Idempotency key cannot exceed 128 characters.';
  end if;

  canonical_blueprint := public.canonicalize_test_blueprint(
    p_blueprint_id,
    p_expected_blueprint_version
  );

  if p_requested_count <> (canonical_blueprint ->> 'total_questions')::integer then
    raise exception 'Requested count must equal the approved blueprint total for this milestone.';
  end if;

  normalized_seed := public.normalize_test_seed(p_seed);
  request_seed_marker := coalesce(normalized_seed, '<server-generated>');
  request_fingerprint := encode(
    extensions.digest(
      convert_to(
        canonical_blueprint::text || chr(31) || p_requested_count::text || chr(31) ||
        request_seed_marker || chr(31) || algorithm_name || chr(31) || eligibility_version,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  if clean_idempotency_key is not null then
    -- Serialize same-user retries before reading the unique idempotency record.
    perform pg_advisory_xact_lock(
      hashtextextended(actor_id::text || chr(31) || clean_idempotency_key, 0)
    );

    select *
    into existing_test
    from public.test_ids existing
    where existing.created_by = actor_id
      and existing.idempotency_key = clean_idempotency_key;

    if found then
      if existing_test.request_hash <> request_fingerprint then
        raise exception 'Idempotency key was already used for a different generation request.';
      end if;

      return query
      select
        existing_test.generation_status = 'Ready',
        existing_test.definition_id,
        existing_test.id,
        existing_test.generation_status,
        existing_test.question_count,
        existing_test.selected_question_count,
        existing_test.canonical_seed,
        existing_test.algorithm_version,
        existing_test.blueprint_snapshot,
        existing_test.failure_metadata;
      return;
    end if;
  end if;

  for code_attempt in 1..20 loop
    generated_code := public.generate_test_share_code();
    exit when not exists (select 1 from public.test_ids existing where existing.id = generated_code);
  end loop;

  if generated_code is null
     or exists (select 1 from public.test_ids existing where existing.id = generated_code) then
    raise exception 'Unable to allocate a unique Test ID.';
  end if;

  if normalized_seed is null then
    normalized_seed := generated_code;
  end if;

  drop table if exists pg_temp.milestone6_strata;
  drop table if exists pg_temp.milestone6_selection;

  create temporary table milestone6_strata (
    stratum_id text primary key,
    priority integer not null,
    requested integer not null,
    partition_keys text[] not null,
    performance_indicators text[] not null,
    question_types text[] not null,
    difficulties text[] not null,
    tags text[] not null,
    excluded_tags text[] not null,
    raw_available integer not null default 0
  ) on commit drop;

  create temporary table milestone6_selection (
    question_id uuid primary key,
    stratum_id text not null,
    selection_rank text not null
  ) on commit drop;

  insert into milestone6_strata (
    stratum_id,
    priority,
    requested,
    partition_keys,
    performance_indicators,
    question_types,
    difficulties,
    tags,
    excluded_tags
  )
  select
    item ->> 'id',
    (item ->> 'priority')::integer,
    (item ->> 'count')::integer,
    array(select jsonb_array_elements_text(item -> 'partition_keys')),
    array(select jsonb_array_elements_text(item -> 'performance_indicators')),
    array(select jsonb_array_elements_text(item -> 'question_types')),
    array(select jsonb_array_elements_text(item -> 'difficulties')),
    array(select jsonb_array_elements_text(item -> 'tags')),
    array(select jsonb_array_elements_text(item -> 'excluded_tags'))
  from jsonb_array_elements(canonical_blueprint -> 'strata') item;

  update milestone6_strata target
  set raw_available = inventory.available
  from (
    select
      candidate_stratum.stratum_id,
      count(question.id)::integer as available
    from milestone6_strata candidate_stratum
    left join public.questions question
      on question.lifecycle_state = 'Active'
      and nullif(btrim(question.question_text), '') is not null
      and jsonb_typeof(question.options) = 'array'
      and jsonb_array_length(question.options) = 4
      and question.correct_option_id in ('A', 'B', 'C', 'D')
      and question.difficulty in ('Easy', 'Medium', 'Hard')
      and (
        cardinality(candidate_stratum.partition_keys) = 0
        or question.partition_key = any(candidate_stratum.partition_keys)
      )
      and (
        cardinality(candidate_stratum.performance_indicators) = 0
        or question.performance_indicator = any(candidate_stratum.performance_indicators)
      )
      and (
        cardinality(candidate_stratum.question_types) = 0
        or question.question_type = any(candidate_stratum.question_types)
      )
      and (
        cardinality(candidate_stratum.difficulties) = 0
        or question.difficulty = any(candidate_stratum.difficulties)
      )
      and (
        cardinality(candidate_stratum.tags) = 0
        or question.tags @> candidate_stratum.tags
      )
      and (
        cardinality(candidate_stratum.excluded_tags) = 0
        or not question.tags && candidate_stratum.excluded_tags
      )
    group by candidate_stratum.stratum_id
  ) inventory
  where target.stratum_id = inventory.stratum_id;

  for stratum in
    select *
    from milestone6_strata
    order by raw_available asc, priority asc, stratum_id asc
  loop
    insert into milestone6_selection(question_id, stratum_id, selection_rank)
    select
      question.id,
      stratum.stratum_id,
      encode(
        extensions.digest(
          convert_to(
            algorithm_name || chr(31) || normalized_seed || chr(31) ||
            stratum.stratum_id || chr(31) || question.id::text,
            'UTF8'
          ),
          'sha256'
        ),
        'hex'
      )
    from public.questions question
    where question.lifecycle_state = 'Active'
      and nullif(btrim(question.question_text), '') is not null
      and jsonb_typeof(question.options) = 'array'
      and jsonb_array_length(question.options) = 4
      and question.correct_option_id in ('A', 'B', 'C', 'D')
      and question.difficulty in ('Easy', 'Medium', 'Hard')
      and not exists (
        select 1
        from milestone6_selection selected
        where selected.question_id = question.id
      )
      and (
        cardinality(stratum.partition_keys) = 0
        or question.partition_key = any(stratum.partition_keys)
      )
      and (
        cardinality(stratum.performance_indicators) = 0
        or question.performance_indicator = any(stratum.performance_indicators)
      )
      and (
        cardinality(stratum.question_types) = 0
        or question.question_type = any(stratum.question_types)
      )
      and (
        cardinality(stratum.difficulties) = 0
        or question.difficulty = any(stratum.difficulties)
      )
      and (
        cardinality(stratum.tags) = 0
        or question.tags @> stratum.tags
      )
      and (
        cardinality(stratum.excluded_tags) = 0
        or not question.tags && stratum.excluded_tags
      )
    order by
      encode(
        extensions.digest(
          convert_to(
            algorithm_name || chr(31) || normalized_seed || chr(31) ||
            stratum.stratum_id || chr(31) || question.id::text,
            'UTF8'
          ),
          'sha256'
        ),
        'hex'
      ),
      question.id
    limit stratum.requested;

    get diagnostics selected_for_stratum = row_count;

    if selected_for_stratum <> stratum.requested then
      shortage_payload := shortage_payload || jsonb_build_array(
        jsonb_build_object(
          'stratum_id', stratum.stratum_id,
          'requested', stratum.requested,
          'available', selected_for_stratum,
          'raw_available', stratum.raw_available,
          'constraints_overlap', stratum.raw_available >= stratum.requested,
          'guidance', 'Add eligible active questions or revise the approved blueprint.'
        )
      );
    end if;
  end loop;

  if jsonb_array_length(shortage_payload) > 0 then
    return query
    select
      false,
      null::uuid,
      null::text,
      'Failed'::text,
      p_requested_count,
      (select count(*)::integer from milestone6_selection),
      normalized_seed,
      algorithm_name,
      canonical_blueprint,
      jsonb_build_object(
        'requested_total', p_requested_count,
        'available_selected_total', (select count(*) from milestone6_selection),
        'unsatisfied_strata', shortage_payload
      );
    return;
  end if;

  select coalesce(array_agg(distinct difficulty order by difficulty), '{}'::text[])
  into all_difficulties
  from milestone6_strata,
  unnest(difficulties) difficulty;

  select coalesce(array_agg(distinct tag order by tag), '{}'::text[])
  into all_tags
  from milestone6_strata,
  unnest(tags) tag;

  select
    count(*)::integer,
    max(question.updated_at)
  into total_eligible, eligibility_updated_at
  from public.questions question
  where question.lifecycle_state = 'Active'
    and exists (
      select 1
      from milestone6_strata candidate_stratum
      where question.partition_key = any(candidate_stratum.partition_keys)
        and (
          cardinality(candidate_stratum.performance_indicators) = 0
          or question.performance_indicator = any(candidate_stratum.performance_indicators)
        )
        and (
          cardinality(candidate_stratum.question_types) = 0
          or question.question_type = any(candidate_stratum.question_types)
        )
        and (
          cardinality(candidate_stratum.difficulties) = 0
          or question.difficulty = any(candidate_stratum.difficulties)
        )
        and (cardinality(candidate_stratum.tags) = 0 or question.tags @> candidate_stratum.tags)
        and (
          cardinality(candidate_stratum.excluded_tags) = 0
          or not question.tags && candidate_stratum.excluded_tags
        )
    );

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'stratum_id', requested.stratum_id,
        'requested', requested.requested,
        'selected', coalesce(selected.selected, 0)
      )
      order by requested.priority, requested.stratum_id
    ),
    '[]'::jsonb
  )
  into resolved_payload
  from milestone6_strata requested
  left join (
    select stratum_id, count(*)::integer as selected
    from milestone6_selection
    group by stratum_id
  ) selected using (stratum_id);

  insert into public.test_ids (
    id,
    definition_id,
    mode,
    category,
    difficulties,
    topic_tags,
    question_count,
    pool_timestamp,
    created_by,
    blueprint_version_id,
    blueprint_snapshot,
    generation_metadata,
    canonical_seed,
    algorithm_version,
    eligibility_rule_version,
    generation_status,
    selected_question_count,
    resolved_distribution,
    eligibility_snapshot,
    failure_metadata,
    idempotency_key,
    request_hash
  )
  values (
    generated_code,
    generated_definition_id,
    'Test',
    canonical_blueprint ->> 'category',
    all_difficulties,
    all_tags,
    p_requested_count,
    now(),
    actor_id,
    p_blueprint_id,
    canonical_blueprint,
    jsonb_build_object(
      'selection_algorithm', algorithm_name,
      'eligibility_rule_version', eligibility_version,
      'answer_option_shuffling', false,
      'tag_semantics', 'AND',
      'allocation_policy', 'most_constrained_first_v1'
    ),
    normalized_seed,
    algorithm_name,
    eligibility_version,
    'Creating',
    0,
    '{}'::jsonb,
    jsonb_build_object(
      'eligible_question_count', total_eligible,
      'question_bank_updated_at', eligibility_updated_at,
      'captured_at', now()
    ),
    '{}'::jsonb,
    clean_idempotency_key,
    request_fingerprint
  );

  insert into public.test_definition_questions (
    test_definition_id,
    question_id,
    position,
    stratum_id,
    content_hash,
    question_updated_at
  )
  select
    generated_definition_id,
    selected.question_id,
    row_number() over (
      order by
        encode(
          extensions.digest(
            convert_to(
              algorithm_name || chr(31) || normalized_seed || chr(31) ||
              'final-order' || chr(31) || selected.question_id::text,
              'UTF8'
            ),
            'sha256'
          ),
          'hex'
        ),
        selected.question_id
    )::integer,
    selected.stratum_id,
    coalesce(
      question.question_hash,
      encode(
        extensions.digest(
          convert_to(
            jsonb_build_object(
              'question_text', question.question_text,
              'options', question.options,
              'correct_option_id', question.correct_option_id,
              'explanation', question.explanation,
              'difficulty', question.difficulty,
              'tags', question.tags
            )::text,
            'UTF8'
          ),
          'sha256'
        ),
        'hex'
      )
    ),
    question.updated_at
  from milestone6_selection selected
  join public.questions question on question.id = selected.question_id;

  update public.test_ids generated
  set generation_status = 'Ready',
      selected_question_count = p_requested_count,
      resolved_distribution = jsonb_build_object('strata', resolved_payload),
      completed_at = now()
  where generated.definition_id = generated_definition_id;

  return query
  select
    true,
    generated_definition_id,
    generated_code,
    'Ready'::text,
    p_requested_count,
    p_requested_count,
    normalized_seed,
    algorithm_name,
    canonical_blueprint,
    '{}'::jsonb;
end;
$$;

create or replace function public.get_test_id_preview(p_test_id text)
returns table (
  test_id text,
  category text,
  difficulties text[],
  topic_tags text[],
  original_question_count integer,
  creation_date timestamptz,
  blueprint_name text,
  blueprint_version text,
  generation_status text,
  updated_question_count integer,
  authentication_required_to_launch boolean
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    generated.id,
    generated.category,
    generated.difficulties,
    generated.topic_tags,
    generated.question_count,
    generated.created_at,
    generated.blueprint_snapshot ->> 'blueprint_name',
    generated.blueprint_snapshot ->> 'blueprint_version',
    generated.generation_status,
    count(*) filter (
      where question.updated_at > membership.question_updated_at
        or coalesce(
          question.question_hash,
          encode(
            extensions.digest(
              convert_to(
                jsonb_build_object(
                  'question_text', question.question_text,
                  'options', question.options,
                  'correct_option_id', question.correct_option_id,
                  'explanation', question.explanation,
                  'difficulty', question.difficulty,
                  'tags', question.tags
                )::text,
                'UTF8'
              ),
              'sha256'
            ),
            'hex'
          )
        ) <> membership.content_hash
    )::integer,
    true
  from public.test_ids generated
  join public.test_definition_questions membership
    on membership.test_definition_id = generated.definition_id
  join public.questions question on question.id = membership.question_id
  where generated.id = upper(btrim(p_test_id))
    and generated.generation_status = 'Ready'
  group by generated.id;
$$;

create or replace function public.get_generated_test_manifest(p_test_id text)
returns table (
  test_id text,
  test_definition_id uuid,
  question_position integer,
  question_id uuid,
  question_type text,
  question_text text,
  options jsonb,
  difficulty text,
  tags text[],
  performance_indicator text,
  updated_since_generation boolean
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to launch a Test ID.';
  end if;

  return query
  select
    generated.id,
    generated.definition_id,
    membership.position,
    question.id,
    question.question_type,
    question.question_text,
    question.options,
    question.difficulty,
    question.tags,
    question.performance_indicator,
    question.updated_at > membership.question_updated_at
      or coalesce(
        question.question_hash,
        encode(
          extensions.digest(
            convert_to(
              jsonb_build_object(
                'question_text', question.question_text,
                'options', question.options,
                'correct_option_id', question.correct_option_id,
                'explanation', question.explanation,
                'difficulty', question.difficulty,
                'tags', question.tags
              )::text,
              'UTF8'
            ),
            'sha256'
          ),
          'hex'
        )
      ) <> membership.content_hash
  from public.test_ids generated
  join public.test_definition_questions membership
    on membership.test_definition_id = generated.definition_id
  join public.questions question on question.id = membership.question_id
  where generated.id = upper(btrim(p_test_id))
    and generated.generation_status = 'Ready'
  order by membership.position;
end;
$$;

drop policy if exists test_ids_select_public on public.test_ids;
drop policy if exists test_ids_insert_authenticated on public.test_ids;

create policy test_ids_select_creator
on public.test_ids
for select
to authenticated
using (created_by = auth.uid());

create policy test_ids_select_team_recipient
on public.test_ids
for select
to authenticated
using (
  exists (
    select 1
    from public.team_assignments assignment
    join public.team_assignment_recipients recipient
      on recipient.assignment_id = assignment.id
    join public.team_memberships membership
      on membership.id = recipient.membership_id
    where assignment.assignment_type = 'test_id'
      and assignment.test_id = test_ids.id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
  )
);

create policy test_definition_questions_creator_select
on public.test_definition_questions
for select
to authenticated
using (
  exists (
    select 1
    from public.test_ids generated
    where generated.definition_id = test_definition_questions.test_definition_id
      and generated.created_by = auth.uid()
  )
);

revoke all on public.test_ids from anon, authenticated;
grant select on public.test_ids to authenticated;

revoke all on public.test_definition_questions from anon, authenticated;
grant select on public.test_definition_questions to authenticated;

revoke execute on function public.generate_test_share_code() from public;
revoke execute on function public.normalize_test_seed(text) from public;
revoke execute on function public.test_blueprint_text_array(jsonb, text) from public;
revoke execute on function public.normalize_test_question_types(text[]) from public;
revoke execute on function public.normalize_test_difficulties(text[]) from public;
revoke execute on function public.canonicalize_test_blueprint(uuid, text) from public;
revoke execute on function public.generate_test_from_blueprint(uuid, text, integer, text, text) from public;
revoke execute on function public.get_test_id_preview(text) from public;
revoke execute on function public.get_generated_test_manifest(text) from public;

grant execute on function public.canonicalize_test_blueprint(uuid, text)
to authenticated, service_role;
grant execute on function public.generate_test_from_blueprint(uuid, text, integer, text, text)
to authenticated, service_role;
grant execute on function public.get_test_id_preview(text)
to anon, authenticated, service_role;
grant execute on function public.get_generated_test_manifest(text)
to authenticated, service_role;

comment on function public.generate_test_from_blueprint(uuid, text, integer, text, text) is
  'Authenticated transactional test assembly. Uses SHA-256 UTF-8 ranking, exact blueprint strata, and durable idempotency.';

comment on function public.get_test_id_preview(text) is
  'Public exact-code preview. Returns bounded metadata and update-warning count without question IDs or answers.';

comment on function public.get_generated_test_manifest(text) is
  'Authenticated exact-code launch manifest. Returns persisted order and current question content without answer keys or explanations.';
