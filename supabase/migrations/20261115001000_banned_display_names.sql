create function private.display_name_words(p_value text)
returns text language sql immutable strict set search_path=pg_catalog as $$
  select btrim(regexp_replace(lower(p_value),'[^[:alnum:]]+',' ','g'))
$$;

create function private.display_name_denied(p_name text)
returns boolean language sql stable set search_path=pg_catalog,pg_temp as $$
  select exists (
    select 1 from public.banned_terms b
    where b.active and private.display_name_words(b.term)<>''
      and strpos(' '||private.display_name_words(p_name)||' ',
        ' '||private.display_name_words(b.term)||' ')>0
  )
$$;

-- This preflight improves error copy; the profile trigger remains authoritative.
create function public.check_display_name_allowed(p_name text)
returns boolean language sql stable security definer set search_path=pg_catalog,pg_temp as $$
  select length(coalesce(p_name,''))<=120 and not private.display_name_denied(left(p_name,120))
$$;

create function private.enforce_display_name_policy()
returns trigger language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
begin
  if tg_op='UPDATE' then
    if new.display_name is not distinct from old.display_name then return new; end if;
  end if;
  perform pg_advisory_xact_lock_shared(hashtextextended('display-name-policy',0));
  if private.display_name_denied(new.display_name) then
    raise invalid_parameter_value using message='Choose a display name without a restricted word or phrase.';
  end if;
  return new;
end;
$$;
drop trigger profiles_queue_name_review on public.profiles;
create trigger profiles_enforce_display_name_policy
before insert or update of display_name on public.profiles
for each row execute function private.enforce_display_name_policy();

-- Keep legacy name-review records, and make future term changes auditable.
revoke insert,update,delete on public.banned_terms from public,anon,authenticated;
create function public.set_staff_banned_term(p_term text,p_active boolean,p_reason text)
returns text language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
declare term_key text:=private.display_name_words(coalesce(p_term,''));
  reason text:=btrim(coalesce(p_reason,''));
  target uuid;
begin
  if not coalesce(public.is_admin(),false) or private.account_erasure_blocked(auth.uid()) then
    raise insufficient_privilege using message='Staff access required.';
  end if;
  if length(term_key) not between 1 and 80 or length(coalesce(p_term,''))>120
     or length(reason) not between 5 and 1000 or p_active is null then
    raise invalid_parameter_value using message='Provide a term and a moderation reason.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('display-name-policy',0));
  select id into target from public.banned_terms b
    where private.display_name_words(b.term)=term_key order by b.id limit 1;
  if target is null and p_active then
    insert into public.banned_terms(term,active,created_by) values(term_key,true,auth.uid())
      returning id into target;
  elsif target is not null then
    update public.banned_terms b set active=p_active
      where private.display_name_words(b.term)=term_key and b.active is distinct from p_active;
    if not found then return term_key; end if;
  else
    return term_key;
  end if;
  insert into public.admin_audit_logs(actor_user_id,actor_role,action,resource_type,resource_id,reason,new_values)
    values(auth.uid(),public.current_user_role(),
      case when p_active then 'name_rule.activate' else 'name_rule.retire' end,
      'banned_term',target::text,reason,jsonb_build_object('term',term_key,'active',p_active));
  return term_key;
end;
$$;

revoke all on function private.display_name_words(text),private.display_name_denied(text),
  private.enforce_display_name_policy(),public.check_display_name_allowed(text),public.set_staff_banned_term(text,boolean,text)
from public,anon,authenticated,service_role;
grant execute on function public.check_display_name_allowed(text) to anon,authenticated;
grant execute on function public.set_staff_banned_term(text,boolean,text) to authenticated;
