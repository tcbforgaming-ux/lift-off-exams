-- Candidate review reads are separate from importer monitoring and receipts.
alter table public.generated_question_candidates add column review_revision bigint not null default 0;
create index generated_candidate_review_cursor_idx
on public.generated_question_candidates(created_at desc, id desc);

create function public.list_review_candidates(
  p_search text default '', p_status text default null, p_validation text default null,
  p_before timestamptz default null, p_before_id uuid default null
) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public,pg_temp as $$
declare result jsonb;
begin
  if not coalesce(public.is_admin(),false) then raise insufficient_privilege using message='Staff access required.'; end if;
  if (p_before is null) <> (p_before_id is null) then raise exception 'Both cursor fields are required.'; end if;
  if length(p_search)>200 then raise exception 'Search is limited to 200 characters.'; end if;
  select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at desc,c.id desc),'[]'::jsonb)
  into result from (
    select id,batch_job_id,source_custom_id,performance_indicator,partition_keys,category,
      question_type,difficulty,validation_status,review_status,reviewed_by,reviewed_at,
      created_at,updated_at
    from public.generated_question_candidates
    where (p_status is null or review_status=p_status)
      and (p_validation is null or validation_status=p_validation)
      and (p_before is null or (created_at,id)<(p_before,p_before_id))
      and (coalesce(btrim(p_search),'')='' or
        strpos(lower(concat_ws(' ',id,performance_indicator,question_text,source_custom_id)),lower(btrim(p_search)))>0)
    order by created_at desc,id desc limit 26
  ) c;
  return result;
end;
$$;

create function public.get_review_candidate(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public,pg_temp as $$
declare result jsonb;
begin
  if not coalesce(public.is_admin(),false) then raise insufficient_privilege using message='Staff access required.'; end if;
  select jsonb_build_object(
    'id',id,'question_text',question_text,'options',options,'correct_option_id',correct_option_id,
    'explanation',explanation,'performance_indicator',performance_indicator,'partition_keys',partition_keys,
    'category',category,'question_type',question_type,'difficulty',difficulty,'tags',tags,
    'validation_status',validation_status,'validation_errors',validation_errors,
    'review_status',review_status,'reviewed_by',reviewed_by,'reviewed_at',reviewed_at,
    'batch_job_id',batch_job_id,'source_custom_id',source_custom_id,'published_question_id',published_question_id,
    'created_at',created_at,'updated_at',updated_at,'review_revision',review_revision
  ) into result from public.generated_question_candidates where id=p_id;
  if not found then raise exception 'Candidate not found.'; end if;
  return result;
end;
$$;
revoke all on function public.list_review_candidates(text,text,text,timestamptz,uuid),
  public.get_review_candidate(uuid) from public,anon,authenticated,service_role;
grant execute on function public.list_review_candidates(text,text,text,timestamptz,uuid),
  public.get_review_candidate(uuid) to authenticated;
