-- Milestone 7: authoritative test sessions, answer persistence, scoring, and results.
-- Test definitions remain immutable. Session and result writes are available only
-- through the trusted RPCs defined in this migration.

create table public.test_sessions (
  id uuid primary key default gen_random_uuid(),
  test_definition_id uuid not null references public.test_ids(definition_id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'paused', 'submitted')),
  mode text not null,
  question_count integer not null check (question_count between 1 and 250),
  current_position integer not null default 1,
  version bigint not null default 1 check (version > 0),
  idempotency_key text not null check (length(idempotency_key) between 1 and 128),
  scoring_rule_version text not null default 'single-choice-v1',
  explanation_policy_version text not null default 'stripe-entitlement-v1',
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  paused_at timestamptz,
  resumed_at timestamptz,
  submitted_at timestamptz,
  accumulated_active_seconds integer not null default 0
    check (accumulated_active_seconds >= 0),
  active_period_started_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (current_position between 1 and question_count),
  check (
    (status = 'in_progress' and active_period_started_at is not null and submitted_at is null)
    or (status = 'paused' and active_period_started_at is null and submitted_at is null)
    or (status = 'submitted' and active_period_started_at is null and submitted_at is not null)
  ),
  unique (user_id, idempotency_key),
  unique (id, user_id, test_definition_id)
);

comment on table public.test_sessions is
  'Authoritative user-owned attempt state. Status changes and scoring are RPC-controlled.';

create unique index test_sessions_one_open_attempt_idx
on public.test_sessions(user_id, test_definition_id)
where status in ('in_progress', 'paused');

create index test_sessions_user_activity_idx
on public.test_sessions(user_id, last_activity_at desc, id desc);

create table public.test_session_questions (
  session_id uuid not null references public.test_sessions(id) on delete cascade,
  position integer not null check (position between 1 and 250),
  question_id uuid not null references public.questions(id) on delete restrict,
  question_type text not null,
  question_text text not null,
  options jsonb not null,
  difficulty text not null,
  tags text[] not null default '{}',
  content_hash_at_start text not null,
  question_updated_at_at_start timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (session_id, position),
  unique (session_id, question_id),
  check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) = 4)
);

comment on table public.test_session_questions is
  'Safe presentation snapshot preserving exact Test ID order without answer keys or explanations.';

create index test_session_questions_question_idx
on public.test_session_questions(session_id, question_id);

create table public.test_session_answers (
  session_id uuid not null,
  question_id uuid not null,
  selected_option_id text not null check (selected_option_id in ('A', 'B', 'C', 'D')),
  answer_version bigint not null default 1 check (answer_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (session_id, question_id),
  foreign key (session_id, question_id)
    references public.test_session_questions(session_id, question_id)
    on delete cascade
);

comment on table public.test_session_answers is
  'Current saved selections. Correctness is deliberately absent and calculated only during trusted submission.';

create table public.test_results (
  session_id uuid primary key,
  user_id uuid not null,
  test_definition_id uuid not null,
  total_questions integer not null check (total_questions between 1 and 250),
  answered_questions integer not null check (answered_questions >= 0),
  unanswered_questions integer not null check (unanswered_questions >= 0),
  correct_answers integer not null check (correct_answers >= 0),
  incorrect_answers integer not null check (incorrect_answers >= 0),
  raw_score integer not null check (raw_score >= 0),
  percentage numeric(5,2) not null check (percentage between 0 and 100),
  blueprint_version text,
  scoring_rule_version text not null,
  explanation_policy_version text not null,
  active_duration_seconds integer not null check (active_duration_seconds >= 0),
  submitted_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key (session_id, user_id, test_definition_id)
    references public.test_sessions(id, user_id, test_definition_id)
    on delete restrict,
  check (answered_questions + unanswered_questions = total_questions),
  check (correct_answers + incorrect_answers = total_questions),
  check (raw_score = correct_answers)
);

comment on table public.test_results is
  'Immutable authoritative result summary produced transactionally when a session is submitted.';

create index test_results_user_submitted_idx
on public.test_results(user_id, submitted_at desc, session_id desc);

create table public.test_result_items (
  session_id uuid not null references public.test_results(session_id) on delete restrict,
  position integer not null check (position between 1 and 250),
  question_id uuid not null references public.questions(id) on delete restrict,
  question_type text not null,
  question_text text not null,
  options jsonb not null,
  difficulty text not null,
  tags text[] not null default '{}',
  selected_option_id text check (selected_option_id in ('A', 'B', 'C', 'D')),
  correct_option_id text not null check (correct_option_id in ('A', 'B', 'C', 'D')),
  is_correct boolean not null,
  explanation_snapshot text,
  content_hash_at_submission text,
  created_at timestamptz not null default now(),
  primary key (session_id, position),
  unique (session_id, question_id),
  check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) = 4),
  check (is_correct = (selected_option_id is not null and selected_option_id = correct_option_id))
);

comment on table public.test_result_items is
  'Protected immutable submission snapshots. Explanation text is available only through the premium-gated RPC.';

alter table public.test_sessions enable row level security;
alter table public.test_session_questions enable row level security;
alter table public.test_session_answers enable row level security;
alter table public.test_results enable row level security;
alter table public.test_result_items enable row level security;

-- No client table policies are created. All browser access is through bounded,
-- ownership-checking RPCs. The service role retains operational access.
revoke all on public.test_sessions from anon, authenticated;
revoke all on public.test_session_questions from anon, authenticated;
revoke all on public.test_session_answers from anon, authenticated;
revoke all on public.test_results from anon, authenticated;
revoke all on public.test_result_items from anon, authenticated;

grant all privileges on public.test_sessions to service_role;
grant all privileges on public.test_session_questions to service_role;
grant all privileges on public.test_session_answers to service_role;
grant all privileges on public.test_results to service_role;
grant all privileges on public.test_result_items to service_role;

-- Retain the prototype tables for compatibility and data review, but remove the
-- unsafe ability for clients to author their own session state and scores.
revoke insert, update, delete on public.user_active_sessions from authenticated;
revoke insert, update, delete on public.user_test_history from authenticated;

comment on table public.user_active_sessions is
  'Deprecated prototype storage. Milestone 7 uses test_sessions and trusted RPCs.';
comment on table public.user_test_history is
  'Deprecated prototype score storage. Milestone 7 history is derived from authoritative sessions/results.';

create or replace function public.write_test_session_audit(
  p_action text,
  p_session_id uuid,
  p_test_id text,
  p_previous_state text,
  p_new_state text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  insert into public.admin_audit_logs (
    actor_user_id,
    action,
    resource_type,
    resource_id,
    reason,
    metadata
  )
  values (
    auth.uid(),
    p_action,
    'test_session',
    p_session_id::text,
    'Trusted test-session lifecycle event',
    jsonb_build_object(
      'test_id', p_test_id,
      'previous_state', p_previous_state,
      'new_state', p_new_state
    ) || coalesce(p_metadata, '{}'::jsonb)
  );
$$;

create or replace function public.start_test_session(
  p_test_id text,
  p_idempotency_key text
)
returns table (
  session_id uuid,
  test_id text,
  status text,
  session_version bigint,
  question_count integer,
  current_position integer,
  started_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  actor_id uuid := auth.uid();
  normalized_test_id text := upper(btrim(coalesce(p_test_id, '')));
  normalized_key text := btrim(coalesce(p_idempotency_key, ''));
  definition public.test_ids%rowtype;
  existing_session public.test_sessions%rowtype;
  created_session public.test_sessions%rowtype;
  member_count integer;
begin
  if actor_id is null then
    raise exception 'Authentication is required to start a test session.';
  end if;

  if normalized_test_id !~ '^[A-Z0-9]{12}$' then
    raise exception 'A valid 12-character Test ID is required.';
  end if;

  if length(normalized_key) < 1 or length(normalized_key) > 128 then
    raise exception 'Idempotency key must contain between 1 and 128 characters.';
  end if;

  select generated.*
  into definition
  from public.test_ids generated
  where generated.id = normalized_test_id
    and generated.generation_status = 'Ready';

  if not found then
    raise exception 'This Test ID is not ready for launch.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(actor_id::text || ':' || definition.definition_id::text, 0)
  );

  select session.*
  into existing_session
  from public.test_sessions session
  where session.user_id = actor_id
    and session.idempotency_key = normalized_key;

  if found then
    if existing_session.test_definition_id <> definition.definition_id then
      raise exception 'Idempotency key was already used for another test.';
    end if;

    return query
    select existing_session.id, definition.id, existing_session.status,
      existing_session.version, existing_session.question_count,
      existing_session.current_position, existing_session.started_at;
    return;
  end if;

  select session.*
  into existing_session
  from public.test_sessions session
  where session.user_id = actor_id
    and session.test_definition_id = definition.definition_id
    and session.status in ('in_progress', 'paused')
  order by session.created_at desc
  limit 1;

  if found then
    return query
    select existing_session.id, definition.id, existing_session.status,
      existing_session.version, existing_session.question_count,
      existing_session.current_position, existing_session.started_at;
    return;
  end if;

  select count(*)::integer
  into member_count
  from public.test_definition_questions membership
  where membership.test_definition_id = definition.definition_id;

  if member_count <> definition.question_count or member_count < 1 or member_count > 250 then
    raise exception 'The Test ID membership is incomplete.';
  end if;

  insert into public.test_sessions (
    test_definition_id,
    user_id,
    mode,
    question_count,
    idempotency_key
  )
  values (
    definition.definition_id,
    actor_id,
    definition.mode,
    member_count,
    normalized_key
  )
  returning * into created_session;

  insert into public.test_session_questions (
    session_id,
    position,
    question_id,
    question_type,
    question_text,
    options,
    difficulty,
    tags,
    content_hash_at_start,
    question_updated_at_at_start
  )
  select
    created_session.id,
    membership.position,
    question.id,
    question.question_type,
    question.question_text,
    question.options,
    question.difficulty,
    question.tags,
    membership.content_hash,
    question.updated_at
  from public.test_definition_questions membership
  join public.questions question on question.id = membership.question_id
  where membership.test_definition_id = definition.definition_id
  order by membership.position;

  perform public.write_test_session_audit(
    'test_session.started',
    created_session.id,
    definition.id,
    null,
    'in_progress',
    jsonb_build_object('question_count', member_count)
  );

  return query
  select created_session.id, definition.id, created_session.status,
    created_session.version, created_session.question_count,
    created_session.current_position, created_session.started_at;
end;
$$;

create or replace function public.get_test_session(p_session_id uuid)
returns table (
  session_id uuid,
  test_id text,
  session_status text,
  session_version bigint,
  total_questions integer,
  answered_questions integer,
  current_position integer,
  started_at timestamptz,
  last_activity_at timestamptz,
  active_duration_seconds integer,
  question_position integer,
  question_id uuid,
  question_type text,
  question_text text,
  options jsonb,
  difficulty text,
  tags text[],
  selected_option_id text,
  answer_version bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    raise exception 'Authentication is required to view a test session.';
  end if;

  if not exists (
    select 1 from public.test_sessions session
    where session.id = p_session_id and session.user_id = actor_id
  ) then
    raise exception 'Test session was not found.';
  end if;

  return query
  select
    session.id,
    generated.id,
    session.status,
    session.version,
    session.question_count,
    (select count(*)::integer from public.test_session_answers answer_count
      where answer_count.session_id = session.id),
    session.current_position,
    session.started_at,
    session.last_activity_at,
    session.accumulated_active_seconds + case
      when session.status = 'in_progress' then
        greatest(0, floor(extract(epoch from (now() - session.active_period_started_at)))::integer)
      else 0
    end,
    question.position,
    question.question_id,
    question.question_type,
    question.question_text,
    question.options,
    question.difficulty,
    question.tags,
    answer.selected_option_id,
    answer.answer_version
  from public.test_sessions session
  join public.test_ids generated on generated.definition_id = session.test_definition_id
  join public.test_session_questions question on question.session_id = session.id
  left join public.test_session_answers answer
    on answer.session_id = session.id and answer.question_id = question.question_id
  where session.id = p_session_id
    and session.user_id = actor_id
  order by question.position;
end;
$$;

create or replace function public.save_test_session_answer(
  p_session_id uuid,
  p_question_id uuid,
  p_selected_option_id text,
  p_expected_session_version bigint
)
returns table (
  session_version bigint,
  answer_version bigint,
  answered_questions integer,
  total_questions integer
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  session_row public.test_sessions%rowtype;
  saved_answer public.test_session_answers%rowtype;
  answered_count integer;
  normalized_option text := upper(btrim(coalesce(p_selected_option_id, '')));
begin
  if actor_id is null then
    raise exception 'Authentication is required to save an answer.';
  end if;

  select session.* into session_row
  from public.test_sessions session
  where session.id = p_session_id and session.user_id = actor_id
  for update;

  if not found then raise exception 'Test session was not found.'; end if;
  if session_row.status <> 'in_progress' then raise exception 'Answers can be changed only while a session is in progress.'; end if;
  if session_row.version <> p_expected_session_version then raise exception 'Session version conflict. Reload the latest session.'; end if;
  if normalized_option not in ('A', 'B', 'C', 'D') then raise exception 'Selected option must be A, B, C, or D.'; end if;

  if not exists (
    select 1 from public.test_session_questions question
    where question.session_id = session_row.id and question.question_id = p_question_id
  ) then
    raise exception 'Question does not belong to this session.';
  end if;

  insert into public.test_session_answers (
    session_id, question_id, selected_option_id
  ) values (
    session_row.id, p_question_id, normalized_option
  )
  on conflict (session_id, question_id) do update
  set selected_option_id = excluded.selected_option_id,
      answer_version = test_session_answers.answer_version + 1,
      updated_at = now()
  returning * into saved_answer;

  update public.test_sessions
  set version = version + 1,
      last_activity_at = now(),
      updated_at = now()
  where id = session_row.id
  returning version into session_row.version;

  select count(*)::integer into answered_count
  from public.test_session_answers answer
  where answer.session_id = session_row.id;

  return query select session_row.version, saved_answer.answer_version,
    answered_count, session_row.question_count;
end;
$$;

create or replace function public.set_test_session_position(
  p_session_id uuid,
  p_position integer,
  p_expected_session_version bigint
)
returns bigint
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  session_row public.test_sessions%rowtype;
begin
  select session.* into session_row
  from public.test_sessions session
  where session.id = p_session_id and session.user_id = actor_id
  for update;

  if actor_id is null or not found then raise exception 'Test session was not found.'; end if;
  if session_row.status = 'submitted' then raise exception 'Submitted sessions cannot change position.'; end if;
  if session_row.version <> p_expected_session_version then raise exception 'Session version conflict. Reload the latest session.'; end if;
  if p_position < 1 or p_position > session_row.question_count then raise exception 'Position is outside this session.'; end if;

  update public.test_sessions
  set current_position = p_position,
      version = version + 1,
      last_activity_at = now(),
      updated_at = now()
  where id = session_row.id
  returning version into session_row.version;

  return session_row.version;
end;
$$;

create or replace function public.pause_test_session(
  p_session_id uuid,
  p_expected_session_version bigint
)
returns bigint
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  session_row public.test_sessions%rowtype;
  test_code text;
begin
  select session.* into session_row
  from public.test_sessions session
  where session.id = p_session_id and session.user_id = actor_id
  for update;

  if actor_id is null or not found then raise exception 'Test session was not found.'; end if;
  if session_row.status <> 'in_progress' then raise exception 'Only an in-progress session can be paused.'; end if;
  if session_row.version <> p_expected_session_version then raise exception 'Session version conflict. Reload the latest session.'; end if;

  update public.test_sessions
  set status = 'paused',
      accumulated_active_seconds = accumulated_active_seconds
        + greatest(0, floor(extract(epoch from (now() - active_period_started_at)))::integer),
      active_period_started_at = null,
      paused_at = now(),
      last_activity_at = now(),
      version = version + 1,
      updated_at = now()
  where id = session_row.id
  returning version into session_row.version;

  select id into test_code from public.test_ids where definition_id = session_row.test_definition_id;
  perform public.write_test_session_audit('test_session.paused', session_row.id, test_code, 'in_progress', 'paused');
  return session_row.version;
end;
$$;

create or replace function public.resume_test_session(
  p_session_id uuid,
  p_expected_session_version bigint
)
returns bigint
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  session_row public.test_sessions%rowtype;
  test_code text;
begin
  select session.* into session_row
  from public.test_sessions session
  where session.id = p_session_id and session.user_id = actor_id
  for update;

  if actor_id is null or not found then raise exception 'Test session was not found.'; end if;
  if session_row.status <> 'paused' then raise exception 'Only a paused session can be resumed.'; end if;
  if session_row.version <> p_expected_session_version then raise exception 'Session version conflict. Reload the latest session.'; end if;

  update public.test_sessions
  set status = 'in_progress',
      active_period_started_at = now(),
      resumed_at = now(),
      last_activity_at = now(),
      version = version + 1,
      updated_at = now()
  where id = session_row.id
  returning version into session_row.version;

  select id into test_code from public.test_ids where definition_id = session_row.test_definition_id;
  perform public.write_test_session_audit('test_session.resumed', session_row.id, test_code, 'paused', 'in_progress');
  return session_row.version;
end;
$$;

create or replace function public.submit_test_session(
  p_session_id uuid,
  p_expected_session_version bigint
)
returns table (
  session_id uuid,
  test_id text,
  total_questions integer,
  answered_questions integer,
  unanswered_questions integer,
  correct_answers integer,
  incorrect_answers integer,
  percentage numeric,
  active_duration_seconds integer,
  submitted_at timestamptz,
  can_view_explanations boolean
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  session_row public.test_sessions%rowtype;
  result_row public.test_results%rowtype;
  definition public.test_ids%rowtype;
  answered_count integer;
  correct_count integer;
  active_seconds integer;
begin
  if actor_id is null then raise exception 'Authentication is required to submit a session.'; end if;

  select session.* into session_row
  from public.test_sessions session
  where session.id = p_session_id and session.user_id = actor_id
  for update;

  if not found then raise exception 'Test session was not found.'; end if;

  if session_row.status = 'submitted' then
    select * into result_row from public.test_results result where result.session_id = session_row.id;
    select * into definition from public.test_ids generated where generated.definition_id = session_row.test_definition_id;
    return query select result_row.session_id, definition.id, result_row.total_questions,
      result_row.answered_questions, result_row.unanswered_questions,
      result_row.correct_answers, result_row.incorrect_answers,
      result_row.percentage, result_row.active_duration_seconds,
      result_row.submitted_at, public.has_premium_explanation_access(actor_id);
    return;
  end if;

  if session_row.status <> 'in_progress' then raise exception 'Resume the session before submitting it.'; end if;
  if session_row.version <> p_expected_session_version then raise exception 'Session version conflict. Reload the latest session.'; end if;

  select * into definition from public.test_ids generated
  where generated.definition_id = session_row.test_definition_id;

  select
    count(answer.question_id)::integer,
    count(*) filter (where answer.selected_option_id = question.correct_option_id)::integer
  into answered_count, correct_count
  from public.test_session_questions session_question
  join public.questions question on question.id = session_question.question_id
  left join public.test_session_answers answer
    on answer.session_id = session_question.session_id
   and answer.question_id = session_question.question_id
  where session_question.session_id = session_row.id;

  active_seconds := session_row.accumulated_active_seconds
    + greatest(0, floor(extract(epoch from (now() - session_row.active_period_started_at)))::integer);

  update public.test_sessions
  set status = 'submitted',
      submitted_at = now(),
      accumulated_active_seconds = active_seconds,
      active_period_started_at = null,
      last_activity_at = now(),
      version = version + 1,
      updated_at = now()
  where id = session_row.id
  returning * into session_row;

  insert into public.test_results (
    session_id, user_id, test_definition_id, total_questions,
    answered_questions, unanswered_questions, correct_answers,
    incorrect_answers, raw_score, percentage, blueprint_version,
    scoring_rule_version, explanation_policy_version,
    active_duration_seconds, submitted_at
  ) values (
    session_row.id, actor_id, session_row.test_definition_id, session_row.question_count,
    answered_count, session_row.question_count - answered_count, correct_count,
    session_row.question_count - correct_count, correct_count,
    round((correct_count::numeric * 100) / session_row.question_count, 2),
    definition.blueprint_snapshot ->> 'version', session_row.scoring_rule_version,
    session_row.explanation_policy_version, active_seconds, session_row.submitted_at
  ) returning * into result_row;

  insert into public.test_result_items (
    session_id, position, question_id, question_type, question_text,
    options, difficulty, tags, selected_option_id, correct_option_id,
    is_correct, explanation_snapshot, content_hash_at_submission
  )
  select
    session_row.id,
    session_question.position,
    session_question.question_id,
    session_question.question_type,
    session_question.question_text,
    session_question.options,
    session_question.difficulty,
    session_question.tags,
    answer.selected_option_id,
    question.correct_option_id,
    answer.selected_option_id is not null and answer.selected_option_id = question.correct_option_id,
    question.explanation,
    question.question_hash
  from public.test_session_questions session_question
  join public.questions question on question.id = session_question.question_id
  left join public.test_session_answers answer
    on answer.session_id = session_question.session_id
   and answer.question_id = session_question.question_id
  where session_question.session_id = session_row.id
  order by session_question.position;

  insert into public.user_question_status (user_id, question_id, status, seen_count, last_seen_at)
  select
    actor_id,
    item.question_id,
    case when item.is_correct then 'Answered correctly' else 'Answered incorrectly' end,
    1,
    session_row.submitted_at
  from public.test_result_items item
  where item.session_id = session_row.id
  on conflict (user_id, question_id) do update
  set status = excluded.status,
      seen_count = user_question_status.seen_count + 1,
      last_seen_at = excluded.last_seen_at,
      updated_at = now();

  perform public.write_test_session_audit(
    'test_session.submitted', session_row.id, definition.id,
    'in_progress', 'submitted',
    jsonb_build_object('correct_answers', correct_count, 'total_questions', session_row.question_count)
  );

  perform public.write_test_session_audit(
    'test_result.finalized', session_row.id, definition.id,
    'in_progress', 'submitted',
    jsonb_build_object('percentage', result_row.percentage)
  );

  return query select result_row.session_id, definition.id, result_row.total_questions,
    result_row.answered_questions, result_row.unanswered_questions,
    result_row.correct_answers, result_row.incorrect_answers,
    result_row.percentage, result_row.active_duration_seconds,
    result_row.submitted_at, public.has_premium_explanation_access(actor_id);
end;
$$;

create or replace function public.get_test_result(p_session_id uuid)
returns table (
  session_id uuid,
  test_id text,
  total_questions integer,
  answered_questions integer,
  unanswered_questions integer,
  correct_answers integer,
  incorrect_answers integer,
  percentage numeric,
  active_duration_seconds integer,
  submitted_at timestamptz,
  can_view_explanations boolean,
  question_position integer,
  question_id uuid,
  question_type text,
  question_text text,
  options jsonb,
  difficulty text,
  tags text[],
  selected_option_id text,
  correct_option_id text,
  is_correct boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then raise exception 'Authentication is required to view a result.'; end if;
  if not exists (
    select 1 from public.test_results result
    where result.session_id = p_session_id and result.user_id = actor_id
  ) then raise exception 'Test result was not found.'; end if;

  return query
  select
    result.session_id, generated.id, result.total_questions,
    result.answered_questions, result.unanswered_questions,
    result.correct_answers, result.incorrect_answers, result.percentage,
    result.active_duration_seconds, result.submitted_at,
    public.has_premium_explanation_access(actor_id),
    item.position, item.question_id, item.question_type, item.question_text,
    item.options, item.difficulty, item.tags, item.selected_option_id,
    item.correct_option_id, item.is_correct
  from public.test_results result
  join public.test_ids generated on generated.definition_id = result.test_definition_id
  join public.test_result_items item on item.session_id = result.session_id
  where result.session_id = p_session_id and result.user_id = actor_id
  order by item.position;
end;
$$;

create or replace function public.get_test_result_explanations(p_session_id uuid)
returns table (
  question_id uuid,
  explanation text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then raise exception 'Authentication is required to view explanations.'; end if;
  if not public.has_premium_explanation_access(actor_id) then raise exception 'Premium access is required to retrieve explanations.'; end if;
  if not exists (
    select 1 from public.test_results result
    where result.session_id = p_session_id and result.user_id = actor_id
  ) then raise exception 'Test result was not found.'; end if;

  return query
  select item.question_id, item.explanation_snapshot
  from public.test_result_items item
  where item.session_id = p_session_id
  order by item.position;
end;
$$;

create or replace function public.get_test_history(
  p_page_size integer default 20,
  p_cursor_activity_at timestamptz default null,
  p_cursor_session_id uuid default null,
  p_status text default null
)
returns table (
  session_id uuid,
  test_id text,
  mode text,
  session_status text,
  started_at timestamptz,
  last_activity_at timestamptz,
  submitted_at timestamptz,
  question_count integer,
  answered_questions integer,
  percentage numeric,
  category text,
  topic_tags text[],
  has_next_page boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  bounded_size integer := least(greatest(coalesce(p_page_size, 20), 1), 50);
begin
  if actor_id is null then raise exception 'Authentication is required to view test history.'; end if;
  if (p_cursor_activity_at is null) <> (p_cursor_session_id is null) then
    raise exception 'Both history cursor values are required.';
  end if;
  if p_status is not null and p_status not in ('in_progress', 'paused', 'submitted') then
    raise exception 'Invalid history status.';
  end if;

  return query
  with page as (
    select
      session.id as session_id,
      generated.id as test_id,
      session.mode,
      session.status,
      session.started_at,
      session.last_activity_at,
      session.submitted_at,
      session.question_count,
      coalesce(result.answered_questions,
        (select count(*)::integer from public.test_session_answers answer
         where answer.session_id = session.id)) as answered_questions,
      result.percentage,
      generated.category,
      generated.topic_tags
    from public.test_sessions session
    join public.test_ids generated on generated.definition_id = session.test_definition_id
    left join public.test_results result on result.session_id = session.id
    where session.user_id = actor_id
      and (p_status is null or session.status = p_status)
      and (
        p_cursor_activity_at is null
        or (session.last_activity_at, session.id) < (p_cursor_activity_at, p_cursor_session_id)
      )
    order by session.last_activity_at desc, session.id desc
    limit bounded_size + 1
  )
  select
    page.session_id, page.test_id, page.mode, page.status,
    page.started_at, page.last_activity_at, page.submitted_at,
    page.question_count, page.answered_questions, page.percentage,
    page.category, page.topic_tags,
    (select count(*) > bounded_size from page)
  from page
  order by page.last_activity_at desc, page.session_id desc
  limit bounded_size;
end;
$$;

create or replace function public.prevent_test_result_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Submitted test results are immutable.';
end;
$$;

create trigger test_results_immutable
before update or delete on public.test_results
for each row execute function public.prevent_test_result_mutation();

create trigger test_result_items_immutable
before update or delete on public.test_result_items
for each row execute function public.prevent_test_result_mutation();

revoke execute on function public.write_test_session_audit(text, uuid, text, text, text, jsonb) from public;
revoke execute on function public.start_test_session(text, text) from public;
revoke execute on function public.get_test_session(uuid) from public;
revoke execute on function public.save_test_session_answer(uuid, uuid, text, bigint) from public;
revoke execute on function public.set_test_session_position(uuid, integer, bigint) from public;
revoke execute on function public.pause_test_session(uuid, bigint) from public;
revoke execute on function public.resume_test_session(uuid, bigint) from public;
revoke execute on function public.submit_test_session(uuid, bigint) from public;
revoke execute on function public.get_test_result(uuid) from public;
revoke execute on function public.get_test_result_explanations(uuid) from public;
revoke execute on function public.get_test_history(integer, timestamptz, uuid, text) from public;

grant execute on function public.start_test_session(text, text) to authenticated, service_role;
grant execute on function public.get_test_session(uuid) to authenticated, service_role;
grant execute on function public.save_test_session_answer(uuid, uuid, text, bigint) to authenticated, service_role;
grant execute on function public.set_test_session_position(uuid, integer, bigint) to authenticated, service_role;
grant execute on function public.pause_test_session(uuid, bigint) to authenticated, service_role;
grant execute on function public.resume_test_session(uuid, bigint) to authenticated, service_role;
grant execute on function public.submit_test_session(uuid, bigint) to authenticated, service_role;
grant execute on function public.get_test_result(uuid) to authenticated, service_role;
grant execute on function public.get_test_result_explanations(uuid) to authenticated, service_role;
grant execute on function public.get_test_history(integer, timestamptz, uuid, text) to authenticated, service_role;

comment on function public.start_test_session(text, text) is
  'Authenticated idempotent session start using persisted Milestone 6 membership. Returns no answer keys.';
comment on function public.save_test_session_answer(uuid, uuid, text, bigint) is
  'Optimistic, ownership-checked answer upsert for in-progress sessions.';
comment on function public.submit_test_session(uuid, bigint) is
  'Transactional idempotent submission and trusted scoring. Unanswered questions score incorrect.';
comment on function public.get_test_result(uuid) is
  'Owner-only result detail with correct-answer review and no explanation field.';
comment on function public.get_test_result_explanations(uuid) is
  'Owner-only premium-gated result explanations in a separate protected response path.';
