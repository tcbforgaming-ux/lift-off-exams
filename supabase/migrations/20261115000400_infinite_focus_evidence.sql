-- The evidence already records the graded outcome, independent of the live key.
-- Preserve tag attribution for new answers without rewriting older history.
alter table private.personal_answer_evidence add column focus_tags text[];
create index personal_answer_focus_window_idx on private.personal_answer_evidence
  (user_id,answered_at desc,question_id,source,source_key);

create function private.infinite_focus_evidence_tags(e private.personal_answer_evidence)
returns text[] language sql stable set search_path=pg_catalog,pg_temp as $$
  select coalesce(e.focus_tags,
    case when jsonb_typeof(e.review_snapshot->'tags')='array' then
      array(select jsonb_array_elements_text(e.review_snapshot->'tags'))
    end,
    (select i.tags from public.test_result_items i
      join public.test_results r using(session_id)
      where e.source='test' and r.user_id=e.user_id and i.question_id=e.question_id
        and i.session_id=case when e.source_key ~ '^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$'
          then e.source_key::uuid end),
    (select q.tags from public.questions q where q.id=e.question_id),
    '{}'::text[]);
$$;

create function private.snapshot_infinite_focus_tags() returns trigger
language plpgsql set search_path=pg_catalog,pg_temp as $$
begin
  new.focus_tags:=private.infinite_focus_evidence_tags(new);
  return new;
end;
$$;
create trigger snapshot_infinite_focus_tags before insert on private.personal_answer_evidence
for each row execute function private.snapshot_infinite_focus_tags();
revoke all on function private.infinite_focus_evidence_tags(private.personal_answer_evidence),
  private.snapshot_infinite_focus_tags() from public,anon,authenticated,service_role;
