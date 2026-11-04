begin;

create extension if not exists pgtap with schema extensions;
create schema if not exists tests;

create or replace function tests.authenticate_as(user_id uuid, email text)
returns void
language plpgsql
as $$
begin
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', user_id::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', user_id::text,
      'email', email,
      'role', 'authenticated'
    )::text,
    true
  );
end;
$$;

create or replace function tests.authenticate_anon()
returns void
language plpgsql
as $$
begin
  execute 'set local role anon';
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{}'::text, true);
end;
$$;

create or replace function tests.expect_lives(sql text)
returns boolean
language plpgsql
as $$
begin
  execute sql;
  return true;
exception
  when others then
    raise notice 'Expected statement to succeed, got [%] %', sqlstate, sqlerrm;
    return false;
end;
$$;

create or replace function tests.expect_denied(sql text)
returns boolean
language plpgsql
as $$
begin
  execute sql;
  return false;
exception
  when insufficient_privilege or check_violation then
    return true;
  when others then
    if sqlerrm ilike '%row-level security%' then
      return true;
    end if;
    raise notice 'Expected RLS/privilege denial, got [%] %', sqlstate, sqlerrm;
    return false;
end;
$$;

grant usage on schema tests to anon, authenticated;
grant execute on all functions in schema tests to anon, authenticated;

select plan(12);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'student-a@example.test',
    'not-used',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'student-b@example.test',
    'not-used',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@example.test',
    'not-used',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000301',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'owner@example.test',
    'not-used',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.profiles(user_id, display_name, role, account_tier)
values
  ('00000000-0000-0000-0000-000000000101', 'Student A', 'student', 'free'),
  ('00000000-0000-0000-0000-000000000102', 'Student B', 'student', 'free'),
  ('00000000-0000-0000-0000-000000000201', 'Admin', 'admin', 'free'),
  ('00000000-0000-0000-0000-000000000301', 'Owner', 'owner', 'premium')
on conflict (user_id) do update
set display_name = excluded.display_name,
    role = excluded.role,
    account_tier = excluded.account_tier;

insert into public.questions (
  id,
  partition_key,
  performance_indicator,
  question_type,
  question_text,
  options,
  correct_option_id,
  explanation,
  difficulty,
  tags
)
values (
  '10000000-0000-0000-0000-000000000001',
  'Business Administration Core',
  'PI-001',
  'Definition',
  'What is a contract?',
  '[{"id":"A","text":"Agreement"},{"id":"B","text":"Poster"},{"id":"C","text":"Invoice"},{"id":"D","text":"Memo"}]'::jsonb,
  'A',
  'A contract is an agreement with enforceable terms.',
  'Easy',
  array['Business Law']
);

select tests.authenticate_as('00000000-0000-0000-0000-000000000101', 'student-a@example.test');

select ok(
  tests.expect_lives($sql$
    insert into public.user_preferences(user_id)
    values ('00000000-0000-0000-0000-000000000101')
  $sql$),
  'student can insert own preferences'
);

select ok(
  tests.expect_denied($sql$
    insert into public.user_preferences(user_id)
    values ('00000000-0000-0000-0000-000000000102')
  $sql$),
  'student cannot insert another user preferences row'
);

select ok(
  tests.expect_denied($sql$
    insert into public.user_active_sessions(user_id, session_type, session_state)
    values ('00000000-0000-0000-0000-000000000101', 'paused_test', '{}')
  $sql$),
  'legacy paused-session storage is no longer client writable'
);

select ok(
  tests.expect_denied($sql$
    insert into public.user_active_sessions(user_id, session_type, session_state)
    values ('00000000-0000-0000-0000-000000000102', 'paused_test', '{}')
  $sql$),
  'student cannot save another user paused session'
);

select ok(
  tests.expect_denied($sql$
    insert into public.questions(
      partition_key,
      question_text,
      options,
      correct_option_id,
      difficulty,
      tags
    )
    values (
      'Marketing',
      'Student-written question',
      '[{"id":"A","text":"A"},{"id":"B","text":"B"},{"id":"C","text":"C"},{"id":"D","text":"D"}]'::jsonb,
      'A',
      'Easy',
      array['Marketing']
    )
  $sql$),
  'student cannot insert questions'
);

select ok(
  tests.expect_denied($sql$
    insert into public.question_reports(question_id, reporter_id, reason)
    values (
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000101',
      'Typo'
    )
  $sql$),
  'student cannot bypass the trusted report RPC'
);

select ok(
  tests.expect_denied($sql$
    insert into public.question_reports(question_id, reporter_id, reason)
    values (
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000102',
      'Impersonated report'
    )
  $sql$),
  'student cannot report as another user'
);

reset role;
select tests.authenticate_anon();

select ok(
  tests.expect_denied($sql$
    select count(*) from public.questions
  $sql$),
  'anonymous users cannot read protected question rows directly'
);

select ok(
  tests.expect_denied($sql$
    insert into public.question_reports(question_id, reporter_id, reason)
    values (
      '10000000-0000-0000-0000-000000000001',
      null,
      'Anonymous report'
    )
  $sql$),
  'anonymous users cannot create question reports'
);

reset role;
select tests.authenticate_as('00000000-0000-0000-0000-000000000201', 'admin@example.test');

select ok(
  tests.expect_denied($sql$
    insert into public.questions(
      partition_key,
      question_text,
      options,
      correct_option_id,
      difficulty,
      tags
    )
    values (
      'Marketing',
      'Admin-written question',
      '[{"id":"A","text":"A"},{"id":"B","text":"B"},{"id":"C","text":"C"},{"id":"D","text":"D"}]'::jsonb,
      'A',
      'Medium',
      array['Marketing']
    )
  $sql$),
  'admin cannot bypass trusted question publication'
);

select ok(
  tests.expect_denied($sql$
    select public.build_deca_batch_jsonl(1)
  $sql$),
  'authenticated admin cannot execute server-only batch builder'
);

reset role;
select tests.authenticate_as('00000000-0000-0000-0000-000000000301', 'owner@example.test');

select ok(
  tests.expect_lives($sql$
    insert into public.admin_access_links(email, token_hash, requested_role, created_by)
    values (
      'new-admin@example.test',
      encode(extensions.digest('new-admin@example.test', 'sha256'), 'hex'),
      'admin',
      '00000000-0000-0000-0000-000000000301'
    )
  $sql$),
  'owner can create admin access invite records'
);

select * from finish();

rollback;
