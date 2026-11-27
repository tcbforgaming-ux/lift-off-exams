-- Read-only inventory. Request-wide lifecycle enforcement covers all
-- PostgREST authenticated functions, even if the individual body is unchanged.
copy (
  select p.proname as function_name,pg_get_function_identity_arguments(p.oid) as identity_arguments,
    p.prosecdef as security_definer,
    has_function_privilege('authenticated',p.oid,'execute') as authenticated_execute,
    has_function_privilege('anon',p.oid,'execute') as anonymous_execute
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.prokind='f'
    and has_function_privilege('authenticated',p.oid,'execute')
  order by p.proname,identity_arguments
) to stdout with csv header;
