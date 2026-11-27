-- Read-only preflight. Safe to run before the safety-hardening migration.
select
  coalesce(generation_status, 'pre-milestone-6') as generation_status,
  count(*) as test_id_count
from public.test_ids
group by coalesce(generation_status, 'pre-milestone-6')
order by generation_status;

-- Run after 20260826000200_test_id_safety_hardening.sql.
select
  generated.id as legacy_test_id,
  generated.created_at,
  generated.category,
  generated.question_count,
  generated.blueprint_snapshot,
  count(membership.question_id)::integer as persisted_membership_count,
  resolution.resolution_status,
  resolution.replacement_test_id
from public.test_ids generated
left join public.test_definition_questions membership
  on membership.test_definition_id = generated.definition_id
left join public.legacy_test_id_resolutions resolution
  on resolution.legacy_test_id = generated.id
where generated.generation_status in ('Legacy', 'Retired')
group by generated.id, resolution.resolution_status, resolution.replacement_test_id
order by generated.created_at, generated.id;
