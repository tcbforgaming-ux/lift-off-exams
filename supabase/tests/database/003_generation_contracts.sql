begin;

create extension if not exists pgtap with schema extensions;

select plan(7);

insert into public.generation_queue_v3 (
  partition_key,
  category,
  performance_indicator,
  indicator_code,
  scenario_needed,
  definition_needed,
  fill_needed,
  all_except_needed,
  priority
)
values (
  'Business Administration Core',
  'Business Law',
  'Explain contracts',
  'BL-001',
  1,
  1,
  0,
  0,
  1
);

select ok(
  (select row_count from public.build_deca_batch_jsonl(10) limit 1) = 1,
  'batch builder locks one queued generation row'
);

select is(
  (select status from public.generation_queue_v3 where indicator_code = 'BL-001'),
  'locked',
  'generation row is locked after batch build'
);

select is(
  (select row_count from public.deca_batch_jobs order by created_at desc limit 1),
  1,
  'batch job row count is preserved'
);

select lives_ok(
  $$
    select public.insert_generated_questions(
      'BL-001',
      '[
        {
          "t": "S",
          "q": "Scenario question?",
          "o": ["A", "B", "C", "D"],
          "a": 0,
          "e": "A is correct.",
          "d": "E"
        },
        {
          "t": "D",
          "q": "Definition question?",
          "o": ["A", "B", "C", "D"],
          "a": "optionB",
          "e": "B is correct.",
          "d": "M"
        }
      ]'::jsonb
    )
  $$,
  'insert_generated_questions accepts compact generated payloads'
);

select is(
  (select count(*)::integer from public.generated_question_candidates),
  2,
  'generated questions are imported as review candidates'
);

select is(
  (select correct_option_id from public.generated_question_candidates where question_text = 'Definition question?'),
  'B',
  'optionB answer format is normalized to B'
);

select is(
  (
    select scenario_needed + definition_needed + fill_needed + all_except_needed
    from public.generation_queue_v3
    where indicator_code = 'BL-001'
  ),
  0,
  'generation queue needed counts are decremented'
);

select * from finish();

rollback;
