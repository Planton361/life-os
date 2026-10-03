-- SELECT FOR SHARE needs an UPDATE USING policy as well as the existing
-- SELECT policy/table privilege. WITH CHECK denies every actual Area update.
create policy skill_command_area_lock
on public.areas
for update
to life_os_skill_command
using (user_id = (select auth.uid()))
with check (false);
