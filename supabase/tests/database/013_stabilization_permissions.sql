begin;
create extension if not exists pgtap with schema extensions;
create schema if not exists tests;
create function tests.permission_denied(statement text) returns boolean
language plpgsql security invoker as $$
begin
  execute statement;
  return false;
exception when insufficient_privilege then return true;
end;
$$;
grant usage on schema tests to anon, authenticated, service_role;
grant execute on function tests.permission_denied(text) to anon, authenticated, service_role;
select no_plan();

insert into auth.users(id, email, raw_user_meta_data) values
  ('f0180000-0000-4000-8000-000000000001','phase1-student@example.test','{}'),
  ('f0180000-0000-4000-8000-000000000002','phase1-admin@example.test','{}'),
  ('f0180000-0000-4000-8000-000000000003','phase1-owner@example.test','{}'),
  ('f0180000-0000-4000-8000-000000000004','phase1-other@example.test','{}');
set local role service_role;
select public.bootstrap_initial_owner('f0180000-0000-4000-8000-000000000003','Disposable permission fixture');
select public.mark_inactive_owners('-infinity');
reset role;
update public.profiles set role = 'admin' where user_id = 'f0180000-0000-4000-8000-000000000002';

-- Every protected field, not only today's role/tier names.
select ok(not has_column_privilege('authenticated','public.profiles', attname,'UPDATE'),
  'protected profile column denies authenticated: ' || attname)
from pg_attribute where attrelid = 'public.profiles'::regclass and attnum > 0
  and not attisdropped and attname not in ('display_name','phone');
select ok(not has_table_privilege('authenticated','public.profiles','UPDATE'), 'no broad authenticated UPDATE');
select ok(not has_table_privilege('anon','public.profiles','UPDATE'), 'no broad anon UPDATE');
select ok(not has_table_privilege('authenticated','public.profiles','INSERT'), 'profile creation is trigger-only');

create temporary table server_calls(signature text, statement text);
insert into server_calls values
 ('public.bootstrap_initial_owner(uuid,text)', $$select public.bootstrap_initial_owner('f0180000-0000-4000-8000-000000000004','forged')$$),
 ('public.build_deca_batch_jsonl(integer)', 'select public.build_deca_batch_jsonl(1)'),
 ('public.insert_generated_questions(text,jsonb)', $$select public.insert_generated_questions('missing','[]')$$),
 ('public.insert_generated_questions(uuid,jsonb,text)', $$select public.insert_generated_questions('f0180000-0000-4000-8000-000000000004','[]','forged')$$),
 ('public.mark_inactive_owners(timestamptz)', 'select public.mark_inactive_owners(now())'),
 ('public.recalculate_generation_queue_needed(integer)', 'select public.recalculate_generation_queue_needed(20)'),
 ('public.write_test_session_audit(text,uuid,text,text,text,jsonb)', $$select public.write_test_session_audit('forged',null,'fake',null,null,'{"actor_user_id":"f0180000-0000-4000-8000-000000000004"}')$$),
 ('public.write_admin_audit(text,text,text,text,jsonb)', $$select public.write_admin_audit('forged','profile',null,null,'{}')$$);
grant select on server_calls to anon, authenticated;
create temporary table permission_outcomes(passed boolean, description text);
grant insert on permission_outcomes to authenticated;
select ok(not has_function_privilege('anon',signature,'EXECUTE') and not has_function_privilege('authenticated',signature,'EXECUTE'), 'effective browser EXECUTE denied: ' || signature) from server_calls;

set local role anon;
select ok(tests.permission_denied(statement), 'actual anon call denied: ' || signature) from server_calls;
reset role;

-- All three application roles use the same authenticated DB role. Exercise
-- actual operations under each trusted profile, not just postgres ACL inspection.
do $$
declare actor record; command record; column_name text; changed integer;
begin
  for actor in select user_id, role from public.profiles where user_id in (
    'f0180000-0000-4000-8000-000000000001','f0180000-0000-4000-8000-000000000002','f0180000-0000-4000-8000-000000000003'
  ) order by user_id loop
    perform set_config('request.jwt.claim.sub', actor.user_id::text, true);
    perform set_config('request.jwt.claims', jsonb_build_object('sub',actor.user_id,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    for command in select * from server_calls loop
      insert into permission_outcomes values (tests.permission_denied(command.statement), actor.role || ' cannot directly call ' || command.signature);
    end loop;
    foreach column_name in array array['role','account_tier','owner_state','suspended_until','owner_privileges_suspended','last_owner_activity_at'] loop
      insert into permission_outcomes values (tests.permission_denied(format('update public.profiles set %I = %I where user_id = %L',column_name,column_name,actor.user_id)), actor.role || ' cannot mutate ' || column_name);
    end loop;
    update public.profiles set display_name = 'Phase 1 ' || actor.role, phone = '555-0100' where user_id = actor.user_id;
    get diagnostics changed = row_count;
    insert into permission_outcomes values (changed = 1, actor.role || ' updates own basic fields');
    update public.profiles set display_name = 'cross-user' where user_id = 'f0180000-0000-4000-8000-000000000004';
    get diagnostics changed = row_count;
    insert into permission_outcomes values (changed = 0, actor.role || ' cannot update another profile');
    insert into permission_outcomes values (tests.permission_denied($sql$insert into public.admin_audit_logs(action,resource_type) values('forged','profile')$sql$), actor.role || ' cannot insert audit');
    insert into permission_outcomes values (tests.permission_denied('update public.admin_audit_logs set action = action'), actor.role || ' cannot alter audit');
    insert into permission_outcomes values (tests.permission_denied('delete from public.admin_audit_logs'), actor.role || ' cannot delete audit');
    insert into permission_outcomes values (tests.permission_denied($sql$insert into public.governance_ballots(vote_id,owner_user_id,decision) values(gen_random_uuid(),auth.uid(),'Approve')$sql$), actor.role || ' cannot insert direct or forged ballots');
    insert into permission_outcomes values (tests.permission_denied('update public.governance_votes set status = status'), actor.role || ' cannot directly change vote state');
    execute 'reset role';
  end loop;
end;
$$;
select ok(passed,description) from permission_outcomes;
select is((select count(*)::integer from public.profiles where display_name like 'Phase 1 %'),3,'all application roles persisted their basic profile edits');
select is((select display_name from public.profiles where user_id='f0180000-0000-4000-8000-000000000004'),'phase1-other','cross-user edits left no partial state');
select is((select count(*)::integer from public.admin_audit_logs where action='forged'),0,'forbidden audit calls left no forged records');

-- Defense in depth: deliberately regress EXECUTE in this transaction only.
grant execute on function public.mark_inactive_owners(timestamptz), public.write_test_session_audit(text,uuid,text,text,text,jsonb) to authenticated;
set local role authenticated;
select ok(tests.permission_denied('select public.mark_inactive_owners(now())'), 'server precondition denies even accidentally granted EXECUTE');
select ok(tests.permission_denied($$select public.write_test_session_audit('forged',null,null,null,null)$$), 'invoker audit helper cannot elevate accidentally granted EXECUTE');
reset role;

select set_config('request.jwt.claim.sub','f0180000-0000-4000-8000-000000000003',true);
set local role authenticated;
select lives_ok($$select public.set_user_platform_role('f0180000-0000-4000-8000-000000000004','admin','Permission regression')$$,'owner role-management wrapper still succeeds');
select lives_ok($$select public.set_own_owner_privileges_suspended(true)$$,'self-suspension nested admin audit remains compatible');
select lives_ok($$select public.set_own_owner_privileges_suspended(false)$$,'self-restoration nested admin audit remains compatible');
reset role;
select is((select actor_user_id::text from public.admin_audit_logs where action='Platform role changed' order by created_at desc limit 1),'f0180000-0000-4000-8000-000000000003','trusted workflow records actual owner actor');

insert into public.generation_queue_v3(id,partition_key,category,indicator_code,performance_indicator,scenario_needed,definition_needed,fill_needed,all_except_needed)
values('f0180000-0000-4000-8000-000000000010','Finance','Business Law','PHASE1','Phase 1 local indicator',2,0,0,0);
set local role service_role;
select lives_ok('select public.build_deca_batch_jsonl(1)','actual service role can build a local batch without external calls');
select lives_ok($sql$select public.insert_generated_questions('f0180000-0000-4000-8000-000000000010'::uuid,'[{"t":"S","q":"Phase 1 preferred import?","o":["A","B","C","D"],"a":0,"e":"Synthetic explanation","d":"E"}]'::jsonb,'phase1-receipt')$sql$,'actual service role can use preferred import overload');
select lives_ok($sql$select public.insert_generated_questions('PHASE1'::text,'[{"t":"S","q":"Phase 1 legacy import?","o":["A","B","C","D"],"a":0,"e":"Synthetic explanation","d":"E"}]'::jsonb)$sql$,'actual service role can use legacy import through nested preferred overload');
reset role;
select is((select count(*)::integer from public.generated_question_candidates where question_text like 'Phase 1 % import?'),2,'trusted service imports persist candidate rows');

create function public.phase1_future_function() returns integer language sql as $$select 1$$;
create table public.phase1_future_table(id integer);
select ok(not has_function_privilege('anon','public.phase1_future_function()','EXECUTE') and not has_function_privilege('authenticated','public.phase1_future_function()','EXECUTE'),'clean future function has no inherited browser EXECUTE');
select ok(not has_table_privilege('authenticated','public.phase1_future_table','UPDATE'),'clean future table has no inherited browser mutation');
select * from finish();
rollback;
