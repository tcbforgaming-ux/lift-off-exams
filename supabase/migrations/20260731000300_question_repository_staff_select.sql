-- Staff must be able to inspect both Active and Retired questions directly.
-- Public and standard-user reads remain limited to Active questions by
-- questions_select_active_public from the repository migration.

create policy questions_select_staff
on public.questions
for select
to authenticated
using (public.is_admin());
