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
  when insufficient_privilege or check_violation then
    return true;
  when others then
    if sqlerrm ilike '%required%'
      or sqlerrm ilike '%supported by this workflow%'
      or sqlerrm ilike '%not supported%'
      or sqlerrm ilike '%owner-governance%'
      or sqlerrm ilike '%permission denied%'
      or sqlerrm ilike '%row-level security%' then
      return true;
    end if;
    raise notice 'Expected authorization denial, got [%] %', sqlstate, sqlerrm;
    return false;
end;
$$;

grant usage on schema tests to authenticated;
grant execute on all functions in schema tests to authenticated;

select plan(11);

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
    '00000000-0000-0000-0000-000000003001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'new-user@example.test',
    'not-used',
    now(),
    '{}'::jsonb,
    '{"role":"owner","display_name":"New User"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000003002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin-user@example.test',
    'not-used',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000003003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'owner-user@example.test',
    'not-used',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

select is(
  (select count(*)::integer from public.profiles where user_id = '00000000-0000-0000-0000-000000003001'),
  1,
  'auth user insert creates exactly one profile'
);

select is(
  (select role from public.profiles where user_id = '00000000-0000-0000-0000-000000003001'),
  'student',
  'client-supplied role metadata is ignored during profile creation'
);

insert into public.profiles(user_id, display_name)
values ('00000000-0000-0000-0000-000000003001', 'Retry')
on conflict (user_id) do nothing;

select is(
  (select count(*)::integer from public.profiles where user_id = '00000000-0000-0000-0000-000000003001'),
  1,
  'profile creation remains idempotent under retries'
);

update public.profiles
set role = 'admin'
where user_id = '00000000-0000-0000-0000-000000003002';

update public.profiles
set role = 'owner'
where user_id = '00000000-0000-0000-0000-000000003003';

select tests.authenticate_as('00000000-0000-0000-0000-000000003001', 'new-user@example.test');

select ok(
  tests.expect_denied($sql$
    update public.profiles
    set role = 'owner'
    where user_id = '00000000-0000-0000-0000-000000003001'
  $sql$),
  'standard user cannot update their trusted role directly'
);

reset role;
select tests.authenticate_as('00000000-0000-0000-0000-000000003002', 'admin-user@example.test');

select ok(
  tests.expect_denied($sql$
    select public.set_user_platform_role(
      '00000000-0000-0000-0000-000000003002',
      'owner',
      'self promotion attempt',
      null
    )
  $sql$),
  'administrator cannot promote themselves to owner'
);

select ok(
  tests.expect_denied($sql$
    select public.bootstrap_initial_owner(
      '00000000-0000-0000-0000-000000003002',
      'public bootstrap attempt'
    )
  $sql$),
  'authenticated users cannot execute initial-owner bootstrap'
);

reset role;
select tests.authenticate_as('00000000-0000-0000-0000-000000003003', 'owner-user@example.test');

select ok(
  tests.expect_lives($sql$
    select public.set_user_platform_role(
      '00000000-0000-0000-0000-000000003001',
      'admin',
      'approved administrator access',
      null
    )
  $sql$),
  'owner can grant administrator access'
);

select is(
  (select role from public.profiles where user_id = '00000000-0000-0000-0000-000000003001'),
  'admin',
  'owner role change updates target profile'
);

select ok(
  exists (
    select 1
    from public.admin_audit_logs
    where actor_user_id = '00000000-0000-0000-0000-000000003003'
      and resource_id = '00000000-0000-0000-0000-000000003001'
      and metadata ->> 'previous_role' = 'student'
      and metadata ->> 'new_role' = 'admin'
  ),
  'role change creates a complete audit record'
);

select ok(
  tests.expect_denied($sql$
    select public.set_user_platform_role(
      '00000000-0000-0000-0000-000000003001',
      'owner',
      'owner creation attempt',
      null
    )
  $sql$),
  'owner creation is not available through the administrator-management RPC'
);

select ok(
  tests.expect_denied($sql$
    select public.set_user_platform_role(
      '00000000-0000-0000-0000-000000003003',
      'student',
      'owner removal attempt',
      null
    )
  $sql$),
  'owner removal is reserved for unresolved owner-governance workflow'
);

select * from finish();

rollback;
