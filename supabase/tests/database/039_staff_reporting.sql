begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users(id,email,aud,role)
select ('39000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,
  'staff-metrics-'||n||'@example.test','authenticated','authenticated'
from generate_series(1,3) n;
update public.profiles set role='admin' where user_id='39000000-0000-0000-0000-000000000001';
update public.profiles set role='owner' where user_id='39000000-0000-0000-0000-000000000003';
update public.profiles set created_at='2020-06-02 00:00:00Z',account_tier='premium'
  where user_id='39000000-0000-0000-0000-000000000002';

insert into public.test_ids(id,definition_id,mode,category,question_count,pool_timestamp,created_at,created_by,generation_status,topic_tags)
values
 ('METRICSTEST1','39000000-0000-0000-0000-000000000011','Test','Finance',2,'2020-06-02','2020-06-02 00:00Z','39000000-0000-0000-0000-000000000002','Ready',array['Budgeting','Budgeting','Risk']),
 ('METRICSTEST2','39000000-0000-0000-0000-000000000012','Test','Other',2,'2020-06-02','2020-06-03 00:00Z','39000000-0000-0000-0000-000000000002','Ready',array['Other']),
 ('METRICSQUIZ1','39000000-0000-0000-0000-000000000013','Quiz','Other',2,'2020-06-02','2020-06-02 00:00Z','39000000-0000-0000-0000-000000000002','Ready',array['Other']);
insert into public.test_sessions(id,test_definition_id,user_id,status,mode,question_count,idempotency_key,active_period_started_at,submitted_at)
values ('39000000-0000-0000-0000-000000000021','39000000-0000-0000-0000-000000000011','39000000-0000-0000-0000-000000000002',
 'submitted','Test',2,'staff-metrics',null,'2020-06-02 23:59:59Z');
insert into public.test_results(session_id,user_id,test_definition_id,total_questions,answered_questions,unanswered_questions,correct_answers,incorrect_answers,raw_score,percentage,scoring_rule_version,explanation_policy_version,active_duration_seconds,submitted_at)
select id,user_id,test_definition_id,2,2,0,1,1,1,50,'test','test',0,submitted_at from public.test_sessions
where id='39000000-0000-0000-0000-000000000021';
insert into public.questions(id,partition_key,question_type,question_text,options,correct_option_id,difficulty)
values
 ('39000000-0000-0000-0000-000000000031','Finance','Scenario','Staff metrics flagged','["A","B","C","D"]','A','Easy'),
 ('39000000-0000-0000-0000-000000000032','Finance','Scenario','Staff metrics minimum samples','["A","B","C","D"]','A','Easy'),
 ('39000000-0000-0000-0000-000000000033','Finance','Scenario','Staff metrics reports only','["A","B","C","D"]','A','Medium');

insert into private.personal_answer_evidence(user_id,question_id,source,source_key,answered_at,option_id,correct)
select '39000000-0000-0000-0000-000000000002',q,'search',n::text,
  case when n=21 then timestamptz '2020-06-03 00:00Z' else timestamptz '2020-06-02 00:00Z' end,
  case when n<=5 then 'A' when n<=13 then 'UNKNOWN' else 'B' end,n<=5
from (values ('39000000-0000-0000-0000-000000000031'::uuid,21),
 ('39000000-0000-0000-0000-000000000032'::uuid,19)) fixture(q,limit_count)
cross join lateral generate_series(1,limit_count) n;

insert into public.question_reports(entity_type,question_id,reporter_id,category,reason,status,description,idempotency_key,created_at)
select 'question','39000000-0000-0000-0000-000000000033','39000000-0000-0000-0000-000000000002',
 'other','other','open','Synthetic report threshold '||n,gen_random_uuid(),'2020-06-02 01:00:00Z'
from generate_series(1,3) n;

select ok(not has_function_privilege('anon','public.get_staff_reporting_summary(date,date)','EXECUTE'),'anonymous summary execute denied');
set local role authenticated;
select set_config('request.jwt.claim.sub','39000000-0000-0000-0000-000000000002',true);
select throws_ok($$select public.get_staff_reporting_summary('2020-06-02','2020-06-02')$$,'42501',null,'student cannot read aggregate metrics');
select throws_ok($$select * from public.list_staff_question_quality('2020-06-02','2020-06-02')$$,'42501',null,'student cannot retrieve question quality data');
select set_config('request.jwt.claim.sub','39000000-0000-0000-0000-000000000001',true);
select ok(public.get_staff_reporting_summary('2020-06-02','2020-06-02') @>
  '{"new_users":1,"active_users":1,"generated":1,"completed":1,"average_score":50,"top_categories":[{"label":"Finance","total":1}],"top_tags":[{"label":"Budgeting","total":1},{"label":"Risk","total":1}]}',
  'summary uses UTC cutoffs, distinct active users and tags, and Test-only results');
select ok(public.get_staff_reporting_summary('2020-06-04','2020-06-04') @>
  '{"generated":0,"completed":0,"average_score":null,"top_categories":[],"top_tags":[]}', 'empty summary does not invent a score');
select throws_ok($$select public.get_staff_reporting_summary('2020-06-03','2020-06-02')$$,'22023',null,'reversed date rejected');
select throws_ok($$select public.get_staff_reporting_summary('2018-06-03','2020-06-02')$$,'22023',null,'unbounded date range rejected');
select results_eq(
 $$select answered,correct,incorrect,unknown,flags from public.list_staff_question_quality('2020-06-02','2020-06-02')
   where question_id='39000000-0000-0000-0000-000000000031'$$,
 $$values (20::bigint,5::bigint,15::bigint,8::bigint,array['low_correct','high_unknown'])$$,
 'twenty graded samples at exact rate thresholds include I Don’t Know in misses');
select is((select cardinality(flags) from public.list_staff_question_quality('2020-06-02','2020-06-02')
 where question_id='39000000-0000-0000-0000-000000000032'),0,'19 graded samples cannot trigger rate flags');
select results_eq(
 $$select reports,open_reports,flags from public.list_staff_question_quality('2020-06-02','2020-06-02')
   where question_id='39000000-0000-0000-0000-000000000033'$$,
 $$values (3::bigint,3::bigint,array['report_volume'])$$, 'three open reports flag an unanswered question');
select is((select count(*) from public.list_staff_question_quality('2020-06-02','2020-06-02','reported',true)),2::bigint,'flagged-only hides the below-threshold row');
select is((select question_id from public.list_staff_question_quality('2020-06-02','2020-06-02','reported',true,3,'39000000-0000-0000-0000-000000000033',1)),
 '39000000-0000-0000-0000-000000000031'::uuid,'rank and id cursor advances without repeating the first page');
select set_config('request.jwt.claim.sub','39000000-0000-0000-0000-000000000003',true);
select is((select count(*) from public.list_staff_question_quality('2020-06-02','2020-06-02')),3::bigint,'owner can retrieve the same aggregate page');
select * from finish();
rollback;
