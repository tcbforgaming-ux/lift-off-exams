create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  resource_type text not null,
  resource_id text,
  reason text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.admin_audit_logs enable row level security;

alter table public.profiles
add column if not exists owner_privileges_suspended boolean not null default false;

alter table public.profiles
add column if not exists owner_privileges_suspended_at timestamptz;

alter table public.profiles
add column if not exists owner_privileges_restored_at timestamptz;

drop policy if exists "Staff read audit logs" on public.admin_audit_logs;
create policy "Staff read audit logs"
on public.admin_audit_logs
for select
using (public.current_user_role() in ('admin', 'owner'));

create table if not exists public.name_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  submitted_name text not null,
  matched_term text,
  status text not null default 'Pending'
    check (status in ('Pending', 'Approved', 'Modified', 'Rejected')),
  replacement_name text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.name_reviews enable row level security;

drop policy if exists "Staff manage name reviews" on public.name_reviews;
create policy "Staff manage name reviews"
on public.name_reviews
for all
using (public.current_user_role() in ('admin', 'owner'))
with check (public.current_user_role() in ('admin', 'owner'));

create table if not exists public.banned_terms (
  id uuid primary key default gen_random_uuid(),
  term text not null,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (term)
);

alter table public.banned_terms enable row level security;

drop policy if exists "Staff manage banned terms" on public.banned_terms;
create policy "Staff manage banned terms"
on public.banned_terms
for all
using (public.current_user_role() in ('admin', 'owner'))
with check (public.current_user_role() in ('admin', 'owner'));

create or replace function public.queue_profile_name_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_value text;
begin
  if nullif(trim(new.display_name), '') is null then return new; end if;

  select term into matched_value
  from public.banned_terms
  where active and lower(new.display_name) like '%' || lower(term) || '%'
  order by length(term) desc
  limit 1;

  if matched_value is not null then
    insert into public.name_reviews (
      user_id, submitted_name, matched_term, status, updated_at
    )
    select new.user_id, new.display_name, matched_value, 'Pending', now()
    where not exists (
      select 1 from public.name_reviews
      where user_id = new.user_id
        and submitted_name = new.display_name
        and status = 'Pending'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_queue_name_review on public.profiles;
create trigger profiles_queue_name_review
after insert or update of display_name on public.profiles
for each row execute function public.queue_profile_name_review();

create table if not exists public.notification_broadcasts (
  id uuid primary key default gen_random_uuid(),
  audience text not null
    check (audience in ('all', 'premium', 'free', 'admin', 'owner')),
  title text not null,
  message text not null,
  status text not null default 'Queued'
    check (status in ('Queued', 'Sent', 'Failed', 'Cancelled')),
  recipient_count integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.notification_broadcasts enable row level security;

drop policy if exists "Staff read broadcasts" on public.notification_broadcasts;
create policy "Staff read broadcasts"
on public.notification_broadcasts
for select
using (public.current_user_role() in ('admin', 'owner'));

create table if not exists public.governance_ballots (
  vote_id uuid not null references public.governance_votes(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  decision text not null check (decision in ('Approve', 'Reject')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (vote_id, owner_user_id)
);

alter table public.governance_ballots enable row level security;

drop policy if exists "Owners manage governance ballots" on public.governance_ballots;
create policy "Owners manage governance ballots"
on public.governance_ballots
for all
using (public.current_user_role() = 'owner')
with check (public.current_user_role() = 'owner');

alter table public.governance_votes
add column if not exists target_email text;

alter table public.governance_votes
add column if not exists required_approvals integer not null default 1;

alter table public.governance_votes
add column if not exists required_rejections integer not null default 1;

alter table public.governance_votes
add column if not exists reason text;

create table if not exists public.blueprint_versions (
  id uuid primary key default gen_random_uuid(),
  blueprint_name text not null,
  cluster text not null,
  level text not null,
  category text not null,
  version text not null,
  distribution jsonb not null default '{}',
  total_questions integer not null default 0,
  status text not null default 'Active'
    check (status in ('Active', 'Retired', 'Rolled Back')),
  change_reason text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (blueprint_name, version)
);

alter table public.blueprint_versions enable row level security;

drop policy if exists "Staff manage blueprint versions" on public.blueprint_versions;
create policy "Staff manage blueprint versions"
on public.blueprint_versions
for all
using (public.current_user_role() in ('admin', 'owner'))
with check (public.current_user_role() in ('admin', 'owner'));

create table if not exists public.duplicate_question_reviews (
  id uuid primary key default gen_random_uuid(),
  candidate_hash text not null,
  candidate_question jsonb not null,
  matching_question_id uuid references public.questions(id) on delete set null,
  similarity integer not null default 0 check (similarity between 0 and 100),
  status text not null default 'Pending'
    check (status in ('Pending', 'Upload Anyway', 'Edit', 'Cancelled')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.duplicate_question_reviews enable row level security;

drop policy if exists "Staff manage duplicate reviews" on public.duplicate_question_reviews;
create policy "Staff manage duplicate reviews"
on public.duplicate_question_reviews
for all
using (public.current_user_role() in ('admin', 'owner'))
with check (public.current_user_role() in ('admin', 'owner'));

create or replace function public.write_admin_audit(
  action_name text,
  resource_type_name text,
  resource_id_value text default null,
  reason_value text default null,
  metadata_value jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  audit_id uuid;
begin
  if public.current_user_role() not in ('admin', 'owner') then
    raise exception 'Administrator or Owner access required';
  end if;

  insert into public.admin_audit_logs (
    actor_user_id,
    actor_email,
    action,
    resource_type,
    resource_id,
    reason,
    metadata
  )
  values (
    auth.uid(),
    (select email from auth.users where id = auth.uid()),
    action_name,
    resource_type_name,
    resource_id_value,
    reason_value,
    coalesce(metadata_value, '{}'::jsonb)
  )
  returning id into audit_id;

  return audit_id;
end;
$$;

create or replace function public.admin_set_user_suspension(
  target_user_id_value uuid,
  suspend_until timestamptz,
  reason_value text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_role text;
begin
  if public.current_user_role() not in ('admin', 'owner') then
    raise exception 'Administrator or Owner access required';
  end if;

  select role into target_role
  from public.profiles
  where user_id = target_user_id_value;

  if target_role in ('admin', 'owner') and public.current_user_role() <> 'owner' then
    raise exception 'Only Owners may suspend staff accounts';
  end if;

  update public.profiles
  set suspended_until = suspend_until, updated_at = now()
  where user_id = target_user_id_value;

  perform public.write_admin_audit(
    case when suspend_until is null then 'Account restored' else 'Account suspended' end,
    'profile',
    target_user_id_value::text,
    reason_value,
    jsonb_build_object('suspended_until', suspend_until)
  );
end;
$$;

create or replace function public.admin_review_name(
  review_id_value uuid,
  decision_value text,
  replacement_value text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  review_row public.name_reviews%rowtype;
begin
  if public.current_user_role() not in ('admin', 'owner') then
    raise exception 'Administrator or Owner access required';
  end if;

  if decision_value not in ('Approved', 'Modified', 'Rejected') then
    raise exception 'Invalid name-review decision';
  end if;

  select * into review_row from public.name_reviews where id = review_id_value;
  if not found then raise exception 'Name review not found'; end if;

  update public.name_reviews
  set
    status = decision_value,
    replacement_name = replacement_value,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  where id = review_id_value;

  if decision_value = 'Modified' and nullif(trim(replacement_value), '') is not null then
    update public.profiles
    set display_name = trim(replacement_value), updated_at = now()
    where user_id = review_row.user_id;
  end if;

  perform public.write_admin_audit(
    'Name review ' || lower(decision_value),
    'name_review',
    review_id_value::text,
    replacement_value,
    jsonb_build_object('user_id', review_row.user_id)
  );
end;
$$;

create or replace function public.admin_queue_broadcast(
  audience_value text,
  title_value text,
  message_value text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  broadcast_id uuid;
  recipients integer;
begin
  if public.current_user_role() not in ('admin', 'owner') then
    raise exception 'Administrator or Owner access required';
  end if;

  if audience_value not in ('all', 'premium', 'free', 'admin', 'owner') then
    raise exception 'Invalid broadcast audience';
  end if;

  insert into public.notification_broadcasts (
    audience, title, message, status, created_by
  )
  values (
    audience_value, title_value, message_value, 'Queued', auth.uid()
  )
  returning id into broadcast_id;

  insert into public.user_notifications (
    user_id, type, title, message, delivery_status, metadata
  )
  select
    profiles.user_id,
    'broadcast',
    title_value,
    message_value,
    'Queued',
    jsonb_build_object('broadcast_id', broadcast_id, 'audience', audience_value)
  from public.profiles
  where
    audience_value = 'all'
    or (audience_value = 'premium' and profiles.account_tier = 'premium')
    or (audience_value = 'free' and profiles.account_tier = 'free')
    or (audience_value = 'admin' and profiles.role = 'admin')
    or (audience_value = 'owner' and profiles.role = 'owner');

  get diagnostics recipients = row_count;

  update public.notification_broadcasts
  set status = 'Sent', recipient_count = recipients, sent_at = now()
  where id = broadcast_id;

  perform public.write_admin_audit(
    'Notification broadcast queued',
    'broadcast',
    broadcast_id::text,
    null,
    jsonb_build_object('audience', audience_value, 'recipient_count', recipients)
  );

  return broadcast_id;
end;
$$;

create or replace function public.set_own_owner_privileges_suspended(
  suspend_value boolean
)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  profile_row public.profiles%rowtype;
  next_role text;
begin
  select * into profile_row
  from public.profiles
  where user_id = auth.uid();

  if not found then
    raise exception 'Profile not found';
  end if;

  if suspend_value then
    if public.current_user_role() <> 'owner' then
      raise exception 'Owner access required to suspend Owner privileges';
    end if;

    update public.profiles
    set
      role = 'admin',
      owner_privileges_suspended = true,
      owner_privileges_suspended_at = now(),
      updated_at = now()
    where user_id = auth.uid();

    update auth.users
    set raw_app_meta_data =
      coalesce(raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', 'admin')
    where id = auth.uid();

    perform public.write_admin_audit(
      'Owner privileges suspended',
      'profile',
      auth.uid()::text,
      'Owner self-suspension',
      jsonb_build_object('owner_privileges_suspended', true)
    );

    return 'Suspended';
  end if;

  if profile_row.owner_privileges_suspended is not true then
    raise exception 'Owner privileges are not suspended for this account';
  end if;

  next_role := 'owner';

  update public.profiles
  set
    role = next_role,
    owner_privileges_suspended = false,
    owner_privileges_restored_at = now(),
    updated_at = now()
  where user_id = auth.uid();

  update auth.users
  set raw_app_meta_data =
    coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', next_role)
  where id = auth.uid();

  perform public.write_admin_audit(
    'Owner privileges restored',
    'profile',
    auth.uid()::text,
    'Owner self-restoration',
    jsonb_build_object('owner_privileges_suspended', false)
  );

  return 'Restored';
end;
$$;

create or replace function public.get_active_owner_count()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  owner_total integer;
begin
  if public.current_user_role() not in ('admin', 'owner') then
    raise exception 'Administrator or Owner access required';
  end if;

  select count(*) into owner_total
  from public.profiles
  where role = 'owner' and (suspended_until is null or suspended_until < now());

  return owner_total;
end;
$$;

create or replace function public.create_governance_vote(
  action_value text,
  target_user_id_value uuid default null,
  target_email_value text default null,
  reason_value text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  vote_id uuid;
  owner_count integer;
  approvals integer;
  rejections integer;
  threshold_label text;
begin
  if public.current_user_role() <> 'owner' then
    raise exception 'Owner access required';
  end if;

  select count(*) into owner_count
  from public.profiles
  where role = 'owner' and (suspended_until is null or suspended_until < now());

  if action_value = 'Create Owner' then
    approvals := greatest(owner_count, 1);
    rejections := 1;
    threshold_label := 'Unanimous approval from all active Owners';
  elsif action_value = 'Remove Owner' then
    approvals := case
      when owner_count <= 2 then 1
      else greatest(floor(owner_count / 2.0)::integer + 1, 1)
    end;
    rejections := greatest(owner_count - approvals + 1, 1);
    threshold_label := case
      when owner_count <= 2 then 'Single Owner approval when two or fewer Owners are active'
      else 'Majority approval from active Owners'
    end;
  elsif action_value in ('Create Administrator', 'Suspend Administrator') then
    approvals := least(greatest(owner_count, 1), 2);
    rejections := greatest(owner_count - approvals + 1, 1);
    threshold_label := 'Approval from at least two Owners';
  elsif action_value = 'Override Administrator Action' then
    approvals := 1;
    rejections := 1;
    threshold_label := 'Single Owner approval';
  else
    raise exception 'Unsupported governance action';
  end if;

  insert into public.governance_votes (
    action,
    target_user_id,
    target_email,
    threshold,
    required_approvals,
    required_rejections,
    reason,
    status,
    created_by
  )
  values (
    action_value,
    target_user_id_value,
    target_email_value,
    threshold_label,
    approvals,
    rejections,
    reason_value,
    'Open',
    auth.uid()
  )
  returning id into vote_id;

  perform public.write_admin_audit(
    'Governance vote created',
    'governance_vote',
    vote_id::text,
    reason_value,
    jsonb_build_object('action', action_value, 'required_approvals', approvals)
  );

  return vote_id;
end;
$$;

create or replace function public.cast_governance_ballot(
  vote_id_value uuid,
  decision_value text
)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  approvals integer;
  rejections integer;
  vote_row public.governance_votes%rowtype;
  next_status text := 'Open';
  resolved_target_user_id uuid;
  granted_role text;
  profiles_has_id_column boolean;
begin
  if public.current_user_role() <> 'owner' then
    raise exception 'Owner access required';
  end if;
  if decision_value not in ('Approve', 'Reject') then
    raise exception 'Decision must be Approve or Reject';
  end if;

  select * into vote_row from public.governance_votes where id = vote_id_value;
  if not found then raise exception 'Governance vote not found'; end if;
  if vote_row.status <> 'Open' then return vote_row.status; end if;

  insert into public.governance_ballots (
    vote_id, owner_user_id, decision, updated_at
  )
  values (vote_id_value, auth.uid(), decision_value, now())
  on conflict (vote_id, owner_user_id) do update
  set decision = excluded.decision, updated_at = now();

  select
    count(*) filter (where decision = 'Approve'),
    count(*) filter (where decision = 'Reject')
  into approvals, rejections
  from public.governance_ballots
  where vote_id = vote_id_value;

  if approvals >= vote_row.required_approvals then next_status := 'Approved';
  elsif rejections >= vote_row.required_rejections then next_status := 'Rejected';
  end if;

  if next_status <> 'Open' then
    update public.governance_votes
    set status = next_status, resolved_at = now()
    where id = vote_id_value;
  end if;

  if next_status = 'Approved' then
    resolved_target_user_id := vote_row.target_user_id;
    if resolved_target_user_id is null and nullif(trim(vote_row.target_email), '') is not null then
      select id into resolved_target_user_id
      from auth.users
      where lower(email) = lower(trim(vote_row.target_email));
    end if;

    if vote_row.action in ('Create Owner', 'Create Administrator', 'Remove Owner', 'Suspend Administrator')
      and resolved_target_user_id is null then
      raise exception 'Approved vote has no matching target account';
    end if;

    if vote_row.action = 'Remove Owner' and resolved_target_user_id = auth.uid() then
      raise exception 'Owners cannot remove their own Owner access through governance';
    end if;

    if vote_row.action in ('Create Owner', 'Create Administrator', 'Remove Owner') then
      granted_role := case
        when vote_row.action = 'Create Owner' then 'owner'
        when vote_row.action = 'Create Administrator' then 'admin'
        else 'student'
      end;

      select exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'profiles'
          and column_name = 'id'
      ) into profiles_has_id_column;

      if profiles_has_id_column then
        execute $profile_upsert$
          insert into public.profiles (
            id,
            user_id,
            display_name,
            role,
            account_tier,
            updated_at
          )
          select
            users.id,
            users.id,
            coalesce(nullif(split_part(users.email, '@', 1), ''), 'User'),
            $2,
            coalesce((select profiles.account_tier from public.profiles profiles where profiles.user_id = users.id), 'free'),
            now()
          from auth.users users
          where users.id = $1
          on conflict (user_id) do update
          set role = excluded.role,
              updated_at = now()
        $profile_upsert$ using resolved_target_user_id, granted_role;
      else
        insert into public.profiles (
          user_id,
          display_name,
          role,
          account_tier,
          updated_at
        )
        select
          users.id,
          coalesce(nullif(split_part(users.email, '@', 1), ''), 'User'),
          granted_role,
          coalesce((select profiles.account_tier from public.profiles profiles where profiles.user_id = users.id), 'free'),
          now()
        from auth.users users
        where users.id = resolved_target_user_id
        on conflict (user_id) do update
        set role = excluded.role,
            updated_at = now();
      end if;

      update auth.users
      set raw_app_meta_data =
        coalesce(raw_app_meta_data, '{}'::jsonb)
        || jsonb_build_object('role', granted_role)
      where id = resolved_target_user_id;
    elsif vote_row.action = 'Suspend Administrator' then
      update public.profiles
      set suspended_until = now() + interval '30 days', updated_at = now()
      where user_id = resolved_target_user_id and role = 'admin';
    end if;
  end if;

  perform public.write_admin_audit(
    'Governance ballot cast',
    'governance_vote',
    vote_id_value::text,
    decision_value,
    jsonb_build_object('status', next_status)
  );

  return next_status;
end;
$$;

grant execute on function public.write_admin_audit(text, text, text, text, jsonb) to authenticated;
grant execute on function public.admin_set_user_suspension(uuid, timestamptz, text) to authenticated;
grant execute on function public.admin_review_name(uuid, text, text) to authenticated;
grant execute on function public.admin_queue_broadcast(text, text, text) to authenticated;
grant execute on function public.set_own_owner_privileges_suspended(boolean) to authenticated;
grant execute on function public.get_active_owner_count() to authenticated;
grant execute on function public.create_governance_vote(text, uuid, text, text) to authenticated;
grant execute on function public.cast_governance_ballot(uuid, text) to authenticated;
