-- Forward-only repair for F01/F02/F20. Do not edit the applied baseline.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create function private.assert_server_context()
returns void language plpgsql security invoker
set search_path = pg_catalog as $$
begin
  -- SET ROLE remains visible across SECURITY DEFINER calls. A browser claim or
  -- auth.uid() alone must never confer maintenance authority. Direct SQL by a
  -- privileged migration operator remains supported, including existing fixtures.
  if current_setting('role', true) = 'service_role' then return; end if;
  if current_setting('role', true) = 'none' and exists (
    select 1 from pg_roles where rolname = session_user
      and (rolsuper or rolbypassrls)
  ) then return; end if;
  raise exception 'Trusted server execution context required' using errcode = '42501';
end;
$$;
revoke all on function private.assert_server_context() from public, anon, authenticated;

-- Preserve each existing implementation, signature, return type and defaults.
-- Inject only the authorization precondition, before its first PL/pgSQL BEGIN.
-- Fail rather than silently patch an unexpected language/body.
do $$
declare signature text; routine regprocedure; source text; definition text;
begin
  foreach signature in array array[
    'public.bootstrap_initial_owner(uuid,text)',
    'public.build_deca_batch_jsonl(integer)',
    'public.insert_generated_questions(text,jsonb)',
    'public.insert_generated_questions(uuid,jsonb,text)',
    'public.mark_inactive_owners(timestamptz)',
    'public.recalculate_generation_queue_needed(integer)'
  ] loop
    routine := signature::regprocedure;
    select p.prosrc into source from pg_proc p join pg_language l on l.oid = p.prolang
      where p.oid = routine and l.lanname = 'plpgsql';
    if source is null or source !~ '\mbegin\M' then
      raise exception 'Unexpected maintenance implementation: %', signature;
    end if;
    definition := pg_get_functiondef(routine);
    definition := replace(definition, source,
      regexp_replace(source, '\mbegin\M',
        E'begin\n  perform private.assert_server_context();'));
    execute definition;
    execute format('alter function %s set search_path = pg_catalog, public, extensions, pg_temp', routine);
  end loop;
end;
$$;

-- These are internal writers, not public audit APIs. SECURITY INVOKER is
-- deliberate: an audited SECURITY DEFINER wrapper supplies table-owner rights,
-- while accidentally re-granting EXECUTE cannot elevate a browser role.
alter function public.write_admin_audit(text,text,text,text,jsonb) security invoker;
alter function public.write_admin_audit(text,text,text,text,jsonb)
  set search_path = pg_catalog, public, auth, pg_temp;

create or replace function public.write_test_session_audit(
  p_action text, p_session_id uuid, p_test_id text,
  p_previous_state text, p_new_state text, p_metadata jsonb default '{}'
) returns void language plpgsql security invoker
set search_path = pg_catalog, public, pg_temp as $$
begin
  if not exists (select 1 from pg_roles where rolname = current_user
      and (rolsuper or rolbypassrls)) and current_user <> (
    select pg_get_userbyid(relowner) from pg_class
      where oid = 'public.admin_audit_logs'::regclass
  ) then
    raise exception 'Trusted audit writer required' using errcode = '42501';
  end if;
  insert into public.admin_audit_logs (
    actor_user_id, action, resource_type, resource_id, reason, metadata
  ) values (
    auth.uid(), p_action, 'test_session', p_session_id::text,
    'Trusted test-session lifecycle event',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'test_id', p_test_id, 'previous_state', p_previous_state, 'new_state', p_new_state
    )
  );
end;
$$;

-- Explicit API allowlist. Student/admin/owner share the authenticated database
-- role; staff/owner RPCs retain their existing trusted profile checks.
do $$
declare routine record;
  public_read text[] := array['current_user_role','is_admin','is_owner','get_test_id_preview'];
  browser_rpc text[] := array[
    'current_team_role','can_admin_team','can_manage_team','accept_team_invite',
    'get_active_owner_count','is_eligible_owner','get_owner_removal_required_approvals',
    'set_user_platform_role','initiate_owner_removal_vote','cast_owner_removal_vote',
    'withdraw_owner_removal_vote','expire_owner_removal_votes','set_own_owner_privileges_suspended',
    'publish_generated_question','search_question_repository','set_question_lifecycle_state',
    'is_question_eligible_for_test_generation','search_generation_pipeline',
    'canonicalize_test_blueprint','generate_test_from_blueprint','get_generated_test_manifest',
    'get_test_question_explanation','backfill_legacy_test_membership','resolve_legacy_test_id',
    'start_test_session','get_test_session','save_test_session_answer','set_test_session_position',
    'pause_test_session','resume_test_session','submit_test_session','get_test_result',
    'get_test_result_explanations','get_test_history','submit_question_report',
    'get_own_question_reports','search_question_report_queue','get_question_report_detail',
    'search_admin_audit_logs','correct_reported_question','transition_question_report',
    'resolve_report_with_question_lifecycle','generate_custom_practice',
    'get_practice_session_settings','get_practice_feedback'
  ];
begin
  -- Only application routines, not extension-owned routines in public.
  for routine in select p.oid::regprocedure as signature, p.proname, p.prorettype
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f' and not exists (
      select 1 from pg_depend d where d.classid = 'pg_proc'::regclass
        and d.objid = p.oid and d.deptype = 'e'
    )
  loop
    execute format('revoke all on function %s from public, anon, authenticated', routine.signature);
    if routine.proname = any(public_read) then
      execute format('grant execute on function %s to anon, authenticated', routine.signature);
    elsif routine.proname = any(browser_rpc) then
      execute format('grant execute on function %s to authenticated', routine.signature);
    end if;
    -- Trigger entry points are not RPCs; execution via triggers is unaffected.
    if routine.prorettype <> 'trigger'::regtype then
      execute format('grant execute on function %s to service_role', routine.signature);
    end if;
  end loop;
end;
$$;

-- Known optional hosted signature is covered above if present. Do not invent
-- its body or create the nine undocumented staging/review tables.
comment on schema private is 'Non-API security helpers; not an exposed PostgREST schema.';

-- Supabase installations may carry BOTH global and public-schema default ACLs.
-- Repair actual object creators plus the applying migration role, not a guessed
-- deployment username. Future API access must be explicitly granted.
do $$
declare creator record;
begin
  for creator in
    select distinct r.rolname from pg_roles r where r.oid in (
      select p.proowner from pg_proc p where p.pronamespace = 'public'::regnamespace
        and not exists (select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e')
      union select c.relowner from pg_class c where c.relnamespace = 'public'::regnamespace
        and not exists (select 1 from pg_depend d where d.classid='pg_class'::regclass and d.objid=c.oid and d.deptype='e')
      union select oid from pg_roles where rolname = current_user
    ) and r.rolname not in ('anon','authenticated','service_role','authenticator')
  loop
    execute format('alter default privileges for role %I revoke execute on functions from public, anon, authenticated', creator.rolname);
    execute format('alter default privileges for role %I in schema public revoke execute on functions from public, anon, authenticated', creator.rolname);
    execute format('alter default privileges for role %I revoke all on tables from public, anon, authenticated', creator.rolname);
    execute format('alter default privileges for role %I in schema public revoke all on tables from public, anon, authenticated', creator.rolname);
  end loop;
end;
$$;

-- Table-wide and independently granted column ACLs must BOTH be removed.
revoke insert, update, delete, truncate, references, trigger on public.profiles from public, anon, authenticated;
do $$
declare columns text;
begin
  select string_agg(quote_ident(attname), ', ') into columns from pg_attribute
    where attrelid = 'public.profiles'::regclass and attnum > 0 and not attisdropped;
  execute format('revoke insert (%s), update (%s), references (%s) on public.profiles from public, anon, authenticated', columns, columns, columns);
end;
$$;
grant update(display_name, phone) on public.profiles to authenticated;
drop policy profiles_update_own_basic_student on public.profiles;
drop policy profiles_update_owner on public.profiles;
create policy profiles_update_own_basic on public.profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke insert, update, delete, truncate, references, trigger on public.admin_audit_logs from public, anon, authenticated;
do $$
declare columns text;
begin
  select string_agg(quote_ident(attname), ', ') into columns from pg_attribute
    where attrelid = 'public.admin_audit_logs'::regclass and attnum > 0 and not attisdropped;
  execute format('revoke insert (%s), update (%s), references (%s) on public.admin_audit_logs from public, anon, authenticated', columns, columns, columns);
end;
$$;
