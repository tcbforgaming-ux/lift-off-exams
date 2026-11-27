-- Auto-pause uses server timestamps. Unload is only a best-effort fast path;
-- expired presence is settled durably on the next owned session/history read.
alter table public.test_sessions
  add column presence_client_id uuid,
  add column presence_seen_at timestamptz,
  add column presence_expires_at timestamptz;
create index test_sessions_expired_presence_idx
  on public.test_sessions(user_id, presence_expires_at)
  where status='in_progress' and presence_expires_at is not null;

create or replace function public.enforce_practice_clock() returns trigger
language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare elapsed integer; cutoff timestamptz;
begin
  if old.timer_seconds is null then return new; end if;
  cutoff := case when old.presence_expires_at < now() then old.presence_seen_at else now() end;
  elapsed := old.accumulated_active_seconds + case when old.status='in_progress'
    then greatest(0,extract(epoch from (cutoff-old.active_period_started_at))::integer) else 0 end;
  if elapsed>=old.timer_seconds and new.status<>'submitted' then
    raise exception 'Time has expired. Submit this test to view your results.';
  end if;
  if new.status='submitted' then
    new.accumulated_active_seconds:=least(new.accumulated_active_seconds,old.timer_seconds);
  end if;
  return new;
end;
$$;

create function private.settle_session_presence(p_session_id uuid) returns void
language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare s public.test_sessions%rowtype; elapsed integer; code text;
begin
  select * into s from public.test_sessions where id=p_session_id and user_id=auth.uid() for update;
  if not found or s.status<>'in_progress' or s.presence_expires_at is null
    or s.presence_expires_at>=now() then return; end if;
  elapsed:=s.accumulated_active_seconds+greatest(0,floor(extract(epoch from
    (s.presence_seen_at-s.active_period_started_at)))::integer);
  if s.timer_seconds is not null and elapsed>=s.timer_seconds then
    perform public.submit_test_session(s.id,s.version);
    return;
  end if;
  update public.test_sessions set status='paused', accumulated_active_seconds=elapsed,
    active_period_started_at=null, paused_at=s.presence_seen_at,
    presence_client_id=null,presence_expires_at=null,
    version=version+1,updated_at=now() where id=s.id;
  select id into code from public.test_ids where definition_id=s.test_definition_id;
  perform public.write_test_session_audit('test_session.auto_paused',s.id,code,'in_progress','paused',
    jsonb_build_object('reason','presence_expired','timing_policy','last_confirmed_server_presence'));
end;
$$;
revoke all on function private.settle_session_presence(uuid) from public,anon,authenticated,service_role;

create function public.heartbeat_test_session(p_session_id uuid,p_client_id uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare s public.test_sessions%rowtype;
begin
  if auth.uid() is null or p_client_id is null then raise exception 'Authentication and client identity are required.'; end if;
  perform private.settle_session_presence(p_session_id);
  select * into s from public.test_sessions where id=p_session_id and user_id=auth.uid() for update;
  if not found then raise exception 'Test session was not found.'; end if;
  if s.status='in_progress' then
    if s.presence_client_id is not null and s.presence_client_id<>p_client_id
      and s.presence_expires_at>=now() then
      raise exception 'This session is active in another tab. Pause or close that tab before continuing.';
    end if;
    update public.test_sessions set presence_client_id=p_client_id,
      presence_seen_at=now(),presence_expires_at=now()+interval '30 seconds'
      where id=s.id;
  end if;
  return jsonb_build_object('status',s.status,'session_version',s.version);
end;
$$;

create function public.release_test_session(p_session_id uuid,p_client_id uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare s public.test_sessions%rowtype;
begin
  if auth.uid() is null or p_client_id is null then raise exception 'Authentication and client identity are required.'; end if;
  perform private.settle_session_presence(p_session_id);
  select * into s from public.test_sessions where id=p_session_id and user_id=auth.uid() for update;
  if not found then raise exception 'Test session was not found.'; end if;
  if s.status='in_progress' and s.presence_client_id=p_client_id then
    if s.timer_seconds is not null and s.accumulated_active_seconds+
      greatest(0,floor(extract(epoch from(now()-s.active_period_started_at)))::integer)>=s.timer_seconds then
      perform public.submit_test_session(s.id,s.version);
    else
      perform public.pause_test_session(s.id,s.version);
    end if;
  end if;
  select * into s from public.test_sessions where id=p_session_id;
  return jsonb_build_object('status',s.status,'session_version',s.version);
end;
$$;
revoke all on function public.heartbeat_test_session(uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function public.release_test_session(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.heartbeat_test_session(uuid,uuid),public.release_test_session(uuid,uuid) to authenticated;

create function private.touch_session_presence() returns trigger
language plpgsql set search_path=pg_catalog as $$
begin
  if new.status<>'in_progress' then
    new.presence_client_id:=null; new.presence_expires_at:=null;
  elsif old.status='in_progress' and old.presence_client_id is not null
    and old.presence_expires_at>=now() and new.last_activity_at is distinct from old.last_activity_at then
    new.presence_seen_at:=now(); new.presence_expires_at:=now()+interval '30 seconds';
  end if;
  return new;
end;
$$;
revoke all on function private.touch_session_presence() from public,anon,authenticated,service_role;
create trigger test_session_presence_touch before update on public.test_sessions
  for each row execute function private.touch_session_presence();

-- Preserve the original signatures/grants and reject expired writes before any
-- mutation. Existing sessions/fixtures without enrolled presence keep their
-- original behavior until the application enrolls them.
do $$
declare routine regprocedure; definition text; body text;
begin
  foreach routine in array array[
    'public.save_test_session_answer(uuid,uuid,text,bigint)'::regprocedure,
    'public.set_test_session_position(uuid,integer,bigint)'::regprocedure
  ] loop
    select prosrc into body from pg_proc where oid=routine;
    if body !~ '\mbegin\M' then raise exception 'Unexpected session mutation body'; end if;
    definition:=pg_get_functiondef(routine);
    execute replace(definition,body,regexp_replace(body,'\mbegin\M',$guard$begin
      if exists(select 1 from public.test_sessions where id=p_session_id and user_id=auth.uid()
        and presence_expires_at<now()) then
        raise exception 'Session presence expired. Reload to resume your paused test.';
      end if;
    $guard$));
  end loop;
  foreach routine in array array[
    'public.get_test_session(uuid)'::regprocedure,
    'public.get_practice_session_settings(uuid)'::regprocedure
  ] loop
    select prosrc into body from pg_proc where oid=routine;
    if body !~ '\mbegin\M' then raise exception 'Unexpected session reader body'; end if;
    execute replace(pg_get_functiondef(routine),body,regexp_replace(body,'\mbegin\M',
      E'begin\n perform private.settle_session_presence(p_session_id);'));
    execute format('alter function %s volatile',routine);
  end loop;
end;
$$;

-- History remains bounded. Settle at most 50 expired attempts owned by the actor
-- before returning its page, never another user's sessions.
do $$
declare routine regprocedure:='public.get_test_history(integer,timestamptz,uuid,text)'::regprocedure;
  definition text; body text;
begin
  select prosrc into body from pg_proc where oid=routine;
  definition:=pg_get_functiondef(routine);
  if body !~ '\mbegin\M' then raise exception 'Unexpected history reader body'; end if;
  execute replace(definition,body,regexp_replace(body,'\mbegin\M',$guard$begin
    perform private.settle_session_presence(id) from (
      select id from public.test_sessions where user_id=auth.uid() and status='in_progress'
      and presence_expires_at<now() order by last_activity_at desc,id desc limit 50
    ) expired;
  $guard$));
end;
$$;
alter function public.get_test_history(integer,timestamptz,uuid,text) volatile;
