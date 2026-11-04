-- Read immutable result snapshots, never the mutable question bank or profile tier.
create function public.get_my_test_analytics(
  p_range text default 'month',p_from date default null,p_to date default null
) returns jsonb language plpgsql stable security definer
set search_path=pg_catalog,public,pg_temp as $$
declare
  actor uuid:=auth.uid(); paid boolean; range_start timestamptz;
  range_end timestamptz:=now(); result jsonb;
begin
  if actor is null or private.account_erasure_blocked(actor) then raise insufficient_privilege; end if;
  paid:=public.has_premium_explanation_access(actor);
  if not paid and (p_range is distinct from 'month' or p_from is not null or p_to is not null)
  then raise insufficient_privilege using message='Premium access is required for analytics ranges.'; end if;
  if p_range='custom' then
    if p_from is null or p_to is null or p_from>p_to or not isfinite(p_from) or not isfinite(p_to)
      or p_from<date '0001-01-01' or p_to>date '9999-12-31'
    then raise exception 'Enter a valid date range.'; end if;
    range_start:=p_from::timestamp at time zone 'UTC';
    range_end:=least(now(),(p_to::timestamp+interval '1 day') at time zone 'UTC');
  else
    if p_from is not null or p_to is not null or coalesce(p_range,'') not in ('day','week','month','year','lifetime')
    then raise exception 'Select a supported analytics range.'; end if;
    range_start:=case p_range when 'day' then now()-interval '24 hours'
      when 'week' then now()-interval '7 days' when 'month' then now()-interval '30 days'
      when 'year' then now()-interval '1 year' else '-infinity'::timestamptz end;
  end if;

  if not paid then
    return jsonb_build_object('premium',false,'test_count',
      (select count(*) from public.test_results r where r.user_id=actor),
      'average_score',(select round(avg(r.percentage),2) from public.test_results r
        where r.user_id=actor and r.submitted_at>=range_start and r.submitted_at<range_end));
  end if;

  with owned as materialized (
    select r.session_id,r.test_definition_id,r.submitted_at,r.percentage
    from public.test_results r where r.user_id=actor and r.submitted_at>=range_start and r.submitted_at<range_end
  ), extrema as (
    (select 'highest' as kind,o.* from owned o order by percentage desc,submitted_at desc,session_id limit 1)
    union all
    (select 'lowest' as kind,o.* from owned o order by percentage,submitted_at desc,session_id limit 1)
  ), topics as (
    select tag,count(*) as total,count(*) filter(where i.is_correct) as correct,
      count(*) filter(where i.selected_option_id='UNKNOWN') as uncertain
    from owned o join public.test_result_items i using(session_id)
    cross join lateral (select distinct unnest(i.tags) as tag) tags
    group by tag
    order by count(*) filter(where not i.is_correct)::numeric / count(*) desc,
      count(*) filter(where i.selected_option_id='UNKNOWN') desc,tag
    limit 25
  ), recent as (
    select session_id,submitted_at,percentage from owned
    order by submitted_at desc,session_id desc limit 100
  )
  select jsonb_build_object('premium',true,'test_count',(select count(*) from owned),
    'average_score',(select round(avg(percentage),2) from owned),
    'extremes',(select coalesce(jsonb_object_agg(e.kind,jsonb_build_object(
      'session_id',e.session_id,'score',e.percentage,'category',t.category,
      'difficulties',(select coalesce(jsonb_agg(distinct i.difficulty),'[]') from public.test_result_items i where i.session_id=e.session_id),
      'tags',(select coalesce(jsonb_agg(distinct tag),'[]') from public.test_result_items i cross join lateral unnest(i.tags) tag where i.session_id=e.session_id)
    )),'{}') from extrema e join public.test_ids t on t.definition_id=e.test_definition_id),
    'history',(select coalesce(jsonb_agg(to_jsonb(recent) order by submitted_at,session_id),'[]') from recent),
    'topics',(select coalesce(jsonb_agg(to_jsonb(topics) order by (total-correct)::numeric/total desc,uncertain desc,tag),'[]') from topics)
  ) into result;
  return result;
end;
$$;
revoke all on function public.get_my_test_analytics(text,date,date) from public,anon,authenticated,service_role;
grant execute on function public.get_my_test_analytics(text,date,date) to authenticated;
