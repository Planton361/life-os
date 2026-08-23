-- SR1-01B1 keeps Meal as the Nutrition record and Task as the executable
-- occurrence. The supported connection remains the SR1-01A source bridge.
-- Meal-specific synchronization is owned by controlled RPCs, not triggers.

drop trigger if exists sync_schedule_task_from_meal_after_update on public.meals;
drop trigger if exists sync_meal_schedule_from_task_after_update on public.tasks;
drop function if exists public.sync_schedule_task_from_meal();
drop function if exists public.sync_meal_schedule_from_task();

create or replace function public.schedule_linked_source(
  p_source_type text,
  p_source_id uuid,
  p_planned_date date,
  p_scheduled_start_at timestamptz,
  p_duration_minutes integer
)
returns public.tasks
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_title text;
  v_meal_completed_at timestamptz;
  v_task_id uuid;
  v_task public.tasks;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_source_type not in ('meal', 'review', 'running_plan_item', 'strength_plan') then
    raise exception 'unsupported schedule source type';
  end if;

  if p_source_id is null then
    raise exception 'schedule source is required';
  end if;

  if p_planned_date is null or p_scheduled_start_at is null then
    raise exception 'planned date and scheduled start are required';
  end if;

  if p_duration_minutes is null or p_duration_minutes < 1 or p_duration_minutes > 1440 then
    raise exception 'invalid schedule duration';
  end if;

  if p_source_type = 'meal' then
    select meals.title, meals.completed_at
      into v_title, v_meal_completed_at
      from public.meals
      where meals.id = p_source_id
        and meals.user_id = v_user_id;
  elsif p_source_type = 'review' then
    select case review_records.kind when 'daily' then 'Daily Review' else 'Weekly Review' end
      into v_title
      from public.review_records
      where review_records.id = p_source_id
        and review_records.user_id = v_user_id
        and review_records.archived_at is null
        and review_records.status <> 'archived';
  elsif p_source_type = 'running_plan_item' then
    select 'Run: ' || running_plan_items.title
      into v_title
      from public.running_plan_items
      join public.running_plans
        on running_plans.id = running_plan_items.plan_id
       and running_plans.user_id = running_plan_items.user_id
      where running_plan_items.id = p_source_id
        and running_plan_items.user_id = v_user_id
        and running_plan_items.archived_at is null
        and running_plans.archived_at is null;
  else
    select 'Strength: ' || strength_plans.name
      into v_title
      from public.strength_plans
      where strength_plans.id = p_source_id
        and strength_plans.user_id = v_user_id
        and strength_plans.archived_at is null;
  end if;

  if v_title is null then
    raise exception 'schedule source not found or inactive';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_source_type || ':' || p_source_id::text, 0)
  );

  select schedule_source_links.task_id
    into v_task_id
    from public.schedule_source_links
    where schedule_source_links.user_id = v_user_id
      and schedule_source_links.source_type = p_source_type
      and schedule_source_links.source_id = p_source_id
    for update;

  if v_task_id is null then
    insert into public.tasks (
      user_id,
      title,
      status,
      priority,
      planned_date,
      scheduled_start_at,
      duration_minutes,
      completed_at
    ) values (
      v_user_id,
      v_title,
      case
        when p_source_type = 'meal' and v_meal_completed_at is not null then 'done'::public.task_status
        else 'planned'::public.task_status
      end,
      'none',
      p_planned_date,
      p_scheduled_start_at,
      p_duration_minutes,
      case when p_source_type = 'meal' then v_meal_completed_at else null end
    )
    returning id into v_task_id;

    insert into public.schedule_source_links (
      user_id,
      source_type,
      source_id,
      task_id
    ) values (
      v_user_id,
      p_source_type,
      p_source_id,
      v_task_id
    );
  else
    update public.tasks
      set title = v_title,
          status = case
            when p_source_type = 'meal' and v_meal_completed_at is not null then 'done'::public.task_status
            else 'planned'::public.task_status
          end,
          completed_at = case when p_source_type = 'meal' then v_meal_completed_at else null end,
          planned_date = p_planned_date,
          scheduled_start_at = p_scheduled_start_at,
          duration_minutes = p_duration_minutes,
          updated_at = now()
      where tasks.id = v_task_id
        and tasks.user_id = v_user_id
        and tasks.archived_at is null
        and tasks.status <> 'archived'
      returning * into v_task;

    if v_task.id is null then
      raise exception 'linked task is unavailable';
    end if;
  end if;

  if p_source_type = 'meal' then
    update public.meals
      set date = p_planned_date,
          planned_at = p_scheduled_start_at,
          updated_at = now()
      where meals.id = p_source_id
        and meals.user_id = v_user_id;

    if not found then
      raise exception 'meal is unavailable';
    end if;
  end if;

  if v_task.id is null then
    select *
      into v_task
      from public.tasks
      where tasks.id = v_task_id
        and tasks.user_id = v_user_id;
  end if;

  if v_task.id is null then
    raise exception 'linked task is unavailable';
  end if;

  return v_task;
end;
$$;

create or replace function public.complete_linked_meal(
  p_meal_id uuid,
  p_completed_at timestamptz
)
returns public.meals
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_task_id uuid;
  v_task public.tasks;
  v_meal public.meals;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_meal_id is null or p_completed_at is null then
    raise exception 'meal and completion time are required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('meal:' || p_meal_id::text, 0));

  select schedule_source_links.task_id
    into v_task_id
    from public.schedule_source_links
    where schedule_source_links.user_id = v_user_id
      and schedule_source_links.source_type = 'meal'
      and schedule_source_links.source_id = p_meal_id
    for update;

  update public.meals
    set completed_at = coalesce(meals.completed_at, p_completed_at),
        updated_at = case when meals.completed_at is null then now() else meals.updated_at end
    where meals.id = p_meal_id
      and meals.user_id = v_user_id
    returning * into v_meal;

  if v_meal.id is null then
    raise exception 'meal not found';
  end if;

  if v_task_id is not null then
    update public.tasks
      set status = 'done',
          completed_at = coalesce(tasks.completed_at, p_completed_at),
          updated_at = case when tasks.status is distinct from 'done' then now() else tasks.updated_at end
      where tasks.id = v_task_id
        and tasks.user_id = v_user_id
        and tasks.archived_at is null
        and tasks.status <> 'archived'
      returning * into v_task;

    if v_task.id is null then
      raise exception 'linked task is unavailable';
    end if;
  end if;

  return v_meal;
end;
$$;

create or replace function public.complete_linked_task(
  p_task_id uuid,
  p_completed_at timestamptz
)
returns public.tasks
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_link public.schedule_source_links;
  v_task public.tasks;
  v_meal public.meals;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_task_id is null or p_completed_at is null then
    raise exception 'task and completion time are required';
  end if;

  -- Read first without a row lock so the Meal advisory lock shares the same
  -- lock order as schedule_linked_source and complete_linked_meal.
  select *
    into v_link
    from public.schedule_source_links
    where schedule_source_links.user_id = v_user_id
      and schedule_source_links.task_id = p_task_id;

  if v_link.id is not null and v_link.source_type = 'meal' then
    perform pg_advisory_xact_lock(
      hashtextextended('meal:' || v_link.source_id::text, 0)
    );

    select *
      into v_link
      from public.schedule_source_links
      where schedule_source_links.user_id = v_user_id
        and schedule_source_links.task_id = p_task_id
      for update;

    if v_link.id is null or v_link.source_type <> 'meal' then
      raise exception 'linked meal changed during completion';
    end if;

    update public.meals
      set completed_at = coalesce(meals.completed_at, p_completed_at),
          updated_at = case when meals.completed_at is null then now() else meals.updated_at end
      where meals.id = v_link.source_id
        and meals.user_id = v_user_id
      returning * into v_meal;

    if v_meal.id is null then
      raise exception 'linked meal is unavailable';
    end if;
  elsif v_link.id is not null and v_link.source_type = 'review' then
    update public.review_records
      set status = 'completed',
          completed_at = coalesce(review_records.completed_at, p_completed_at),
          updated_at = case when review_records.status <> 'completed' then now() else review_records.updated_at end
      where review_records.id = v_link.source_id
        and review_records.user_id = v_user_id
        and review_records.archived_at is null;
  end if;

  update public.tasks
    set status = 'done',
        completed_at = coalesce(tasks.completed_at, p_completed_at),
        updated_at = case when tasks.status is distinct from 'done' then now() else tasks.updated_at end
    where tasks.id = p_task_id
      and tasks.user_id = v_user_id
      and tasks.archived_at is null
      and tasks.status <> 'archived'
    returning * into v_task;

  if v_task.id is null then
    raise exception 'task not found';
  end if;

  return v_task;
end;
$$;

-- The task-status trigger continues to guard Review and workout semantics.
-- Meal completion is intentionally absent: the two RPCs above own it.
create or replace function public.sync_schedule_source_from_task()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_link public.schedule_source_links;
begin
  if new.status = 'done' and old.status is distinct from 'done' then
    select *
      into v_link
      from public.schedule_source_links
      where task_id = new.id
        and user_id = new.user_id;

    if v_link.source_type = 'review' then
      update public.review_records
        set status = 'completed',
            completed_at = coalesce(new.completed_at, now()),
            updated_at = now()
        where id = v_link.source_id
          and user_id = new.user_id
          and archived_at is null
          and status <> 'completed';
    elsif v_link.source_type = 'running_plan_item' and not exists (
      select 1
      from public.running_sessions
      where user_id = new.user_id
        and plan_item_id = v_link.source_id
        and status = 'completed'
        and archived_at is null
    ) then
      raise exception 'complete the running session before its task';
    elsif v_link.source_type = 'strength_plan' and not exists (
      select 1
      from public.strength_sessions
      where user_id = new.user_id
        and plan_id = v_link.source_id
        and status = 'completed'
        and archived_at is null
    ) then
      raise exception 'complete the strength session before its task';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.schedule_linked_source(text, uuid, date, timestamptz, integer)
  from public, anon;
revoke all on function public.complete_linked_meal(uuid, timestamptz)
  from public, anon;
revoke all on function public.complete_linked_task(uuid, timestamptz)
  from public, anon;
grant execute on function public.schedule_linked_source(text, uuid, date, timestamptz, integer)
  to authenticated;
grant execute on function public.complete_linked_meal(uuid, timestamptz)
  to authenticated;
grant execute on function public.complete_linked_task(uuid, timestamptz)
  to authenticated;
