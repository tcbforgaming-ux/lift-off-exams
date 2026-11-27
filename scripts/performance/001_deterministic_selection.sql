-- Local-only representative probe. Fixture rows are rolled back.
begin;

insert into public.questions (
  id,
  partition_key,
  performance_indicator,
  question_type,
  question_text,
  options,
  correct_option_id,
  explanation,
  difficulty,
  tags,
  lifecycle_state
)
select
  ('99000000-0000-0000-0000-' || lpad(item::text, 12, '0'))::uuid,
  'Marketing',
  'PERF:001',
  'Scenario',
  'Performance fixture ' || item,
  '[{"id":"A","text":"A"},{"id":"B","text":"B"},{"id":"C","text":"C"},{"id":"D","text":"D"}]'::jsonb,
  'A',
  'Performance fixture explanation',
  'Easy',
  array['Performance'],
  'Active'
from generate_series(1, 80000) item;

analyze public.questions;

explain (analyze, buffers, settings, summary)
select question.id
from public.questions question
where question.lifecycle_state = 'Active'
  and question.partition_key = 'Marketing'
  and question.question_type = 'Scenario'
  and question.difficulty = 'Easy'
  and question.tags @> array['Performance']::text[]
order by
  encode(
    extensions.digest(
      convert_to(
        'sha256-strata-v1' || chr(31) || 'performance-seed' || chr(31) ||
        'marketing-easy' || chr(31) || question.id::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  ),
  question.id
limit 250;

rollback;
