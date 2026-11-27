begin;
create extension if not exists pgtap with schema extensions;
select plan(11);
insert into auth.users(id,email,aud,role) values
 ('00000000-0000-0000-0000-000000032001','infinite-paid@example.test','authenticated','authenticated'),
 ('00000000-0000-0000-0000-000000032002','infinite-expired@example.test','authenticated','authenticated'),
 ('00000000-0000-0000-0000-000000032003','infinite-free@example.test','authenticated','authenticated'),
 ('00000000-0000-0000-0000-000000032004','profile-premium@example.test','authenticated','authenticated');
update public.profiles set account_tier='premium'
where user_id='00000000-0000-0000-0000-000000032004';
insert into public.subscriptions(user_id,status,current_period_end) values
 ('00000000-0000-0000-0000-000000032001','active',now()+interval '1 day'),
 ('00000000-0000-0000-0000-000000032002','active',now()-interval '1 day');
select lives_ok($$select private.require_infinite_run_launch_access('00000000-0000-0000-0000-000000032001')$$,
  'trusted current subscription passes the launch guard');
select throws_ok($$select private.require_infinite_run_launch_access('00000000-0000-0000-0000-000000032002')$$,
  '42501',null,'expired subscription fails the launch guard');
select throws_ok($$select private.require_infinite_run_launch_access('00000000-0000-0000-0000-000000032003')$$,
  '42501',null,'free account fails the launch guard');
select throws_ok($$select private.require_infinite_run_launch_access(null)$$,
  '42501',null,'signed-out account fails the launch guard');
select ok(not has_function_privilege('authenticated',
  'private.require_infinite_run_launch_access(uuid)','execute'),
  'clients cannot invoke the private guard directly');
select lives_ok($$select private.require_infinite_run_launch_access('00000000-0000-0000-0000-000000032004')$$,
  'premium profile without a subscription passes the launch guard');
select ok(not has_column_privilege('authenticated','public.profiles','account_tier','UPDATE'),
  'browser cannot grant itself premium');
select ok(not has_function_privilege('authenticated','private.has_paid_activity_access(uuid)','EXECUTE'),
  'browser cannot call the entitlement helper directly');
insert into public.questions(partition_key,question_type,question_text,options,correct_option_id,difficulty,explanation)
select 'Finance','Scenario','Premium profile fixture '||n,'["First","Second","Third","Fourth"]',
  'A','Hard','Fixture explanation' from generate_series(1,20) n;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000032004',true);
select ok(public.start_infinite_run(gen_random_uuid()) ? 'id','premium profile launches Infinite Run');
select ok(public.start_quiz(gen_random_uuid()) ? 'session_id','premium profile launches Quiz');
select is((public.start_hardcore(gen_random_uuid(),2)->>'cap')::int,2,'premium profile gets a custom Hardcore cap');
reset role;
select * from finish();
rollback;
