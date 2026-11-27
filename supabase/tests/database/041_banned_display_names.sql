begin;
create extension if not exists pgtap with schema extensions;
select plan(13);
insert into auth.users(id,email,aud,role,raw_user_meta_data) values
 ('41000000-0000-0000-0000-000000000001','names-admin@example.test','authenticated','authenticated','{"display_name":"Administrator"}'),
 ('41000000-0000-0000-0000-000000000002','names-user@example.test','authenticated','authenticated','{"display_name":"Existing Student"}'),
 ('41000000-0000-0000-0000-000000000003','names-owner@example.test','authenticated','authenticated','{"display_name":"Test Owner"}');
update public.profiles set role='admin' where user_id='41000000-0000-0000-0000-000000000001';
update public.profiles set role='owner' where user_id='41000000-0000-0000-0000-000000000003';

set local role authenticated;
select set_config('request.jwt.claim.sub','41000000-0000-0000-0000-000000000002',true);
select throws_ok($$select public.set_staff_banned_term('blorn',true,'Student must be denied')$$,'42501',null,'student cannot manage term rules');
select ok(not has_table_privilege('authenticated','public.banned_terms','INSERT'),'no unlogged authenticated write permission');
select set_config('request.jwt.claim.sub','41000000-0000-0000-0000-000000000001',true);
select is(public.set_staff_banned_term('Blorn',true,'Add test rule'),'blorn','admin canonicalizes and activates a rule');
select is(public.set_staff_banned_term('Glarb  Step',true,'Add phrase rule'),'glarb step','phrase spaces are normalized');
reset role;

set local role anon;
select ok(not public.check_display_name_allowed('Test BLORN!'),'case and punctuation match a whole word');
select ok(public.check_display_name_allowed('Blornfield'),'prefix inside a longer word is not blocked');
select ok(not public.check_display_name_allowed('Glarb-Step Club'),'phrases match at normalized word boundaries');
select throws_ok($$select term from public.banned_terms$$,'42501',null,'anonymous checker exposes no rule list');
reset role;
select throws_ok($$insert into auth.users(id,email,aud,role,raw_user_meta_data) values
 ('41000000-0000-0000-0000-000000000004','names-bypass@example.test','authenticated','authenticated','{"display_name":"Test BLORN!"}')$$,
 '22023','Choose a display name without a restricted word or phrase.','new Auth insert also enforces rule without UI');
select is((select count(*) from auth.users where id='41000000-0000-0000-0000-000000000004'),0::bigint,'rejected signup leaves no Auth account');

set local role authenticated;
select set_config('request.jwt.claim.sub','41000000-0000-0000-0000-000000000002',true);
select throws_ok($$update public.profiles set display_name='Glarb step club'
 where user_id='41000000-0000-0000-0000-000000000002'$$,'22023',null,'direct rename gets the same policy');
select is((select display_name from public.profiles where user_id='41000000-0000-0000-0000-000000000002'),'Existing Student','rejected rename preserves prior value');
select set_config('request.jwt.claim.sub','41000000-0000-0000-0000-000000000003',true);
select is(public.set_staff_banned_term('BLORN',false,'Retire test name rule'),'blorn','owner can retire the term without deletion');
select * from finish();
rollback;
