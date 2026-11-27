-- The detector is review-only and uses the existing pg_trgm extension.
create function private.staff_similarity_text(p_text text)
returns text language sql immutable strict set search_path=pg_catalog as $$
  select regexp_replace(lower(btrim(p_text)), '[[:space:]]+', ' ', 'g')
$$;
-- Use built-ins in the write-side index so existing importers need no private function grant.
create index staff_question_similarity_idx on public.questions
  using gin (regexp_replace(lower(btrim(question_text)), '[[:space:]]+', ' ', 'g') extensions.gin_trgm_ops);

create table private.staff_candidate_similarity_reviews (
  candidate_id uuid not null references public.generated_question_candidates(id) on delete cascade,
  request_key uuid not null,
  basis text not null,
  decision text not null check (decision in ('keep','edit','cancel')),
  evidence jsonb not null,
  reviewer_id uuid references auth.users(id) on delete set null,
  reason text not null,
  decided_at timestamptz not null default clock_timestamp(),
  primary key(candidate_id,request_key),
  unique(candidate_id,basis)
);
revoke all on private.staff_candidate_similarity_reviews from public,anon,authenticated,service_role;

create function private.staff_candidate_similarity(c public.generated_question_candidates)
returns jsonb language sql stable set search_path=pg_catalog,pg_temp
set pg_trgm.similarity_threshold='0.80' as $$
  with candidate as (
    select private.staff_similarity_text(c.question_text) as normalized
  ), matched as (
    select q.id,q.question_text,q.created_at,extensions.similarity(t.normalized,s.normalized) score
    from public.questions q cross join candidate s
    cross join lateral (select regexp_replace(lower(btrim(q.question_text)), '[[:space:]]+', ' ', 'g') normalized) t
    where t.normalized operator(extensions.%) s.normalized
      and extensions.similarity(t.normalized,s.normalized)>=0.80
      and lower(btrim(q.question_text))<>lower(btrim(c.question_text))
      and q.id is distinct from c.published_question_id
    order by score desc,q.id limit 11
  ), evidence as (
    select coalesce(jsonb_agg(to_jsonb(matched) order by score desc,id),'[]') as matches from matched
  ), basis as (
    select matches,encode(extensions.digest(private.candidate_content(c)::text||matches::text,'sha256'),'hex') as hash from evidence
  )
  select jsonb_build_object('matches',b.matches,'basis',b.hash,'overflow',jsonb_array_length(b.matches)>10,
    'decision',(select r.decision from private.staff_candidate_similarity_reviews r
      where r.candidate_id=c.id and r.basis=b.hash)) from basis b
$$;

create function public.get_candidate_similarity(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,pg_temp as $$
declare c public.generated_question_candidates;
begin
  if not coalesce(public.is_admin(),false) or private.account_erasure_blocked(auth.uid()) then
    raise insufficient_privilege using message='Staff access required.';
  end if;
  select * into strict c from public.generated_question_candidates where id=p_id;
  return private.staff_candidate_similarity(c);
end;
$$;

create function public.decide_candidate_similarity(
  p_id uuid,p_revision bigint,p_basis text,p_decision text,p_reason text,p_key uuid
) returns text language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
declare c public.generated_question_candidates;
  prior private.staff_candidate_similarity_reviews;
  evidence jsonb;
  reason text:=btrim(coalesce(p_reason,''));
begin
  if not coalesce(public.is_admin(),false) or private.account_erasure_blocked(auth.uid()) then
    raise insufficient_privilege using message='Staff access required.';
  end if;
  if coalesce(p_decision,'') not in ('keep','edit','cancel') or p_key is null or length(reason) not between 5 and 1000 then
    raise invalid_parameter_value using message='Provide a valid duplicate decision and reason.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('staff-candidate-publication',0));
  select * into strict c from public.generated_question_candidates where id=p_id for update;
  select * into prior from private.staff_candidate_similarity_reviews where candidate_id=p_id and request_key=p_key;
  if found then
    if (prior.basis,prior.decision,prior.reason,prior.reviewer_id) is distinct from (p_basis,p_decision,reason,auth.uid()) then
      raise invalid_parameter_value using message='Duplicate review key is already in use.';
    end if;
    return prior.decision;
  end if;
  if c.review_revision is distinct from p_revision or c.review_status not in ('Pending Review','Needs Edit','Approved') then
    raise exception 'Candidate changed; reload before reviewing duplicates.';
  end if;
  evidence:=private.staff_candidate_similarity(c);
  if p_basis is distinct from evidence->>'basis' or evidence->>'decision' is not null
    or jsonb_array_length(evidence->'matches')=0 then
    raise exception 'Similarity evidence changed or already reviewed; reload the candidate.';
  end if;
  if p_decision='keep' and (evidence->>'overflow')::boolean then
    raise exception 'Too many possible matches; edit or cancel the candidate.';
  end if;
  insert into private.staff_candidate_similarity_reviews(candidate_id,request_key,basis,decision,evidence,reviewer_id,reason)
    values(p_id,p_key,p_basis,p_decision,evidence->'matches',auth.uid(),reason);
  if p_decision in ('edit','cancel') then
    update public.generated_question_candidates set review_revision=review_revision+1,approved_content=null,
      review_status=case p_decision when 'edit' then 'Needs Edit' else 'Rejected' end,
      reviewed_by=auth.uid(),reviewed_at=clock_timestamp() where id=p_id;
  end if;
  insert into public.admin_audit_logs(actor_user_id,actor_role,action,resource_type,resource_id,reason,correlation_id,metadata)
    values(auth.uid(),public.current_user_role(),'candidate.similarity_'||p_decision,'candidate',p_id::text,
      reason,p_key::text,jsonb_build_object('basis',p_basis,'revision',p_revision,'matches',evidence->'matches'));
  return p_decision;
end;
$$;

alter function public.publish_review_candidate(uuid,bigint,text) set schema private;
revoke all on function private.publish_review_candidate(uuid,bigint,text) from public,anon,authenticated,service_role;
create function public.publish_review_candidate(p_id uuid,p_revision bigint,p_reason text)
returns uuid language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
declare c public.generated_question_candidates; evidence jsonb;
begin
  if not coalesce(public.is_admin(),false) or private.account_erasure_blocked(auth.uid()) then
    raise insufficient_privilege using message='Staff access required.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('staff-candidate-publication',0));
  select * into strict c from public.generated_question_candidates where id=p_id for update;
  if c.review_status='Approved' and c.review_revision=p_revision then
    if exists (select 1 from public.questions q
      where md5(lower(btrim(q.question_text)))=md5(lower(btrim(c.question_text)))
        and lower(btrim(q.question_text))=lower(btrim(c.question_text))) then
      raise exception 'A question with identical text already exists.';
    end if;
    evidence:=private.staff_candidate_similarity(c);
    if jsonb_array_length(evidence->'matches')>0 and evidence->>'decision' is distinct from 'keep' then
      raise exception 'Review the current near-duplicate matches before publication.';
    end if;
  end if;
  return private.publish_review_candidate(p_id,p_revision,p_reason);
end;
$$;
revoke all on function private.staff_similarity_text(text),
  private.staff_candidate_similarity(public.generated_question_candidates),public.get_candidate_similarity(uuid),
  public.decide_candidate_similarity(uuid,bigint,text,text,text,uuid),public.publish_review_candidate(uuid,bigint,text)
from public,anon,authenticated,service_role;
grant execute on function public.get_candidate_similarity(uuid),public.decide_candidate_similarity(uuid,bigint,text,text,text,uuid),
  public.publish_review_candidate(uuid,bigint,text) to authenticated;
