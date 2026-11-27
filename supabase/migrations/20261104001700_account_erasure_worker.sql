-- Test adapters are deliberately restricted to confirmed synthetic recipients.
create table private.account_erasure_fixture_receipts (
  job_id uuid not null references private.account_erasure_jobs(id) on delete cascade,
  operation text not null check(operation in ('warning','billing')),
  payload_hash bytea not null,
  completed_at timestamptz not null default clock_timestamp(),
  primary key(job_id,operation,payload_hash)
);
revoke all on private.account_erasure_fixture_receipts from public,anon,authenticated,service_role;

create or replace function public.prevent_test_result_mutation() returns trigger
language plpgsql set search_path=pg_catalog,pg_temp as $$
begin
  if tg_op='DELETE' and current_user='postgres' and current_setting('app.account_erasure',true)='on'
  then return old; end if;
  raise exception 'Submitted test results are immutable.';
end;
$$;

create or replace function public.prevent_append_only_mutation() returns trigger
language plpgsql set search_path=pg_catalog,pg_temp as $$
begin
  if current_user='postgres' then
    if tg_op='UPDATE' and current_setting('app.account_erasure',true)='on' then return new; end if;
    return old;
  end if;
  raise exception 'Administrative history is append-only.';
end;
$$;

create function private.erase_account_records(p_user uuid,p_email text) returns void
language plpgsql set search_path=pg_catalog,public,pg_temp as $$
declare reports uuid[]; related text[]; phone text;
begin
  perform set_config('app.account_erasure','on',true);
  select coalesce(array_agg(id),'{}') into reports from public.question_reports where reporter_id=p_user;
  select nullif(btrim(p.phone),'') into phone from public.profiles p where user_id=p_user;
  select array_agg(value) into related from (
    select p_user::text as value union all select lower(p_email)
    union all select phone where length(phone)>=7
    union all select unnest(reports)::text
    union all select id::text from public.test_sessions where user_id=p_user
    union all select id from public.test_ids where created_by=p_user
    union all select id::text from private.account_erasure_jobs where user_id=p_user
  ) identifiers where value is not null and value<>'';

  -- Keep event kind and time, not links, reasons, or arbitrary payloads from
  -- related events. The write exception is scoped to this trusted transaction.
  update public.admin_audit_logs a set actor_user_id=null,actor_email=null,actor_role=null,
    resource_id=null,report_id=null,correlation_id=null,reason=null,
    previous_values=null,new_values=null,metadata='{"anonymized":true}'
  where a.actor_user_id=p_user or a.report_id=any(reports) or exists(
    select 1 from unnest(related) r
    where strpos(lower(concat_ws(' ',a.actor_email,a.resource_id,a.reason,a.correlation_id,
      a.metadata::text,a.previous_values::text,a.new_values::text)),lower(r))>0);
  update public.question_versions set report_id=null where report_id=any(reports);
  update public.question_lifecycle_events set actor_user_id=null,reason='Account attribution removed'
    where actor_user_id=p_user;
  update public.question_reports set duplicate_of=null,status='in_review',resolved_at=null,
    resolution_category=null,resolution_message=null,resolution_idempotency_key=null,version=version+1
    where duplicate_of=any(reports) and not (id=any(reports));
  update public.question_reports set duplicate_of=null,status='in_review',resolved_at=null,
    resolution_category=null,resolution_message=null where duplicate_of=any(reports);
  delete from public.question_reports where id=any(reports);

  delete from public.test_result_items i using public.test_results r where i.session_id=r.session_id and r.user_id=p_user;
  delete from public.test_results where user_id=p_user;
  delete from public.test_sessions where user_id=p_user;
  -- Public shared Test IDs stay reproducible; remove private attribution.
  update public.test_ids set created_by=null,idempotency_key=null,request_hash=null where created_by=p_user;
  update public.governance_votes set target_email=null
    where lower(target_email)=lower(p_email) and vote_kind<>'owner_invite';
  -- Invalidate any previously issued invitations to the deleted address.
  update private.owner_invitations set revoked_at=clock_timestamp()
    where consumed_at is null and revoked_at is null and proposal_id in (
      select id from public.governance_votes where lower(target_email)=lower(p_email));
  update public.governance_votes set target_email=null,reason=null,metadata='{}'
    where lower(target_email)=lower(p_email) or target_user_id=p_user or created_by=p_user;
  delete from public.admin_access_links where lower(email)=lower(p_email);
  delete from public.team_invites where lower(email)=lower(p_email);
  delete from auth.users where id=p_user;
  if not found then raise exception 'Auth identity was not removed.'; end if;
  perform set_config('app.account_erasure','off',true);
end;
$$;
revoke all on function private.erase_account_records(uuid,text) from public,anon,authenticated,service_role;

create function private.require_erasure_prerequisites(p_user uuid) returns void
language plpgsql stable set search_path=pg_catalog,public,pg_temp as $$
begin
  perform private.require_account_owner_successor(p_user);
  if to_regclass('storage.objects') is not null and exists (
    select 1 from storage.objects o where to_jsonb(o)->>'owner_id'=p_user::text or to_jsonb(o)->>'owner'=p_user::text
  ) then raise exception 'Storage ownership must be resolved before account deletion.'; end if;
end;
$$;
revoke all on function private.require_erasure_prerequisites(uuid) from public,anon,authenticated,service_role;

create function public.list_due_account_erasure_jobs() returns setof uuid
language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
begin
  perform private.assert_server_context();
  return query select j.id from private.account_erasure_jobs j join auth.users u on u.id=j.user_id
    where lower(u.email) like '%@example.test' and u.email_confirmed_at is not null and (
      j.state='finalizing' or (j.state='pending' and
        (j.warning_sent_at is null and j.warning_due_at<=clock_timestamp() or
         j.warning_sent_at is not null and private.account_erasure_deadline(j)<=clock_timestamp())))
    order by j.requested_at,j.id limit 25;
end;
$$;

create function public.advance_account_erasure(p_job uuid,p_simulate_failure text default null) returns text
language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare j private.account_erasure_jobs; actor uuid; email text; subscription_id text; receipt bytea;
  stamp timestamptz; notification_id uuid;
begin
  perform private.assert_server_context();
  select user_id into actor from private.account_erasure_jobs where id=p_job;
  if actor is not null then perform pg_advisory_xact_lock(hashtextextended('account-erasure:'||actor::text,0)); end if;
  perform pg_advisory_xact_lock(64352884011);
  select * into j from private.account_erasure_jobs where id=p_job for update;
  if not found then return 'not_found'; end if;
  if j.state in ('cancelled','completed') then return j.state; end if;
  select lower(u.email) into email from auth.users u where u.id=j.user_id and u.email_confirmed_at is not null;
  if email is null or email not like '%@example.test' then raise exception 'Only confirmed local fixture accounts are supported.'; end if;
  stamp:=clock_timestamp();

  if j.state='pending' then
    if j.warning_sent_at is null then
      if j.warning_due_at>stamp then return 'waiting'; end if;
      notification_id:=j.warning_id;
      if notification_id is null then
        insert into public.user_notifications(user_id,type,title,message)
        values(j.user_id,'account_deletion_warning','Final account deletion warning',
          'Sign in to recover your account. Permanent deletion is at least seven days after this warning.')
        returning id into notification_id;
        update private.account_erasure_jobs set warning_id=notification_id where id=j.id;
      end if;
      if p_simulate_failure='warning' then
        update public.user_notifications set delivery_status='Failed' where id=notification_id;
        update private.account_erasure_jobs set last_failure='warning' where id=j.id;
        return 'warning_failed';
      end if;
      insert into private.account_erasure_fixture_receipts(job_id,operation,payload_hash)
      values(j.id,'warning',extensions.digest(email,'sha256')) on conflict do nothing;
      update public.user_notifications set delivery_status='Sent' where id=notification_id;
      update private.account_erasure_jobs set warning_sent_at=stamp,last_failure=null where id=j.id;
      return 'warning_sent';
    end if;
    if private.account_erasure_deadline(j)>stamp then return 'waiting'; end if;
    perform private.require_erasure_prerequisites(j.user_id);
    update private.account_erasure_jobs set state='finalizing',last_failure=null where id=j.id;
    return 'claimed';
  end if;

  perform private.require_erasure_prerequisites(j.user_id);
  select s.stripe_subscription_id into subscription_id from public.subscriptions s
    where user_id=j.user_id and status not in ('inactive','canceled','cancelled','incomplete_expired');
  if j.billing_done_at is null then
    if subscription_id is not null then
      receipt:=extensions.digest(subscription_id,'sha256');
      if not exists(select 1 from private.account_erasure_fixture_receipts
        where job_id=j.id and operation='billing' and payload_hash=receipt) then
        if p_simulate_failure='billing' then
          update private.account_erasure_jobs set last_failure='billing' where id=j.id;
          return 'billing_failed';
        end if;
        insert into private.account_erasure_fixture_receipts(job_id,operation,payload_hash) values(j.id,'billing',receipt);
        return 'billing_captured';
      end if;
    end if;
    update public.subscriptions set status='canceled',cancel_at_period_end=false where user_id=j.user_id;
    update private.account_erasure_jobs set billing_done_at=stamp,last_failure=null where id=j.id;
    return 'billing_checkpointed';
  end if;
  if subscription_id is not null then
    update private.account_erasure_jobs set billing_done_at=null,last_failure='billing' where id=j.id;
    return 'billing_changed';
  end if;

  begin
    perform private.erase_account_records(j.user_id,email);
    if p_simulate_failure='finish' then raise exception 'Injected finalization failure'; end if;
    delete from private.account_erasure_jobs where user_id=j.user_id and id<>j.id;
    delete from private.account_erasure_fixture_receipts where job_id=j.id;
    update private.account_erasure_jobs set user_id=null,state='completed',completed_at=clock_timestamp(),last_failure=null
      where id=j.id;
    insert into public.admin_audit_logs(action,resource_type,reason,metadata)
    values('account_erasure.completed','account_lifecycle','Permanent deletion completed','{"anonymized":true}');
  exception when others then
    update private.account_erasure_jobs set last_failure='finish' where id=j.id;
    return 'finish_failed';
  end;
  return 'completed';
end;
$$;
revoke all on function public.list_due_account_erasure_jobs(),public.advance_account_erasure(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.list_due_account_erasure_jobs(),public.advance_account_erasure(uuid,text) to service_role;

create function public.account_lifecycle_allows_actor(p_actor uuid) returns boolean
language plpgsql stable security definer set search_path=pg_catalog,pg_temp as $$
begin
  perform private.assert_server_context();
  return exists(select 1 from auth.users where id=p_actor) and not private.account_erasure_blocked(p_actor);
end;
$$;
revoke all on function public.account_lifecycle_allows_actor(uuid) from public,anon,authenticated,service_role;
grant execute on function public.account_lifecycle_allows_actor(uuid) to service_role;
