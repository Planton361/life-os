-- PP1 repair pass — inherited Task support, deferred evaluations and the
-- accepted reversible Goal-Milestone lifecycle.

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'tasks_user_id_id_unique'
       and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_user_id_id_unique unique (user_id, id);
  end if;
end
$$;

alter table public.goal_milestone_task_support
  drop constraint if exists goal_milestone_task_support_task_fkey;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'goal_milestone_task_support_task_identity_fkey'
       and conrelid = 'public.goal_milestone_task_support'::regclass
  ) then
    alter table public.goal_milestone_task_support
      add constraint goal_milestone_task_support_task_identity_fkey
        foreign key (user_id, task_id)
        references public.tasks(user_id, id)
        on delete cascade;
  end if;
end
$$;

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

  if v_direct_goal is not null
     and v_project_goal is not null
     and v_direct_goal <> v_project_goal then
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

alter table public.goal_criterion_evaluations
  add column if not exists is_deferred boolean not null default false;

alter table public.goal_criterion_evaluations
  drop constraint if exists goal_criterion_evaluations_one_value;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'goal_criterion_evaluations_value_shape'
       and conrelid = 'public.goal_criterion_evaluations'::regclass
  ) then
    alter table public.goal_criterion_evaluations
      add constraint goal_criterion_evaluations_value_shape check (
        (
          is_deferred
          and boolean_value is null
          and numeric_value is null
          and unit is null
        )
        or (
          not is_deferred
          and (
            (boolean_value is not null and numeric_value is null)
            or (boolean_value is null and numeric_value is not null)
          )
        )
      );
  end if;
end
$$;

create or replace function public.validate_goal_milestone_status_transition()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'archived' then
    return new;
  end if;

  if old.status = new.status then
    return new;
  end if;

  if old.status = 'planned' and new.status <> 'active' then
    raise exception 'GOAL_MILESTONE_STATUS_TRANSITION_INVALID' using errcode = 'P0001';
  elsif old.status = 'active' and new.status not in ('planned', 'achieved') then
    raise exception 'GOAL_MILESTONE_STATUS_TRANSITION_INVALID' using errcode = 'P0001';
  elsif old.status = 'achieved' and new.status <> 'active' then
    raise exception 'GOAL_MILESTONE_STATUS_TRANSITION_INVALID' using errcode = 'P0001';
  elsif old.status = 'archived' then
    raise exception 'GOAL_MILESTONE_STATUS_TRANSITION_INVALID' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists goal_milestones_validate_status_transition on public.goal_milestones;

create trigger goal_milestones_validate_status_transition
  before update of status on public.goal_milestones
  for each row execute function public.validate_goal_milestone_status_transition();

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

  if new.is_deferred then
    if new.boolean_value is not null
       or new.numeric_value is not null
       or new.unit is not null then
      raise exception 'GOAL_DEFERRED_EVALUATION_SHAPE' using errcode = '23514';
    end if;
    return new;
  end if;

  if v_type = 'boolean' then
    if new.boolean_value is null
       or new.numeric_value is not null
       or new.unit is not null then
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
      when e.is_deferred then false
      when c.criterion_type = 'boolean' then e.boolean_value is true
      when c.direction = 'at_least' then e.numeric_value >= c.target
      when c.direction = 'at_most' then e.numeric_value <= c.target
      when c.direction = 'exact' then e.numeric_value = c.target
      else false
    end
      from public.goal_outcome_criteria c
      left join lateral (
        select e.is_deferred, e.boolean_value, e.numeric_value
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

revoke update, delete on public.goal_criterion_evaluations from authenticated;

comment on column public.goal_criterion_evaluations.is_deferred is
  'Explicit no-decision evaluation. It is latest-state visible but never met.';
