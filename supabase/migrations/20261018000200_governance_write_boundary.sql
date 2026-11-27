-- Direct ballot/vote writes could forge quorum or mutate closed votes. Preserve
-- owner read policies and every existing governance rule; write through the
-- transactional, actor-checking SECURITY DEFINER RPCs only.
do $$
declare relation_name text; columns text;
begin
  foreach relation_name in array array['governance_votes','governance_ballots'] loop
    execute format('revoke insert, update, delete, truncate, references, trigger on public.%I from public, anon, authenticated', relation_name);
    select string_agg(quote_ident(attname), ', ') into columns from pg_attribute
      where attrelid = format('public.%I',relation_name)::regclass and attnum > 0 and not attisdropped;
    execute format('revoke insert (%s), update (%s), references (%s) on public.%I from public, anon, authenticated', columns, columns, columns, relation_name);
  end loop;
end;
$$;
