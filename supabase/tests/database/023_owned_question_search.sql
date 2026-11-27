begin;
create extension if not exists pgtap with schema extensions;
select plan(10);
insert into auth.users(id,email,aud,role) values
 ('00000000-0000-0000-0000-000000023001','search-one@example.test','authenticated','authenticated'),
 ('00000000-0000-0000-0000-000000023002','search-two@example.test','authenticated','authenticated');
insert into public.questions(id,partition_key,question_type,question_text,options,correct_option_id,explanation,difficulty,tags,lifecycle_state)
values('00000000-0000-0000-0000-000000023010','Finance','Scenario','Unique 100% review fixture?',
 '[{"id":"A","text":"A"},{"id":"B","text":"B"},{"id":"C","text":"C"},{"id":"D","text":"D"}]','A','Protected review fixture','Easy',array['Finance'],'Active');
select ok(not has_table_privilege('authenticated','public.user_question_status','UPDATE'),'browser cannot forge status');
select ok(not has_function_privilege('anon','public.search_my_question_bank(text,text,text,text,text,uuid)','EXECUTE'),'anonymous search denied');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000023001',true);
select is(public.search_my_question_bank('100% review')->0->>'status','Unseen','literal keyword finds unseen question');
select ok(not (public.search_my_question_bank('100% review')->0?'question_text'),'search does not spoil unseen text');
select throws_ok($q$select public.review_my_bank_question('00000000-0000-0000-0000-000000023010','attempt')$q$,'P0001','Acknowledge the unseen-question warning before opening.','opening unseen requires acknowledgement');
select is(public.review_my_bank_question('00000000-0000-0000-0000-000000023010','attempt',true)->>'correct_option_id',null::text,'attempt does not reveal correct answer');
select is(public.review_my_bank_question('00000000-0000-0000-0000-000000023010','grade',false,'A')->>'correct','true','trusted grading accepts correct answer');
select is(public.search_my_question_bank('100% review','','','Easy','Answered correctly')->0->>'seen_count','1','owned graded status and seen count persist');
select is(public.review_my_bank_question('00000000-0000-0000-0000-000000023010','view')->>'explanation',null::text,'free direct review omits explanation');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000023002',true);
select is(public.search_my_question_bank('100% review')->0->>'status','Unseen','another user cannot see first user status');
reset role;
select * from finish();
rollback;
