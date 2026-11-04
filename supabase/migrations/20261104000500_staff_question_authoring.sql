create table private.staff_question_imports (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  request_key uuid not null,
  request_hash text not null,
  source text not null check(source in ('manual','json')),
  outcome jsonb not null,
  created_at timestamptz not null default now(),
  unique(actor_id,request_key)
);
revoke all on private.staff_question_imports from public,anon,authenticated,service_role;
alter table public.generated_question_candidates
  add column staff_import_id uuid references private.staff_question_imports(id),
  add column staff_import_row integer check(staff_import_row between 1 and 100),
  add unique(staff_import_id,staff_import_row);
create index questions_staff_duplicate_text_idx on public.questions(md5(lower(btrim(question_text))));
create index candidates_staff_duplicate_text_idx on public.generated_question_candidates(md5(lower(btrim(question_text))));

-- Normalize PRD upload fields into the same content contract used by review.
create function private.normalize_staff_question(row_data jsonb) returns jsonb
language plpgsql set search_path=pg_catalog,public,pg_temp as $$
declare c jsonb; options jsonb; answer text;
begin
  if jsonb_typeof(row_data) is distinct from 'object' then raise exception 'Expected a question object.'; end if;
  if exists(select 1 from jsonb_object_keys(row_data) k where k not in
    ('partitionKey','questionText','options','correctOptionId','correctAnswerIndex','explanation','difficulty','tags','questionType','performanceIndicator'))
  then raise exception 'Unexpected question field.'; end if;
  if exists(select 1 from unnest(array['partitionKey','questionText','explanation','difficulty','questionType','performanceIndicator']) k
    where jsonb_typeof(row_data->k) is distinct from 'string')
  then raise exception 'Partition, question, explanation, difficulty, type and indicator must be strings.'; end if;
  if (row_data?'correctOptionId')=(row_data?'correctAnswerIndex') then raise exception 'Provide one correct answer.'; end if;
  if row_data?'correctAnswerIndex' then
    if jsonb_typeof(row_data->'correctAnswerIndex')<>'number' or coalesce(row_data->>'correctAnswerIndex','') !~ '^[0-3]$'
    then raise exception 'Correct answer index must be an integer from 0 to 3.'; end if;
    answer:=substr('ABCD',(row_data->>'correctAnswerIndex')::integer+1,1);
  else
    answer:=upper(btrim(row_data->>'correctOptionId'));
  end if;
  if jsonb_typeof(row_data->'options') is distinct from 'array' then
    raise exception 'Exactly four options are required.';
  end if;
  if jsonb_array_length(row_data->'options')<>4 then
    raise exception 'Exactly four options are required.';
  end if;
  if exists(select 1 from jsonb_array_elements(row_data->'options') with ordinality o(v,n)
    where case when jsonb_typeof(v) is distinct from 'object' then true else
       jsonb_typeof(v->'text') is distinct from 'string'
       or coalesce(v->>'id','')<>substr('ABCD',n::integer,1)
       or v - 'id' - 'text' <> '{}'::jsonb end)
  then raise exception 'Options must have an id in A-D order and string text.'; end if;
  select jsonb_agg(jsonb_build_object('id',v->>'id','text',btrim(v->>'text')) order by n) into options
    from jsonb_array_elements(row_data->'options') with ordinality o(v,n);
  c:=jsonb_build_object('question_text',btrim(row_data->>'questionText'),'options',options,
    'correct_option_id',answer,'explanation',btrim(row_data->>'explanation'),
    'performance_indicator',btrim(row_data->>'performanceIndicator'),
    'partition_keys',jsonb_build_array(btrim(row_data->>'partitionKey')),
    'question_type',public.generated_question_type_label(row_data->>'questionType'),
    'difficulty',public.generated_difficulty_label(row_data->>'difficulty'),'tags',row_data->'tags');
  perform private.validate_review_content(c);
  return c||jsonb_build_object('tags',array(select distinct btrim(t) from jsonb_array_elements_text(c->'tags') t order by btrim(t)));
end;
$$;

create function private.inspect_staff_questions(p_rows jsonb) returns jsonb
language plpgsql stable set search_path=pg_catalog,public,pg_temp as $$
declare row_data jsonb; c jsonb; items jsonb:='[]'; n integer:=0; normalized text;
  seen text[]:='{}'; issue text; state text;
begin
  if jsonb_typeof(p_rows) is distinct from 'array' then raise exception 'Upload must be a JSON array.'; end if;
  if jsonb_array_length(p_rows) not between 1 and 100 or octet_length(p_rows::text)>262144
  then raise exception 'Upload must contain 1–100 questions and at most 256 KiB.'; end if;
  for row_data in select value from jsonb_array_elements(p_rows) loop
    n:=n+1; state:='ready'; issue:=null; c:=null;
    begin
      c:=private.normalize_staff_question(row_data);
      normalized:=lower(c->>'question_text');
      if normalized=any(seen)
        or exists(select 1 from public.questions q where md5(lower(btrim(q.question_text)))=md5(normalized) and lower(btrim(q.question_text))=normalized)
        or exists(select 1 from public.generated_question_candidates q where md5(lower(btrim(q.question_text)))=md5(normalized) and lower(btrim(q.question_text))=normalized)
      then state:='duplicate'; issue:='Matching question text already exists.'; end if;
      seen:=array_append(seen,normalized);
    exception when raise_exception then
      state:='invalid'; issue:=left(sqlerrm,250);
    end;
    items:=items||jsonb_build_array(jsonb_build_object('row',n,'status',state,'issue',issue,'content',c));
  end loop;
  return items;
end;
$$;

create function public.preview_staff_questions(p_rows jsonb) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public,pg_temp as $$
declare items jsonb;
begin
  if not coalesce(public.is_admin(),false) then raise insufficient_privilege using message='Staff access required.'; end if;
  items:=private.inspect_staff_questions(p_rows);
  return jsonb_build_object('rows',items,'token',encode(extensions.digest(jsonb_build_array(p_rows,items)::text,'sha256'),'hex'));
end;
$$;

revoke all on function private.normalize_staff_question(jsonb),private.inspect_staff_questions(jsonb),public.preview_staff_questions(jsonb)
  from public,anon,authenticated,service_role;
grant execute on function public.preview_staff_questions(jsonb) to authenticated;

create function public.commit_staff_questions(p_rows jsonb,p_token text,p_key uuid,p_source text,p_reason text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare preview jsonb; item jsonb; c jsonb; request_hash text; receipt private.staff_question_imports;
  results jsonb:='[]'; candidate uuid; ready_count integer:=0;
  reason text:=btrim(coalesce(p_reason,''));
begin
  if not coalesce(public.is_admin(),false) then raise insufficient_privilege using message='Staff access required.'; end if;
  if p_key is null or coalesce(p_source,'') not in ('manual','json') or length(reason) not between 5 and 1000
    or coalesce(p_token,'') !~ '^[a-f0-9]{64}$'
  then raise exception 'A reviewed preview, request key and reason are required.'; end if;
  if jsonb_typeof(p_rows) is distinct from 'array' then raise exception 'Upload must be a JSON array.'; end if;
  if jsonb_array_length(p_rows) not between 1 and 100 or octet_length(p_rows::text)>262144
    or (p_source='manual' and jsonb_array_length(p_rows)<>1) then raise exception 'Invalid upload size.'; end if;
  request_hash:=encode(extensions.digest(jsonb_build_array(p_rows,p_token,p_source,reason)::text,'sha256'),'hex');
  -- Serialize staff imports so concurrent previews cannot both insert matching text.
  perform pg_advisory_xact_lock(hashtextextended('staff-question-authoring-v1',0));
  select * into receipt from private.staff_question_imports where actor_id=auth.uid() and request_key=p_key;
  if found then
    if receipt.request_hash<>request_hash then raise exception 'Request key already used for different input.'; end if;
    return receipt.outcome;
  end if;
  preview:=public.preview_staff_questions(p_rows);
  if preview->>'token'<>p_token then raise exception 'Preview changed. Preview the current upload again.'; end if;
  if not exists(select 1 from jsonb_array_elements(preview->'rows') r where r->>'status'='ready')
  then raise exception 'No valid non-duplicate rows to import.'; end if;
  insert into private.staff_question_imports(actor_id,request_key,request_hash,source,outcome)
    values(auth.uid(),p_key,request_hash,p_source,'{}') returning * into receipt;
  for item in select value from jsonb_array_elements(preview->'rows') loop
    candidate:=null;
    if item->>'status'='ready' then
      c:=item->'content';
      insert into public.generated_question_candidates(
        performance_indicator,partition_keys,category,question_type,question_text,options,correct_option_id,
        explanation,difficulty,tags,question_hash,validation_status,review_status,staff_import_id,staff_import_row
      ) values (
        c->>'performance_indicator',c->'partition_keys',c->'partition_keys'->>0,c->>'question_type',c->>'question_text',
        c->'options',c->>'correct_option_id',c->>'explanation',c->>'difficulty',
        array(select jsonb_array_elements_text(c->'tags')),
        encode(extensions.digest(lower(c->>'question_text'),'sha256'),'hex'),
        'Valid','Pending Review',receipt.id,(item->>'row')::integer
      ) returning id into candidate;
      ready_count:=ready_count+1;
    end if;
    results:=results||jsonb_build_array((item-'content')||jsonb_build_object('candidate_id',candidate,
      'status',case when candidate is not null then 'pending_review' else item->>'status' end));
  end loop;
  receipt.outcome:=jsonb_build_object('import_id',receipt.id,'rows',results,'pending_review',ready_count,'published',0);
  update private.staff_question_imports set outcome=receipt.outcome where id=receipt.id;
  insert into public.admin_audit_logs(actor_user_id,actor_role,action,resource_type,resource_id,reason,metadata)
    values(auth.uid(),public.current_user_role(),'question.staff_import','staff_question_import',receipt.id::text,reason,
      jsonb_build_object('source',p_source,'outcome',receipt.outcome));
  return receipt.outcome;
end;
$$;
revoke all on function public.commit_staff_questions(jsonb,text,uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.commit_staff_questions(jsonb,text,uuid,text,text) to authenticated;
