create type public.education_log_type as enum ('learning', 'writing');

create table public.education_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete restrict,
  log_type public.education_log_type not null,
  log_date date not null,
  start_time time,
  duration_minutes integer not null,
  focus text not null,
  outcome text not null,
  notes text,
  word_count_delta integer,
  units_completed integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint education_logs_duration_positive check (duration_minutes > 0),
  constraint education_logs_focus_not_blank check (length(btrim(focus)) > 0),
  constraint education_logs_outcome_not_blank check (length(btrim(outcome)) > 0),
  constraint education_logs_units_nonnegative check (units_completed is null or units_completed >= 0)
);

create index education_logs_user_project_date_idx
  on public.education_logs (user_id, project_id, log_date desc, created_at desc);

create trigger education_logs_set_updated_at
  before update on public.education_logs
  for each row execute function public.set_updated_at();

alter table public.education_logs enable row level security;

create policy "education_logs_select_own" on public.education_logs
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "education_logs_insert_owned_project" on public.education_logs
  for insert to authenticated with check (
    (select auth.uid()) = user_id and exists (
      select 1 from public.projects
      where projects.id = education_logs.project_id
        and projects.user_id = (select auth.uid())
        and projects.archived_at is null
    )
  );

create policy "education_logs_update_owned_project" on public.education_logs
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id and exists (
      select 1 from public.projects
      where projects.id = education_logs.project_id
        and projects.user_id = (select auth.uid())
        and projects.archived_at is null
    )
  );

grant select, insert, update on table public.education_logs to authenticated;
