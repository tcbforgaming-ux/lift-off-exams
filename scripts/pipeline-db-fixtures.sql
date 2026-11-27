-- Test-only fault injection. The marked disposable runner installs and removes
-- these objects; they are NOT migrations and never run against a hosted target.
create table public.stabilization_pipeline_faults(job_id uuid primary key, kind text not null);
alter table public.stabilization_pipeline_faults enable row level security;
revoke all on public.stabilization_pipeline_faults from public, anon, authenticated;
grant all on public.stabilization_pipeline_faults to service_role;
create function private.stabilization_pipeline_fault() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
declare fault text;
begin
  select kind into fault from public.stabilization_pipeline_faults where job_id=new.batch_job_id;
  if tg_table_name='generation_output_lines' then
    if fault='line' or (fault='quarantine' and new.outcome='Failed') then
      raise exception 'Synthetic local persistence fault' using errcode='PT503';
    end if;
  elsif fault='candidate' then
    raise exception 'Synthetic local persistence fault' using errcode='PT503';
  end if;
  return new;
end;
$$;
create trigger stabilization_line_fault before insert on public.generation_output_lines
  for each row execute function private.stabilization_pipeline_fault();
create trigger stabilization_candidate_fault before insert on public.generated_question_candidates
  for each row execute function private.stabilization_pipeline_fault();
