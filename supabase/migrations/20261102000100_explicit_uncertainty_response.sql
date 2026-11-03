-- Explicit uncertainty is an answered, incorrect response, never an omitted
-- answer or an extra correct-answer option. Existing immutable results stay put.
alter table public.test_session_answers
  drop constraint test_session_answers_selected_option_id_check,
  add constraint test_session_answers_selected_option_id_check
    check (selected_option_id in ('A','B','C','D','UNKNOWN'));
alter table public.test_result_items
  drop constraint test_result_items_selected_option_id_check,
  add constraint test_result_items_selected_option_id_check
    check (selected_option_id in ('A','B','C','D','UNKNOWN'));

-- Preserve ownership, session-version locking, deadlines, audit boundaries,
-- original signature and EXECUTE grants; only extend the validated answer domain.
do $$
declare routine regprocedure := 'public.save_test_session_answer(uuid,uuid,text,bigint)'::regprocedure;
  definition text;
  old_guard text := 'if normalized_option not in (''A'', ''B'', ''C'', ''D'') then';
begin
  definition := pg_get_functiondef(routine);
  if strpos(definition, old_guard) = 0 then
    raise exception 'Unexpected answer validation implementation; review required';
  end if;
  definition := replace(definition, old_guard,
    'if normalized_option not in (''A'', ''B'', ''C'', ''D'', ''UNKNOWN'') then');
  definition := replace(definition, 'Selected option must be A, B, C, or D.',
    'Selected option must be A, B, C, D, or UNKNOWN.');
  execute definition;
end;
$$;
comment on column public.test_session_answers.selected_option_id is
  'A-D selection or explicit UNKNOWN uncertainty. Absence of an answer row means unanswered.';
