begin;
create extension if not exists pgtap with schema extensions;
select plan(23);
create function pg_temp.fail_editor_audit() returns trigger language plpgsql as $$
begin
  if new.action='question.repository_edited' and new.reason='Synthetic audit failure'
  then raise exception 'Injected repository audit failure'; end if;
  return new;
end;
$$;
create trigger test_repository_editor_audit_failure before insert on public.admin_audit_logs
for each row execute function pg_temp.fail_editor_audit();
insert into auth.users(id,email,aud,role) values
 ('00000000-0000-0000-0000-000000017001','editor-admin@example.test','authenticated','authenticated'),
 ('00000000-0000-0000-0000-000000017002','editor-student@example.test','authenticated','authenticated');
update public.profiles set role='admin' where user_id='00000000-0000-0000-0000-000000017001';
insert into public.questions(id,partition_key,performance_indicator,question_type,question_text,options,correct_option_id,explanation,difficulty,tags,updated_at)
values ('00000000-0000-0000-0000-000000017003','Finance','FI:017','Scenario','Original repository item?',
'["First","Second","Third","Fourth"]','A','First is the correct answer.','Easy',array['Financial Analysis'],'2026-01-01T00:00:00Z');
update public.questions set question_hash='repository-original-hash' where id='00000000-0000-0000-0000-000000017003';
-- Use the stored timestamp: the question's update trigger owns the revision token.
create temporary table editor_start as select updated_at from public.questions where id='00000000-0000-0000-0000-000000017003';
grant select on editor_start to authenticated;
insert into public.test_ids(id,definition_id,mode,category,difficulties,topic_tags,question_count,pool_timestamp,created_by,blueprint_snapshot,canonical_seed,algorithm_version,eligibility_rule_version,generation_status,selected_question_count,completed_at)
values('EDITOR000001','00000000-0000-0000-0000-000000017004','Test','Finance',array['Easy'],array['Financial Analysis'],1,now(),'00000000-0000-0000-0000-000000017002','{"blueprint_name":"Repository fixture","version":"1"}','editor-fixture','sha256-strata-v1','active-complete-v1','Ready',1,now());
insert into public.test_definition_questions(test_definition_id,question_id,position,stratum_id,content_hash,question_updated_at)
select '00000000-0000-0000-0000-000000017004',id,1,'fixture',question_hash,updated_at
from public.questions where id='00000000-0000-0000-0000-000000017003';
create temporary table editor_attempt(id uuid);
grant all on editor_attempt to authenticated;
insert into public.blueprint_versions(id,blueprint_name,cluster,level,category,version,total_questions,distribution,change_reason)
values('00000000-0000-0000-0000-000000017005','Repository editor eligibility','Finance','State','Finance','1',1,
'{"schema_version":1,"strata":[{"id":"fixture","count":1,"tags":["Repository editor isolation"]}]}','Synthetic repository test');
create temporary table edit_fixture(content jsonb);
insert into edit_fixture values ('{"partition_key":"Finance","performance_indicator":"FI:017","question_type":"S","question_text":"Edited repository item?","options":["First","Second","Third","Fourth"],"correct_option_id":"B","explanation":"Second is the correct answer.","difficulty":"Easy","tags":["Repository editor isolation"]}');
grant select on edit_fixture to authenticated;
select ok(not has_table_privilege('authenticated','public.questions','UPDATE'),'no direct question mutation');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000017002',true);
select throws_ok($q$select public.get_repository_question('00000000-0000-0000-0000-000000017003')$q$,'42501','Staff access required.','student cannot load editor');
select throws_ok($q$select public.edit_repository_question('00000000-0000-0000-0000-000000017003','2026-01-01',content,'Authorized reason') from edit_fixture$q$,'42501','Staff access required.','student cannot edit');
insert into editor_attempt select session_id from public.start_test_session('EDITOR000001','editor-fixture-start');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000017001',true);
select throws_ok($q$select public.edit_repository_question('00000000-0000-0000-0000-000000017003','2025-01-01',content,'Authorized reason') from edit_fixture$q$,'P0001','Question changed. Reload the current version before saving.','stale edit denied');
select throws_ok($q$select public.edit_repository_question('00000000-0000-0000-0000-000000017003',(select updated_at from editor_start),content||'{"options":[]}', 'Authorized reason') from edit_fixture$q$,'P0001','Exactly four non-empty options in A-D order are required.','server validates complete content');
select throws_ok($q$select public.edit_repository_question('00000000-0000-0000-0000-000000017003',(select updated_at from editor_start),content,'Synthetic audit failure') from edit_fixture$q$,'P0001','Injected repository audit failure','repository edit rolls back when audit fails');
select is(public.get_repository_question('00000000-0000-0000-0000-000000017003')->>'question_text','Original repository item?','audit failure preserves original live question');
select is((select count(*) from public.question_versions where question_id='00000000-0000-0000-0000-000000017003'),0::bigint,'audit failure leaves no revision');
select is((select public.edit_repository_question('00000000-0000-0000-0000-000000017003',(select updated_at from editor_start),content,'Clarify existing item')->>'question_text' from edit_fixture),'Edited repository item?','trusted repository edit succeeds without report');
select is((select count(*) from public.question_versions where question_id='00000000-0000-0000-0000-000000017003' and report_id is null),1::bigint,'immutable revision does not require report');
select is((select count(*) from public.admin_audit_logs where action='question.repository_edited' and resource_id='00000000-0000-0000-0000-000000017003'),1::bigint,'edit is audited');
select throws_ok($q$select public.set_repository_question_lifecycle('00000000-0000-0000-0000-000000017003','Retired','Retire fixture','2026-01-01')$q$,'P0001','Question changed. Reload before changing lifecycle.','stale retirement denied');
select is((select lifecycle_state from public.set_repository_question_lifecycle('00000000-0000-0000-0000-000000017003','Retired','Retire fixture',now())),'Retired','current question retires');
select is((select count(*) from public.search_question_repository(p_search=>'Edited repository item',p_lifecycle_state=>'Active')),0::bigint,'retired question absent from active repository');
select is((select success from public.generate_test_from_blueprint('00000000-0000-0000-0000-000000017005','1',1,null,'editor-retired-pool')),false,'retired question excluded from real generation');
select is((select lifecycle_state from public.set_repository_question_lifecycle('00000000-0000-0000-0000-000000017003','Active','Restore valid fixture',now())),'Active','valid question restores');
select is((select success from public.generate_test_from_blueprint('00000000-0000-0000-0000-000000017005','1',1,null,'editor-restored-pool')),true,'restored question is eligible for real generation');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000017002',true);
select is((select question_text from public.get_test_session((select id from editor_attempt))),'Original repository item?','active session keeps its original wording');
select is((select updated_question_count from public.get_test_id_preview('EDITOR000001')),1,'original Test ID warns about edited content');
select * from public.save_test_session_answer((select id from editor_attempt),'00000000-0000-0000-0000-000000017003','A',1);
select is((select correct_answers from public.submit_test_session((select id from editor_attempt),2)),1,'submission uses the original scoring key');
select is((select question_text from public.get_test_result((select id from editor_attempt))),'Original repository item?','result retains original question snapshot');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000017001',true);
select public.edit_repository_question('00000000-0000-0000-0000-000000017003',now(),
  content||'{"correct_option_id":"C","question_text":"Edited after submission?"}', 'Correct live item after submission') from edit_fixture;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000017002',true);
select is((select percentage from public.get_test_result((select id from editor_attempt))),100.00::numeric,'later repository edit does not rescore submitted result');
reset role;
select is((select position from public.test_definition_questions where test_definition_id='00000000-0000-0000-0000-000000017004' and question_id='00000000-0000-0000-0000-000000017003'),1,'membership and order survive edit and lifecycle transitions');
rollback;
