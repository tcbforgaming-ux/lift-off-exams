-- Launch options belong to an attempt, never the shared Test ID. November 3
-- decision: a shorter attempt is the first N persisted members, in source order.
alter table public.test_sessions add column launch_config jsonb;

create function private.resolve_test_launch(p_test_id text,p_options jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare d public.test_ids%rowtype; paid boolean; n integer; minutes integer;
 answers boolean:=false; explanations boolean:=false; config jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  select * into d from public.test_ids where id=upper(btrim(p_test_id)) and generation_status='Ready';
  if not found then raise exception 'Ready Test ID not found.'; end if;
  paid:=public.has_premium_explanation_access(auth.uid());
  if p_options is not null and (jsonb_typeof(p_options)<>'object' or exists(
    select 1 from jsonb_object_keys(p_options) k where k not in ('question_count','timer_minutes','show_answers','show_explanations'))) then
    raise exception 'Invalid launch options.';
  end if;
  if not paid and coalesce(p_options,'{}')<>'{}'::jsonb then
    raise exception 'An active premium subscription is required to customize a shared Test ID.';
  end if;
  n:=case when paid then d.question_count else least(40,d.question_count) end;
  config:=case when paid then coalesce(d.practice_settings,'{}') else '{}'::jsonb end;
  minutes:=case when config ? 'timer_minutes' then (config->>'timer_minutes')::integer else 60 end;
  answers:=paid and coalesce((config->>'show_answers')::boolean,false);
  explanations:=paid and coalesce((config->>'show_explanations')::boolean,false);
  if p_options ? 'question_count' then
    if jsonb_typeof(p_options->'question_count')<>'number' or (p_options->>'question_count')!~'^[0-9]+$' then
      raise exception 'Question count must be a whole number.'; end if;
    n:=(p_options->>'question_count')::integer;
  end if;
  if p_options ? 'timer_minutes' then
    if p_options->'timer_minutes'<>'null'::jsonb and
      (jsonb_typeof(p_options->'timer_minutes')<>'number' or (p_options->>'timer_minutes')!~'^[0-9]+$') then
      raise exception 'Timer must be a whole number from 1 to 999 minutes, or null for no timer.'; end if;
    minutes:=(p_options->>'timer_minutes')::integer;
  end if;
  if p_options ? 'show_answers' then
    if jsonb_typeof(p_options->'show_answers')<>'boolean' then raise exception 'Study settings must be boolean.'; end if;
    answers:=(p_options->>'show_answers')::boolean;
  end if;
  if p_options ? 'show_explanations' then
    if jsonb_typeof(p_options->'show_explanations')<>'boolean' then raise exception 'Study settings must be boolean.'; end if;
    explanations:=(p_options->>'show_explanations')::boolean;
  end if;
  if n<1 or n>least(d.question_count,250) or n is null then raise exception 'Question count is outside this Test ID membership.'; end if;
  if minutes is not null and minutes not between 1 and 999 then raise exception 'Timer must be between 1 and 999 minutes.'; end if;
  return jsonb_build_object('question_count',n,'timer_minutes',minutes,'show_answers',answers,
    'show_explanations',explanations,'can_customize',paid,'selection','source_prefix_v1');
end;
$$;
revoke all on function private.resolve_test_launch(text,jsonb) from public,anon,authenticated,service_role;

create function public.get_test_launch_options(p_test_id text) returns jsonb
language sql security definer set search_path=pg_catalog,public,pg_temp as $$
 select private.resolve_test_launch(p_test_id,null);
$$;

-- Clone the reviewed transaction rather than reconstructing its locking,
-- idempotency, membership-snapshot and audit implementation. Fail closed if its
-- anchors differ. The private clone receives only server-resolved settings.
do $$
declare original text; configured text; body text; anchor text;
begin
  original:=pg_get_functiondef('public.start_test_session(text,text)'::regprocedure);
  select prosrc into body from pg_proc where oid='public.start_test_session(text,text)'::regprocedure;
  configured:=replace(original,'public.start_test_session(p_test_id text, p_idempotency_key text)',
    'private.start_configured_session(p_test_id text, p_idempotency_key text, p_launch jsonb)');
  if configured=original then raise exception 'Unexpected start function signature'; end if;
  anchor:='  insert into public.test_sessions (';
  if strpos(configured,anchor)=0 then raise exception 'Unexpected session insert'; end if;
  configured:=replace(configured,anchor,'  member_count:=(p_launch->>''question_count'')::integer;'||chr(10)||anchor);
  configured:=replace(configured,E'    idempotency_key\n  )',E'    idempotency_key, launch_config\n  )');
  configured:=replace(configured,E'    normalized_key\n  )',E'    normalized_key, p_launch\n  )');
  configured:=replace(configured,'where membership.test_definition_id = definition.definition_id'||chr(10)||'  order by membership.position;',
    'where membership.test_definition_id = definition.definition_id and membership.position<=member_count'||chr(10)||'  order by membership.position;');
  configured:=replace(configured,'if existing_session.test_definition_id <> definition.definition_id then',
    'if existing_session.launch_config is not null and existing_session.launch_config is distinct from p_launch then raise exception ''Idempotency key was already used for different launch settings.''; end if;'||chr(10)||'    if existing_session.test_definition_id <> definition.definition_id then');
  execute configured;
  execute replace(original,body,$wrapper$begin
    return query select * from private.start_configured_session(p_test_id,p_idempotency_key,private.resolve_test_launch(p_test_id,null));
  end;$wrapper$);
end;
$$;
revoke all on function private.start_configured_session(text,text,jsonb) from public,anon,authenticated,service_role;

create or replace function public.snapshot_practice_settings() returns trigger
language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
begin
  -- No creator setting is copied into another user's free attempt.
  new.timer_seconds:=(new.launch_config->>'timer_minutes')::integer*60;
  new.show_answers:=coalesce((new.launch_config->>'show_answers')::boolean,false)
    and public.has_premium_explanation_access(new.user_id);
  new.show_explanations:=coalesce((new.launch_config->>'show_explanations')::boolean,false)
    and public.has_premium_explanation_access(new.user_id);
  return new;
end;
$$;

create function public.start_test_session_configured(p_test_id text,p_idempotency_key text,p_options jsonb default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare result record;
begin
  select * into result from private.start_configured_session(p_test_id,p_idempotency_key,private.resolve_test_launch(p_test_id,p_options));
  return to_jsonb(result);
end;
$$;
revoke all on function public.get_test_launch_options(text),public.start_test_session_configured(text,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.get_test_launch_options(text),public.start_test_session_configured(text,text,jsonb) to authenticated;
