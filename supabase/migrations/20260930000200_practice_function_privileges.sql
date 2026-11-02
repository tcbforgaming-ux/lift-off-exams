-- Hosted projects may have default EXECUTE grants to anon/authenticated in
-- addition to PUBLIC. Revoke all inherited/default client grants explicitly.
revoke all on function public.snapshot_practice_settings() from public, anon, authenticated, service_role;
revoke all on function public.enforce_practice_deadline() from public, anon, authenticated, service_role;
revoke all on function public.enforce_practice_clock() from public, anon, authenticated, service_role;
revoke all on function public.clamp_practice_result_duration() from public, anon, authenticated, service_role;
revoke all on function public.generate_custom_practice(uuid,text,integer,text[],text[],integer,boolean,boolean,text,text) from public, anon, authenticated, service_role;
revoke all on function public.get_practice_session_settings(uuid) from public, anon, authenticated, service_role;
revoke all on function public.get_practice_feedback(uuid,uuid) from public, anon, authenticated, service_role;
grant execute on function public.generate_custom_practice(uuid,text,integer,text[],text[],integer,boolean,boolean,text,text) to authenticated;
grant execute on function public.get_practice_session_settings(uuid) to authenticated;
grant execute on function public.get_practice_feedback(uuid,uuid) to authenticated;
