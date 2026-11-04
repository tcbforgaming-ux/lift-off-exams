-- Use the same type vocabulary as the preserved generation importer.
do $$
declare definition text; anchor text:=$anchor$coalesce(c->>'question_type','') not in ('S','D','F','A','Scenario','Definition','Fill-in-the-Blank','All Except','Fill in the Blank','All of the Above')$anchor$;
begin
  definition:=pg_get_functiondef('private.validate_review_content(jsonb)'::regprocedure);
  if strpos(definition,anchor)=0 then raise exception 'Unexpected candidate validator'; end if;
  execute replace(definition,anchor,'public.normalize_generated_question_type(c->>''question_type'') is null');
end;
$$;
-- Staff publication must pass a trusted operation, not a direct table insert.
revoke insert on public.questions from public,anon,authenticated;
