create index staff_reporting_answers_time_idx on private.personal_answer_evidence(answered_at,question_id);
create index staff_reporting_results_time_idx on public.test_results(submitted_at);
create index staff_reporting_test_ids_time_idx on public.test_ids(created_at) where mode='Test' and generation_status='Ready';
create index staff_reporting_reports_time_idx on public.question_reports(created_at,question_id);

create function private.staff_reporting_window(p_from date, p_to date)
returns tstzrange language plpgsql stable set search_path=pg_catalog,pg_temp as $$
begin
  if not coalesce(public.is_admin(),false) or private.account_erasure_blocked(auth.uid()) then
    raise insufficient_privilege using message='Administrator or Owner access is required.';
  end if;
  if p_from is null or p_to is null or not isfinite(p_from) or not isfinite(p_to)
     or p_from < date '2000-01-01' or p_from > p_to
     or p_to > (now() at time zone 'UTC')::date or p_to-p_from > 365 then
    raise invalid_parameter_value using message='Choose a UTC date range of at most 366 days ending today or earlier.';
  end if;
  return tstzrange(p_from::timestamp at time zone 'UTC',(p_to+1)::timestamp at time zone 'UTC','[)');
end;
$$;
revoke all on function private.staff_reporting_window(date,date) from public,anon,authenticated,service_role;

create function public.get_staff_reporting_summary(p_from date,p_to date)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,pg_temp as $$
declare w tstzrange := private.staff_reporting_window(p_from,p_to);
        summary jsonb;
begin
  with accounts as materialized (
    select p.user_id,p.created_at,p.account_tier='premium' or s.user_id is not null as premium
    from public.profiles p
    left join (
      select distinct user_id from public.subscriptions
      where status in ('active','trialing') and (current_period_end is null or current_period_end>now())
    ) s on s.user_id=p.user_id
  ), generated as materialized (
    select category,topic_tags,created_by from public.test_ids
    where mode='Test' and generation_status='Ready' and created_at>=lower(w) and created_at<upper(w)
  ), completed as materialized (
    select r.user_id,r.percentage from public.test_results r
    join public.test_sessions s on s.id=r.session_id
    where s.mode='Test' and r.submitted_at>=lower(w) and r.submitted_at<upper(w)
  ), active as (
    select created_by as user_id from generated where created_by is not null
    union select user_id from completed
    union select user_id from private.personal_answer_evidence
      where answered_at>=lower(w) and answered_at<upper(w)
  ), categories as (
    select category as label,count(*) as total from generated group by category order by total desc,label limit 10
  ), tags as (
    select tag as label,count(*) as total from generated
    cross join lateral (select distinct unnest(topic_tags) as tag) distinct_tags
    group by tag order by total desc,label limit 10
  )
  select jsonb_build_object(
    'total_users',count(*),
    'new_users',count(*) filter(where created_at>=lower(w) and created_at<upper(w)),
    'active_users',(select count(*) from active join accounts a using(user_id)),
    'premium_users',count(*) filter(where premium),
    'free_users',count(*) filter(where not premium),
    'generated',(select count(*) from generated),
    'completed',(select count(*) from completed),
    'average_score',(select round(avg(percentage),2) from completed),
    'top_categories',(select coalesce(jsonb_agg(to_jsonb(categories) order by total desc,label),'[]') from categories),
    'top_tags',(select coalesce(jsonb_agg(to_jsonb(tags) order by total desc,label),'[]') from tags)
  ) into summary from accounts;
  return summary;
end;
$$;
revoke all on function public.get_staff_reporting_summary(date,date) from public,anon,authenticated,service_role;
grant execute on function public.get_staff_reporting_summary(date,date) to authenticated;

create function public.list_staff_question_quality(
  p_from date,p_to date,p_order text default 'reported',p_flagged_only boolean default false,
  p_after_rank bigint default null,p_after_id uuid default null,p_limit integer default 25
)
returns table(question_id uuid,prompt text,lifecycle_state text,answered bigint,correct bigint,
  incorrect bigint,unknown bigint,reports bigint,open_reports bigint,flags text[],rank bigint,has_next_page boolean)
language plpgsql stable security definer set search_path=pg_catalog,pg_temp as $$
declare w tstzrange := private.staff_reporting_window(p_from,p_to);
        page_size integer := least(100,greatest(1,coalesce(p_limit,25)));
begin
  if p_order is null or p_order not in ('reported','answered','missed','unknown')
     or (p_after_rank is null)<>(p_after_id is null) or p_after_rank < 0 then
    raise invalid_parameter_value using message='Invalid question quality sort or cursor.';
  end if;
  return query with responses as (
    select e.question_id,count(*) answered,count(*) filter(where e.correct) correct,
      count(*) filter(where not e.correct) incorrect,count(*) filter(where e.option_id='UNKNOWN') unknown
    from private.personal_answer_evidence e
    where e.answered_at>=lower(w) and e.answered_at<upper(w)
    group by e.question_id
  ), report_counts as (
    select r.question_id,count(*) reports,count(*) filter(where r.status in ('open','in_review')) open_reports
    from public.question_reports r
    where r.created_at>=lower(w) and r.created_at<upper(w) and r.question_id is not null
    group by r.question_id
  ), metrics as (
    select coalesce(a.question_id,r.question_id) id,coalesce(a.answered,0) answered,
      coalesce(a.correct,0) correct,coalesce(a.incorrect,0) incorrect,coalesce(a.unknown,0) unknown,
      coalesce(r.reports,0) reports,coalesce(r.open_reports,0) open_reports
    from responses a full join report_counts r on a.question_id=r.question_id
  ), ranked as (
    select m.*, array_remove(array[
      case when m.open_reports>=3 then 'report_volume' end,
      case when m.answered>=20 and m.correct::numeric/nullif(m.answered,0)<=0.25 then 'low_correct' end,
      case when m.answered>=20 and m.correct::numeric/nullif(m.answered,0)>=0.95 then 'high_correct' end,
      case when m.answered>=20 and m.unknown::numeric/nullif(m.answered,0)>=0.40 then 'high_unknown' end
    ],null) as labels,
    case p_order when 'answered' then m.answered when 'missed' then m.incorrect
      when 'unknown' then m.unknown else m.reports end as order_rank
    from metrics m
  ), picked as materialized (
    select m.* from ranked m
    where (not coalesce(p_flagged_only,false) or cardinality(m.labels)>0)
      and (p_after_rank is null or (m.order_rank,m.id)<(p_after_rank,p_after_id))
    order by m.order_rank desc,m.id desc limit page_size+1
  )
  select m.id,q.question_text,q.lifecycle_state,m.answered,m.correct,m.incorrect,m.unknown,m.reports,
    m.open_reports,m.labels,m.order_rank,(select count(*)>page_size from picked)
  from picked m join public.questions q on q.id=m.id
  order by m.order_rank desc,m.id desc limit page_size;
end;
$$;
revoke all on function public.list_staff_question_quality(date,date,text,boolean,bigint,uuid,integer)
from public,anon,authenticated,service_role;
grant execute on function public.list_staff_question_quality(date,date,text,boolean,bigint,uuid,integer) to authenticated;
