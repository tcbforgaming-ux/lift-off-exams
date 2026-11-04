begin;
create extension if not exists pgtap with schema extensions;
select plan(20);
insert into auth.users(id,email,aud,role) values
 ('00000000-0000-0000-0000-000000018001','author-admin@example.test','authenticated','authenticated'),
 ('00000000-0000-0000-0000-000000018002','author-student@example.test','authenticated','authenticated');
update public.profiles set role='admin' where user_id='00000000-0000-0000-0000-000000018001';
create temp table author_fixture(key text primary key,value jsonb);
insert into author_fixture values ('row','{"partitionKey":"Finance","questionType":"S","performanceIndicator":"FI:018","questionText":"Synthetic staff authoring question?","options":[{"id":"A","text":"First"},{"id":"B","text":"Second"},{"id":"C","text":"Third"},{"id":"D","text":"Fourth"}],"correctAnswerIndex":0,"explanation":"First is correct.","difficulty":"E","tags":["Financial Analysis"]}');
insert into author_fixture select 'mixed',jsonb_build_array(value,value||'{"correctAnswerIndex":4}',value||'{"questionText":" SYNTHETIC STAFF AUTHORING QUESTION? "}') from author_fixture where key='row';
grant all on author_fixture to authenticated;
create function pg_temp.fail_authoring_audit() returns trigger language plpgsql as $$
begin
  if new.action='question.staff_import' and new.reason='Synthetic audit failure' then raise exception 'Injected authoring audit failure'; end if;
  return new;
end;
$$;
create trigger test_authoring_audit_failure before insert on public.admin_audit_logs
for each row execute function pg_temp.fail_authoring_audit();

select ok(not has_function_privilege('anon','public.preview_staff_questions(jsonb)','EXECUTE'),'anonymous preview denied');
select ok(not has_table_privilege('authenticated','private.staff_question_imports','INSERT'),'staff cannot forge import receipts');
select ok(not has_table_privilege('authenticated','public.generated_question_candidates','INSERT'),'staff cannot bypass candidate creation');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000018002',true);
select throws_ok($q$select public.preview_staff_questions('[]')$q$,'42501','Staff access required.','student preview denied');
select throws_ok($q$select public.commit_staff_questions('[]','',null,'manual','Student attempt')$q$,'42501','Staff access required.','student commit denied');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000018001',true);
select throws_ok($q$select public.preview_staff_questions('{}')$q$,'P0001','Upload must be a JSON array.','unsupported upload shape denied');
select throws_ok($q$select public.preview_staff_questions((select jsonb_agg(i) from generate_series(1,101) i))$q$,'P0001','Upload must contain 1–100 questions and at most 256 KiB.','row cap enforced');
select throws_ok($q$select public.preview_staff_questions(jsonb_build_array(repeat('a',262145)))$q$,'P0001','Upload must contain 1–100 questions and at most 256 KiB.','byte cap enforced');
insert into author_fixture select 'preview',public.preview_staff_questions(value) from author_fixture where key='mixed';
select is((select value->'rows'->0->>'status' from author_fixture where key='preview'),'ready','valid row previewed');
select is((select value->'rows'->1->>'status' from author_fixture where key='preview'),'invalid','invalid correct answer reported');
select is((select value->'rows'->2->>'status' from author_fixture where key='preview'),'duplicate','case/outer-space duplicate reported');
select is((select count(*) from public.generated_question_candidates where question_text='Synthetic staff authoring question?'),0::bigint,'preview creates no candidate');
select is((select count(*) from public.admin_audit_logs where action='question.staff_import'),0::bigint,'preview creates no audit');
select throws_ok($q$select public.commit_staff_questions((select value from author_fixture where key='mixed'),(select value->>'token' from author_fixture where key='preview'),'00000000-0000-0000-0000-000000018003','json','Synthetic audit failure')$q$,
 'P0001','Injected authoring audit failure','audit failure rolls back import');
select is((select count(*) from public.generated_question_candidates where question_text='Synthetic staff authoring question?'),0::bigint,'failed audit leaves no candidate');
insert into author_fixture select 'outcome',public.commit_staff_questions((select value from author_fixture where key='mixed'),(select value->>'token' from author_fixture where key='preview'),'00000000-0000-0000-0000-000000018003','json','Valid synthetic import');
select is((select value->>'pending_review' from author_fixture where key='outcome'),'1','mixed file accepts valid rows only');
select is((select review_status from public.generated_question_candidates where question_text='Synthetic staff authoring question?'),'Pending Review','import does not bypass review');
select is(public.commit_staff_questions((select value from author_fixture where key='mixed'),(select value->>'token' from author_fixture where key='preview'),'00000000-0000-0000-0000-000000018003','json','Valid synthetic import'),(select value from author_fixture where key='outcome'),'retry returns durable outcome');
select throws_ok($q$select public.commit_staff_questions((select value from author_fixture where key='mixed'),(select value->>'token' from author_fixture where key='preview'),'00000000-0000-0000-0000-000000018003','json','Changed request reason')$q$,
 'P0001','Request key already used for different input.','changed retry rejected');
select throws_ok($q$select public.commit_staff_questions((select value from author_fixture where key='mixed'),(select value->>'token' from author_fixture where key='preview'),'00000000-0000-0000-0000-000000018004','json','Stale duplicate assumptions')$q$,
 'P0001','Preview changed. Preview the current upload again.','stale preview cannot silently change outcome');
rollback;
