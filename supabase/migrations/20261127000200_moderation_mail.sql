create function public.claim_moderation_mail() returns jsonb
language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
declare m private.moderation_mail; token uuid:=gen_random_uuid(); result jsonb;
begin
  perform private.assert_server_context();
  select * into m from private.moderation_mail
    where sent_at is null and retry_at<=now() and (leased_until is null or leased_until<now())
    order by retry_at,id limit 1 for update skip locked;
  if not found then return null; end if;
  update private.moderation_mail set lease=token,leased_until=now()+interval '5 minutes',attempts=attempts+1 where id=m.id;
  select jsonb_build_object('id',m.id,'lease',token,'email',u.email,'title',n.title,
    'body',n.message,'path',n.metadata->>'path') into result
    from public.user_notifications n join auth.users u on u.id=m.user_id where n.id=m.id;
  return result;
end;
$$;
create function public.finish_moderation_mail(p_id uuid,p_lease uuid,p_sent boolean) returns boolean
language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
begin
  perform private.assert_server_context();
  update private.moderation_mail set sent_at=case when p_sent then now() end,
    leased_until=null,lease=null,retry_at=now()+interval '5 minutes'
    where id=p_id and lease=p_lease and sent_at is null;
  if not found then return false; end if;
  update public.user_notifications set delivery_status=case when p_sent then 'Sent' else 'Failed' end where id=p_id;
  return true;
end;
$$;
revoke all on function public.claim_moderation_mail(),public.finish_moderation_mail(uuid,uuid,boolean)
from public,anon,authenticated,service_role;
grant execute on function public.claim_moderation_mail(),public.finish_moderation_mail(uuid,uuid,boolean) to service_role;
