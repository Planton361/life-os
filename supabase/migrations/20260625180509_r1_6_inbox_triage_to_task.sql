create or replace function public.triage_inbox_item_to_task(
  p_inbox_item_id uuid,
  p_title text,
  p_description text default null,
  p_area_id uuid default null,
  p_project_id uuid default null,
  p_goal_id uuid default null,
  p_priority public.task_priority default null,
  p_energy public.task_energy default null,
  p_planned_date date default null,
  p_scheduled_start_at timestamptz default null,
  p_duration_minutes integer default null,
  p_due_at timestamptz default null
)
returns public.tasks
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_inbox public.inbox_items%rowtype;
  v_task public.tasks%rowtype;
  v_title text := nullif(btrim(p_title), '');
  v_description text := nullif(btrim(p_description), '');
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if v_title is null then
    raise exception 'Task title is required' using errcode = '23514';
  end if;

  if p_duration_minutes is not null and p_duration_minutes <= 0 then
    raise exception 'Task duration must be positive' using errcode = '23514';
  end if;

  select *
    into v_inbox
    from public.inbox_items
   where id = p_inbox_item_id
     and user_id = v_user_id
     and archived_at is null
   for update;

  if not found then
    raise exception 'Inbox item not found' using errcode = 'P0002';
  end if;

  if v_inbox.created_task_id is not null then
    select *
      into v_task
      from public.tasks
     where id = v_inbox.created_task_id
       and user_id = v_user_id
       and archived_at is null;

    if found then
      return v_task;
    end if;

    raise exception 'Inbox item already references a missing task' using errcode = '23503';
  end if;

  if v_inbox.status in ('triaged', 'processed', 'archived') then
    raise exception 'Inbox item is already processed' using errcode = '23505';
  end if;

  if p_area_id is not null and not exists (
    select 1
      from public.areas
     where id = p_area_id
       and user_id = v_user_id
       and archived_at is null
  ) then
    raise exception 'Area not found' using errcode = 'P0002';
  end if;

  if p_project_id is not null and not exists (
    select 1
      from public.projects
     where id = p_project_id
       and user_id = v_user_id
       and archived_at is null
  ) then
    raise exception 'Project not found' using errcode = 'P0002';
  end if;

  if p_goal_id is not null and not exists (
    select 1
      from public.goals
     where id = p_goal_id
       and user_id = v_user_id
       and archived_at is null
  ) then
    raise exception 'Goal not found' using errcode = 'P0002';
  end if;

  insert into public.tasks (
    user_id,
    area_id,
    project_id,
    goal_id,
    source_inbox_item_id,
    title,
    description,
    status,
    priority,
    energy,
    planned_date,
    scheduled_start_at,
    duration_minutes,
    due_at
  )
  values (
    v_user_id,
    coalesce(p_area_id, v_inbox.area_id),
    p_project_id,
    p_goal_id,
    v_inbox.id,
    v_title,
    coalesce(v_description, v_inbox.body),
    'inbox',
    coalesce(p_priority, v_inbox.priority),
    p_energy,
    p_planned_date,
    p_scheduled_start_at,
    p_duration_minutes,
    p_due_at
  )
  returning * into v_task;

  update public.inbox_items
     set status = 'triaged',
         created_task_id = v_task.id,
         processed_at = now(),
         updated_at = now()
   where id = v_inbox.id
     and user_id = v_user_id;

  return v_task;
end;
$$;

grant execute on function public.triage_inbox_item_to_task(
  uuid,
  text,
  text,
  uuid,
  uuid,
  uuid,
  public.task_priority,
  public.task_energy,
  date,
  timestamptz,
  integer,
  timestamptz
) to authenticated;
