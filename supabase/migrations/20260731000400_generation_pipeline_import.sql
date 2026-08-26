-- Milestone 5: generation pipeline import foundation.
-- This migration preserves the existing Make -> OpenAI Batch -> Supabase shape
-- while adding JSONB queue partition metadata, queue-id based imports, durable
-- idempotency, and staff-only pipeline visibility.

alter table public.generation_queue_v3
add column if not exists partition_keys jsonb;

update public.generation_queue_v3
set partition_keys = jsonb_build_array(partition_key)
where partition_keys is null;

alter table public.generation_queue_v3
alter column partition_keys set default '[]'::jsonb,
alter column partition_keys set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'generation_queue_v3_partition_keys_array_check'
      and conrelid = 'public.generation_queue_v3'::regclass
  ) then
    alter table public.generation_queue_v3
    add constraint generation_queue_v3_partition_keys_array_check
    check (jsonb_typeof(partition_keys) = 'array' and jsonb_array_length(partition_keys) > 0);
  end if;
end;
$$;

create or replace function public.set_generation_queue_partition_keys()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.partition_keys is null
     or jsonb_typeof(new.partition_keys) <> 'array'
     or jsonb_array_length(new.partition_keys) = 0 then
    new.partition_keys := jsonb_build_array(new.partition_key);
  end if;

  return new;
end;
$$;

drop trigger if exists generation_queue_v3_set_partition_keys on public.generation_queue_v3;
create trigger generation_queue_v3_set_partition_keys
before insert or update of partition_key, partition_keys on public.generation_queue_v3
for each row execute function public.set_generation_queue_partition_keys();

alter table public.generated_question_candidates
add column if not exists import_identity text;

create unique index if not exists generated_question_candidates_import_identity_key
on public.generated_question_candidates(import_identity);

create table if not exists public.generation_import_receipts (
  id uuid primary key default gen_random_uuid(),
  batch_job_id uuid references public.deca_batch_jobs(id) on delete cascade,
  queue_id uuid not null references public.generation_queue_v3(id) on delete cascade,
  import_identity text not null,
  source_custom_id text not null,
  imported_count integer not null default 0 check (imported_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  skipped_count integer not null default 0 check (skipped_count >= 0),
  status text not null default 'Imported'
    check (status in ('Imported', 'Skipped Duplicate', 'Failed', 'Partial')),
  error_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(import_identity)
);

comment on table public.generation_import_receipts is
  'Durable idempotency and per-response accounting for OpenAI batch import results.';

create trigger generation_import_receipts_set_updated_at
before update on public.generation_import_receipts
for each row execute function public.set_updated_at();

alter table public.generation_import_receipts enable row level security;

create policy generation_import_receipts_staff_select
on public.generation_import_receipts
for select
to authenticated
using (public.is_admin());

create index if not exists generation_queue_v3_partition_keys_idx
on public.generation_queue_v3 using gin(partition_keys);

create index if not exists generation_import_receipts_batch_idx
on public.generation_import_receipts(batch_job_id, created_at desc);

create or replace function public.normalize_generated_question_type(p_value text)
returns text
language sql
immutable
as $$
  select case lower(trim(coalesce(p_value, '')))
    when 's' then 'S'
    when 'scenario' then 'S'
    when 'scenario question' then 'S'
    when 'd' then 'D'
    when 'definition' then 'D'
    when 'definition question' then 'D'
    when 'f' then 'F'
    when 'fill' then 'F'
    when 'fill in the blank' then 'F'
    when 'fill-in-the-blank' then 'F'
    when 'fill in blank' then 'F'
    when 'a' then 'A'
    when 'all except' then 'A'
    when 'all-except' then 'A'
    when 'except' then 'A'
    else null
  end;
$$;

create or replace function public.generated_question_type_label(p_value text)
returns text
language sql
immutable
as $$
  select case public.normalize_generated_question_type(p_value)
    when 'S' then 'Scenario'
    when 'D' then 'Definition'
    when 'F' then 'Fill In The Blank'
    when 'A' then 'All Except'
    else null
  end;
$$;

create or replace function public.normalize_generated_difficulty(p_value text)
returns text
language sql
immutable
as $$
  select case lower(trim(coalesce(p_value, '')))
    when 'e' then 'E'
    when 'easy' then 'E'
    when 'm' then 'M'
    when 'medium' then 'M'
    when 'h' then 'H'
    when 'hard' then 'H'
    else null
  end;
$$;

create or replace function public.generated_difficulty_label(p_value text)
returns text
language sql
immutable
as $$
  select case public.normalize_generated_difficulty(p_value)
    when 'E' then 'Easy'
    when 'M' then 'Medium'
    when 'H' then 'Hard'
    else null
  end;
$$;

create or replace function public.recalculate_generation_queue_needed(
  p_target_per_type integer default 20
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_count integer := 0;
begin
  with active_counts as (
    select
      queue.id as queue_id,
      count(*) filter (
        where public.normalize_generated_question_type(questions.question_type) = 'S'
      )::integer as scenario_count,
      count(*) filter (
        where public.normalize_generated_question_type(questions.question_type) = 'D'
      )::integer as definition_count,
      count(*) filter (
        where public.normalize_generated_question_type(questions.question_type) = 'F'
      )::integer as fill_count,
      count(*) filter (
        where public.normalize_generated_question_type(questions.question_type) = 'A'
      )::integer as all_except_count
    from public.generation_queue_v3 queue
    left join public.questions questions
      on questions.performance_indicator = coalesce(queue.performance_indicator, queue.indicator_code)
      and questions.lifecycle_state = 'Active'
    group by queue.id
  ),
  updated as (
    update public.generation_queue_v3 queue
    set scenario_needed = greatest(0, p_target_per_type - active_counts.scenario_count),
        definition_needed = greatest(0, p_target_per_type - active_counts.definition_count),
        fill_needed = greatest(0, p_target_per_type - active_counts.fill_count),
        all_except_needed = greatest(0, p_target_per_type - active_counts.all_except_count),
        status = case
          when greatest(0, p_target_per_type - active_counts.scenario_count)
             + greatest(0, p_target_per_type - active_counts.definition_count)
             + greatest(0, p_target_per_type - active_counts.fill_count)
             + greatest(0, p_target_per_type - active_counts.all_except_count) = 0 then 'complete'
          when queue.status = 'complete' then 'queued'
          else queue.status
        end
    from active_counts
    where queue.id = active_counts.queue_id
    returning queue.id
  )
  select count(*)::integer into changed_count from updated;

  return changed_count;
end;
$$;

create or replace function public.build_deca_batch_jsonl(limit_count integer default 250)
returns table(batch_job_id uuid, row_count integer, jsonl text)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_batch_id uuid;
  selected_count integer := 0;
  jsonl_payload text;
begin
  if exists (
    select 1
    from public.deca_batch_jobs
    where status in ('building', 'built', 'validating', 'in_progress', 'finalizing')
  ) then
    return query
    select null::uuid, 0, null::text;
    return;
  end if;

  insert into public.deca_batch_jobs(status, metadata)
  values (
    'building',
    jsonb_build_object(
      'limit_count', limit_count,
      'custom_id_strategy', 'generation_queue_v3.id',
      'target_per_type', 20
    )
  )
  returning id into new_batch_id;

  with selected as (
    select queue.*
    from public.generation_queue_v3 queue
    where queue.status = 'queued'
      and (
        queue.scenario_needed
        + queue.definition_needed
        + queue.fill_needed
        + queue.all_except_needed
      ) > 0
    order by queue.priority asc, queue.created_at asc, queue.id asc
    limit least(greatest(limit_count, 0), 500)
    for update skip locked
  ),
  locked as (
    update public.generation_queue_v3 queue
    set status = 'locked',
        locked_by_batch_id = new_batch_id,
        locked_at = now()
    from selected
    where queue.id = selected.id
    returning queue.*
  ),
  lines as (
    select jsonb_build_object(
      'custom_id', locked.id::text,
      'method', 'POST',
      'url', '/v1/responses',
      'body', jsonb_build_object(
        'model', 'gpt-4.1-mini',
        'metadata', jsonb_build_object(
          'queue_id', locked.id::text,
          'indicator_code', locked.indicator_code
        ),
        'input', concat(
          'Generate DECA practice questions for performance indicator ',
          locked.indicator_code,
          '. Queue ID: ',
          locked.id,
          '. Category: ',
          locked.category,
          '. Partition keys JSON: ',
          locked.partition_keys::text,
          '. Needed counts S/D/F/A: ',
          locked.scenario_needed,
          '/',
          locked.definition_needed,
          '/',
          locked.fill_needed,
          '/',
          locked.all_except_needed,
          '. Return only valid JSON: an array of objects with t, q, o, a, e, d fields. ',
          'Use t values only S, D, F, or A. Use d values only E, M, or H. ',
          coalesce(locked.prompt_context, '')
        )
      )
    )::text as line
    from locked
  )
  select count(*)::integer, string_agg(lines.line, E'\n')
  into selected_count, jsonl_payload
  from lines;

  update public.deca_batch_jobs
  set row_count = coalesce(selected_count, 0),
      status = case when coalesce(selected_count, 0) > 0 then 'built' else 'completed' end,
      completed_at = case when coalesce(selected_count, 0) > 0 then null else now() end,
      metadata = metadata || jsonb_build_object('jsonl_line_count', coalesce(selected_count, 0))
  where id = new_batch_id;

  batch_job_id := new_batch_id;
  row_count := coalesce(selected_count, 0);
  jsonl := jsonl_payload;
  return next;
end;
$$;

create or replace function public.insert_generated_questions(
  p_queue_id uuid,
  p_questions jsonb,
  p_import_identity text default null
)
returns table(imported_count integer, failed_count integer, skipped_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  queue_row public.generation_queue_v3%rowtype;
  active_batch_id uuid;
  q jsonb;
  option_item jsonb;
  normalized_options jsonb;
  answer_letter text;
  difficulty_value text;
  question_type_value text;
  type_code text;
  scenario_count integer := 0;
  definition_count integer := 0;
  fill_count integer := 0;
  all_except_count integer := 0;
  valid_count integer := 0;
  skipped_existing integer := 0;
  receipt_identity text := nullif(trim(coalesce(p_import_identity, '')), '');
  candidate_identity text;
begin
  select *
  into queue_row
  from public.generation_queue_v3
  where id = p_queue_id
  for update;

  if not found then
    raise exception 'No generation_queue_v3 row found for queue id %', p_queue_id;
  end if;

  if jsonb_typeof(p_questions) <> 'array' then
    raise exception 'p_questions must be a JSONB array';
  end if;

  active_batch_id := queue_row.locked_by_batch_id;
  receipt_identity := coalesce(
    receipt_identity,
    concat(coalesce(active_batch_id::text, 'manual'), ':', p_queue_id::text, ':', encode(extensions.digest(p_questions::text, 'sha256'), 'hex'))
  );

  if exists (
    select 1
    from public.generation_import_receipts
    where import_identity = receipt_identity
  ) then
    imported_count := 0;
    failed_count := 0;
    skipped_count := jsonb_array_length(p_questions);
    return next;
    return;
  end if;

  for q in select * from jsonb_array_elements(p_questions)
  loop
    if not (q ? 't' and q ? 'q' and q ? 'o' and q ? 'a' and q ? 'e' and q ? 'd') then
      raise exception 'Question missing required fields: %', q;
    end if;

    type_code := public.normalize_generated_question_type(q->>'t');
    if type_code is null then
      raise exception 'Invalid question type: %', q->>'t';
    end if;

    if public.normalize_generated_difficulty(q->>'d') is null then
      raise exception 'Invalid difficulty: %', q->>'d';
    end if;

    if length(trim(q->>'q')) = 0 or length(trim(q->>'e')) = 0 then
      raise exception 'Question and explanation are required: %', q;
    end if;

    if jsonb_typeof(q->'o') <> 'array' or jsonb_array_length(q->'o') <> 4 then
      raise exception 'Options must be an array of 4 items: %', q;
    end if;

    for option_item in select * from jsonb_array_elements(q->'o')
    loop
      if jsonb_typeof(option_item) = 'string' and length(trim(option_item #>> '{}')) = 0 then
        raise exception 'Options must be non-empty: %', q;
      end if;
      if jsonb_typeof(option_item) = 'object' and length(trim(coalesce(option_item->>'text', ''))) = 0 then
        raise exception 'Options must be non-empty: %', q;
      end if;
    end loop;

    if (q->>'a') ~ '^[0-3]$' then
      answer_letter := substr('ABCD', (q->>'a')::integer + 1, 1);
    elsif q->>'a' in ('A', 'B', 'C', 'D') then
      answer_letter := q->>'a';
    elsif q->>'a' in ('optionA', 'optionB', 'optionC', 'optionD') then
      answer_letter := substr(q->>'a', 7, 1);
    else
      raise exception 'Correct answer must be 0-3, A-D, or optionA-optionD: %', q->>'a';
    end if;

    if type_code = 'S' then
      scenario_count := scenario_count + 1;
    elsif type_code = 'D' then
      definition_count := definition_count + 1;
    elsif type_code = 'F' then
      fill_count := fill_count + 1;
    elsif type_code = 'A' then
      all_except_count := all_except_count + 1;
    end if;
  end loop;

  if scenario_count > queue_row.scenario_needed
     or definition_count > queue_row.definition_needed
     or fill_count > queue_row.fill_needed
     or all_except_count > queue_row.all_except_needed then
    raise exception 'Generated counts exceed needed counts. Got S:% D:% F:% A:%. Expected max S:% D:% F:% A:%',
      scenario_count, definition_count, fill_count, all_except_count,
      queue_row.scenario_needed, queue_row.definition_needed,
      queue_row.fill_needed, queue_row.all_except_needed;
  end if;

  for q in select * from jsonb_array_elements(p_questions)
  loop
    normalized_options := '[]'::jsonb;
    for option_item in select * from jsonb_array_elements(q->'o')
    loop
      normalized_options := normalized_options || jsonb_build_array(
        case
          when jsonb_typeof(option_item) = 'object' then option_item
          else jsonb_build_object('id', substr('ABCD', jsonb_array_length(normalized_options) + 1, 1), 'text', option_item #>> '{}')
        end
      );
    end loop;

    answer_letter := case
      when (q->>'a') ~ '^[0-3]$' then substr('ABCD', (q->>'a')::integer + 1, 1)
      when q->>'a' in ('optionA', 'optionB', 'optionC', 'optionD') then substr(q->>'a', 7, 1)
      else q->>'a'
    end;

    type_code := public.normalize_generated_question_type(q->>'t');
    question_type_value := public.generated_question_type_label(type_code);
    difficulty_value := public.generated_difficulty_label(q->>'d');
    candidate_identity := concat(receipt_identity, ':', valid_count + skipped_existing + 1);

    insert into public.generated_question_candidates (
      batch_job_id,
      source_custom_id,
      import_identity,
      performance_indicator,
      partition_keys,
      category,
      question_type,
      question_text,
      options,
      correct_option_id,
      explanation,
      difficulty,
      tags,
      question_hash,
      validation_status,
      validation_errors,
      raw_response
    )
    values (
      active_batch_id,
      p_queue_id::text,
      candidate_identity,
      coalesce(queue_row.performance_indicator, queue_row.indicator_code),
      queue_row.partition_keys,
      queue_row.category,
      question_type_value,
      q->>'q',
      normalized_options,
      answer_letter,
      q->>'e',
      difficulty_value,
      array[queue_row.category],
      encode(extensions.digest(lower(trim(q->>'q')), 'sha256'), 'hex'),
      'Valid',
      '{}',
      q
    )
    on conflict (import_identity) do nothing;

    if found then
      valid_count := valid_count + 1;
    else
      skipped_existing := skipped_existing + 1;
    end if;
  end loop;

  update public.generation_queue_v3
  set
    scenario_needed = greatest(0, scenario_needed - scenario_count),
    definition_needed = greatest(0, definition_needed - definition_count),
    fill_needed = greatest(0, fill_needed - fill_count),
    all_except_needed = greatest(0, all_except_needed - all_except_count),
    status = case
      when greatest(0, scenario_needed - scenario_count)
         + greatest(0, definition_needed - definition_count)
         + greatest(0, fill_needed - fill_count)
         + greatest(0, all_except_needed - all_except_count) = 0 then 'complete'
      else 'queued'
    end,
    locked_by_batch_id = null,
    locked_at = null,
    last_error = null
  where id = queue_row.id;

  insert into public.generation_import_receipts (
    batch_job_id,
    queue_id,
    import_identity,
    source_custom_id,
    imported_count,
    failed_count,
    skipped_count,
    status
  )
  values (
    active_batch_id,
    p_queue_id,
    receipt_identity,
    p_queue_id::text,
    valid_count,
    0,
    skipped_existing,
    case when skipped_existing > 0 then 'Partial' else 'Imported' end
  );

  if active_batch_id is not null then
    update public.deca_batch_jobs as batch
    set imported_count = batch.imported_count + valid_count,
        import_offset = batch.import_offset + 1,
        metadata = batch.metadata || jsonb_build_object(
          'last_import_identity', receipt_identity,
          'last_queue_id', p_queue_id
        )
    where batch.id = active_batch_id;
  end if;

  imported_count := valid_count;
  failed_count := 0;
  skipped_count := skipped_existing;
  return next;
end;
$$;

create or replace function public.insert_generated_questions(
  p_indicator text,
  p_questions jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  queue_id uuid;
begin
  select id
  into queue_id
  from public.generation_queue_v3
  where indicator_code = p_indicator;

  if queue_id is null then
    raise exception 'No generation_queue_v3 row found for indicator %', p_indicator;
  end if;

  perform *
  from public.insert_generated_questions(queue_id, p_questions, null);
end;
$$;

create or replace function public.search_generation_pipeline(
  p_page_size integer default 25,
  p_cursor_updated_at timestamptz default null,
  p_cursor_id uuid default null,
  p_status text default null,
  p_category text default null,
  p_search text default null,
  p_batch_job_id uuid default null,
  p_has_errors boolean default null
)
returns table (
  queue_id uuid,
  indicator_code text,
  performance_indicator text,
  category text,
  partition_key text,
  partition_keys jsonb,
  queue_status text,
  scenario_needed integer,
  definition_needed integer,
  fill_needed integer,
  all_except_needed integer,
  priority integer,
  locked_by_batch_id uuid,
  queue_last_error text,
  queue_created_at timestamptz,
  queue_updated_at timestamptz,
  batch_status text,
  openai_batch_id text,
  input_file_id text,
  output_file_id text,
  row_count integer,
  imported_count integer,
  failed_count integer,
  import_offset integer,
  batch_error text,
  has_next_page boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_limit integer := coalesce(p_page_size, 25);
  bounded_limit integer;
  clean_search text := nullif(trim(coalesce(p_search, '')), '');
begin
  if not public.is_admin() then
    raise exception 'Administrator or Owner access is required for generation pipeline status.';
  end if;

  if requested_limit < 1 then
    raise exception 'Page size must be at least 1.';
  end if;

  bounded_limit := least(requested_limit, 100);

  if (p_cursor_updated_at is null) <> (p_cursor_id is null) then
    raise exception 'Both cursor timestamp and cursor queue id are required.';
  end if;

  return query
  with filtered as (
    select
      queue.*,
      batch.openai_batch_id,
      batch.input_file_id,
      batch.output_file_id,
      batch.row_count,
      batch.status as batch_status,
      batch.created_at as submitted_at,
      batch.imported_count,
      batch.failed_count,
      batch.import_offset,
      batch.error as batch_error
    from public.generation_queue_v3 queue
    left join public.deca_batch_jobs batch on batch.id = queue.locked_by_batch_id
    where (p_status is null or queue.status = p_status)
      and (p_category is null or queue.category = p_category)
      and (p_batch_job_id is null or queue.locked_by_batch_id = p_batch_job_id)
      and (
        clean_search is null
        or queue.id::text = clean_search
        or queue.locked_by_batch_id::text = clean_search
        or queue.indicator_code ilike '%' || public.escape_repository_like(clean_search) || '%' escape '\'
        or coalesce(queue.performance_indicator, '') ilike '%' || public.escape_repository_like(clean_search) || '%' escape '\'
        or coalesce(batch.openai_batch_id, '') ilike '%' || public.escape_repository_like(clean_search) || '%' escape '\'
        or coalesce(queue.last_error, '') ilike '%' || public.escape_repository_like(clean_search) || '%' escape '\'
        or coalesce(batch.error, '') ilike '%' || public.escape_repository_like(clean_search) || '%' escape '\'
      )
      and (
        p_has_errors is null
        or (
          p_has_errors
          and (queue.last_error is not null or batch.error is not null or coalesce(batch.failed_count, 0) > 0)
        )
        or (
          not p_has_errors
          and queue.last_error is null and batch.error is null and coalesce(batch.failed_count, 0) = 0
        )
      )
      and (
        p_cursor_updated_at is null
        or (queue.updated_at, queue.id) < (p_cursor_updated_at, p_cursor_id)
      )
    order by queue.updated_at desc, queue.id desc
    limit bounded_limit + 1
  ),
  numbered as (
    select filtered.*, row_number() over (order by filtered.updated_at desc, filtered.id desc) as page_row
    from filtered
  )
  select
    numbered.id,
    numbered.indicator_code,
    numbered.performance_indicator,
    numbered.category,
    numbered.partition_key,
    numbered.partition_keys,
    numbered.status,
    numbered.scenario_needed,
    numbered.definition_needed,
    numbered.fill_needed,
    numbered.all_except_needed,
    numbered.priority,
    numbered.locked_by_batch_id,
    left(numbered.last_error, 500),
    numbered.created_at,
    numbered.updated_at,
    numbered.batch_status,
    numbered.openai_batch_id,
    numbered.input_file_id,
    numbered.output_file_id,
    coalesce(numbered.row_count, 0),
    coalesce(numbered.imported_count, 0),
    coalesce(numbered.failed_count, 0),
    coalesce(numbered.import_offset, 0),
    left(numbered.batch_error, 500),
    exists (select 1 from numbered extra where extra.page_row > bounded_limit)
  from numbered
  where numbered.page_row <= bounded_limit
  order by numbered.updated_at desc, numbered.id desc;
end;
$$;

revoke execute on function public.normalize_generated_question_type(text) from public;
revoke execute on function public.generated_question_type_label(text) from public;
revoke execute on function public.normalize_generated_difficulty(text) from public;
revoke execute on function public.generated_difficulty_label(text) from public;
revoke execute on function public.set_generation_queue_partition_keys() from public;
revoke execute on function public.recalculate_generation_queue_needed(integer) from public;
revoke execute on function public.insert_generated_questions(uuid, jsonb, text) from public;
revoke execute on function public.search_generation_pipeline(integer, timestamptz, uuid, text, text, text, uuid, boolean) from public;

grant execute on function public.normalize_generated_question_type(text) to service_role;
grant execute on function public.generated_question_type_label(text) to service_role;
grant execute on function public.normalize_generated_difficulty(text) to service_role;
grant execute on function public.generated_difficulty_label(text) to service_role;
grant execute on function public.recalculate_generation_queue_needed(integer) to service_role;
grant execute on function public.insert_generated_questions(uuid, jsonb, text) to service_role;
grant execute on function public.search_generation_pipeline(integer, timestamptz, uuid, text, text, text, uuid, boolean)
to authenticated, service_role;

grant select on public.generation_import_receipts to authenticated;
grant all privileges on public.generation_import_receipts to service_role;
