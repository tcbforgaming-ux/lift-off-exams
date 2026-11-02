-- Conflict failures must be explicit HTTP 409 responses, not transaction retry
-- errors (40001), which PostgREST may retry until its transaction timeout.
do $$
declare routine regprocedure; source text;
begin
  foreach routine in array array[
    'private.protect_generation_progress()'::regprocedure,
    'public.commit_generation_output_line(uuid,text,integer,integer,text,uuid,jsonb,text)'::regprocedure,
    'public.reconcile_generation_output(uuid,text,integer)'::regprocedure
  ] loop
    source:=pg_get_functiondef(routine);
    execute replace(source,'''40001''','''PT409''');
  end loop;
end;
$$;

-- A completed provider batch can contain both output and error files. Preserve
-- the legacy output-file prefix; error-file lines follow it. This immutable
-- source map resolves every global ordinal to its actual file/physical line.
create function public.register_generation_output_sources(p_batch_job_id uuid,p_sources jsonb)
returns void language plpgsql security definer
set search_path=pg_catalog,public,pg_temp as $$
declare job public.deca_batch_jobs%rowtype; item jsonb; total integer:=0; files text[]:='{}';
begin
  perform private.assert_server_context();
  if jsonb_typeof(p_sources) is distinct from 'array' or jsonb_array_length(p_sources) not between 1 and 2 then
    raise exception 'Invalid bounded source manifest' using errcode='22023';
  end if;
  for item in select * from jsonb_array_elements(p_sources) loop
    if length(coalesce(item->>'file_id','')) not between 1 and 256
      or coalesce(item->>'record_count','') !~ '^[0-9]{1,5}$' then
      raise exception 'Invalid source identity/count' using errcode='22023';
    end if;
    total:=total+(item->>'record_count')::integer;
    files:=array_append(files,item->>'file_id');
  end loop;
  if total>10000 or cardinality(files)<>(select count(distinct f) from unnest(files) f) then
    raise exception 'Output sources exceed bounds or repeat' using errcode='22023';
  end if;
  select * into strict job from public.deca_batch_jobs where id=p_batch_job_id for update;
  perform set_config('liftoff.import_writer',job.id::text,true);
  if job.metadata ? 'output_sources' and job.metadata->'output_sources'<>p_sources then
    raise exception 'Output source manifest changed' using errcode='PT409';
  end if;
  if job.metadata->>'output_ledger_version'='1' and not(job.metadata ? 'output_sources') then
    if cardinality(files)<>1 or files[1]<>job.output_file_id or total<>(job.metadata->>'output_record_count')::integer then
      raise exception 'Existing output ledger requires source-manifest review' using errcode='PT409';
    end if;
  end if;
  update public.deca_batch_jobs set metadata=metadata || jsonb_build_object('output_sources',p_sources) where id=job.id;
end;
$$;
revoke all on function public.register_generation_output_sources(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.register_generation_output_sources(uuid,jsonb) to service_role;
