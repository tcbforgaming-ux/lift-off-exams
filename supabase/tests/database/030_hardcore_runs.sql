begin;
create extension if not exists pgtap with schema extensions;
select plan(13);
insert into auth.users(id,email,aud,role) values
 ('00000000-0000-0000-0000-000000030001','hardcore-paid@example.test','authenticated','authenticated'),
 ('00000000-0000-0000-0000-000000030002','hardcore-free@example.test','authenticated','authenticated');
insert into public.subscriptions(user_id,status)
values('00000000-0000-0000-0000-000000030001','active');
insert into public.questions(partition_key,question_type,question_text,options,correct_option_id,difficulty,explanation)
values ('Finance','Scenario','Hardcore fixture','["First","Second","Third","Fourth"]','A','Hard','Protected fixture');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000030002',true);
select throws_ok($$select public.start_hardcore(gen_random_uuid(),2)$$,'42501',null,'free custom cap denied');
select is((public.start_hardcore(gen_random_uuid())->>'cap')::int,1,'default cap is one');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000030001',true);
select throws_ok($$select public.start_hardcore(gen_random_uuid(),4)$$,'22023',null,'invalid cap rejected');
select set_config('hc.id',public.start_hardcore(gen_random_uuid(),2)->>'id',true);
select ok(not ((public.get_hardcore(current_setting('hc.id')::uuid)->'question') ?| array['answer','explanation']),
 'live payload protects keys');
select throws_ok($$select public.advance_hardcore(current_setting('hc.id')::uuid,1,gen_random_uuid(),null)$$,
 '22023',null,'Next requires an answer');
select set_config('hc.retry',gen_random_uuid()::text,true);
select set_config('hc.next',public.advance_hardcore(current_setting('hc.id')::uuid,1,current_setting('hc.retry')::uuid,'B')::text,true);
select is((current_setting('hc.next')::jsonb->>'strikes')::int,1,'first miss leaves one strike');
select is(public.advance_hardcore(current_setting('hc.id')::uuid,1,current_setting('hc.retry')::uuid,'B'),
 current_setting('hc.next')::jsonb,'lost response retry returns persisted state');
select throws_ok($$select public.advance_hardcore(current_setting('hc.id')::uuid,1,gen_random_uuid(),'B')$$,
 '22023',null,'stale position rejected');
select is((public.advance_hardcore(current_setting('hc.id')::uuid,2,gen_random_uuid(),'A')->>'strikes')::int,1,
 'correct answer leaves strikes unchanged');
select ok(public.advance_hardcore(current_setting('hc.id')::uuid,3,gen_random_uuid(),'UNKNOWN')
 @> '{"strikes":2,"committed":3,"correct":1,"question":null}','exact cap persists score and withholds next question');
select throws_ok($$select public.advance_hardcore(current_setting('hc.id')::uuid,4,gen_random_uuid(),'A')$$,
 '22023',null,'terminal run cannot advance');
select ok((select bool_and((x->'question') ? 'explanation') from public.review_hardcore(current_setting('hc.id')::uuid,0,true) x),
 'paid owner can opt in to explanations');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000030002',true);
select throws_ok($$select public.get_hardcore(current_setting('hc.id')::uuid)$$,'42501',null,'cross-user access denied');
reset role;
select * from finish();
rollback;
