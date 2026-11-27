create function public.get_repository_question(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public,pg_temp as $$
declare q public.questions;
begin
  if not coalesce(public.is_admin(),false) then raise insufficient_privilege using message='Staff access required.'; end if;
  select * into q from public.questions where id=p_id;
  if not found then raise exception 'Question not found.'; end if;
  return to_jsonb(q);
end;
$$;

create function public.edit_repository_question(p_id uuid,p_expected timestamptz,p_content jsonb,p_reason text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare q public.questions; c jsonb; before_values jsonb; after_values jsonb; revision_id uuid;
  reason text:=btrim(coalesce(p_reason,''));
begin
  if not coalesce(public.is_admin(),false) then raise insufficient_privilege using message='Staff access required.'; end if;
  if length(reason) not between 5 and 1000 then raise exception 'Provide a reason of 5 to 1000 characters.'; end if;
  if jsonb_typeof(p_content) is distinct from 'object' or octet_length(p_content::text)>40000
  then raise exception 'Invalid question content.'; end if;
  if exists(select 1 from jsonb_object_keys(p_content) k where k not in
    ('question_text','options','correct_option_id','explanation','performance_indicator','partition_key','question_type','difficulty','tags'))
  then raise exception 'Unexpected question field.'; end if;
  select * into q from public.questions where id=p_id for update;
  if not found then raise exception 'Question not found.'; end if;
  if q.updated_at is distinct from p_expected then raise exception 'Question changed. Reload the current version before saving.'; end if;
  c:=p_content||jsonb_build_object('partition_keys',jsonb_build_array(p_content->>'partition_key'));
  perform private.validate_review_content(c);
  before_values:=to_jsonb(q);
  update public.questions set
    question_text=btrim(c->>'question_text'),options=c->'options',
    correct_option_id=c->>'correct_option_id',explanation=btrim(c->>'explanation'),
    performance_indicator=btrim(c->>'performance_indicator'),partition_key=c->>'partition_key',
    question_type=public.generated_question_type_label(c->>'question_type'),difficulty=c->>'difficulty',
    tags=array(select distinct btrim(tag) from jsonb_array_elements_text(c->'tags') tag order by btrim(tag)),
    question_hash=encode(extensions.digest(p_content::text,'sha256'),'hex')
  where id=p_id returning * into q;
  after_values:=to_jsonb(q);
  insert into public.question_versions(question_id,version_number,snapshot,previous_snapshot,change_reason,created_by)
    select p_id,coalesce(max(v.version_number),0)+1,after_values,before_values,reason,auth.uid()
    from public.question_versions v where v.question_id=p_id returning id into revision_id;
  insert into public.admin_audit_logs(actor_user_id,actor_role,action,resource_type,resource_id,reason,previous_values,new_values,metadata)
    values(auth.uid(),public.current_user_role(),'question.repository_edited','question',p_id::text,reason,
      before_values,after_values,jsonb_build_object('question_version_id',revision_id));
  return after_values;
end;
$$;

revoke all on function public.get_repository_question(uuid),public.edit_repository_question(uuid,timestamptz,jsonb,text)
  from public,anon,authenticated,service_role;
grant execute on function public.get_repository_question(uuid),public.edit_repository_question(uuid,timestamptz,jsonb,text)
  to authenticated;

create function public.set_repository_question_lifecycle(p_question_id uuid,p_new_state text,p_reason text,p_expected timestamptz)
returns table(question_id uuid,lifecycle_state text,updated_at timestamptz)
language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare q public.questions;
begin
  if not coalesce(public.is_admin(),false) then raise insufficient_privilege using message='Staff access required.'; end if;
  select * into q from public.questions where id=p_question_id for update;
  if not found then raise exception 'Question not found.'; end if;
  if q.updated_at is distinct from p_expected then raise exception 'Question changed. Reload before changing lifecycle.'; end if;
  if p_new_state='Active' and q.lifecycle_state='Retired' then
    perform private.validate_review_content(to_jsonb(q)||jsonb_build_object('partition_keys',jsonb_build_array(q.partition_key)));
  end if;
  return query select * from public.set_question_lifecycle_state(p_question_id,p_new_state,p_reason);
end;
$$;
revoke all on function public.set_repository_question_lifecycle(uuid,text,text,timestamptz) from public,anon,authenticated,service_role;
grant execute on function public.set_repository_question_lifecycle(uuid,text,text,timestamptz) to authenticated;
