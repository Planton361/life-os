-- PP1 Goal Journey: one Current Goal Milestone, atomic switches and reviews.

do $$
declare
  v_conflicting_goal_ids text;
begin
  select string_agg(conflict.goal_id::text, ', ' order by conflict.goal_id)
    into v_conflicting_goal_ids
    from (
      select milestone.goal_id
        from public.goal_milestones milestone
       where milestone.archived_at is null
         and milestone.status = 'active'
       group by milestone.user_id, milestone.goal_id
      having count(*) > 1
    ) conflict;

  if v_conflicting_goal_ids is not null then
    raise exception 'GOAL_CURRENT_MILESTONE_CONFLICT: %', v_conflicting_goal_ids
      using errcode = '23505';
  end if;
end;
$$;

create unique index goal_milestones_single_current_per_goal_idx
  on public.goal_milestones (user_id, goal_id)
  where archived_at is null and status = 'active';

create or replace function public.enforce_single_current_goal_milestone()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.archived_at is not null or new.status <> 'active' then
    return new;
  end if;

  perform 1
    from public.goals goal
   where goal.user_id = new.user_id
     and goal.id = new.goal_id
     and goal.archived_at is null
   for update;
  if not found then
    raise exception 'GOAL_MILESTONE_GOAL_NOT_FOUND' using errcode = 'P0002';
  end if;

  update public.goal_milestones milestone
     set status = 'planned'
   where milestone.user_id = new.user_id
     and milestone.goal_id = new.goal_id
     and milestone.id <> new.id
     and milestone.archived_at is null
     and milestone.status = 'active';

  return new;
end;
$$;

create trigger goal_milestones_enforce_single_current
  before insert or update of user_id, goal_id, status, archived_at
  on public.goal_milestones
  for each row execute function public.enforce_single_current_goal_milestone();

create or replace function public.advance_goal_journey_after_milestone_review()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_next_milestone_id uuid;
begin
  select milestone.id
    into v_next_milestone_id
    from public.goal_milestones milestone
   where milestone.user_id = new.user_id
     and milestone.goal_id = new.goal_id
     and milestone.archived_at is null
     and milestone.status = 'planned'
   order by milestone.sort_order, milestone.created_at, milestone.id
   limit 1
   for update;

  if v_next_milestone_id is not null then
    update public.goal_milestones milestone
       set status = 'active'
     where milestone.user_id = new.user_id
       and milestone.goal_id = new.goal_id
       and milestone.id = v_next_milestone_id;
  end if;

  return new;
end;
$$;

create trigger goal_milestones_advance_after_review
  after update of status on public.goal_milestones
  for each row
  when (old.status = 'active' and new.status = 'achieved'
    and old.archived_at is null and new.archived_at is null)
  execute function public.advance_goal_journey_after_milestone_review();

create or replace function public.set_goal_current_milestone(
  p_goal_id uuid,
  p_milestone_id uuid,
  p_expected_updated_at timestamptz default null,
  p_command_id uuid default null,
  p_request_fingerprint text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_goal_status public.goal_status;
  v_milestone record;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'GOAL_AUTH_REQUIRED' using errcode = '42501';
  end if;

  select goal.status
    into v_goal_status
    from public.goals goal
   where goal.user_id = v_user_id
     and goal.id = p_goal_id
     and goal.archived_at is null
   for update;
  if not found then
    raise exception 'GOAL_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_goal_status in ('achieved', 'archived') then
    raise exception 'GOAL_MILESTONE_CURRENT_GOAL_READ_ONLY' using errcode = 'P0001';
  end if;

  select milestone.id, milestone.status, milestone.updated_at,
         milestone.archived_at
    into v_milestone
    from public.goal_milestones milestone
   where milestone.user_id = v_user_id
     and milestone.goal_id = p_goal_id
     and milestone.id = p_milestone_id
   for update;
  if not found then
    raise exception 'GOAL_MILESTONE_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_milestone.archived_at is not null or v_milestone.status = 'archived' then
    raise exception 'GOAL_MILESTONE_ARCHIVED' using errcode = 'P0001';
  end if;
  if p_expected_updated_at is not null
     and v_milestone.updated_at is distinct from p_expected_updated_at then
    raise exception 'GOAL_STALE_STATE' using errcode = 'P0001';
  end if;

  if v_milestone.status = 'active' then
    return jsonb_build_object('milestone_id', p_milestone_id, 'status', 'active');
  end if;

  if v_milestone.status = 'achieved' then
    if p_command_id is null or p_request_fingerprint is null
       or btrim(p_request_fingerprint) = '' then
      raise exception 'GOAL_COMMAND_ID_REQUIRED' using errcode = 'P0001';
    end if;
    v_result := public.execute_goal_command(
      'milestone.reopen',
      p_command_id,
      p_request_fingerprint,
      jsonb_build_object(
        'goal_id', p_goal_id,
        'milestone_id', p_milestone_id,
        'expected_updated_at', v_milestone.updated_at
      )
    );
    return v_result;
  end if;

  update public.goal_milestones milestone
     set status = 'active'
   where milestone.user_id = v_user_id
     and milestone.goal_id = p_goal_id
     and milestone.id = p_milestone_id;

  return jsonb_build_object('milestone_id', p_milestone_id, 'status', 'active');
end;
$$;

create or replace function public.review_goal_milestone(
  p_goal_id uuid,
  p_milestone_id uuid,
  p_command_id uuid,
  p_request_fingerprint text,
  p_expected_updated_at timestamptz default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_fingerprint text;
  v_existing_result jsonb;
  v_milestone_status public.goal_milestone_status;
  v_milestone_updated_at timestamptz;
  v_result jsonb;
  v_next_milestone_id uuid;
begin
  if v_user_id is null then
    raise exception 'GOAL_AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_command_id is null or p_request_fingerprint is null
     or btrim(p_request_fingerprint) = '' then
    raise exception 'GOAL_COMMAND_ID_REQUIRED' using errcode = 'P0001';
  end if;

  select receipt.request_fingerprint, receipt.result_payload
    into v_existing_fingerprint, v_existing_result
    from public.goal_command_receipts receipt
   where receipt.user_id = v_user_id
     and receipt.command_id = p_command_id
   for update;
  if found then
    if v_existing_fingerprint <> p_request_fingerprint then
      raise exception 'GOAL_COMMAND_FINGERPRINT_MISMATCH' using errcode = 'P0001';
    end if;
    return v_existing_result;
  end if;

  perform 1
    from public.goals goal
   where goal.user_id = v_user_id
     and goal.id = p_goal_id
     and goal.archived_at is null
     and goal.status <> 'achieved'
   for update;
  if not found then
    raise exception 'GOAL_NOT_FOUND_OR_READ_ONLY' using errcode = 'P0002';
  end if;

  -- Another request with the same idempotency key may have committed while
  -- this transaction waited for the Goal row. Return that exact receipt.
  select receipt.request_fingerprint, receipt.result_payload
    into v_existing_fingerprint, v_existing_result
    from public.goal_command_receipts receipt
   where receipt.user_id = v_user_id
     and receipt.command_id = p_command_id
   for update;
  if found then
    if v_existing_fingerprint <> p_request_fingerprint then
      raise exception 'GOAL_COMMAND_FINGERPRINT_MISMATCH' using errcode = 'P0001';
    end if;
    return v_existing_result;
  end if;

  select milestone.status, milestone.updated_at
    into v_milestone_status, v_milestone_updated_at
    from public.goal_milestones milestone
   where milestone.user_id = v_user_id
     and milestone.goal_id = p_goal_id
     and milestone.id = p_milestone_id
     and milestone.archived_at is null
   for update;
  if not found then
    raise exception 'GOAL_MILESTONE_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_milestone_status <> 'active' then
    raise exception 'GOAL_MILESTONE_ACHIEVE_REQUIRES_CURRENT' using errcode = 'P0001';
  end if;
  if p_expected_updated_at is not null
     and v_milestone_updated_at is distinct from p_expected_updated_at then
    raise exception 'GOAL_STALE_STATE' using errcode = 'P0001';
  end if;

  v_result := public.execute_goal_command(
    'milestone.achieve',
    p_command_id,
    p_request_fingerprint,
    jsonb_build_object(
      'goal_id', p_goal_id,
      'milestone_id', p_milestone_id,
      'expected_updated_at', coalesce(p_expected_updated_at, v_milestone_updated_at),
      'note', nullif(p_note, '')
    )
  );

  select milestone.id
    into v_next_milestone_id
    from public.goal_milestones milestone
   where milestone.user_id = v_user_id
     and milestone.goal_id = p_goal_id
     and milestone.id <> p_milestone_id
     and milestone.archived_at is null
     and milestone.status = 'active';

  v_result := v_result || jsonb_build_object(
    'next_milestone_id', v_next_milestone_id
  );
  update public.goal_command_receipts receipt
     set result_payload = v_result
   where receipt.user_id = v_user_id
     and receipt.command_id = p_command_id;

  return v_result;
end;
$$;

create or replace function public.create_goal_milestone_task(
  p_command_id uuid,
  p_request_fingerprint text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_goal_id uuid := nullif(p_payload->>'goal_id', '')::uuid;
  v_milestone_id uuid := nullif(p_payload->>'milestone_id', '')::uuid;
  v_project_id uuid := nullif(p_payload->>'project_id', '')::uuid;
  v_existing_fingerprint text;
  v_existing_result jsonb;
  v_result jsonb;
  v_task_id uuid;
begin
  if v_user_id is null then
    raise exception 'GOAL_AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_command_id is null or p_request_fingerprint is null
     or btrim(p_request_fingerprint) = '' then
    raise exception 'GOAL_COMMAND_ID_REQUIRED' using errcode = 'P0001';
  end if;

  select receipt.request_fingerprint, receipt.result_payload
    into v_existing_fingerprint, v_existing_result
    from public.goal_command_receipts receipt
   where receipt.user_id = v_user_id
     and receipt.command_id = p_command_id
   for update;
  if found then
    if v_existing_fingerprint <> p_request_fingerprint then
      raise exception 'GOAL_COMMAND_FINGERPRINT_MISMATCH' using errcode = 'P0001';
    end if;
    return v_existing_result;
  end if;

  perform 1
    from public.goals goal
   where goal.user_id = v_user_id
     and goal.id = v_goal_id
     and goal.archived_at is null
     and goal.status <> 'achieved'
   for update;
  if not found then
    raise exception 'GOAL_NOT_FOUND_OR_READ_ONLY' using errcode = 'P0002';
  end if;

  select receipt.request_fingerprint, receipt.result_payload
    into v_existing_fingerprint, v_existing_result
    from public.goal_command_receipts receipt
   where receipt.user_id = v_user_id
     and receipt.command_id = p_command_id
   for update;
  if found then
    if v_existing_fingerprint <> p_request_fingerprint then
      raise exception 'GOAL_COMMAND_FINGERPRINT_MISMATCH' using errcode = 'P0001';
    end if;
    return v_existing_result;
  end if;

  perform 1
    from public.goal_milestones milestone
   where milestone.user_id = v_user_id
     and milestone.goal_id = v_goal_id
     and milestone.id = v_milestone_id
     and milestone.archived_at is null
     and milestone.status = 'active'
   for update;
  if not found then
    raise exception 'GOAL_TASK_REQUIRES_CURRENT_MILESTONE' using errcode = 'P0001';
  end if;

  if v_project_id is not null then
    perform 1
      from public.projects project
     where project.user_id = v_user_id
       and project.id = v_project_id
       and project.goal_id = v_goal_id
       and project.archived_at is null
     for update;
    if not found then
      raise exception 'GOAL_TASK_PROJECT_CONTEXT_INVALID' using errcode = 'P0001';
    end if;
  end if;

  v_result := public.execute_goal_command(
    'task.context.create',
    p_command_id,
    p_request_fingerprint,
    p_payload
  );
  v_task_id := nullif(v_result->>'task_id', '')::uuid;
  if v_task_id is null then
    raise exception 'GOAL_TASK_CREATE_RESULT_INVALID' using errcode = 'P0001';
  end if;

  if v_project_id is not null then
    update public.tasks task
       set project_id = v_project_id
     where task.user_id = v_user_id
       and task.id = v_task_id
       and task.goal_id = v_goal_id;
    if not found then
      raise exception 'GOAL_TASK_PROJECT_CONTEXT_INVALID' using errcode = 'P0001';
    end if;
    v_result := v_result || jsonb_build_object('project_id', v_project_id);
    update public.goal_command_receipts receipt
       set result_payload = v_result
     where receipt.user_id = v_user_id
       and receipt.command_id = p_command_id;
  end if;

  return v_result;
end;
$$;

revoke all on function public.set_goal_current_milestone(uuid, uuid, timestamptz, uuid, text)
  from public, anon;
revoke all on function public.review_goal_milestone(uuid, uuid, uuid, text, timestamptz, text)
  from public, anon;
revoke all on function public.create_goal_milestone_task(uuid, text, jsonb)
  from public, anon;
grant execute on function public.set_goal_current_milestone(uuid, uuid, timestamptz, uuid, text)
  to authenticated;
grant execute on function public.review_goal_milestone(uuid, uuid, uuid, text, timestamptz, text)
  to authenticated;
grant execute on function public.create_goal_milestone_task(uuid, text, jsonb)
  to authenticated;

comment on index public.goal_milestones_single_current_per_goal_idx is
  'At most one unarchived active Goal Milestone per Goal; current changes are serialized by Goal-row locking.';
