create table public.work_logs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, project_id uuid not null references public.projects(id) on delete restrict,
  log_date date not null, started_at time, duration_minutes integer not null, focus text not null, outcome text not null, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz,
  constraint work_logs_duration_positive check (duration_minutes > 0), constraint work_logs_focus_not_blank check (length(btrim(focus)) > 0), constraint work_logs_outcome_not_blank check (length(btrim(outcome)) > 0)
);
create index work_logs_user_project_date_idx on public.work_logs (user_id, project_id, log_date desc, created_at desc);
create trigger work_logs_set_updated_at before update on public.work_logs for each row execute function public.set_updated_at();
alter table public.work_logs enable row level security;
create policy "work_logs_select_own" on public.work_logs for select to authenticated using ((select auth.uid()) = user_id);
create policy "work_logs_insert_own" on public.work_logs for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.projects join public.areas on areas.id = projects.area_id where projects.id = work_logs.project_id and projects.user_id = (select auth.uid()) and projects.archived_at is null and areas.key = 'work' and areas.archived_at is null));
create policy "work_logs_update_own" on public.work_logs for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and exists (select 1 from public.projects join public.areas on areas.id = projects.area_id where projects.id = work_logs.project_id and projects.user_id = (select auth.uid()) and projects.archived_at is null and areas.key = 'work' and areas.archived_at is null));
grant select, insert, update on public.work_logs to authenticated;
