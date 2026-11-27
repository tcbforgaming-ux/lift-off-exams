-- Milestone 8: authenticated question reports, trusted administrative review,
-- immutable corrections/audits, and historical session scoring safeguards.

-- Preserve legacy report records while replacing the prototype status vocabulary.
alter table public.question_reports drop constraint if exists question_reports_status_check;

update public.question_reports
set status = case status
  when 'Open' then 'open'
  when 'Work In Progress' then 'in_review'
  when 'Fixed' then 'resolved'
  when 'Valid' then 'resolved'
  when 'Invalid' then 'rejected'
  when 'Spam' then 'rejected'
  when 'open' then 'open'
  when 'in_review' then 'in_review'
  when 'resolved' then 'resolved'
  when 'rejected' then 'rejected'
  when 'duplicate' then 'duplicate'
  else 'open'
end;

alter table public.question_reports
  add column if not exists entity_type text not null default 'question',
  add column if not exists session_id uuid references public.test_sessions(id) on delete set null,
  add column if not exists category text not null default 'other',
  add column if not exists description text,
  add column if not exists encountered_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists version bigint not null default 1,
  add column if not exists resolution_category text,
  add column if not exists resolution_message text,
  add column if not exists resolved_at timestamptz,
  add column if not exists duplicate_of uuid references public.question_reports(id) on delete restrict,
  add column if not exists correction_version_id uuid references public.question_versions(id) on delete restrict,
  add column if not exists lifecycle_event_id uuid references public.question_lifecycle_events(id) on delete restrict,
  add column if not exists idempotency_key text,
  add column if not exists resolution_idempotency_key text;

update public.question_reports
set description = case
  when length(trim(coalesce(reason, ''))) between 10 and 2000 then trim(reason)
  else 'Legacy question report'
end
where description is null;

-- Legacy terminal reports predate structured resolutions. Preserve their final
-- outcome with a neutral migration note rather than reopening or discarding them.
update public.question_reports
set resolution_category = case status
      when 'resolved' then 'no_change'
      when 'rejected' then 'not_an_issue'
      else resolution_category
    end,
    resolution_message = case
      when status in ('resolved', 'rejected')
        then coalesce(nullif(trim(admin_note), ''), 'Migrated from the legacy report workflow.')
      else resolution_message
    end,
    resolved_at = case
      when status in ('resolved', 'rejected')
        then coalesce(reviewed_at, updated_at, created_at, now())
      else resolved_at
    end
where status in ('resolved', 'rejected');

-- The legacy schema had no duplicate relationship. Any such pre-release value
-- cannot satisfy the new invariant and is safely returned to the review queue.
update public.question_reports
set status = 'open'
where status = 'duplicate' and duplicate_of is null;

alter table public.question_reports
  alter column description set not null,
  add constraint question_reports_entity_type_check check (entity_type = 'question'),
  add constraint question_reports_category_check check (
    category in (
      'incorrect_answer', 'incorrect_explanation', 'bad_options',
      'unclear_wording', 'outdated_content', 'other'
    )
  ),
  add constraint question_reports_status_check check (
    status in ('open', 'in_review', 'resolved', 'rejected', 'duplicate')
  ),
  add constraint question_reports_description_length_check
    check (length(description) between 10 and 2000),
  add constraint question_reports_snapshot_size_check
    check (octet_length(encountered_snapshot::text) <= 20000),
  add constraint question_reports_version_check check (version > 0),
  add constraint question_reports_resolution_category_check check (
    resolution_category is null or resolution_category in (
      'corrected', 'retired', 'restored', 'no_change',
      'not_an_issue', 'insufficient_information', 'duplicate'
    )
  ),
  add constraint question_reports_resolution_consistency_check check (
    (status in ('open', 'in_review') and resolved_at is null and resolution_category is null)
    or
    (status in ('resolved', 'rejected', 'duplicate') and resolved_at is not null
      and resolution_category is not null and resolution_message is not null)
  ),
  add constraint question_reports_duplicate_consistency_check check (
    (status = 'duplicate' and duplicate_of is not null and duplicate_of <> id)
    or (status <> 'duplicate' and duplicate_of is null)
  );

create unique index question_reports_reporter_idempotency_key
on public.question_reports(reporter_id, idempotency_key)
where reporter_id is not null and idempotency_key is not null;

create index question_reports_queue_order_idx
on public.question_reports(status, updated_at desc, id desc);

create index question_reports_question_created_idx
on public.question_reports(question_id, created_at desc, id desc);

-- Question versions become immutable correction records with explicit before/after
-- snapshots and report linkage. Existing snapshot values remain valid.
alter table public.question_versions
  add column if not exists previous_snapshot jsonb,
  add column if not exists report_id uuid references public.question_reports(id) on delete restrict;

create index question_versions_report_idx
on public.question_versions(report_id, created_at desc, id desc)
where report_id is not null;

-- Richer append-only audit relationships. Existing audit rows remain readable.
alter table public.admin_audit_logs
  add column if not exists actor_role text,
  add column if not exists report_id uuid references public.question_reports(id) on delete set null,
  add column if not exists correlation_id text,
  add column if not exists previous_values jsonb,
  add column if not exists new_values jsonb;

create unique index admin_audit_logs_actor_correlation_key
on public.admin_audit_logs(actor_user_id, correlation_id)
where actor_user_id is not null and correlation_id is not null;

create index admin_audit_logs_report_created_idx
on public.admin_audit_logs(report_id, created_at desc, id desc)
where report_id is not null;

create index admin_audit_logs_target_created_idx
on public.admin_audit_logs(resource_type, resource_id, created_at desc, id desc);

-- Preserve the protected scoring key encountered when a session begins. These
-- columns have no browser table grants and are absent from get_test_session().
alter table public.test_session_questions
  add column if not exists correct_option_id_at_start text,
  add column if not exists explanation_at_start text;

update public.test_session_questions session_question
set correct_option_id_at_start = question.correct_option_id,
    explanation_at_start = question.explanation
from public.questions question
where question.id = session_question.question_id
  and session_question.correct_option_id_at_start is null;

alter table public.test_session_questions
  alter column correct_option_id_at_start set not null,
  add constraint test_session_questions_correct_option_check
    check (correct_option_id_at_start in ('A', 'B', 'C', 'D'));

create or replace function public.snapshot_session_question_key()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  select question.correct_option_id, question.explanation
  into new.correct_option_id_at_start, new.explanation_at_start
  from public.questions question
  where question.id = new.question_id;

  if new.correct_option_id_at_start is null then
    raise exception 'Question scoring snapshot could not be created.';
  end if;
  return new;
end;
$$;

create trigger test_session_questions_snapshot_key
before insert on public.test_session_questions
for each row execute function public.snapshot_session_question_key();

-- Trusted append-only protection. PostgreSQL maintenance remains possible; normal
-- authenticated and service-role application paths cannot rewrite history.
create or replace function public.prevent_append_only_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user = 'postgres' then
    return old;
  end if;
  raise exception 'Administrative history is append-only.';
end;
$$;

create trigger admin_audit_logs_append_only
before update or delete on public.admin_audit_logs
for each row execute function public.prevent_append_only_mutation();

create trigger question_versions_append_only
before update or delete on public.question_versions
for each row execute function public.prevent_append_only_mutation();

create trigger question_lifecycle_events_append_only
before update or delete on public.question_lifecycle_events
for each row execute function public.prevent_append_only_mutation();

drop policy if exists question_versions_staff_all on public.question_versions;
create policy question_versions_staff_select
on public.question_versions for select to authenticated
using (public.is_admin());

drop policy if exists question_reports_insert_authenticated on public.question_reports;
drop policy if exists question_reports_select_own on public.question_reports;
drop policy if exists question_reports_staff_select on public.question_reports;
drop policy if exists question_reports_staff_update on public.question_reports;

revoke all on public.question_reports from anon, authenticated;
revoke insert, update, delete on public.question_versions from authenticated;
revoke insert, update, delete on public.admin_audit_logs from authenticated;
revoke insert, update, delete on public.question_lifecycle_events from authenticated;

grant all privileges on public.question_reports to service_role;
grant all privileges on public.question_versions to service_role;
grant all privileges on public.admin_audit_logs to service_role;
grant all privileges on public.question_lifecycle_events to service_role;

create or replace function public.submit_question_report(
  p_session_id uuid,
  p_question_id uuid,
  p_category text,
  p_description text,
  p_idempotency_key text
)
returns table (
  report_id uuid,
  report_status text,
  created_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  clean_category text := lower(trim(coalesce(p_category, '')));
  clean_description text := trim(coalesce(p_description, ''));
  clean_key text := trim(coalesce(p_idempotency_key, ''));
  session_row public.test_sessions%rowtype;
  encountered public.test_session_questions%rowtype;
  existing_report public.question_reports%rowtype;
  created_report public.question_reports%rowtype;
begin
  if actor_id is null then raise exception 'Authentication is required to report a question.'; end if;
  if clean_category not in (
    'incorrect_answer', 'incorrect_explanation', 'bad_options',
    'unclear_wording', 'outdated_content', 'other'
  ) then raise exception 'Invalid report category.'; end if;
  if length(clean_description) < 10 or length(clean_description) > 2000 then
    raise exception 'Report description must contain between 10 and 2000 characters.';
  end if;
  if length(clean_key) < 1 or length(clean_key) > 128 then
    raise exception 'Idempotency key must contain between 1 and 128 characters.';
  end if;

  select session.* into session_row
  from public.test_sessions session
  where session.id = p_session_id and session.user_id = actor_id;
  if not found then raise exception 'The referenced test session was not found.'; end if;

  select session_question.* into encountered
  from public.test_session_questions session_question
  where session_question.session_id = p_session_id
    and session_question.question_id = p_question_id;
  if not found then raise exception 'The question was not part of this test session.'; end if;

  select report.* into existing_report
  from public.question_reports report
  where report.reporter_id = actor_id and report.idempotency_key = clean_key;
  if found then
    if existing_report.session_id <> p_session_id or existing_report.question_id <> p_question_id then
      raise exception 'Idempotency key was already used for another report.';
    end if;
    return query select existing_report.id, existing_report.status, existing_report.created_at;
    return;
  end if;

  insert into public.question_reports (
    entity_type, question_id, test_id, session_id, reason, category,
    description, status, reporter_id, report_snapshot, encountered_snapshot,
    idempotency_key
  ) values (
    'question', p_question_id,
    (select generated.id from public.test_ids generated
      where generated.definition_id = session_row.test_definition_id),
    p_session_id, clean_category, clean_category, clean_description, 'open', actor_id,
    jsonb_build_object('source', 'test_session', 'session_status', session_row.status),
    jsonb_build_object(
      'position', encountered.position,
      'question_type', encountered.question_type,
      'question_text', encountered.question_text,
      'options', encountered.options,
      'difficulty', encountered.difficulty,
      'tags', encountered.tags,
      'content_hash', encountered.content_hash_at_start,
      'question_updated_at', encountered.question_updated_at_at_start
    ),
    clean_key
  ) returning * into created_report;

  return query select created_report.id, created_report.status, created_report.created_at;
end;
$$;

create or replace function public.get_own_question_reports(
  p_page_size integer default 20,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null
)
returns table (
  report_id uuid,
  question_id uuid,
  test_id text,
  category text,
  report_status text,
  resolution_category text,
  resolution_message text,
  created_at timestamptz,
  updated_at timestamptz,
  has_next_page boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  bounded_limit integer := least(greatest(coalesce(p_page_size, 20), 1), 50);
begin
  if actor_id is null then raise exception 'Authentication is required to view reports.'; end if;
  if (p_cursor_created_at is null) <> (p_cursor_id is null) then
    raise exception 'Both report cursor values are required.';
  end if;

  return query
  with page as (
    select report.*, row_number() over (order by report.created_at desc, report.id desc) page_row
    from public.question_reports report
    where report.reporter_id = actor_id
      and (p_cursor_created_at is null or (report.created_at, report.id) < (p_cursor_created_at, p_cursor_id))
    order by report.created_at desc, report.id desc
    limit bounded_limit + 1
  )
  select page.id, page.question_id, page.test_id, page.category, page.status,
    page.resolution_category, page.resolution_message, page.created_at, page.updated_at,
    exists(select 1 from page extra where extra.page_row > bounded_limit)
  from page where page.page_row <= bounded_limit
  order by page.created_at desc, page.id desc;
end;
$$;

create or replace function public.search_question_report_queue(
  p_page_size integer default 25,
  p_cursor_updated_at timestamptz default null,
  p_cursor_id uuid default null,
  p_status text default null,
  p_category text default null,
  p_lifecycle_state text default null,
  p_performance_indicator text default null,
  p_question_type text default null,
  p_difficulty text default null,
  p_created_from timestamptz default null,
  p_created_to timestamptz default null
)
returns table (
  report_id uuid,
  question_id uuid,
  test_id text,
  category text,
  report_status text,
  report_version bigint,
  reporter_email text,
  performance_indicator text,
  question_type text,
  difficulty text,
  lifecycle_state text,
  created_at timestamptz,
  updated_at timestamptz,
  has_next_page boolean
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  bounded_limit integer := least(greatest(coalesce(p_page_size, 25), 1), 100);
begin
  if not public.is_admin() then raise exception 'Administrator or Owner access is required.'; end if;
  if (p_cursor_updated_at is null) <> (p_cursor_id is null) then
    raise exception 'Both queue cursor values are required.';
  end if;
  if p_status is not null and p_status not in ('open','in_review','resolved','rejected','duplicate') then
    raise exception 'Invalid report status filter.';
  end if;

  return query
  with page as (
    select report.*, question.performance_indicator, question.question_type,
      question.difficulty, question.lifecycle_state, users.email::text as reporter_email,
      row_number() over (order by report.updated_at desc, report.id desc) page_row
    from public.question_reports report
    join public.questions question on question.id = report.question_id
    left join auth.users users on users.id = report.reporter_id
    where (p_status is null or report.status = p_status)
      and (p_category is null or report.category = p_category)
      and (p_lifecycle_state is null or question.lifecycle_state = p_lifecycle_state)
      and (p_performance_indicator is null or question.performance_indicator = p_performance_indicator)
      and (p_question_type is null or question.question_type = p_question_type)
      and (p_difficulty is null or question.difficulty = p_difficulty)
      and (p_created_from is null or report.created_at >= p_created_from)
      and (p_created_to is null or report.created_at <= p_created_to)
      and (p_cursor_updated_at is null or (report.updated_at, report.id) < (p_cursor_updated_at, p_cursor_id))
    order by report.updated_at desc, report.id desc
    limit bounded_limit + 1
  )
  select page.id, page.question_id, page.test_id, page.category, page.status,
    page.version, page.reporter_email, page.performance_indicator, page.question_type,
    page.difficulty, page.lifecycle_state, page.created_at, page.updated_at,
    exists(select 1 from page extra where extra.page_row > bounded_limit)
  from page where page.page_row <= bounded_limit
  order by page.updated_at desc, page.id desc;
end;
$$;

create or replace function public.get_question_report_detail(p_report_id uuid)
returns table (
  report_id uuid,
  report_status text,
  report_version bigint,
  category text,
  description text,
  reporter_email text,
  created_at timestamptz,
  updated_at timestamptz,
  resolution_category text,
  resolution_message text,
  duplicate_of uuid,
  question_id uuid,
  test_id text,
  encountered_snapshot jsonb,
  question_text text,
  options jsonb,
  correct_option_id text,
  explanation text,
  performance_indicator text,
  partition_key text,
  question_type text,
  difficulty text,
  tags text[],
  lifecycle_state text,
  question_updated_at timestamptz,
  correction_version_id uuid,
  lifecycle_event_id uuid
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then raise exception 'Administrator or Owner access is required.'; end if;
  return query
  select report.id, report.status, report.version, report.category,
    report.description, users.email::text, report.created_at, report.updated_at,
    report.resolution_category, report.resolution_message, report.duplicate_of,
    question.id, report.test_id, report.encountered_snapshot,
    question.question_text, question.options, question.correct_option_id,
    question.explanation, question.performance_indicator, question.partition_key,
    question.question_type, question.difficulty, question.tags,
    question.lifecycle_state, question.updated_at,
    report.correction_version_id, report.lifecycle_event_id
  from public.question_reports report
  join public.questions question on question.id = report.question_id
  left join auth.users users on users.id = report.reporter_id
  where report.id = p_report_id;
end;
$$;

create or replace function public.search_admin_audit_logs(
  p_page_size integer default 25,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_actor_user_id uuid default null,
  p_action text default null,
  p_resource_type text default null,
  p_resource_id text default null,
  p_report_id uuid default null,
  p_created_from timestamptz default null,
  p_created_to timestamptz default null
)
returns table (
  audit_id uuid,
  actor_user_id uuid,
  actor_email text,
  actor_role text,
  action text,
  resource_type text,
  resource_id text,
  report_id uuid,
  reason text,
  previous_values jsonb,
  new_values jsonb,
  metadata jsonb,
  created_at timestamptz,
  has_next_page boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  bounded_limit integer := least(greatest(coalesce(p_page_size, 25), 1), 100);
begin
  if not public.is_admin() then raise exception 'Administrator or Owner access is required.'; end if;
  if (p_cursor_created_at is null) <> (p_cursor_id is null) then
    raise exception 'Both audit cursor values are required.';
  end if;

  return query
  with page as (
    select audit.*, row_number() over (order by audit.created_at desc, audit.id desc) page_row
    from public.admin_audit_logs audit
    where (p_actor_user_id is null or audit.actor_user_id = p_actor_user_id)
      and (p_action is null or audit.action = p_action)
      and (p_resource_type is null or audit.resource_type = p_resource_type)
      and (p_resource_id is null or audit.resource_id = p_resource_id)
      and (p_report_id is null or audit.report_id = p_report_id)
      and (p_created_from is null or audit.created_at >= p_created_from)
      and (p_created_to is null or audit.created_at <= p_created_to)
      and (p_cursor_created_at is null or (audit.created_at, audit.id) < (p_cursor_created_at, p_cursor_id))
    order by audit.created_at desc, audit.id desc
    limit bounded_limit + 1
  )
  select page.id, page.actor_user_id, page.actor_email, page.actor_role,
    page.action, page.resource_type, page.resource_id, page.report_id,
    page.reason, page.previous_values, page.new_values, page.metadata,
    page.created_at, exists(select 1 from page extra where extra.page_row > bounded_limit)
  from page where page.page_row <= bounded_limit
  order by page.created_at desc, page.id desc;
end;
$$;

create or replace function public.correct_reported_question(
  p_report_id uuid,
  p_expected_report_version bigint,
  p_expected_question_updated_at timestamptz,
  p_question_text text,
  p_options jsonb,
  p_correct_option_id text,
  p_explanation text,
  p_performance_indicator text,
  p_partition_key text,
  p_question_type text,
  p_difficulty text,
  p_tags text[],
  p_reason text,
  p_resolution_message text,
  p_idempotency_key text
)
returns table (
  report_id uuid,
  report_status text,
  report_version bigint,
  question_id uuid,
  question_updated_at timestamptz,
  correction_version_id uuid
)
language plpgsql
volatile
security definer
set search_path = public, auth, extensions
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text := public.current_user_role();
  report_row public.question_reports%rowtype;
  question_row public.questions%rowtype;
  updated_question public.questions%rowtype;
  version_id uuid;
  next_version integer;
  clean_question text := trim(coalesce(p_question_text, ''));
  clean_answer text := upper(trim(coalesce(p_correct_option_id, '')));
  clean_explanation text := trim(coalesce(p_explanation, ''));
  clean_indicator text := trim(coalesce(p_performance_indicator, ''));
  clean_partition text := trim(coalesce(p_partition_key, ''));
  clean_type text := upper(trim(coalesce(p_question_type, '')));
  clean_difficulty text := upper(trim(coalesce(p_difficulty, '')));
  clean_reason text := trim(coalesce(p_reason, ''));
  clean_resolution text := trim(coalesce(p_resolution_message, ''));
  clean_key text := trim(coalesce(p_idempotency_key, ''));
  stored_type text;
  stored_difficulty text;
  before_snapshot jsonb;
  after_snapshot jsonb;
begin
  if not public.is_admin() or actor_id is null then
    raise exception 'Administrator or Owner access is required.';
  end if;
  if length(clean_key) < 1 or length(clean_key) > 128 then raise exception 'A valid idempotency key is required.'; end if;
  if length(clean_reason) < 5 or length(clean_reason) > 1000 then raise exception 'Correction reason must contain between 5 and 1000 characters.'; end if;
  if length(clean_resolution) < 5 or length(clean_resolution) > 1000 then raise exception 'Resolution message must contain between 5 and 1000 characters.'; end if;
  if length(clean_question) < 5 or length(clean_question) > 5000 then raise exception 'Question text must contain between 5 and 5000 characters.'; end if;
  if length(clean_explanation) < 5 or length(clean_explanation) > 5000 then raise exception 'Explanation must contain between 5 and 5000 characters.'; end if;
  if length(clean_indicator) < 1 or length(clean_indicator) > 200 then raise exception 'A valid performance indicator is required.'; end if;
  if clean_partition not in (
    'Business Administration Core', 'Marketing', 'Finance',
    'Business Management and Administration', 'Hospitality and Tourism', 'Entrepreneurship'
  ) then raise exception 'Invalid partition key.'; end if;
  if clean_type not in ('S','D','F','A') then raise exception 'Question type must be S, D, F, or A.'; end if;
  if clean_difficulty not in ('E','M','H') then raise exception 'Difficulty must be E, M, or H.'; end if;
  if clean_answer not in ('A','B','C','D') then raise exception 'Correct option must be A, B, C, or D.'; end if;
  if p_options is null or jsonb_typeof(p_options) <> 'array' or jsonb_array_length(p_options) <> 4 then
    raise exception 'Exactly four answer options are required.';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_options) with ordinality option(value, position)
    where case
      when jsonb_typeof(option.value) = 'string' then length(trim(option.value #>> '{}')) = 0
      when jsonb_typeof(option.value) = 'object' then
        length(trim(coalesce(option.value ->> 'text', ''))) = 0
        or upper(coalesce(option.value ->> 'id', '')) <> substr('ABCD', option.position::integer, 1)
      else true
    end
  ) then raise exception 'Every answer option must have a non-empty value and canonical position.'; end if;
  if p_tags is null or cardinality(p_tags) < 1 or cardinality(p_tags) > 20
    or exists(select 1 from unnest(p_tags) tag where length(trim(tag)) < 1 or length(trim(tag)) > 100)
  then raise exception 'Between 1 and 20 valid topic tags are required.'; end if;

  select report.* into report_row
  from public.question_reports report where report.id = p_report_id for update;
  if not found then raise exception 'Question report was not found.'; end if;
  if report_row.status in ('resolved','rejected','duplicate') then
    if report_row.status = 'resolved' and report_row.resolution_idempotency_key = clean_key
      and report_row.correction_version_id is not null then
      select * into updated_question from public.questions where id = report_row.question_id;
      return query select report_row.id, report_row.status, report_row.version,
        updated_question.id, updated_question.updated_at, report_row.correction_version_id;
      return;
    end if;
    raise exception 'Finalized reports cannot be changed.';
  end if;
  if report_row.version <> p_expected_report_version then raise exception 'Report version conflict. Reload before retrying.'; end if;

  select question.* into question_row
  from public.questions question where question.id = report_row.question_id for update;
  if not found then raise exception 'Reported question was not found.'; end if;
  if question_row.updated_at <> p_expected_question_updated_at then raise exception 'Question version conflict. Reload before retrying.'; end if;

  stored_type := case clean_type when 'S' then 'Scenario' when 'D' then 'Definition'
    when 'F' then 'Fill In The Blank' else 'All Except' end;
  stored_difficulty := case clean_difficulty when 'E' then 'Easy' when 'M' then 'Medium' else 'Hard' end;

  before_snapshot := jsonb_build_object(
    'question_text', question_row.question_text, 'options', question_row.options,
    'correct_option_id', question_row.correct_option_id, 'explanation', question_row.explanation,
    'performance_indicator', question_row.performance_indicator,
    'partition_key', question_row.partition_key, 'question_type', question_row.question_type,
    'difficulty', question_row.difficulty, 'tags', question_row.tags,
    'lifecycle_state', question_row.lifecycle_state, 'updated_at', question_row.updated_at
  );
  after_snapshot := jsonb_build_object(
    'question_text', clean_question, 'options', p_options,
    'correct_option_id', clean_answer, 'explanation', clean_explanation,
    'performance_indicator', clean_indicator, 'partition_key', clean_partition,
    'question_type', stored_type, 'difficulty', stored_difficulty,
    'tags', array(select distinct trim(tag) from unnest(p_tags) tag order by trim(tag)),
    'lifecycle_state', question_row.lifecycle_state
  );

  select coalesce(max(version.version_number), 0) + 1 into next_version
  from public.question_versions version
  where version.question_id = question_row.id;

  insert into public.question_versions(
    question_id, version_number, snapshot, previous_snapshot,
    change_reason, created_by, report_id
  ) values (
    question_row.id, next_version, after_snapshot, before_snapshot,
    clean_reason, actor_id, report_row.id
  ) returning id into version_id;

  update public.questions
  set question_text = clean_question,
      options = p_options,
      correct_option_id = clean_answer,
      explanation = clean_explanation,
      performance_indicator = clean_indicator,
      partition_key = clean_partition,
      question_type = stored_type,
      difficulty = stored_difficulty,
      tags = array(select distinct trim(tag) from unnest(p_tags) tag order by trim(tag)),
      question_hash = encode(extensions.digest(convert_to(after_snapshot::text, 'UTF8'), 'sha256'), 'hex')
  where id = question_row.id
  returning * into updated_question;

  update public.question_reports
  set status = 'resolved', resolution_category = 'corrected',
      resolution_message = clean_resolution, resolved_at = now(), reviewed_by = actor_id,
      reviewed_at = now(), correction_version_id = version_id,
      resolution_idempotency_key = clean_key, version = version + 1
  where id = report_row.id
  returning * into report_row;

  insert into public.admin_audit_logs(
    actor_user_id, actor_email, actor_role, action, resource_type, resource_id,
    report_id, reason, correlation_id, previous_values, new_values, metadata
  ) values (
    actor_id, (select email from auth.users where id = actor_id), actor_role,
    'question.corrected', 'question', question_row.id::text, report_row.id,
    clean_reason, clean_key, before_snapshot, after_snapshot,
    jsonb_build_object('question_version_id', version_id, 'report_status', 'resolved')
  );

  return query select report_row.id, report_row.status, report_row.version,
    updated_question.id, updated_question.updated_at, version_id;
end;
$$;

create or replace function public.transition_question_report(
  p_report_id uuid,
  p_expected_version bigint,
  p_new_status text,
  p_resolution_category text,
  p_resolution_message text,
  p_duplicate_of uuid,
  p_reason text,
  p_idempotency_key text
)
returns table (report_id uuid, report_status text, report_version bigint, updated_at timestamptz)
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text := public.current_user_role();
  report_row public.question_reports%rowtype;
  primary_report public.question_reports%rowtype;
  clean_status text := lower(trim(coalesce(p_new_status, '')));
  clean_category text := lower(trim(coalesce(p_resolution_category, '')));
  clean_message text := trim(coalesce(p_resolution_message, ''));
  clean_reason text := trim(coalesce(p_reason, ''));
  clean_key text := trim(coalesce(p_idempotency_key, ''));
begin
  if not public.is_admin() or actor_id is null then raise exception 'Administrator or Owner access is required.'; end if;
  if clean_status not in ('in_review','resolved','rejected','duplicate') then raise exception 'Invalid report transition.'; end if;
  if length(clean_reason) < 5 or length(clean_reason) > 1000 then raise exception 'Review reason must contain between 5 and 1000 characters.'; end if;
  if length(clean_key) < 1 or length(clean_key) > 128 then raise exception 'A valid idempotency key is required.'; end if;

  select report.* into report_row from public.question_reports report
  where report.id = p_report_id for update;
  if not found then raise exception 'Question report was not found.'; end if;
  if report_row.status in ('resolved','rejected','duplicate') then
    if report_row.status = clean_status and report_row.resolution_idempotency_key = clean_key then
      return query select report_row.id, report_row.status, report_row.version, report_row.updated_at;
      return;
    end if;
    raise exception 'Finalized reports cannot be changed.';
  end if;
  if report_row.version <> p_expected_version then raise exception 'Report version conflict. Reload before retrying.'; end if;

  if clean_status = 'in_review' then
    if report_row.status <> 'open' then raise exception 'Only open reports may enter review.'; end if;
    if nullif(clean_category, '') is not null or nullif(clean_message, '') is not null or p_duplicate_of is not null then
      raise exception 'In-review reports cannot contain resolution metadata.';
    end if;
  elsif clean_status = 'resolved' then
    if clean_category <> 'no_change' then raise exception 'Generic resolution supports only no_change.'; end if;
    if length(clean_message) < 5 or length(clean_message) > 1000 then raise exception 'A public resolution message is required.'; end if;
  elsif clean_status = 'rejected' then
    if clean_category not in ('not_an_issue','insufficient_information') then raise exception 'Invalid rejection category.'; end if;
    if length(clean_message) < 5 or length(clean_message) > 1000 then raise exception 'A public rejection message is required.'; end if;
  else
    if clean_category <> 'duplicate' or p_duplicate_of is null or p_duplicate_of = report_row.id then raise exception 'A valid primary report is required.'; end if;
    select report.* into primary_report from public.question_reports report where report.id = p_duplicate_of;
    if not found or primary_report.question_id <> report_row.question_id or primary_report.status = 'duplicate' then
      raise exception 'Duplicate reports must link to a primary report for the same question.';
    end if;
    if length(clean_message) < 5 or length(clean_message) > 1000 then raise exception 'A public duplicate message is required.'; end if;
  end if;

  update public.question_reports
  set status = clean_status,
      resolution_category = case when clean_status = 'in_review' then null else clean_category end,
      resolution_message = case when clean_status = 'in_review' then null else clean_message end,
      resolved_at = case when clean_status = 'in_review' then null else now() end,
      duplicate_of = case when clean_status = 'duplicate' then p_duplicate_of else null end,
      reviewed_by = actor_id, reviewed_at = now(),
      resolution_idempotency_key = clean_key, version = version + 1
  where id = report_row.id returning * into report_row;

  insert into public.admin_audit_logs(
    actor_user_id, actor_email, actor_role, action, resource_type, resource_id,
    report_id, reason, correlation_id, previous_values, new_values, metadata
  ) values (
    actor_id, (select email from auth.users where id = actor_id), actor_role,
    'question_report.' || clean_status, 'question_report', report_row.id::text,
    report_row.id, clean_reason, clean_key,
    jsonb_build_object('status', case when clean_status = 'in_review' then 'open' else 'open_or_in_review' end),
    jsonb_build_object('status', clean_status, 'resolution_category', nullif(clean_category, ''), 'duplicate_of', p_duplicate_of),
    '{}'::jsonb
  );

  return query select report_row.id, report_row.status, report_row.version, report_row.updated_at;
end;
$$;

create or replace function public.resolve_report_with_question_lifecycle(
  p_report_id uuid,
  p_expected_report_version bigint,
  p_expected_question_updated_at timestamptz,
  p_new_lifecycle_state text,
  p_reason text,
  p_resolution_message text,
  p_idempotency_key text
)
returns table (
  report_id uuid, report_status text, report_version bigint,
  question_id uuid, lifecycle_state text, question_updated_at timestamptz,
  lifecycle_event_id uuid
)
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text := public.current_user_role();
  report_row public.question_reports%rowtype;
  question_row public.questions%rowtype;
  event_id uuid;
  clean_state text := trim(coalesce(p_new_lifecycle_state, ''));
  clean_reason text := trim(coalesce(p_reason, ''));
  clean_message text := trim(coalesce(p_resolution_message, ''));
  clean_key text := trim(coalesce(p_idempotency_key, ''));
begin
  if not public.is_admin() or actor_id is null then raise exception 'Administrator or Owner access is required.'; end if;
  if clean_state not in ('Active','Retired') then raise exception 'Invalid lifecycle state.'; end if;
  if length(clean_reason) < 5 or length(clean_reason) > 1000 then raise exception 'Lifecycle reason must contain between 5 and 1000 characters.'; end if;
  if length(clean_message) < 5 or length(clean_message) > 1000 then raise exception 'A public resolution message is required.'; end if;
  if length(clean_key) < 1 or length(clean_key) > 128 then raise exception 'A valid idempotency key is required.'; end if;

  select report.* into report_row from public.question_reports report
  where report.id = p_report_id for update;
  if not found then raise exception 'Question report was not found.'; end if;
  if report_row.status in ('resolved','rejected','duplicate') then
    if report_row.status = 'resolved' and report_row.resolution_idempotency_key = clean_key
      and report_row.lifecycle_event_id is not null then
      select * into question_row from public.questions where id = report_row.question_id;
      return query select report_row.id, report_row.status, report_row.version,
        question_row.id, question_row.lifecycle_state, question_row.updated_at,
        report_row.lifecycle_event_id;
      return;
    end if;
    raise exception 'Finalized reports cannot be changed.';
  end if;
  if report_row.version <> p_expected_report_version then raise exception 'Report version conflict. Reload before retrying.'; end if;

  select question.* into question_row from public.questions question
  where question.id = report_row.question_id for update;
  if not found then raise exception 'Reported question was not found.'; end if;
  if question_row.updated_at <> p_expected_question_updated_at then raise exception 'Question version conflict. Reload before retrying.'; end if;
  if question_row.lifecycle_state = clean_state then raise exception 'Question is already in the requested lifecycle state.'; end if;

  insert into public.question_lifecycle_events(
    question_id, previous_state, new_state, actor_user_id, reason
  ) values (
    question_row.id, question_row.lifecycle_state, clean_state, actor_id, clean_reason
  ) returning id into event_id;

  update public.questions set lifecycle_state = clean_state
  where id = question_row.id returning * into question_row;

  update public.question_reports
  set status = 'resolved',
      resolution_category = case when clean_state = 'Retired' then 'retired' else 'restored' end,
      resolution_message = clean_message, resolved_at = now(), reviewed_by = actor_id,
      reviewed_at = now(), lifecycle_event_id = event_id,
      resolution_idempotency_key = clean_key, version = version + 1
  where id = report_row.id returning * into report_row;

  insert into public.admin_audit_logs(
    actor_user_id, actor_email, actor_role, action, resource_type, resource_id,
    report_id, reason, correlation_id, previous_values, new_values, metadata
  ) values (
    actor_id, (select email from auth.users where id = actor_id), actor_role,
    case when clean_state = 'Retired' then 'question.retired' else 'question.restored' end,
    'question', question_row.id::text, report_row.id, clean_reason, clean_key,
    jsonb_build_object('lifecycle_state', case when clean_state = 'Retired' then 'Active' else 'Retired' end),
    jsonb_build_object('lifecycle_state', clean_state),
    jsonb_build_object('lifecycle_event_id', event_id)
  );

  return query select report_row.id, report_row.status, report_row.version,
    question_row.id, question_row.lifecycle_state, question_row.updated_at, event_id;
end;
$$;

-- Replace Milestone 7 submission so active sessions are scored against the
-- protected answer key captured at session start, never a later correction.
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
    count(*) filter (
      where answer.selected_option_id = session_question.correct_option_id_at_start
    )::integer
  into answered_count, correct_count
  from public.test_session_questions session_question
  left join public.test_session_answers answer
    on answer.session_id = session_question.session_id
   and answer.question_id = session_question.question_id
  where session_question.session_id = session_row.id;

  active_seconds := session_row.accumulated_active_seconds
    + greatest(0, floor(extract(epoch from (now() - session_row.active_period_started_at)))::integer);

  update public.test_sessions
  set status = 'submitted', submitted_at = now(),
      accumulated_active_seconds = active_seconds, active_period_started_at = null,
      last_activity_at = now(), version = version + 1, updated_at = now()
  where id = session_row.id returning * into session_row;

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
    session_row.id, session_question.position, session_question.question_id,
    session_question.question_type, session_question.question_text,
    session_question.options, session_question.difficulty, session_question.tags,
    answer.selected_option_id, session_question.correct_option_id_at_start,
    answer.selected_option_id is not null
      and answer.selected_option_id = session_question.correct_option_id_at_start,
    session_question.explanation_at_start,
    session_question.content_hash_at_start
  from public.test_session_questions session_question
  left join public.test_session_answers answer
    on answer.session_id = session_question.session_id
   and answer.question_id = session_question.question_id
  where session_question.session_id = session_row.id
  order by session_question.position;

  insert into public.user_question_status (user_id, question_id, status, seen_count, last_seen_at)
  select actor_id, item.question_id,
    case when item.is_correct then 'Answered correctly' else 'Answered incorrectly' end,
    1, session_row.submitted_at
  from public.test_result_items item where item.session_id = session_row.id
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
    'in_progress', 'submitted', jsonb_build_object('percentage', result_row.percentage)
  );

  return query select result_row.session_id, definition.id, result_row.total_questions,
    result_row.answered_questions, result_row.unanswered_questions,
    result_row.correct_answers, result_row.incorrect_answers,
    result_row.percentage, result_row.active_duration_seconds,
    result_row.submitted_at, public.has_premium_explanation_access(actor_id);
end;
$$;

revoke execute on function public.snapshot_session_question_key() from public;
revoke execute on function public.prevent_append_only_mutation() from public;
revoke execute on function public.submit_question_report(uuid, uuid, text, text, text) from public;
revoke execute on function public.get_own_question_reports(integer, timestamptz, uuid) from public;
revoke execute on function public.search_question_report_queue(integer, timestamptz, uuid, text, text, text, text, text, text, timestamptz, timestamptz) from public;
revoke execute on function public.get_question_report_detail(uuid) from public;
revoke execute on function public.search_admin_audit_logs(integer, timestamptz, uuid, uuid, text, text, text, uuid, timestamptz, timestamptz) from public;
revoke execute on function public.correct_reported_question(uuid, bigint, timestamptz, text, jsonb, text, text, text, text, text, text, text[], text, text, text) from public;
revoke execute on function public.transition_question_report(uuid, bigint, text, text, text, uuid, text, text) from public;
revoke execute on function public.resolve_report_with_question_lifecycle(uuid, bigint, timestamptz, text, text, text, text) from public;

grant execute on function public.submit_question_report(uuid, uuid, text, text, text) to authenticated, service_role;
grant execute on function public.get_own_question_reports(integer, timestamptz, uuid) to authenticated, service_role;
grant execute on function public.search_question_report_queue(integer, timestamptz, uuid, text, text, text, text, text, text, timestamptz, timestamptz) to authenticated, service_role;
grant execute on function public.get_question_report_detail(uuid) to authenticated, service_role;
grant execute on function public.search_admin_audit_logs(integer, timestamptz, uuid, uuid, text, text, text, uuid, timestamptz, timestamptz) to authenticated, service_role;
grant execute on function public.correct_reported_question(uuid, bigint, timestamptz, text, jsonb, text, text, text, text, text, text, text[], text, text, text) to authenticated, service_role;
grant execute on function public.transition_question_report(uuid, bigint, text, text, text, uuid, text, text) to authenticated, service_role;
grant execute on function public.resolve_report_with_question_lifecycle(uuid, bigint, timestamptz, text, text, text, text) to authenticated, service_role;

comment on function public.submit_question_report(uuid, uuid, text, text, text) is
  'Authenticated idempotent question report submission scoped to the caller own test session.';
comment on function public.correct_reported_question(uuid, bigint, timestamptz, text, jsonb, text, text, text, text, text, text, text[], text, text, text) is
  'Staff-only transactional correction, immutable revision, report resolution, and audit workflow.';
comment on function public.resolve_report_with_question_lifecycle(uuid, bigint, timestamptz, text, text, text, text) is
  'Staff-only transactional report resolution using the existing Active/Retired lifecycle.';
