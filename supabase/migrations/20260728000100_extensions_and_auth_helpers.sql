-- Milestone 2: deterministic database foundation.
-- This migration is intentionally first because later RLS policies depend on
-- trusted role helper functions that read public.profiles, not JWT metadata.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  role text not null default 'student'
    check (role in ('student', 'admin', 'owner')),
  account_tier text not null default 'free'
    check (account_tier in ('free', 'premium')),
  suspended_until timestamptz,
  owner_privileges_suspended boolean not null default false,
  owner_privileges_suspended_at timestamptz,
  owner_privileges_restored_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Trusted user profile, billing tier, and platform role data. Authorization helpers read this table instead of client-supplied metadata.';

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(user_id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger auth_users_create_profile
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select case
        when profiles.role = 'owner'
          and profiles.owner_privileges_suspended then 'admin'
        else profiles.role
      end
      from public.profiles
      where profiles.user_id = auth.uid()
        and (
          profiles.suspended_until is null
          or profiles.suspended_until < now()
        )
    ),
    'student'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('admin', 'owner');
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'owner';
$$;

alter table public.profiles enable row level security;
