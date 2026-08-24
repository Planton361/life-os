-- SR1-01B2 keeps Review lifecycle and period identity in review_records.
-- The linked Task is its only executable and schedulable occurrence.

drop trigger if exists sync_schedule_task_from_review_after_update on public.review_records;
drop function if exists public.sync_schedule_task_from_review();

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
  v_review_completed_at timestamptz;
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
    select case review_records.kind when 'daily' then 'Daily Review' else 'Weekly Review' end,
           review_records.completed_at
      into v_title, v_review_completed_at
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
      user_id, title, status, priority, planned_date, scheduled_start_at,
      duration_minutes, completed_at
    ) values (
      v_user_id,
      v_title,
      case
        when p_source_type = 'meal' and v_meal_completed_at is not null then 'done'::public.task_status
        when p_source_type = 'review' and v_review_completed_at is not null then 'done'::public.task_status
        else 'planned'::public.task_status
      end,
      'none',
      p_planned_date,
      p_scheduled_start_at,
      p_duration_minutes,
      case
        when p_source_type = 'meal' then v_meal_completed_at
        when p_source_type = 'review' then v_review_completed_at
        else null
      end
    )
    returning id into v_task_id;

    insert into public.schedule_source_links (
      user_id, source_type, source_id, task_id
    ) values (
      v_user_id, p_source_type, p_source_id, v_task_id
    );
  else
    update public.tasks
      set title = v_title,
          status = case
            when p_source_type = 'meal' and v_meal_completed_at is not null then 'done'::public.task_status
            when p_source_type = 'review' and v_review_completed_at is not null then 'done'::public.task_status
            else 'planned'::public.task_status
          end,
          completed_at = case
            when p_source_type = 'meal' then v_meal_completed_at
            when p_source_type = 'review' then v_review_completed_at
            else null
          end,
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

create or replace function public.save_review_record(
  p_kind public.review_kind,
  p_period_start date,
  p_period_end date,
  p_timezone text,
  p_status public.review_record_status,
  p_outcome text,
  p_wins text[],
  p_blockers text[],
  p_open_loops text[],
  p_next_period_focus text,
  p_planning_note text
)
returns public.review_records
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_saved public.review_records;
  v_task_id uuid;
  v_task public.tasks;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  insert into public.review_records (
    user_id, kind, period_start, period_end, timezone, status, outcome,
    wins, blockers, open_loops, next_period_focus, planning_note, completed_at
  ) values (
    v_user_id, p_kind, p_period_start, p_period_end, p_timezone, p_status,
    nullif(btrim(p_outcome), ''), coalesce(p_wins, '{}'),
    coalesce(p_blockers, '{}'), coalesce(p_open_loops, '{}'),
    nullif(btrim(p_next_period_focus), ''), nullif(btrim(p_planning_note), ''),
    case when p_status = 'completed' then now() else null end
  )
  on conflict (user_id, kind, period_start) where archived_at is null
  do update set
    period_end = excluded.period_end,
    timezone = excluded.timezone,
    status = excluded.status,
    outcome = excluded.outcome,
    wins = excluded.wins,
    blockers = excluded.blockers,
    open_loops = excluded.open_loops,
    next_period_focus = excluded.next_period_focus,
    planning_note = excluded.planning_note,
    completed_at = case
      when excluded.status = 'completed' then coalesce(review_records.completed_at, excluded.completed_at)
      else null
    end
  returning * into v_saved;

  if v_saved.status = 'completed' then
    perform pg_advisory_xact_lock(
      hashtextextended('review:' || v_saved.id::text, 0)
    );

    select schedule_source_links.task_id
      into v_task_id
      from public.schedule_source_links
      where schedule_source_links.user_id = v_user_id
        and schedule_source_links.source_type = 'review'
        and schedule_source_links.source_id = v_saved.id
      for update;

    if v_task_id is not null then
      update public.tasks
        set status = 'done',
            completed_at = coalesce(tasks.completed_at, v_saved.completed_at),
            updated_at = case when tasks.status is distinct from 'done' then now() else tasks.updated_at end
        where tasks.id = v_task_id
          and tasks.user_id = v_user_id
          and tasks.archived_at is null
          and tasks.status <> 'archived'
        returning * into v_task;

      if v_task.id is null then
        raise exception 'linked review task is unavailable';
      end if;
    end if;
  end if;

  return v_saved;
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

-- Review lifecycle is owned by the Review flow. This trigger retains only
-- the existing workout guard semantics until their dedicated SR1 slices.
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

    if v_link.source_type = 'running_plan_item' and not exists (
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

revoke all on function public.save_review_record(
  public.review_kind, date, date, text, public.review_record_status, text,
  text[], text[], text[], text, text
) from public, anon;
revoke all on function public.schedule_linked_source(text, uuid, date, timestamptz, integer)
  from public, anon;
revoke all on function public.complete_linked_task(uuid, timestamptz)
  from public, anon;
grant execute on function public.save_review_record(
  public.review_kind, date, date, text, public.review_record_status, text,
  text[], text[], text[], text, text
) to authenticated;
grant execute on function public.schedule_linked_source(text, uuid, date, timestamptz, integer)
  to authenticated;
grant execute on function public.complete_linked_task(uuid, timestamptz)
  to authenticated;
