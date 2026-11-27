-- Curated independently from the private question bank. No public table access.
create table public.demo_questions (
  demo_id text not null check (demo_id in ('marketing','finance','management','hospitality','entrepreneurship')),
  position integer not null check (position between 1 and 5),
  prompt text not null check (length(btrim(prompt)) between 1 and 1000),
  choices text[] not null check (array_ndims(choices)=1 and array_lower(choices,1)=1
    and cardinality(choices)=4 and array_position(choices,null) is null),
  answer text not null check (answer in ('A','B','C','D')),
  primary key (demo_id,position)
);
alter table public.demo_questions enable row level security;
revoke all on public.demo_questions from public,anon,authenticated,service_role;
grant select,insert,update,delete on public.demo_questions to service_role;

create function public.get_public_demo(p_demo text) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,pg_temp as $$
declare payload jsonb;
begin
  select jsonb_agg(jsonb_build_object('position',position,'prompt',prompt,'choices',choices) order by position)
    into payload from public.demo_questions where demo_id=p_demo;
  if coalesce(jsonb_array_length(payload),0)<>5 then
    raise no_data_found using message='This demo is not available.';
  end if;
  return payload;
end;
$$;

create function public.grade_public_demo(p_demo text,p_answers text[]) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,pg_temp as $$
declare items jsonb; score integer; skipped integer;
begin
  if p_answers is null or array_ndims(p_answers) is distinct from 1
    or cardinality(p_answers)<>5 or array_lower(p_answers,1)<>1
    or exists(select 1 from unnest(p_answers) a where a is not null and a not in ('A','B','C','D')) then
    raise invalid_parameter_value using message='Submit five choices or skips.';
  end if;
  select jsonb_agg(jsonb_build_object('position',position,'answer',answer,
      'selected',p_answers[position]) order by position),
    count(*) filter(where answer=p_answers[position]),
    count(*) filter(where p_answers[position] is null)
    into items,score,skipped from public.demo_questions where demo_id=p_demo;
  if coalesce(jsonb_array_length(items),0)<>5 then
    raise no_data_found using message='This demo is not available.';
  end if;
  return jsonb_build_object('score',score,'skipped',skipped,'items',items);
end;
$$;
revoke all on function public.get_public_demo(text),public.grade_public_demo(text,text[])
  from public,anon,authenticated,service_role;
grant execute on function public.get_public_demo(text),public.grade_public_demo(text,text[])
  to anon,authenticated;
