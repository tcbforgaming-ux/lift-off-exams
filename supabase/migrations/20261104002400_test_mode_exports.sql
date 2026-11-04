create table private.test_export_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  scope jsonb not null,
  cutoff timestamptz not null,
  charged_week date,
  primary key (user_id, request_id)
);
create index test_export_receipts_week_idx on private.test_export_receipts(user_id, charged_week)
where charged_week is not null;
revoke all on private.test_export_receipts from public, anon, authenticated, service_role;

-- Reuse the audited analytics calculations without granting access to internal
-- range/entitlement overrides or the complete (export-only) detail arrays.
do $$
declare
  summary text := pg_get_functiondef('public.get_my_test_analytics(text,date,date)'::regprocedure);
  detail text := pg_get_functiondef('public.get_my_test_analytics_detail(text,text,date,date,integer,timestamptz)'::regprocedure);
begin
  if strpos(summary,'paid:=public.has_premium_explanation_access(actor);')=0
    or strpos(detail,'or not public.has_premium_explanation_access(actor)')=0
    or strpos(detail,'p_page::bigint*25')=0
  then raise exception 'Unexpected analytics export source'; end if;
  summary:=replace(summary,'public.get_my_test_analytics(','private.test_export_summary(');
  summary:=replace(summary,'(p_range text DEFAULT','(p_cutoff timestamptz, p_range text DEFAULT');
  summary:=replace(summary,'now()','p_cutoff');
  summary:=replace(summary,'paid:=public.has_premium_explanation_access(actor);','paid:=true;');
  execute summary;
  detail:=replace(detail,'public.get_my_test_analytics_detail(','private.test_export_detail(');
  detail:=replace(detail,'(p_section text,','(p_explain boolean, p_section text,');
  detail:=replace(detail,'or not public.has_premium_explanation_access(actor)','');
  detail:=replace(detail,'p_page<0','p_page < -1');
  detail:=replace(detail,'where seq>p_page::bigint*25','where p_page=-1 or seq>p_page::bigint*25');
  detail:=replace(detail,'from page where seq<=','from page where p_page=-1 or seq<=');
  detail:=replace(detail,'i.tags,i.selected_option_id,i.is_correct','i.tags,i.selected_option_id,i.is_correct,i.explanation_snapshot');
  detail:=replace(detail,'''category'',category,''difficulty'',difficulty,''tags'',tags)',
    '''category'',category,''difficulty'',difficulty,''tags'',tags) || case when p_explain then jsonb_build_object(''explanation'',explanation_snapshot) else ''{}''::jsonb end');
  execute detail;
end;
$$;
revoke all on function private.test_export_summary(timestamptz,text,date,date) from public,anon,authenticated,service_role;
revoke all on function private.test_export_detail(boolean,text,text,date,date,integer,timestamptz) from public,anon,authenticated,service_role;

create function public.prepare_my_test_export(
  p_kind text, p_format text, p_request uuid, p_session uuid default null,
  p_range text default 'lifetime', p_from date default null, p_to date default null
) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare
  actor uuid := auth.uid();
  stamp timestamptz := statement_timestamp();
  cutoff timestamptz := stamp;
  week_start date;
  paid boolean;
  requested jsonb;
  receipt private.test_export_receipts;
  lo timestamptz;
  hi timestamptz;
  sessions uuid[];
  summary jsonb;
  rows jsonb;
  report jsonb;
begin
  if actor is null or private.account_erasure_blocked(actor) then raise insufficient_privilege; end if;
  perform set_config('response.headers','[{"Cache-Control":"private, no-store"}]',true);
  if coalesce(p_kind,'') not in ('result','analytics','history')
    or coalesce(p_format,'') not in ('pdf','csv') or p_request is null
    or (p_kind='result')<>(p_session is not null)
    or (p_kind='result' and p_range is distinct from 'lifetime')
    or (p_kind='history' and coalesce(p_range,'') not in ('lifetime','custom'))
  then raise exception 'Invalid export request.'; end if;
  requested:=jsonb_build_array(p_kind,p_format,p_session,p_range,p_from,p_to);

  -- Serialize quota consumption and retries for one authenticated account.
  perform pg_advisory_xact_lock(hashtextextended('account-erasure:'||actor::text,0));
  if private.account_erasure_blocked(actor) then raise insufficient_privilege; end if;
  perform pg_advisory_xact_lock(hashtextextended('test-export:'||actor::text,0));
  week_start:=date_trunc('week',clock_timestamp() at time zone 'UTC')::date;
  select exists(select 1 from public.subscriptions s where s.user_id=actor
    and s.status in ('active','trialing') and (s.current_period_end is null or s.current_period_end>clock_timestamp()))
    into paid;
  select * into receipt from private.test_export_receipts where user_id=actor and request_id=p_request;
  if found then
    if receipt.scope<>requested then raise exception 'This export request was already used.'; end if;
    if not paid and receipt.charged_week is null then
      raise insufficient_privilege using message='Subscription changed. Start a new export.';
    end if;
    cutoff:=receipt.cutoff;
  elsif not paid and (select count(*) from private.test_export_receipts
    where user_id=actor and charged_week=week_start)>=3
  then raise insufficient_privilege using message='Weekly export limit reached. It resets Monday at 00:00 UTC.'; end if;

  hi:=cutoff;
  if p_range='custom' then
    if p_from is null or p_to is null or p_from>p_to or not isfinite(p_from) or not isfinite(p_to)
      or p_from<date '0001-01-01' or p_to>date '9999-12-31'
    then raise exception 'Enter a valid UTC date range.'; end if;
    lo:=p_from::timestamp at time zone 'UTC';
    hi:=least(cutoff,(p_to::timestamp+interval '1 day') at time zone 'UTC');
  else
    if p_from is not null or p_to is not null or coalesce(p_range,'') not in ('day','week','month','year','lifetime')
    then raise exception 'Select a supported export range.'; end if;
    lo:=case p_range when 'day' then cutoff-interval '24 hours' when 'week' then cutoff-interval '7 days'
      when 'month' then cutoff-interval '30 days' when 'year' then cutoff-interval '1 year'
      else '-infinity'::timestamptz end;
  end if;

  select array_agg(session_id order by submitted_at desc,session_id desc) into sessions from (
    select r.session_id,r.submitted_at from public.test_results r
    join public.test_sessions s on s.id=r.session_id
    where r.user_id=actor and s.mode='Test' and s.status='submitted'
      and r.submitted_at>=lo and r.submitted_at<hi
      and (p_session is null or r.session_id=p_session)
    order by r.submitted_at desc,r.session_id desc limit 251
  ) bounded;
  if sessions is null then
    if p_kind='result' then raise insufficient_privilege using message='Completed Test result unavailable.'; end if;
    return jsonb_build_object('empty',true);
  end if;
  if cardinality(sessions)>250 then raise exception 'Export exceeds 250 tests. Choose a shorter date range.'; end if;

  if p_kind in ('history','result') then
    select jsonb_agg(jsonb_build_object(
      'test_id',t.id,'category',t.category,'started_at',s.started_at,'submitted_at',r.submitted_at,
      'score',r.percentage,'questions',r.total_questions,'answered',r.answered_questions,
      'correct',r.correct_answers,'incorrect',r.incorrect_answers,'unanswered',r.unanswered_questions,
      'active_seconds',r.active_duration_seconds,'topics',t.topic_tags,
      'difficulties',(select array_agg(distinct i.difficulty order by i.difficulty)
        from public.test_result_items i where i.session_id=r.session_id)
    ) order by r.submitted_at desc,r.session_id desc) into rows
    from public.test_results r join public.test_sessions s on s.id=r.session_id
    join public.test_ids t on t.definition_id=r.test_definition_id
    where r.session_id=any(sessions);
    if p_kind='history' then
      report:=jsonb_build_object('history',rows);
    else
      select jsonb_agg(jsonb_build_object('position',i.position,'question',i.question_text,
        'type',i.question_type,'difficulty',i.difficulty,'topics',i.tags,
        'options',(select jsonb_agg(case when jsonb_typeof(opt)='string' then opt#>>'{}'
          else coalesce(opt->>'text',opt->>'label',opt->>'value') end order by n)
          from jsonb_array_elements(i.options) with ordinality as o(opt,n)),
        'answer',i.selected_option_id,'correct_answer',i.correct_option_id,'correct',i.is_correct)
        || case when paid then jsonb_build_object('explanation',i.explanation_snapshot) else '{}'::jsonb end
        order by i.position) into summary from public.test_result_items i where i.session_id=p_session;
      report:=jsonb_build_object('result',rows->0,'questions',summary);
    end if;
  else
    if (select count(*) from (select 1 from public.test_result_items i where i.session_id=any(sessions) limit 25001) bounded)>25000
    then raise exception 'Export exceeds 25,000 result items. Choose a shorter date range.'; end if;
    if (select count(*) from (select 1 from public.test_result_items i where i.session_id=any(sessions)
      and i.selected_option_id='UNKNOWN' limit 501) bounded)>500
    then raise exception 'Export exceeds 500 uncertainty details. Choose a shorter date range.'; end if;
    summary:=private.test_export_summary(cutoff,p_range,p_from,p_to)-array['history','topics','premium','as_of'];
    report:=jsonb_build_object('summary',summary,
      'history',private.test_export_detail(false,'history',p_range,p_from,p_to,-1,cutoff)->'items',
      'topics',private.test_export_detail(false,'topics',p_range,p_from,p_to,-1,cutoff)->'items',
      'confidence',private.test_export_detail(false,'confidence',p_range,p_from,p_to,0,cutoff),
      'uncertainty',private.test_export_detail(paid,'uncertainty',p_range,p_from,p_to,-1,cutoff)->'items',
      'recommendations',private.test_export_detail(false,'recommendations',p_range,p_from,p_to,0,cutoff)->'items');
  end if;
  report:=report||jsonb_build_object('kind',p_kind,'range',p_range,'from',p_from,'through',p_to,
    'cutoff',hi,'count',cardinality(sessions));
  if octet_length(report::text)>1500000 then
    raise exception 'Export exceeds the file size limit. Choose a shorter range or a smaller result.';
  end if;
  insert into private.test_export_receipts values(actor,p_request,requested,cutoff,case when not paid then week_start end)
    on conflict do nothing;
  return report;
end;
$$;
revoke all on function public.prepare_my_test_export(text,text,uuid,uuid,text,date,date) from public,anon,authenticated,service_role;
grant execute on function public.prepare_my_test_export(text,text,uuid,uuid,text,date,date) to authenticated;
