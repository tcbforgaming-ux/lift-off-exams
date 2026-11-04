begin;
create extension if not exists pgtap with schema extensions;
select plan(23);
create function pg_temp.fail_candidate_audit() returns trigger language plpgsql as $$
begin
  if new.reason='Synthetic audit failure' then raise exception 'Injected audit failure'; end if;
  return new;
end;
$$;
create trigger test_candidate_audit_failure before insert on public.admin_audit_logs
for each row execute function pg_temp.fail_candidate_audit();

insert into auth.users(id,email,aud,role)
values ('00000000-0000-0000-0000-000000016001','review-admin@example.test','authenticated','authenticated'),
       ('00000000-0000-0000-0000-000000016002','review-student@example.test','authenticated','authenticated');
update public.profiles set role='admin' where user_id='00000000-0000-0000-0000-000000016001';
insert into public.generated_question_candidates(id,performance_indicator,partition_keys,category,question_type,
question_text,options,correct_option_id,explanation,difficulty,tags,question_hash,raw_response)
values ('00000000-0000-0000-0000-000000016003','FI:016','["Finance"]','Financial Analysis',
'Fill In The Blank','Synthetic candidate review question?','["First","Second","Third","Fourth"]','A',
'Synthetic explanation','Easy',array['Financial Analysis'],'phase-c-review-fixture','{"secret_fixture":"never return"}');

select ok(not has_function_privilege('anon','public.get_review_candidate(uuid)','EXECUTE'),'anonymous detail denied');
select ok(not has_table_privilege('authenticated','public.generated_question_candidates','UPDATE'),'staff cannot forge approvals');
select ok(not has_table_privilege('authenticated','public.questions','INSERT'),'staff cannot bypass trusted publication');
select ok(has_table_privilege('service_role','public.generated_question_candidates','INSERT'),'importer insert remains authorized');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000016002',true);
select throws_ok($q$select public.list_review_candidates()$q$,'42501','Staff access required.','student queue denied');
select is((select count(*) from public.generated_question_candidates),0::bigint,'student direct reads denied');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000016001',true);
select is(jsonb_array_length(public.list_review_candidates('FI:016','Pending Review','Unchecked')),1,'staff can compose filters');
select ok(not(public.get_review_candidate('00000000-0000-0000-0000-000000016003')?'raw_response'),'detail omits provider payload');
select throws_ok($q$select public.review_candidate('00000000-0000-0000-0000-000000016003',0,'edit','Synthetic audit failure','fault-edit','{"question_text":"This edit must roll back?"}')$q$,'P0001','Injected audit failure','edit rolls back on audit failure');
select is(public.get_review_candidate('00000000-0000-0000-0000-000000016003')->>'question_text','Synthetic candidate review question?','failed edit keeps original text');
select throws_ok($q$select public.review_candidate('00000000-0000-0000-0000-000000016003',0,'approve','Synthetic audit failure','fault-approve')$q$,'P0001','Injected audit failure','approval rolls back on audit failure');
select is(public.get_review_candidate('00000000-0000-0000-0000-000000016003')->>'review_status','Pending Review','failed approval keeps pending status');
select throws_ok($q$select public.review_candidate('00000000-0000-0000-0000-000000016003',0,'edit','Invalid option test','bad','{"options":[]}')$q$,
'P0001','Exactly four non-empty options in A-D order are required.','invalid edit rejected');
select is(public.review_candidate('00000000-0000-0000-0000-000000016003',0,'reject','Needs revised wording','reject')->>'review_status','Rejected','rejection recorded');
select is(public.review_candidate('00000000-0000-0000-0000-000000016003',1,'edit','Clarify synthetic wording','edit','{"question_text":"Revised synthetic candidate question?"}')->>'review_status','Pending Review','rejected candidate can be revised');
select is(public.review_candidate('00000000-0000-0000-0000-000000016003',2,'approve','Reviewed revised wording','approve')->>'review_status','Approved','editor can approve exact revision');
select is(public.review_candidate('00000000-0000-0000-0000-000000016003',2,'approve','Reviewed revised wording','approve')->>'review_revision','3','approval retry does not advance revision');
select throws_ok($q$select public.publish_review_candidate('00000000-0000-0000-0000-000000016003',2,'Stale publication request')$q$,
'P0001','Candidate changed. Reload before publishing.','stale publication denied');
select throws_ok($q$select public.publish_review_candidate('00000000-0000-0000-0000-000000016003',3,'Synthetic audit failure')$q$,'P0001','Injected audit failure','publication rolls back on audit failure');
select ok((select d->>'review_status'='Approved' and d->>'published_question_id' is null from public.get_review_candidate('00000000-0000-0000-0000-000000016003') d),'failed publication retains approval and no link');
select is((select count(*) from public.questions where question_text='Revised synthetic candidate question?'),0::bigint,'failed publication leaves no question');
select lives_ok($q$select public.publish_review_candidate('00000000-0000-0000-0000-000000016003',3,'Publish reviewed content')$q$,'approved revision publishes');
select is(public.publish_review_candidate('00000000-0000-0000-0000-000000016003',3,'Publish reviewed content')::text,
public.get_review_candidate('00000000-0000-0000-0000-000000016003')->>'published_question_id','publication retry returns existing question');
rollback;
