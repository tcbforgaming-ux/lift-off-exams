begin;
create extension if not exists pgtap with schema extensions;
select plan(13);
insert into auth.users(id,email,aud,role)
values('00000000-0000-0000-0000-000000034001','demo-isolation@example.test','authenticated','authenticated');
insert into public.demo_questions(demo_id,position,prompt,choices,answer)
select 'finance',n,'Synthetic demo '||n,array['One','Two','Three','Four'],'A'
from generate_series(1,5) n;
insert into public.demo_questions values('marketing',1,'Incomplete demo',array['One','Two','Three','Four'],'A');
create temp table demo_counts as
select (select count(*) from public.test_sessions) sessions,
  (select count(*) from public.test_results) results,
  (select count(*) from public.user_question_status) statuses,
  (select count(*) from private.personal_answer_evidence) evidence,
  (select count(*) from private.weekly_free_activity_claims) weekly_claims,
  (select count(*) from private.test_export_receipts) receipts,
  (select count(*) from private.hardcore_runs) hardcore;
set local role anon;
select throws_ok($$select answer from public.demo_questions$$,'42501',null,'anonymous direct answer-key access denied');
select is(jsonb_array_length(public.get_public_demo('finance')),5,'only five questions are served');
select is(public.get_public_demo('finance')->0,
  '{"position":1,"prompt":"Synthetic demo 1","choices":["One","Two","Three","Four"]}'::jsonb,
  'public payload contains only position, prompt and choices');
select throws_ok($$select public.get_public_demo('private')$$,'P0002',null,'invalid ID rejected');
select throws_ok($$select public.get_public_demo('marketing')$$,'P0002',null,'incomplete catalog unavailable');
select throws_ok($$select public.grade_public_demo('finance',array['A'])$$,'22023',null,'wrong answer count rejected');
select throws_ok($$select public.grade_public_demo('finance',array['X',null,null,null,null])$$,'22023',null,'invalid option rejected');
select throws_ok($$select public.grade_public_demo('private',array['A',null,null,null,null])$$,'P0002',null,'invalid grading ID rejected');
select ok(public.grade_public_demo('finance',array['A','B',null,'A','A']) @> '{"score":3,"skipped":1}',
  'correct, incorrect and skipped scoring is deterministic');
select is(public.grade_public_demo('finance',array[null,null,null,null,null]::text[])->'items'->0,
  '{"position":1,"selected":null,"answer":"A"}'::jsonb,'submitted review exposes only curated key and selection');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000034001',true);
select throws_ok($$select answer from public.demo_questions$$,'42501',null,'signed-in direct answer-key access denied');
select ok(public.grade_public_demo('finance',array['A','A','A','A','A']) @> '{"score":5,"skipped":0}',
  'signed-in visitor uses the same grading path');
reset role;
select ok((select sessions=(select count(*) from public.test_sessions)
  and results=(select count(*) from public.test_results)
  and statuses=(select count(*) from public.user_question_status)
  and evidence=(select count(*) from private.personal_answer_evidence)
  and weekly_claims=(select count(*) from private.weekly_free_activity_claims)
  and receipts=(select count(*) from private.test_export_receipts)
  and hardcore=(select count(*) from private.hardcore_runs) from demo_counts),
  'neither anonymous nor signed-in demo mutates account evidence, usage or export receipts');
select * from finish();
rollback;
