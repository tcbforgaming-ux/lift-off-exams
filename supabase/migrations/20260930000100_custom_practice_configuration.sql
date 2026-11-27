-- Customized practice uses private derived blueprint versions. Approved templates
-- and immutable Test ID membership continue to use the existing generator.
alter table public.blueprint_versions
  add column practice_parent_id uuid references public.blueprint_versions(id) on delete restrict,
  add column practice_owner_id uuid references auth.users(id) on delete set null,
  add column practice_request_hash text;
create unique index blueprint_practice_request_idx
  on public.blueprint_versions(practice_owner_id, practice_request_hash)
  where practice_parent_id is not null;
create policy blueprint_private_practice_visibility
  on public.blueprint_versions as restrictive for all to authenticated
  using (practice_parent_id is null or practice_owner_id = auth.uid())
  with check (practice_parent_id is null);

alter table public.test_ids add column practice_settings jsonb not null default '{}';
alter table public.test_sessions
  add column timer_seconds integer check (timer_seconds between 60 and 59940),
  add column show_answers boolean not null default false,
  add column show_explanations boolean not null default false;

create function public.generate_custom_practice(
  p_blueprint_id uuid, p_expected_version text, p_question_count integer,
  p_difficulties text[], p_topic_tags text[], p_timer_minutes integer,
  p_show_answers boolean, p_show_explanations boolean,
  p_seed text, p_idempotency_key text
)
returns jsonb language plpgsql security definer
set search_path = public, extensions, pg_temp as $$
declare
  actor uuid := auth.uid();
  source jsonb;
  selected_strata jsonb;
  allowed_tags text[];
  selected_tags text[];
  difficulties text[];
  settings jsonb;
  config_hash text;
  derived_id uuid;
  generated record;
begin
  if actor is null then raise exception 'Authentication is required.'; end if;
  if p_question_count is null or p_question_count not between 1 and 250 then
    raise exception 'Question count must be between 1 and 250.';
  end if;
  if p_timer_minutes is not null and p_timer_minutes not between 1 and 999 then
    raise exception 'Timer must be between 1 and 999 minutes.';
  end if;
  if nullif(btrim(p_idempotency_key), '') is null or length(p_idempotency_key) > 128 then
    raise exception 'A valid idempotency key is required.';
  end if;
  if not exists (select 1 from public.blueprint_versions
    where id = p_blueprint_id and practice_parent_id is null) then
    raise exception 'Select an approved blueprint template.';
  end if;
  if (coalesce(p_show_answers, false) or coalesce(p_show_explanations, false))
    and not public.has_premium_explanation_access(actor) then
    raise exception 'Study mode requires premium access.';
  end if;
  source := public.canonicalize_test_blueprint(p_blueprint_id, p_expected_version);
  difficulties := public.normalize_test_difficulties(p_difficulties);
  if cardinality(difficulties) = 0 then raise exception 'Select at least one difficulty.'; end if;
  select coalesce(array_agg(distinct tag order by tag), '{}') into allowed_tags
    from jsonb_array_elements(source->'strata') s,
    jsonb_array_elements_text(s->'tags') tag;
  select coalesce(array_agg(distinct tag order by tag), '{}') into selected_tags
    from unnest(coalesce(p_topic_tags, '{}')) tag;
  if not selected_tags <@ allowed_tags then
    raise exception 'Topic tags must belong to the selected blueprint.';
  end if;
  if cardinality(allowed_tags) > 0 and cardinality(selected_tags) = 0 then
    raise exception 'Select at least one topic.';
  end if;

  -- Topic selection chooses strata (OR across topics); each stratum retains its
  -- existing AND tag semantics and all indicator/type/exclusion constraints.
  -- Largest-remainder allocation scales approved proportions to the exact count.
  with eligible as (
    select s, (s->>'count')::numeric as weight,
      case when jsonb_array_length(s->'difficulties') = 0 then difficulties
        else array(select value from (
          select jsonb_array_elements_text(s->'difficulties') as value
          intersect select unnest(difficulties)
        ) intersection_values order by value) end as ds
    from jsonb_array_elements(source->'strata') s
    where cardinality(selected_tags) = 0
       or jsonb_array_length(s->'tags') = 0
       or array(select jsonb_array_elements_text(s->'tags')) && selected_tags
  ), weighted as (
    select *, p_question_count * weight / sum(weight) over () as quota
    from eligible where cardinality(ds) > 0
  ), ranked as (
    select *, row_number() over (order by quota - floor(quota) desc, s->>'id') as rank,
      p_question_count - sum(floor(quota)) over () as remainder from weighted
  ), allocated as (
    select s || jsonb_build_object('count', floor(quota)::integer + case when rank <= remainder then 1 else 0 end,
      'difficulties', to_jsonb(ds)) as item from ranked
  ) select jsonb_agg(item order by item->>'id') into selected_strata
    from allocated where (item->>'count')::integer > 0;
  if selected_strata is null then raise exception 'No blueprint topics match these difficulties.'; end if;
  settings := jsonb_build_object('timer_minutes', p_timer_minutes,
    'show_answers', coalesce(p_show_answers, false),
    'show_explanations', coalesce(p_show_explanations, false));
  config_hash := encode(extensions.digest(source::text || selected_strata::text || settings::text, 'sha256'), 'hex');
  perform pg_advisory_xact_lock(hashtextextended(actor::text || config_hash, 0));
  select id into derived_id from public.blueprint_versions
    where practice_owner_id = actor and practice_request_hash = config_hash;
  if derived_id is null then
    derived_id := gen_random_uuid();
    insert into public.blueprint_versions(id, blueprint_name, cluster, level, category,
      version, distribution, total_questions, change_reason, created_by,
      practice_parent_id, practice_owner_id, practice_request_hash)
    values (derived_id, source->>'blueprint_name', source->>'cluster', source->>'level', source->>'category',
      'practice-' || derived_id::text,
      jsonb_build_object('schema_version', 1, 'strata', selected_strata), p_question_count,
      'Private practice configuration based on ' || (source->>'blueprint_version'), actor,
      p_blueprint_id, actor, config_hash);
  end if;
  select * into generated from public.generate_test_from_blueprint(
    derived_id, 'practice-' || derived_id::text, p_question_count, p_seed, p_idempotency_key);
  if generated.success then
    update public.test_ids set practice_settings = settings,
      blueprint_snapshot = blueprint_snapshot || jsonb_build_object('practice_source', source),
      generation_metadata = generation_metadata || jsonb_build_object('practice_settings', settings,
        'source_blueprint_id', p_blueprint_id, 'source_blueprint_version', p_expected_version)
    where id = generated.test_id;
  end if;
  return to_jsonb(generated);
end;
$$;

create function public.snapshot_practice_settings() returns trigger
language plpgsql security definer set search_path = public as $$
declare config jsonb;
begin
  select practice_settings into config from public.test_ids where definition_id = new.test_definition_id;
  new.timer_seconds := (config->>'timer_minutes')::integer * 60;
  new.show_answers := coalesce((config->>'show_answers')::boolean, false)
    and public.has_premium_explanation_access(new.user_id);
  new.show_explanations := coalesce((config->>'show_explanations')::boolean, false)
    and public.has_premium_explanation_access(new.user_id);
  return new;
end;
$$;
create trigger test_session_practice_settings before insert on public.test_sessions
  for each row execute function public.snapshot_practice_settings();

create function public.enforce_practice_deadline() returns trigger
language plpgsql security definer set search_path = public as $$
declare s public.test_sessions%rowtype;
begin
  select * into s from public.test_sessions where id = new.session_id for update;
  if s.timer_seconds is not null and s.accumulated_active_seconds +
    greatest(0, extract(epoch from (now() - s.active_period_started_at))::integer) >= s.timer_seconds then
    raise exception 'Time has expired. Submit this test to view your results.';
  end if;
  return new;
end;
$$;
create trigger test_answer_deadline before insert or update on public.test_session_answers
  for each row execute function public.enforce_practice_deadline();

create function public.enforce_practice_clock() returns trigger
language plpgsql security definer set search_path = public as $$
declare elapsed integer;
begin
  if old.timer_seconds is null then return new; end if;
  elapsed := old.accumulated_active_seconds + case when old.status = 'in_progress'
    then greatest(0, extract(epoch from (now() - old.active_period_started_at))::integer) else 0 end;
  if elapsed >= old.timer_seconds and new.status <> 'submitted' then
    raise exception 'Time has expired. Submit this test to view your results.';
  end if;
  if new.status = 'submitted' then
    new.accumulated_active_seconds := least(new.accumulated_active_seconds, old.timer_seconds);
  end if;
  return new;
end;
$$;
create trigger test_session_practice_clock before update on public.test_sessions
  for each row execute function public.enforce_practice_clock();

create function public.clamp_practice_result_duration() returns trigger
language plpgsql security definer set search_path = public as $$
declare seconds integer;
begin
  select timer_seconds into seconds from public.test_sessions where id = new.session_id;
  if seconds is not null then new.active_duration_seconds := least(new.active_duration_seconds, seconds); end if;
  return new;
end;
$$;
create trigger test_result_practice_duration before insert on public.test_results
  for each row execute function public.clamp_practice_result_duration();

create function public.get_practice_session_settings(p_session_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.test_sessions%rowtype; elapsed integer;
begin
  select * into s from public.test_sessions where id = p_session_id and user_id = auth.uid() for update;
  if not found then raise exception 'Session not found.'; end if;
  elapsed := s.accumulated_active_seconds + case when s.status = 'in_progress'
    then greatest(0, extract(epoch from (now() - s.active_period_started_at))::integer) else 0 end;
  if s.timer_seconds is not null and elapsed >= s.timer_seconds and s.status = 'in_progress' then
    perform public.submit_test_session(s.id, s.version);
    s.status := 'submitted';
  end if;
  return jsonb_build_object('timer_seconds', s.timer_seconds, 'active_duration_seconds', elapsed,
    'status', s.status, 'show_answers', s.show_answers, 'show_explanations', s.show_explanations);
end;
$$;

create function public.get_practice_feedback(p_session_id uuid, p_question_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.test_sessions%rowtype; q public.test_session_questions%rowtype;
begin
  select * into s from public.test_sessions where id = p_session_id and user_id = auth.uid();
  if not found then raise exception 'Session not found.'; end if;
  if not public.has_premium_explanation_access(auth.uid()) then raise exception 'Premium access is required.'; end if;
  if not (s.show_answers or s.show_explanations) then raise exception 'Study mode is not enabled.'; end if;
  if not exists(select 1 from public.test_session_answers where session_id = s.id and question_id = p_question_id) then
    raise exception 'Answer this question before reviewing feedback.';
  end if;
  select * into q from public.test_session_questions where session_id = s.id and question_id = p_question_id;
  return jsonb_build_object('correct_option_id', case when s.show_answers then q.correct_option_id_at_start end,
    'explanation', case when s.show_explanations then q.explanation_at_start end);
end;
$$;

revoke all on function public.snapshot_practice_settings() from public;
revoke all on function public.enforce_practice_deadline() from public;
revoke all on function public.enforce_practice_clock() from public;
revoke all on function public.clamp_practice_result_duration() from public;
revoke all on function public.generate_custom_practice(uuid,text,integer,text[],text[],integer,boolean,boolean,text,text) from public;
revoke all on function public.get_practice_session_settings(uuid) from public;
revoke all on function public.get_practice_feedback(uuid,uuid) from public;
grant execute on function public.generate_custom_practice(uuid,text,integer,text[],text[],integer,boolean,boolean,text,text) to authenticated;
grant execute on function public.get_practice_session_settings(uuid) to authenticated;
grant execute on function public.get_practice_feedback(uuid,uuid) to authenticated;
