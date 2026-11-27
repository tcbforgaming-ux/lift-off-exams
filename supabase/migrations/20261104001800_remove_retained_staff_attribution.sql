-- These two private tables predate the account foreign-key conventions.
-- Keep published content and candidate provenance without a former user's ID.
alter table private.staff_tags alter column created_by drop not null;
alter table private.staff_question_imports alter column actor_id drop not null;

do $$
declare definition text:=pg_get_functiondef('private.erase_account_records(uuid,text)'::regprocedure);
  anchor text:=$a$  delete from auth.users where id=p_user;$a$;
begin
  if strpos(definition,anchor)=0 then raise exception 'Unexpected erasure order'; end if;
  execute replace(definition,anchor,$r$  update private.staff_tags set created_by=null where created_by=p_user;
  update private.staff_question_imports set actor_id=null where actor_id=p_user;
  update public.question_versions set created_by=null,change_reason='Account attribution removed' where created_by=p_user;
  update public.blueprint_versions set created_by=null,change_reason='Account attribution removed' where created_by=p_user;
  delete from auth.users where id=p_user;$r$);
end;
$$;
