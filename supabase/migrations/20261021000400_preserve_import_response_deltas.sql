-- Durable batch totals and per-invocation response deltas are different API
-- contracts. Expose receipt replay explicitly, never infer it from timestamps.
do $$
declare routine regprocedure:='public.commit_generation_output_line(uuid,text,integer,integer,text,uuid,jsonb,text)'::regprocedure;
  definition text;
begin
  definition:=pg_get_functiondef(routine);
  if strpos(definition,'cursor_value integer; identity_value text;')=0 then
    raise exception 'Unexpected line-commit implementation';
  end if;
  definition:=replace(definition,'cursor_value integer; identity_value text;',
    'receipt_was_present boolean:=false; cursor_value integer; identity_value text;');
  definition:=regexp_replace(definition,'where import_identity=identity_value;',
    'where import_identity=identity_value; receipt_was_present:=receipt.id is not null;');
  definition:=replace(definition,'''replayed'',false)',
    '''replayed'',false,''receipt_replayed'',receipt_was_present)');
  execute definition;
end;
$$;
