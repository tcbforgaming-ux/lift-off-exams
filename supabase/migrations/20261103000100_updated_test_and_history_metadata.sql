-- Re-generate against the stored, approved blueprint version and current eligible
-- content. The original ID and ordered membership are never changed.
create function public.generate_updated_test(p_test_id text, p_idempotency_key text)
returns jsonb language plpgsql security definer
set search_path=pg_catalog,public,extensions,pg_temp as $$
declare source public.test_ids%rowtype; result record;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  select * into source from public.test_ids where id=upper(btrim(p_test_id)) and generation_status='Ready';
  if not found then raise exception 'Ready Test ID not found.'; end if;
  if not public.has_premium_explanation_access(auth.uid()) and source.question_count>40 then
    raise exception 'Free generation is limited to 40 questions. Create a shorter test instead.';
  end if;
  select * into result from public.generate_test_from_blueprint(source.blueprint_version_id,
    source.blueprint_snapshot->>'version',source.question_count,null,p_idempotency_key);
  return to_jsonb(result);
end;
$$;
revoke all on function public.generate_updated_test(text,text) from public,anon,authenticated,service_role;
grant execute on function public.generate_updated_test(text,text) to authenticated;

-- Keep the existing history signature stable. Add bounded snapshot-derived
-- metadata in a new RPC instead of reading the editable question repository.
create function public.get_test_history_metadata(p_page_size integer default 20,
 p_cursor_activity_at timestamptz default null,p_cursor_session_id uuid default null,p_status text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare result jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(h)||jsonb_build_object(
    'difficulties',(select coalesce(jsonb_agg(d order by d),'[]'::jsonb) from
       (select distinct difficulty d from public.test_session_questions where session_id=h.session_id) x),
    'topic_tags',(select coalesce(jsonb_agg(t order by t),'[]'::jsonb) from
       (select distinct unnest(tags) t from public.test_session_questions where session_id=h.session_id) x)
    ) order by h.last_activity_at desc,h.session_id desc),'[]'::jsonb) into result
  from public.get_test_history(p_page_size,p_cursor_activity_at,p_cursor_session_id,p_status) h;
  return result;
end;
$$;
revoke all on function public.get_test_history_metadata(integer,timestamptz,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.get_test_history_metadata(integer,timestamptz,uuid,text) to authenticated;
