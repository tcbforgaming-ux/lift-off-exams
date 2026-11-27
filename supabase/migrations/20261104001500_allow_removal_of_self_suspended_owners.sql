-- Self-suspension preserves ownership recovery rights, even though the
-- compatibility profile role temporarily reads administrator.
do $$
declare definition text:=pg_get_functiondef('public.initiate_owner_removal_vote(uuid,text,timestamptz)'::regprocedure);
  anchor text:=$a$      and role = 'owner'
      and owner_state <> 'unavailable'$a$;
begin
  if strpos(definition,anchor)=0 then raise exception 'Unexpected removal target guard'; end if;
  execute replace(definition,anchor,$r$      and (role = 'owner' or (role = 'admin' and owner_state='self_suspended'))
      and owner_state <> 'unavailable'$r$);
end;
$$;
