alter table public.user_question_status add column legacy_answer_unverified boolean not null default false;
update public.user_question_status set legacy_answer_unverified=true
where status in ('Answered correctly','Answered incorrectly');

create table private.personal_answer_evidence (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  source text not null check(source in ('test','search')),
  source_key text not null,
  answered_at timestamptz not null,
  option_id text not null check(option_id in ('A','B','C','D','UNKNOWN')),
  correct boolean not null,
  review_snapshot jsonb,
  primary key(user_id,question_id,source,source_key)
);
create index personal_answer_latest_idx on private.personal_answer_evidence
  (user_id,question_id,answered_at desc,source desc,source_key desc);
revoke all on private.personal_answer_evidence from public,anon,authenticated,service_role;

create function private.backfill_test_answer_evidence() returns void
language sql set search_path=pg_catalog,pg_temp as $$
  insert into private.personal_answer_evidence(user_id,question_id,source,source_key,answered_at,option_id,correct)
  select r.user_id,i.question_id,'test',i.session_id::text,r.submitted_at,i.selected_option_id,i.is_correct
  from public.test_result_items i join public.test_results r using(session_id)
  join public.test_sessions s on s.id=r.session_id
  where s.mode='Test' and i.selected_option_id is not null
  on conflict do nothing
$$;
revoke all on function private.backfill_test_answer_evidence() from public,anon,authenticated,service_role;
select private.backfill_test_answer_evidence();

create function private.capture_test_answer_evidence() returns trigger
language plpgsql set search_path=pg_catalog,pg_temp as $$
begin
  insert into private.personal_answer_evidence(user_id,question_id,source,source_key,answered_at,option_id,correct)
  select r.user_id,new.question_id,'test',new.session_id::text,r.submitted_at,new.selected_option_id,new.is_correct
  from public.test_results r join public.test_sessions s on s.id=r.session_id
  where r.session_id=new.session_id and s.mode='Test'
  on conflict do nothing;
  return new;
end;
$$;
revoke all on function private.capture_test_answer_evidence() from public,anon,authenticated,service_role;
create trigger capture_test_answer_evidence after insert on public.test_result_items
for each row when (new.selected_option_id is not null) execute function private.capture_test_answer_evidence();

create function private.review_bank_question(p_id uuid,p_action text,p_acknowledge boolean,p_option text,p_request uuid)
returns jsonb language plpgsql set search_path=pg_catalog,public,pg_temp as $$
declare actor uuid:=auth.uid(); q public.questions; s public.user_question_status;
  e private.personal_answer_evidence; k text; payload jsonb; allow_explanation boolean;
begin
  if actor is null or private.account_erasure_blocked(actor) then raise insufficient_privilege; end if;
  if coalesce(p_action,'') not in ('attempt','view','grade') then raise exception 'Select a review action.'; end if;
  select * into q from public.questions where id=p_id and lifecycle_state='Active';
  if not found then raise exception 'Question is no longer available.'; end if;
  perform pg_advisory_xact_lock(hashtextextended('question-review:'||actor::text||p_id::text,0));
  select * into s from public.user_question_status where user_id=actor and question_id=p_id for update;
  if not found or s.status='Unseen' then
    if p_acknowledge is not true or p_action='grade' then
      raise exception 'Acknowledge the unseen-question warning before opening.';
    end if;
  end if;
  allow_explanation:=p_action<>'attempt' and public.has_premium_explanation_access(actor);
  payload:=jsonb_build_object('id',q.id,'question_text',q.question_text,'options',q.options,'tags',q.tags,
    'correct_option_id',case when p_action<>'attempt' then q.correct_option_id end,
    'correct',case when p_action='grade' then p_option=q.correct_option_id end,
    'explanation',case when p_action<>'attempt' then q.explanation end);
  if p_action='grade' then
    if coalesce(p_option,'') not in ('A','B','C','D','UNKNOWN') then raise exception 'Select an answer.'; end if;
    -- Old clients have no request ID; repeat the same grade within one exposure.
    k:=coalesce(p_request::text,'legacy:'||s.seen_count::text||':'||p_option);
    insert into private.personal_answer_evidence values(actor,p_id,'search',k,clock_timestamp(),p_option,
      p_option=q.correct_option_id,payload) on conflict do nothing;
    select * into strict e from private.personal_answer_evidence
    where user_id=actor and question_id=p_id and source='search' and source_key=k;
    if e.option_id<>p_option then raise exception 'This request was already used for another answer.'; end if;
    payload:=e.review_snapshot;
  else
    insert into public.user_question_status(user_id,question_id,status,seen_count,last_seen_at)
    values(actor,p_id,'Seen',1,now())
    on conflict(user_id,question_id) do update
    set status=case when user_question_status.status='Unseen' then 'Seen' else user_question_status.status end,
      seen_count=user_question_status.seen_count+1,last_seen_at=now(),updated_at=now();
  end if;
  return case when allow_explanation then payload else payload||'{"explanation":null}'::jsonb end;
end;
$$;
revoke all on function private.review_bank_question(uuid,text,boolean,text,uuid) from public,anon,authenticated,service_role;
create or replace function public.review_my_bank_question(p_id uuid,p_action text,p_acknowledge boolean default false,p_option text default null)
returns jsonb language sql security definer set search_path=pg_catalog,pg_temp as $$
  select private.review_bank_question(p_id,p_action,p_acknowledge,p_option,null)
$$;
create function public.grade_my_bank_question(p_id uuid,p_option text,p_request uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
begin
  if p_request is null then raise exception 'A grade request ID is required.'; end if;
  return private.review_bank_question(p_id,'grade',false,p_option,p_request);
end;
$$;
revoke all on function public.grade_my_bank_question(uuid,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.grade_my_bank_question(uuid,text,uuid) to authenticated;

do $$
declare d text:=pg_get_functiondef('public.search_my_question_bank(text,text,text,text,text,uuid)'::regprocedure);
begin
  d:=replace(d,$a$coalesce(s.status,'Unseen') as status,$a$,$r$state.status,
      latest.option_id as latest_option_id,latest.correct as latest_correct,
      coalesce(flags.ever_correct,false) as ever_correct,coalesce(flags.ever_incorrect,false) as ever_incorrect,
      coalesce(s.legacy_answer_unverified,false) as legacy_answer_unverified,$r$);
  d:=replace(d,$a$    where q.lifecycle_state='Active'$a$,$r$    left join lateral (
      select e.option_id,e.correct from private.personal_answer_evidence e where e.user_id=actor and e.question_id=q.id
      order by answered_at desc,source desc,source_key desc limit 1
    ) latest on true
    cross join lateral (
      select bool_or(e.correct) as ever_correct,bool_or(not e.correct) as ever_incorrect
      from private.personal_answer_evidence e where e.user_id=actor and e.question_id=q.id
    ) flags
    cross join lateral (select case when latest.correct is true then 'Answered correctly'
      when latest.correct is false then 'Answered incorrectly'
      when s.status<>'Unseen' then 'Seen' else 'Unseen' end as status) state
    where q.lifecycle_state='Active'$r$);
  d:=replace(d,$a$coalesce(s.status,'Unseen')=p_status$a$,'state.status=p_status');
  if strpos(d,'latest.option_id as latest_option_id')=0 or strpos(d,'state.status=p_status')=0
  then raise exception 'Unexpected search projection'; end if;
  execute d;
end;
$$;
