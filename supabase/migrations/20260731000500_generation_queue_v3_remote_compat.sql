-- Compatibility hardening for existing remote generation_queue_v3 tables.
-- Some prototype Supabase projects already had generation_queue_v3 before the
-- production rebuild migrations. This keeps the Milestone 5 Edge Functions and
-- RPCs compatible with those tables without dropping or recreating queue data.

alter table public.generation_queue_v3
add column if not exists status text;

update public.generation_queue_v3
set status = case
  when (
    coalesce(scenario_needed, 0)
    + coalesce(definition_needed, 0)
    + coalesce(fill_needed, 0)
    + coalesce(all_except_needed, 0)
  ) > 0 then 'queued'
  else 'complete'
end
where status is null;

alter table public.generation_queue_v3
alter column status set default 'queued',
alter column status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'generation_queue_v3_status_check'
      and conrelid = 'public.generation_queue_v3'::regclass
  ) then
    alter table public.generation_queue_v3
    add constraint generation_queue_v3_status_check
    check (status in ('queued', 'locked', 'complete', 'paused', 'failed'));
  end if;
end;
$$;

alter table public.generation_queue_v3
add column if not exists locked_by_batch_id uuid,
add column if not exists locked_at timestamptz,
add column if not exists last_error text,
add column if not exists partition_keys jsonb;

update public.generation_queue_v3
set partition_keys = jsonb_build_array(partition_key)
where partition_keys is null;

alter table public.generation_queue_v3
alter column partition_keys set default '[]'::jsonb,
alter column partition_keys set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'generation_queue_v3_partition_keys_array_check'
      and conrelid = 'public.generation_queue_v3'::regclass
  ) then
    alter table public.generation_queue_v3
    add constraint generation_queue_v3_partition_keys_array_check
    check (jsonb_typeof(partition_keys) = 'array' and jsonb_array_length(partition_keys) > 0);
  end if;
end;
$$;

create index if not exists generation_queue_v3_status_idx
on public.generation_queue_v3(status);

create index if not exists generation_queue_v3_priority_idx
on public.generation_queue_v3(priority, created_at);

create index if not exists generation_queue_v3_locked_batch_idx
on public.generation_queue_v3(locked_by_batch_id)
where locked_by_batch_id is not null;

create index if not exists generation_queue_v3_partition_keys_idx
on public.generation_queue_v3 using gin(partition_keys);
