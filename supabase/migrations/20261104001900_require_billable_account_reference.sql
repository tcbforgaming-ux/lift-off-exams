do $$
declare definition text:=pg_get_functiondef('private.require_erasure_prerequisites(uuid)'::regprocedure);
  anchor text:=$a$  perform private.require_account_owner_successor(p_user);$a$;
begin
  if strpos(definition,anchor)=0 then raise exception 'Unexpected erasure prerequisites'; end if;
  execute replace(definition,anchor,$r$  perform private.require_account_owner_successor(p_user);
  if exists (select 1 from public.subscriptions where user_id=p_user
    and status not in ('inactive','canceled','cancelled','incomplete_expired')
    and nullif(btrim(stripe_subscription_id),'') is null)
  then raise exception 'The active subscription has no provider reference.'; end if;$r$);
end;
$$;
