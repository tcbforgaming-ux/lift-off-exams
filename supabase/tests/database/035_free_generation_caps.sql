begin;
create extension if not exists pgtap with schema extensions;
select plan(10);
insert into auth.users(id,email,aud,role)
select ('00000000-0000-0000-0000-00000003500'||n)::uuid,'free-caps-'||n||'@example.test','authenticated','authenticated'
from generate_series(1,4) n;
insert into public.subscriptions(user_id,status,current_period_end) values
 ('00000000-0000-0000-0000-000000035002','active',now()+interval '1 day'),
 ('00000000-0000-0000-0000-000000035003','active',now()-interval '1 day');
update public.profiles set role='admin' where user_id='00000000-0000-0000-0000-000000035004';
insert into public.blueprint_versions(id,blueprint_name,cluster,level,category,version,total_questions,distribution,change_reason)
values ('00000000-0000-0000-0000-000000035010','Quota three','Finance','State','Finance','1',40,
 '{"strata":[{"id":"quota","count":40,"tags":["Business Law","Financial Analysis","Economics"]}]}','Fixture'),
 ('00000000-0000-0000-0000-000000035011','Quota four','Finance','State','Finance','1',41,
 '{"strata":[{"id":"quota","count":41,"tags":["Business Law","Financial Analysis","Economics","Communication"]}]}','Fixture');
insert into public.questions(partition_key,question_type,question_text,options,correct_option_id,explanation,difficulty,tags,lifecycle_state)
select 'Finance','Definition','Quota boundary '||n,'["A","B","C","D"]','A','Fixture','Easy',
 array['Business Law','Financial Analysis','Economics','Communication'],'Active'
from generate_series(1,41) n;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000035002',true);
select set_config('quota.large',(select test_id from public.generate_test_from_blueprint(
 '00000000-0000-0000-0000-000000035011','1',41,'paid','paid-large')),true);
select ok(length(current_setting('quota.large'))>0,'paid saved generation accepts 41 and four tags');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000035001',true);
select ok(public.generate_custom_practice('00000000-0000-0000-0000-000000035010','1',40,array['Easy'],
 array['Business Law','Financial Analysis','Economics'],60,false,false,'free','free-max') @> '{"success":true,"selected_count":40}',
 'free custom generation accepts 40 and three tags');
select throws_ok($$select public.generate_custom_practice('00000000-0000-0000-0000-000000035011','1',41,array['Easy'],
 array['Business Law'],60,false,false,'free','free-large')$$,'22023','Free Test generation is limited to 40 questions.','free custom size rejected');
select throws_ok($$select public.generate_custom_practice('00000000-0000-0000-0000-000000035011','1',40,array['Easy'],
 array['Business Law','Financial Analysis','Economics','Communication'],60,false,false,'free','free-tags')$$,
 '22023','Free Test generation is limited to three topic tags.','free custom tags rejected');
select throws_ok($$select public.generate_test_from_blueprint('00000000-0000-0000-0000-000000035011','1',41)$$,
 '22023','Free Test generation is limited to 40 questions.','free saved size rejected');
select throws_ok($$select public.generate_updated_test(current_setting('quota.large'),'free-update')$$,
 'P0001','Free generation is limited to 40 questions. Create a shorter test instead.','free updated size rejected');
select is((select question_count from public.start_test_session(current_setting('quota.large'),'free-legacy')),
 40,'legacy launch preserves free prefix');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000035003',true);
select is((public.start_test_session_configured(current_setting('quota.large'),'expired-config',null)->>'question_count')::integer,
 40,'configured launch creates an independent free prefix after expiry');
select throws_ok($$select public.generate_test_from_blueprint('00000000-0000-0000-0000-000000035011','1',41)$$,
 '22023','Free Test generation is limited to 40 questions.','expired subscription uses free cap');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000035004',true);
select throws_ok($$select public.generate_test_from_blueprint('00000000-0000-0000-0000-000000035011','1',41)$$,
 '22023','Free Test generation is limited to 40 questions.','unpaid staff uses free cap');
reset role;
select * from finish();
rollback;
