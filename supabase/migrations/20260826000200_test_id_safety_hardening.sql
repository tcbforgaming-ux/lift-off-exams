-- Milestone 6 safety hardening. This migration is additive and intentionally
-- repeats the question-table revocation so environments with a prior manual
-- Dashboard change converge on the same permissions.

alter table public.test_ids
add column if not exists content_policy text not null default 'current_with_warning';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'test_ids_content_policy_check'
      and conrelid = 'public.test_ids'::regclass
  ) then
    alter table public.test_ids
    add constraint test_ids_content_policy_check
    check (content_policy in ('current_with_warning'));
  end if;
end;
$$;

comment on column public.test_ids.content_policy is
  'Test IDs preserve membership and order. Launch uses current question content and reports post-generation edits.';

drop policy if exists questions_select_active_public on public.questions;
revoke all on public.questions from anon, authenticated;
grant select, insert on public.questions to authenticated;

comment on table public.questions is
  'Server-owned question repository. Browser access must use bounded RPCs; direct rows include protected answer and explanation data.';

create table public.legacy_test_id_resolutions (
  legacy_test_id text primary key references public.test_ids(id) on delete restrict,
  resolution_status text not null
    check (resolution_status in ('Backfilled', 'Replaced', 'Retired')),
  replacement_test_id text references public.test_ids(id) on delete restrict,
  reason text not null,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (resolution_status = 'Replaced' and replacement_test_id is not null)
    or (resolution_status in ('Backfilled', 'Retired') and replacement_test_id is null)
  ),
  check (replacement_test_id is null or replacement_test_id <> legacy_test_id)
);

comment on table public.legacy_test_id_resolutions is
  'Audited disposition of pre-Milestone-6 Test IDs. Exact membership is never inferred when the ordered source list is unavailable.';

create trigger legacy_test_id_resolutions_set_updated_at
before update on public.legacy_test_id_resolutions
for each row execute function public.set_updated_at();

alter table public.legacy_test_id_resolutions enable row level security;

create policy legacy_test_id_resolutions_staff_select
on public.legacy_test_id_resolutions
for select
to authenticated
using (public.is_admin());

revoke all on public.legacy_test_id_resolutions from anon, authenticated;
grant select on public.legacy_test_id_resolutions to authenticated;
grant all privileges on public.legacy_test_id_resolutions to service_role;

create or replace function public.has_premium_explanation_access(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_user_id is not null
    and (
      public.is_admin()
      or exists (
        select 1
        from public.subscriptions subscription
        where subscription.user_id = p_user_id
          and subscription.status in ('active', 'trialing')
          and (
            subscription.current_period_end is null
            or subscription.current_period_end > now()
          )
      )
    );
$$;

create or replace function public.get_test_question_explanation(
  p_test_id text,
  p_question_id uuid
)
returns table (
  question_id uuid,
  explanation text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to retrieve explanations.';
  end if;

  if not public.has_premium_explanation_access(auth.uid()) then
    raise exception 'Premium access is required to retrieve explanations.';
  end if;

  if not exists (
    select 1
    from public.test_ids generated
    join public.test_definition_questions membership
      on membership.test_definition_id = generated.definition_id
    where generated.id = upper(btrim(p_test_id))
      and generated.generation_status = 'Ready'
      and membership.question_id = p_question_id
  ) then
    raise exception 'Question is not part of this launchable Test ID.';
  end if;

  return query
  select question.id, question.explanation
  from public.questions question
  where question.id = p_question_id;
end;
$$;

create or replace function public.backfill_legacy_test_membership(
  p_legacy_test_id text,
  p_ordered_question_ids uuid[],
  p_reason text
)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  actor_id uuid := auth.uid();
  legacy_row public.test_ids%rowtype;
  clean_reason text := btrim(coalesce(p_reason, ''));
  supplied_count integer := coalesce(cardinality(p_ordered_question_ids), 0);
  inserted_count integer;
begin
  if not public.is_admin() or actor_id is null then
    raise exception 'Administrator or Owner access is required for legacy Test ID backfill.';
  end if;

  if length(clean_reason) < 10 then
    raise exception 'A backfill reason of at least 10 characters is required.';
  end if;

  select *
  into legacy_row
  from public.test_ids
  where id = upper(btrim(p_legacy_test_id))
  for update;

  if not found then
    raise exception 'Legacy Test ID was not found.';
  end if;

  if legacy_row.generation_status <> 'Legacy' then
    raise exception 'Only unresolved Legacy Test IDs can be backfilled.';
  end if;

  if supplied_count <> legacy_row.question_count then
    raise exception 'Ordered question count must equal the original Test ID question count.';
  end if;

  if supplied_count < 1 or supplied_count > 250 then
    raise exception 'Legacy membership must contain between 1 and 250 questions.';
  end if;

  if (
    select count(distinct question_id)
    from unnest(p_ordered_question_ids) question_id
  ) <> supplied_count then
    raise exception 'Legacy membership cannot contain duplicate question IDs.';
  end if;

  if (
    select count(*)
    from public.questions question
    where question.id = any(p_ordered_question_ids)
  ) <> supplied_count then
    raise exception 'Every legacy membership question must exist in the repository.';
  end if;

  insert into public.test_definition_questions (
    test_definition_id,
    question_id,
    position,
    stratum_id,
    content_hash,
    question_updated_at
  )
  select
    legacy_row.definition_id,
    question.id,
    ordered.ordinality::integer,
    'legacy-backfill',
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
  from unnest(p_ordered_question_ids) with ordinality ordered(question_id, ordinality)
  join public.questions question on question.id = ordered.question_id
  order by ordered.ordinality;

  get diagnostics inserted_count = row_count;

  update public.test_ids
  set generation_status = 'Ready',
      selected_question_count = inserted_count,
      algorithm_version = 'legacy-membership-v1',
      eligibility_rule_version = 'legacy-current-snapshot-v1',
      canonical_seed = coalesce(canonical_seed, id),
      content_policy = 'current_with_warning',
      completed_at = now(),
      generation_metadata = generation_metadata || jsonb_build_object(
        'legacy_backfilled_at', now(),
        'legacy_backfilled_by', actor_id,
        'legacy_backfill_reason', clean_reason
      )
  where definition_id = legacy_row.definition_id;

  insert into public.legacy_test_id_resolutions (
    legacy_test_id,
    resolution_status,
    reason,
    resolved_by
  )
  values (
    legacy_row.id,
    'Backfilled',
    clean_reason,
    actor_id
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
    'Legacy Test ID backfilled',
    'test_id',
    legacy_row.id,
    clean_reason,
    jsonb_build_object('question_count', inserted_count)
  );

  return inserted_count;
end;
$$;

create or replace function public.resolve_legacy_test_id(
  p_legacy_test_id text,
  p_resolution_status text,
  p_replacement_test_id text default null,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  legacy_row public.test_ids%rowtype;
  normalized_status text := initcap(lower(btrim(coalesce(p_resolution_status, ''))));
  normalized_replacement text := nullif(upper(btrim(coalesce(p_replacement_test_id, ''))), '');
  clean_reason text := btrim(coalesce(p_reason, ''));
begin
  if not public.is_admin() or actor_id is null then
    raise exception 'Administrator or Owner access is required to resolve legacy Test IDs.';
  end if;

  if normalized_status not in ('Replaced', 'Retired') then
    raise exception 'Legacy resolution must be Replaced or Retired.';
  end if;

  if length(clean_reason) < 10 then
    raise exception 'A resolution reason of at least 10 characters is required.';
  end if;

  select *
  into legacy_row
  from public.test_ids
  where id = upper(btrim(p_legacy_test_id))
  for update;

  if not found then
    raise exception 'Legacy Test ID was not found.';
  end if;

  if legacy_row.generation_status <> 'Legacy' then
    raise exception 'Only unresolved Legacy Test IDs can use this workflow.';
  end if;

  if normalized_status = 'Replaced' then
    if normalized_replacement is null or normalized_replacement = legacy_row.id then
      raise exception 'A different replacement Test ID is required.';
    end if;

    if not exists (
      select 1
      from public.test_ids replacement
      where replacement.id = normalized_replacement
        and replacement.generation_status = 'Ready'
        and replacement.selected_question_count = replacement.question_count
    ) then
      raise exception 'Replacement Test ID must be a complete Ready definition.';
    end if;
  elsif normalized_replacement is not null then
    raise exception 'Retired legacy Test IDs cannot specify a replacement.';
  end if;

  update public.test_ids
  set generation_status = 'Retired',
      retired_at = now(),
      content_policy = 'current_with_warning',
      generation_metadata = generation_metadata || jsonb_build_object(
        'legacy_resolution', normalized_status,
        'legacy_resolved_at', now(),
        'legacy_resolved_by', actor_id
      )
  where definition_id = legacy_row.definition_id;

  insert into public.legacy_test_id_resolutions (
    legacy_test_id,
    resolution_status,
    replacement_test_id,
    reason,
    resolved_by
  )
  values (
    legacy_row.id,
    normalized_status,
    normalized_replacement,
    clean_reason,
    actor_id
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
    'Legacy Test ID ' || lower(normalized_status),
    'test_id',
    legacy_row.id,
    clean_reason,
    jsonb_build_object('replacement_test_id', normalized_replacement)
  );
end;
$$;

drop function if exists public.get_test_id_preview(text);

create function public.get_test_id_preview(p_test_id text)
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
  authentication_required_to_launch boolean,
  launch_available boolean,
  content_policy text,
  legacy_resolution_status text,
  replacement_test_id text
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
    coalesce((
      select count(*)::integer
      from public.test_definition_questions membership
      join public.questions question on question.id = membership.question_id
      where membership.test_definition_id = generated.definition_id
        and (
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
        )
    ), 0),
    true,
    generated.generation_status = 'Ready'
      and generated.selected_question_count = generated.question_count,
    generated.content_policy,
    resolution.resolution_status,
    resolution.replacement_test_id
  from public.test_ids generated
  left join public.legacy_test_id_resolutions resolution
    on resolution.legacy_test_id = generated.id
  where generated.id = upper(btrim(p_test_id))
    and generated.generation_status in ('Legacy', 'Ready', 'Retired');
$$;

-- The importer uses `completed` while pages remain and `imported` after the
-- output file is fully consumed. Replace only status-related checks so older
-- remote table definitions converge safely.
do $$
declare
  constraint_row record;
begin
  for constraint_row in
    select conname
    from pg_constraint
    where conrelid = 'public.deca_batch_jobs'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format(
      'alter table public.deca_batch_jobs drop constraint %I',
      constraint_row.conname
    );
  end loop;
end;
$$;

alter table public.deca_batch_jobs
add constraint deca_batch_jobs_status_check
check (
  status in (
    'building',
    'built',
    'validating',
    'in_progress',
    'finalizing',
    'completed',
    'imported',
    'failed',
    'cancelled',
    'expired'
  )
);

revoke execute on function public.has_premium_explanation_access(uuid) from public;
revoke execute on function public.get_test_question_explanation(text, uuid) from public;
revoke execute on function public.backfill_legacy_test_membership(text, uuid[], text) from public;
revoke execute on function public.resolve_legacy_test_id(text, text, text, text) from public;
revoke execute on function public.get_test_id_preview(text) from public;

grant execute on function public.has_premium_explanation_access(uuid)
to service_role;
grant execute on function public.get_test_question_explanation(text, uuid)
to authenticated, service_role;
grant execute on function public.backfill_legacy_test_membership(text, uuid[], text)
to authenticated, service_role;
grant execute on function public.resolve_legacy_test_id(text, text, text, text)
to authenticated, service_role;
grant execute on function public.get_test_id_preview(text)
to anon, authenticated, service_role;

comment on function public.get_test_question_explanation(text, uuid) is
  'Premium-or-staff explanation access for a question proven to belong to a complete Ready Test ID.';
comment on function public.backfill_legacy_test_membership(text, uuid[], text) is
  'Staff-only exact-order legacy backfill. Never reconstructs or guesses missing membership.';
comment on function public.resolve_legacy_test_id(text, text, text, text) is
  'Staff-only audited retirement or replacement mapping for unrecoverable Legacy Test IDs.';
