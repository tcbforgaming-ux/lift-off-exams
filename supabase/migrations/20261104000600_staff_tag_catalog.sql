-- Labels remain exact text in the bank, candidate pipeline and snapshots.
-- A catalog entry adds editable metadata, never a requirement on legacy writers.
create table private.staff_tags (
  label text primary key check(length(label) between 1 and 100 and label=btrim(label)),
  description text not null check(length(description)<=1000),
  revision bigint not null default 1,
  created_by uuid not null,
  updated_at timestamptz not null default clock_timestamp()
);
revoke all on private.staff_tags from public,anon,authenticated,service_role;

create function private.observed_tag_labels() returns table(label text)
language sql stable set search_path=pg_catalog,public,pg_temp as $$
  select t.label from private.staff_tags t
  union select unnest(q.tags) from public.questions q
  union select unnest(q.tags) from public.generated_question_candidates q
  union
  select tags.value #>> '{}' from public.blueprint_versions b
  cross join lateral jsonb_path_query(b.distribution, '$.strata[*].tags[*] ? (@.type() == "string")') tags(value)
  where b.practice_parent_id is null and b.status<>'Draft'
  union
  select tags.value #>> '{}' from public.blueprint_versions b
  cross join lateral jsonb_path_query(b.distribution, '$.strata[*].excluded_tags[*] ? (@.type() == "string")') tags(value)
  where b.practice_parent_id is null and b.status<>'Draft'
$$;
revoke all on function private.observed_tag_labels() from public,anon,authenticated,service_role;

create function public.list_staff_tags(p_search text default '',p_after text default null) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public,pg_temp as $$
begin
  if not coalesce(public.is_admin(),false) then raise insufficient_privilege using message='Staff access required.'; end if;
  if length(coalesce(p_search,''))>100 or length(coalesce(p_after,''))>5000 then raise exception 'Tag filter is too long.'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(x) order by x.label collate "C"),'[]') from (
    select l.label,coalesce(t.description,'') as description,coalesce(t.revision,0) as revision
    from private.observed_tag_labels() l left join private.staff_tags t on t.label=l.label
    where l.label is not null and (p_after is null or l.label collate "C">p_after collate "C")
      and strpos(lower(l.label),lower(btrim(coalesce(p_search,''))))>0
    order by l.label collate "C" limit 26
  ) x);
end;
$$;

create function public.get_staff_tag_dependencies(p_label text) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public,pg_temp as $$
declare refs jsonb;
begin
  if not coalesce(public.is_admin(),false) then raise insufficient_privilege using message='Staff access required.'; end if;
  if length(coalesce(p_label,'')) not between 1 and 5000 then raise exception 'Invalid tag label.'; end if;
  select coalesce(jsonb_agg(to_jsonb(b) order by b.blueprint_name,b.version,b.id),'[]') into refs from (
    select id,blueprint_name,version,status from public.blueprint_versions
    where practice_parent_id is null and (
      jsonb_path_exists(distribution,'$.strata[*].tags[*] ? (@ == $label)',jsonb_build_object('label',p_label))
      or jsonb_path_exists(distribution,'$.strata[*].excluded_tags[*] ? (@ == $label)',jsonb_build_object('label',p_label)))
    order by blueprint_name,version,id limit 26
  ) b;
  return jsonb_build_object('active_questions',(select count(*) from public.questions where lifecycle_state='Active' and tags @> array[p_label]),
    'pending_candidates',(select count(*) from public.generated_question_candidates where review_status in ('Pending Review','Needs Edit','Approved') and tags @> array[p_label]),
    'blueprints',refs);
end;
$$;

create function public.save_staff_tag(p_label text,p_description text,p_expected bigint,p_reason text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare old_tag private.staff_tags; new_tag private.staff_tags;
  tag_label text:=btrim(coalesce(p_label,'')); reason text:=btrim(coalesce(p_reason,''));
begin
  if not coalesce(public.is_admin(),false) then raise insufficient_privilege using message='Staff access required.'; end if;
  if length(tag_label) not between 1 and 100 or tag_label ~ '[[:cntrl:]]' or position(',' in tag_label)>0
    or length(coalesce(p_description,''))>1000 or length(reason) not between 5 and 1000
  then raise exception 'Provide a valid label, description and reason.'; end if;
  if p_expected is null then raise exception 'Tag revision is required.'; end if;
  perform pg_advisory_xact_lock(hashtextextended('staff-tag:'||tag_label,0));
  select * into old_tag from private.staff_tags where label=tag_label for update;
  if coalesce(old_tag.revision,0)<>p_expected then raise exception 'Tag metadata changed. Reload before saving.'; end if;
  insert into private.staff_tags(label,description,created_by) values(tag_label,btrim(coalesce(p_description,'')),auth.uid())
    on conflict(label) do update set description=excluded.description,revision=staff_tags.revision+1,updated_at=clock_timestamp()
    returning * into new_tag;
  insert into public.admin_audit_logs(actor_user_id,actor_role,action,resource_type,resource_id,reason,previous_values,new_values)
    values(auth.uid(),public.current_user_role(),'tag.metadata_saved','tag',tag_label,reason,to_jsonb(old_tag),to_jsonb(new_tag));
  return to_jsonb(new_tag);
end;
$$;
revoke all on function public.list_staff_tags(text,text),public.get_staff_tag_dependencies(text),public.save_staff_tag(text,text,bigint,text)
  from public,anon,authenticated,service_role;
grant execute on function public.list_staff_tags(text,text),public.get_staff_tag_dependencies(text),public.save_staff_tag(text,text,bigint,text) to authenticated;
