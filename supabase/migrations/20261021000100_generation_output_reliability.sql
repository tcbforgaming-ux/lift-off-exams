-- Phase 2: additive, service-only output ledger. Existing RPC signatures,
-- partition metadata, queue targets and candidate normalization stay intact.
create table public.generation_output_lines (
  batch_job_id uuid not null references public.deca_batch_jobs(id) on delete cascade,
  output_file_id text not null check (length(output_file_id) between 1 and 256),
  position integer not null check (position between 0 and 9999),
  source_line integer not null check (source_line > 0),
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  source_custom_id uuid,
  receipt_id uuid references public.generation_import_receipts(id),
  outcome text not null check (outcome in ('Imported','Partial','Duplicate','Failed')),
  failure_code text check (failure_code in (
    'invalid_json','invalid_envelope','missing_custom_id','invalid_custom_id',
    'unknown_custom_id','record_error','missing_model_text','invalid_model_json',
    'question_validation','legacy_failure','duplicate_conflict'
  )),
  imported_count integer not null default 0 check (imported_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  skipped_count integer not null default 0 check (skipped_count >= 0),
  created_at timestamptz not null default now(),
  primary key(batch_job_id, output_file_id, position)
);
alter table public.generation_output_lines enable row level security;
create policy generation_output_lines_staff_read on public.generation_output_lines
  for select to authenticated using (public.is_admin());
revoke all on public.generation_output_lines from public, anon, authenticated;
grant select on public.generation_output_lines to authenticated;
grant select on public.generation_output_lines to service_role;
comment on table public.generation_output_lines is
  'Immutable per-nonblank-line outcomes. Positions are zero based, source_line is physical one based; no raw output or question content is quarantined.';

create function private.protect_generation_progress() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin
  if old.metadata->>'output_ledger_version' = '1'
     and current_setting('liftoff.import_writer',true) is distinct from old.id::text then
    raise exception 'Output-ledger jobs must be updated through reconciliation RPCs' using errcode='40001';
  end if;
  return new;
end;
$$;
revoke all on function private.protect_generation_progress() from public, anon, authenticated;
create trigger deca_batch_jobs_protect_progress before update of
  import_offset, imported_count, failed_count, status, output_file_id, metadata
  on public.deca_batch_jobs for each row execute function private.protect_generation_progress();

create function private.protect_import_receipt() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin
  if (new.import_identity,new.queue_id,new.source_custom_id,new.imported_count,new.failed_count,new.skipped_count,new.status)
     is distinct from
     (old.import_identity,old.queue_id,old.source_custom_id,old.imported_count,old.failed_count,old.skipped_count,old.status) then
    raise exception 'Committed import receipt outcomes are immutable' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function private.protect_import_receipt() from public, anon, authenticated;
create trigger generation_import_receipts_immutable before update on public.generation_import_receipts
  for each row execute function private.protect_import_receipt();

create function public.reconcile_generation_output(
  p_batch_job_id uuid, p_output_file_id text, p_record_count integer
) returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, pg_temp as $$
declare job public.deca_batch_jobs%rowtype; cursor_value integer;
  imported integer; failed integer; skipped integer; bad_lines integer; duplicates integer;
  outcome_value text; status_value text;
begin
  perform private.assert_server_context();
  if p_record_count is null or p_record_count not between 0 and 10000
    or p_output_file_id is null or length(p_output_file_id) not between 1 and 256 then
    raise exception 'Invalid bounded output manifest' using errcode='22023';
  end if;
  select * into strict job from public.deca_batch_jobs where id=p_batch_job_id for update;
  perform set_config('liftoff.import_writer',job.id::text,true);
  if job.metadata->>'output_ledger_version' = '1' then
    if job.output_file_id is distinct from p_output_file_id
      or (job.metadata->>'output_record_count')::integer <> p_record_count then
      raise exception 'Output manifest changed; refusing stale worker' using errcode='40001';
    end if;
  else
    if job.output_file_id is not null and job.output_file_id <> p_output_file_id then
      raise exception 'Output file differs from existing batch' using errcode='40001';
    end if;
    -- Do not reinterpret or regress a legacy checkpoint. Replay its prefix using
    -- the separate ledger cursor, retaining old counters as diagnostic evidence.
    update public.deca_batch_jobs set output_file_id=p_output_file_id,
      metadata=metadata || jsonb_build_object('output_ledger_version',1,
        'output_record_count',p_record_count,'legacy_checkpoint',job.import_offset,
        'legacy_imported_count',job.imported_count,'legacy_failed_count',job.failed_count)
      where id=job.id;
  end if;
  select count(*)::integer,
    count(*) filter(where outcome='Failed')::integer,
    count(*) filter(where outcome='Duplicate')::integer
    into cursor_value,bad_lines,duplicates
    from public.generation_output_lines where batch_job_id=job.id and output_file_id=p_output_file_id;
  -- Each line is accepted strictly in order under this same row lock; count is
  -- therefore exactly the contiguous durable prefix, never a speculative offset.
  select coalesce(sum(r.imported_count),0)::integer,
    coalesce(sum(r.failed_count),0)::integer, coalesce(sum(r.skipped_count),0)::integer
    into imported,failed,skipped from public.generation_import_receipts r
    where r.batch_job_id=job.id or r.import_identity like job.id::text || ':%';
  -- Failed lines without a receipt include malformed/missing/unknown IDs. A
  -- failed receipt already contributes its outcome, and is not counted twice.
  select failed + count(*)::integer into failed from public.generation_output_lines l
    where l.batch_job_id=job.id and l.output_file_id=p_output_file_id
      and l.outcome='Failed' and (l.receipt_id is null or not exists (
        select 1 from public.generation_import_receipts r where r.id=l.receipt_id and r.failed_count>0));
  select skipped + coalesce(sum(l.skipped_count),0)::integer into skipped
    from public.generation_output_lines l where l.batch_job_id=job.id
      and l.output_file_id=p_output_file_id and l.outcome='Duplicate';
  outcome_value := case when cursor_value < p_record_count then 'pending'
    when failed=0 then 'success' when imported>0 or skipped>0 then 'partial' else 'failed' end;
  status_value := case when cursor_value < p_record_count then 'completed'
    when outcome_value='failed' then 'failed' else 'imported' end;
  update public.deca_batch_jobs set
    import_offset=greatest(import_offset,cursor_value), imported_count=imported, failed_count=failed,
    status=status_value, completed_at=case when cursor_value=p_record_count then coalesce(completed_at,now()) else null end,
    error=case when failed>0 then format('Output processing: %s failed outcomes; %s/%s source records processed',failed,cursor_value,p_record_count) else null end,
    metadata=metadata || jsonb_build_object('output_cursor',cursor_value,'import_outcome',outcome_value,
      'output_processed',cursor_value=p_record_count,'output_failed_records',bad_lines,
      'output_duplicate_records',duplicates,'skipped_count',skipped,
      'accounting_scope','durable_receipts_and_output_lines')
    where id=job.id;
  return jsonb_build_object('import_offset',cursor_value,'imported_count',imported,
    'failed_count',failed,'skipped_count',skipped,'status',status_value,
    'import_outcome',outcome_value,'processed_count',cursor_value,'remaining_count',p_record_count-cursor_value);
end;
$$;

create function public.commit_generation_output_line(
  p_batch_job_id uuid, p_output_file_id text, p_position integer,
  p_source_line integer, p_content_hash text, p_custom_id uuid default null,
  p_questions jsonb default null, p_failure_code text default null
) returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, extensions, pg_temp as $$
declare job public.deca_batch_jobs%rowtype; previous public.generation_output_lines%rowtype;
  receipt public.generation_import_receipts%rowtype; prior_line public.generation_output_lines%rowtype;
  cursor_value integer; identity_value text; code_value text:=p_failure_code;
  outcome_value text:='Failed'; imported integer:=0; failed integer:=0; skipped integer:=0;
begin
  perform private.assert_server_context();
  select * into strict job from public.deca_batch_jobs where id=p_batch_job_id for update;
  perform set_config('liftoff.import_writer',job.id::text,true);
  if job.metadata->>'output_ledger_version' is distinct from '1'
    or job.output_file_id is distinct from p_output_file_id then
    raise exception 'Output manifest required or stale worker' using errcode='40001';
  end if;
  select * into previous from public.generation_output_lines
    where batch_job_id=job.id and output_file_id=p_output_file_id and position=p_position;
  if found then
    if previous.content_hash <> p_content_hash then
      raise exception 'Source content changed at committed position' using errcode='40001';
    end if;
    return to_jsonb(previous) || jsonb_build_object('replayed',true);
  end if;
  select count(*)::integer into cursor_value from public.generation_output_lines
    where batch_job_id=job.id and output_file_id=p_output_file_id;
  if p_position is distinct from cursor_value or p_position >= (job.metadata->>'output_record_count')::integer then
    raise exception 'Source position is not the next durable line' using errcode='40001';
  end if;
  identity_value := job.id::text || ':' || p_custom_id::text;
  if p_custom_id is not null then
    select * into receipt from public.generation_import_receipts where import_identity=identity_value;
    select * into prior_line from public.generation_output_lines
      where batch_job_id=job.id and output_file_id=p_output_file_id and source_custom_id=p_custom_id
      order by position limit 1;
  end if;
  if receipt.id is not null then
    if prior_line.batch_job_id is not null then
      if prior_line.content_hash <> p_content_hash then code_value:='duplicate_conflict';
      else outcome_value:='Duplicate'; skipped:=coalesce(jsonb_array_length(p_questions),0); end if;
    else
      -- An ambiguous prior response/checkpoint failure must retain the ORIGINAL
      -- receipt's contribution rather than replacing it with zero/new skips.
      imported:=receipt.imported_count; failed:=receipt.failed_count; skipped:=receipt.skipped_count;
      outcome_value:=case when receipt.status='Failed' then 'Failed' when receipt.status='Partial' then 'Partial' else 'Imported' end;
      if outcome_value='Failed' then code_value:='legacy_failure'; else code_value:=null; end if;
    end if;
  elsif code_value is null then
    if p_custom_id is null then code_value:='missing_custom_id';
    elsif not exists(select 1 from public.generation_queue_v3 q where q.id=p_custom_id
      and (q.locked_by_batch_id=job.id or (q.locked_by_batch_id is null and job.metadata->'custom_ids' ? p_custom_id::text))) then
      code_value:='unknown_custom_id';
    else
      begin
        if p_questions is null or jsonb_typeof(p_questions)<>'array' or jsonb_array_length(p_questions) not between 1 and 1000 then
          raise exception 'Invalid bounded question array';
        end if;
        perform public.insert_generated_questions(p_custom_id,p_questions,identity_value);
        select * into strict receipt from public.generation_import_receipts where import_identity=identity_value;
        if receipt.batch_job_id is null then
          update public.generation_import_receipts set batch_job_id=job.id where id=receipt.id;
          update public.generated_question_candidates set batch_job_id=job.id
            where batch_job_id is null and import_identity like identity_value || ':%';
        end if;
        -- Existing RPC also writes legacy progress. Suppress only those provisional
        -- values inside this transaction; reconciliation owns durable job totals.
        update public.deca_batch_jobs set import_offset=job.import_offset,
          imported_count=job.imported_count, failed_count=job.failed_count where id=job.id;
        imported:=receipt.imported_count; failed:=receipt.failed_count; skipped:=receipt.skipped_count;
        outcome_value:=case when receipt.status='Partial' then 'Partial' else 'Imported' end;
      exception when raise_exception or check_violation or invalid_text_representation or not_null_violation then
        code_value:='question_validation';
      end;
    end if;
  end if;
  if code_value is not null then outcome_value:='Failed'; imported:=0; failed:=1; skipped:=0; end if;
  insert into public.generation_output_lines(batch_job_id,output_file_id,position,source_line,content_hash,
    source_custom_id,receipt_id,outcome,failure_code,imported_count,failed_count,skipped_count)
    values(job.id,p_output_file_id,p_position,p_source_line,p_content_hash,p_custom_id,
      receipt.id,outcome_value,code_value,imported,failed,skipped)
    returning * into previous;
  return to_jsonb(previous) || jsonb_build_object('replayed',false);
end;
$$;

revoke all on function public.reconcile_generation_output(uuid,text,integer) from public, anon, authenticated;
revoke all on function public.commit_generation_output_line(uuid,text,integer,integer,text,uuid,jsonb,text) from public, anon, authenticated;
grant execute on function public.reconcile_generation_output(uuid,text,integer) to service_role;
grant execute on function public.commit_generation_output_line(uuid,text,integer,integer,text,uuid,jsonb,text) to service_role;
