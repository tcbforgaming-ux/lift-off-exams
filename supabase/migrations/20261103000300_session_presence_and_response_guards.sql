-- The legacy two-argument endpoints must not bypass generation fencing after a
-- modern tab has acquired a claim. Private implementations retain compatibility.
alter function public.heartbeat_test_session(uuid,uuid) set schema private;
alter function public.release_test_session(uuid,uuid) set schema private;
do $$
declare routine regprocedure; definition text;
begin
  foreach routine in array array['public.heartbeat_test_session(uuid,uuid,bigint)'::regprocedure,
    'public.release_test_session(uuid,uuid,bigint)'::regprocedure] loop
    definition:=pg_get_functiondef(routine);
    definition:=replace(definition,'public.heartbeat_test_session(p_session_id,p_client_id)','private.heartbeat_test_session(p_session_id,p_client_id)');
    definition:=replace(definition,'public.release_test_session(p_session_id,p_client_id)','private.release_test_session(p_session_id,p_client_id)');
    execute definition;
  end loop;
end;
$$;
revoke all on function private.heartbeat_test_session(uuid,uuid),private.release_test_session(uuid,uuid) from public,anon,authenticated,service_role;
create function public.heartbeat_test_session(p_session_id uuid,p_client_id uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
begin
  if exists(select 1 from public.test_sessions where id=p_session_id and user_id=auth.uid() and presence_generation>0) then
    raise exception 'Presence generation is required. Reload the current attempt.'; end if;
  return private.heartbeat_test_session(p_session_id,p_client_id);
end;
$$;
create function public.release_test_session(p_session_id uuid,p_client_id uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
begin
  if exists(select 1 from public.test_sessions where id=p_session_id and user_id=auth.uid() and presence_generation>0) then
    raise exception 'Presence generation is required. Reload the current attempt.'; end if;
  return private.release_test_session(p_session_id,p_client_id);
end;
$$;
revoke all on function public.heartbeat_test_session(uuid,uuid),public.release_test_session(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.heartbeat_test_session(uuid,uuid),public.release_test_session(uuid,uuid) to authenticated;

create function public.clear_test_session_answer(p_session_id uuid,p_question_id uuid,p_expected_session_version bigint)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare s public.test_sessions%rowtype;
begin
  select * into s from public.test_sessions where id=p_session_id and user_id=auth.uid() for update;
  if not found then raise exception 'Test session was not found.'; end if;
  if s.status<>'in_progress' then raise exception 'Resume the session before changing answers.'; end if;
  if s.version<>p_expected_session_version then raise exception 'Session version conflict. Reload the latest session.'; end if;
  if s.presence_expires_at<now() then raise exception 'Session presence expired. Reload to resume.'; end if;
  if not exists(select 1 from public.test_session_questions where session_id=s.id and question_id=p_question_id) then
    raise exception 'Question is not part of this session.'; end if;
  update public.test_sessions set version=version+1,last_activity_at=now(),updated_at=now() where id=s.id returning * into s;
  delete from public.test_session_answers where session_id=s.id and question_id=p_question_id;
  return jsonb_build_object('session_version',s.version);
end;
$$;
revoke all on function public.clear_test_session_answer(uuid,uuid,bigint) from public,anon,authenticated,service_role;
grant execute on function public.clear_test_session_answer(uuid,uuid,bigint) to authenticated;
