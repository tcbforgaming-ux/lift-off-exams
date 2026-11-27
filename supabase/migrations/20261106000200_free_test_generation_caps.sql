-- Paid generation is a subscription benefit, not a platform staff permission.
create function private.enforce_free_test_generation_caps(p_actor uuid,p_count integer,p_tags integer)
returns void language plpgsql stable set search_path=pg_catalog,pg_temp as $$
begin
  if p_actor is not null and not private.has_paid_activity_access(p_actor) then
    if p_count>40 then
      raise invalid_parameter_value using message='Free Test generation is limited to 40 questions.';
    end if;
    if p_tags>3 then
      raise invalid_parameter_value using message='Free Test generation is limited to three topic tags.';
    end if;
  end if;
end;
$$;
revoke all on function private.enforce_free_test_generation_caps(uuid,integer,integer)
from public,anon,authenticated,service_role;

do $$
declare
  d text;
  custom_anchor text := '  if not selected_tags <@ allowed_tags then';
  saved_anchor text := '  if p_requested_count <> (canonical_blueprint ->> ''total_questions'')::integer then';
  launch_anchor text := '  n:=case when paid then d.question_count else least(40,d.question_count) end;';
begin
  d:=pg_get_functiondef('public.generate_custom_practice(uuid,text,integer,text[],text[],integer,boolean,boolean,text,text)'::regprocedure);
  if strpos(d,custom_anchor)=0 then raise exception 'Unexpected custom generator'; end if;
  execute replace(d,custom_anchor,
    '  perform private.enforce_free_test_generation_caps(actor,p_question_count,cardinality(selected_tags));'||chr(10)||custom_anchor);

  d:=pg_get_functiondef('private.generate_test_from_saved_rules(uuid,text,integer,text,text,jsonb)'::regprocedure);
  if strpos(d,saved_anchor)=0 then raise exception 'Unexpected saved generator'; end if;
  execute replace(d,saved_anchor,$caps$
  -- Custom generation validates the selected tags before creating its derived blueprint.
  perform private.enforce_free_test_generation_caps(actor_id,p_requested_count,
    case when p_saved_blueprint is null and exists(
      select 1 from public.blueprint_versions b where b.id=p_blueprint_id and b.practice_parent_id is not null
    ) then 0 else (
      select count(distinct t)::integer
      from jsonb_array_elements(canonical_blueprint->'strata') s
      cross join lateral jsonb_array_elements_text(s->'tags') t
    ) end);
$caps$||saved_anchor);

  d:=pg_get_functiondef('private.resolve_test_launch(text,jsonb)'::regprocedure);
  if strpos(d,launch_anchor)=0 then raise exception 'Unexpected Test launch resolver'; end if;
  -- Keep existing approved staff study privileges, but never extend free length.
  execute replace(d,launch_anchor,
    '  n:=case when private.has_paid_activity_access(auth.uid()) then d.question_count else least(40,d.question_count) end;');
  d:=pg_get_functiondef('private.resolve_test_launch(text,jsonb)'::regprocedure);
  if strpos(d,'n>least(d.question_count,250)')=0 then raise exception 'Unexpected Test launch bounds'; end if;
  execute replace(d,'n>least(d.question_count,250)',
    'n>least(d.question_count,case when private.has_paid_activity_access(auth.uid()) then 250 else 40 end)');
end;
$$;
