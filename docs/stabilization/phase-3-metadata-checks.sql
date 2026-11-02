-- PREPARED ONLY. Use an explicitly approved read-only connection to the verified
-- project. Catalogs only; do not call application routines or query real rows.
begin read only;
set local statement_timeout = '15s';
select version from supabase_migrations.schema_migrations order by version;
select p.oid::regprocedure::text as signature, pg_get_userbyid(p.proowner) as owner,
  p.prosecdef, p.proconfig, p.proacl, pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname in ('public','private') and p.prokind='f' and not exists (
  select 1 from pg_depend d where d.classid='pg_proc'::regclass
  and d.objid=p.oid and d.deptype='e') order by 1;
select c.oid::regclass::text as relation, pg_get_userbyid(c.relowner) as owner,
  c.relrowsecurity, c.relforcerowsecurity, c.relacl
from pg_class c where c.relnamespace='public'::regnamespace and c.relkind in ('r','p','v') order by 1;
select attrelid::regclass::text as relation, attname, attacl
from pg_attribute where attrelid in (select oid from pg_class
  where relnamespace='public'::regnamespace) and attnum>0 and not attisdropped order by 1,attnum;
select * from pg_policies where schemaname='public' order by tablename,policyname;
select conrelid::regclass::text as relation, conname, pg_get_constraintdef(oid)
from pg_constraint where connamespace='public'::regnamespace order by 1,2;
select tgrelid::regclass::text as relation, tgname, pg_get_triggerdef(oid)
from pg_trigger where not tgisinternal and tgrelid in (select oid from pg_class
  where relnamespace='public'::regnamespace) order by 1,2;
select pg_get_userbyid(defaclrole) as creator, defaclnamespace::regnamespace::text as schema,
  defaclobjtype, defaclacl from pg_default_acl order by 1,2,3;
select d.classid::regclass::text, d.objid, d.refclassid::regclass::text, d.refobjid, d.deptype
from pg_depend d where d.refobjid in (select oid from pg_proc
  where pronamespace='public'::regnamespace and proname in (
    'insert_generated_questions','build_deca_batch_jsonl','write_admin_audit',
    'write_test_session_audit','import_staging_generation_queue'));
rollback;
