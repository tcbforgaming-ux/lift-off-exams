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
  when others then
    if sqlerrm ilike '%required%'
      or sqlerrm ilike '%cannot vote%'
      or sqlerrm ilike '%expired%'
      or sqlerrm ilike '%not found%'
      or sqlerrm ilike '%withdraw%'
      or sqlerrm ilike '%governance%' then
      return true;
    end if;
    raise notice 'Expected governance denial, got [%] %', sqlstate, sqlerrm;
    return false;
end;
$$;

grant usage on schema tests to authenticated;
grant execute on all functions in schema tests to authenticated;

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
  ('00000000-0000-0000-0000-000000005001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-a@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000005002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-b@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000005003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-c@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000005004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-d@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000005101', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

update public.profiles
set role = 'owner',
    owner_state = 'active',
    owner_privileges_suspended = false
where user_id in (
  '00000000-0000-0000-0000-000000005001',
  '00000000-0000-0000-0000-000000005002',
  '00000000-0000-0000-0000-000000005003',
  '00000000-0000-0000-0000-000000005004'
);

select tests.authenticate_as('00000000-0000-0000-0000-000000005101', 'student@example.test');

select ok(
  tests.expect_denied($sql$
    select public.initiate_owner_removal_vote(
      '00000000-0000-0000-0000-000000005004',
      'student attempt',
      now() + interval '7 days'
    )
  $sql$),
  'standard users cannot initiate owner-removal votes'
);

reset role;
select tests.authenticate_as('00000000-0000-0000-0000-000000005001', 'owner-a@example.test');

create temporary table tests_owner_vote(id uuid);

insert into tests_owner_vote(id)
select public.initiate_owner_removal_vote(
  '00000000-0000-0000-0000-000000005004',
  'approved owner removal',
  now() + interval '7 days'
);

select is(
  (
    select required_approvals
    from public.governance_votes
    where id = (select id from tests_owner_vote)
  ),
  3,
  'three eligible non-target owners require three approvals'
);

select is(
  (
    select status
    from public.governance_votes
    where id = (select id from tests_owner_vote)
  ),
  'Open',
  'owner-removal vote starts open'
);

select public.cast_owner_removal_vote((select id from tests_owner_vote), 'Approve');

select is(
  (
    select count(*)::integer
    from public.governance_ballots
    where vote_id = (select id from tests_owner_vote)
      and withdrawn_at is null
  ),
  1,
  'owner vote is recorded'
);

select public.withdraw_owner_removal_vote((select id from tests_owner_vote));

select is(
  (
    select count(*)::integer
    from public.governance_ballots
    where vote_id = (select id from tests_owner_vote)
      and withdrawn_at is null
  ),
  0,
  'owners can withdraw active votes'
);

select public.cast_owner_removal_vote((select id from tests_owner_vote), 'Approve');

reset role;
select tests.authenticate_as('00000000-0000-0000-0000-000000005002', 'owner-b@example.test');
select public.cast_owner_removal_vote((select id from tests_owner_vote), 'Approve');

select is(
  (
    select status
    from public.governance_votes
    where id = (select id from tests_owner_vote)
  ),
  'Open',
  'vote remains open before threshold'
);

reset role;
select tests.authenticate_as('00000000-0000-0000-0000-000000005004', 'owner-d@example.test');

select ok(
  tests.expect_denied($sql$
    select public.cast_owner_removal_vote(
      (select id from tests_owner_vote),
      'Approve'
    )
  $sql$),
  'target owner cannot vote on their own removal'
);

reset role;
select tests.authenticate_as('00000000-0000-0000-0000-000000005003', 'owner-c@example.test');
select public.cast_owner_removal_vote((select id from tests_owner_vote), 'Approve');

select is(
  (
    select status
    from public.governance_votes
    where id = (select id from tests_owner_vote)
  ),
  'Executed',
  'owner removal executes at threshold'
);

select is(
  (
    select role
    from public.profiles
    where user_id = '00000000-0000-0000-0000-000000005004'
  ),
  'admin',
  'removed owner is demoted to administrator'
);

select is(
  (
    select owner_state
    from public.profiles
    where user_id = '00000000-0000-0000-0000-000000005004'
  ),
  'unavailable',
  'removed owner is marked unavailable'
);

select ok(
  exists (
    select 1
    from public.admin_audit_logs
    where action = 'Owner removed'
      and resource_id = '00000000-0000-0000-0000-000000005004'
  ),
  'executed owner removal writes an audit record'
);

reset role;

update public.profiles
set owner_state = 'inactive_suspended',
    owner_privileges_suspended = true
where user_id = '00000000-0000-0000-0000-000000005002';

select is(
  public.get_owner_removal_required_approvals('00000000-0000-0000-0000-000000005003'),
  1,
  'fewer than three eligible non-target owners require all eligible non-target owners with minimum one'
);

select * from finish();

rollback;
