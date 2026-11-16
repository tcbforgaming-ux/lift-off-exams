-- Preserve the old canonical representation when no OR filter is present.
-- Required tags still use AND within every stratum.
do $$
declare d text; r regprocedure;
  declaration text:='  excluded_tags text[];';
  anchor text:='    if tags && excluded_tags then';
begin
  foreach r in array array['public.canonicalize_test_blueprint(uuid,text)'::regprocedure,
    'private.canonicalize_staff_blueprint(uuid,text)'::regprocedure] loop
    d:=pg_get_functiondef(r);
    if strpos(d,declaration)=0 or strpos(d,anchor)=0 or strpos(d,'''tags'', ''excluded_tags''')=0
      or strpos(d,'''excluded_tags'', to_jsonb(excluded_tags)')=0 then raise exception 'Unexpected blueprint canonicalizer'; end if;
    d:=replace(d,declaration,declaration||chr(10)||'  any_tags text[];');
    d:=replace(d,'''tags'', ''excluded_tags''','''tags'', ''excluded_tags'', ''any_tags''');
    d:=replace(d,anchor,$rule$
    any_tags := public.test_blueprint_text_array(raw_stratum -> 'any_tags', 'any_tags');
    if cardinality(any_tags)>0 and any_tags <@ excluded_tags then
      raise exception 'Blueprint stratum % excludes every alternative tag.', stratum_id;
    end if;
$rule$||anchor);
    d:=regexp_replace(d,'(''excluded_tags'', to_jsonb\(excluded_tags\)[[:space:]]*\))',
      $out$\1 || case when cardinality(any_tags)>0 then jsonb_build_object('any_tags',to_jsonb(any_tags)) else '{}'::jsonb end$out$);
    execute d;
  end loop;

  d:=pg_get_functiondef('public.generate_custom_practice(uuid,text,integer,text[],text[],integer,boolean,boolean,text,text)'::regprocedure);
  anchor:='''difficulties'', to_jsonb(ds)) as item from ranked';
  if strpos(d,anchor)=0 then raise exception 'Unexpected custom practice allocator'; end if;
  execute replace(d,anchor,$rule$'difficulties', to_jsonb(ds)) ||
    (case when cardinality(selected_tags)>0 and jsonb_array_length(s->'tags')=0 then
      jsonb_build_object('any_tags',to_jsonb(selected_tags)) else '{}'::jsonb end) as item from ranked$rule$);

  d:=pg_get_functiondef('private.validate_staff_blueprint_refs(jsonb)'::regprocedure);
  anchor:='(s->''tags'')||(s->''excluded_tags'')';
  if strpos(d,anchor)=0 then raise exception 'Unexpected tag validator'; end if;
  execute replace(d,anchor,anchor||'||coalesce(s->''any_tags'',''[]''::jsonb)');

  d:=pg_get_functiondef('private.staff_blueprint_inventory(jsonb)'::regprocedure);
  anchor:='        and not q.tags && array(select jsonb_array_elements_text(s->''excluded_tags''))';
  if strpos(d,anchor)=0 then raise exception 'Unexpected inventory predicate'; end if;
  execute replace(d,anchor,$rule$        and (not s?'any_tags' or q.tags && array(select jsonb_array_elements_text(s->'any_tags')))
$rule$||anchor);
end;
$$;

-- If the seeded greedy pass leaves a shortage despite adequate individual
-- inventories, try a deterministic augmenting-path allocation. Each stratum
-- needs at most the overall request size in candidates: at most N-1 other
-- IDs can be occupied, so an unused sampled ID can replace any omitted ID.
create function private.repair_blueprint_selection(p_seed text,p_algorithm text,p_total integer)
returns void language plpgsql volatile set search_path=pg_catalog,pg_temp as $$
declare
  strata jsonb; owners jsonb:='{}'; n integer; source integer; slot integer;
  current_stratum integer; prior integer; head integer; assigned integer:=0;
  parents integer[]; queue integer[]; via text[]; question text; moved boolean;
begin
  select jsonb_agg(jsonb_build_object('id',s.stratum_id,'required',s.requested,'ids',sample.ids)
    order by s.raw_available,s.priority,s.stratum_id) into strata
  from pg_temp.milestone6_strata s
  cross join lateral (
    select coalesce(jsonb_agg(c.id order by c.rank,c.id),'[]') as ids from (
      select q.id,encode(extensions.digest(convert_to(
        p_algorithm||chr(31)||p_seed||chr(31)||s.stratum_id||chr(31)||q.id::text,'UTF8'),'sha256'),'hex') as rank
      from public.questions q
      where q.lifecycle_state='Active' and nullif(btrim(q.question_text),'') is not null
        and jsonb_typeof(q.options)='array' and jsonb_array_length(q.options)=4
        and q.correct_option_id in ('A','B','C','D') and q.difficulty in ('Easy','Medium','Hard')
        and (cardinality(s.partition_keys)=0 or q.partition_key=any(s.partition_keys))
        and (cardinality(s.performance_indicators)=0 or q.performance_indicator=any(s.performance_indicators))
        and (cardinality(s.question_types)=0 or q.question_type=any(s.question_types))
        and (cardinality(s.difficulties)=0 or q.difficulty=any(s.difficulties))
        and q.tags @> s.tags and (cardinality(s.any_tags)=0 or q.tags && s.any_tags)
        and not (q.tags && s.excluded_tags)
      order by rank,q.id limit p_total
    ) c
  ) sample;
  n:=jsonb_array_length(strata);
  for source in 1..n loop
    for slot in 1..((strata->(source-1)->>'required')::integer) loop
      parents:=array_fill(0,array[n]); via:=array_fill(null::text,array[n]);
      parents[source]:=-1; queue:=array[source]; head:=1; moved:=false;
      while head<=cardinality(queue) and not moved loop
        current_stratum:=queue[head]; head:=head+1;
        for question in select value from jsonb_array_elements_text(strata->(current_stratum-1)->'ids') loop
          prior:=(owners->>question)::integer;
          if prior is null then
            loop
              owners:=owners||jsonb_build_object(question,current_stratum);
              exit when current_stratum=source;
              question:=via[current_stratum]; current_stratum:=parents[current_stratum];
            end loop;
            assigned:=assigned+1; moved:=true;
            exit;
          elsif parents[prior]=0 then
            parents[prior]:=current_stratum; via[prior]:=question; queue:=array_append(queue,prior);
          end if;
        end loop;
      end loop;
      if not moved then return; end if;
    end loop;
  end loop;
  if assigned<>p_total then return; end if;
  delete from pg_temp.milestone6_selection;
  insert into pg_temp.milestone6_selection(question_id,stratum_id,selection_rank)
  select entry.key::uuid,strata->(entry.value::int-1)->>'id',
    encode(extensions.digest(convert_to(p_algorithm||chr(31)||p_seed||chr(31)||
      (strata->(entry.value::int-1)->>'id')||chr(31)||entry.key,'UTF8'),'sha256'),'hex')
  from jsonb_each_text(owners) entry;
end;
$$;
revoke all on function private.repair_blueprint_selection(text,text,integer) from public,anon,authenticated,service_role;

do $$
declare d text:=pg_get_functiondef('private.generate_test_from_saved_rules(uuid,text,integer,text,text,jsonb)'::regprocedure);
  a text;
begin
  if strpos(d,'excluded_tags text[] not null,')=0 or strpos(d,'    excluded_tags')=0
    or strpos(d,'array(select jsonb_array_elements_text(item -> ''excluded_tags''))')=0 then
    raise exception 'Unexpected generation strata storage';
  end if;
  d:=replace(d,'excluded_tags text[] not null,','excluded_tags text[] not null, any_tags text[] not null,');
  d:=regexp_replace(d,'(^|\n)(    excluded_tags)(\n)','\1\2, any_tags\3');
  d:=replace(d,'array(select jsonb_array_elements_text(item -> ''excluded_tags''))',
    'array(select jsonb_array_elements_text(item -> ''excluded_tags'')), array(select jsonb_array_elements_text(item -> ''any_tags''))');
  foreach a in array array['candidate_stratum','stratum'] loop
    if strpos(d,'cardinality('||a||'.excluded_tags)')=0 then raise exception 'Unexpected generation predicate'; end if;
    d:=regexp_replace(d,'and \([[:space:]]+cardinality\('||a||'\.excluded_tags\)',
      'and (cardinality('||a||'.any_tags)=0 or question.tags && '||a||'.any_tags) and (cardinality('||a||'.excluded_tags)','g');
  end loop;
  a:='  if jsonb_array_length(shortage_payload) > 0 then';
  if strpos(d,a)=0 then raise exception 'Unexpected generation shortage guard'; end if;
  d:=replace(d,a,$repair$
  if jsonb_array_length(shortage_payload)>0 and not exists(
    select 1 from pg_temp.milestone6_strata where raw_available<requested
  ) then
    perform private.repair_blueprint_selection(normalized_seed,algorithm_name,p_requested_count);
    if (select count(*) from pg_temp.milestone6_selection)=p_requested_count then shortage_payload:='[]'::jsonb; end if;
  end if;
$repair$||a);
  d:=replace(d,'unnest(tags) tag;','unnest(tags || any_tags) tag;');
  d:=replace(d,'jsonb_array_elements_text(s->''tags'') t',
    'jsonb_array_elements_text((s->''tags'')||coalesce(s->''any_tags'',''[]''::jsonb)) t');
  execute d;
end;
$$;
-- Updated Test uses the same activity entitlement as a new generation.
do $$
declare
  ddl text := pg_get_functiondef('public.generate_updated_test(text,text)'::regprocedure);
  old_check text := 'public.has_premium_explanation_access(auth.uid())';
begin
  if strpos(ddl,old_check)=0 then
    raise exception 'Unexpected updated test entitlement definition';
  end if;
  execute replace(ddl,old_check,'private.has_paid_activity_access(auth.uid())');
end;
$$;
