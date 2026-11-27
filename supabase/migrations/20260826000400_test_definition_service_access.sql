-- Milestone 6 created this table after the baseline service-role grants.
-- Keep browser access read-only while allowing trusted local/server fixture and
-- maintenance operations to manage immutable membership transactionally.
grant select, insert, update, delete
on public.test_definition_questions
to service_role;
