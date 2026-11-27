create table private.weekly_free_activity_claims (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('generated','test_id','shared_test','shared_quiz','shared_hardcore')),
  operation_id uuid not null,
  week_start timestamptz not null,
  released_at timestamptz,
  primary key (user_id,kind,operation_id),
  check (released_at is null or kind in ('shared_test','shared_quiz','shared_hardcore'))
);
alter table private.weekly_free_activity_claims enable row level security;
revoke all on private.weekly_free_activity_claims from public,anon,authenticated,service_role;
create index weekly_free_activity_balance
  on private.weekly_free_activity_claims(user_id,week_start,kind) where released_at is null;

create function private.free_activity_week(p_at timestamptz) returns timestamptz
language sql immutable strict set search_path=pg_catalog,pg_temp as $$
  select date_trunc('week',p_at at time zone 'UTC') at time zone 'UTC'
$$;

create function private.free_activity_limit(p_kind text) returns integer
language sql immutable strict set search_path=pg_catalog,pg_temp as $$
  select case p_kind when 'generated' then 3 when 'test_id' then 7 else 10 end
$$;

create function private.claim_free_activity(p_user uuid,p_kind text,p_operation uuid)
returns void language plpgsql set search_path=pg_catalog,pg_temp as $$
declare
  w timestamptz;
  lim integer;
  label text;
begin
  if private.has_paid_activity_access(p_user) then return; end if;
  lim:=private.free_activity_limit(p_kind);
  label:=case p_kind when 'generated' then 'generated Test' when 'test_id' then 'Test ID'
    else 'Test, Quiz and Hardcore' end;
  perform pg_advisory_xact_lock(hashtextextended('weekly-free-activity:'||p_user::text,0));
  if exists(select 1 from private.weekly_free_activity_claims
    where user_id=p_user and kind=p_kind and operation_id=p_operation) then return; end if;
  w:=private.free_activity_week(statement_timestamp());
  if (select count(*) from private.weekly_free_activity_claims
    where user_id=p_user and week_start=w and released_at is null
    and (kind=p_kind or (p_kind in ('shared_test','shared_quiz','shared_hardcore')
      and kind in ('shared_test','shared_quiz','shared_hardcore')))) >= lim then
    raise insufficient_privilege using message=format(
      'Weekly %s allowance reached. It resets Monday at 00:00 UTC.',label),
      detail='weekly_free_activity_allowance';
  end if;
  insert into private.weekly_free_activity_claims(user_id,kind,operation_id,week_start)
  values(p_user,p_kind,p_operation,w);
end;
$$;

-- The successful Ready transition covers saved, custom and updated generation.
-- A shortage, failed snapshot, or idempotent replay never reaches this event.
create function private.charge_generated_test() returns trigger
language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
begin
  if new.mode='Test' and new.created_by=auth.uid() and old.generation_status='Creating'
    and new.generation_status='Ready' then
    perform private.claim_free_activity(new.created_by,'generated',new.definition_id);
  end if;
  return null;
end;
$$;
create trigger charge_free_test_generation after update of generation_status on public.test_ids
for each row execute function private.charge_generated_test();

-- A new session is the single charging event for both launch signatures.
-- Existing-session returns (including a repeat click with a new key) do not insert.
create function private.charge_test_launch() returns trigger
language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
begin
  if new.user_id=auth.uid() and new.status='in_progress' then
    if new.mode='Test' then
      perform private.claim_free_activity(new.user_id,'test_id',new.id);
      perform private.claim_free_activity(new.user_id,'shared_test',new.id);
    elsif new.mode='Quiz' then
      perform private.claim_free_activity(new.user_id,'shared_quiz',new.id);
    end if;
  end if;
  return null;
end;
$$;
create trigger charge_free_test_launch after insert on public.test_sessions
for each row execute function private.charge_test_launch();

create function public.get_my_weekly_activity_allowance()
returns table(paid boolean, resets_at timestamptz, generated_remaining integer,
  test_id_remaining integer, shared_remaining integer)
language plpgsql stable security definer set search_path=pg_catalog,pg_temp as $$
declare actor uuid:=auth.uid(); w timestamptz:=private.free_activity_week(statement_timestamp());
begin
  if actor is null or private.account_erasure_blocked(actor) then raise insufficient_privilege; end if;
  return query select private.has_paid_activity_access(actor),w+interval '168 hours',
    private.free_activity_limit('generated')-count(*) filter(where kind='generated')::integer,
    private.free_activity_limit('test_id')-count(*) filter(where kind='test_id')::integer,
    private.free_activity_limit('shared_test')-count(*) filter(where kind in ('shared_test','shared_quiz','shared_hardcore'))::integer
  from private.weekly_free_activity_claims
  where user_id=actor and week_start=w and released_at is null;
end;
$$;
revoke all on function private.free_activity_week(timestamptz),
  private.free_activity_limit(text),
  private.claim_free_activity(uuid,text,uuid),private.charge_generated_test(),private.charge_test_launch(),
  public.get_my_weekly_activity_allowance() from public,anon,authenticated,service_role;
grant execute on function public.get_my_weekly_activity_allowance() to authenticated;

-- A fresh request key may resolve to an already-open attempt. Persist that
-- receipt too: retrying the same intent after submission must not start over.
create table private.test_launch_replays (
  user_id uuid not null,
  request_key text not null,
  session_id uuid not null references public.test_sessions(id) on delete cascade,
  launch_config jsonb not null,
  primary key(user_id,request_key)
);
alter table private.test_launch_replays enable row level security;
revoke all on private.test_launch_replays from public,anon,authenticated,service_role;

do $$
declare d text:=pg_get_functiondef('private.start_configured_session(text,text,jsonb)'::regprocedure);
  lookup text:='and session.idempotency_key = normalized_key;';
  claim_lock text:='  perform pg_advisory_xact_lock(';
  config_check text:='existing_session.launch_config is not null and existing_session.launch_config is distinct from p_launch';
  active_found text:='  limit 1;[[:space:]]+if found then[[:space:]]+return query';
begin
  if strpos(d,lookup)=0 or strpos(d,claim_lock)=0 or d !~ active_found
    or strpos(d,config_check)=0 then
    raise exception 'Unexpected Test launch implementation';
  end if;
  d:=replace(d,claim_lock,
    '  perform pg_advisory_xact_lock(hashtextextended(''test-launch-key:''||actor_id::text||'':''||normalized_key,0));'
    ||chr(10)||claim_lock);
  d:=replace(d,lookup,$lookup$and (
      session.idempotency_key=normalized_key
      or session.id=(select replay.session_id from private.test_launch_replays replay
        where replay.user_id=actor_id and replay.request_key=normalized_key)
    );$lookup$);
  d:=replace(d,config_check,$config$coalesce(
      (select replay.launch_config from private.test_launch_replays replay
        where replay.user_id=actor_id and replay.request_key=normalized_key),
      existing_session.launch_config,p_launch) is distinct from p_launch$config$);
  -- An already-open attempt retains its saved configuration. The request
  -- receipt records the proposed options so the same call can be replayed.
  d:=regexp_replace(d,active_found,$found$  limit 1;
  if found then
    insert into private.test_launch_replays(user_id,request_key,session_id,launch_config)
    values(actor_id,normalized_key,existing_session.id,p_launch);
    return query$found$);
  execute d;
end;
$$;
