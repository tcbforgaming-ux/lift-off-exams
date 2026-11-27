-- Keep Test-specific analytics, generation recommendations and export
-- contracts intact. Derive the combined projections from the audited queries.
do $$
declare
  summary text:=pg_get_functiondef('public.get_my_test_analytics(text,date,date)'::regprocedure);
  detail text:=pg_get_functiondef('public.get_my_test_analytics_detail(text,text,date,date,integer,timestamptz)'::regprocedure);
  summary_scope text:='s.mode=''Test''';
  detail_scope text:='s.mode=''Test''';
  scope text:='s.mode in (''Test'',''Quiz'') and (p_mode=''all'' or s.mode=p_mode)';
  validation text:=$v$
  if coalesce(p_mode,'') not in ('all','Test','Quiz') then raise exception 'Invalid activity mode.'; end if;
$v$;
begin
  if strpos(summary,summary_scope)=0 or strpos(detail,detail_scope)=0
    or strpos(detail,'having count(*)>0')=0 or strpos(summary,'if not paid and (p_range')=0
    or strpos(detail,'r.percentage,r.total_questions,t.category')=0
  then raise exception 'Unexpected activity analytics source'; end if;
  summary:=replace(summary,'public.get_my_test_analytics(','public.get_my_activity_analytics(');
  summary:=replace(summary,'(p_range text DEFAULT','(p_mode text DEFAULT ''all'', p_range text DEFAULT');
  summary:=replace(summary,summary_scope,scope);
  summary:=replace(summary,'paid:=public.has_premium_explanation_access(actor);',validation||'  paid:=private.has_paid_activity_access(actor);');
  summary:=replace(summary,'if not paid and (p_range','if not paid and (p_mode<>''all'' or p_range');
  summary:=replace(summary,'''session_id'',e.session_id,''score''',
    '''session_id'',e.session_id,''mode'',(select s.mode from public.test_sessions s where s.id=e.session_id),''score''');
  execute summary;
  detail:=replace(detail,'public.get_my_test_analytics_detail(','public.get_my_activity_analytics_detail(');
  detail:=replace(detail,'(p_section text,','(p_section text, p_mode text DEFAULT ''all'',');
  detail:=replace(detail,detail_scope,scope);
  detail:=replace(detail,'public.has_premium_explanation_access(actor)','private.has_paid_activity_access(actor)');
  detail:=replace(detail,'  if coalesce(p_section',validation||'  if coalesce(p_section');
  detail:=replace(detail,'having count(*)>0','having p_mode=''Test'' and count(*)>0');
  detail:=replace(detail,'r.percentage,r.total_questions,t.category','r.percentage,r.total_questions,t.category,s.mode');
  detail:=replace(detail,'''percentage'',percentage)', '''percentage'',percentage,''mode'',mode)');
  execute detail;
end;
$$;
revoke all on function public.get_my_activity_analytics(text,text,date,date),
  public.get_my_activity_analytics_detail(text,text,text,date,date,integer,timestamptz)
  from public,anon,authenticated,service_role;
grant execute on function public.get_my_activity_analytics(text,text,date,date),
  public.get_my_activity_analytics_detail(text,text,text,date,date,integer,timestamptz)
  to authenticated;
