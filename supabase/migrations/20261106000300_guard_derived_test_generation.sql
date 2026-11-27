-- A direct call with a derived blueprint must not bypass the free tag cap.
-- The custom entry point already validates the actual selected tags.
do $$
declare
  d text:=pg_get_functiondef('public.generate_custom_practice(uuid,text,integer,text[],text[],integer,boolean,boolean,text,text)'::regprocedure);
  anchor text:='select * into generated from public.generate_test_from_blueprint(';
begin
  if strpos(d,anchor)=0 then raise exception 'Unexpected custom generator call'; end if;
  execute replace(d,anchor,'select * into generated from private.generate_test_from_saved_rules(');
end;
$$;

create or replace function public.generate_test_from_blueprint(
  p_blueprint_id uuid,p_expected_blueprint_version text,p_requested_count integer,
  p_seed text default null,p_idempotency_key text default null
) returns table (
  success boolean,test_definition_id uuid,test_id text,generation_status text,
  requested_count integer,selected_count integer,canonical_seed text,algorithm_version text,
  blueprint_summary jsonb,shortage jsonb
)
language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
begin
  if exists(select 1 from public.blueprint_versions b where b.id=p_blueprint_id
    and b.practice_parent_id is not null and b.practice_owner_id=auth.uid()) then
    perform private.enforce_free_test_generation_caps(auth.uid(),p_requested_count,(
      select count(distinct t)::integer
      from public.blueprint_versions b
      cross join lateral jsonb_array_elements(b.distribution->'strata') s
      cross join lateral jsonb_array_elements_text(s->'tags') t
      where b.id=p_blueprint_id
    ));
  end if;
  return query select * from private.generate_test_from_saved_rules(
    p_blueprint_id,p_expected_blueprint_version,p_requested_count,p_seed,p_idempotency_key,null);
end;
$$;
