begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users(id,email,aud,role) values
 ('43000000-0000-0000-0000-000000000001','followup-admin@example.test','authenticated','authenticated'),
 ('43000000-0000-0000-0000-000000000002','followup-user@example.test','authenticated','authenticated');
update public.profiles set role='admin',account_tier='premium' where user_id='43000000-0000-0000-0000-000000000001';
insert into public.questions(id,partition_key,question_type,question_text,options,correct_option_id,explanation,difficulty,tags)
select ('43000000-0000-0000-0000-00000000001'||n)::uuid,'Finance','Scenario',
 case n when 1 then 'Which inventory procedure should a regional retailer use to reconcile monthly stock records before submitting the financial report?'
 else 'Distinct stock question '||n end,
 '["A","B","C","D"]','A','Known answer explanation','Easy',array['Followup Tag'] from generate_series(1,2)n;
insert into public.question_reports(id,entity_type,question_id,reporter_id,category,reason,status,description,idempotency_key)
select ('43000000-0000-0001-0000-'||lpad(n::text,12,'0'))::uuid,'question',
 case when n<=3 then '43000000-0000-0000-0000-000000000011'::uuid else '43000000-0000-0000-0000-000000000012'::uuid end,
 '43000000-0000-0000-0000-000000000002','other','other','open','Synthetic priority report '||n,gen_random_uuid()
from generate_series(1,5)n;
insert into public.generated_question_candidates(id,performance_indicator,partition_keys,category,question_type,
 question_text,options,correct_option_id,explanation,difficulty,tags)
select ('43000000-0000-0000-0002-'||lpad(n::text,12,'0'))::uuid,'FI:043','["Finance"]','Finance','Scenario',
 'Which inventory procedure should a regional retailer use to reconcile monthly stock records before submitting the financial statement? Variation '||n,
 '["A","B","C","D"]','A','Known answer explanation','Easy',array['Followup Tag'] from generate_series(1,27)n;

set local role authenticated;
select set_config('request.jwt.claim.sub','43000000-0000-0000-0000-000000000002',true);
select throws_ok('select public.get_report_priority_config()','42501',null,'student priority configuration denied');
select throws_ok('select public.list_priority_reports()','42501',null,'student priority report data denied');
select throws_ok('select public.list_candidate_near_matches()','42501',null,'student near-match queue denied');
select throws_ok($$select public.set_staff_tag_retired('Followup Tag',0,true,'Unauthorized retirement')$$,'42501',null,'student cannot retire referenced tag');
select set_config('request.jwt.claim.sub','43000000-0000-0000-0000-000000000001',true);
select is(public.list_priority_reports()->0->>'priority_rank','3','highest open question report count sorts first');
select is(public.list_priority_reports()->0->>'high_priority','true','three is high priority at default threshold');
select is(public.list_priority_reports()->4->>'high_priority','false','two is below priority threshold');
select is(public.set_report_priority_config(2,0,'Adjust fixture threshold')->>'threshold','2','staff threshold is configurable');
select is(public.list_priority_reports()->4->>'high_priority','true','new threshold changes report queue flags');
select is(public.act_on_question_report('43000000-0000-0001-0000-000000000001',1,'valid','Valid finding','We are reviewing your concern.','43000000-0000-0000-0000-000000000021')->>'status',
 'in_review','Valid retains open correction work');
select is(public.act_on_question_report('43000000-0000-0001-0000-000000000001',1,'valid','Valid finding','We are reviewing your concern.','43000000-0000-0000-0000-000000000021')->>'version',
 '2','same logical disposition retry returns original result');
select throws_ok($$select public.act_on_question_report('43000000-0000-0001-0000-000000000001',1,'spam','Competing finding','Your report was reviewed.','43000000-0000-0000-0000-000000000022')$$,
 'P0001',null,'competing report decision cannot use stale version');
select is(public.act_on_question_report('43000000-0000-0001-0000-000000000001',2,'fixed','Issue corrected','Thank you for the report.','43000000-0000-0000-0000-000000000023')->>'status',
 'resolved','Fixed resolves report');
select is(public.list_priority_reports()->0->>'priority_rank','2','closed report no longer counts in open priority');
select is(jsonb_array_length(public.list_candidate_near_matches()),26,'near-match queue returns one bounded lookahead');
create temp table queue_page as select r from jsonb_array_elements(public.list_candidate_near_matches()) with ordinality x(r,n) where n=25;
select is(jsonb_array_length(public.list_candidate_near_matches(
 (select (r->>'created_at')::timestamptz from queue_page),(select (r->>'id')::uuid from queue_page))),2,'near-match cursor reaches remaining candidates');
select public.review_candidate('43000000-0000-0000-0002-000000000001',0,'approve','Approve fixture question','approve-before-edit');
select public.decide_candidate_similarity('43000000-0000-0000-0002-000000000001',1,
 public.get_candidate_similarity('43000000-0000-0000-0002-000000000001')->>'basis','keep','Intentional similar example','43000000-0000-0000-0000-000000000024');
select public.review_candidate('43000000-0000-0000-0002-000000000001',1,'edit','Revise explanation after review','edit-after-keep','{"explanation":"Revised explanation for the fixture."}');
select public.review_candidate('43000000-0000-0000-0002-000000000001',2,'approve','Approve changed explanation','approve-after-edit');
select throws_ok($$select public.publish_review_candidate('43000000-0000-0000-0002-000000000001',3,'Attempt old duplicate review')$$,
 'P0001','Review the current near-duplicate matches before publication.','editing the content invalidates a prior keep decision');

create temp table reference_blueprint as select public.create_staff_blueprint_draft('Referenced tag retirement','Finance','State','1',1,
 '{"schema_version":1,"strata":[{"id":"tagged","count":1,"tags":["Followup Tag"]}]}','Retirement fixture',null,'{}') id;
select public.activate_staff_blueprint((select id from reference_blueprint),'Activate fixture');
create temp table saved_test as select * from public.generate_test_from_blueprint((select id from reference_blueprint),'1',1,'retirement-fixture','retirement-fixture');
create temp table saved_members as select q.* from public.test_definition_questions q join saved_test s on s.test_definition_id=q.test_definition_id;
create temp table completed_reference as select * from public.start_test_session((select test_id from saved_test),'tag-history');
select public.submit_test_session((select session_id from completed_reference),1);
reset role;
create temp table recorded_items as select i.* from public.test_result_items i join completed_reference s on s.session_id=i.session_id;
set local role authenticated;
select is(public.set_staff_tag_retired('Followup Tag',0,true,'Retire referenced tag')->>'retired','true','staff can retire a referenced label');
select is(public.get_selectable_topic_tags(array['Followup Tag']),array[]::text[],'retired label is hidden from new custom choices');
select is((select success from public.generate_test_from_blueprint((select id from reference_blueprint),'1',1,'retirement-fixture','retirement-second')),
 true,'saved blueprint rules still generate without breaking references');
select results_eq($$select q.* from public.test_definition_questions q join saved_test s on s.test_definition_id=q.test_definition_id$$,
 $$select * from saved_members$$,'retirement preserves exact ordered saved Test membership');
reset role;
select results_eq($$select i.* from public.test_result_items i join completed_reference s on s.session_id=i.session_id$$,
 $$select * from recorded_items$$,'retirement preserves completed question and tag snapshots');
set local role authenticated;
select is(public.set_staff_tag_retired('Followup Tag',2,false,'Restore referenced tag')->>'retired','false','restoration succeeds');
select is(public.get_selectable_topic_tags(array['Followup Tag']),array['Followup Tag'],'restoration re-enables selection');
select is(public.act_on_question_report('43000000-0000-0001-0000-000000000002',1,'work_in_progress','Correction underway','Work on your report is in progress.','43000000-0000-0000-0000-000000000025')->>'status','in_review','Work In Progress keeps the correction open');
select is(public.act_on_question_report('43000000-0000-0001-0000-000000000003',1,'invalid','No reproducible issue','Your report was reviewed.','43000000-0000-0000-0000-000000000026')->>'status','rejected','Invalid closes without changing the question');
select is(public.act_on_question_report('43000000-0000-0001-0000-000000000004',1,'spam','Misuse confirmed','Please use the reporting system for question issues.','43000000-0000-0000-0000-000000000027')->>'status','rejected','Spam closes and queues a misuse notice');
reset role;
select is((select count(*) from private.moderation_mail where user_id='43000000-0000-0000-0000-000000000002'),5::bigint,
 'only report transitions queue notices and retries do not duplicate');
select * from finish();
rollback;
