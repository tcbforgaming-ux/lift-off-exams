begin;
create extension if not exists pgtap with schema extensions;
select plan(13);
insert into auth.users(id,email,aud,role) values
 ('40000000-0000-0000-0000-000000000001','duplicate-admin@example.test','authenticated','authenticated'),
 ('40000000-0000-0000-0000-000000000002','duplicate-student@example.test','authenticated','authenticated');
update public.profiles set role='admin' where user_id='40000000-0000-0000-0000-000000000001';

set local role service_role;
insert into public.questions(id,partition_key,question_type,question_text,options,correct_option_id,difficulty,tags)
values ('40000000-0000-0000-0000-000000000011','Finance','Scenario',
 'Which inventory procedure should a regional retailer use to reconcile the monthly stock records before submitting the financial report?',
 '["A","B","C","D"]','A','Easy',array['Financial Analysis']);
reset role;

insert into public.generated_question_candidates(id,performance_indicator,partition_keys,category,question_type,question_text,
 options,correct_option_id,explanation,difficulty,tags)
select ('40000000-0000-0000-0000-00000000002'||n)::uuid,'FI:040','["Finance"]','Finance','Scenario',prompt,
 '["A","B","C","D"]','A','Synthetic example.','Easy',array['Financial Analysis']
from (values
 (1,'Which inventory procedure should a regional retailer use to reconcile the monthly stock records before submitting the financial statement?'),
 (2,'WHAT IS THE TIME VALUE OF MONEY?'),
 (3,' Which inventory procedure should a regional retailer use to reconcile the monthly stock records before submitting the financial report? '),
 (4,'Which inventory procedure should a regional retailer use to reconcile the monthly stock records before submitting the financial report today?'),
 (5,'Which inventory procedure should a regional retailer use to reconcile the monthly stock records before submitting the financial report tomorrow?')
) x(n,prompt);

set local role authenticated;
select set_config('request.jwt.claim.sub','40000000-0000-0000-0000-000000000002',true);
select throws_ok($$select public.get_candidate_similarity('40000000-0000-0000-0000-000000000021')$$,'42501',null,'student cannot read similarity evidence');
select throws_ok($$select public.decide_candidate_similarity('40000000-0000-0000-0000-000000000021',0,'bad','keep','Reason provided','40000000-0000-0000-0000-000000000099')$$,'42501',null,'student cannot decide');
select set_config('request.jwt.claim.sub','40000000-0000-0000-0000-000000000001',true);
select ok((public.get_candidate_similarity('40000000-0000-0000-0000-000000000021')->'matches'->0->>'score')::numeric>=0.8,'known near match is shown');
select is(jsonb_array_length(public.get_candidate_similarity('40000000-0000-0000-0000-000000000022')->'matches'),0,'unrelated candidate is not flagged');
select is(jsonb_array_length(public.get_candidate_similarity('40000000-0000-0000-0000-000000000023')->'matches'),0,'exact duplicate is not a near override');
do $$begin
  for i in 1..3 loop
    perform public.review_candidate(('40000000-0000-0000-0000-00000000002'||i)::uuid,0,'approve','Content reviewed','approval-'||i);
  end loop;
end$$;
select throws_ok($$select public.publish_review_candidate('40000000-0000-0000-0000-000000000021',1,'Publish without review')$$,'P0001','Review the current near-duplicate matches before publication.','near candidate cannot bypass the review');
select throws_ok($$select public.publish_review_candidate('40000000-0000-0000-0000-000000000023',1,'Publish exact duplicate')$$,'P0001','A question with identical text already exists.','exact duplicate remains blocked');
select lives_ok($$select public.publish_review_candidate('40000000-0000-0000-0000-000000000022',1,'Publish unrelated text')$$,'unrelated candidate may publish');

create temporary table similarity_requests as
select n,('40000000-0000-0000-0000-00000000002'||n)::uuid id,
 public.get_candidate_similarity(('40000000-0000-0000-0000-00000000002'||n)::uuid)->>'basis' basis
from unnest(array[1,4,5]) n;
select is((select public.decide_candidate_similarity(id,0,basis,'edit','Revise this candidate','40000000-0000-0000-0000-000000000094') from similarity_requests where n=4),'edit','staff may request revision');
select is(public.get_review_candidate('40000000-0000-0000-0000-000000000024')->>'review_status','Needs Edit','review action changes candidate status');
select is((select public.decide_candidate_similarity(id,0,basis,'cancel','Cancel this candidate','40000000-0000-0000-0000-000000000095') from similarity_requests where n=5),'cancel','staff may cancel candidate');
do $$begin
  perform public.decide_candidate_similarity(id,1,basis,'keep','Intentional variation','40000000-0000-0000-0000-000000000091') from similarity_requests where n=1;
end$$;
select is((select public.decide_candidate_similarity(id,1,basis,'keep','Intentional variation','40000000-0000-0000-0000-000000000091') from similarity_requests where n=1),'keep','lost response retry returns the same decision');
select lives_ok($$select public.publish_review_candidate('40000000-0000-0000-0000-000000000021',1,'Publish audited variation')$$,'kept candidate may publish');
reset role;
select * from finish();
rollback;
