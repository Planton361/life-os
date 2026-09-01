create or replace function public.unschedule_linked_meal_task(
  p_task_id uuid,
  p_planned_date date default null,
  p_duration_minutes integer default null
)
returns public.tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_link public.schedule_source_links;
  v_task public.tasks;
  v_planned_date date;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_task_id is null then
    raise exception 'task is required';
  end if;

  if p_duration_minutes is not null
    and (p_duration_minutes < 1 or p_duration_minutes > 1440) then
    raise exception 'invalid schedule duration';
  end if;

  select *
    into v_task
    from public.tasks
    where tasks.id = p_task_id
      and tasks.user_id = v_user_id
      and tasks.archived_at is null
      and tasks.status <> 'archived'
    for update;

  if v_task.id is null then
    raise exception 'task not found';
  end if;

  select *
    into v_link
    from public.schedule_source_links
    where schedule_source_links.user_id = v_user_id
      and schedule_source_links.task_id = p_task_id
    for update;

  if v_link.id is null or v_link.source_type <> 'meal' then
    raise exception 'task is not linked to a meal';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('meal:' || v_link.source_id::text, 0)
  );

  select *
    into v_link
    from public.schedule_source_links
    where schedule_source_links.user_id = v_user_id
      and schedule_source_links.task_id = p_task_id
    for update;

  if v_link.id is null or v_link.source_type <> 'meal' then
    raise exception 'linked meal changed during unschedule';
  end if;

  v_planned_date := coalesce(p_planned_date, v_task.planned_date);

  update public.meals
    set date = v_planned_date,
        planned_at = null,
        updated_at = now()
    where meals.id = v_link.source_id
      and meals.user_id = v_user_id;

  if not found then
    raise exception 'linked meal is unavailable';
  end if;

  update public.tasks
    set planned_date = v_planned_date,
        scheduled_start_at = null,
        duration_minutes = coalesce(p_duration_minutes, tasks.duration_minutes),
        updated_at = now()
    where tasks.id = p_task_id
      and tasks.user_id = v_user_id
    returning * into v_task;

  return v_task;
end;
$$;

revoke all on function public.unschedule_linked_meal_task(uuid, date, integer)
  from public, anon;
grant execute on function public.unschedule_linked_meal_task(uuid, date, integer)
  to authenticated;
