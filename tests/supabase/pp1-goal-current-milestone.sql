-- PP1 Goal Journey current-milestone invariant and explicit-review proof.
-- Run against a local test target. All rows and temporary privilege changes roll back.
begin;

insert into auth.users (
  instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values (
  '94100000-0000-4000-8000-000000000001',
  '94100000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'pp1-goal-current@example.test',
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
);

insert into public.goals (id, user_id, title, status) values (
  '94100000-0000-4000-8000-000000000010',
  '94100000-0000-4000-8000-000000000001',
  'PP1 Goal Journey current proof', 'active'
);

insert into public.goal_milestones (
  id, user_id, goal_id, title, status, sort_order
) values
  ('94100000-0000-4000-8000-000000000020', '94100000-0000-4000-8000-000000000001', '94100000-0000-4000-8000-000000000010', 'First milestone', 'active', 0),
  ('94100000-0000-4000-8000-000000000021', '94100000-0000-4000-8000-000000000001', '94100000-0000-4000-8000-000000000010', 'Second milestone', 'planned', 1);

create function pg_temp.reject(sql text, expected text) returns void
language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    if position(expected in sqlerrm) = 0 then
      raise exception 'Unexpected rejection: % (wanted %)', sqlerrm, expected;
    end if;
    return;
  end;
  raise exception 'Write unexpectedly succeeded: %', sql;
end
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '94100000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
declare
  v_current_count integer;
  v_event_count integer;
  v_result jsonb;
  v_task_id uuid;
  v_project_id uuid := '94100000-0000-4000-8000-000000000030';
begin
  if current_user <> 'authenticated' then
    raise exception 'Raw-write proof must execute as authenticated';
  end if;

  -- Authenticated metadata edits and reordering remain available.
  update public.goal_milestones
     set title = 'First milestone (edited)', description = 'Metadata remains editable.'
   where id = '94100000-0000-4000-8000-000000000020';
  update public.goal_milestones
     set sort_order = 2
   where id = '94100000-0000-4000-8000-000000000021';
  if not exists (
    select 1 from public.goal_milestones
     where id = '94100000-0000-4000-8000-000000000020'
       and title = 'First milestone (edited)'
       and description = 'Metadata remains editable.'
  ) or not exists (
    select 1 from public.goal_milestones
     where id = '94100000-0000-4000-8000-000000000021'
       and sort_order = 2
  ) then
    raise exception 'Authenticated Goal Milestone metadata or order update was rejected';
  end if;
  update public.goal_milestones set sort_order = 1
   where id = '94100000-0000-4000-8000-000000000021';

  -- Raw completion cannot bypass the canonical review/history command.
  perform pg_temp.reject(
    $reject$update public.goal_milestones set status = 'achieved' where id = '94100000-0000-4000-8000-000000000020'$reject$,
    'GOAL_MILESTONE_REVIEW_REQUIRED'
  );
  select count(*) into v_current_count
    from public.goal_milestones
   where user_id = auth.uid()
     and goal_id = '94100000-0000-4000-8000-000000000010'
     and archived_at is null
     and status = 'active';
  select count(*) into v_event_count
    from public.goal_milestone_achievement_events
   where user_id = auth.uid()
     and goal_milestone_id = '94100000-0000-4000-8000-000000000020';
  if v_current_count <> 1 or v_event_count <> 0 or not exists (
    select 1 from public.goal_milestones
     where id = '94100000-0000-4000-8000-000000000020'
       and status = 'active'
  ) or not exists (
    select 1 from public.goal_milestones
     where id = '94100000-0000-4000-8000-000000000021'
       and status = 'planned'
  ) then
    raise exception 'Rejected raw achievement changed status, history, or Current selection';
  end if;

  -- A second active insert is serialized through the Goal lock and demotes the old Current.
  insert into public.goal_milestones (
    id, user_id, goal_id, title, status, sort_order
  ) values (
    '94100000-0000-4000-8000-000000000022',
    auth.uid(),
    '94100000-0000-4000-8000-000000000010',
    'Third milestone', 'active', 2
  );
  select count(*) into v_current_count
    from public.goal_milestones
   where user_id = auth.uid()
     and goal_id = '94100000-0000-4000-8000-000000000010'
     and archived_at is null
     and status = 'active';
  if v_current_count <> 1 then
    raise exception 'Insert must leave exactly one Current milestone';
  end if;
  if not exists (
    select 1 from public.goal_milestones
     where id = '94100000-0000-4000-8000-000000000022'
       and status = 'active'
  ) then
    raise exception 'Newly selected Current milestone was not active';
  end if;

  -- Atomic switch chooses the second milestone and demotes the previous Current.
  perform public.set_goal_current_milestone(
    '94100000-0000-4000-8000-000000000010',
    '94100000-0000-4000-8000-000000000021'
  );
  if not exists (
    select 1 from public.goal_milestones
     where id = '94100000-0000-4000-8000-000000000021'
       and status = 'active'
  ) or exists (
    select 1 from public.goal_milestones
     where id <> '94100000-0000-4000-8000-000000000021'
       and goal_id = '94100000-0000-4000-8000-000000000010'
       and archived_at is null
       and status = 'active'
  ) then
    raise exception 'Current milestone switch left an invalid state';
  end if;

  -- Explicit review appends evidence and advances to the lowest planned order in the same transaction.
  v_result := public.review_goal_milestone(
    '94100000-0000-4000-8000-000000000010',
    '94100000-0000-4000-8000-000000000021',
    '94100000-0000-4000-8000-000000000101',
    'review-second-milestone',
    null,
    'Reviewed the intermediate result.'
  );
  if v_result->>'next_milestone_id' <> '94100000-0000-4000-8000-000000000020' then
    raise exception 'Review did not report the next ordered planned milestone: %', v_result;
  end if;
  if not exists (
    select 1 from public.goal_milestones
     where id = '94100000-0000-4000-8000-000000000020'
       and status = 'active'
  ) then
    raise exception 'Review did not atomically advance the journey';
  end if;
  if not exists (
    select 1 from public.goal_milestone_achievement_events
     where id = (v_result->>'event_id')::uuid
       and event_type = 'achieved'
       and note = 'Reviewed the intermediate result.'
  ) then
    raise exception 'Milestone review note was not preserved in the append-only event';
  end if;
  select count(*) into v_event_count
    from public.goal_milestone_achievement_events
   where user_id = auth.uid()
     and goal_milestone_id = '94100000-0000-4000-8000-000000000021';
  if v_event_count <> 1 or not exists (
    select 1 from public.goal_milestone_achievement_events
     where goal_milestone_id = '94100000-0000-4000-8000-000000000021'
       and event_type = 'achieved'
  ) then
    raise exception 'Canonical review must write exactly one achievement event';
  end if;
  select count(*) into v_current_count
    from public.goal_milestones
   where user_id = auth.uid()
     and goal_id = '94100000-0000-4000-8000-000000000010'
     and archived_at is null
     and status = 'active';
  if v_current_count <> 1 or not exists (
    select 1 from public.goal_milestones
     where id = '94100000-0000-4000-8000-000000000021'
       and status = 'achieved'
  ) or not exists (
    select 1 from public.goal_milestones
     where id = '94100000-0000-4000-8000-000000000020'
       and status = 'active'
  ) then
    raise exception 'Canonical review did not achieve once and advance to exactly the next Current';
  end if;
  if not exists (
    select 1 from public.goals
     where id = '94100000-0000-4000-8000-000000000010'
       and status = 'active'
       and achieved_at is null
  ) then
    raise exception 'Milestone review must not automatically achieve the Goal';
  end if;

  -- Raw reopen cannot change Current state or append a false reopen event.
  perform pg_temp.reject(
    $reject$update public.goal_milestones set status = 'active' where id = '94100000-0000-4000-8000-000000000021'$reject$,
    'GOAL_MILESTONE_REVIEW_REQUIRED'
  );
  select count(*) into v_current_count
    from public.goal_milestones
   where user_id = auth.uid()
     and goal_id = '94100000-0000-4000-8000-000000000010'
     and archived_at is null
     and status = 'active';
  select count(*) into v_event_count
    from public.goal_milestone_achievement_events
   where user_id = auth.uid()
     and goal_milestone_id = '94100000-0000-4000-8000-000000000021';
  if v_current_count <> 1 or v_event_count <> 1 or not exists (
    select 1 from public.goal_milestones
     where id = '94100000-0000-4000-8000-000000000021'
       and status = 'achieved'
  ) or not exists (
    select 1 from public.goal_milestones
     where id = '94100000-0000-4000-8000-000000000020'
       and status = 'active'
  ) or exists (
    select 1 from public.goal_milestone_achievement_events
     where goal_milestone_id = '94100000-0000-4000-8000-000000000021'
       and event_type = 'reopened'
  ) then
    raise exception 'Rejected raw reopen changed status, history, or Current selection';
  end if;

  -- Reopening is an explicit history event and switches Current atomically.
  perform public.set_goal_current_milestone(
    '94100000-0000-4000-8000-000000000010',
    '94100000-0000-4000-8000-000000000021',
    null,
    '94100000-0000-4000-8000-000000000102',
    'reopen-second-milestone'
  );
  select count(*) into v_current_count
    from public.goal_milestones
   where user_id = auth.uid()
     and goal_id = '94100000-0000-4000-8000-000000000010'
     and archived_at is null
     and status = 'active';
  if v_current_count <> 1 or not exists (
    select 1 from public.goal_milestones
     where id = '94100000-0000-4000-8000-000000000021'
       and status = 'active'
  ) then
    raise exception 'Reopening did not preserve the single-Current invariant';
  end if;
  if not exists (
    select 1 from public.goal_milestone_achievement_events
     where goal_milestone_id = '94100000-0000-4000-8000-000000000021'
       and event_type = 'reopened'
  ) then
    raise exception 'Reopening must append an event';
  end if;
  select count(*) into v_event_count
    from public.goal_milestone_achievement_events
   where user_id = auth.uid()
     and goal_milestone_id = '94100000-0000-4000-8000-000000000021';
  if v_event_count <> 2 or (
    select count(*) from public.goal_milestone_achievement_events
     where goal_milestone_id = '94100000-0000-4000-8000-000000000021'
       and event_type = 'achieved'
  ) <> 1 or (
    select count(*) from public.goal_milestone_achievement_events
     where goal_milestone_id = '94100000-0000-4000-8000-000000000021'
       and event_type = 'reopened'
  ) <> 1 then
    raise exception 'Canonical reopen history must contain exactly one achievement and one reopen';
  end if;

  insert into public.projects (id, user_id, goal_id, title, status, priority)
  values (v_project_id, auth.uid(), '94100000-0000-4000-8000-000000000010', 'Goal-owned project context', 'idea', 'P2');
  v_result := public.create_goal_milestone_task(
    '94100000-0000-4000-8000-000000000103',
    'contextual-current-task',
    jsonb_build_object(
      'goal_id', '94100000-0000-4000-8000-000000000010',
      'milestone_id', '94100000-0000-4000-8000-000000000021',
      'project_id', v_project_id,
      'title', 'Title-first Goal task',
      'priority', 'P2'
    )
  );
  v_task_id := (v_result->>'task_id')::uuid;
  if not exists (
    select 1 from public.tasks
     where id = v_task_id
       and user_id = auth.uid()
       and goal_id = '94100000-0000-4000-8000-000000000010'
       and project_id = v_project_id
  ) or not exists (
    select 1 from public.goal_milestone_task_support
     where task_id = v_task_id
       and goal_milestone_id = '94100000-0000-4000-8000-000000000021'
  ) then
    raise exception 'Current milestone Task was not atomically linked to Goal, Etappe and Project';
  end if;

  perform pg_temp.reject(
    $reject$select public.create_goal_milestone_task(
      '94100000-0000-4000-8000-000000000104',
      'planned-milestone-task',
      jsonb_build_object(
        'goal_id', '94100000-0000-4000-8000-000000000010',
        'milestone_id', '94100000-0000-4000-8000-000000000020',
        'title', 'Must not bind to a non-Current milestone'
      )
    )$reject$,
    'GOAL_TASK_REQUIRES_CURRENT_MILESTONE'
  );
end;
$$;

\echo PASS PP1_GOAL_CURRENT_MILESTONE_DB
rollback;
