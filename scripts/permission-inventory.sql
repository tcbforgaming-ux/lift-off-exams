-- Read-only catalog evidence; never includes rows, keys, connection settings or JWTs.
select jsonb_pretty(jsonb_build_object(
  'scope', 'disposable local stack; clean migration history',
  'functions', (
    select jsonb_agg(jsonb_build_object(
      'signature', p.oid::regprocedure::text,
      'owner', pg_get_userbyid(p.proowner),
      'security_definer', p.prosecdef,
      'settings', p.proconfig,
      'public_execute', exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE'),
      'anon_execute', has_function_privilege('anon',p.oid,'EXECUTE'),
      'authenticated_execute', has_function_privilege('authenticated',p.oid,'EXECUTE'),
      'service_execute', has_function_privilege('service_role',p.oid,'EXECUTE'),
      'owner_execute', has_function_privilege(pg_get_userbyid(p.proowner),p.oid,'EXECUTE'),
      'acl', p.proacl::text,
      'body', p.prosrc
    ) order by p.oid::regprocedure::text)
    from pg_proc p where p.pronamespace='public'::regnamespace and not exists(
      select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e')
  ),
  'tables', (
    select jsonb_agg(jsonb_build_object(
      'name', c.relname, 'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,
      'acl',c.relacl::text,
      'anon_select',has_table_privilege('anon',c.oid,'SELECT'),
      'authenticated_select',has_table_privilege('authenticated',c.oid,'SELECT'),
      'authenticated_insert',has_table_privilege('authenticated',c.oid,'INSERT'),
      'authenticated_update',has_table_privilege('authenticated',c.oid,'UPDATE'),
      'authenticated_delete',has_table_privilege('authenticated',c.oid,'DELETE'),
      'service_all_dml',has_table_privilege('service_role',c.oid,'SELECT,INSERT,UPDATE,DELETE'),
      'columns', (select jsonb_agg(jsonb_build_object('name',a.attname,'acl',a.attacl::text,
        'authenticated_update',has_column_privilege('authenticated',c.oid,a.attnum,'UPDATE')) order by a.attnum)
        from pg_attribute a where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped)
    ) order by c.relname) from pg_class c where c.relnamespace='public'::regnamespace and c.relkind in ('r','p')
  ),
  'policies', (select jsonb_agg(to_jsonb(p) order by tablename,policyname) from pg_policies p where schemaname='public'),
  'default_acls', (select jsonb_agg(jsonb_build_object('creator',pg_get_userbyid(defaclrole),'schema',n.nspname,'type',defaclobjtype,'acl',defaclacl::text)) from pg_default_acl d left join pg_namespace n on n.oid=d.defaclnamespace),
  'role_membership', (select jsonb_agg(jsonb_build_object('member',pg_get_userbyid(member),'inherits',pg_get_userbyid(roleid))) from pg_auth_members),
  'api_schema_create', jsonb_build_object('anon',has_schema_privilege('anon','public','CREATE'),'authenticated',has_schema_privilege('authenticated','public','CREATE'))
));
