-- Keep the existing summary contract for older clients. Its arrays are previews;
-- new clients use the separately paginated detail contract.
do $$
declare d text:=pg_get_functiondef('public.get_my_test_analytics(text,date,date)'::regprocedure);
begin
  if strpos(d,'r.user_id=actor')=0 or strpos(d,'''premium'',true,''test_count''')=0
  then raise exception 'Unexpected analytics summary'; end if;
  d:=replace(d,'r.user_id=actor','r.user_id=actor and exists(select 1 from public.test_sessions s where s.id=r.session_id and s.mode=''Test'')');
  execute replace(d,'''premium'',true,''test_count''','''premium'',true,''as_of'',range_end,''test_count''');
end;
$$;

create function public.get_my_test_analytics_detail(p_section text,p_range text default 'month',
  p_from date default null,p_to date default null,p_page integer default 0,p_as_of timestamptz default null)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public,pg_temp as $$
declare actor uuid:=auth.uid(); anchor timestamptz:=least(now(),coalesce(p_as_of,now()));
  lo timestamptz; hi timestamptz:=anchor; result jsonb;
begin
  if actor is null or private.account_erasure_blocked(actor)
    or not public.has_premium_explanation_access(actor) then raise insufficient_privilege; end if;
  if coalesce(p_section,'') not in ('history','topics','uncertainty','confidence','recommendations')
    or p_page is null or p_page<0 or not isfinite(anchor)
  then raise exception 'Invalid analytics page.'; end if;
  if p_range='custom' then
    if p_from is null or p_to is null or p_from>p_to or not isfinite(p_from) or not isfinite(p_to)
      or p_from<date '0001-01-01' or p_to>date '9999-12-31'
    then raise exception 'Enter a valid date range.'; end if;
    lo:=p_from::timestamp at time zone 'UTC';
    hi:=least(anchor,(p_to::timestamp+interval '1 day') at time zone 'UTC');
  else
    if p_from is not null or p_to is not null or coalesce(p_range,'') not in ('day','week','month','year','lifetime')
    then raise exception 'Select a supported analytics range.'; end if;
    lo:=case p_range when 'day' then anchor-interval '24 hours' when 'week' then anchor-interval '7 days'
      when 'month' then anchor-interval '30 days' when 'year' then anchor-interval '1 year'
      else '-infinity'::timestamptz end;
  end if;

  with owned as materialized (
    select r.session_id,r.submitted_at,r.percentage,r.total_questions,t.category,
      t.question_count,t.blueprint_snapshot
    from public.test_results r join public.test_sessions s on s.id=r.session_id
    join public.test_ids t on t.definition_id=r.test_definition_id
    where r.user_id=actor and s.mode='Test' and r.submitted_at>=lo and r.submitted_at<hi
  ), items as materialized (
    select o.session_id,o.submitted_at,o.category,i.position,i.question_text,i.difficulty,
      i.tags,i.selected_option_id,i.is_correct
    from owned o join public.test_result_items i using(session_id)
  ), fixed as (
    select count(*) tests, (array_agg(blueprint_snapshot))[1] snapshot
    from owned having count(*)>0 and count(distinct blueprint_snapshot)=1
      and bool_and(question_count=total_questions and blueprint_snapshot->>'schema_version'='1'
        and blueprint_snapshot?'blueprint_id' and jsonb_typeof(blueprint_snapshot->'strata')='array'
        and blueprint_snapshot->>'total_questions'=total_questions::text)
  ), expected as (
    select tag, sum((s->>'count')::integer)*max(f.tests) as required
    from fixed f cross join lateral jsonb_array_elements(f.snapshot->'strata') s
    cross join lateral (select distinct value tag from jsonb_array_elements_text(s->'tags')) tags
    group by tag
  ), topic_counts as (
    select tag,count(*) as total,count(*) filter(where is_correct) as correct,
      count(*) filter(where selected_option_id is not null) as answered,
      count(*) filter(where selected_option_id='UNKNOWN') as uncertain
    from items cross join lateral (select distinct unnest(tags) as tag) tags
    group by tag
  ), topic_rows as (
    select tc.*,e.required,coalesce(tc.answered>=e.required,false) as eligible
    from topic_counts tc left join expected e using(tag)
  ), confidence as (
    select count(*) filter(where selected_option_id is not null) as answered,
      count(*) filter(where selected_option_id='UNKNOWN') as uncertain,
      count(*) filter(where selected_option_id is null) as skipped,
      count(*) filter(where selected_option_id in ('A','B','C','D') and not is_correct) as wrong_choices
    from items
  ), candidates as (
    select row_number() over(order by submitted_at desc,session_id desc) as seq,
      jsonb_build_object('session_id',session_id,'submitted_at',submitted_at,'percentage',percentage) as payload
      from owned where p_section='history'
    union all
    select row_number() over(order by tag),to_jsonb(t) from topic_rows t where p_section='topics'
    union all
    select row_number() over(order by submitted_at desc,session_id desc,position),
      jsonb_build_object('session_id',session_id,'position',position,'question_text',question_text,
        'category',category,'difficulty',difficulty,'tags',tags)
      from items where p_section='uncertainty' and selected_option_id='UNKNOWN'
  ), page as (
    select * from candidates where seq>p_page::bigint*25 and seq<=p_page::bigint*25+26
  )
  select case
    when p_section='recommendations' then jsonb_build_object('items',(select coalesce(jsonb_agg(tag order by loss desc,uncertain desc,tag),'[]')
      from (select tag,(answered-correct)::numeric/answered as loss,uncertain from topic_rows
        where eligible and answered>correct and answered>0 order by loss desc,uncertain desc,tag limit 3) ranked))
    when p_section='confidence' then (select to_jsonb(c)||jsonb_build_object(
      'percentage',round(100*c.uncertain::numeric/nullif(c.answered,0),2),
      'categories',(select coalesce(jsonb_agg(to_jsonb(x) order by uncertain desc,label),'[]') from (
        select category label,count(*) filter(where selected_option_id is not null) answered,
          count(*) filter(where selected_option_id='UNKNOWN') uncertain from items group by category) x),
      'difficulties',(select coalesce(jsonb_agg(to_jsonb(x) order by uncertain desc,label),'[]') from (
        select difficulty label,count(*) filter(where selected_option_id is not null) answered,
          count(*) filter(where selected_option_id='UNKNOWN') uncertain from items group by difficulty) x)
    ) from confidence c)
    else jsonb_build_object('items',(select coalesce(jsonb_agg(payload order by seq),'[]') from page where seq<=p_page::bigint*25+25),
      'has_more',(select count(*)>25 from page))
  end into result;
  return result;
end;
$$;
revoke all on function public.get_my_test_analytics_detail(text,text,date,date,integer,timestamptz) from public,anon,authenticated,service_role;
grant execute on function public.get_my_test_analytics_detail(text,text,date,date,integer,timestamptz) to authenticated;
