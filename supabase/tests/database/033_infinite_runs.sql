begin;
create extension if not exists pgtap with schema extensions;
select plan(22);
select ok(not has_function_privilege('anon','public.start_infinite_run(uuid,text,text,text[])','execute'),'signed-out launch has no grant');
insert into auth.users(id,email,aud,role) values
 ('00000000-0000-0000-0000-000000033001','infinite-run-paid@example.test','authenticated','authenticated'),
 ('00000000-0000-0000-0000-000000033002','infinite-run-other@example.test','authenticated','authenticated');
insert into public.subscriptions(user_id,status)
values('00000000-0000-0000-0000-000000033001','active');
insert into public.questions(id,partition_key,question_type,question_text,options,correct_option_id,difficulty,explanation)
values ('00000000-0000-0000-0000-000000033011','Infinite fixture','Scenario','One eligible question',
 '["One","Two","Three","Four"]','A','Hard','Private explanation');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000033002',true);
select throws_ok($$select public.start_infinite_run(gen_random_uuid())$$,'42501',null,'free launch denied');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000033001',true);
select throws_ok($$select public.start_infinite_run(gen_random_uuid(),'no category')$$,'P0001',null,'empty category rejected');
select set_config('ir.id',public.start_infinite_run(gen_random_uuid(),'Infinite fixture','Easy',array['unmatched'])->>'id',true);
select ok(public.get_infinite_run(current_setting('ir.id')::uuid)->'question' @> '{"difficulty":"Hard"}','preferences are soft');
select ok(not (public.get_infinite_run(current_setting('ir.id')::uuid)->'question' ?| array['answer','explanation']),'live question is sanitized');
select throws_ok($$select public.advance_infinite_run(current_setting('ir.id')::uuid,1,gen_random_uuid(),null)$$,'22023',null,'response required');
select set_config('ir.request',gen_random_uuid()::text,true);
select set_config('ir.response',public.advance_infinite_run(current_setting('ir.id')::uuid,1,current_setting('ir.request')::uuid,'A')::text,true);
select ok(current_setting('ir.response')::jsonb @> '{"answered":1,"correct":1,"streak":1,"last_correct":true,"question":{"id":"00000000-0000-0000-0000-000000033011"}}','small pool recycles without ending the run');
select is(public.advance_infinite_run(current_setting('ir.id')::uuid,1,current_setting('ir.request')::uuid,'A'),current_setting('ir.response')::jsonb,'lost response retry is idempotent');
select throws_ok($$select public.advance_infinite_run(current_setting('ir.id')::uuid,1,gen_random_uuid(),'B')$$,'22023',null,'stale position denied');
select ok(public.advance_infinite_run(current_setting('ir.id')::uuid,2,gen_random_uuid(),'UNKNOWN')
 @> '{"answered":2,"correct":1,"uncertain":1,"streak":0,"best":1,"last_correct":false}','uncertainty is separate and breaks the streak');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000033002',true);
select throws_ok($$select public.get_infinite_run(current_setting('ir.id')::uuid)$$,'42501',null,'cross-user read denied');
select throws_ok($$select public.advance_infinite_run(current_setting('ir.id')::uuid,3,gen_random_uuid(),'A')$$,'42501',null,'cross-user advance denied');
select throws_ok($$select public.finish_infinite_run(current_setting('ir.id')::uuid)$$,'42501',null,'cross-user finish denied');
reset role;
update public.subscriptions set current_period_end=now()-interval '1 minute'
where user_id='00000000-0000-0000-0000-000000033001';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000033001',true);
select ok(public.get_infinite_run(current_setting('ir.id')::uuid) @> '{"question":null,"paid":false}','expiry blocks question recovery');
select throws_ok($$select public.advance_infinite_run(current_setting('ir.id')::uuid,3,gen_random_uuid(),'A')$$,'42501',null,'expiry blocks advancing');
select set_config('ir.finished',public.finish_infinite_run(current_setting('ir.id')::uuid)::text,true);
select is(public.finish_infinite_run(current_setting('ir.id')::uuid),current_setting('ir.finished')::jsonb,'expired owner can finish exactly once');
select is((select count(*)::integer from public.review_infinite_run(current_setting('ir.id')::uuid,0,true)),2,'owned review still available');
select ok((select bool_and(not (x->'question' ? 'explanation')) from public.review_infinite_run(current_setting('ir.id')::uuid,0,true) x),'expired review omits explanation');
reset role;
update public.subscriptions set current_period_end=now()+interval '1 day'
where user_id='00000000-0000-0000-0000-000000033001';
set local role authenticated;
select throws_ok($$select public.advance_infinite_run(current_setting('ir.id')::uuid,3,gen_random_uuid(),'A')$$,'22023',null,'finished run cannot advance even after renewal');
select ok((select bool_and(x->'question' ? 'explanation') from public.review_infinite_run(current_setting('ir.id')::uuid,0,true) x),'renewed owner may opt in to explanations');
select set_config('ir.replenish',public.start_infinite_run(gen_random_uuid(),'Infinite fixture')->>'id',true);
reset role;
update public.questions set lifecycle_state='Retired' where id='00000000-0000-0000-0000-000000033011';
set local role authenticated;
select ok(public.advance_infinite_run(current_setting('ir.replenish')::uuid,1,gen_random_uuid(),'A')
 @> '{"correct":1,"question":null,"finished_at":null}','retirement preserves current grading and does not finish the run');
reset role;
insert into public.questions(partition_key,question_type,question_text,options,correct_option_id,difficulty)
values('Infinite fixture','Scenario','Replenished question','["A","B","C","D"]','A','Medium');
set local role authenticated;
select ok(public.get_infinite_run(current_setting('ir.replenish')::uuid)
 @> '{"answered":1,"question":{"text":"Replenished question"}}','reopen recovers after inventory is replenished');
reset role;
select * from finish();
rollback;
