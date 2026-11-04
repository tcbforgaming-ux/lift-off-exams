-- Share the existing generator without exposing a caller-supplied snapshot RPC.
do $$
declare
  definition text:=pg_get_functiondef('public.generate_test_from_blueprint(uuid,text,integer,text,text)'::regprocedure);
  signature text:='p_idempotency_key text DEFAULT NULL::text)';
  anchor text:=$anchor$canonical_blueprint := public.canonicalize_test_blueprint(
    p_blueprint_id,
    p_expected_blueprint_version
  );$anchor$;
begin
  if strpos(definition,'FUNCTION public.generate_test_from_blueprint(')=0
    or strpos(definition,signature)=0 or strpos(definition,anchor)=0
  then raise exception 'Unexpected test generator definition'; end if;
  definition:=replace(definition,'FUNCTION public.generate_test_from_blueprint(','FUNCTION private.generate_test_from_saved_rules(');
  definition:=replace(definition,signature,'p_idempotency_key text DEFAULT NULL::text, p_saved_blueprint jsonb DEFAULT NULL::jsonb)');
  execute replace(definition,anchor,$rules$canonical_blueprint := coalesce(
    p_saved_blueprint,
    public.canonicalize_test_blueprint(p_blueprint_id,p_expected_blueprint_version)
  );$rules$);
end;
$$;
revoke all on function private.generate_test_from_saved_rules(uuid,text,integer,text,text,jsonb)
  from public,anon,authenticated,service_role;

create or replace function public.generate_test_from_blueprint(
  p_blueprint_id uuid,p_expected_blueprint_version text,p_requested_count integer,
  p_seed text default null,p_idempotency_key text default null
) returns table (
  success boolean,test_definition_id uuid,test_id text,generation_status text,
  requested_count integer,selected_count integer,canonical_seed text,algorithm_version text,
  blueprint_summary jsonb,shortage jsonb
)
language sql security definer set search_path=pg_catalog,public,pg_temp as $$
  select * from private.generate_test_from_saved_rules($1,$2,$3,$4,$5,null)
$$;

create or replace function public.generate_updated_test(p_test_id text,p_idempotency_key text)
returns jsonb language plpgsql security definer
set search_path=pg_catalog,public,extensions,pg_temp as $$
declare source public.test_ids%rowtype; result record;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  select * into source from public.test_ids where id=upper(btrim(p_test_id)) and generation_status='Ready';
  if not found then raise exception 'Ready Test ID not found.'; end if;
  if not public.has_premium_explanation_access(auth.uid()) and source.question_count>40 then
    raise exception 'Free generation is limited to 40 questions. Create a shorter test instead.';
  end if;
  if source.algorithm_version is distinct from 'sha256-strata-v1'
    or source.blueprint_version_id is null
    or source.blueprint_snapshot->>'blueprint_id' is distinct from source.blueprint_version_id::text
    or jsonb_typeof(source.blueprint_snapshot->'strata') is distinct from 'array'
  then raise exception 'This Test ID does not have saved generation rules. You can still replay it.'; end if;
  select * into result from private.generate_test_from_saved_rules(source.blueprint_version_id,
    source.blueprint_snapshot->>'blueprint_version',source.question_count,null,p_idempotency_key,source.blueprint_snapshot);
  return to_jsonb(result);
end;
$$;
