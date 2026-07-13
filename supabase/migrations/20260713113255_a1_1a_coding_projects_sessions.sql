alter table public.projects
  add column repository_url text;

alter table public.projects
  add constraint projects_repository_url_valid
  check (repository_url is null or repository_url ~ '^https?://');

create table public.coding_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete restrict,
  session_date date not null,
  start_time time,
  duration_minutes integer not null,
  activity text not null,
  outcome text not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint coding_sessions_duration_positive check (duration_minutes > 0),
  constraint coding_sessions_activity_not_blank check (length(btrim(activity)) > 0),
  constraint coding_sessions_outcome_not_blank check (length(btrim(outcome)) > 0)
);

comment on table public.coding_sessions is
  'User-owned Coding work logs linked to canonical Coding-area projects.';

create index coding_sessions_user_project_date_idx
  on public.coding_sessions (user_id, project_id, session_date desc);

create trigger coding_sessions_set_updated_at
  before update on public.coding_sessions
  for each row execute function public.set_updated_at();

alter table public.coding_sessions enable row level security;

create policy "Users can select own coding sessions"
on public.coding_sessions for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own coding sessions"
on public.coding_sessions for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.projects
    where projects.id = coding_sessions.project_id
      and projects.user_id = (select auth.uid())
      and projects.archived_at is null
  )
);

create policy "Users can update own coding sessions"
on public.coding_sessions for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.projects
    where projects.id = coding_sessions.project_id
      and projects.user_id = (select auth.uid())
  )
);

grant select, insert, update on table public.coding_sessions to authenticated;
