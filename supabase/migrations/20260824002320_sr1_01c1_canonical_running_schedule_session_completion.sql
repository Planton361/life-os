-- SR1-01C1 keeps Calendar time on the canonical Task occurrence. Running
-- plans/items own training intent; a fully recorded Running Session owns the
-- fact of completion and may atomically complete its linked Task.

create or replace function public.save_completed_running_session(
  p_session_id uuid,
  p_plan_item_id uuid,
  p_session_date date,
  p_started_at timestamptz,
  p_distance_km numeric,
  p_duration_minutes integer,
  p_average_heart_rate integer,
  p_notes text,
  p_completed_at timestamptz
)
returns public.running_sessions
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.running_sessions;
  v_task_id uuid;
  v_task public.tasks;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_session_date is null or p_completed_at is null then
    raise exception 'running session date and completion time are required';
  end if;

  if p_distance_km is null or p_distance_km <= 0
    or p_duration_minutes is null or p_duration_minutes <= 0 then
    raise exception 'distance and duration must be positive';
  end if;

  if p_average_heart_rate is not null
    and p_average_heart_rate not between 30 and 240 then
    raise exception 'average heart rate is invalid';
  end if;

  if p_plan_item_id is not null then
    perform pg_advisory_xact_lock(
      hashtextextended('running_plan_item:' || p_plan_item_id::text, 0)
    );

    if not exists (
      select 1
      from public.running_plan_items item
      join public.running_plans plan
        on plan.id = item.plan_id
       and plan.user_id = item.user_id
      where item.id = p_plan_item_id
        and item.user_id = v_user_id
        and item.archived_at is null
        and plan.archived_at is null
    ) then
      raise exception 'running plan item not found or inactive';
    end if;
  end if;

  if p_session_id is null then
    insert into public.running_sessions (
      user_id, plan_item_id, session_date, started_at, distance_km,
      duration_minutes, average_heart_rate, notes, status, completed_at
    ) values (
      v_user_id, p_plan_item_id, p_session_date, p_started_at, p_distance_km,
      p_duration_minutes, p_average_heart_rate, p_notes, 'completed', p_completed_at
    )
    returning * into v_session;
  else
    update public.running_sessions
      set plan_item_id = p_plan_item_id,
          session_date = p_session_date,
          started_at = p_started_at,
          distance_km = p_distance_km,
          duration_minutes = p_duration_minutes,
          average_heart_rate = p_average_heart_rate,
          notes = p_notes,
          status = 'completed',
          completed_at = coalesce(running_sessions.completed_at, p_completed_at),
          updated_at = now()
      where running_sessions.id = p_session_id
        and running_sessions.user_id = v_user_id
        and running_sessions.archived_at is null
      returning * into v_session;

    if v_session.id is null then
      raise exception 'running session not found';
    end if;
  end if;

  if v_session.plan_item_id is not null then
    select schedule_source_links.task_id
      into v_task_id
      from public.schedule_source_links
      where schedule_source_links.user_id = v_user_id
        and schedule_source_links.source_type = 'running_plan_item'
        and schedule_source_links.source_id = v_session.plan_item_id
      for update;

    if v_task_id is not null then
      update public.tasks
        set status = 'done',
            completed_at = coalesce(tasks.completed_at, v_session.completed_at),
            updated_at = case
              when tasks.status is distinct from 'done' then now()
              else tasks.updated_at
            end
        where tasks.id = v_task_id
          and tasks.user_id = v_user_id
          and tasks.archived_at is null
          and tasks.status <> 'archived'
        returning * into v_task;

      if v_task.id is null then
        raise exception 'linked running task is unavailable';
      end if;
    end if;
  end if;

  return v_session;
end;
$$;

create or replace function public.complete_running_session(
  p_session_id uuid,
  p_completed_at timestamptz
)
returns public.running_sessions
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.running_sessions;
  v_task_id uuid;
  v_task public.tasks;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_session_id is null or p_completed_at is null then
    raise exception 'running session and completion time are required';
  end if;

  select *
    into v_session
    from public.running_sessions
    where running_sessions.id = p_session_id
      and running_sessions.user_id = v_user_id
      and running_sessions.archived_at is null
    for update;

  if v_session.id is null then
    raise exception 'running session not found';
  end if;

  if v_session.plan_item_id is not null then
    perform pg_advisory_xact_lock(
      hashtextextended('running_plan_item:' || v_session.plan_item_id::text, 0)
    );

    if not exists (
      select 1
      from public.running_plan_items item
      join public.running_plans plan
        on plan.id = item.plan_id
       and plan.user_id = item.user_id
      where item.id = v_session.plan_item_id
        and item.user_id = v_user_id
        and item.archived_at is null
        and plan.archived_at is null
    ) then
      raise exception 'running plan item not found or inactive';
    end if;
  end if;

  update public.running_sessions
    set status = 'completed',
        completed_at = coalesce(running_sessions.completed_at, p_completed_at),
        updated_at = case
          when running_sessions.status is distinct from 'completed' then now()
          else running_sessions.updated_at
        end
    where running_sessions.id = v_session.id
      and running_sessions.user_id = v_user_id
    returning * into v_session;

  if v_session.plan_item_id is not null then
    select schedule_source_links.task_id
      into v_task_id
      from public.schedule_source_links
      where schedule_source_links.user_id = v_user_id
        and schedule_source_links.source_type = 'running_plan_item'
        and schedule_source_links.source_id = v_session.plan_item_id
      for update;

    if v_task_id is not null then
      update public.tasks
        set status = 'done',
            completed_at = coalesce(tasks.completed_at, v_session.completed_at),
            updated_at = case
              when tasks.status is distinct from 'done' then now()
              else tasks.updated_at
            end
        where tasks.id = v_task_id
          and tasks.user_id = v_user_id
          and tasks.archived_at is null
          and tasks.status <> 'archived'
        returning * into v_task;

      if v_task.id is null then
        raise exception 'linked running task is unavailable';
      end if;
    end if;
  end if;

  return v_session;
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
  v_review public.review_records;
  v_running_completed_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_task_id is null or p_completed_at is null then
    raise exception 'task and completion time are required';
  end if;

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
    perform pg_advisory_xact_lock(
      hashtextextended('review:' || v_link.source_id::text, 0)
    );

    select *
      into v_link
      from public.schedule_source_links
      where schedule_source_links.user_id = v_user_id
        and schedule_source_links.task_id = p_task_id
      for update;

    if v_link.id is null or v_link.source_type <> 'review' then
      raise exception 'linked review changed during completion';
    end if;

    select *
      into v_review
      from public.review_records
      where review_records.id = v_link.source_id
        and review_records.user_id = v_user_id
        and review_records.archived_at is null
      for update;

    if v_review.id is null then
      raise exception 'linked review is unavailable';
    end if;

    if v_review.status <> 'completed' then
      raise exception 'complete the review through its review flow';
    end if;
  elsif v_link.id is not null and v_link.source_type = 'running_plan_item' then
    perform pg_advisory_xact_lock(
      hashtextextended('running_plan_item:' || v_link.source_id::text, 0)
    );

    select *
      into v_link
      from public.schedule_source_links
      where schedule_source_links.user_id = v_user_id
        and schedule_source_links.task_id = p_task_id
      for update;

    if v_link.id is null or v_link.source_type <> 'running_plan_item' then
      raise exception 'linked running source changed during completion';
    end if;

    select running_sessions.completed_at
      into v_running_completed_at
      from public.running_sessions
      where running_sessions.user_id = v_user_id
        and running_sessions.plan_item_id = v_link.source_id
        and running_sessions.status = 'completed'
        and running_sessions.completed_at is not null
        and running_sessions.archived_at is null
      order by running_sessions.completed_at asc, running_sessions.id asc
      limit 1
      for update;

    if v_running_completed_at is null then
      raise exception 'complete the running session through its running flow';
    end if;
  end if;

  update public.tasks
    set status = 'done',
        completed_at = coalesce(tasks.completed_at, v_running_completed_at, p_completed_at),
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

revoke all on function public.save_completed_running_session(
  uuid, uuid, date, timestamptz, numeric, integer, integer, text, timestamptz
) from public, anon;
revoke all on function public.complete_running_session(uuid, timestamptz) from public, anon;
revoke all on function public.complete_linked_task(uuid, timestamptz) from public, anon;
grant execute on function public.save_completed_running_session(
  uuid, uuid, date, timestamptz, numeric, integer, integer, text, timestamptz
) to authenticated;
grant execute on function public.complete_running_session(uuid, timestamptz) to authenticated;
grant execute on function public.complete_linked_task(uuid, timestamptz) to authenticated;
