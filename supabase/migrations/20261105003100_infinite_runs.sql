create table private.infinite_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  launch_id uuid not null,
  category text,
  difficulty text,
  tags text[] not null,
  question jsonb,
  answered integer not null default 0,
  correct integer not null default 0,
  uncertain integer not null default 0,
  streak integer not null default 0,
  best integer not null default 0,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id,launch_id)
);
create index infinite_runs_history on private.infinite_runs(user_id,created_at desc,id desc);
create table private.infinite_answers (
  run_id uuid not null references private.infinite_runs on delete cascade,
  position integer not null,
  request_id uuid not null,
  question jsonb not null,
  response text not null,
  primary key(run_id,position),
  unique(run_id,request_id)
);
alter table private.infinite_runs enable row level security;
alter table private.infinite_answers enable row level security;
create index infinite_active_category_question on public.questions(partition_key,id)
  where lifecycle_state='Active';
create index infinite_active_question on public.questions(id) where lifecycle_state='Active';
alter table private.personal_answer_evidence drop constraint personal_answer_evidence_source_check,
  add constraint personal_answer_evidence_source_check check(source in ('test','search','hardcore','infinite'));

-- Examine a bounded rotating window; prefer new content without requiring bank exhaustion.
create function private.pick_infinite_question(r private.infinite_runs) returns jsonb
language sql volatile set search_path=pg_catalog,public,pg_temp as $$
  with pivot as materialized (select gen_random_uuid() id), candidates as (
    (select q.* from public.questions q,pivot p
     where q.id>=p.id and q.lifecycle_state='Active' and (r.category is null or q.partition_key=r.category)
       and q.correct_option_id in ('A','B','C','D') and jsonb_array_length(q.options)=4
     order by q.id limit 64)
    union all
    (select q.* from public.questions q,pivot p
     where q.id<p.id and q.lifecycle_state='Active' and (r.category is null or q.partition_key=r.category)
       and q.correct_option_id in ('A','B','C','D') and jsonb_array_length(q.options)=4
     order by q.id limit 64)
  )
  select jsonb_build_object('id',q.id,'text',q.question_text,'options',q.options,
    'difficulty',q.difficulty,'answer',q.correct_option_id,'explanation',q.explanation)
  from candidates q
  where q.correct_option_id in ('A','B','C','D') and jsonb_array_length(q.options)=4
  order by coalesce(q.id::text=r.question->>'id',false),
    case when exists(select 1 from private.personal_answer_evidence e where e.user_id=r.user_id and e.question_id=q.id)
      or exists(select 1 from public.user_question_status s where s.user_id=r.user_id and s.question_id=q.id and s.status<>'Unseen')
      then 1 else 0 end,
    (case when q.difficulty=r.difficulty then 1 else 0 end + case when q.tags && r.tags then 1 else 0 end) desc,
    random()
  limit 1
$$;

create function private.infinite_state(r private.infinite_runs, p_include_question boolean default true)
returns jsonb language sql stable set search_path=pg_catalog,pg_temp as $$
  select jsonb_build_object('id',r.id,'category',r.category,'created_at',r.created_at,
    'finished_at',r.finished_at,'answered',r.answered,'correct',r.correct,
    'uncertain',r.uncertain,'streak',r.streak,'best',r.best,
    'paid',private.has_paid_activity_access(r.user_id),
    'question',case when p_include_question and r.finished_at is null and private.has_paid_activity_access(r.user_id)
      then r.question-array['answer','explanation'] end)
$$;

create function public.start_infinite_run(p_request uuid,p_category text default null,
  p_difficulty text default null,p_tags text[] default '{}') returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
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
  if found then return private.infinite_state(r); end if;
  r.user_id:=actor; r.category:=p_category; r.difficulty:=p_difficulty; r.tags:=p_tags;
  r.question:=private.pick_infinite_question(r);
  if r.question is null then raise exception 'No eligible questions for this category.'; end if;
  insert into private.infinite_runs(user_id,launch_id,category,difficulty,tags,question)
    values(actor,p_request,p_category,p_difficulty,p_tags,r.question) returning * into r;
  return private.infinite_state(r);
end;
$$;

create function public.get_infinite_run(p_run uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,pg_temp as $$
declare r private.infinite_runs;
begin
  select * into r from private.infinite_runs where id=p_run and user_id=auth.uid();
  if not found or private.account_erasure_blocked(auth.uid()) then raise insufficient_privilege; end if;
  return private.infinite_state(r);
end;
$$;

create function public.advance_infinite_run(p_run uuid,p_position integer,p_request uuid,p_response text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare r private.infinite_runs; a private.infinite_answers; is_correct boolean; q jsonb;
begin
  select * into r from private.infinite_runs where id=p_run and user_id=auth.uid() for update;
  if not found then raise insufficient_privilege; end if;
  perform private.require_infinite_run_launch_access(r.user_id);
  select * into a from private.infinite_answers where run_id=r.id and request_id=p_request;
  if found then
    if a.position is distinct from p_position or a.response is distinct from p_response then
      raise invalid_parameter_value using message='This request already committed a different response.';
    end if;
    return private.infinite_state(r)||jsonb_build_object('last_correct',a.response=a.question->>'answer');
  end if;
  if r.finished_at is not null or p_position is distinct from r.answered+1 or p_request is null
    or r.question is null or p_response is null or p_response not in ('A','B','C','D','UNKNOWN') then
    raise invalid_parameter_value using message='Select an answer for the current question.';
  end if;
  is_correct:=p_response=r.question->>'answer';
  insert into private.infinite_answers values(r.id,p_position,p_request,r.question,p_response);
  insert into private.personal_answer_evidence(user_id,question_id,source,source_key,answered_at,option_id,correct)
    select r.user_id,id,'infinite',r.id::text||':'||p_position,clock_timestamp(),p_response,is_correct
    from public.questions where id=(r.question->>'id')::uuid for key share;
  q:=private.pick_infinite_question(r);
  update private.infinite_runs set question=q,answered=p_position,
    correct=correct+is_correct::integer,uncertain=uncertain+(p_response='UNKNOWN')::integer,
    streak=case when is_correct then streak+1 else 0 end,
    best=greatest(best,case when is_correct then streak+1 else 0 end)
    where id=r.id returning * into r;
  return private.infinite_state(r)||jsonb_build_object('last_correct',is_correct);
end;
$$;

create function public.finish_infinite_run(p_run uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
declare r private.infinite_runs;
begin
  select * into r from private.infinite_runs where id=p_run and user_id=auth.uid() for update;
  if not found or private.account_erasure_blocked(auth.uid()) then raise insufficient_privilege; end if;
  if r.finished_at is null then
    update private.infinite_runs set finished_at=now(),question=null where id=r.id returning * into r;
  end if;
  return private.infinite_state(r);
end;
$$;

create function public.list_infinite_runs(p_before timestamptz default null,p_before_id uuid default null)
returns setof jsonb language sql stable security definer set search_path=pg_catalog,pg_temp as $$
  select private.infinite_state(r,false) from private.infinite_runs r
  where user_id=auth.uid() and not private.account_erasure_blocked(auth.uid())
    and (p_before is null or (created_at,id)<(p_before,p_before_id))
  order by created_at desc,id desc limit 12
$$;

create function public.review_infinite_run(p_run uuid,p_after integer default 0,p_explanations boolean default false)
returns setof jsonb language plpgsql stable security definer set search_path=pg_catalog,pg_temp as $$
begin
  if private.account_erasure_blocked(auth.uid()) or not exists(
    select 1 from private.infinite_runs where id=p_run and user_id=auth.uid() and finished_at is not null
  ) then raise insufficient_privilege; end if;
  return query select jsonb_build_object('position',a.position,'response',a.response,
    'question',case when p_explanations and private.has_paid_activity_access(auth.uid())
      then a.question else a.question-'explanation' end)
    from private.infinite_answers a where a.run_id=p_run and a.position>p_after
    order by a.position limit 20;
end;
$$;

revoke all on function private.pick_infinite_question(private.infinite_runs),
  private.infinite_state(private.infinite_runs,boolean) from public,anon,authenticated,service_role;
revoke all on function public.start_infinite_run(uuid,text,text,text[]),public.get_infinite_run(uuid),
  public.advance_infinite_run(uuid,integer,uuid,text),public.finish_infinite_run(uuid),
  public.list_infinite_runs(timestamptz,uuid),public.review_infinite_run(uuid,integer,boolean)
  from public,anon,authenticated,service_role;
grant execute on function public.start_infinite_run(uuid,text,text,text[]),public.get_infinite_run(uuid),
  public.advance_infinite_run(uuid,integer,uuid,text),public.finish_infinite_run(uuid),
  public.list_infinite_runs(timestamptz,uuid),public.review_infinite_run(uuid,integer,boolean) to authenticated;
