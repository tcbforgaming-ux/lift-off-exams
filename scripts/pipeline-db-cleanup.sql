drop trigger if exists stabilization_line_fault on public.generation_output_lines;
drop trigger if exists stabilization_candidate_fault on public.generated_question_candidates;
drop function if exists private.stabilization_pipeline_fault();
drop table if exists public.stabilization_pipeline_faults;
