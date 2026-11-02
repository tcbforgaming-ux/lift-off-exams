-- TEST FIXTURE ONLY. Executed solely on the marked disposable local stack,
-- before the stabilization migration. Simulates named AND default API grants.
alter default privileges for role postgres grant execute on functions to anon, authenticated;
alter default privileges for role postgres in schema public grant execute on functions to anon, authenticated;
alter default privileges for role postgres grant all on tables to anon, authenticated;
alter default privileges for role postgres in schema public grant all on tables to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;
grant all on public.profiles, public.admin_audit_logs to anon, authenticated;
grant update(role, account_tier), insert(user_id, role) on public.profiles to anon, authenticated;
grant insert(action), update(action) on public.admin_audit_logs to anon, authenticated;
grant all on public.governance_votes, public.governance_ballots to anon, authenticated;
grant insert(owner_user_id), update(decision) on public.governance_ballots to anon, authenticated;

-- Faithful signature/SECURITY DEFINER/grant simulation, NOT the unknown hosted
-- implementation. No real staging schema/data is guessed or imported.
create table public.stabilization_staging_probe (id integer);
alter table public.stabilization_staging_probe enable row level security;
create function public.import_staging_generation_queue() returns void
language sql security definer set search_path = public as $$
  insert into public.stabilization_staging_probe values (1);
$$;
grant execute on function public.import_staging_generation_queue() to anon, authenticated;
