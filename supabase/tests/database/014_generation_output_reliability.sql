begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into public.deca_batch_jobs(id,status,openai_batch_id) values
 ('f0210000-0000-4000-8000-000000000001','completed','phase2-sql-fixture');
insert into public.generation_queue_v3(id,partition_key,category,indicator_code,performance_indicator,
  locked_by_batch_id,status,scenario_needed,definition_needed,fill_needed,all_except_needed)
values('f0210000-0000-4000-8000-000000000002','Finance','Business Law','PHASE2-SQL','Local indicator',
 'f0210000-0000-4000-8000-000000000001','locked',20,20,20,20);
create temporary table phase2_payload as select
 '[{"t":"S","q":"Phase 2 scenario?","o":["A","B","C","D"],"a":0,"e":"Synthetic explanation","d":"E"},{"t":"D","q":"Phase 2 definition?","o":["A","B","C","D"],"a":1,"e":"Synthetic explanation","d":"M"}]'::jsonb as questions;
grant select on phase2_payload to service_role;
set local role service_role;
select is((public.reconcile_generation_output('f0210000-0000-4000-8000-000000000001','file-phase2',4)->>'import_offset')::integer,0,'new output starts at zero');
select lives_ok($sql$select public.commit_generation_output_line('f0210000-0000-4000-8000-000000000001','file-phase2',0,2,repeat('a',64),'f0210000-0000-4000-8000-000000000002',(select questions from phase2_payload))$sql$,'service atomically commits candidates, receipt and line');
select is((select imported_count from public.deca_batch_jobs where id='f0210000-0000-4000-8000-000000000001'),0,'checkpoint intentionally remains unchanged before reconciliation');
select is((select imported_count from public.generation_import_receipts where batch_job_id='f0210000-0000-4000-8000-000000000001'),2,'durable receipt retains original committed contribution');
select is((public.reconcile_generation_output('f0210000-0000-4000-8000-000000000001','file-phase2',4)->>'imported_count')::integer,2,'reconciliation recovers committed work');
select is((public.reconcile_generation_output('f0210000-0000-4000-8000-000000000001','file-phase2',4)->>'imported_count')::integer,2,'repeated reconciliation is idempotent');
select is(public.commit_generation_output_line('f0210000-0000-4000-8000-000000000001','file-phase2',0,2,repeat('a',64),'f0210000-0000-4000-8000-000000000002',(select questions from phase2_payload))->>'replayed','true','ambiguous response replay reuses immutable line outcome');
select lives_ok($sql$select public.commit_generation_output_line('f0210000-0000-4000-8000-000000000001','file-phase2',1,4,repeat('b',64),null,null,'invalid_json')$sql$,'unidentifiable malformed line gets durable outcome without fabricated queue');
select lives_ok($sql$select public.commit_generation_output_line('f0210000-0000-4000-8000-000000000001','file-phase2',2,5,repeat('a',64),'f0210000-0000-4000-8000-000000000002',(select questions from phase2_payload))$sql$,'genuinely duplicate response is distinct from same-line replay');
select lives_ok($sql$select public.commit_generation_output_line('f0210000-0000-4000-8000-000000000001','file-phase2',3,6,repeat('c',64),'f0210000-0000-4000-8000-000000000099',(select questions from phase2_payload))$sql$,'unknown custom id is a durable failure, not an invented queue');
select is(public.reconcile_generation_output('f0210000-0000-4000-8000-000000000001','file-phase2',4)->>'import_outcome','partial','mixed terminal outcome accurately reports partial import');
select is((select failed_count from public.deca_batch_jobs where id='f0210000-0000-4000-8000-000000000001'),2,'failed source lines are counted once');
select is((public.reconcile_generation_output('f0210000-0000-4000-8000-000000000001','file-phase2',4)->>'skipped_count')::integer,2,'duplicate response skips questions without losing original imports');
select is((select count(*)::integer from public.generated_question_candidates where batch_job_id='f0210000-0000-4000-8000-000000000001'),2,'replays never duplicate candidates');
select throws_ok($sql$select public.commit_generation_output_line('f0210000-0000-4000-8000-000000000001','file-phase2',0,2,repeat('d',64))$sql$,'PT409','Source content changed at committed position','stale altered source rejected');
select throws_ok($sql$select public.reconcile_generation_output('f0210000-0000-4000-8000-000000000001','different-file',4)$sql$,'PT409','Output manifest changed; refusing stale worker','stale file cannot overwrite newer progress');
-- pgTAP wraps this file in one transaction, unlike separate HTTP RPC requests.
-- Clear the previous trusted wrapper's transaction-local marker for this probe.
select set_config('liftoff.import_writer','',true);
select throws_ok($sql$update public.deca_batch_jobs set import_offset=0 where id='f0210000-0000-4000-8000-000000000001'$sql$,'PT409','Output-ledger jobs must be updated through reconciliation RPCs','old importer cannot overwrite ledger progress');
select throws_ok($sql$update public.generation_import_receipts set imported_count=0,status='Failed' where batch_job_id='f0210000-0000-4000-8000-000000000001'$sql$,'23514','Committed import receipt outcomes are immutable','successful receipt cannot be overwritten with a failed or duplicate outcome');
reset role;
select ok(not has_function_privilege('anon','public.reconcile_generation_output(uuid,text,integer)','EXECUTE'),'anon denied reconciliation');
select ok(not has_function_privilege('authenticated','public.commit_generation_output_line(uuid,text,integer,integer,text,uuid,jsonb,text)','EXECUTE'),'every browser application role denied line mutation');
select ok((select relrowsecurity from pg_class where oid='public.generation_output_lines'::regclass),'output outcomes have RLS');
set local role anon;
select throws_ok($sql$select public.reconcile_generation_output('f0210000-0000-4000-8000-000000000001','file-phase2',4)$sql$,'42501','permission denied for function reconcile_generation_output','actual anon operation denied');
reset role;
set local role authenticated;
select throws_ok($sql$select public.commit_generation_output_line('f0210000-0000-4000-8000-000000000001','file-phase2',0,1,repeat('a',64))$sql$,'42501','permission denied for function commit_generation_output_line','actual authenticated operation denied');
select is((select count(*)::integer from public.generation_output_lines),0,'ordinary user cannot read quarantined outcomes');
reset role;
select * from finish();
rollback;
