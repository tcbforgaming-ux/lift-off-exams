-- At most 251 IDs per stratum are needed: a complete allocation uses at most
-- 250 distinct IDs, so an omitted ID can always be replaced by an unused sample.
create function private.staff_blueprint_inventory(p_canonical jsonb) returns jsonb
language plpgsql stable set search_path=pg_catalog,public,pg_temp as $$
declare
  strata jsonb; inventory jsonb; owners jsonb:='{}';
  n integer; source integer; slot integer; current_stratum integer; prior integer;
  queue integer[]; head integer; parents integer[]; via text[];
  question text; moved boolean; assigned integer:=0;
  requested integer:=(p_canonical->>'total_questions')::integer;
begin
  select jsonb_agg(jsonb_build_object('id',s->>'id','required',(s->>'count')::integer,'ids',sample.ids)
    order by s->>'id' collate "C") into strata
  from jsonb_array_elements(p_canonical->'strata') s
  cross join lateral (
    select coalesce(jsonb_agg(id order by id),'[]') ids from (
      select q.id from public.questions q
      where q.lifecycle_state='Active' and nullif(btrim(q.question_text),'') is not null
        and jsonb_typeof(q.options)='array' and jsonb_array_length(q.options)=4
        and q.correct_option_id in ('A','B','C','D') and q.difficulty in ('Easy','Medium','Hard')
        and q.partition_key=p_canonical->>'category'
        and (s->'performance_indicators'='[]' or (s->'performance_indicators')?q.performance_indicator)
        and (s->'question_types'='[]' or (s->'question_types')?q.question_type)
        and (s->'difficulties'='[]' or (s->'difficulties')?q.difficulty)
        and q.tags @> array(select jsonb_array_elements_text(s->'tags'))
        and not q.tags && array(select jsonb_array_elements_text(s->'excluded_tags'))
      order by q.id limit 251
    ) bounded
  ) sample;
  n:=jsonb_array_length(strata);
  select jsonb_agg((s-'ids')||jsonb_build_object('available_up_to_251',jsonb_array_length(s->'ids'),
    'shortage',greatest(0,(s->>'required')::integer-jsonb_array_length(s->'ids'))) order by ordinal)
    into inventory from jsonb_array_elements(strata) with ordinality a(s,ordinal);

  -- Augment the matching one slot at a time. A full stratum can relinquish
  -- an assigned ID only when the search finds a replacement for that stratum.
  for source in 1..n loop
    for slot in 1..((strata->(source-1)->>'required')::integer) loop
      parents:=array_fill(0,array[n]);
      via:=array_fill(null::text,array[n]);
      parents[source]:=-1;
      queue:=array[source]; head:=1; moved:=false;
      while head<=cardinality(queue) and not moved loop
        current_stratum:=queue[head]; head:=head+1;
        for question in select value from jsonb_array_elements_text(strata->(current_stratum-1)->'ids') loop
          prior:=(owners->>question)::integer;
          if prior is null then
            loop
              owners:=owners||jsonb_build_object(question,current_stratum);
              exit when current_stratum=source;
              question:=via[current_stratum];
              current_stratum:=parents[current_stratum];
            end loop;
            assigned:=assigned+1; moved:=true;
            exit;
          elsif parents[prior]=0 then
            parents[prior]:=current_stratum;
            via[prior]:=question;
            queue:=array_append(queue,prior);
          end if;
        end loop;
      end loop;
      exit when not moved;
    end loop;
  end loop;
  return jsonb_build_object('inventory',inventory,'joint_shortage',requested-assigned);
end;
$$;
revoke all on function private.staff_blueprint_inventory(jsonb) from public,anon,authenticated,service_role;

create or replace function public.get_staff_blueprint(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public,pg_temp as $$
declare b public.blueprint_versions; canonical jsonb;
begin
  if not coalesce(public.is_admin(),false) then raise insufficient_privilege using message='Staff access required.'; end if;
  select * into b from public.blueprint_versions where id=p_id and practice_parent_id is null;
  if not found then raise exception 'Blueprint not found.'; end if;
  canonical:=private.canonicalize_staff_blueprint(b.id,b.version);
  return to_jsonb(b)||private.staff_blueprint_inventory(canonical)
    ||jsonb_build_object('active_ids',private.staff_active_blueprint_ids(b.blueprint_name));
end;
$$;
