alter table public.generated_question_candidates
  add column approved_content jsonb;

drop policy generated_question_candidates_staff_update on public.generated_question_candidates;
revoke insert, update, delete, truncate on public.generated_question_candidates from public,anon,authenticated;

create function private.candidate_content(c public.generated_question_candidates) returns jsonb
language sql immutable set search_path=pg_catalog as $$
  select jsonb_build_object('question_text',c.question_text,'options',c.options,
    'correct_option_id',c.correct_option_id,'explanation',c.explanation,'difficulty',c.difficulty,
    'question_type',c.question_type,'performance_indicator',c.performance_indicator,
    'partition_keys',c.partition_keys,'category',c.category,'tags',c.tags)
$$;

create function private.validate_review_content(c jsonb) returns void
language plpgsql immutable set search_path=pg_catalog as $$
begin
  if length(btrim(coalesce(c->>'question_text',''))) not between 5 and 5000
     or length(btrim(coalesce(c->>'explanation',''))) not between 5 and 5000
     or length(btrim(coalesce(c->>'performance_indicator',''))) not between 1 and 200
  then raise exception 'Question, explanation and indicator must meet content length requirements.'; end if;
  if coalesce(c->>'question_type','') not in ('S','D','F','A','Scenario','Definition','Fill-in-the-Blank','All Except','Fill in the Blank','All of the Above')
    or coalesce(c->>'difficulty','') not in ('Easy','Medium','Hard')
    or coalesce(c->>'correct_option_id','') not in ('A','B','C','D')
  then raise exception 'Invalid question type, difficulty or correct option.'; end if;
  if jsonb_typeof(c->'options') is distinct from 'array' then raise exception 'Exactly four options are required.'; end if;
  if jsonb_array_length(c->'options')<>4 or exists(
    select 1 from jsonb_array_elements(c->'options') with ordinality o(v,n)
    where case jsonb_typeof(v)
      when 'string' then length(btrim(v#>>'{}')) not between 1 and 1000
      when 'object' then coalesce(v->>'id','')<>substr('ABCD',n::integer,1)
        or jsonb_typeof(v->'text') is distinct from 'string'
        or length(btrim(coalesce(v->>'text',''))) not between 1 and 1000
      else true end
  ) then raise exception 'Exactly four non-empty options in A-D order are required.'; end if;
  if jsonb_typeof(c->'partition_keys') is distinct from 'array' or jsonb_typeof(c->'tags') is distinct from 'array'
  then raise exception 'Partitions and tags must be arrays.'; end if;
  if jsonb_array_length(c->'partition_keys') not between 1 and 6 or exists(
    select 1 from jsonb_array_elements_text(c->'partition_keys') p
    where p is null or p not in ('Business Administration Core','Marketing','Finance','Business Management and Administration','Hospitality and Tourism','Entrepreneurship')
  ) then raise exception 'Invalid candidate partition.'; end if;
  if jsonb_array_length(c->'tags') not between 1 and 20 or exists(
    select 1 from jsonb_array_elements(c->'tags') t where jsonb_typeof(t)<>'string' or length(btrim(t#>>'{}')) not between 1 and 100
  ) then raise exception 'Provide 1 to 20 valid tags.'; end if;
end;
$$;

create function public.review_candidate(p_id uuid,p_revision bigint,p_action text,p_reason text,p_key text,p_content jsonb default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare c public.generated_question_candidates; before_content jsonb; after_content jsonb;
  previous_request jsonb; request jsonb; reason text:=btrim(coalesce(p_reason,''));
begin
  if not coalesce(public.is_admin(),false) then raise insufficient_privilege using message='Staff access required.'; end if;
  if length(reason) not between 5 and 1000 or length(coalesce(p_key,'')) not between 1 and 128
    or coalesce(p_action,'') not in ('edit','approve','reject') then raise exception 'Valid action, reason and request key required.'; end if;
  if octet_length(coalesce(p_content::text,''))>30000 then raise exception 'Candidate edit is too large.'; end if;
  select * into c from public.generated_question_candidates where id=p_id for update;
  if not found then raise exception 'Candidate not found.'; end if;
  request:=jsonb_build_array(p_action,p_revision,reason,p_content);
  select metadata->'request' into previous_request from public.admin_audit_logs
    where resource_type='candidate' and resource_id=p_id::text and actor_user_id=auth.uid() and correlation_id=p_key;
  if found then
    if previous_request is distinct from request then raise exception 'Request key already used for different content.'; end if;
    return public.get_review_candidate(p_id);
  end if;
  if c.review_revision is distinct from p_revision then raise exception 'Candidate changed. Reload before retrying.'; end if;
  if c.review_status='Published' then raise exception 'Published candidates cannot be changed.'; end if;
  before_content:=private.candidate_content(c);
  if p_action='edit' then
    if jsonb_typeof(p_content) is distinct from 'object' then raise exception 'Candidate content required.'; end if;
    if exists(select 1 from jsonb_object_keys(p_content) k where k not in
      ('question_text','options','correct_option_id','explanation','difficulty','question_type','performance_indicator','partition_keys','tags'))
    then raise exception 'Unexpected candidate field.'; end if;
    after_content:=before_content||p_content;
    perform private.validate_review_content(after_content);
    update public.generated_question_candidates set
      question_text=after_content->>'question_text', options=after_content->'options',
      correct_option_id=after_content->>'correct_option_id', explanation=after_content->>'explanation',
      difficulty=after_content->>'difficulty', question_type=after_content->>'question_type',
      performance_indicator=after_content->>'performance_indicator', partition_keys=after_content->'partition_keys',
      tags=array(select jsonb_array_elements_text(after_content->'tags')),
      question_hash=encode(extensions.digest(lower(btrim(after_content->>'question_text')),'sha256'),'hex'),
      review_revision=review_revision+1, approved_content=null, review_status='Pending Review',
      validation_status='Valid', validation_errors='{}', reviewed_by=null, reviewed_at=null where id=p_id;
  else
    if p_content is not null then raise exception 'A decision cannot include edits.'; end if;
    if c.review_status not in ('Pending Review','Needs Edit') then raise exception 'Candidate must be pending review.'; end if;
    if p_action='approve' then perform private.validate_review_content(before_content); end if;
    update public.generated_question_candidates set
      review_revision=review_revision+1,
      review_status=case when p_action='approve' then 'Approved' else 'Rejected' end,
      approved_content=case when p_action='approve' then before_content end,
      validation_status=case when p_action='approve' then 'Valid' else validation_status end,
      validation_errors=case when p_action='approve' then '{}'::text[] else validation_errors end,
      reviewed_by=auth.uid(),reviewed_at=clock_timestamp() where id=p_id;
  end if;
  insert into public.admin_audit_logs(actor_user_id,actor_role,action,resource_type,resource_id,reason,correlation_id,previous_values,new_values,metadata)
    values(auth.uid(),public.current_user_role(),'candidate.'||p_action,'candidate',p_id::text,reason,p_key,
      before_content,coalesce(after_content,before_content),jsonb_build_object('request',request,'revision',p_revision+1));
  return public.get_review_candidate(p_id);
end;
$$;

alter function public.publish_generated_question(uuid) set schema private;
revoke all on function private.publish_generated_question(uuid) from public,anon,authenticated,service_role;

create function public.publish_review_candidate(p_id uuid,p_revision bigint,p_reason text)
returns uuid language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare c public.generated_question_candidates; published uuid;
begin
  if not coalesce(public.is_admin(),false) then raise insufficient_privilege using message='Staff access required.'; end if;
  if length(btrim(coalesce(p_reason,''))) not between 5 and 1000 then raise exception 'Publication reason required.'; end if;
  select * into c from public.generated_question_candidates where id=p_id for update;
  if not found then raise exception 'Candidate not found.'; end if;
  if c.review_status='Published' then return c.published_question_id; end if;
  if c.review_revision is distinct from p_revision then raise exception 'Candidate changed. Reload before publishing.'; end if;
  if c.approved_content is null or c.approved_content is distinct from private.candidate_content(c)
  then raise exception 'Current content requires approval.'; end if;
  perform private.validate_review_content(c.approved_content);
  published:=private.publish_generated_question(p_id);
  insert into public.admin_audit_logs(actor_user_id,actor_role,action,resource_type,resource_id,reason,metadata)
    values(auth.uid(),public.current_user_role(),'candidate.publish','candidate',p_id::text,btrim(p_reason),
      jsonb_build_object('question_id',published,'revision',p_revision));
  return published;
end;
$$;

-- Keep the old signature for callers but route it through the same approval guard.
create function public.publish_generated_question(p_candidate_id uuid) returns uuid
language sql security definer set search_path=pg_catalog,public,pg_temp as $$
  select public.publish_review_candidate(p_candidate_id,
    (select review_revision from public.generated_question_candidates where id=p_candidate_id),
    'Publication requested through the original API')
$$;

create function public.get_candidate_review_history(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public,pg_temp as $$
begin
  if not coalesce(public.is_admin(),false) then raise insufficient_privilege using message='Staff access required.'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(h) order by h.created_at desc,h.id desc),'[]')
    from (select id,action,actor_user_id,reason,created_at from public.admin_audit_logs
    where resource_type='candidate' and resource_id=p_id::text order by created_at desc,id desc limit 25) h);
end;
$$;

create function public.get_candidate_review_revision(p_id uuid) returns bigint
language plpgsql stable security definer set search_path=pg_catalog,public,pg_temp as $$
begin
  if not coalesce(public.is_admin(),false) then raise insufficient_privilege using message='Staff access required.'; end if;
  return (select review_revision from public.generated_question_candidates where id=p_id);
end;
$$;

revoke all on function private.candidate_content(public.generated_question_candidates),private.validate_review_content(jsonb)
  from public,anon,authenticated,service_role;
revoke all on function public.review_candidate(uuid,bigint,text,text,text,jsonb),
  public.publish_review_candidate(uuid,bigint,text),public.publish_generated_question(uuid),
  public.get_candidate_review_history(uuid),public.get_candidate_review_revision(uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.review_candidate(uuid,bigint,text,text,text,jsonb),
  public.publish_review_candidate(uuid,bigint,text),public.publish_generated_question(uuid),
  public.get_candidate_review_history(uuid),public.get_candidate_review_revision(uuid) to authenticated;
