-- Read-only. Run as the database owner on the marked local stack.
with catalog as materialized (
  select e.*, counts.active_versions, counts.draft_versions, a.version as active_version,a.id as active_id,
    coalesce(a.distribution=e.distribution and a.total_questions=e.total_questions and
      a.category=e.category and a.level=e.level and a.version=e.version,false) as exact,
    case when counts.active_versions=1 and a.distribution=e.distribution
      and a.total_questions=e.total_questions and a.category=e.category and a.level=e.level
      then private.staff_blueprint_inventory(private.canonicalize_staff_blueprint(a.id,a.version))
    end as inventory
  from private.deca_v1_expected_blueprints() e
  cross join lateral (
    select count(*) filter(where status='Active') as active_versions,
      count(*) filter(where status='Draft') as draft_versions
    from public.blueprint_versions where blueprint_name=e.blueprint_name and practice_parent_id is null
  ) counts
  left join lateral (
    select b.* from public.blueprint_versions b
    where b.blueprint_name=e.blueprint_name and b.practice_parent_id is null and b.status='Active'
    order by b.id limit 1
  ) a on counts.active_versions=1
)
select c.blueprint_name,c.category,c.level,c.version as expected_version,c.active_version,
  c.id as expected_id,c.active_id,c.total_questions,c.active_versions,c.draft_versions,
  case when c.active_versions>1 then 'duplicate-active'
       when c.active_versions=0 and c.draft_versions>0 then 'draft-only'
       when c.active_versions=0 then 'missing'
       when c.exact then 'exact'
       else 'mismatch' end as catalog_match,
  (t->>'line')::int as prd_line,t->>'topic' as original_topic,t->>'tag' as active_tag,
  (t->>'count')::int as required_questions,
  case when (t->>'count')::int=0 then 0 else (i.value->>'available_up_to_251')::int end as available_up_to_251,
  case when (t->>'count')::int=0 then 0 else (i.value->>'shortage')::int end as stratum_shortage,
  (c.inventory->>'joint_shortage')::int as joint_shortage
from catalog c cross join lateral jsonb_array_elements(c.source_topics) t
left join lateral jsonb_array_elements(c.inventory->'inventory') i on i.value->>'id'=t->>'id'
order by prd_line;
