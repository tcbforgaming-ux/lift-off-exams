alter table private.infinite_runs add column focus_topics text[]
  check (focus_topics is null or cardinality(focus_topics) between 1 and 10);

-- Scan a bounded indexed window. Only the most recent graded outcome per
-- question survives, regardless of mode. Legacy status flags are not outcomes.
create function private.rank_infinite_weak_topics(p_actor uuid)
returns table(topic text, answered bigint, correct bigint)
language sql stable set search_path=pg_catalog,pg_temp as $$
  with recent as materialized (
    select e as evidence from private.personal_answer_evidence e where e.user_id=p_actor
    order by e.answered_at desc,e.question_id,e.source,e.source_key limit 10000
  ), latest as (
    select distinct on ((r.evidence).question_id) r.evidence
    from recent r order by (r.evidence).question_id,(r.evidence).answered_at desc,
      (r.evidence).source,(r.evidence).source_key
  ), counts as (
    select t.tag, count(*) as answered,
      count(*) filter(where (l.evidence).correct and (l.evidence).option_id<>'UNKNOWN') as correct
    from latest l
    cross join lateral (
      select distinct tag from unnest(private.infinite_focus_evidence_tags(l.evidence)) tag
      where tag is not null and btrim(tag)<>''
    ) t
    group by t.tag
  )
  select c.tag,c.answered,c.correct from counts c
  where c.answered>=8 and c.correct*10<c.answered*7
  order by c.correct::numeric/c.answered,c.tag collate "C" limit 10
$$;

create function public.get_infinite_focus_setup() returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,pg_temp as $$
declare actor uuid:=auth.uid();
begin
  if actor is null or private.account_erasure_blocked(actor) then raise insufficient_privilege; end if;
  if not private.has_paid_activity_access(actor) then
    return jsonb_build_object('eligible',false,'topics','[]'::jsonb);
  end if;
  return jsonb_build_object('eligible',true,'topics',coalesce((
    select jsonb_agg(to_jsonb(t) order by t.correct::numeric/t.answered,t.topic collate "C")
    from private.rank_infinite_weak_topics(actor) t
  ),'[]'::jsonb));
end;
$$;

alter function private.pick_infinite_question(private.infinite_runs) rename to pick_infinite_standard_question;

create function private.pick_infinite_focused_question(r private.infinite_runs) returns jsonb
language sql volatile set search_path=pg_catalog,pg_temp as $$
  -- One winner per focus topic. Do not cap an arbitrary candidate window
  -- before detecting unseen questions: that can wrongly prefer a repeat.
  with ranked_candidates as materialized (
    select candidate.*,t.rank
    from unnest(r.focus_topics) with ordinality t(tag,rank)
    cross join lateral (
      select q.id,coalesce(q.id::text=r.question->>'id',false) as immediate,
        (exists(select 1 from private.personal_answer_evidence e
          where e.user_id=r.user_id and e.question_id=q.id)
        or exists(select 1 from public.user_question_status s
          where s.user_id=r.user_id and s.question_id=q.id and s.status<>'Unseen')) as seen,
        ((q.difficulty is not distinct from r.difficulty)::integer+(q.tags && r.tags)::integer) as preference
      from public.questions q
      where q.lifecycle_state='Active' and (r.category is null or q.partition_key=r.category)
        and q.tags @> array[t.tag] and q.correct_option_id in ('A','B','C','D')
        and jsonb_array_length(q.options)=4
      order by immediate,seen,preference desc,q.id limit 1
    ) candidate
  ), winner as (
    select c.id from ranked_candidates c
    order by c.immediate,c.seen,c.rank,c.preference desc,c.id limit 1
  )
  select jsonb_build_object('id',q.id,'text',q.question_text,'options',q.options,
    'difficulty',q.difficulty,'answer',q.correct_option_id,'explanation',q.explanation,
    'focus_tags',q.tags,'selection_mode','weak')
  from winner w join public.questions q on q.id=w.id
$$;

create function private.pick_infinite_question(r private.infinite_runs) returns jsonb
language plpgsql volatile set search_path=pg_catalog,pg_temp as $$
declare q jsonb;
begin
  if r.focus_topics is not null then
    q:=private.pick_infinite_focused_question(r);
    if q is not null then return q; end if;
  end if;
  return private.pick_infinite_standard_question(r);
end;
$$;

create or replace function private.infinite_state(r private.infinite_runs,p_include_question boolean default true)
returns jsonb language sql stable set search_path=pg_catalog,pg_temp as $$
  select jsonb_build_object('id',r.id,'category',r.category,'created_at',r.created_at,
    'finished_at',r.finished_at,'answered',r.answered,'correct',r.correct,
    'uncertain',r.uncertain,'streak',r.streak,'best',r.best,
    'paid',private.has_paid_activity_access(r.user_id),
    'mode',case when r.focus_topics is null then 'standard' else 'weak' end,
    'focus_topics',coalesce(to_jsonb(r.focus_topics),'[]'::jsonb),
    'selection_mode',case when r.question is not null
      then coalesce(r.question->>'selection_mode','standard') end,
    'question',case when p_include_question and r.finished_at is null and private.has_paid_activity_access(r.user_id)
      then r.question-array['answer','explanation','focus_tags','selection_mode'] end)
$$;

create function private.launch_infinite_run(p_request uuid,p_category text,p_difficulty text,p_tags text[],p_focus boolean)
returns jsonb language plpgsql set search_path=pg_catalog,pg_temp as $$
declare actor uuid:=auth.uid(); r private.infinite_runs;
begin
  perform private.require_infinite_run_launch_access(actor);
  if p_request is null or (p_category is not null and (btrim(p_category)='' or length(p_category)>100))
    or (p_difficulty is not null and p_difficulty not in ('Easy','Medium','Hard'))
    or p_tags is null or cardinality(p_tags)>20
    or exists(select 1 from unnest(p_tags) t where t is null or btrim(t)='' or length(t)>100)
  then raise invalid_parameter_value using message='Invalid Infinite Run settings.'; end if;
  perform pg_advisory_xact_lock(hashtextextended('infinite-launch:'||actor::text,0));
  select * into r from private.infinite_runs where user_id=actor and launch_id=p_request;
  if found then
    if (r.focus_topics is not null) is distinct from p_focus or r.category is distinct from p_category
      or r.difficulty is distinct from p_difficulty or r.tags is distinct from p_tags then
      raise invalid_parameter_value using message='This request already started a run with different settings.';
    end if;
    return private.infinite_state(r);
  end if;
  r.user_id:=actor; r.category:=p_category; r.difficulty:=p_difficulty; r.tags:=p_tags;
  if p_focus then
    select array_agg(t.topic order by t.correct::numeric/t.answered,t.topic collate "C") into r.focus_topics
    from private.rank_infinite_weak_topics(actor) t;
    if r.focus_topics is null then
      raise invalid_parameter_value using message='Insufficient Data. Select Standard Infinite Run or answer more questions.';
    end if;
    r.question:=private.pick_infinite_focused_question(r);
    if r.question is null then
      raise invalid_parameter_value using message='No active questions match your weak topics in this category. Choose another category or Standard Infinite Run.';
    end if;
  else
    r.question:=private.pick_infinite_standard_question(r);
    if r.question is null then raise exception 'No eligible questions for this category.'; end if;
  end if;
  insert into private.infinite_runs(user_id,launch_id,category,difficulty,tags,question,focus_topics)
    values(actor,p_request,p_category,p_difficulty,p_tags,r.question,r.focus_topics) returning * into r;
  return private.infinite_state(r);
end;
$$;

create or replace function public.start_infinite_run(p_request uuid,p_category text default null,
  p_difficulty text default null,p_tags text[] default '{}') returns jsonb
language sql security definer set search_path=pg_catalog,pg_temp as $$
  select private.launch_infinite_run($1,$2,$3,$4,false)
$$;

create function public.start_infinite_run_focused(p_request uuid,p_category text default null,
  p_difficulty text default null,p_tags text[] default '{}') returns jsonb
language sql security definer set search_path=pg_catalog,pg_temp as $$
  select private.launch_infinite_run($1,$2,$3,$4,true)
$$;

-- Keep Standard selection and Hardcore rules unchanged. Only add internal tag
-- snapshots and copy them into the trusted answer receipt when committing.
do $$
declare d text; r regprocedure; a text;
begin
  foreach r in array array['private.pick_infinite_standard_question(private.infinite_runs)'::regprocedure,
    'private.pick_hardcore_question(text)'::regprocedure] loop
    d:=pg_get_functiondef(r);
    a:=case when r='private.pick_hardcore_question(text)'::regprocedure
      then '''difficulty'',difficulty,' else '''difficulty'',q.difficulty,' end;
    if strpos(d,a)=0 then raise exception 'Unexpected question snapshot shape: %',r; end if;
    execute replace(d,a,a||case when r='private.pick_hardcore_question(text)'::regprocedure
      then '''focus_tags'',tags,' else '''focus_tags'',q.tags,' end);
  end loop;
  foreach r in array array['public.advance_infinite_run(uuid,integer,uuid,text)'::regprocedure,
    'public.advance_hardcore(uuid,integer,uuid,text)'::regprocedure] loop
    d:=pg_get_functiondef(r);
    a:='answered_at,option_id,correct)';
    if strpos(d,a)=0 or d !~ '[[:space:]]+from public.questions where id=\(r.question' then
      raise exception 'Unexpected answer evidence writer: %',r;
    end if;
    d:=replace(d,a,'answered_at,option_id,correct,review_snapshot)');
    execute regexp_replace(d,'[[:space:]]+from public.questions where id=\(r.question->>',
      ',jsonb_build_object(''tags'',r.question->''focus_tags'')'||chr(10)||'    from public.questions where id=(r.question->>');
  end loop;
  d:=pg_get_functiondef('private.hardcore_state(private.hardcore_runs)'::regprocedure);
  a:='array[''answer'',''explanation'']';
  if strpos(d,a)=0 then raise exception 'Unexpected Hardcore public state'; end if;
  execute replace(d,a,'array[''answer'',''explanation'',''focus_tags'']');
  foreach r in array array['public.review_infinite_run(uuid,integer,boolean)'::regprocedure,
    'public.review_hardcore(uuid,integer,boolean)'::regprocedure] loop
    d:=pg_get_functiondef(r);
    a:='then a.question else a.question-''explanation'' end';
    if strpos(d,a)=0 then raise exception 'Unexpected review shape: %',r; end if;
    execute replace(d,a,'then a.question-array[''focus_tags'',''selection_mode''] else a.question-array[''explanation'',''focus_tags'',''selection_mode''] end');
  end loop;
end;
$$;

revoke all on function private.rank_infinite_weak_topics(uuid),private.pick_infinite_focused_question(private.infinite_runs),
  private.pick_infinite_question(private.infinite_runs),private.launch_infinite_run(uuid,text,text,text[],boolean),
  public.get_infinite_focus_setup(),public.start_infinite_run_focused(uuid,text,text,text[])
  from public,anon,authenticated,service_role;
grant execute on function public.get_infinite_focus_setup(),
  public.start_infinite_run_focused(uuid,text,text,text[]) to authenticated;
