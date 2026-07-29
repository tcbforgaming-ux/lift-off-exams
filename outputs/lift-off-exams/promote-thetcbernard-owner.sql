do $$
declare
  target_user_id uuid;
begin
  select id
  into target_user_id
  from auth.users
  where lower(email) = lower('thetcbernard@gmail.com');

  if target_user_id is null then
    raise exception 'No Supabase Auth user exists for thetcbernard@gmail.com';
  end if;

  insert into public.profiles (
    id,
    user_id,
    display_name,
    role,
    account_tier,
    updated_at
  )
  values (
    target_user_id,
    target_user_id,
    'thetcbernard',
    'owner',
    'free',
    now()
  )
  on conflict (user_id) do update
  set
    role = 'owner',
    updated_at = now();

  update auth.users
  set raw_app_meta_data =
    coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', 'owner')
  where id = target_user_id;
end
$$;

select
  users.email,
  profiles.role,
  users.raw_app_meta_data ->> 'role' as auth_role
from auth.users as users
join public.profiles as profiles
  on profiles.user_id = users.id
where lower(users.email) = lower('thetcbernard@gmail.com');
