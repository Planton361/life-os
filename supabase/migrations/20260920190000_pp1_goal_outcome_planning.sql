-- PP1 — Goal Outcome Planning
-- Goal milestones, typed outcome criteria/evaluations and explicit support context.
-- Legacy goals.progress/measure/target_value remain compatibility fields.

create type public.goal_milestone_status as enum (
  'planned',
  'active',
  'achieved',
  'archived'
);

create type public.goal_criterion_type as enum (
  'boolean',
  'numeric'
);

create type public.goal_criterion_direction as enum (
  'at_least',
  'at_most',
  'exact'
);

alter table public.goals
  add column achieved_at timestamptz,
  add column achievement_note text;

alter table public.goals
  add constraint goals_user_id_id_key unique (user_id, id);

alter table public.projects
  add constraint projects_user_id_id_goal_id_key unique (user_id, id, goal_id);

alter table public.tasks
  add constraint tasks_user_id_id_goal_id_key unique (user_id, id, goal_id);

create table public.goal_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null,
  title text not null,
  description text,
  target_date date,
  status public.goal_milestone_status not null default 'planned',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint goal_milestones_title_not_blank check (length(btrim(title)) > 0),
  constraint goal_milestones_archive_consistency check (
    (status = 'archived' and archived_at is not null)
    or (status <> 'archived' and archived_at is null)
  ),
  constraint goal_milestones_goal_owner_fkey
    foreign key (user_id, goal_id)
    references public.goals(user_id, id)
    on delete cascade
);

alter table public.goal_milestones
  add constraint goal_milestones_user_goal_id_key unique (user_id, goal_id, id);

comment on table public.goal_milestones is
  'Goal-specific outcome milestones. Project milestones remain project-owned.';
comment on column public.goal_milestones.sort_order is
  'Presentation order only; it never creates a dependency.';

create table public.goal_outcome_criteria (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null,
  goal_milestone_id uuid,
  title text not null,
  criterion_type public.goal_criterion_type not null,
  unit text,
  target numeric,
  direction public.goal_criterion_direction,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint goal_outcome_criteria_title_not_blank check (length(btrim(title)) > 0),
  constraint goal_outcome_criteria_shape check (
    (
      criterion_type = 'boolean'
      and unit is null
      and target is null
      and direction is null
    )
    or (
      criterion_type = 'numeric'
      and unit is not null
      and length(btrim(unit)) > 0
      and target is not null
      and target <> 'NaN'::numeric
      and target <> 'Infinity'::numeric
      and target <> '-Infinity'::numeric
      and direction is not null
    )
  ),
  constraint goal_outcome_criteria_goal_owner_fkey
    foreign key (user_id, goal_id)
    references public.goals(user_id, id)
    on delete cascade,
  constraint goal_outcome_criteria_milestone_owner_fkey
    foreign key (user_id, goal_id, goal_milestone_id)
    references public.goal_milestones(user_id, goal_id, id)
    on delete restrict
);

alter table public.goal_outcome_criteria
  add constraint goal_outcome_criteria_user_id_key unique (user_id, id);

comment on table public.goal_outcome_criteria is
  'Typed Goal outcome criteria. Active rows are canonical PP1 outcome truth.';

create table public.goal_criterion_evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  criterion_id uuid not null,
  boolean_value boolean,
  numeric_value numeric,
  unit text,
  evaluated_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now(),
  constraint goal_criterion_evaluations_one_value check (
    (boolean_value is not null and numeric_value is null)
    or (boolean_value is null and numeric_value is not null)
  ),
  constraint goal_criterion_evaluations_numeric_finite check (
    numeric_value is null
    or (
      numeric_value <> 'NaN'::numeric
      and numeric_value <> 'Infinity'::numeric
      and numeric_value <> '-Infinity'::numeric
    )
  ),
  constraint goal_criterion_evaluations_user_criterion_fkey
    foreign key (user_id, criterion_id)
    references public.goal_outcome_criteria(user_id, id)
    on delete cascade
);

comment on table public.goal_criterion_evaluations is
  'Append-only Goal criterion evaluation history; latest row drives presentation.';

create table public.goal_milestone_project_support (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null,
  goal_milestone_id uuid not null,
  project_id uuid not null,
  created_at timestamptz not null default now(),
  constraint goal_milestone_project_support_unique_project
    unique (user_id, project_id),
  constraint goal_milestone_project_support_milestone_fkey
    foreign key (user_id, goal_id, goal_milestone_id)
    references public.goal_milestones(user_id, goal_id, id)
    on delete cascade,
  constraint goal_milestone_project_support_project_goal_fkey
    foreign key (user_id, project_id, goal_id)
    references public.projects(user_id, id, goal_id)
    on delete cascade
);

create table public.goal_milestone_task_support (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null,
  goal_milestone_id uuid not null,
  task_id uuid not null,
  created_at timestamptz not null default now(),
  constraint goal_milestone_task_support_unique_task
    unique (user_id, task_id),
  constraint goal_milestone_task_support_milestone_fkey
    foreign key (user_id, goal_id, goal_milestone_id)
    references public.goal_milestones(user_id, goal_id, id)
    on delete cascade,
  constraint goal_milestone_task_support_task_fkey
    foreign key (user_id, task_id, goal_id)
    references public.tasks(user_id, id, goal_id)
    on delete cascade
);

create index goal_milestones_user_goal_order_idx
  on public.goal_milestones (user_id, goal_id, sort_order, id)
  where archived_at is null;
create index goal_milestones_user_goal_status_idx
  on public.goal_milestones (user_id, goal_id, status);
create index goal_outcome_criteria_user_goal_active_idx
  on public.goal_outcome_criteria (user_id, goal_id, created_at, id)
  where archived_at is null;
create index goal_outcome_criteria_user_milestone_idx
  on public.goal_outcome_criteria (user_id, goal_milestone_id)
  where archived_at is null;
create index goal_criterion_evaluations_user_criterion_latest_idx
  on public.goal_criterion_evaluations (user_id, criterion_id, evaluated_at desc, created_at desc, id desc);
create index goal_milestone_project_support_user_goal_idx
  on public.goal_milestone_project_support (user_id, goal_id, goal_milestone_id);
create index goal_milestone_task_support_user_goal_idx
  on public.goal_milestone_task_support (user_id, goal_id, goal_milestone_id);

create trigger goal_milestones_set_updated_at
  before update on public.goal_milestones
  for each row execute function public.set_updated_at();

create trigger goal_outcome_criteria_set_updated_at
  before update on public.goal_outcome_criteria
  for each row execute function public.set_updated_at();

create or replace function public.validate_goal_criterion_evaluation()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_type public.goal_criterion_type;
  v_unit text;
  v_archived_at timestamptz;
begin
  select criterion_type, unit, archived_at
    into v_type, v_unit, v_archived_at
    from public.goal_outcome_criteria
   where id = new.criterion_id
     and user_id = new.user_id;

  if not found then
    raise exception 'GOAL_CRITERION_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_archived_at is not null then
    raise exception 'GOAL_CRITERION_ARCHIVED' using errcode = 'P0001';
  end if;

  if v_type = 'boolean' then
    if new.boolean_value is null or new.numeric_value is not null or new.unit is not null then
      raise exception 'GOAL_BOOLEAN_EVALUATION_SHAPE' using errcode = '23514';
    end if;
  elsif v_type = 'numeric' then
    if new.boolean_value is not null
       or new.numeric_value is null
       or new.unit is null
       or btrim(new.unit) <> v_unit then
      raise exception 'GOAL_NUMERIC_EVALUATION_UNIT' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger goal_criterion_evaluations_validate
  before insert on public.goal_criterion_evaluations
  for each row execute function public.validate_goal_criterion_evaluation();

create or replace function public.goal_outcome_criterion_is_met(
  p_user_id uuid,
  p_criterion_id uuid
)
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce((
    select case
      when c.criterion_type = 'boolean' then e.boolean_value is true
      when c.direction = 'at_least' then e.numeric_value >= c.target
      when c.direction = 'at_most' then e.numeric_value <= c.target
      when c.direction = 'exact' then e.numeric_value = c.target
      else false
    end
      from public.goal_outcome_criteria c
      left join lateral (
        select e.boolean_value, e.numeric_value
          from public.goal_criterion_evaluations e
         where e.user_id = c.user_id
           and e.criterion_id = c.id
         order by e.evaluated_at desc, e.created_at desc, e.id desc
         limit 1
      ) e on true
     where c.user_id = p_user_id
       and c.id = p_criterion_id
       and c.archived_at is null
  ), false);
$$;

create or replace function public.validate_goal_achievement()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'achieved'
     and (tg_op = 'INSERT' or old.status is distinct from 'achieved') then
    if new.archived_at is not null then
      raise exception 'GOAL_ARCHIVED' using errcode = 'P0001';
    end if;

    if not exists (
      select 1
        from public.goal_outcome_criteria c
       where c.user_id = new.user_id
         and c.goal_id = new.id
         and c.archived_at is null
    ) then
      raise exception 'GOAL_ACHIEVEMENT_NO_ACTIVE_CRITERIA' using errcode = 'P0001';
    end if;

    if exists (
      select 1
        from public.goal_outcome_criteria c
       where c.user_id = new.user_id
         and c.goal_id = new.id
         and c.archived_at is null
         and not public.goal_outcome_criterion_is_met(c.user_id, c.id)
    ) then
      raise exception 'GOAL_ACHIEVEMENT_CRITERIA_NOT_MET' using errcode = 'P0001';
    end if;

    if exists (
      select 1
        from public.goal_milestones m
       where m.user_id = new.user_id
         and m.goal_id = new.id
         and m.archived_at is null
         and m.status <> 'achieved'
    ) then
      raise exception 'GOAL_ACHIEVEMENT_MILESTONES_NOT_ACHIEVED' using errcode = 'P0001';
    end if;

    if new.achieved_at is null then
      new.achieved_at := now();
    end if;
  end if;

  return new;
end;
$$;

create trigger goals_validate_achievement
  before insert or update of status on public.goals
  for each row execute function public.validate_goal_achievement();

create or replace function public.validate_goal_milestone_project_support()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1
      from public.goal_milestones m
     where m.user_id = new.user_id
       and m.id = new.goal_milestone_id
       and (m.archived_at is not null or m.status = 'archived')
  ) then
    raise exception 'GOAL_MILESTONE_ARCHIVED' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
      from public.projects p
     where p.user_id = new.user_id
       and p.id = new.project_id
       and p.archived_at is null
       and p.goal_id = new.goal_id
  ) then
    raise exception 'GOAL_PROJECT_SUPPORT_TARGET_INVALID' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger goal_milestone_project_support_validate
  before insert or update on public.goal_milestone_project_support
  for each row execute function public.validate_goal_milestone_project_support();

create or replace function public.validate_goal_milestone_task_support()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_direct_goal uuid;
  v_project_id uuid;
  v_project_goal uuid;
  v_resolved_goal uuid;
begin
  select t.goal_id, t.project_id
    into v_direct_goal, v_project_id
    from public.tasks t
   where t.user_id = new.user_id
     and t.id = new.task_id
     and t.archived_at is null;

  if not found then
    raise exception 'GOAL_TASK_SUPPORT_TARGET_INVALID' using errcode = 'P0001';
  end if;

  if v_project_id is not null then
    select p.goal_id
      into v_project_goal
      from public.projects p
     where p.user_id = new.user_id
       and p.id = v_project_id
       and p.archived_at is null;

    if not found then
      raise exception 'GOAL_TASK_SUPPORT_TARGET_INVALID' using errcode = 'P0001';
    end if;
  end if;

  if v_direct_goal is not null and v_project_goal is not null and v_direct_goal <> v_project_goal then
    raise exception 'GOAL_TASK_SUPPORT_GOAL_CONFLICT' using errcode = 'P0001';
  end if;

  v_resolved_goal := coalesce(v_direct_goal, v_project_goal);

  if v_resolved_goal is null or v_resolved_goal <> new.goal_id then
    raise exception 'GOAL_TASK_SUPPORT_GOAL_MISMATCH' using errcode = 'P0001';
  end if;

  if exists (
    select 1
      from public.goal_milestones m
     where m.user_id = new.user_id
       and m.id = new.goal_milestone_id
       and (m.archived_at is not null or m.status = 'archived')
  ) then
    raise exception 'GOAL_MILESTONE_ARCHIVED' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger goal_milestone_task_support_validate
  before insert or update on public.goal_milestone_task_support
  for each row execute function public.validate_goal_milestone_task_support();

alter table public.goal_milestones enable row level security;
alter table public.goal_outcome_criteria enable row level security;
alter table public.goal_criterion_evaluations enable row level security;
alter table public.goal_milestone_project_support enable row level security;
alter table public.goal_milestone_task_support enable row level security;

create policy "Users can select own goal milestones"
  on public.goal_milestones for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can insert own goal milestones"
  on public.goal_milestones for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update own goal milestones"
  on public.goal_milestones for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can select own goal outcome criteria"
  on public.goal_outcome_criteria for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can insert own goal outcome criteria"
  on public.goal_outcome_criteria for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update own goal outcome criteria"
  on public.goal_outcome_criteria for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can select own goal criterion evaluations"
  on public.goal_criterion_evaluations for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can insert own goal criterion evaluations"
  on public.goal_criterion_evaluations for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can select own goal milestone project support"
  on public.goal_milestone_project_support for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can insert own goal milestone project support"
  on public.goal_milestone_project_support for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can delete own goal milestone project support"
  on public.goal_milestone_project_support for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can select own goal milestone task support"
  on public.goal_milestone_task_support for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can insert own goal milestone task support"
  on public.goal_milestone_task_support for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can delete own goal milestone task support"
  on public.goal_milestone_task_support for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update on public.goal_milestones to authenticated;
grant select, insert, update on public.goal_outcome_criteria to authenticated;
grant select, insert on public.goal_criterion_evaluations to authenticated;
grant select, insert, delete on public.goal_milestone_project_support to authenticated;
grant select, insert, delete on public.goal_milestone_task_support to authenticated;
