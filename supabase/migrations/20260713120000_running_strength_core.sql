create table public.running_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  goal text not null check (char_length(btrim(goal)) between 1 and 500),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.running_plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  planned_distance_km numeric(8,3) check (planned_distance_km is null or planned_distance_km > 0),
  planned_duration_minutes integer check (planned_duration_minutes is null or planned_duration_minutes > 0),
  sort_order integer not null check (sort_order between 0 and 10000),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (plan_id, sort_order),
  constraint running_plan_items_plan_owner_fkey foreign key (plan_id, user_id)
    references public.running_plans(id, user_id) on delete cascade
);

create table public.running_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_item_id uuid,
  session_date date not null,
  started_at timestamptz,
  distance_km numeric(8,3) not null check (distance_km > 0),
  duration_minutes integer not null check (duration_minutes > 0),
  average_heart_rate integer check (average_heart_rate is null or average_heart_rate between 30 and 240),
  notes text check (notes is null or char_length(notes) <= 2000),
  status text not null default 'completed' check (status in ('in_progress', 'completed')),
  completed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint running_sessions_plan_item_owner_fkey foreign key (plan_item_id, user_id)
    references public.running_plan_items(id, user_id) on delete restrict,
  constraint running_sessions_completion_check check (
    (status = 'completed' and completed_at is not null) or
    (status = 'in_progress' and completed_at is null)
  )
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  description text check (description is null or char_length(description) <= 1000),
  equipment text check (equipment is null or char_length(equipment) <= 120),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.exercise_muscles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null,
  muscle_group text not null check (muscle_group in (
    'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms',
    'Core', 'Glutes', 'Quadriceps', 'Hamstrings', 'Calves'
  )),
  created_at timestamptz not null default now(),
  unique (exercise_id, muscle_group),
  constraint exercise_muscles_exercise_owner_fkey foreign key (exercise_id, user_id)
    references public.exercises(id, user_id) on delete cascade
);

create table public.strength_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  goal text not null check (char_length(btrim(goal)) between 1 and 500),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.strength_plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null,
  exercise_id uuid not null,
  sort_order integer not null check (sort_order between 0 and 10000),
  target_sets integer not null check (target_sets between 1 and 50),
  target_reps integer not null check (target_reps between 1 and 1000),
  target_weight_kg numeric(8,3) check (target_weight_kg is null or target_weight_kg > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, sort_order),
  constraint strength_plan_items_plan_owner_fkey foreign key (plan_id, user_id)
    references public.strength_plans(id, user_id) on delete cascade,
  constraint strength_plan_items_exercise_owner_fkey foreign key (exercise_id, user_id)
    references public.exercises(id, user_id) on delete restrict
);

create table public.strength_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid,
  session_date date not null,
  started_at timestamptz not null default now(),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  notes text check (notes is null or char_length(notes) <= 2000),
  completed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint strength_sessions_plan_owner_fkey foreign key (plan_id, user_id)
    references public.strength_plans(id, user_id) on delete restrict,
  constraint strength_sessions_completion_check check (
    (status = 'completed' and completed_at is not null) or
    (status = 'in_progress' and completed_at is null)
  )
);

create table public.strength_set_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  exercise_id uuid not null,
  set_order integer not null check (set_order between 1 and 1000),
  repetitions integer not null check (repetitions between 1 and 1000),
  weight_kg numeric(8,3) check (weight_kg is null or weight_kg > 0),
  notes text check (notes is null or char_length(notes) <= 1000),
  recorded_at timestamptz not null default now(),
  constraint strength_set_logs_session_owner_fkey foreign key (session_id, user_id)
    references public.strength_sessions(id, user_id) on delete cascade,
  constraint strength_set_logs_exercise_owner_fkey foreign key (exercise_id, user_id)
    references public.exercises(id, user_id) on delete restrict,
  unique (session_id, set_order)
);

create index running_plans_user_active_idx on public.running_plans (user_id, archived_at);
create index running_plan_items_user_plan_idx on public.running_plan_items (user_id, plan_id, sort_order);
create index running_sessions_user_date_idx on public.running_sessions (user_id, session_date desc) where archived_at is null;
create index running_sessions_plan_item_idx on public.running_sessions (plan_item_id);
create index exercises_user_active_idx on public.exercises (user_id, archived_at);
create index exercise_muscles_user_exercise_idx on public.exercise_muscles (user_id, exercise_id);
create index strength_plans_user_active_idx on public.strength_plans (user_id, archived_at);
create index strength_plan_items_user_plan_idx on public.strength_plan_items (user_id, plan_id, sort_order);
create index strength_plan_items_exercise_idx on public.strength_plan_items (exercise_id);
create index strength_sessions_user_date_idx on public.strength_sessions (user_id, session_date desc) where archived_at is null;
create index strength_sessions_plan_idx on public.strength_sessions (plan_id);
create index strength_set_logs_user_session_idx on public.strength_set_logs (user_id, session_id, set_order);
create index strength_set_logs_exercise_idx on public.strength_set_logs (exercise_id);

alter table public.running_plans enable row level security;
alter table public.running_plan_items enable row level security;
alter table public.running_sessions enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_muscles enable row level security;
alter table public.strength_plans enable row level security;
alter table public.strength_plan_items enable row level security;
alter table public.strength_sessions enable row level security;
alter table public.strength_set_logs enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'running_plans', 'running_plan_items', 'running_sessions', 'exercises',
    'exercise_muscles', 'strength_plans', 'strength_plan_items',
    'strength_sessions', 'strength_set_logs'
  ] loop
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', table_name || '_select_own', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', table_name || '_insert_own', table_name);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name || '_update_own', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', table_name || '_delete_own', table_name);
  end loop;
end $$;

grant select, insert, update, delete on public.running_plans, public.running_plan_items,
  public.running_sessions, public.exercises, public.exercise_muscles, public.strength_plans,
  public.strength_plan_items, public.strength_sessions, public.strength_set_logs to authenticated;

alter table public.schedule_source_links drop constraint schedule_source_links_source_type_check;
alter table public.schedule_source_links add constraint schedule_source_links_source_type_check
  check (source_type in ('meal', 'review', 'running_plan_item', 'strength_plan'));

create or replace function public.schedule_linked_source(
  p_source_type text,
  p_source_id uuid,
  p_planned_date date,
  p_scheduled_start_at timestamptz,
  p_duration_minutes integer
)
returns public.tasks
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_title text;
  v_task public.tasks;
  v_task_id uuid;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_duration_minutes < 1 or p_duration_minutes > 1440 then raise exception 'invalid duration'; end if;

  if p_source_type = 'meal' then
    select title into v_title from public.meals where id = p_source_id and user_id = v_user_id;
  elsif p_source_type = 'review' then
    select case kind when 'daily' then 'Daily Review' else 'Weekly Review' end into v_title
      from public.review_records where id = p_source_id and user_id = v_user_id and archived_at is null;
  elsif p_source_type = 'running_plan_item' then
    select 'Run: ' || i.title into v_title
      from public.running_plan_items i join public.running_plans p on p.id = i.plan_id and p.user_id = i.user_id
      where i.id = p_source_id and i.user_id = v_user_id and i.archived_at is null and p.archived_at is null;
  elsif p_source_type = 'strength_plan' then
    select 'Strength: ' || name into v_title from public.strength_plans
      where id = p_source_id and user_id = v_user_id and archived_at is null;
  else
    raise exception 'unsupported schedule source';
  end if;

  if p_source_type = 'meal' then
    update public.meals set date = p_planned_date, planned_at = p_scheduled_start_at, updated_at = now()
      where id = p_source_id and user_id = v_user_id;
  end if;
  if v_title is null then raise exception 'source not found'; end if;

  select task_id into v_task_id from public.schedule_source_links
    where user_id = v_user_id and source_type = p_source_type and source_id = p_source_id;
  if v_task_id is null then
    insert into public.tasks (user_id, title, status, priority, planned_date, scheduled_start_at, duration_minutes)
      values (v_user_id, v_title, 'planned', 'none', p_planned_date, p_scheduled_start_at, p_duration_minutes)
      returning id into v_task_id;
    insert into public.schedule_source_links (user_id, source_type, source_id, task_id)
      values (v_user_id, p_source_type, p_source_id, v_task_id);
  else
    update public.tasks set title = v_title, status = 'planned', completed_at = null,
      planned_date = p_planned_date, scheduled_start_at = p_scheduled_start_at,
      duration_minutes = p_duration_minutes, updated_at = now()
      where id = v_task_id and user_id = v_user_id and archived_at is null;
  end if;
  select * into v_task from public.tasks where id = v_task_id and user_id = v_user_id;
  return v_task;
end;
$$;

create or replace function public.complete_running_session(p_session_id uuid, p_completed_at timestamptz)
returns public.running_sessions language plpgsql security definer set search_path = public as $$
declare v_user_id uuid := auth.uid(); v_session public.running_sessions;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  update public.running_sessions set status = 'completed', completed_at = p_completed_at, updated_at = now()
    where id = p_session_id and user_id = v_user_id and archived_at is null returning * into v_session;
  if v_session.id is null then raise exception 'running session not found'; end if;
  if v_session.plan_item_id is not null then
    update public.tasks t set status = 'done', completed_at = p_completed_at, updated_at = now()
      from public.schedule_source_links l where l.user_id = v_user_id and l.source_type = 'running_plan_item'
      and l.source_id = v_session.plan_item_id and l.task_id = t.id and t.user_id = v_user_id;
  end if;
  return v_session;
end;
$$;

create or replace function public.complete_strength_session(p_session_id uuid, p_completed_at timestamptz)
returns public.strength_sessions language plpgsql security definer set search_path = public as $$
declare v_user_id uuid := auth.uid(); v_session public.strength_sessions;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  update public.strength_sessions set status = 'completed', completed_at = p_completed_at, updated_at = now()
    where id = p_session_id and user_id = v_user_id and archived_at is null returning * into v_session;
  if v_session.id is null then raise exception 'strength session not found'; end if;
  if v_session.plan_id is not null then
    update public.tasks t set status = 'done', completed_at = p_completed_at, updated_at = now()
      from public.schedule_source_links l where l.user_id = v_user_id and l.source_type = 'strength_plan'
      and l.source_id = v_session.plan_id and l.task_id = t.id and t.user_id = v_user_id;
  end if;
  return v_session;
end;
$$;

create or replace function public.sync_schedule_source_from_task()
returns trigger language plpgsql security invoker set search_path = public as $$
declare v_link public.schedule_source_links;
begin
  if new.status = 'done' and old.status is distinct from 'done' then
    select * into v_link from public.schedule_source_links where task_id = new.id and user_id = new.user_id;
    if v_link.source_type = 'meal' then
      update public.meals set completed_at = coalesce(new.completed_at, now()), updated_at = now()
        where id = v_link.source_id and user_id = new.user_id and completed_at is null;
    elsif v_link.source_type = 'review' then
      update public.review_records set status = 'completed', completed_at = coalesce(new.completed_at, now()), updated_at = now()
        where id = v_link.source_id and user_id = new.user_id and archived_at is null and status <> 'completed';
    elsif v_link.source_type = 'running_plan_item' and not exists (
      select 1 from public.running_sessions where user_id = new.user_id and plan_item_id = v_link.source_id
        and status = 'completed' and archived_at is null
    ) then raise exception 'complete the running session before its task';
    elsif v_link.source_type = 'strength_plan' and not exists (
      select 1 from public.strength_sessions where user_id = new.user_id and plan_id = v_link.source_id
        and status = 'completed' and archived_at is null
    ) then raise exception 'complete the strength session before its task';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.complete_running_session(uuid, timestamptz) from public, anon;
revoke all on function public.complete_strength_session(uuid, timestamptz) from public, anon;
grant execute on function public.complete_running_session(uuid, timestamptz) to authenticated;
grant execute on function public.complete_strength_session(uuid, timestamptz) to authenticated;
