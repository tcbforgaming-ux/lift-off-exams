revoke insert,update,delete,truncate on public.user_question_status from public,anon,authenticated;
drop policy user_question_status_own_all on public.user_question_status;
create policy user_question_status_own_read on public.user_question_status for select to authenticated using(user_id=auth.uid());

create extension if not exists pg_trgm with schema extensions;
create index questions_active_keyword_idx on public.questions using gin(lower(question_text) extensions.gin_trgm_ops)
where lifecycle_state='Active';

create function public.search_my_question_bank(p_keyword text default '',p_category text default '',
  p_tag text default '',p_difficulty text default '',p_status text default '',p_after uuid default null)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public,pg_temp as $$
declare actor uuid:=auth.uid();
begin
  if actor is null or private.account_erasure_blocked(actor) then raise insufficient_privilege; end if;
  if length(coalesce(p_keyword,''))>120 or length(coalesce(p_category,''))>100 or length(coalesce(p_tag,''))>100
    or coalesce(p_difficulty,'') not in ('','Easy','Medium','Hard')
    or coalesce(p_status,'') not in ('','Seen','Unseen','Answered correctly','Answered incorrectly')
  then raise exception 'Invalid search filter.'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]') from (
    select q.id,q.partition_key as category,q.difficulty,q.tags,coalesce(s.status,'Unseen') as status,
      coalesce(s.seen_count,0) as seen_count
    from public.questions q left join public.user_question_status s on s.question_id=q.id and s.user_id=actor
    where q.lifecycle_state='Active' and (p_after is null or q.id>p_after)
      and (nullif(btrim(p_keyword),'') is null or lower(q.question_text) like '%'||public.escape_repository_like(lower(btrim(p_keyword)))||'%' escape '\')
      and (nullif(p_category,'') is null or q.partition_key=p_category)
      and (nullif(p_tag,'') is null or q.tags @> array[p_tag])
      and (nullif(p_difficulty,'') is null or q.difficulty=p_difficulty)
      and (nullif(p_status,'') is null or coalesce(s.status,'Unseen')=p_status)
    order by q.id limit 26
  ) x);
end;
$$;

create function public.review_my_bank_question(p_id uuid,p_action text,p_acknowledge boolean default false,p_option text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare actor uuid:=auth.uid(); q public.questions; s public.user_question_status; answer_visible boolean;
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
  if p_action='grade' then
    if coalesce(p_option,'') not in ('A','B','C','D','UNKNOWN') then raise exception 'Select an answer.'; end if;
    update public.user_question_status set status=case when p_option=q.correct_option_id
      then 'Answered correctly' else 'Answered incorrectly' end,updated_at=now()
    where user_id=actor and question_id=p_id;
  else
    insert into public.user_question_status(user_id,question_id,status,seen_count,last_seen_at)
    values(actor,p_id,'Seen',1,now())
    on conflict(user_id,question_id) do update
      set status=case when user_question_status.status='Unseen' then 'Seen' else user_question_status.status end,
        seen_count=user_question_status.seen_count+1,last_seen_at=now(),updated_at=now();
  end if;
  answer_visible:=p_action<>'attempt';
  return jsonb_build_object('id',q.id,'question_text',q.question_text,'options',q.options,'tags',q.tags,
    'correct_option_id',case when answer_visible then q.correct_option_id end,
    'correct',case when p_action='grade' then p_option=q.correct_option_id end,
    'explanation',case when answer_visible and public.has_premium_explanation_access(actor) then q.explanation end);
end;
$$;

revoke all on function public.search_my_question_bank(text,text,text,text,text,uuid),
  public.review_my_bank_question(uuid,text,boolean,text) from public,anon,authenticated,service_role;
grant execute on function public.search_my_question_bank(text,text,text,text,text,uuid),
  public.review_my_bank_question(uuid,text,boolean,text) to authenticated;

-- An unanswered item is seen, not an incorrect submitted answer. Do not
-- erase a previous answered status when the current attempt skips the item.
do $$
declare d text:=pg_get_functiondef('public.submit_test_session(uuid,bigint)'::regprocedure);
  a text:=$a$case when item.is_correct then 'Answered correctly' else 'Answered incorrectly' end$a$;
begin
  if strpos(d,a)=0 then raise exception 'Unexpected submitted status definition'; end if;
  d:=replace(d,a,$r$case when item.selected_option_id is null then 'Seen' when item.is_correct then 'Answered correctly' else 'Answered incorrectly' end$r$);
  execute replace(d,'set status = excluded.status,',$r$set status = case when excluded.status='Seen'
    and user_question_status.status in ('Answered correctly','Answered incorrectly')
    then user_question_status.status else excluded.status end,$r$);
end;
$$;
