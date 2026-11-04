do $$
declare definition text; anchor text;
begin
  definition:=pg_get_functiondef('public.cast_owner_removal_vote(uuid,text)'::regprocedure);
  anchor:=$a$      updated_at = now();

  perform public.write_admin_audit($a$;
  if strpos(definition,anchor)=0 then raise exception 'Unexpected removal ballot upsert'; end if;
  definition:=replace(definition,anchor,$r$      updated_at = now()
  where governance_ballots.decision is distinct from excluded.decision
    or governance_ballots.withdrawn_at is not null;

  if found then perform public.write_admin_audit($r$);
  anchor:=$a$  select count(*)::integer
  into approve_count$a$;
  if strpos(definition,anchor)=0 then raise exception 'Unexpected removal audit boundary'; end if;
  definition:=replace(definition,anchor,$r$  end if;

  select count(*)::integer
  into approve_count$r$);
  execute replace(definition,'vote_row.expires_at <= now()','vote_row.expires_at <= clock_timestamp()');

  definition:=pg_get_functiondef('public.set_user_platform_role(uuid,text,text,uuid)'::regprocedure);
  anchor:=$a$  if target_profile.role = 'owner' then$a$;
  if strpos(definition,anchor)=0 then raise exception 'Unexpected role target guard'; end if;
  execute replace(definition,anchor,$r$  if target_profile.owner_state<>'active'
    or (target_profile.suspended_until is not null and target_profile.suspended_until>=now()) then
    raise exception 'Suspended accounts require their dedicated governance workflow.';
  end if;
  if target_profile.role = 'owner' then$r$);

  definition:=pg_get_functiondef('public.act_on_owner_proposal(uuid,text)'::regprocedure);
  execute replace(definition,'v.expires_at<=now()','v.expires_at<=clock_timestamp()');
  definition:=pg_get_functiondef('public.accept_owner_invitation(text)'::regprocedure);
  execute replace(definition,'expires_at>now()','expires_at>clock_timestamp()');
end;
$$;
