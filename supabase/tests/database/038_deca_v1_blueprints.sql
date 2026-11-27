begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

select is((select count(*) from private.deca_v1_expected_blueprints()),15::bigint,'fifteen source presets');
select is((select sum(jsonb_array_length(source_topics)) from private.deca_v1_expected_blueprints()),268::bigint,
 '268 original allocations including zero rows');
select is((select count(*) from private.deca_v1_expected_blueprints() e join public.blueprint_versions b using(id)
 where (e.blueprint_name,e.category,e.level,e.version,e.total_questions,e.distribution)
   =(b.blueprint_name,b.category,b.level,b.version,b.total_questions,b.distribution) and b.status='Active'),
 15::bigint,'all stable versions published with exact source allocations');
select is((select count(*) from private.deca_v1_expected_blueprints() e
 where 1<>(select count(*) from public.blueprint_versions b
   where b.blueprint_name=e.blueprint_name and b.practice_parent_id is null and b.status='Active')),
 0::bigint,'each catalog name has exactly one active version');
create temp table blueprint_seed_before as
select b.* from public.blueprint_versions b join private.deca_v1_expected_blueprints() e using(id);
select is(private.provision_deca_v1_blueprints(),0,'first replay adds nothing');
select is(private.provision_deca_v1_blueprints(),0,'second replay adds nothing');
select results_eq($$select b.* from public.blueprint_versions b join private.deca_v1_expected_blueprints() e using(id) order by b.id$$,
 $$select * from blueprint_seed_before order by id$$,'replays preserve exact definitions and timestamps');
select ok(not has_function_privilege('authenticated','private.provision_deca_v1_blueprints()','execute'),
 'provisioning is not a client RPC');

insert into auth.users(id,email,aud,role) values
 ('00000000-0000-0000-0000-000000038001','deca-paid@example.test','authenticated','authenticated'),
 ('00000000-0000-0000-0000-000000038002','deca-free@example.test','authenticated','authenticated');
update public.profiles set account_tier='premium' where user_id='00000000-0000-0000-0000-000000038001';
create temp table selected_catalog as
select * from private.deca_v1_expected_blueprints() where category='Finance' and level='State';
grant select on selected_catalog to authenticated;

insert into public.questions(partition_key,question_type,question_text,options,correct_option_id,difficulty,tags)
select c.category,'Scenario','DECA fixture '||(s->>'id')||' '||i,
 '["A","B","C","D"]','A',case when i%2=0 then 'Easy' else 'Hard' end,
 array(select jsonb_array_elements_text(s->'tags'))
from selected_catalog c,jsonb_array_elements(c.distribution->'strata') s,generate_series(1,(s->>'count')::int) i;
insert into public.questions(partition_key,question_type,question_text,options,correct_option_id,difficulty,tags,lifecycle_state)
values ('Finance','Scenario','Retired DECA sample','["A","B","C","D"]','A','Hard',array['Business Law'],'Retired'),
 ('Finance','Scenario','','["A","B","C","D"]','A','Hard',array['Business Law'],'Active');

insert into public.blueprint_versions(id,blueprint_name,cluster,category,level,version,total_questions,distribution,change_reason)
values ('38000000-0000-0000-0000-000000000010','OR practice fixture','Finance','Finance','State','1',3,
 '{"schema_version":1,"strata":[{"id":"promo","count":1,"tags":["OR Promotion"]},{"id":"price","count":1,"tags":["OR Pricing"]},{"id":"wild","count":1}]}','Fixture'),
 ('38000000-0000-0000-0000-000000000011','Overlapping allocator fixture','Finance','Finance','State','1',3,
 '{"schema_version":1,"strata":[{"id":"alpha","count":1,"tags":["Repair A"]},{"id":"beta","count":1,"tags":["Repair B"]},{"id":"gamma","count":1,"tags":["Repair C"]}]}','Fixture'),
 ('38000000-0000-0000-0000-000000000012','Required tags fixture','Finance','Finance','State','1',1,
 '{"schema_version":1,"strata":[{"id":"both","count":1,"tags":["OR Promotion","OR Pricing"]}]}','Fixture');
insert into public.questions(id,partition_key,question_type,question_text,options,correct_option_id,difficulty,tags)
values
 ('38000000-0000-0000-0000-000000000021','Finance','Scenario','OR promotion only','["A","B","C","D"]','A','Medium',array['OR Promotion']),
 ('38000000-0000-0000-0000-000000000022','Finance','Scenario','OR pricing only','["A","B","C","D"]','A','Medium',array['OR Pricing']),
 ('38000000-0000-0000-0000-000000000023','Finance','Scenario','OR both','["A","B","C","D"]','A','Medium',array['OR Promotion','OR Pricing']),
 ('38000000-0000-0000-0000-000000000024','Finance','Scenario','OR neither','["A","B","C","D"]','A','Medium',array['Unrelated']),
 ('38000000-0000-0000-0000-000000000025','Finance','Scenario','Repair shared','["A","B","C","D"]','A','Medium',array['Repair A','Repair B','Repair C']),
 ('38000000-0000-0000-0000-000000000026','Finance','Scenario','Repair A only','["A","B","C","D"]','A','Medium',array['Repair A']),
 ('38000000-0000-0000-0000-000000000027','Finance','Scenario','Repair B/C','["A","B","C","D"]','A','Medium',array['Repair B','Repair C']);

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000038001',true);
create temp table generated_catalog as
select x.*,1 as call from selected_catalog c
cross join lateral public.generate_test_from_blueprint(c.id,c.version,100,'deca-compatible','catalog-first') x;
insert into generated_catalog select x.*,2 from selected_catalog c
cross join lateral public.generate_test_from_blueprint(c.id,c.version,100,'deca-compatible','catalog-second') x;
select ok((select bool_and(success and selected_count=100) from generated_catalog),'two full paid preset generations succeed');
select is((select count(distinct q.question_id) from public.test_definition_questions q join generated_catalog g
 on q.test_definition_id=g.test_definition_id where g.call=1),100::bigint,'no duplicate question IDs');
select results_eq($$select q.stratum_id,count(*) from public.test_definition_questions q join generated_catalog g
 on q.test_definition_id=g.test_definition_id where g.call=1 group by q.stratum_id order by q.stratum_id$$,
 $$select s->>'id',(s->>'count')::bigint from selected_catalog c,jsonb_array_elements(c.distribution->'strata') s order by 1$$,
 'actual per-stratum counts match the PRD exactly');
select results_eq($$select q.position,q.question_id from public.test_definition_questions q join generated_catalog g
 on q.test_definition_id=g.test_definition_id where g.call=1 order by q.position$$,
 $$select q.position,q.question_id from public.test_definition_questions q join generated_catalog g
 on q.test_definition_id=g.test_definition_id where g.call=2 order by q.position$$,
 'same source, seed and pool produce the same ordered membership');

create temp table repaired as
select x.* from (
 select 'repair-'||i seed from generate_series(1,100) i
 where extensions.digest(convert_to('sha256-strata-v1'||chr(31)||'repair-'||i||chr(31)||'alpha'||chr(31)||
     '38000000-0000-0000-0000-000000000025','UTF8'),'sha256')
   < extensions.digest(convert_to('sha256-strata-v1'||chr(31)||'repair-'||i||chr(31)||'alpha'||chr(31)||
     '38000000-0000-0000-0000-000000000026','UTF8'),'sha256')
 order by i limit 1
) s cross join lateral public.generate_test_from_blueprint('38000000-0000-0000-0000-000000000011','1',3,s.seed,'repaired') x;
select ok((select success and selected_count=3 from repaired),'augmenting paths fix a deterministic greedy miss');
select is((select q.question_id::text from public.test_definition_questions q join repaired r
 on q.test_definition_id=r.test_definition_id where q.stratum_id='alpha'),
 '38000000-0000-0000-0000-000000000026','repair moves alpha off the shared candidate');
create temp table and_result as
select * from public.generate_test_from_blueprint('38000000-0000-0000-0000-000000000012','1',1,'and','required-and');
select is((select q.question_id::text from public.test_definition_questions q join and_result r
 on q.test_definition_id=r.test_definition_id),'38000000-0000-0000-0000-000000000023','saved stratum keeps required-tag AND');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000038002',true);
select throws_ok($$select * from public.generate_test_from_blueprint((select id from selected_catalog),'prd-19.3-v1',100)$$,
 '22023','Free Test generation is limited to 40 questions.','full 100-question preset does not bypass free caps');
create temp table custom_or as select public.generate_custom_practice('38000000-0000-0000-0000-000000000010','1',3,
 array['Medium'],array['OR Promotion','OR Pricing'],60,false,false,'or','custom-or') as result;
select ok((select result @> '{"success":true,"selected_count":3}' from custom_or),'custom OR accepts both single-tag and dual-tag items');
select is((select array_agg(q.question_id::text order by q.question_id) from public.test_definition_questions q,custom_or c
 where q.test_definition_id=(c.result->>'test_definition_id')::uuid),
 array['38000000-0000-0000-0000-000000000021','38000000-0000-0000-0000-000000000022','38000000-0000-0000-0000-000000000023'],
 'wildcard stratum does not admit unrelated questions');
select is((select generated_remaining from public.get_my_weekly_activity_allowance()),2,'one free generation slot used');
reset role;
update public.questions set lifecycle_state='Retired' where id='38000000-0000-0000-0000-000000000023';
set local role authenticated;
select ok((select public.generate_updated_test(result->>'test_id','short-updated') @> '{"success":false}' from custom_or),
 'updated generation reuses the exact OR filter and refuses a true shortage');
select is((select generated_remaining from public.get_my_weekly_activity_allowance()),2,'shortage did not consume a generation slot');
select is(public.generate_custom_practice('38000000-0000-0000-0000-000000000010','1',3,array['Medium'],
 array['OR Pricing','OR Promotion'],60,false,false,'or','custom-or')->>'test_id',
 (select result->>'test_id' from custom_or),'same-key normalized retry returns original Test ID after retirement');
select is((select generated_remaining from public.get_my_weekly_activity_allowance()),2,'retry did not consume another slot');
reset role;

update public.profiles set role='admin' where user_id='00000000-0000-0000-0000-000000038001';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000038001',true);
create temp table revised_catalog as
select public.create_staff_blueprint_draft(blueprint_name,category,level,'test-r2',total_questions,distribution,
 'Reviewed fixture revision',id,array[id]) as id from selected_catalog;
select is(public.activate_staff_blueprint((select id from revised_catalog),'Activate fixture revision'),
 (select id from revised_catalog),'staff activates the replacement through the normal lifecycle');
select ok((select public.generate_updated_test(test_id,'updated-retired') @> '{"success":true,"selected_count":100}'
 from generated_catalog where call=1),'profile Premium can update 100 questions using the now retired source rules');
select results_eq($$select q.position,q.question_id from public.test_definition_questions q join generated_catalog g
 on q.test_definition_id=g.test_definition_id where g.call=1 order by q.position$$,
 $$select q.position,q.question_id from public.test_definition_questions q join generated_catalog g
 on q.test_definition_id=g.test_definition_id where g.call=2 order by q.position$$,
 'activation and updated generation preserve the exact original ordered membership');
reset role;
select is(private.provision_deca_v1_blueprints(),0,'provisioning does not reinsert a retired source version');
select is((select status from public.blueprint_versions where id=(select id from selected_catalog)),
 'Retired','original source remains retired');
select is((select status from public.blueprint_versions where id=(select id from revised_catalog)),
 'Active','approved staff replacement stays active');
select * from finish();
rollback;
