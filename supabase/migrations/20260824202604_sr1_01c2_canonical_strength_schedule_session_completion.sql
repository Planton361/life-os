-- SR1-01C2 keeps Calendar time on the canonical Task occurrence. Strength
-- Plans own planned exercises; a completed Session with real Set Logs owns the
-- fact of training and may atomically complete its linked Task.

create or replace function public.complete_strength_session(
  p_session_id uuid,
  p_completed_at timestamptz
)
returns public.strength_sessions
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.strength_sessions;
  v_task_id uuid;
  v_task public.tasks;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_session_id is null or p_completed_at is null then
    raise exception 'strength session and completion time are required';
  end if;

  select *
    into v_session
    from public.strength_sessions
    where strength_sessions.id = p_session_id
      and strength_sessions.user_id = v_user_id
      and strength_sessions.archived_at is null
    for update;

  if v_session.id is null then
    raise exception 'strength session not found';
  end if;

  -- This is the existing domain rule: only a Session with at least one real
  -- Set Log may become completed. Do not infer a set from Task completion.
  if not exists (
    select 1
    from public.strength_set_logs
    where strength_set_logs.session_id = v_session.id
      and strength_set_logs.user_id = v_user_id
  ) then
    raise exception 'log at least one set before completion';
  end if;

  if v_session.plan_id is not null then
    perform pg_advisory_xact_lock(
      hashtextextended('strength_plan:' || v_session.plan_id::text, 0)
    );

    select schedule_source_links.task_id
      into v_task_id
      from public.schedule_source_links
      where schedule_source_links.user_id = v_user_id
        and schedule_source_links.source_type = 'strength_plan'
        and schedule_source_links.source_id = v_session.plan_id
      for update;
  end if;

  update public.strength_sessions
    set status = 'completed',
        completed_at = coalesce(strength_sessions.completed_at, p_completed_at),
        updated_at = case
          when strength_sessions.status is distinct from 'completed' then now()
          else strength_sessions.updated_at
        end
    where strength_sessions.id = v_session.id
      and strength_sessions.user_id = v_user_id
    returning * into v_session;

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
      raise exception 'linked strength task is unavailable';
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
  v_strength_completed_at timestamptz;
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
  elsif v_link.id is not null and v_link.source_type = 'strength_plan' then
    perform pg_advisory_xact_lock(
      hashtextextended('strength_plan:' || v_link.source_id::text, 0)
    );

    select *
      into v_link
      from public.schedule_source_links
      where schedule_source_links.user_id = v_user_id
        and schedule_source_links.task_id = p_task_id
      for update;

    if v_link.id is null or v_link.source_type <> 'strength_plan' then
      raise exception 'linked strength source changed during completion';
    end if;

    select strength_sessions.completed_at
      into v_strength_completed_at
      from public.strength_sessions
      where strength_sessions.user_id = v_user_id
        and strength_sessions.plan_id = v_link.source_id
        and strength_sessions.status = 'completed'
        and strength_sessions.completed_at is not null
        and strength_sessions.archived_at is null
        and exists (
          select 1
          from public.strength_set_logs
          where strength_set_logs.session_id = strength_sessions.id
            and strength_set_logs.user_id = v_user_id
        )
      order by strength_sessions.completed_at asc, strength_sessions.id asc
      limit 1
      for update;

    if v_strength_completed_at is null then
      raise exception 'complete the strength session through its strength flow';
    end if;
  end if;

  update public.tasks
    set status = 'done',
        completed_at = coalesce(
          tasks.completed_at,
          v_running_completed_at,
          v_strength_completed_at,
          p_completed_at
        ),
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

-- Retain the existing direct-task DML guard as defence in depth. The controlled
-- RPC above is the canonical application path and additionally verifies Set Logs.
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
        and exists (
          select 1
          from public.strength_set_logs
          where strength_set_logs.session_id = strength_sessions.id
            and strength_set_logs.user_id = new.user_id
        )
    ) then
      raise exception 'complete the strength session before its task';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.complete_strength_session(uuid, timestamptz) from public, anon;
revoke all on function public.complete_linked_task(uuid, timestamptz) from public, anon;
grant execute on function public.complete_strength_session(uuid, timestamptz) to authenticated;
grant execute on function public.complete_linked_task(uuid, timestamptz) to authenticated;
