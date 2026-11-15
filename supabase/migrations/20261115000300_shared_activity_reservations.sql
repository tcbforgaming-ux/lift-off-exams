-- Completion consumes the original reservation; it never charges a new week.
drop trigger test_shared_weekly_allowance on public.test_results;
drop function private.check_test_shared_weekly_allowance();

do $$
declare
  d text;
  anchor text;
begin
  d:=pg_get_functiondef('public.start_hardcore(uuid,integer,boolean)'::regprocedure);
  anchor:='  perform private.check_hardcore_weekly_allowance(actor);';
  if strpos(d,anchor)=0 then raise exception 'Unexpected Hardcore launch'; end if;
  execute replace(d,anchor,'');

  d:=pg_get_functiondef('public.advance_hardcore(uuid,integer,uuid,text)'::regprocedure);
  anchor:=$guard$  if next_strikes=r.cap then
    perform private.check_hardcore_weekly_allowance(r.user_id);
  else$guard$;
  if strpos(d,anchor)=0 then raise exception 'Unexpected Hardcore completion'; end if;
  execute replace(d,anchor,'  if next_strikes<>r.cap then');

  d:=pg_get_functiondef('public.start_quiz(uuid,integer)'::regprocedure);
  anchor:=$guard$  if actor is null or private.account_erasure_blocked(actor)
    or not private.has_paid_activity_access(actor) then
    raise insufficient_privilege using message='An active subscription is required to start a Quiz.';
  end if;$guard$;
  if strpos(d,anchor)=0 then raise exception 'Unexpected Quiz authorization'; end if;
  execute replace(d,anchor,
    '  if actor is null or private.account_erasure_blocked(actor) then raise insufficient_privilege; end if;');

  d:=pg_get_functiondef('private.resolve_test_launch(text,jsonb)'::regprocedure);
  anchor:='    if private.account_erasure_blocked(auth.uid()) or not private.has_paid_activity_access(auth.uid()) then';
  if strpos(d,anchor)=0 then raise exception 'Unexpected shared Quiz authorization'; end if;
  execute replace(replace(d,anchor,'    if private.account_erasure_blocked(auth.uid()) then'),
    'raise insufficient_privilege using message=''An active subscription is required to start a Quiz.'';',
    'raise insufficient_privilege;');
end;
$$;
drop function private.check_hardcore_weekly_allowance(uuid);

-- Keep the receipt even after release so an old key never buys another attempt.
create function private.release_activity_reservation(p_user uuid,p_kind text,p_operation uuid)
returns void language plpgsql set search_path=pg_catalog,pg_temp as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('weekly-free-activity:'||p_user::text,0));
  update private.weekly_free_activity_claims set released_at=clock_timestamp()
  where user_id=p_user and kind=p_kind and operation_id=p_operation and released_at is null;
end;
$$;

-- Extend only the existing lifecycle CHECK constraints, preserving unrelated checks.
do $$
declare c record; n integer:=0;
begin
  for c in select conname,pg_get_expr(conbin,conrelid) as expr
    from pg_constraint where conrelid='public.test_sessions'::regclass and contype='c'
      and pg_get_expr(conbin,conrelid) like '%status%'
  loop
    execute format('alter table public.test_sessions drop constraint %I',c.conname);
    execute format('alter table public.test_sessions add constraint %I check ((%s) or
      (status in (''abandoned'',''expired'') and active_period_started_at is null and submitted_at is null))',
      c.conname,c.expr);
    n:=n+1;
  end loop;
  if n<>2 then raise exception 'Unexpected Test session lifecycle constraints'; end if;
end;
$$;

create function private.guard_closed_test_session() returns trigger
language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
begin
  if old.status in ('abandoned','expired') then
    raise invalid_parameter_value using message='This session is closed.';
  end if;
  if new.status in ('abandoned','expired') then
    if old.status not in ('in_progress','paused') then
      raise invalid_parameter_value using message='A submitted session cannot be closed without a result.';
    end if;
    perform private.release_activity_reservation(new.user_id,
      case new.mode when 'Quiz' then 'shared_quiz' else 'shared_test' end,new.id);
  end if;
  return new;
end;
$$;
create trigger guard_closed_test_session before update on public.test_sessions
for each row execute function private.guard_closed_test_session();

create function public.abandon_test_session(p_session_id uuid) returns text
language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
declare actor uuid:=auth.uid(); s public.test_sessions; code text;
begin
  if actor is null or private.account_erasure_blocked(actor) then raise insufficient_privilege; end if;
  select * into s from public.test_sessions where id=p_session_id and user_id=actor for update;
  if not found then raise insufficient_privilege; end if;
  if s.status not in ('in_progress','paused') then return s.status; end if;

  -- Preserve scored timer expiry. This also settles a lost presence heartbeat.
  if public.get_practice_session_settings(p_session_id)->>'status'='submitted' then
    return 'submitted';
  end if;
  select * into s from public.test_sessions where id=p_session_id;
  update public.test_sessions set status='abandoned',active_period_started_at=null,
    last_activity_at=now(),updated_at=now(),version=version+1
  where id=s.id;
  select id into code from public.test_ids where definition_id=s.test_definition_id;
  perform public.write_test_session_audit('test_session.abandoned',s.id,code,s.status,'abandoned','{}');
  return 'abandoned';
end;
$$;

alter table private.hardcore_runs add column closed_without_result text
  check (closed_without_result is null or
    (closed_without_result in ('abandoned','expired') and finished_at is null and question is null));

create function private.sync_hardcore_activity_reservation() returns trigger
language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
begin
  if tg_op='INSERT' then
    if new.user_id=auth.uid() and new.finished_at is null and new.closed_without_result is null then
      perform private.claim_free_activity(new.user_id,'shared_hardcore',new.id);
    end if;
  else
    if old.closed_without_result is not null then
      raise invalid_parameter_value using message='This Hardcore run is closed.';
    end if;
    if new.closed_without_result is not null then
      if old.finished_at is not null then
        raise invalid_parameter_value using message='A scored Hardcore run cannot be abandoned.';
      end if;
      perform private.release_activity_reservation(new.user_id,'shared_hardcore',new.id);
    end if;
  end if;
  return new;
end;
$$;
create trigger sync_hardcore_activity_reservation before insert or update on private.hardcore_runs
for each row execute function private.sync_hardcore_activity_reservation();

create or replace function private.hardcore_state(r private.hardcore_runs) returns jsonb
language sql stable set search_path=pg_catalog,pg_temp as $$
  select jsonb_build_object('id',r.id,'cap',r.cap,'allow_unknown',r.allow_unknown,
    'strikes',r.strikes,'committed',r.committed,'finished_at',r.finished_at,'created_at',r.created_at,
    'correct',case when r.finished_at is not null then r.correct end,
    'closed_without_result',r.closed_without_result,
    'question',r.question - array['answer','explanation'])
$$;

create function public.abandon_hardcore(p_run uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
declare r private.hardcore_runs;
begin
  if auth.uid() is null or private.account_erasure_blocked(auth.uid()) then raise insufficient_privilege; end if;
  select * into r from private.hardcore_runs where id=p_run and user_id=auth.uid() for update;
  if not found then raise insufficient_privilege; end if;
  if r.finished_at is null and r.closed_without_result is null then
    update private.hardcore_runs set closed_without_result='abandoned',question=null
    where id=r.id returning * into r;
  end if;
  return private.hardcore_state(r);
end;
$$;

do $$
declare d text:=pg_get_functiondef('public.advance_hardcore(uuid,integer,uuid,text)'::regprocedure);
  anchor text:='  if p_request=r.last_request';
begin
  if strpos(d,anchor)=0 then raise exception 'Unexpected Hardcore replay guard'; end if;
  execute replace(d,anchor,$guard$
  if r.closed_without_result is not null then
    raise invalid_parameter_value using message='This Hardcore run is closed.';
  end if;
$guard$||anchor);
end;
$$;

revoke all on function private.release_activity_reservation(uuid,text,uuid),private.guard_closed_test_session(),
  private.sync_hardcore_activity_reservation(),public.abandon_test_session(uuid),public.abandon_hardcore(uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.abandon_test_session(uuid),public.abandon_hardcore(uuid) to authenticated;
