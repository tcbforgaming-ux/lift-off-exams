begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users(id,email,aud,role) values
 ('00000000-0000-0000-0000-000000019001','catalog-admin@example.test','authenticated','authenticated'),
 ('00000000-0000-0000-0000-000000019002','catalog-student@example.test','authenticated','authenticated');
update public.profiles set role='admin' where user_id='00000000-0000-0000-0000-000000019001';
insert into public.questions(partition_key,performance_indicator,question_type,question_text,options,correct_option_id,explanation,difficulty,tags,lifecycle_state,question_hash)
select 'Finance','FI:019','Scenario','Catalog fixture '||n,'[{"id":"A","text":"A"},{"id":"B","text":"B"},{"id":"C","text":"C"},{"id":"D","text":"D"}]',
  'A','Synthetic explanation','Easy',array['Catalog Finance'],'Active',md5('Catalog fixture '||n) from generate_series(1,3) n;
insert into public.blueprint_versions(id,blueprint_name,cluster,level,category,version,total_questions,distribution,status,change_reason)
values('00000000-0000-0000-0000-000000019003','Catalog Fixture','Finance','State','Finance','1',1,
 '{"schema_version":1,"strata":[{"id":"original","count":1,"tags":["Catalog Finance"]}]}','Active','Synthetic baseline');
create temp table catalog_fixture(k text primary key,id uuid);
grant all on catalog_fixture to authenticated;
create function pg_temp.catalog_fail_audit() returns trigger language plpgsql as $$
begin
  if new.reason='Synthetic audit failure' then raise exception 'Injected catalog audit failure'; end if;
  return new;
end;
$$;
create trigger catalog_fail_audit before insert on public.admin_audit_logs for each row execute function pg_temp.catalog_fail_audit();
select ok(not has_table_privilege('authenticated','public.blueprint_versions','UPDATE'),'direct blueprint writes denied');
select ok(not has_table_privilege('authenticated','private.staff_tags','INSERT'),'direct tag writes denied');
select ok(not has_function_privilege('anon','public.list_staff_tags(text,text)','EXECUTE'),'anonymous catalog RPC denied');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000019002',true);
select throws_ok($q$select public.list_staff_tags()$q$,'42501','Staff access required.','student cannot list tags');
select throws_ok($q$select public.activate_staff_blueprint(null,'Student attempt')$q$,'42501','Staff access required.','student cannot activate');
insert into catalog_fixture select 'original',test_definition_id from public.generate_test_from_blueprint('00000000-0000-0000-0000-000000019003','1',1,'catalog-old','catalog-old') where success;
reset role;
create temp table catalog_history as
select t.id as test_code,t.blueprint_snapshot,
  (select jsonb_agg(to_jsonb(q) order by q.position) from public.test_definition_questions q where q.test_definition_id=t.definition_id) membership
from public.test_ids t where t.definition_id=(select id from catalog_fixture where k='original');
select is((select jsonb_array_length(membership) from catalog_history),1,'baseline Test ID has ordered membership');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000019001',true);
select is(public.get_staff_tag_dependencies('Catalog Finance')->>'active_questions','3','exact tag dependencies visible');
select is(public.save_staff_tag(' Catalog Finance ','Description',0,'Register observed label')->>'label','Catalog Finance','registration trims outer spaces');
select is(public.save_staff_tag('catalog finance','Distinct label',0,'Register case variant')->>'label','catalog finance','case variants stay distinct');
select throws_ok($q$select public.save_staff_tag('Catalog Finance','Stale',0,'Stale edit')$q$,'P0001','Tag metadata changed. Reload before saving.','stale tag edit denied');
select throws_ok($q$select public.save_staff_tag('Catalog Finance','Not saved',1,'Synthetic audit failure')$q$,'P0001','Injected catalog audit failure','tag audit failure aborts');
select is(public.list_staff_tags('Catalog Finance')->0->>'description','Description','failed audit preserved original metadata');
select throws_ok($q$select public.create_staff_blueprint_draft('Catalog Fixture','Finance','State','invalid',1,
 '{"schema_version":1,"strata":[{"id":"bad","count":1,"tags":["Unknown:019"]}]}','Invalid references',
 '00000000-0000-0000-0000-000000019003',array['00000000-0000-0000-0000-000000019003']::uuid[])$q$,
 'P0001','Unknown tag: Unknown:019','unknown tag rejected');
insert into catalog_fixture values ('draft',public.create_staff_blueprint_draft('Catalog Fixture','Finance','State','2',3,
 '{"schema_version":1,"strata":[{"id":"beta","weight":1,"tags":["Catalog Finance"]},{"id":"alpha","weight":1,"tags":["Catalog Finance"]}]}',
 'New weighted version','00000000-0000-0000-0000-000000019003',array['00000000-0000-0000-0000-000000019003']::uuid[]));
select is(public.get_staff_blueprint((select id from catalog_fixture where k='draft'))->'inventory'->0->>'required','2','largest remainder breaks ties by stratum ID');
select is(public.get_staff_blueprint((select id from catalog_fixture where k='draft'))->>'joint_shortage','0','shared inventory can fill three distinct slots');
insert into catalog_fixture values ('overlap',public.create_staff_blueprint_draft('Catalog Fixture','Finance','State','overlap',4,
 '{"schema_version":1,"strata":[{"id":"alpha","count":2,"tags":["Catalog Finance"]},{"id":"beta","count":2,"tags":["Catalog Finance"]}]}',
 'Overlapping shortfall','00000000-0000-0000-0000-000000019003',array['00000000-0000-0000-0000-000000019003']::uuid[]));
select is(public.get_staff_blueprint((select id from catalog_fixture where k='overlap'))->'inventory'->0->>'shortage','0','individual stratum has enough inventory');
select is(public.get_staff_blueprint((select id from catalog_fixture where k='overlap'))->>'joint_shortage','1','overlap cannot count the same question twice');
insert into catalog_fixture values ('stale',public.create_staff_blueprint_draft('Catalog Fixture','Finance','State','stale',1,
 '{"schema_version":1,"strata":[{"id":"short","count":1,"tags":["catalog finance"]}]}',
 'Case-sensitive shortage','00000000-0000-0000-0000-000000019003',array['00000000-0000-0000-0000-000000019003']::uuid[]));
select is(public.get_staff_blueprint((select id from catalog_fixture where k='stale'))->'inventory'->0->>'shortage','1','similar tag spelling does not relax eligibility');
select throws_ok($q$select public.activate_staff_blueprint((select id from catalog_fixture where k='draft'),'Synthetic audit failure')$q$,
 'P0001','Injected catalog audit failure','activation audit failure aborts');
select is(public.get_staff_blueprint((select id from catalog_fixture where k='draft'))->>'status','Draft','failed activation leaves draft unchanged');
select is(public.activate_staff_blueprint((select id from catalog_fixture where k='draft'),'Publish revised version'),(select id from catalog_fixture where k='draft'),'admin activates draft');
select is(public.get_staff_blueprint('00000000-0000-0000-0000-000000019003')->>'status','Retired','previous version retired');
select throws_ok($q$select public.activate_staff_blueprint((select id from catalog_fixture where k='stale'),'Stale replacement')$q$,
 'P0001','Active blueprint changed. Create a fresh draft.','stale replacement cannot retire newer active version');
insert into catalog_fixture select 'new',test_definition_id from public.generate_test_from_blueprint((select id from catalog_fixture where k='draft'),'2',3,'catalog-new','catalog-new') where success;
reset role;
select is((select blueprint_snapshot->>'blueprint_version' from public.test_ids where definition_id=(select id from catalog_fixture where k='new')),'2','new generation uses replacement version');
select is((select blueprint_snapshot from public.test_ids where definition_id=(select id from catalog_fixture where k='original')),
 (select blueprint_snapshot from catalog_history),'original snapshot unchanged');
select is((select jsonb_agg(to_jsonb(q) order by q.position) from public.test_definition_questions q where q.test_definition_id=(select id from catalog_fixture where k='original')),
 (select membership from catalog_history),'original ordered membership unchanged');
grant select on catalog_history to authenticated;
select ok(not has_function_privilege('authenticated','private.generate_test_from_saved_rules(uuid,text,integer,text,text,jsonb)','EXECUTE'),
  'browser callers cannot supply arbitrary saved rules');
update public.questions set lifecycle_state='Retired'
where id=(select (membership->0->>'question_id')::uuid from catalog_history);
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000019002',true);
select throws_ok($q$select * from public.generate_test_from_blueprint('00000000-0000-0000-0000-000000019003','1',1,null,'direct-retired')$q$,
  'P0001','Only active blueprint versions can generate tests.','ordinary generation still rejects retired versions');
create temp table catalog_refresh as
select public.generate_updated_test((select test_code from catalog_history),'update-retired') as result;
select is((select result->>'success' from catalog_refresh),'true','retired source can generate an updated test');
select isnt((select result->>'test_id' from catalog_refresh),(select test_code from catalog_history),'updated test has a new share code');
select is((select result->'blueprint_summary' from catalog_refresh),(select blueprint_snapshot from catalog_history),'updated test uses exact saved rules');
select is(public.generate_updated_test((select test_code from catalog_history),'update-retired'),(select result from catalog_refresh),'updated generation retries return the same result');
reset role;
select isnt((select question_id::text from public.test_definition_questions where test_definition_id=(select (result->>'test_definition_id')::uuid from catalog_refresh)),
  (select membership->0->>'question_id' from catalog_history),'updated test uses current inventory and excludes the retired question');
select is((select jsonb_agg(to_jsonb(q) order by q.position) from public.test_definition_questions q where q.test_definition_id=(select id from catalog_fixture where k='original')),
 (select membership from catalog_history),'regeneration leaves original ordered membership unchanged');
select * from finish();
rollback;
