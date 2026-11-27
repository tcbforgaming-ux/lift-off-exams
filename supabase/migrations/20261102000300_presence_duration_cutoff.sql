-- Direct pause/submission retries must use the same confirmed-presence cutoff
-- as automatic recovery, rather than adding disconnected wall-clock time.
do $$
declare definition text; anchor text;
begin
  definition:=pg_get_functiondef('public.pause_test_session(uuid,bigint)'::regprocedure);
  anchor:='now() - active_period_started_at';
  if strpos(definition,anchor)=0 then raise exception 'Unexpected pause timing implementation'; end if;
  execute replace(definition,anchor,
    '(case when presence_expires_at < now() then presence_seen_at else now() end) - active_period_started_at');
  definition:=pg_get_functiondef('public.submit_test_session(uuid,bigint)'::regprocedure);
  anchor:='now() - session_row.active_period_started_at';
  if strpos(definition,anchor)=0 then raise exception 'Unexpected submission timing implementation'; end if;
  execute replace(definition,anchor,
    '(case when session_row.presence_expires_at < now() then session_row.presence_seen_at else now() end) - session_row.active_period_started_at');
end;
$$;
