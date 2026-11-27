create table private.hardcore_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  request_id uuid not null,
  cap integer not null check (cap in (1,2,3)),
  allow_unknown boolean not null,
  strikes integer not null default 0 check (strikes between 0 and cap),
  committed integer not null default 0,
  correct integer not null default 0,
  question jsonb,
  last_request uuid,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id,request_id)
);
alter table private.personal_answer_evidence drop constraint personal_answer_evidence_source_check,
  add constraint personal_answer_evidence_source_check check(source in ('test','search','hardcore'));
create index hardcore_completion_idx on private.hardcore_runs(user_id,finished_at);
create table private.hardcore_answers (
  run_id uuid not null references private.hardcore_runs on delete cascade,
  position integer not null,
  question jsonb not null,
  response text not null,
  primary key(run_id,position)
);
alter table private.hardcore_runs enable row level security;
alter table private.hardcore_answers enable row level security;

create function private.check_hardcore_weekly_allowance(p_user uuid) returns void
language plpgsql set search_path=pg_catalog,public,pg_temp as $$
declare week_start timestamptz := date_trunc('week', now() at time zone 'UTC') at time zone 'UTC';
begin
  perform pg_advisory_xact_lock(hashtextextended('completed-activity:'||p_user::text,0));
  if not private.has_paid_activity_access(p_user) and (
    (select count(*) from private.hardcore_runs where user_id=p_user and finished_at>=week_start)
    + (select count(*) from public.test_results r join public.test_sessions s on s.id=r.session_id
       where r.user_id=p_user and r.submitted_at>=week_start and s.mode='Test')
  ) >= 10 then
    raise insufficient_privilege using message='Weekly Test and Hardcore completion limit reached.';
  end if;
end;
$$;

create function private.check_test_shared_weekly_allowance() returns trigger
language plpgsql set search_path=pg_catalog,public,pg_temp as $$
begin
  if exists(select 1 from public.test_sessions where id=new.session_id and mode='Test') then
    perform private.check_hardcore_weekly_allowance(new.user_id);
  end if;
  return new;
end;
$$;
create trigger test_shared_weekly_allowance before insert on public.test_results
for each row execute function private.check_test_shared_weekly_allowance();

create function private.pick_hardcore_question(p_previous text) returns jsonb
language sql volatile set search_path=pg_catalog,public,pg_temp as $$
  select jsonb_build_object('id',id,'text',question_text,'options',options,'difficulty',difficulty,
    'answer',correct_option_id,'explanation',explanation)
  from public.questions
  where lifecycle_state='Active' and difficulty in ('Medium','Hard')
    and correct_option_id in ('A','B','C','D') and jsonb_array_length(options)=4
  order by coalesce(id::text=p_previous,false),random()
  limit 1
$$;

create function private.hardcore_state(r private.hardcore_runs) returns jsonb
language sql stable set search_path=pg_catalog,pg_temp as $$
  select jsonb_build_object('id',r.id,'cap',r.cap,'allow_unknown',r.allow_unknown,
    'strikes',r.strikes,'committed',r.committed,'finished_at',r.finished_at,'created_at',r.created_at,
    'correct',case when r.finished_at is not null then r.correct end,
    'question',r.question - array['answer','explanation'])
$$;

create function public.start_hardcore(p_request uuid,p_cap integer default 1,p_allow_unknown boolean default true)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare actor uuid:=auth.uid(); r private.hardcore_runs; q jsonb;
begin
  if actor is null or private.account_erasure_blocked(actor) then raise insufficient_privilege; end if;
  if p_request is null or p_cap is null or p_cap not in (1,2,3) or p_allow_unknown is null then
    raise invalid_parameter_value using message='Choose a strike cap from 1 to 3.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('hardcore-launch:'||actor::text,0));
  select * into r from private.hardcore_runs where user_id=actor and request_id=p_request;
  if found then return private.hardcore_state(r); end if;
  if p_cap<>1 and not private.has_paid_activity_access(actor) then
    raise insufficient_privilege using message='Free accounts can play with one strike.';
  end if;
  perform private.check_hardcore_weekly_allowance(actor);
  q:=private.pick_hardcore_question(null);
  if q is null then raise exception 'No eligible Hardcore questions are available.'; end if;
  insert into private.hardcore_runs(user_id,request_id,cap,allow_unknown,question)
  values(actor,p_request,p_cap,p_allow_unknown,q) returning * into r;
  return private.hardcore_state(r);
end;
$$;

create function public.get_hardcore(p_run uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare r private.hardcore_runs;
begin
  select * into r from private.hardcore_runs where id=p_run and user_id=auth.uid();
  if not found or private.account_erasure_blocked(auth.uid()) then raise insufficient_privilege; end if;
  return private.hardcore_state(r);
end;
$$;

create function public.advance_hardcore(p_run uuid,p_position integer,p_request uuid,p_response text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare r private.hardcore_runs; next_strikes integer; q jsonb;
begin
  select * into r from private.hardcore_runs where id=p_run and user_id=auth.uid() for update;
  if not found or private.account_erasure_blocked(auth.uid()) then raise insufficient_privilege; end if;
  if p_request=r.last_request and p_position=r.committed then return private.hardcore_state(r); end if;
  if p_request is null or p_position is distinct from r.committed+1 or r.finished_at is not null then
    raise invalid_parameter_value using message='This Hardcore question is no longer current.';
  end if;
  next_strikes:=private.evaluate_hardcore_strikes(r.cap,r.strikes,r.question->>'answer',p_response,r.allow_unknown);
  if next_strikes=r.cap then
    perform private.check_hardcore_weekly_allowance(r.user_id);
  else
    q:=coalesce(private.pick_hardcore_question(r.question->>'id'),r.question);
  end if;
  insert into private.hardcore_answers(run_id,position,question,response)
  values(r.id,p_position,r.question,p_response);
  insert into private.personal_answer_evidence(user_id,question_id,source,source_key,answered_at,option_id,correct)
  select r.user_id,id,'hardcore',r.id::text||':'||p_position,clock_timestamp(),p_response,
    p_response=r.question->>'answer'
  from public.questions where id=(r.question->>'id')::uuid for key share;
  update private.hardcore_runs set committed=p_position,strikes=next_strikes,last_request=p_request,
    correct=correct+case when p_response=question->>'answer' then 1 else 0 end,
    question=q,finished_at=case when next_strikes=cap then now() end
  where id=r.id returning * into r;
  return private.hardcore_state(r);
end;
$$;

create function public.list_hardcore(p_before timestamptz default null,p_before_id uuid default null)
returns setof jsonb language sql stable security definer set search_path=pg_catalog,public,pg_temp as $$
  select private.hardcore_state(r)-'question' from private.hardcore_runs r
  where r.user_id=auth.uid() and not private.account_erasure_blocked(auth.uid())
    and (p_before is null or (r.created_at,r.id)<(p_before,p_before_id))
  order by r.created_at desc,r.id desc limit 12
$$;

create function public.review_hardcore(p_run uuid,p_after integer default 0,p_explanations boolean default false)
returns setof jsonb language plpgsql stable security definer set search_path=pg_catalog,public,pg_temp as $$
begin
  if private.account_erasure_blocked(auth.uid()) or not exists(
    select 1 from private.hardcore_runs where id=p_run and user_id=auth.uid() and finished_at is not null
  ) then raise insufficient_privilege; end if;
  return query select jsonb_build_object('position',a.position,'response',a.response,
    'question',case when p_explanations and private.has_paid_activity_access(auth.uid())
      then a.question else a.question-'explanation' end)
    from private.hardcore_answers a where a.run_id=p_run and a.position>p_after
    order by a.position limit 20;
end;
$$;

revoke all on function private.check_hardcore_weekly_allowance(uuid),
  private.check_test_shared_weekly_allowance(),private.pick_hardcore_question(text),
  private.hardcore_state(private.hardcore_runs) from public,anon,authenticated,service_role;
revoke all on function public.start_hardcore(uuid,integer,boolean),public.get_hardcore(uuid),
  public.advance_hardcore(uuid,integer,uuid,text),public.list_hardcore(timestamptz,uuid),
  public.review_hardcore(uuid,integer,boolean) from public,anon,authenticated,service_role;
grant execute on function public.start_hardcore(uuid,integer,boolean),public.get_hardcore(uuid),
  public.advance_hardcore(uuid,integer,uuid,text),public.list_hardcore(timestamptz,uuid),
  public.review_hardcore(uuid,integer,boolean) to authenticated;
