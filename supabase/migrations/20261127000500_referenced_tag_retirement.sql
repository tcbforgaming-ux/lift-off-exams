alter table private.staff_tags add column retired boolean not null default false;
create function public.set_staff_tag_retired(p_label text,p_revision bigint,p_retired boolean,p_reason text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
declare t private.staff_tags;
begin
 if not coalesce(public.is_admin(),false) then raise insufficient_privilege;end if;
 if p_retired is null or length(btrim(coalesce(p_reason,''))) not between 5 and 1000
   or length(coalesce(p_label,'')) not between 1 and 100 then raise invalid_parameter_value;end if;
 perform pg_advisory_xact_lock(hashtextextended('staff-tag:'||p_label,0));
 select * into t from private.staff_tags where label=p_label for update;
 if not found then
   if p_revision<>0 then raise exception 'Tag changed; reload.';end if;
   insert into private.staff_tags(label,description,created_by) values(p_label,'',auth.uid()) returning * into t;
 end if;
 if t.retired=p_retired then return to_jsonb(t);end if;
 if p_revision<>t.revision and not (p_revision=0 and t.revision=1) then raise exception 'Tag changed; reload.';end if;
 update private.staff_tags set retired=p_retired,revision=revision+1,updated_at=clock_timestamp() where label=p_label returning * into t;
 insert into public.admin_audit_logs(actor_user_id,actor_role,action,resource_type,resource_id,reason,new_values)
 values(auth.uid(),public.current_user_role(),case when p_retired then 'tag.retire' else 'tag.restore' end,'tag',p_label,btrim(p_reason),to_jsonb(t));
 return to_jsonb(t);
end;$$;
do $$
declare d text:=pg_get_functiondef('public.list_staff_tags(text,text)'::regprocedure);
begin
 if strpos(d,'coalesce(t.revision,0) as revision')=0 then raise exception 'Unexpected tag catalog';end if;
 execute replace(d,'coalesce(t.revision,0) as revision','coalesce(t.revision,0) as revision,coalesce(t.retired,false) as retired');
end;$$;
create function public.get_selectable_topic_tags(p_labels text[]) returns text[]
language plpgsql stable security definer set search_path=pg_catalog,pg_temp as $$
begin
 if auth.uid() is null or cardinality(p_labels)>250 then raise insufficient_privilege;end if;
 return array(select distinct x from unnest(p_labels)x where not exists(select 1 from private.staff_tags t where t.label=x and retired) order by x);
end;$$;
-- Existing blueprint rules and question associations retain their meaning.
-- Only new authoring and new custom topic choices reject retired labels.
do $$
declare d text; anchor text;
begin
 d:=pg_get_functiondef('private.normalize_staff_question(jsonb)'::regprocedure);
 anchor:='  return ';
 -- The normalizer has a single return expression at the end.
 if strpos(d,anchor)=0 then raise exception 'Unexpected normalizer';end if;
 execute replace(d,anchor,$r$  if exists(select 1 from jsonb_array_elements_text(c->'tags') x
      join private.staff_tags t on t.label=btrim(x) where t.retired) then
    raise exception 'Retired tags cannot be assigned to new questions.';
  end if;
  return $r$);
 d:=pg_get_functiondef('public.generate_custom_practice(uuid,text,integer,text[],text[],integer,boolean,boolean,text,text)'::regprocedure);
 anchor:='  if not selected_tags <@ allowed_tags then';
 if strpos(d,anchor)=0 then raise exception 'Unexpected custom topic validation';end if;
 execute replace(d,anchor,$r$  if exists(select 1 from private.staff_tags t where t.retired and t.label=any(selected_tags))
    and not exists(select 1 from public.test_ids where created_by=auth.uid() and idempotency_key=p_idempotency_key and generation_status='Ready') then
    raise exception 'Select active topic tags for new custom practice.';
  end if;
$r$||anchor);
end;$$;
revoke all on function public.set_staff_tag_retired(text,bigint,boolean,text),public.get_selectable_topic_tags(text[])
from public,anon,authenticated,service_role;
grant execute on function public.set_staff_tag_retired(text,bigint,boolean,text),public.get_selectable_topic_tags(text[]) to authenticated;
