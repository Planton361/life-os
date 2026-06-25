create extension if not exists "pgcrypto";

-- Enums are locked by docs/data/r1-6-2-supabase-core-schema-lock.md.
create type public.area_key as enum (
  'dashboard',
  'inbox',
  'today',
  'calendar',
  'portfolio',
  'resources',
  'health',
  'nutrition',
  'coding',
  'life',
  'education',
  'work',
  'shop',
  'challenges',
  'settings',
  'review',
  'system',
  'personal'
);

create type public.inbox_item_status as enum (
  'raw',
  'clarified',
  'triaged',
  'processed',
  'archived'
);

create type public.inbox_item_type as enum (
  'task',
  'note',
  'question',
  'idea',
  'resource',
  'agent',
  'decision'
);

create type public.task_status as enum (
  'inbox',
  'planned',
  'active',
  'waiting',
  'done',
  'canceled',
  'someday',
  'archived'
);

create type public.task_priority as enum (
  'P0',
  'P1',
  'P2',
  'P3',
  'none'
);

create type public.task_energy as enum (
  'low',
  'medium',
  'high'
);

create type public.project_status as enum (
  'idea',
  'active',
  'paused',
  'blocked',
  'completed',
  'archived'
);

create type public.goal_status as enum (
  'draft',
  'active',
  'paused',
  'achieved',
  'archived'
);

create type public.daily_log_status as enum (
  'open',
  'closed',
  'archived'
);

create type public.daily_log_task_relation_type as enum (
  'planned',
  'completed',
  'carried_forward',
  'skipped',
  'note'
);

create type public.resource_type as enum (
  'note',
  'learning',
  'prompt',
  'research',
  'link',
  'source',
  'snippet',
  'decision'
);

create type public.resource_relation_target_type as enum (
  'inbox_item',
  'task',
  'project',
  'goal',
  'daily_log',
  'resource',
  'area'
);

create type public.resource_relation_type as enum (
  'source',
  'context',
  'supports',
  'evidence',
  'decision',
  'related'
);

-- Shared updated_at maintainer for central entities.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'Europe/Berlin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_timezone_not_blank check (length(btrim(timezone)) > 0)
);

comment on table public.profiles is
  'R1.6 profile row; id equals auth.users.id for the initial one-profile-per-user model.';
comment on column public.profiles.timezone is
  'Required timezone for local-day calculations; do not derive Today from UTC date slices.';

create table public.areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key public.area_key not null,
  name text not null,
  color text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint areas_name_not_blank check (length(btrim(name)) > 0)
);

comment on table public.areas is
  'Per-user product areas; central entity using archived_at for soft archive.';
comment on column public.areas.archived_at is
  'Soft archive marker. App-facing delete should archive instead of hard-delete.';

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area_id uuid references public.areas(id) on delete set null,
  title text not null,
  description text,
  status public.goal_status not null default 'draft',
  progress integer not null default 0,
  horizon text,
  why text,
  measure text,
  target_value text,
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint goals_title_not_blank check (length(btrim(title)) > 0),
  constraint goals_progress_range check (progress between 0 and 100)
);

comment on table public.goals is
  'Canonical goals; central entity using archived_at for soft archive.';

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area_id uuid references public.areas(id) on delete set null,
  goal_id uuid references public.goals(id) on delete set null,
  title text not null,
  description text,
  status public.project_status not null default 'idea',
  priority public.task_priority not null default 'P2',
  progress integer not null default 0,
  next_step text,
  start_date date,
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint projects_title_not_blank check (length(btrim(title)) > 0),
  constraint projects_progress_range check (progress between 0 and 100)
);

comment on table public.projects is
  'Canonical projects; central entity using archived_at for soft archive.';

create table public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_date date not null,
  timezone text not null,
  status public.daily_log_status not null default 'open',
  opening_note text,
  closing_note text,
  carry_forward_note text,
  energy public.task_energy,
  mood text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint daily_logs_timezone_not_blank check (length(btrim(timezone)) > 0)
);

comment on table public.daily_logs is
  'One active daily log per user-local day; stores day context, not copied task contents.';
comment on column public.daily_logs.local_date is
  'User-local date. Today and carry-forward logic must use profile timezone.';
comment on column public.daily_logs.carry_forward_note is
  'Carry-forward context without duplicating canonical task rows.';

create table public.inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area_id uuid references public.areas(id) on delete set null,
  type public.inbox_item_type not null default 'note',
  status public.inbox_item_status not null default 'raw',
  priority public.task_priority not null default 'P2',
  title text not null,
  body text,
  source text,
  captured_at timestamptz not null default now(),
  processed_at timestamptz,
  created_task_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint inbox_items_title_not_blank check (length(btrim(title)) > 0)
);

comment on table public.inbox_items is
  'Capture and triage queue; central entity using archived_at for soft archive.';

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status public.task_status not null default 'planned',
  priority public.task_priority not null default 'P2',
  energy public.task_energy,
  area_id uuid references public.areas(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  goal_id uuid references public.goals(id) on delete set null,
  source_inbox_item_id uuid references public.inbox_items(id) on delete set null,
  planned_date date,
  scheduled_start_at timestamptz,
  duration_minutes integer,
  due_at timestamptz,
  completed_at timestamptz,
  carried_from_daily_log_id uuid references public.daily_logs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint tasks_title_not_blank check (length(btrim(title)) > 0),
  constraint tasks_duration_minutes_positive check (
    duration_minutes is null or duration_minutes > 0
  )
);

comment on table public.tasks is
  'Canonical task rows shared by Dashboard, Today, Calendar, Portfolio, and area projections.';
comment on column public.tasks.planned_date is
  'Local planning date. Untimed tasks may have planned_date without scheduled_start_at.';
comment on column public.tasks.scheduled_start_at is
  'Concrete Calendar time-grid start. Render in the user profile timezone.';
comment on column public.tasks.carried_from_daily_log_id is
  'Carry-forward provenance. Carry forward moves the task plan; it does not duplicate the task.';

create table public.daily_log_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  daily_log_id uuid not null references public.daily_logs(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  relation_type public.daily_log_task_relation_type not null default 'planned',
  note text,
  created_at timestamptz not null default now(),
  constraint daily_log_tasks_unique_relation unique (
    daily_log_id,
    task_id,
    relation_type
  )
);

comment on table public.daily_log_tasks is
  'Daily log join rows. Daily logs reference tasks without duplicating canonical task contents.';

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area_id uuid references public.areas(id) on delete set null,
  type public.resource_type not null default 'note',
  title text not null,
  summary text,
  url text,
  source text,
  review_needed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint resources_title_not_blank check (length(btrim(title)) > 0)
);

comment on table public.resources is
  'Canonical reusable knowledge/material rows; central entity using archived_at for soft archive.';

create table public.resource_relations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  target_type public.resource_relation_target_type not null,
  target_id uuid not null,
  relation_type public.resource_relation_type not null default 'related',
  created_at timestamptz not null default now(),
  constraint resource_relations_unique_relation unique (
    resource_id,
    target_type,
    target_id,
    relation_type
  )
);

comment on table public.resource_relations is
  'Polymorphic resource links. target_id has no DB FK; repository/actions must validate same-user target ownership.';

alter table public.inbox_items
  add constraint inbox_items_created_task_id_fkey
  foreign key (created_task_id)
  references public.tasks(id)
  on delete set null;

create unique index areas_user_id_key_active_idx
  on public.areas (user_id, key)
  where archived_at is null;

create unique index daily_logs_user_id_local_date_active_idx
  on public.daily_logs (user_id, local_date)
  where archived_at is null;

create index areas_user_id_idx on public.areas (user_id);

create index inbox_items_user_id_idx on public.inbox_items (user_id);
create index inbox_items_user_id_status_captured_at_idx
  on public.inbox_items (user_id, status, captured_at desc);

create index tasks_user_id_idx on public.tasks (user_id);
create index tasks_user_id_status_idx on public.tasks (user_id, status);
create index tasks_user_id_planned_date_idx on public.tasks (user_id, planned_date);
create index tasks_user_id_scheduled_start_at_idx
  on public.tasks (user_id, scheduled_start_at);
create index tasks_user_id_project_id_idx on public.tasks (user_id, project_id);
create index tasks_user_id_goal_id_idx on public.tasks (user_id, goal_id);
create index tasks_user_id_area_id_idx on public.tasks (user_id, area_id);

create index projects_user_id_idx on public.projects (user_id);
create index projects_user_id_status_idx on public.projects (user_id, status);
create index projects_user_id_area_id_idx on public.projects (user_id, area_id);
create index projects_user_id_goal_id_idx on public.projects (user_id, goal_id);

create index goals_user_id_idx on public.goals (user_id);
create index goals_user_id_status_idx on public.goals (user_id, status);
create index goals_user_id_area_id_idx on public.goals (user_id, area_id);

create index daily_logs_user_id_idx on public.daily_logs (user_id);
create index daily_logs_user_id_local_date_idx on public.daily_logs (user_id, local_date);

create index daily_log_tasks_user_id_idx on public.daily_log_tasks (user_id);
create index daily_log_tasks_daily_log_id_idx on public.daily_log_tasks (daily_log_id);
create index daily_log_tasks_task_id_idx on public.daily_log_tasks (task_id);

create index resources_user_id_idx on public.resources (user_id);
create index resources_user_id_type_idx on public.resources (user_id, type);
create index resources_user_id_review_needed_idx
  on public.resources (user_id, review_needed);
create index resources_user_id_area_id_idx on public.resources (user_id, area_id);

create index resource_relations_user_id_idx on public.resource_relations (user_id);
create index resource_relations_resource_id_idx on public.resource_relations (resource_id);
create index resource_relations_user_target_idx
  on public.resource_relations (user_id, target_type, target_id);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

create trigger areas_set_updated_at
  before update on public.areas
  for each row
  execute function public.set_updated_at();

create trigger goals_set_updated_at
  before update on public.goals
  for each row
  execute function public.set_updated_at();

create trigger projects_set_updated_at
  before update on public.projects
  for each row
  execute function public.set_updated_at();

create trigger daily_logs_set_updated_at
  before update on public.daily_logs
  for each row
  execute function public.set_updated_at();

create trigger inbox_items_set_updated_at
  before update on public.inbox_items
  for each row
  execute function public.set_updated_at();

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row
  execute function public.set_updated_at();

create trigger resources_set_updated_at
  before update on public.resources
  for each row
  execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.areas enable row level security;
alter table public.goals enable row level security;
alter table public.projects enable row level security;
alter table public.daily_logs enable row level security;
alter table public.inbox_items enable row level security;
alter table public.tasks enable row level security;
alter table public.daily_log_tasks enable row level security;
alter table public.resources enable row level security;
alter table public.resource_relations enable row level security;

create policy "Users can select own profiles"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can insert own profiles"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Users can update own profiles"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Users can select own areas"
on public.areas for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own areas"
on public.areas for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own areas"
on public.areas for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can select own goals"
on public.goals for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own goals"
on public.goals for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own goals"
on public.goals for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can select own projects"
on public.projects for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own projects"
on public.projects for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own projects"
on public.projects for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can select own daily_logs"
on public.daily_logs for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own daily_logs"
on public.daily_logs for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own daily_logs"
on public.daily_logs for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can select own inbox_items"
on public.inbox_items for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own inbox_items"
on public.inbox_items for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own inbox_items"
on public.inbox_items for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can select own tasks"
on public.tasks for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own tasks"
on public.tasks for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own tasks"
on public.tasks for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can select own daily_log_tasks"
on public.daily_log_tasks for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own daily_log_tasks"
on public.daily_log_tasks for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own daily_log_tasks"
on public.daily_log_tasks for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete own daily_log_tasks"
on public.daily_log_tasks for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can select own resources"
on public.resources for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own resources"
on public.resources for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own resources"
on public.resources for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can select own resource_relations"
on public.resource_relations for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own resource_relations"
on public.resource_relations for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own resource_relations"
on public.resource_relations for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete own resource_relations"
on public.resource_relations for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Central entities intentionally omit hard-delete policies in R1.6.2.
-- App-facing deletion should set archived_at; join rows may be hard-deleted.
