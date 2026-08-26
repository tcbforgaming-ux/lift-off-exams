-- Existing question-generation pipeline contract.
-- Preserves Make Scheduler -> start-deca-batch Edge Function ->
-- build_deca_batch_jsonl() -> OpenAI Batch API -> import-deca-batch Edge
-- Function -> insert_generated_questions() -> generated_question_candidates.

create table public.generation_queue_v3 (
  id uuid primary key default gen_random_uuid(),
  partition_key text not null,
  category text not null,
  performance_indicator text,
  indicator_code text not null unique,
  prompt_context text,
  scenario_needed integer not null default 0 check (scenario_needed >= 0),
  definition_needed integer not null default 0 check (definition_needed >= 0),
  fill_needed integer not null default 0 check (fill_needed >= 0),
  all_except_needed integer not null default 0 check (all_except_needed >= 0),
  priority integer not null default 100,
  status text not null default 'queued'
    check (status in ('queued', 'locked', 'complete', 'paused', 'failed')),
  locked_by_batch_id uuid,
  locked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.generation_queue_v3 is
  'Server-managed queue used by the existing Make/OpenAI question generation pipeline.';

create index generation_queue_v3_priority_idx
on public.generation_queue_v3(status, priority, created_at);

create table public.deca_batch_jobs (
  id uuid primary key default gen_random_uuid(),
  openai_batch_id text unique,
  input_file_id text,
  output_file_id text,
  status text not null default 'building'
    check (status in (
      'building', 'built', 'validating', 'in_progress', 'finalizing',
      'completed', 'failed', 'cancelled', 'expired'
    )),
  row_count integer not null default 0 check (row_count >= 0),
  imported_count integer not null default 0 check (imported_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  import_offset integer not null default 0 check (import_offset >= 0),
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

comment on table public.deca_batch_jobs is
  'Server-only OpenAI batch job ledger. Import offsets and counters are preserved for resumable imports.';

create table public.generated_question_candidates (
  id uuid primary key default gen_random_uuid(),
  batch_job_id uuid references public.deca_batch_jobs(id) on delete set null,
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
  raw_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint generated_question_candidates_options_array_check
    check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) = 4)
);

comment on table public.generated_question_candidates is
  'Generated question review queue. Candidates require one admin or owner approval before publishing to questions.';

create index generated_question_candidates_review_idx
on public.generated_question_candidates(review_status, validation_status, created_at desc);

create index generated_question_candidates_hash_idx
on public.generated_question_candidates(question_hash);

create index generated_question_candidates_tags_idx
on public.generated_question_candidates using gin(tags);

create index generated_question_candidates_batch_idx
on public.generated_question_candidates(batch_job_id, created_at desc);

create index generated_question_candidates_category_idx
on public.generated_question_candidates(category, created_at desc);

create trigger generation_queue_v3_set_updated_at
before update on public.generation_queue_v3
for each row execute function public.set_updated_at();

create trigger deca_batch_jobs_set_updated_at
before update on public.deca_batch_jobs
for each row execute function public.set_updated_at();

create trigger generated_question_candidates_set_updated_at
before update on public.generated_question_candidates
for each row execute function public.set_updated_at();

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
  values ('building', jsonb_build_object('limit_count', limit_count))
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
    order by queue.priority asc, queue.created_at asc
    limit greatest(limit_count, 0)
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
      'custom_id', locked.indicator_code,
      'method', 'POST',
      'url', '/v1/responses',
      'body', jsonb_build_object(
        'model', 'gpt-4.1-mini',
        'input', concat(
          'Generate DECA practice questions for indicator ',
          locked.indicator_code,
          '. Category: ',
          locked.category,
          '. Partition key: ',
          locked.partition_key,
          '. Needed counts S/D/F/A: ',
          locked.scenario_needed,
          '/',
          locked.definition_needed,
          '/',
          locked.fill_needed,
          '/',
          locked.all_except_needed,
          '. Return only valid JSON with t, q, o, a, e, d fields. ',
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
      completed_at = case when coalesce(selected_count, 0) > 0 then null else now() end
  where id = new_batch_id;

  batch_job_id := new_batch_id;
  row_count := coalesce(selected_count, 0);
  jsonl := jsonl_payload;
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
  queue_row public.generation_queue_v3%rowtype;
  active_batch_id uuid;
  q jsonb;
  option_item jsonb;
  normalized_options jsonb;
  answer_letter text;
  difficulty_value text;
  question_type_value text;
  scenario_count integer := 0;
  definition_count integer := 0;
  fill_count integer := 0;
  all_except_count integer := 0;
begin
  select *
  into queue_row
  from public.generation_queue_v3
  where indicator_code = p_indicator
  for update;

  if not found then
    raise exception 'No generation_queue_v3 row found for indicator %', p_indicator;
  end if;

  if jsonb_typeof(p_questions) <> 'array' then
    raise exception 'p_questions must be a JSONB array';
  end if;

  active_batch_id := queue_row.locked_by_batch_id;

  for q in select * from jsonb_array_elements(p_questions)
  loop
    if not (q ? 't' and q ? 'q' and q ? 'o' and q ? 'a' and q ? 'e' and q ? 'd') then
      raise exception 'Question missing required fields: %', q;
    end if;

    if q->>'t' not in ('S', 'D', 'F', 'A') then
      raise exception 'Invalid question type: %', q->>'t';
    end if;

    if q->>'d' not in ('E', 'M', 'H', 'Easy', 'Medium', 'Hard') then
      raise exception 'Invalid difficulty: %', q->>'d';
    end if;

    if jsonb_typeof(q->'o') <> 'array' or jsonb_array_length(q->'o') <> 4 then
      raise exception 'Options must be an array of 4 items: %', q;
    end if;

    if (q->>'a') ~ '^[0-3]$' then
      answer_letter := substr('ABCD', (q->>'a')::integer + 1, 1);
    elsif q->>'a' in ('A', 'B', 'C', 'D') then
      answer_letter := q->>'a';
    elsif q->>'a' in ('optionA', 'optionB', 'optionC', 'optionD') then
      answer_letter := substr(q->>'a', 7, 1);
    else
      raise exception 'Correct answer must be 0-3, A-D, or optionA-optionD: %', q->>'a';
    end if;

    if q->>'t' = 'S' then
      scenario_count := scenario_count + 1;
    elsif q->>'t' = 'D' then
      definition_count := definition_count + 1;
    elsif q->>'t' = 'F' then
      fill_count := fill_count + 1;
    elsif q->>'t' = 'A' then
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

    difficulty_value := case q->>'d'
      when 'E' then 'Easy'
      when 'M' then 'Medium'
      when 'H' then 'Hard'
      else q->>'d'
    end;

    question_type_value := case q->>'t'
      when 'S' then 'Scenario'
      when 'D' then 'Definition'
      when 'F' then 'Fill In The Blank'
      when 'A' then 'All Except'
    end;

    insert into public.generated_question_candidates (
      batch_job_id,
      source_custom_id,
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
      p_indicator,
      coalesce(queue_row.performance_indicator, p_indicator),
      jsonb_build_array(queue_row.partition_key),
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
    on conflict do nothing;
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
    locked_at = null
  where id = queue_row.id;

  if active_batch_id is not null then
    update public.deca_batch_jobs
    set imported_count = imported_count + jsonb_array_length(p_questions),
        import_offset = import_offset + 1
    where id = active_batch_id;
  end if;
end;
$$;

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
begin
  if not public.is_admin() then
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
    select 1 from public.questions q where q.question_hash = v_candidate.question_hash
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
    lifecycle_state,
    question_hash
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
    'Active',
    v_candidate.question_hash
  )
  returning id into v_published_question_id;

  update public.generated_question_candidates
  set review_status = 'Published',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      published_question_id = v_published_question_id
  where id = p_candidate_id;

  return v_published_question_id;
end;
$$;

alter table public.generation_queue_v3 enable row level security;
alter table public.deca_batch_jobs enable row level security;
alter table public.generated_question_candidates enable row level security;
