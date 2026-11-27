-- Reopen an unfinished run once its temporarily empty category has inventory again.
create or replace function public.get_infinite_run(p_run uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
declare r private.infinite_runs; next_question jsonb;
begin
  select * into r from private.infinite_runs where id=p_run and user_id=auth.uid();
  if not found or private.account_erasure_blocked(auth.uid()) then raise insufficient_privilege; end if;
  if r.finished_at is null and r.question is null and private.has_paid_activity_access(r.user_id) then
    select * into r from private.infinite_runs where id=p_run and user_id=auth.uid() for update;
    if not found then raise insufficient_privilege; end if;
    if r.finished_at is null and r.question is null then
      next_question:=private.pick_infinite_question(r);
      if next_question is not null then
        update private.infinite_runs set question=next_question where id=r.id returning * into r;
      end if;
    end if;
  end if;
  return private.infinite_state(r);
end;
$$;
