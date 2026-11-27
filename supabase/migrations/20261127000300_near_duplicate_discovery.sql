create function public.list_candidate_near_matches(p_before timestamptz default null,p_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,pg_temp as $$
begin
  if not coalesce(public.is_admin(),false) then raise insufficient_privilege; end if;
  if (p_before is null)<>(p_id is null) then raise invalid_parameter_value; end if;
  return (select coalesce(jsonb_agg(to_jsonb(r) order by created_at desc,id desc),'[]') from (
    select c.id,c.created_at,c.question_text,c.review_status,e.details
    from public.generated_question_candidates c
    cross join lateral (select private.staff_candidate_similarity(c) details) e
    where c.review_status in ('Pending Review','Needs Edit','Approved')
      and (p_before is null or (c.created_at,c.id)<(p_before,p_id))
      and jsonb_array_length(e.details->'matches')>0
    order by c.created_at desc,c.id desc limit 26
  )r);
end;
$$;
-- Advisory evidence leaves the existing canonical import token unchanged.
alter function public.preview_staff_questions(jsonb) set schema private;
revoke all on function private.preview_staff_questions(jsonb) from public,anon,authenticated,service_role;
create function public.preview_staff_questions(p_rows jsonb) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,pg_temp as $$
declare result jsonb; matches jsonb; c public.generated_question_candidates;
begin
  result:=private.preview_staff_questions(p_rows);
  matches:='[]';
  for c in select x.* from jsonb_array_elements(result->'rows')r
    cross join lateral jsonb_populate_record(null::public.generated_question_candidates,r->'content')x
    where r->>'status'='ready'
  loop
    matches:=matches||jsonb_build_array(jsonb_build_object('prompt',c.question_text,
      'evidence',private.staff_candidate_similarity(c)));
  end loop;
  return result||jsonb_build_object('near_matches',matches);
end;
$$;
revoke all on function public.list_candidate_near_matches(timestamptz,uuid),public.preview_staff_questions(jsonb)
from public,anon,authenticated,service_role;
grant execute on function public.list_candidate_near_matches(timestamptz,uuid),public.preview_staff_questions(jsonb) to authenticated;
