alter table public.blueprint_versions drop constraint blueprint_versions_status_check,
  add constraint blueprint_versions_status_check check(status in ('Active','Retired','Rolled Back','Draft')),
  add column staff_source_version_id uuid references public.blueprint_versions(id),
  add column staff_expected_active_ids uuid[];
revoke insert,update,delete,truncate on public.blueprint_versions from public,anon,authenticated;
drop policy blueprint_versions_staff_all on public.blueprint_versions;
create policy blueprint_versions_staff_read on public.blueprint_versions for select to authenticated using (public.is_admin());

-- Reuse the generation validator without allowing the generator to see drafts.
do $$
declare definition text; anchor text:=$anchor$if blueprint_row.status <> 'Active' then$anchor$;
begin
  definition:=pg_get_functiondef('public.canonicalize_test_blueprint(uuid,text)'::regprocedure);
  if strpos(definition,anchor)=0 or strpos(definition,'FUNCTION public.canonicalize_test_blueprint(')=0
  then raise exception 'Unexpected blueprint validator'; end if;
  definition:=replace(definition,'FUNCTION public.canonicalize_test_blueprint(','FUNCTION private.canonicalize_staff_blueprint(');
  execute replace(definition,anchor,$guard$if blueprint_row.status not in ('Active','Draft','Retired','Rolled Back') then$guard$);
end;
$$;
revoke all on function private.canonicalize_staff_blueprint(uuid,text) from public,anon,authenticated,service_role;

create function private.staff_blueprint_distribution(p_distribution jsonb,p_total integer) returns jsonb
language plpgsql immutable set search_path=pg_catalog,pg_temp as $$
declare strata jsonb; converted jsonb;
begin
  if jsonb_typeof(p_distribution) is distinct from 'object' or octet_length(p_distribution::text)>65536
    or p_total is null or p_total not between 1 and 250 then raise exception 'Provide a distribution up to 64 KiB and a total of 1-250.'; end if;
  strata:=p_distribution->'strata';
  if jsonb_typeof(strata) is distinct from 'array' then raise exception 'Provide a strata array.'; end if;
  if jsonb_array_length(strata) not between 1 and 250 then raise exception 'Provide 1-250 strata.'; end if;
  if exists(select 1 from jsonb_array_elements(strata) s where jsonb_typeof(s)<>'object')
  then raise exception 'Every stratum must be an object.'; end if;
  if not exists(select 1 from jsonb_array_elements(strata) s where s?'weight') then return p_distribution; end if;
  if exists(select 1 from jsonb_array_elements(strata) s where s?'count' or jsonb_typeof(s->'weight') is distinct from 'number')
  then raise exception 'Use all counts or all positive weights, not both.'; end if;
  if exists(select 1 from jsonb_array_elements(strata) s where (s->>'weight')::numeric not between 0.000001 and 1000000)
  then raise exception 'Weights must be between 0.000001 and 1000000.'; end if;
  with weighted as (
    select s,n,p_total*(s->>'weight')::numeric / sum((s->>'weight')::numeric) over () as quota
    from jsonb_array_elements(strata) with ordinality a(s,n)
  ), ranked as (
    select *, row_number() over(order by quota-floor(quota) desc,(s->>'id') collate "C",n) as rank,
      p_total-sum(floor(quota)) over () as remainder from weighted
  )
  select jsonb_agg((s-'weight')||jsonb_build_object('count',floor(quota)::integer+case when rank<=remainder then 1 else 0 end) order by n)
    into converted from ranked;
  return p_distribution||jsonb_build_object('strata',converted);
end;
$$;
revoke all on function private.staff_blueprint_distribution(jsonb,integer) from public,anon,authenticated,service_role;

create function private.staff_active_blueprint_ids(p_name text) returns uuid[]
language sql stable set search_path=pg_catalog,public,pg_temp as $$
  select coalesce(array_agg(id order by id),'{}') from public.blueprint_versions
  where blueprint_name=p_name and practice_parent_id is null and status='Active'
$$;
revoke all on function private.staff_active_blueprint_ids(text) from public,anon,authenticated,service_role;

create function private.validate_staff_blueprint_refs(p_canonical jsonb) returns void
language plpgsql stable set search_path=pg_catalog,public,pg_temp as $$
declare s jsonb; tag text; pi text; v_category text:=p_canonical->>'category';
begin
  for s in select value from jsonb_array_elements(p_canonical->'strata') loop
    for tag in select value from jsonb_array_elements_text((s->'tags')||(s->'excluded_tags')) loop
      if length(tag) not between 1 and 100 or not exists(
        select 1 from private.staff_tags t where t.label=tag
        union all select 1 from public.questions q where q.tags @> array[tag]
        union all select 1 from public.generated_question_candidates c where c.tags @> array[tag]
        union all select 1 from public.blueprint_versions b where b.practice_parent_id is null and b.status<>'Draft' and (
          jsonb_path_exists(b.distribution,'$.strata[*].tags[*] ? (@ == $label)',jsonb_build_object('label',tag))
          or jsonb_path_exists(b.distribution,'$.strata[*].excluded_tags[*] ? (@ == $label)',jsonb_build_object('label',tag))))
      then raise exception 'Unknown tag: %',tag; end if;
    end loop;
    for pi in select value from jsonb_array_elements_text(s->'performance_indicators') loop
      if length(pi) not between 1 and 200 or not exists(
        select 1 from public.questions q where q.partition_key=v_category and q.performance_indicator=pi
        union all select 1 from public.generated_question_candidates c where c.partition_keys?v_category and c.performance_indicator=pi
        union all select 1 from public.generation_queue_v3 g where g.partition_keys?v_category and (g.performance_indicator=pi or g.indicator_code=pi))
      then raise exception 'Unknown indicator in this partition: %',pi; end if;
    end loop;
  end loop;
end;
$$;
revoke all on function private.validate_staff_blueprint_refs(jsonb) from public,anon,authenticated,service_role;

create function public.list_staff_blueprints(p_search text default '',p_before timestamptz default null,p_before_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public,pg_temp as $$
begin
  if not coalesce(public.is_admin(),false) then raise insufficient_privilege using message='Staff access required.'; end if;
  if (p_before is null)<>(p_before_id is null) or length(coalesce(p_search,''))>120 then raise exception 'Invalid blueprint filter.'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id desc),'[]') from (
    select id,blueprint_name,version,category,level,status,total_questions,created_at from public.blueprint_versions
    where practice_parent_id is null and (p_before is null or (created_at,id)<(p_before,p_before_id))
      and strpos(lower(concat_ws(' ',blueprint_name,version,category,level)),lower(btrim(coalesce(p_search,''))))>0
    order by created_at desc,id desc limit 26
  ) x);
end;
$$;

create function public.get_staff_blueprint(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public,pg_temp as $$
declare b public.blueprint_versions; canonical jsonb; inventory jsonb;
begin
  if not coalesce(public.is_admin(),false) then raise insufficient_privilege using message='Staff access required.'; end if;
  select * into b from public.blueprint_versions where id=p_id and practice_parent_id is null;
  if not found then raise exception 'Blueprint not found.'; end if;
  canonical:=private.canonicalize_staff_blueprint(b.id,b.version);
  select jsonb_agg(jsonb_build_object('id',s->>'id','required',(s->>'count')::integer,
    'available_up_to_251',available.n,'shortage',greatest(0,(s->>'count')::integer-available.n))
    order by s->>'id') into inventory
  from jsonb_array_elements(canonical->'strata') s
  cross join lateral (select count(*)::integer n from (
    select 1 from public.questions q
    where q.lifecycle_state='Active' and nullif(btrim(q.question_text),'') is not null
      and jsonb_typeof(q.options)='array' and jsonb_array_length(q.options)=4
      and q.correct_option_id in ('A','B','C','D') and q.difficulty in ('Easy','Medium','Hard')
      and q.partition_key=b.category
      and (s->'performance_indicators'='[]' or (s->'performance_indicators')?q.performance_indicator)
      and (s->'question_types'='[]' or (s->'question_types')?q.question_type)
      and (s->'difficulties'='[]' or (s->'difficulties')?q.difficulty)
      and q.tags @> array(select jsonb_array_elements_text(s->'tags'))
      and not q.tags && array(select jsonb_array_elements_text(s->'excluded_tags'))
    limit 251
  ) bounded) available;
  return to_jsonb(b)||jsonb_build_object('inventory',inventory,'active_ids',private.staff_active_blueprint_ids(b.blueprint_name));
end;
$$;

create function public.create_staff_blueprint_draft(p_name text,p_category text,p_level text,p_version text,p_total integer,
  p_distribution jsonb,p_reason text,p_source uuid,p_expected_active uuid[]) returns uuid
language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare name text:=btrim(coalesce(p_name,'')); reason text:=btrim(coalesce(p_reason,''));
  draft uuid; active_ids uuid[]; canonical jsonb;
begin
  if not coalesce(public.is_admin(),false) then raise insufficient_privilege using message='Staff access required.'; end if;
  if length(name) not between 1 and 120 or length(btrim(coalesce(p_version,''))) not between 1 and 40
    or length(btrim(coalesce(p_level,''))) not between 1 and 40 or length(reason) not between 5 and 1000
    or coalesce(p_category,'') not in ('Business Administration Core','Marketing','Finance','Business Management and Administration','Hospitality and Tourism','Entrepreneurship')
  then raise exception 'Invalid blueprint name, version, category, level or reason.'; end if;
  perform pg_advisory_xact_lock(hashtextextended('staff-blueprint:'||name,0));
  active_ids:=private.staff_active_blueprint_ids(name);
  if active_ids is distinct from p_expected_active then raise exception 'Active blueprint changed. Reload before creating a draft.'; end if;
  if exists(select 1 from public.blueprint_versions b where b.id=any(active_ids)
    and (b.category<>p_category or b.level<>btrim(p_level)))
  then raise exception 'Active versions with this name do not share the same category and level.'; end if;
  if p_source is not null and not exists(select 1 from public.blueprint_versions b where b.id=p_source
    and b.blueprint_name=name and b.category=p_category and b.level=btrim(p_level) and b.practice_parent_id is null)
  then raise exception 'A new version must retain its blueprint name, category and level.'; end if;
  if p_source is null and exists(select 1 from public.blueprint_versions where blueprint_name=name and practice_parent_id is null)
  then raise exception 'Open an existing version before creating another draft.'; end if;
  insert into public.blueprint_versions(blueprint_name,cluster,level,category,version,total_questions,distribution,status,change_reason,created_by,
    staff_source_version_id,staff_expected_active_ids)
    values(name,p_category,btrim(p_level),p_category,btrim(p_version),p_total,private.staff_blueprint_distribution(p_distribution,p_total),
      'Draft',reason,auth.uid(),p_source,active_ids) returning id into draft;
  canonical:=private.canonicalize_staff_blueprint(draft,btrim(p_version));
  perform private.validate_staff_blueprint_refs(canonical);
  insert into public.admin_audit_logs(actor_user_id,actor_role,action,resource_type,resource_id,reason,new_values)
    values(auth.uid(),public.current_user_role(),'blueprint.draft_created','blueprint',draft::text,reason,
      canonical||jsonb_build_object('source_version_id',p_source));
  return draft;
end;
$$;

create function public.activate_staff_blueprint(p_id uuid,p_reason text) returns uuid
language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare b public.blueprint_versions; active_ids uuid[]; reason text:=btrim(coalesce(p_reason,''));
begin
  if not coalesce(public.is_admin(),false) then raise insufficient_privilege using message='Staff access required.'; end if;
  if length(reason) not between 5 and 1000 then raise exception 'Provide an activation reason.'; end if;
  select * into b from public.blueprint_versions where id=p_id and practice_parent_id is null;
  if not found then raise exception 'Blueprint not found.'; end if;
  perform pg_advisory_xact_lock(hashtextextended('staff-blueprint:'||b.blueprint_name,0));
  select * into b from public.blueprint_versions where id=p_id for update;
  if b.status<>'Draft' then raise exception 'Only drafts can be activated.'; end if;
  active_ids:=private.staff_active_blueprint_ids(b.blueprint_name);
  if active_ids is distinct from b.staff_expected_active_ids then raise exception 'Active blueprint changed. Create a fresh draft.'; end if;
  perform private.validate_staff_blueprint_refs(private.canonicalize_staff_blueprint(b.id,b.version));
  update public.blueprint_versions set status='Retired' where id=any(active_ids);
  update public.blueprint_versions set status='Active' where id=b.id;
  insert into public.admin_audit_logs(actor_user_id,actor_role,action,resource_type,resource_id,reason,previous_values,new_values)
    values(auth.uid(),public.current_user_role(),'blueprint.activated','blueprint',b.id::text,reason,
      jsonb_build_object('retired_version_ids',active_ids),jsonb_build_object('status','Active','version',b.version));
  return b.id;
end;
$$;
revoke all on function public.list_staff_blueprints(text,timestamptz,uuid),public.get_staff_blueprint(uuid),
  public.create_staff_blueprint_draft(text,text,text,text,integer,jsonb,text,uuid,uuid[]),public.activate_staff_blueprint(uuid,text)
  from public,anon,authenticated,service_role;
grant execute on function public.list_staff_blueprints(text,timestamptz,uuid),public.get_staff_blueprint(uuid),
  public.create_staff_blueprint_draft(text,text,text,text,integer,jsonb,text,uuid,uuid[]),public.activate_staff_blueprint(uuid,text)
  to authenticated;
