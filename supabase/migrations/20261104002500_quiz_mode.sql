create function private.has_paid_activity_access(p_user uuid) returns boolean
language sql stable set search_path=pg_catalog,public,pg_temp as $$
  select exists(select 1 from public.subscriptions s where s.user_id=p_user
    and s.status in ('active','trialing')
    and (s.current_period_end is null or s.current_period_end>now()))
$$;
revoke all on function private.has_paid_activity_access(uuid) from public,anon,authenticated,service_role;

-- Apply the same launch policy to direct attempts through a shared Quiz ID.
do $$
declare d text:=pg_get_functiondef('private.resolve_test_launch(text,jsonb)'::regprocedure);
  anchor text:='  paid:=public.has_premium_explanation_access(auth.uid());';
begin
  if strpos(d,anchor)=0 then raise exception 'Unexpected launch resolver'; end if;
  execute replace(d,anchor,$r$
  if d.mode='Quiz' then
    if private.account_erasure_blocked(auth.uid()) or not private.has_paid_activity_access(auth.uid()) then
      raise insufficient_privilege using message='An active subscription is required to start a Quiz.';
    end if;
    if coalesce(p_options,'{}')<>'{}'::jsonb then raise exception 'Quiz launch settings are fixed.'; end if;
    return jsonb_build_object('question_count',d.question_count,'timer_minutes',null,
      'show_answers',false,'show_explanations',false,'can_customize',false,'selection','source_prefix_v1');
  end if;
$r$||anchor);
end;
$$;

-- The existing Test staff exception does not grant paid Quiz review fields.
do $$
declare r regprocedure; d text; anchor text:='public.has_premium_explanation_access(actor_id)';
  replacement text:=$r$(case when exists(select 1 from public.test_sessions s
    where s.id=p_session_id and s.user_id=actor_id and s.mode='Quiz')
    then private.has_paid_activity_access(actor_id) else public.has_premium_explanation_access(actor_id) end)$r$;
begin
  foreach r in array array['public.get_test_result(uuid)'::regprocedure,
    'public.get_test_result_explanations(uuid)'::regprocedure] loop
    d:=pg_get_functiondef(r);
    if strpos(d,anchor)=0 then raise exception 'Unexpected result entitlement'; end if;
    execute replace(d,anchor,replacement);
  end loop;
end;
$$;

create function public.start_quiz(p_request uuid,p_question_count integer default 20)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare actor uuid:=auth.uid(); code text; definition uuid:=gen_random_uuid();
  key text:='quiz:'||p_request::text; selected uuid[]; result record;
begin
  if actor is null or private.account_erasure_blocked(actor)
    or not private.has_paid_activity_access(actor) then
    raise insufficient_privilege using message='An active subscription is required to start a Quiz.';
  end if;
  if p_request is null or p_question_count is distinct from 20 then
    raise exception 'Quiz currently requires exactly 20 questions and a request ID.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('quiz-launch:'||actor::text||':'||key,0));
  select id into code from public.test_ids where created_by=actor and idempotency_key=key and mode='Quiz';
  if code is null then
    select array_agg(id order by rank,id) into selected from (
      select q.id,md5(p_request::text||q.id::text) rank from public.questions q
      where q.lifecycle_state='Active' and btrim(q.question_text)<>'' and q.difficulty in ('Easy','Medium','Hard')
        and q.correct_option_id in ('A','B','C','D')
        and jsonb_array_length(q.options)=4
      order by rank,q.id limit 20
    ) candidates;
    if coalesce(cardinality(selected),0)<>20 then
      raise exception 'There are not enough active questions to start a 20-question Quiz.';
    end if;
    loop
      code:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
      insert into public.test_ids(id,definition_id,mode,category,difficulties,topic_tags,question_count,
        pool_timestamp,created_by,generation_status,selected_question_count,idempotency_key)
      select code,definition,'Quiz','Mixed practice',array_agg(distinct difficulty),'{}',20,now(),actor,'Creating',0,key
      from public.questions where id=any(selected)
      on conflict (id) do nothing;
      exit when found;
    end loop;
    insert into public.test_definition_questions(test_definition_id,question_id,position,stratum_id,content_hash,question_updated_at)
    select definition,q.id,m.n,'quiz',coalesce(q.question_hash,encode(extensions.digest(
      convert_to(jsonb_build_object('question_text',q.question_text,'options',q.options,
        'correct_option_id',q.correct_option_id,'explanation',q.explanation,
        'difficulty',q.difficulty,'tags',q.tags)::text,'UTF8'),'sha256'),'hex')),q.updated_at
    from unnest(selected) with ordinality m(id,n) join public.questions q on q.id=m.id;
    update public.test_ids set generation_status='Ready',selected_question_count=20 where id=code;
  end if;
  select * into result from private.start_configured_session(code,key,private.resolve_test_launch(code,null));
  return to_jsonb(result);
end;
$$;
revoke all on function public.start_quiz(uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.start_quiz(uuid,integer) to authenticated;

-- Keep mode lookup on the owned session path and answer evidence on submission.
do $$
declare d text:=pg_get_functiondef('public.get_practice_session_settings(uuid)'::regprocedure);
  c text:=pg_get_functiondef('private.capture_test_answer_evidence()'::regprocedure);
begin
  if strpos(d,'''timer_seconds'', s.timer_seconds')=0 or strpos(c,'s.mode=''Test''')=0
  then raise exception 'Unexpected session settings or answer evidence source'; end if;
  execute replace(d,'''timer_seconds'', s.timer_seconds','''mode'', s.mode, ''timer_seconds'', s.timer_seconds');
  execute replace(c,'s.mode=''Test''','s.mode in (''Test'',''Quiz'')');
end;
$$;
