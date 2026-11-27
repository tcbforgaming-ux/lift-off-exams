-- A tab keeps its client identity over reloads, but each mount advances a
-- generation. A delayed exit/heartbeat from an earlier mount cannot win.
alter table public.test_sessions add column presence_generation bigint not null default 0
  check (presence_generation>=0);
create function public.heartbeat_test_session(p_session_id uuid,p_client_id uuid,p_generation bigint) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare s public.test_sessions%rowtype; result jsonb;
begin
  if p_generation is null or p_generation<1 then raise exception 'Valid presence generation required.'; end if;
  select * into s from public.test_sessions where id=p_session_id and user_id=auth.uid() for update;
  if not found then raise exception 'Test session was not found.'; end if;
  if s.presence_client_id=p_client_id and p_generation<s.presence_generation then
    raise exception 'Stale session page. Reload the current attempt.';
  end if;
  result:=public.heartbeat_test_session(p_session_id,p_client_id);
  if result->>'status'='in_progress' then
    update public.test_sessions set presence_generation=p_generation where id=s.id;
  end if;
  return result;
end;
$$;
create function public.release_test_session(p_session_id uuid,p_client_id uuid,p_generation bigint) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare s public.test_sessions%rowtype;
begin
  if p_generation is null or p_generation<1 then raise exception 'Valid presence generation required.'; end if;
  select * into s from public.test_sessions where id=p_session_id and user_id=auth.uid() for update;
  if not found then raise exception 'Test session was not found.'; end if;
  if s.presence_client_id=p_client_id and s.presence_generation=p_generation then
    return public.release_test_session(p_session_id,p_client_id);
  end if;
  return jsonb_build_object('status',s.status,'session_version',s.version);
end;
$$;
revoke all on function public.heartbeat_test_session(uuid,uuid,bigint) from public,anon,authenticated,service_role;
revoke all on function public.release_test_session(uuid,uuid,bigint) from public,anon,authenticated,service_role;
grant execute on function public.heartbeat_test_session(uuid,uuid,bigint),public.release_test_session(uuid,uuid,bigint) to authenticated;
