begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users(id,email,aud,role) values
 ('00000000-0000-0000-0000-000000024001','answer-a@example.test','authenticated','authenticated'),
 ('00000000-0000-0000-0000-000000024002','answer-b@example.test','authenticated','authenticated');
insert into public.questions(id,partition_key,question_type,question_text,options,correct_option_id,explanation,difficulty,lifecycle_state)
select ('00000000-0000-0000-0000-000000024'||lpad(n::text,3,'0'))::uuid,'Finance','Scenario','Evidence fixture '||n,
 '[{"id":"A","text":"A"},{"id":"B","text":"B"},{"id":"C","text":"C"},{"id":"D","text":"D"}]','A','Protected fixture','Easy',
 case when n=40 then 'Retired' else 'Active' end from generate_series(10,40) n;
insert into public.user_question_status(user_id,question_id,status,seen_count,legacy_answer_unverified)
values('00000000-0000-0000-0000-000000024001','00000000-0000-0000-0000-000000024011','Answered incorrectly',1,true);
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000024001',true);
select is(public.search_my_question_bank('Evidence fixture 11')->0->>'status','Seen','unproved legacy incorrect is not a recorded answer');
select is(public.search_my_question_bank('Evidence fixture 11')->0->>'legacy_answer_unverified','true','legacy uncertainty disclosed');
select is(jsonb_array_length(public.search_my_question_bank('Evidence fixture')),26,'bounded lookahead');
select is(jsonb_array_length(public.search_my_question_bank('Evidence fixture',p_after=>'00000000-0000-0000-0000-000000024034')),5,'next page is ordered and excludes retired item');
select public.review_my_bank_question('00000000-0000-0000-0000-000000024010','attempt',true);
select is(public.grade_my_bank_question('00000000-0000-0000-0000-000000024010','A','00000000-0000-0000-0000-000000024101')->>'correct','true','right answer recorded');
select is(public.grade_my_bank_question('00000000-0000-0000-0000-000000024010','B','00000000-0000-0000-0000-000000024102')->>'correct','false','wrong choice recorded');
select public.grade_my_bank_question('00000000-0000-0000-0000-000000024010','A','00000000-0000-0000-0000-000000024101');
select is(public.search_my_question_bank('Evidence fixture 10')->0->>'latest_option_id','B','old retry does not replace latest');
select ok((select item @> '{"ever_correct":true,"ever_incorrect":true}' from jsonb_array_elements(public.search_my_question_bank('Evidence fixture 10')) item),'correct then incorrect retains both');
select public.grade_my_bank_question('00000000-0000-0000-0000-000000024010','UNKNOWN','00000000-0000-0000-0000-000000024103');
select is(public.search_my_question_bank('Evidence fixture 10')->0->>'latest_option_id','UNKNOWN','unknown identifiable');
select public.grade_my_bank_question('00000000-0000-0000-0000-000000024010','A','00000000-0000-0000-0000-000000024104');
select public.review_my_bank_question('00000000-0000-0000-0000-000000024010','view');
select ok((select item @> '{"latest_option_id":"A","ever_correct":true,"ever_incorrect":true}' from jsonb_array_elements(public.search_my_question_bank('Evidence fixture 10')) item),'incorrect then correct retains both and view preserves answer');
reset role;
select is((select count(*)::integer from private.personal_answer_evidence where source='search'),4,'only four distinct grades persisted');
insert into public.test_ids(id,definition_id,mode,category,difficulties,topic_tags,question_count,pool_timestamp)
values('EVIDENCE0001','00000000-0000-0000-0000-000000024200','Test','Finance',array['Easy'],'{}',2,now());
insert into public.test_sessions(id,test_definition_id,user_id,status,mode,question_count,idempotency_key,active_period_started_at,submitted_at)
values('00000000-0000-0000-0000-000000024201','00000000-0000-0000-0000-000000024200','00000000-0000-0000-0000-000000024001','submitted','Test',2,'evidence-test',null,now()-interval '1 day');
insert into public.test_results(session_id,user_id,test_definition_id,total_questions,answered_questions,unanswered_questions,correct_answers,incorrect_answers,raw_score,percentage,scoring_rule_version,explanation_policy_version,active_duration_seconds,submitted_at)
select id,user_id,test_definition_id,2,1,1,1,1,1,50,'single-choice-v1','stripe-entitlement-v1',0,submitted_at
from public.test_sessions where id='00000000-0000-0000-0000-000000024201';
insert into public.test_result_items(session_id,position,question_id,question_type,question_text,options,difficulty,selected_option_id,correct_option_id,is_correct)
select '00000000-0000-0000-0000-000000024201',row_number() over(order by id),id,question_type,question_text,options,difficulty,
 case when question_text='Evidence fixture 11' then 'A' end,'A',question_text='Evidence fixture 11'
from public.questions where question_text in ('Evidence fixture 10','Evidence fixture 11');
delete from private.personal_answer_evidence where source='test' and source_key='00000000-0000-0000-0000-000000024201';
select private.backfill_test_answer_evidence();
select private.backfill_test_answer_evidence();
select is((select count(*)::integer from private.personal_answer_evidence where source='test' and source_key='00000000-0000-0000-0000-000000024201'),1,'repeated backfill records answer once and no skip');
set local role authenticated;
select is(public.search_my_question_bank('Evidence fixture 11')->0->>'status','Answered correctly','immutable snapshot corrects misleading legacy status');
select is(public.search_my_question_bank('Evidence fixture 10')->0->>'latest_option_id','A','skipped snapshot does not overwrite latest answer');
reset role;
insert into public.subscriptions(user_id,status,current_period_end)
values('00000000-0000-0000-0000-000000024001','active',now()+interval '1 day');
set local role authenticated;
select is(public.grade_my_bank_question('00000000-0000-0000-0000-000000024010','A','00000000-0000-0000-0000-000000024104')->>'explanation',
 'Protected fixture','premium retry uses trusted entitlement');
reset role;
update public.subscriptions set current_period_end=now()-interval '1 day' where user_id='00000000-0000-0000-0000-000000024001';
set local role authenticated;
select is(public.grade_my_bank_question('00000000-0000-0000-0000-000000024010','A','00000000-0000-0000-0000-000000024104')->>'explanation',
 null::text,'expired subscription cannot replay protected explanation');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000024002',true);
select ok((select item @> '{"status":"Unseen","ever_correct":false,"ever_incorrect":false}'
 from jsonb_array_elements(public.search_my_question_bank('Evidence fixture 10')) item),'other user cannot see lifetime evidence');
reset role;
select * from finish();
rollback;
