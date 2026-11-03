begin;
create extension if not exists pgtap with schema extensions;
select plan(6);
select ok(position('UNKNOWN' in (select pg_get_constraintdef(oid) from pg_constraint
  where conrelid='public.test_session_answers'::regclass and conname='test_session_answers_selected_option_id_check'))>0,
  'saved answers distinguish explicit uncertainty');
select ok(position('UNKNOWN' in (select pg_get_constraintdef(oid) from pg_constraint
  where conrelid='public.test_result_items'::regclass and conname='test_result_items_selected_option_id_check'))>0,
  'immutable result snapshots retain explicit uncertainty');
select ok(position('UNKNOWN' in pg_get_functiondef('public.save_test_session_answer(uuid,uuid,text,bigint)'::regprocedure))>0,
  'trusted answer RPC accepts the uncertainty domain');
select ok(not has_function_privilege('anon','public.save_test_session_answer(uuid,uuid,text,bigint)','EXECUTE'),
  'anonymous users still cannot save answers');
select ok(not has_table_privilege('authenticated','public.test_session_answers','INSERT'),
  'browser cannot bypass answer validation by direct insert');
select ok(not has_table_privilege('authenticated','public.test_result_items','UPDATE'),
  'browser cannot rewrite result snapshots');
select * from finish();
rollback;
