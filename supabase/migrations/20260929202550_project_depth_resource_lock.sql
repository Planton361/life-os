-- SELECT ... FOR SHARE participates in UPDATE RLS and requires an UPDATE grant.
-- The command role receives only the immutable identity column for locking;
-- no Project RPC accepts Resource or relation mutation input.
grant update(id) on public.resources, public.resource_relations to life_os_project_command;
create policy project_command_resource_lock on public.resources
  for update to life_os_project_command
  using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy project_command_relation_lock on public.resource_relations
  for update to life_os_project_command
  using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
