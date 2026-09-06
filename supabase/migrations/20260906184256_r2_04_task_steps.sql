-- Task-local work steps. Completion is independent of the parent task lifecycle.
create table public.task_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 500),
  position integer not null default 0 check (position >= 0),
  completed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index task_steps_owner_task on public.task_steps(user_id, task_id, position, created_at);
create trigger task_steps_set_updated_at before update on public.task_steps
  for each row execute function public.set_updated_at();
alter table public.task_steps enable row level security;
revoke all on public.task_steps from anon;
grant select, insert, update on public.task_steps to authenticated;
create policy task_steps_read on public.task_steps for select to authenticated
  using (user_id = (select auth.uid()));
create policy task_steps_insert on public.task_steps for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.tasks t where t.id = task_id and t.user_id = (select auth.uid()) and t.archived_at is null
  ));
create policy task_steps_update on public.task_steps for update to authenticated
  using (user_id = (select auth.uid()) and archived_at is null and exists (
    select 1 from public.tasks t where t.id = task_id and t.user_id = (select auth.uid()) and t.archived_at is null
  ))
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.tasks t where t.id = task_id and t.user_id = (select auth.uid()) and t.archived_at is null
  ));
