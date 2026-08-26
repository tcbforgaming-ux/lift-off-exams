-- RLS and trusted RPC boundary. Authorization is derived from public.profiles
-- and team_memberships, never from client-supplied route state or JWT role metadata.

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
  if not public.is_admin() then
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

create or replace function public.queue_profile_name_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_value text;
begin
  if nullif(trim(new.display_name), '') is null then
    return new;
  end if;

  select term into matched_value
  from public.banned_terms
  where active
    and lower(new.display_name) like '%' || lower(term) || '%'
  order by length(term) desc
  limit 1;

  if matched_value is not null then
    insert into public.name_reviews (
      user_id,
      submitted_name,
      matched_term,
      status
    )
    select new.user_id, new.display_name, matched_value, 'Pending'
    where not exists (
      select 1
      from public.name_reviews
      where user_id = new.user_id
        and submitted_name = new.display_name
        and status = 'Pending'
    );
  end if;

  return new;
end;
$$;

create trigger profiles_queue_name_review
after insert or update of display_name on public.profiles
for each row execute function public.queue_profile_name_review();

create or replace function public.current_team_role(p_team_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select tm.role
  from public.team_memberships tm
  where tm.team_id = p_team_id
    and tm.user_id = auth.uid()
    and tm.status = 'active'
  order by case tm.role
    when 'team_admin' then 1
    when 'co_admin' then 2
    else 3
  end
  limit 1;
$$;

create or replace function public.can_admin_team(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_team_role(p_team_id) = 'team_admin', false)
    or exists (
      select 1
      from public.teams t
      where t.id = p_team_id
        and t.created_by = auth.uid()
    );
$$;

create or replace function public.can_manage_team(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_team_role(p_team_id) in ('team_admin', 'co_admin'), false)
    or exists (
      select 1
      from public.teams t
      where t.id = p_team_id
        and t.created_by = auth.uid()
    );
$$;

create or replace function public.accept_team_invite(p_token_hash text)
returns table(team_id uuid, membership_id uuid, role text, role_label text)
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.team_invites%rowtype;
  member_row public.team_memberships%rowtype;
  current_email text := lower(auth.jwt() ->> 'email');
  current_name text := coalesce(
    auth.jwt() -> 'user_metadata' ->> 'display_name',
    auth.jwt() -> 'user_metadata' ->> 'full_name',
    auth.jwt() -> 'user_metadata' ->> 'name',
    split_part(current_email, '@', 1)
  );
begin
  if auth.uid() is null then
    raise exception 'Sign in before accepting a team invite';
  end if;

  if coalesce(p_token_hash, '') = '' then
    raise exception 'Invite token is required';
  end if;

  select *
  into invite_row
  from public.team_invites
  where token_hash = p_token_hash
  for update;

  if not found then
    raise exception 'Invalid team invite';
  end if;

  if invite_row.status <> 'pending' then
    raise exception 'Team invite is not pending';
  end if;

  if invite_row.expires_at <= now() then
    update public.team_invites
    set status = 'expired'
    where id = invite_row.id;
    raise exception 'Team invite has expired';
  end if;

  if lower(invite_row.email) <> current_email then
    raise exception 'This invite belongs to a different email address';
  end if;

  update public.team_invites
  set status = 'accepted',
      accepted_by = auth.uid(),
      accepted_at = now()
  where id = invite_row.id;

  update public.team_memberships
  set user_id = auth.uid(),
      email = invite_row.email,
      display_name = coalesce(display_name, current_name),
      role = invite_row.role,
      role_label = invite_row.role_label,
      status = 'active'
  where team_memberships.team_id = invite_row.team_id
    and lower(team_memberships.email) = lower(invite_row.email)
  returning * into member_row;

  if member_row.id is null then
    insert into public.team_memberships (
      team_id,
      user_id,
      email,
      display_name,
      role,
      role_label,
      status,
      created_by
    )
    values (
      invite_row.team_id,
      auth.uid(),
      invite_row.email,
      current_name,
      invite_row.role,
      invite_row.role_label,
      'active',
      invite_row.created_by
    )
    returning * into member_row;
  end if;

  return query
  select invite_row.team_id, member_row.id, member_row.role, member_row.role_label;
end;
$$;

create or replace function public.get_active_owner_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.profiles
  where role = 'owner'
    and owner_privileges_suspended is not true
    and (suspended_until is null or suspended_until < now());
$$;

create or replace function public.set_own_owner_privileges_suspended(suspend_value boolean)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  profile_row public.profiles%rowtype;
begin
  select *
  into profile_row
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
    set role = 'admin',
        owner_privileges_suspended = true,
        owner_privileges_suspended_at = now()
    where user_id = auth.uid();

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

  update public.profiles
  set role = 'owner',
      owner_privileges_suspended = false,
      owner_privileges_restored_at = now()
  where user_id = auth.uid();

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

-- Profiles
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (auth.uid() = user_id);

create policy profiles_select_staff
on public.profiles
for select
to authenticated
using (public.is_admin());

create policy profiles_insert_own_student
on public.profiles
for insert
to authenticated
with check (
  auth.uid() = user_id
  and role = 'student'
  and account_tier = 'free'
  and suspended_until is null
  and owner_privileges_suspended = false
);

create policy profiles_update_own_basic_student
on public.profiles
for update
to authenticated
using (auth.uid() = user_id and role = 'student')
with check (
  auth.uid() = user_id
  and role = 'student'
  and suspended_until is null
  and owner_privileges_suspended = false
);

create policy profiles_update_owner
on public.profiles
for update
to authenticated
using (public.is_owner())
with check (public.is_owner());

-- Public content and Test IDs
create policy questions_select_public
on public.questions
for select
to anon, authenticated
using (true);

create policy questions_staff_insert
on public.questions
for insert
to authenticated
with check (public.is_admin());

create policy questions_staff_update
on public.questions
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy question_versions_staff_all
on public.question_versions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy blueprint_versions_select_authenticated
on public.blueprint_versions
for select
to authenticated
using (true);

create policy blueprint_versions_staff_all
on public.blueprint_versions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy test_ids_select_public
on public.test_ids
for select
to anon, authenticated
using (true);

create policy test_ids_insert_authenticated
on public.test_ids
for insert
to authenticated
with check (auth.uid() is not null and (created_by is null or created_by = auth.uid()));

create policy question_reports_insert_authenticated
on public.question_reports
for insert
to authenticated
with check (reporter_id = auth.uid());

create policy question_reports_select_own
on public.question_reports
for select
to authenticated
using (reporter_id = auth.uid());

create policy question_reports_staff_select
on public.question_reports
for select
to authenticated
using (public.is_admin());

create policy question_reports_staff_update
on public.question_reports
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- User-private data
create policy user_question_status_own_all
on public.user_question_status
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy user_preferences_own_all
on public.user_preferences
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy user_test_history_own_all
on public.user_test_history
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy user_topic_stats_own_all
on public.user_topic_stats
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy user_active_sessions_own_all
on public.user_active_sessions
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy user_notifications_select_own
on public.user_notifications
for select
to authenticated
using (auth.uid() = user_id);

create policy user_notifications_update_own_read_state
on public.user_notifications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy user_notifications_staff_insert
on public.user_notifications
for insert
to authenticated
with check (public.is_owner());

create policy billing_customers_select_own
on public.billing_customers
for select
to authenticated
using (auth.uid() = user_id);

create policy subscriptions_select_own
on public.subscriptions
for select
to authenticated
using (auth.uid() = user_id);

create policy account_deletion_requests_insert_own
on public.account_deletion_requests
for insert
to authenticated
with check (auth.uid() = user_id);

create policy account_deletion_requests_select_own
on public.account_deletion_requests
for select
to authenticated
using (auth.uid() = user_id);

create policy account_deletion_requests_update_own
on public.account_deletion_requests
for update
to authenticated
using (auth.uid() = user_id and status in ('Requested', 'Final warning sent'))
with check (auth.uid() = user_id and status in ('Requested', 'Final warning sent', 'Cancelled', 'Completed'));

create policy account_deletion_requests_staff_select
on public.account_deletion_requests
for select
to authenticated
using (public.is_admin());

-- Staff-only records
create policy admin_audit_logs_staff_select
on public.admin_audit_logs
for select
to authenticated
using (public.is_admin());

create policy admin_access_links_staff_insert
on public.admin_access_links
for insert
to authenticated
with check (public.is_owner());

create policy admin_access_links_owner_select
on public.admin_access_links
for select
to authenticated
using (public.is_owner());

create policy name_reviews_staff_all
on public.name_reviews
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy banned_terms_staff_all
on public.banned_terms
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy notification_broadcasts_staff_select
on public.notification_broadcasts
for select
to authenticated
using (public.is_admin());

create policy notification_broadcasts_staff_insert
on public.notification_broadcasts
for insert
to authenticated
with check (public.is_admin());

create policy governance_votes_owner_all
on public.governance_votes
for all
to authenticated
using (public.is_owner())
with check (public.is_owner());

create policy governance_ballots_owner_all
on public.governance_ballots
for all
to authenticated
using (public.is_owner())
with check (public.is_owner());

create policy duplicate_question_reviews_staff_all
on public.duplicate_question_reviews
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Generation tables. Queue and batch ledgers are intentionally server-only.
-- Generated candidates are visible to staff for review/publish workflows.
create policy generated_question_candidates_staff_select
on public.generated_question_candidates
for select
to authenticated
using (public.is_admin());

create policy generated_question_candidates_staff_update
on public.generated_question_candidates
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Team accounts
create policy teams_member_select
on public.teams
for select
to authenticated
using (public.current_team_role(id) is not null or created_by = auth.uid());

create policy teams_authenticated_insert
on public.teams
for insert
to authenticated
with check (auth.uid() is not null and created_by = auth.uid());

create policy teams_admin_update
on public.teams
for update
to authenticated
using (public.can_admin_team(id))
with check (public.can_admin_team(id));

create policy team_memberships_member_select
on public.team_memberships
for select
to authenticated
using (
  public.can_manage_team(team_id)
  or user_id = auth.uid()
  or lower(email) = lower(auth.jwt() ->> 'email')
);

create policy team_memberships_manager_insert
on public.team_memberships
for insert
to authenticated
with check (
  public.can_admin_team(team_id)
  or (
    public.can_manage_team(team_id)
    and role = 'student'
  )
  or exists (
    select 1
    from public.teams t
    where t.id = team_id
      and t.created_by = auth.uid()
  )
);

create policy team_memberships_manager_update
on public.team_memberships
for update
to authenticated
using (
  public.can_admin_team(team_id)
  or (
    public.can_manage_team(team_id)
    and role = 'student'
  )
)
with check (
  public.can_admin_team(team_id)
  or (
    public.can_manage_team(team_id)
    and role = 'student'
  )
);

create policy team_groups_member_select
on public.team_groups
for select
to authenticated
using (public.current_team_role(team_id) is not null);

create policy team_groups_manager_all
on public.team_groups
for all
to authenticated
using (public.can_manage_team(team_id))
with check (public.can_manage_team(team_id));

create policy team_group_members_member_select
on public.team_group_members
for select
to authenticated
using (
  exists (
    select 1
    from public.team_groups groups
    where groups.id = group_id
      and public.current_team_role(groups.team_id) is not null
  )
);

create policy team_group_members_manager_all
on public.team_group_members
for all
to authenticated
using (
  exists (
    select 1
    from public.team_groups groups
    where groups.id = group_id
      and public.can_manage_team(groups.team_id)
  )
)
with check (
  exists (
    select 1
    from public.team_groups groups
    where groups.id = group_id
      and public.can_manage_team(groups.team_id)
  )
);

create policy team_invites_manager_all
on public.team_invites
for all
to authenticated
using (public.can_manage_team(team_id))
with check (public.can_manage_team(team_id));

create policy team_assignments_member_select
on public.team_assignments
for select
to authenticated
using (public.current_team_role(team_id) is not null);

create policy team_assignments_manager_all
on public.team_assignments
for all
to authenticated
using (public.can_manage_team(team_id))
with check (public.can_manage_team(team_id));

create policy team_assignment_recipients_visible_to_manager_or_student
on public.team_assignment_recipients
for select
to authenticated
using (
  exists (
    select 1
    from public.team_assignments assignments
    where assignments.id = assignment_id
      and public.can_manage_team(assignments.team_id)
  )
  or exists (
    select 1
    from public.team_memberships memberships
    where memberships.id = membership_id
      and memberships.user_id = auth.uid()
  )
);

create policy team_assignment_recipients_manager_all
on public.team_assignment_recipients
for all
to authenticated
using (
  exists (
    select 1
    from public.team_assignments assignments
    where assignments.id = assignment_id
      and public.can_manage_team(assignments.team_id)
  )
)
with check (
  exists (
    select 1
    from public.team_assignments assignments
    where assignments.id = assignment_id
      and public.can_manage_team(assignments.team_id)
  )
);

create policy team_assignment_attempts_visible_to_manager_or_student
on public.team_assignment_attempts
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.team_assignment_recipients recipients
    join public.team_assignments assignments on assignments.id = recipients.assignment_id
    where recipients.id = recipient_id
      and public.can_manage_team(assignments.team_id)
  )
);

create policy team_assignment_attempts_student_insert
on public.team_assignment_attempts
for insert
to authenticated
with check (user_id = auth.uid());

create policy team_assignment_attempts_student_update
on public.team_assignment_attempts
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Grants mirror the RLS model: browser roles only receive table privileges for
-- data they can legitimately touch. Server-only ledgers are left to service_role
-- Edge Functions and trusted RPCs.
grant usage on schema public to anon, authenticated, service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

grant select on public.questions, public.test_ids to anon;

grant select, insert on public.profiles to authenticated;
grant update(display_name, phone) on public.profiles to authenticated;
grant select, insert, update on public.questions to authenticated;
grant select, insert, update, delete on public.question_versions to authenticated;
grant select, insert, update, delete on public.blueprint_versions to authenticated;
grant select, insert on public.test_ids to authenticated;
grant select, insert, update on public.question_reports to authenticated;

grant select, insert, update, delete on public.user_question_status to authenticated;
grant select, insert, update, delete on public.user_preferences to authenticated;
grant select, insert, update, delete on public.user_test_history to authenticated;
grant select, insert, update, delete on public.user_topic_stats to authenticated;
grant select, insert, update, delete on public.user_active_sessions to authenticated;
grant select on public.user_notifications to authenticated;
grant update(read_at) on public.user_notifications to authenticated;
grant select on public.billing_customers, public.subscriptions to authenticated;
grant select, insert on public.account_deletion_requests to authenticated;

grant select on public.admin_audit_logs to authenticated;
grant select, insert, update on public.admin_access_links to authenticated;
grant select, insert, update on public.name_reviews to authenticated;
grant select, insert, update, delete on public.banned_terms to authenticated;
grant select, insert, update on public.notification_broadcasts to authenticated;
grant select, insert, update on public.governance_votes to authenticated;
grant select, insert on public.governance_ballots to authenticated;
grant select, insert, update on public.duplicate_question_reviews to authenticated;

grant select, insert, update on public.teams to authenticated;
grant select, insert, update, delete on public.team_memberships to authenticated;
grant select, insert, update, delete on public.team_groups to authenticated;
grant select, insert, update, delete on public.team_group_members to authenticated;
grant select, insert, update on public.team_invites to authenticated;
grant select, insert, update on public.team_assignments to authenticated;
grant select, insert, update on public.team_assignment_recipients to authenticated;
grant select, insert, update on public.team_assignment_attempts to authenticated;

grant select, update on public.generated_question_candidates to authenticated;
grant usage, select on all sequences in schema public to authenticated;

revoke all on public.generation_queue_v3 from anon, authenticated;
revoke all on public.deca_batch_jobs from anon, authenticated;
revoke all on public.stripe_webhook_events from anon, authenticated;

grant execute on function public.current_user_role() to anon, authenticated, service_role;
grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.is_owner() to anon, authenticated, service_role;
grant execute on function public.write_admin_audit(text, text, text, text, jsonb) to authenticated, service_role;
grant execute on function public.current_team_role(uuid) to authenticated, service_role;
grant execute on function public.can_admin_team(uuid) to authenticated, service_role;
grant execute on function public.can_manage_team(uuid) to authenticated, service_role;
grant execute on function public.accept_team_invite(text) to authenticated, service_role;
grant execute on function public.get_active_owner_count() to authenticated, service_role;
grant execute on function public.set_own_owner_privileges_suspended(boolean) to authenticated, service_role;
grant execute on function public.publish_generated_question(uuid) to authenticated, service_role;

revoke execute on function public.build_deca_batch_jsonl(integer) from public;
revoke execute on function public.insert_generated_questions(text, jsonb) from public;
grant execute on function public.build_deca_batch_jsonl(integer) to service_role;
grant execute on function public.insert_generated_questions(text, jsonb) to service_role;
