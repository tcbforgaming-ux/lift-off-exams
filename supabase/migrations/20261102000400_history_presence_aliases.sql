-- Qualify the presence subquery: history's output names are PL/pgSQL variables.
do $$
declare routine regprocedure:='public.get_test_history(integer,timestamptz,uuid,text)'::regprocedure;
  definition text; anchor text;
begin
  definition:=pg_get_functiondef(routine);
  anchor:='select id from public.test_sessions where user_id=auth.uid() and status=''in_progress''
      and presence_expires_at<now() order by last_activity_at desc,id desc limit 50';
  if strpos(definition,anchor)=0 then raise exception 'Unexpected history presence query'; end if;
  execute replace(definition,anchor,
    'select source.id from public.test_sessions source where source.user_id=auth.uid() and source.status=''in_progress''
      and source.presence_expires_at<now() order by source.last_activity_at desc,source.id desc limit 50');
end;
$$;
