alter table public.question_reports add column moderation_disposition text
  check(moderation_disposition in ('valid','invalid','spam','fixed','work_in_progress'));
create table private.report_priority_config (
  singleton boolean primary key default true check(singleton),
  threshold integer not null check(threshold between 1 and 10000),
  version bigint not null default 0
);
insert into private.report_priority_config values(true,3,0);
create table private.report_action_requests (
  actor uuid references auth.users(id) on delete cascade,key uuid,payload jsonb not null,result jsonb not null,
  reporter_id uuid references auth.users(id) on delete cascade,
  primary key(actor,key)
);
revoke all on private.report_priority_config,private.report_action_requests from public,anon,authenticated,service_role;
create function public.get_report_priority_config() returns jsonb language plpgsql stable security definer set search_path=pg_catalog,pg_temp as $$
begin
 if not coalesce(public.is_admin(),false) then raise insufficient_privilege; end if;
 return (select to_jsonb(c) from private.report_priority_config c);
end;$$;
create function public.set_report_priority_config(p_threshold integer,p_version bigint,p_reason text) returns jsonb
language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
declare result jsonb;
begin
 if not coalesce(public.is_admin(),false) then raise insufficient_privilege; end if;
 if p_threshold is null or p_threshold not between 1 and 10000 or length(btrim(coalesce(p_reason,''))) not between 5 and 1000 then raise invalid_parameter_value; end if;
 perform 1 from private.report_priority_config for update;
 if exists(select 1 from private.report_priority_config where threshold=p_threshold and version in (p_version,p_version+1)) then
   return public.get_report_priority_config();
 end if;
 update private.report_priority_config set threshold=p_threshold,version=version+1 where version=p_version;
 if not found then raise exception 'Priority settings changed; reload.';end if;
 result:=public.get_report_priority_config();
 insert into public.admin_audit_logs(actor_user_id,actor_role,action,resource_type,reason,new_values)
 values(auth.uid(),public.current_user_role(),'reports.priority_changed','report_config',btrim(p_reason),result);
 return result;
end;$$;

create function public.act_on_question_report(p_id uuid,p_version bigint,p_disposition text,p_reason text,p_message text,p_key uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
declare r public.question_reports; prior private.report_action_requests; state text; resolution text;
  request jsonb:=jsonb_build_array(p_id,p_version,p_disposition,btrim(p_reason),btrim(p_message)); result jsonb;
begin
 if not coalesce(public.is_admin(),false) then raise insufficient_privilege; end if;
 if coalesce(p_disposition,'') not in ('valid','invalid','spam','fixed','work_in_progress') or p_key is null
    or length(btrim(coalesce(p_reason,''))) not between 5 and 1000
    or length(btrim(coalesce(p_message,''))) not between 5 and 1000 then raise invalid_parameter_value;end if;
 perform pg_advisory_xact_lock(hashtextextended('report-action:'||p_key::text||auth.uid()::text,0));
 select * into prior from private.report_action_requests a where a.actor=auth.uid() and a.key=p_key;
 if found then
   if prior.payload is distinct from request then raise exception 'Action key already used.';end if;
   return prior.result;
 end if;
 select * into r from public.question_reports where id=p_id for update;
 if not found or r.version<>p_version or r.status not in ('open','in_review') then raise exception 'Report changed; reload.';end if;
 state:=case p_disposition when 'valid' then 'in_review' when 'work_in_progress' then 'in_review'
   when 'fixed' then 'resolved' else 'rejected' end;
 resolution:=case when state='resolved' then 'corrected' when state='rejected' then 'not_an_issue' end;
 update public.question_reports set status=state,moderation_disposition=p_disposition,
   resolution_category=resolution,resolution_message=case when state='in_review' then null else btrim(p_message) end,
   resolved_at=case when state<>'in_review' then clock_timestamp() end,
   reviewed_by=auth.uid(),reviewed_at=clock_timestamp(),version=version+1 where id=p_id;
 if r.reporter_id is not null then
   perform private.queue_moderation_email(r.reporter_id,
     case p_disposition when 'fixed' then 'Thank you for your question report' else 'Question report update' end,
     btrim(p_message),jsonb_build_object('report_id',p_id,'disposition',p_disposition,'path','/reports'));
 end if;
 result:=jsonb_build_object('report_id',p_id,'status',state,'disposition',p_disposition,'version',p_version+1);
 insert into public.admin_audit_logs(actor_user_id,actor_role,action,resource_type,resource_id,reason,new_values)
 values(auth.uid(),public.current_user_role(),'report.'||p_disposition,'question_report',p_id::text,btrim(p_reason),result);
 insert into private.report_action_requests values(auth.uid(),p_key,request,result,r.reporter_id);
 return result;
end;$$;

create function public.list_priority_reports(p_status text default null,p_category text default null,
 p_lifecycle text default null,p_difficulty text default null,p_rank bigint default null,
 p_before timestamptz default null,p_id uuid default null,p_limit integer default 100)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,pg_temp as $$
declare size integer:=least(100,greatest(1,coalesce(p_limit,100)));
begin
 if not coalesce(public.is_admin(),false) then raise insufficient_privilege;end if;
 if (p_rank is null)<>(p_id is null) or (p_before is null)<>(p_id is null) then raise invalid_parameter_value;end if;
 return (with counts as (
   select question_id,count(*) as reports from public.question_reports where status in ('open','in_review') group by question_id
 ), ranked as (
   select r.id as report_id,r.question_id,r.test_id,r.category,r.status as report_status,r.version as report_version,
     r.moderation_disposition,u.email::text as reporter_email,q.performance_indicator,q.question_type,q.difficulty,
     q.lifecycle_state,r.created_at,r.updated_at,coalesce(c.reports,0) as priority_rank,
     coalesce(c.reports,0)>=(select threshold from private.report_priority_config) as high_priority
   from public.question_reports r join public.questions q on q.id=r.question_id
   left join counts c on c.question_id=r.question_id left join auth.users u on u.id=r.reporter_id
   where (p_status is null or r.status=p_status) and (p_category is null or r.category=p_category)
    and (p_lifecycle is null or q.lifecycle_state=p_lifecycle) and (p_difficulty is null or q.difficulty=p_difficulty)
 ), page as materialized (
   select * from ranked where p_rank is null or (priority_rank,updated_at,report_id)<(p_rank,p_before,p_id)
   order by priority_rank desc,updated_at desc,report_id desc limit size+1
 ) select coalesce(jsonb_agg(to_jsonb(s)||jsonb_build_object('has_next_page',(select count(*)>size from page))
   order by priority_rank desc,updated_at desc,report_id desc),'[]')
 from (select * from page order by priority_rank desc,updated_at desc,report_id desc limit size)s);
end;$$;
revoke all on function public.get_report_priority_config(),public.set_report_priority_config(integer,bigint,text),
 public.act_on_question_report(uuid,bigint,text,text,text,uuid),
 public.list_priority_reports(text,text,text,text,bigint,timestamptz,uuid,integer)
from public,anon,authenticated,service_role;
grant execute on function public.get_report_priority_config(),public.set_report_priority_config(integer,bigint,text),
 public.act_on_question_report(uuid,bigint,text,text,text,uuid),
 public.list_priority_reports(text,text,text,text,bigint,timestamptz,uuid,integer) to authenticated;

-- Older correction/lifecycle RPCs keep their contracts and also notify the
-- reporter. New disposition actions enqueue their own richer message.
create function private.notice_legacy_report_transition() returns trigger
language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
begin
 if new.status is distinct from old.status and new.reporter_id is not null
   and new.moderation_disposition is not distinct from old.moderation_disposition then
   perform private.queue_moderation_email(new.reporter_id,
     case when new.status='resolved' then 'Thank you for your question report' else 'Question report update' end,
     coalesce(new.resolution_message,'Your question report is under review.'),
     jsonb_build_object('report_id',new.id,'path','/reports','status',new.status));
 end if;
 return new;
end;$$;
revoke all on function private.notice_legacy_report_transition() from public,anon,authenticated,service_role;
create trigger notice_legacy_report_transition after update on public.question_reports
for each row execute function private.notice_legacy_report_transition();
