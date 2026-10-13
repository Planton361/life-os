-- #153: confirmed triage creates planned work. Existing-task retries remain
-- idempotent and retain the historical lifecycle; no data migration.
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
  p_due_at timestamptz default null,
  p_skill_id uuid default null
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

  -- Match the established Task↔Skill boundary: a user-owned Skill is
  -- linkable while it is not archived. A Task context link never creates
  -- Skill Evidence or changes Skill progress.
  if p_skill_id is not null and not exists (
    select 1
      from public.skills
     where id = p_skill_id
       and user_id = v_user_id
       and archived_at is null
       and status <> 'archived'
  ) then
    raise exception 'Skill not found or not linkable' using errcode = 'P0002';
  end if;

  if v_inbox.created_task_id is not null then
    select *
      into v_task
      from public.tasks
     where id = v_inbox.created_task_id
       and user_id = v_user_id
       and archived_at is null;

    if not found then
      raise exception 'Inbox item already references a missing task' using errcode = '23503';
    end if;

    if p_skill_id is not null then
      insert into public.task_skill_links (user_id, task_id, skill_id)
      values (v_user_id, v_task.id, p_skill_id)
      on conflict (user_id, task_id, skill_id) do nothing;
    end if;

    return v_task;
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
       and status <> 'archived'
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
    'planned',
    coalesce(p_priority, v_inbox.priority),
    p_energy,
    p_planned_date,
    p_scheduled_start_at,
    p_duration_minutes,
    p_due_at
  )
  returning * into v_task;

  if p_skill_id is not null then
    insert into public.task_skill_links (user_id, task_id, skill_id)
    values (v_user_id, v_task.id, p_skill_id)
    on conflict (user_id, task_id, skill_id) do nothing;
  end if;

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

-- Narrow historical release through the existing authenticated Task boundary.
-- No caller-supplied owner, metadata, relationships or scheduling patch.
create function public.release_inbox_task(p_task_id uuid, p_expected_updated_at timestamptz)
returns public.tasks
language plpgsql security invoker set search_path = public
as $$
declare
  v_owner uuid := (select auth.uid());
  v_task public.tasks%rowtype;
  v_project public.projects%rowtype;
begin
  if v_owner is null then raise exception 'TASK_RELEASE_FORBIDDEN' using errcode='42501'; end if;
  select * into v_task from public.tasks
    where id=p_task_id and user_id=v_owner and archived_at is null for update;
  if not found then raise exception 'TASK_NOT_FOUND' using errcode='P0002'; end if;
  if v_task.status <> 'inbox' then raise exception 'TASK_RELEASE_STATUS' using errcode='PT409'; end if;
  if p_expected_updated_at is null or v_task.updated_at <> p_expected_updated_at then
    raise exception 'TASK_RELEASE_STALE' using errcode='PT409';
  end if;
  if exists(select 1 from public.schedule_source_links where task_id=v_task.id and user_id=v_owner) then
    raise exception 'SOURCE_FLOW_REQUIRED' using errcode='PT409';
  end if;
  if v_task.project_id is not null then
    -- Same row-version boundary as #151, including REPEATABLE READ races.
    update public.projects set updated_at=updated_at
      where id=v_task.project_id and user_id=v_owner returning * into v_project;
    if not found then raise exception 'TASK_PROJECT_NOT_FOUND' using errcode='P0002'; end if;
    if v_project.archived_at is not null or v_project.status='archived' then
      raise exception 'TASK_PROJECT_ARCHIVED' using errcode='PT409';
    end if;
    if v_task.goal_id is not null and v_project.goal_id is not null and v_task.goal_id <> v_project.goal_id then
      raise exception 'TASK_GOAL_CONFLICT' using errcode='PT409';
    end if;
  end if;
  if v_task.area_id is not null then
    perform 1 from public.areas where id=v_task.area_id and user_id=v_owner and archived_at is null for share;
    if not found then raise exception 'TASK_CONTEXT_NOT_FOUND' using errcode='P0002'; end if;
  end if;
  if v_task.goal_id is not null then
    perform 1 from public.goals where id=v_task.goal_id and user_id=v_owner and archived_at is null for share;
    if not found then raise exception 'TASK_CONTEXT_NOT_FOUND' using errcode='P0002'; end if;
  end if;
  if v_task.milestone_id is not null then
    perform 1 from public.project_milestones where id=v_task.milestone_id and user_id=v_owner
      and project_id=v_task.project_id and archived_at is null for share;
    if not found then raise exception 'TASK_MILESTONE_NOT_FOUND' using errcode='P0002'; end if;
  end if;
  -- Dependency readiness stays separate from lifecycle. Existing dependency,
  -- Source and ownership triggers remain authoritative on this UPDATE.
  update public.tasks set status='planned', updated_at=clock_timestamp()
    where id=v_task.id and user_id=v_owner and status='inbox'
      and archived_at is null and updated_at=p_expected_updated_at returning * into v_task;
  if not found then raise exception 'TASK_RELEASE_STALE' using errcode='PT409'; end if;
  return v_task;
end;
$$;
revoke all on function public.release_inbox_task(uuid,timestamptz) from public,anon;
grant execute on function public.release_inbox_task(uuid,timestamptz) to authenticated;

-- The shared timestamp trigger uses transaction-stable now(). Two metadata
-- writes in one transaction must still invalidate a historical release token.
-- Keep this revision rule confined to Tasks leaving/remaining in Inbox.
create function public.guard_inbox_task_revision()
returns trigger language plpgsql security invoker set search_path=public
as $$
begin
  if old.status='inbox' then
    new.updated_at := greatest(new.updated_at,old.updated_at + interval '1 microsecond');
  end if;
  return new;
end;
$$;
create trigger zz_inbox_task_revision before update on public.tasks
  for each row execute function public.guard_inbox_task_revision();
revoke all on function public.guard_inbox_task_revision() from public,anon,authenticated;
