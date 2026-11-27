-- Prevent a stale worker from omitting a registered provider output/error file.
do $$
declare routine regprocedure:='public.reconcile_generation_output(uuid,text,integer)'::regprocedure;
  definition text; original text:= 'perform set_config(''liftoff.import_writer'',job.id::text,true);';
begin
  definition:=pg_get_functiondef(routine);
  if strpos(definition,original)=0 then raise exception 'Unexpected reconciliation body'; end if;
  execute replace(definition,original,$guard$
    if job.metadata ? 'output_sources' and (
      p_output_file_id is distinct from (job.metadata->'output_sources'->0->>'file_id')
      or p_record_count <> (select sum((s->>'record_count')::integer) from jsonb_array_elements(job.metadata->'output_sources') s)
    ) then
      raise exception 'Reconciliation differs from registered sources' using errcode='PT409';
    end if;
    if job.metadata->>'output_ledger_version' is distinct from '1' and job.import_offset>p_record_count then
      raise exception 'Legacy checkpoint exceeds available output; review required' using errcode='PT409';
    end if;
    perform set_config('liftoff.import_writer',job.id::text,true);
  $guard$);
end;
$$;
