begin;
create extension if not exists pgtap with schema extensions;
select plan(5);
insert into auth.users(id,email,aud,role) values
 ('00000000-0000-0000-0000-000000032001','infinite-paid@example.test','authenticated','authenticated'),
 ('00000000-0000-0000-0000-000000032002','infinite-expired@example.test','authenticated','authenticated'),
 ('00000000-0000-0000-0000-000000032003','infinite-free@example.test','authenticated','authenticated');
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
select * from finish();
rollback;
