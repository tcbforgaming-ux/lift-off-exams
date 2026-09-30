begin;

create extension if not exists pgtap with schema extensions;

select plan(42);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'questions', 'questions table exists');
select has_table('public', 'test_ids', 'test_ids table exists');
select has_table('public', 'question_reports', 'question_reports table exists');
select has_table('public', 'question_lifecycle_events', 'question_lifecycle_events table exists');
select has_table('public', 'user_active_sessions', 'user_active_sessions table exists');
select has_table('public', 'billing_customers', 'billing_customers table exists');
select has_table('public', 'subscriptions', 'subscriptions table exists');
select has_table('public', 'teams', 'teams table exists');
select has_table('public', 'team_assignments', 'team_assignments table exists');
select has_table('public', 'generation_queue_v3', 'generation_queue_v3 table exists');
select has_table('public', 'deca_batch_jobs', 'deca_batch_jobs table exists');
select has_table('public', 'generated_question_candidates', 'generated_question_candidates table exists');
select has_table('public', 'generation_import_receipts', 'generation_import_receipts table exists');

select ok(
  to_regprocedure('public.build_deca_batch_jsonl(integer)') is not null,
  'build_deca_batch_jsonl(integer) contract exists'
);

select ok(
  to_regprocedure('public.insert_generated_questions(text,jsonb)') is not null,
  'insert_generated_questions(text,jsonb) contract exists'
);

select ok(
  to_regprocedure('public.insert_generated_questions(uuid,jsonb,text)') is not null,
  'insert_generated_questions(uuid,jsonb,text) contract exists'
);

select ok(
  to_regprocedure('public.publish_generated_question(uuid)') is not null,
  'publish_generated_question(uuid) contract exists'
);

select ok(
  to_regprocedure('public.bootstrap_initial_owner(uuid,text)') is not null,
  'bootstrap_initial_owner(uuid,text) contract exists'
);

select ok(
  to_regprocedure('public.set_user_platform_role(uuid,text,text,uuid)') is not null,
  'set_user_platform_role(uuid,text,text,uuid) contract exists'
);

select ok(
  to_regprocedure('public.initiate_owner_removal_vote(uuid,text,timestamp with time zone)') is not null,
  'initiate_owner_removal_vote(uuid,text,timestamptz) contract exists'
);

select ok(
  to_regprocedure('public.cast_owner_removal_vote(uuid,text)') is not null,
  'cast_owner_removal_vote(uuid,text) contract exists'
);

select ok(
  to_regprocedure('public.withdraw_owner_removal_vote(uuid)') is not null,
  'withdraw_owner_removal_vote(uuid) contract exists'
);

select ok(
  to_regprocedure('public.expire_owner_removal_votes()') is not null,
  'expire_owner_removal_votes() contract exists'
);

select ok(
  to_regprocedure('public.mark_inactive_owners(timestamp with time zone)') is not null,
  'mark_inactive_owners(timestamptz) contract exists'
);

select ok(
  to_regprocedure(
    'public.search_question_repository(integer,timestamp with time zone,uuid,text,text,text[],text[],text[],text[],text[],timestamp with time zone,timestamp with time zone)'
  ) is not null,
  'search_question_repository(...) contract exists'
);

select ok(
  to_regprocedure('public.set_question_lifecycle_state(uuid,text,text)') is not null,
  'set_question_lifecycle_state(uuid,text,text) contract exists'
);

select ok(
  to_regprocedure('public.is_question_eligible_for_test_generation(uuid)') is not null,
  'is_question_eligible_for_test_generation(uuid) contract exists'
);

select ok(
  to_regprocedure('public.search_generation_pipeline(integer,timestamp with time zone,uuid,text,text,text,uuid,boolean)') is not null,
  'search_generation_pipeline(...) contract exists'
);

select ok(
  to_regprocedure('public.recalculate_generation_queue_needed(integer)') is not null,
  'recalculate_generation_queue_needed(integer) contract exists'
);

select ok(
  to_regprocedure('public.normalize_generated_question_type(text)') is not null,
  'normalize_generated_question_type(text) contract exists'
);

select has_column('public', 'profiles', 'owner_state', 'profiles.owner_state exists');
select has_column('public', 'generation_queue_v3', 'partition_keys', 'generation_queue_v3.partition_keys exists');
select has_column('public', 'generated_question_candidates', 'import_identity', 'generated_question_candidates.import_identity exists');

select ok(
  (
    select bool_and(relrowsecurity)
    from pg_class rel
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = any(array[
        'profiles',
        'questions',
        'question_versions',
        'blueprint_versions',
        'test_ids',
        'question_reports',
        'question_lifecycle_events',
        'user_question_status',
        'user_preferences',
        'user_test_history',
        'user_topic_stats',
        'user_active_sessions',
        'user_notifications',
        'billing_customers',
        'subscriptions',
        'stripe_webhook_events',
        'account_deletion_requests',
        'admin_audit_logs',
        'admin_access_links',
        'name_reviews',
        'banned_terms',
        'notification_broadcasts',
        'governance_votes',
        'governance_ballots',
        'duplicate_question_reviews',
        'teams',
        'team_memberships',
        'team_groups',
        'team_group_members',
        'team_invites',
        'team_assignments',
        'team_assignment_recipients',
        'team_assignment_attempts',
        'generation_queue_v3',
        'deca_batch_jobs',
        'generation_import_receipts',
        'generated_question_candidates'
      ])
  ),
  'RLS is enabled for every application-owned table'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_active_sessions'
      and policyname = 'user_active_sessions_own_all'
  ),
  'private session RLS policy exists'
);

select ok(
  not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'question_reports'
      and policyname = 'question_reports_staff_update'
  ),
  'report writes are restricted to trusted RPCs'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'generated_question_candidates'
      and policyname = 'generated_question_candidates_staff_update'
  ),
  'generated candidate staff update policy exists'
);

select ok(
  not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename in ('generation_queue_v3', 'deca_batch_jobs')
  ),
  'generation queue and batch ledgers are intentionally server-only'
);

select col_is_pk('public', 'profiles', 'user_id', 'profiles.user_id is primary key');
select col_is_pk('public', 'test_ids', 'id', 'test_ids.id is primary key');
select col_is_pk('public', 'user_active_sessions', array['user_id', 'session_type'], 'paused sessions are unique by user and type');

select * from finish();

rollback;
