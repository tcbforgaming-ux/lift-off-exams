begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users(id,email,aud,role)
select ('00000000-0000-0000-0000-00000003700'||n)::uuid,'focus-'||n||'@example.test','authenticated','authenticated'
from generate_series(1,4) n;
update public.profiles set account_tier='premium'
where user_id in ('00000000-0000-0000-0000-000000037001','00000000-0000-0000-0000-000000037002',
  '00000000-0000-0000-0000-000000037004');
select ok(not has_function_privilege('anon','public.get_infinite_focus_setup()','execute'),'anonymous setup is denied');
select ok(not has_function_privilege('authenticated','private.rank_infinite_weak_topics(uuid)','execute'),'the actor parameter is not exposed');

create temporary table focus_fixture(n int primary key,id uuid);
insert into focus_fixture select n,('37000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid
from generate_series(1,108) n;
insert into public.questions(id,partition_key,question_type,question_text,options,correct_option_id,difficulty,tags,lifecycle_state,explanation)
select id,case when n>106 then 'Focus standard fallback' when n>100 then 'Focus target' else 'Focus evidence' end,'Scenario','Focus '||n,
  '["A","B","C","D"]','A','Medium',
  case when n in (1,8,9) then array['Retagged']
    when n between 2 and 7 or n in (101,103,104,106) then array['Budgeting']
    when n between 11 and 18 or n=102 then array['Communication']
    when n between 21 and 27 then array['Lower score, too little evidence']
    when n between 31 and 40 then array['Exactly at 70%']
    when n between 41 and 48 then array['Other user only'] else array['Standard only'] end,
  case when n in (104,106) then 'Retired' else 'Active' end,'Protected explanation'
from focus_fixture where n in (1,8,9) or n between 2 and 7 or n between 11 and 18
  or n between 21 and 27 or n between 31 and 48 or n between 101 and 108;

-- Use result snapshot writes to exercise the actual Test/Quiz evidence trigger.
insert into public.test_ids(id,definition_id,mode,category,question_count,pool_timestamp)
values ('FOCUSTEST001','00000000-0000-0000-0000-000000037011','Test','Finance',2,now()),
 ('FOCUSQUIZ001','00000000-0000-0000-0000-000000037012','Quiz','Finance',1,now());
insert into public.test_sessions(id,test_definition_id,user_id,status,mode,question_count,idempotency_key,active_period_started_at,submitted_at)
select ('00000000-0000-0000-0000-00000003702'||n)::uuid,definition_id,
 '00000000-0000-0000-0000-000000037001','submitted',mode,question_count,'focus-source-'||n,null,now()-interval '1 day'
from public.test_ids cross join lateral (select case mode when 'Test' then 1 else 2 end n) x
where id in ('FOCUSTEST001','FOCUSQUIZ001');
insert into public.test_results(session_id,user_id,test_definition_id,total_questions,answered_questions,unanswered_questions,correct_answers,incorrect_answers,raw_score,percentage,scoring_rule_version,explanation_policy_version,active_duration_seconds,submitted_at)
select id,user_id,test_definition_id,question_count,1,question_count-1,1,question_count-1,1,100/question_count,
 'single-choice-v1','stripe-entitlement-v1',0,submitted_at
from public.test_sessions where idempotency_key like 'focus-source-%';
insert into public.test_result_items(session_id,position,question_id,question_type,question_text,options,difficulty,tags,selected_option_id,correct_option_id,is_correct)
select '00000000-0000-0000-0000-000000037021',case when n=1 then 1 else 2 end,id,'Scenario','Saved Test',
 '["A","B","C","D"]','Medium',array['Budgeting','Budgeting','Overlap'],case when n=1 then 'A' end,'A',n=1
from focus_fixture where n in (1,9);
insert into private.personal_answer_evidence(user_id,question_id,source,source_key,answered_at,option_id,correct)
select '00000000-0000-0000-0000-000000037001',id,
 case n%3 when 0 then 'search' when 1 then 'hardcore' else 'infinite' end,'fixture',now()-interval '1 day',
 case when n=3 then 'UNKNOWN' when n in (2,11,12,13,14) or n between 31 and 37 then 'A' else 'B' end,
 n in (2,11,12,13,14) or n between 31 and 37
from focus_fixture where n between 2 and 7 or n between 11 and 18 or n between 21 and 27 or n between 31 and 40;
-- Two older misses from other modes and an unknown legacy status do not add samples.
insert into private.personal_answer_evidence(user_id,question_id,source,source_key,answered_at,option_id,correct)
select '00000000-0000-0000-0000-000000037001',id,'test','older',now()-interval '2 days','B',false
from focus_fixture where n in (1,2);
insert into public.user_question_status(user_id,question_id,status,seen_count,legacy_answer_unverified)
select '00000000-0000-0000-0000-000000037001',id,'Answered incorrectly',1,true
from focus_fixture where n in (8,101);
insert into public.user_question_status(user_id,question_id,status,seen_count)
select '00000000-0000-0000-0000-000000037004',id,'Seen',1 from focus_fixture where n=107;
insert into private.personal_answer_evidence(user_id,question_id,source,source_key,answered_at,option_id,correct)
select '00000000-0000-0000-0000-000000037002',id,'search','other',now(),'B',false
from focus_fixture where n between 41 and 48 or n=103;
select is((select array_agg(topic) from private.rank_infinite_weak_topics('00000000-0000-0000-0000-000000037001')),
 array['Communication'],'seven distinct answers, skipped and legacy do not qualify; 70% itself is not weak');
select is((select focus_tags from private.personal_answer_evidence
 where source_key='00000000-0000-0000-0000-000000037021'),array['Budgeting','Budgeting','Overlap'],'Test uses its immutable tags');
select is((select count(*) from private.personal_answer_evidence where source_key='00000000-0000-0000-0000-000000037021'),1::bigint,'skipped Test creates no evidence');
insert into public.test_result_items(session_id,position,question_id,question_type,question_text,options,difficulty,tags,selected_option_id,correct_option_id,is_correct)
select '00000000-0000-0000-0000-000000037022',1,id,'Scenario','Saved Quiz','["A","B","C","D"]','Medium',
 array['Budgeting','Overlap'],'A','A',true from focus_fixture where n=8;
select is((select focus_tags from private.personal_answer_evidence
 where source_key='00000000-0000-0000-0000-000000037022'),array['Budgeting','Overlap'],'Quiz uses its immutable tags');
select results_eq($$select * from private.rank_infinite_weak_topics('00000000-0000-0000-0000-000000037001')$$,
 $$values ('Budgeting'::text,8::bigint,3::bigint),('Communication'::text,8::bigint,4::bigint)$$,
 'exact threshold, wrong and uncertainty, repeats, duplicate tags, cross-mode and other-owner isolation');

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000037003',true);
select ok(public.get_infinite_focus_setup() @> '{"eligible":false,"topics":[]}','free account cannot view focus ranks');
select throws_ok($$select public.start_infinite_run_focused(gen_random_uuid())$$,'42501',null,'free focused launch denied');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000037004',true);
select ok(public.get_infinite_focus_setup() @> '{"eligible":true,"topics":[]}','paid account without outcomes has insufficient data');
select throws_ok($$select public.start_infinite_run_focused(gen_random_uuid(),'Focus target')$$,
 '22023','Insufficient Data. Select Standard Infinite Run or answer more questions.','direct focused launch cannot bypass the sample rule');
select ok(public.start_infinite_run(gen_random_uuid(),'Focus standard fallback')
 @> '{"mode":"standard","question":{"text":"Focus 108"}}','standard with insufficient evidence prioritizes unseen candidates');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000037001',true);
select ok(public.get_infinite_focus_setup() @> '{"eligible":true,"topics":[{"topic":"Budgeting","answered":8,"correct":3}]}','setup shows owned scores');
select throws_ok($$select public.start_infinite_run_focused(gen_random_uuid(),'No focus inventory')$$,
 '22023',null,'setup rejects category without a focused candidate');
select set_config('focus.launch','00000000-0000-0000-0000-000000037030',true);
select set_config('focus.run',public.start_infinite_run_focused(current_setting('focus.launch')::uuid,'Focus target')::text,true);
select ok(current_setting('focus.run')::jsonb @> '{"mode":"weak","selection_mode":"weak","focus_topics":["Budgeting","Communication"],"question":{"text":"Focus 103"}}',
 'launch chooses unseen strongest priority and ignores other user exposure and retired inventory');
select is(public.start_infinite_run_focused(current_setting('focus.launch')::uuid,'Focus target'),
 current_setting('focus.run')::jsonb,'focused launch retry returns saved mode and question');
select throws_ok($$select public.start_infinite_run(current_setting('focus.launch')::uuid,'Focus target')$$,
 '22023',null,'same request cannot silently switch launch mode');
select set_config('focus.id',current_setting('focus.run')::jsonb->>'id',true);
select ok(not (current_setting('focus.run')::jsonb->'question' ?| array['answer','explanation','focus_tags']),'live focused payload is sanitized');
select set_config('focus.advance',gen_random_uuid()::text,true);
select set_config('focus.next',public.advance_infinite_run(current_setting('focus.id')::uuid,1,current_setting('focus.advance')::uuid,'UNKNOWN')::text,true);
select ok(current_setting('focus.next')::jsonb @> '{"answered":1,"uncertain":1,"selection_mode":"weak","question":{"text":"Focus 102"}}',
 'next question is unseen in second weak topic before repeats in strongest priority');
select is(public.advance_infinite_run(current_setting('focus.id')::uuid,1,current_setting('focus.advance')::uuid,'UNKNOWN'),
 current_setting('focus.next')::jsonb,'advance retry does not save again');
select ok(public.get_infinite_run(current_setting('focus.id')::uuid) @> '{"mode":"weak","question":{"text":"Focus 102"}}','reopen restores mode and question');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000037002',true);
select throws_ok($$select public.get_infinite_run(current_setting('focus.id')::uuid)$$,'42501',null,'cannot read another user focused run');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000037001',true);

reset role;
-- Correct recent outcomes change the setup recommendation, not a launched run.
insert into private.personal_answer_evidence(user_id,question_id,source,source_key,answered_at,option_id,correct,focus_tags)
select '00000000-0000-0000-0000-000000037001',id,'search','later',clock_timestamp(),'A',true,array['Budgeting']
from focus_fixture where n between 1 and 8;
update public.questions set lifecycle_state='Retired' where question_text in ('Focus 101','Focus 102','Focus 103');
set local role authenticated;
select ok(not ((public.get_infinite_focus_setup()->'topics') @> '[{"topic":"Budgeting"}]'),'setup sees latest new history');
select ok(public.advance_infinite_run(current_setting('focus.id')::uuid,2,gen_random_uuid(),'A')
 @> '{"mode":"weak","selection_mode":"standard","focus_topics":["Budgeting","Communication"],"question":{"text":"Focus 105"},"finished_at":null}',
 'depleted focus pool visibly falls back without losing settings');
reset role;
update public.questions set lifecycle_state='Active' where question_text='Focus 106';
set local role authenticated;
select ok(public.advance_infinite_run(current_setting('focus.id')::uuid,3,gen_random_uuid(),'A')
 @> '{"mode":"weak","selection_mode":"weak","question":{"text":"Focus 106"}}','replenished focused inventory resumes without reranking');
select ok(public.start_infinite_run(gen_random_uuid(),'Focus target') @> '{"mode":"standard","focus_topics":[]}','Standard is still an explicit independent mode');
reset role;
select is((select focus_tags from private.personal_answer_evidence where source='infinite' and source_key=current_setting('focus.id')||':1'),
 array['Budgeting'],'committed Infinite evidence retains its served tag snapshot');
update private.personal_answer_evidence e set focus_tags=array['Communication','A same accuracy']
from focus_fixture f where e.question_id=f.id and f.n between 11 and 18;
select is((select topic from private.rank_infinite_weak_topics('00000000-0000-0000-0000-000000037001') limit 1),
 'A same accuracy','ties use stable ascending topic name');
set local role authenticated;
select set_config('focus.hardcore',public.start_hardcore(gen_random_uuid())->>'id',true);
reset role;
select set_config('focus.hardcore_tags',(select question->>'focus_tags' from private.hardcore_runs
  where id=current_setting('focus.hardcore')::uuid),true);
update public.questions set tags=array['Changed after Hardcore served the question']
where id=(select (question->>'id')::uuid from private.hardcore_runs where id=current_setting('focus.hardcore')::uuid);
set local role authenticated;
select lives_ok($$select public.advance_hardcore(current_setting('focus.hardcore')::uuid,1,gen_random_uuid(),'B')$$,
  'a real committed Hardcore answer records evidence');
reset role;
select is((select to_jsonb(focus_tags) from private.personal_answer_evidence where source='hardcore'
   and source_key=current_setting('focus.hardcore')||':1'),current_setting('focus.hardcore_tags')::jsonb,
  'Hardcore preserves served tags even if they were edited before grading');
select * from finish();
rollback;
