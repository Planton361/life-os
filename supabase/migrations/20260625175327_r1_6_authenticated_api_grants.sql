grant usage on schema public to authenticated;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update on table public.areas to authenticated;
grant select, insert, update on table public.inbox_items to authenticated;
grant select, insert, update on table public.tasks to authenticated;
grant select, insert, update on table public.projects to authenticated;
grant select, insert, update on table public.goals to authenticated;
grant select, insert, update on table public.daily_logs to authenticated;
grant select, insert, update on table public.resources to authenticated;

grant select, insert, update, delete on table public.daily_log_tasks to authenticated;
grant select, insert, update, delete on table public.resource_relations to authenticated;
