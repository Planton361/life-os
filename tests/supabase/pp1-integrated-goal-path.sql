-- PP1 Slice 1 integrated Goal path proof.
-- Run against the canonical local target. Every row is rolled back.
-- This intentionally excludes Task/Project completion episodes and Skill Evidence.
begin;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values (
  '92000000-0000-4000-8000-000000000001',
  '92000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'pp1-integrated-goal-path@example.test',
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now()
);

insert into public.goals (
  id, user_id, title, description, why, status
) values (
  '92000000-0000-4000-8000-000000000010',
  '92000000-0000-4000-8000-000000000001',
  'PP1 integrated Goal',
  'A rollback-only integrated Goal proof.',
  'To prove the complete Slice-1 path.',
  'active'
);

insert into public.goal_milestones (
  id, user_id, goal_id, title, description, status, sort_order
) values
  (
    '92000000-0000-4000-8000-000000000020',
    '92000000-0000-4000-8000-000000000001',
    '92000000-0000-4000-8000-000000000010',
    'PP1 first Etappe',
    'First bounded step.',
    'active',
    0
  ),
  (
    '92000000-0000-4000-8000-000000000021',
    '92000000-0000-4000-8000-000000000001',
    '92000000-0000-4000-8000-000000000010',
    'PP1 second Etappe',
    'Second bounded step.',
    'planned',
    1
  );

insert into public.goal_outcome_criteria (
  id, user_id, goal_id, goal_milestone_id, title, criterion_type,
  unit, target, direction
) values
  (
    '92000000-0000-4000-8000-000000000030',
    '92000000-0000-4000-8000-000000000001',
    '92000000-0000-4000-8000-000000000010',
    '92000000-0000-4000-8000-000000000020',
    'PP1 boolean criterion',
    'boolean',
    null, null, null
  ),
  (
    '92000000-0000-4000-8000-000000000031',
    '92000000-0000-4000-8000-000000000001',
    '92000000-0000-4000-8000-000000000010',
    '92000000-0000-4000-8000-000000000021',
    'PP1 numeric criterion',
    'numeric',
    'hours', 10, 'at_least'
  );

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
select set_config('request.jwt.claim.sub', '92000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
declare
  v_result jsonb;
  v_repeat jsonb;
  v_evaluation_id uuid;
  v_numeric_evaluation_id uuid;
  v_project_id uuid;
  v_task_id uuid;
  v_goal_updated_at timestamptz;
  v_count integer;
begin
  -- Contextual Project/Task creation is atomic and binds both records to Goal + Etappe.
  v_result := public.execute_goal_command(
    'project.context.create',
    '92000000-0000-4000-8000-000000000100',
    'project-context-fingerprint',
    jsonb_build_object(
      'goal_id', '92000000-0000-4000-8000-000000000010',
      'milestone_id', '92000000-0000-4000-8000-000000000020',
      'title', 'PP1 contextual Project',
      'description', 'Created from Etappe.',
      'status', 'idea',
      'priority', 'P2',
      'next_step', 'Open the first project step.'
    )
  );
  v_project_id := (v_result->>'project_id')::uuid;
  if not exists (
    select 1 from public.projects
     where id = v_project_id
       and user_id = auth.uid()
       and goal_id = '92000000-0000-4000-8000-000000000010'
  ) then
    raise exception 'Contextual Project was not bound to the Goal';
  end if;
  if not exists (
    select 1 from public.goal_milestone_project_support
     where project_id = v_project_id
       and goal_milestone_id = '92000000-0000-4000-8000-000000000020'
  ) then
    raise exception 'Contextual Project support was not persisted';
  end if;

  v_result := public.execute_goal_command(
    'task.context.create',
    '92000000-0000-4000-8000-000000000101',
    'task-context-fingerprint',
    jsonb_build_object(
      'goal_id', '92000000-0000-4000-8000-000000000010',
      'milestone_id', '92000000-0000-4000-8000-000000000020',
      'title', 'PP1 contextual Task',
      'description', 'Created from Etappe.',
      'priority', 'P2'
    )
  );
  v_task_id := (v_result->>'task_id')::uuid;
  if not exists (
    select 1 from public.tasks
     where id = v_task_id
       and user_id = auth.uid()
       and goal_id = '92000000-0000-4000-8000-000000000010'
       and project_id is null
  ) then
    raise exception 'Contextual Task was not a direct Goal Task';
  end if;
  if not exists (
    select 1 from public.goal_milestone_task_support
     where task_id = v_task_id
       and goal_milestone_id = '92000000-0000-4000-8000-000000000020'
  ) then
    raise exception 'Contextual Task support was not persisted';
  end if;

  -- Evaluation is append-only; the same command is idempotent.
  v_result := public.execute_goal_command(
    'criterion.evaluate',
    '92000000-0000-4000-8000-000000000110',
    'criterion-1-fingerprint',
    jsonb_build_object(
      'goal_id', '92000000-0000-4000-8000-000000000010',
      'criterion_id', '92000000-0000-4000-8000-000000000030',
      'boolean_value', true,
      'deferred', false,
      'occurred_at', '2026-09-21T00:01:00Z'
    )
  );
  v_evaluation_id := (v_result->>'evaluation_id')::uuid;
  v_repeat := public.execute_goal_command(
    'criterion.evaluate',
    '92000000-0000-4000-8000-000000000110',
    'criterion-1-fingerprint',
    '{}'::jsonb
  );
  if v_repeat <> v_result then
    raise exception 'Repeated command did not return its original receipt';
  end if;
  select count(*) into v_count
    from public.goal_criterion_evaluations
   where criterion_id = '92000000-0000-4000-8000-000000000030';
  if v_count <> 1 then raise exception 'Idempotent evaluation was duplicated'; end if;
  perform pg_temp.reject(
    $reject$select public.execute_goal_command('criterion.evaluate','92000000-0000-4000-8000-000000000110','different-fingerprint','{}'::jsonb)$reject$,
    'GOAL_COMMAND_FINGERPRINT_MISMATCH'
  );

  -- Corrections and retractions create revisions; they never rewrite the row.
  v_result := public.execute_goal_command(
    'criterion.correct',
    '92000000-0000-4000-8000-000000000111',
    'criterion-1-correction',
    jsonb_build_object(
      'goal_id', '92000000-0000-4000-8000-000000000010',
      'criterion_id', '92000000-0000-4000-8000-000000000030',
      'expected_latest_evaluation_id', v_evaluation_id,
      'boolean_value', false,
      'deferred', false,
      'correction_reason', 'Correction proof.',
      'occurred_at', '2026-09-21T00:02:00Z'
    )
  );
  v_evaluation_id := (v_result->>'evaluation_id')::uuid;
  v_result := public.execute_goal_command(
    'criterion.retract',
    '92000000-0000-4000-8000-000000000112',
    'criterion-1-retraction',
    jsonb_build_object(
      'goal_id', '92000000-0000-4000-8000-000000000010',
      'criterion_id', '92000000-0000-4000-8000-000000000030',
      'expected_latest_evaluation_id', v_evaluation_id,
      'correction_reason', 'Reopen the decision for review.',
      'occurred_at', '2026-09-21T00:03:00Z'
    )
  );
  v_evaluation_id := (v_result->>'evaluation_id')::uuid;
  if public.goal_outcome_criterion_is_met(auth.uid(), '92000000-0000-4000-8000-000000000030') then
    raise exception 'Retracted criterion still satisfied readiness';
  end if;
  v_result := public.execute_goal_command(
    'criterion.evaluate',
    '92000000-0000-4000-8000-000000000113',
    'criterion-1-final',
    jsonb_build_object(
      'goal_id', '92000000-0000-4000-8000-000000000010',
      'criterion_id', '92000000-0000-4000-8000-000000000030',
      'expected_latest_evaluation_id', v_evaluation_id,
      'boolean_value', true,
      'deferred', false,
      'occurred_at', '2026-09-21T00:04:00Z'
    )
  );
  v_evaluation_id := (v_result->>'evaluation_id')::uuid;

  v_result := public.execute_goal_command(
    'criterion.evaluate',
    '92000000-0000-4000-8000-000000000114',
    'criterion-2-final',
    jsonb_build_object(
      'goal_id', '92000000-0000-4000-8000-000000000010',
      'criterion_id', '92000000-0000-4000-8000-000000000031',
      'numeric_value', 10,
      'unit', 'hours',
      'deferred', false,
      'occurred_at', '2026-09-21T00:05:00Z'
    )
  );
  v_numeric_evaluation_id := (v_result->>'evaluation_id')::uuid;

  perform pg_temp.reject(
    $reject$insert into public.goal_criterion_evaluations(user_id,criterion_id,boolean_value) values(auth.uid(),'92000000-0000-4000-8000-000000000030',true)$reject$,
    'permission denied'
  );

  -- Decision-specific evidence accepts canonical context and rejects Skill Evidence.
  perform public.execute_goal_command(
    'criterion.evidence',
    '92000000-0000-4000-8000-000000000115',
    'criterion-1-evidence',
    jsonb_build_object(
      'goal_id', '92000000-0000-4000-8000-000000000010',
      'evaluation_id', v_evaluation_id,
      'references', jsonb_build_array(jsonb_build_object(
        'source_type', 'project',
        'source_id', v_project_id,
        'reason', 'Project context is the decision reference.'
      ))
    )
  );
  perform pg_temp.reject(
    format($sql$select public.execute_goal_command('criterion.evidence','92000000-0000-4000-8000-000000000116','skill-evidence-proof',jsonb_build_object('goal_id','92000000-0000-4000-8000-000000000010','evaluation_id',%L::uuid,'references',jsonb_build_array(jsonb_build_object('source_type','skill_evidence','source_id','92000000-0000-4000-8000-000000000010'))))$sql$, v_evaluation_id),
    'GOAL_EVIDENCE_SOURCE_TYPE_INVALID'
  );

  -- Two Etappe episodes prove achievement and reopening are distinct history.
  perform public.execute_goal_command(
    'milestone.achieve',
    '92000000-0000-4000-8000-000000000120',
    'milestone-1-achieve',
    jsonb_build_object(
      'goal_id', '92000000-0000-4000-8000-000000000010',
      'milestone_id', '92000000-0000-4000-8000-000000000020',
      'occurred_at', '2026-09-21T00:06:00Z'
    )
  );
  select count(*) into v_count
    from public.goal_milestones
   where goal_id = '92000000-0000-4000-8000-000000000010'
     and archived_at is null
     and status = 'active';
  if v_count <> 1 or not exists (
    select 1 from public.goal_milestones
     where id = '92000000-0000-4000-8000-000000000021'
       and status = 'active'
  ) then
    raise exception 'Explicit milestone review did not atomically advance the ordered journey';
  end if;
  perform public.execute_goal_command(
    'milestone.evidence',
    '92000000-0000-4000-8000-000000000121',
    'milestone-1-evidence',
    jsonb_build_object(
      'goal_id', '92000000-0000-4000-8000-000000000010',
      'milestone_id', '92000000-0000-4000-8000-000000000020',
      'references', jsonb_build_array(jsonb_build_object(
        'source_type', 'task',
        'source_id', v_task_id,
        'reason', 'Etappe decision reference.'
      ))
    )
  );
  perform public.execute_goal_command(
    'milestone.reopen',
    '92000000-0000-4000-8000-000000000122',
    'milestone-1-reopen',
    jsonb_build_object(
      'goal_id', '92000000-0000-4000-8000-000000000010',
      'milestone_id', '92000000-0000-4000-8000-000000000020',
      'occurred_at', '2026-09-21T00:07:00Z'
    )
  );
  perform public.execute_goal_command(
    'milestone.achieve',
    '92000000-0000-4000-8000-000000000123',
    'milestone-1-achieve-again',
    jsonb_build_object(
      'goal_id', '92000000-0000-4000-8000-000000000010',
      'milestone_id', '92000000-0000-4000-8000-000000000020',
      'occurred_at', '2026-09-21T00:08:00Z'
    )
  );
  perform public.execute_goal_command(
    'milestone.achieve',
    '92000000-0000-4000-8000-000000000124',
    'milestone-2-achieve',
    jsonb_build_object(
      'goal_id', '92000000-0000-4000-8000-000000000010',
      'milestone_id', '92000000-0000-4000-8000-000000000021',
      'occurred_at', '2026-09-21T00:09:00Z'
    )
  );

  select updated_at into v_goal_updated_at
    from public.goals
   where id = '92000000-0000-4000-8000-000000000010';
  v_result := public.execute_goal_command(
    'goal.achieve',
    '92000000-0000-4000-8000-000000000130',
    'goal-achieve-fingerprint',
    jsonb_build_object(
      'goal_id', '92000000-0000-4000-8000-000000000010',
      'expected_updated_at', v_goal_updated_at,
      'note', 'Exact Slice-1 achievement basis.',
      'occurred_at', '2026-09-21T00:10:00Z',
      'references', jsonb_build_array(jsonb_build_object(
        'source_type', 'project',
        'source_id', v_project_id,
        'reason', 'Goal achievement reference.'
      ))
    )
  );

  if not exists (
    select 1 from public.goals
     where id = '92000000-0000-4000-8000-000000000010'
       and status = 'achieved'
       and achieved_at = '2026-09-21T00:10:00Z'
  ) then raise exception 'Goal achievement did not persist'; end if;
  select count(*) into v_count
    from public.goal_achievement_criterion_basis
   where achievement_event_id = (v_result->>'event_id')::uuid;
  if v_count <> 2 then raise exception 'Exact criterion basis was not captured'; end if;
  select count(*) into v_count
    from public.goal_achievement_milestone_basis
   where achievement_event_id = (v_result->>'event_id')::uuid;
  if v_count <> 2 then raise exception 'Exact Etappe basis was not captured'; end if;
  if not exists (
    select 1 from public.goal_achievement_criterion_basis
     where achievement_event_id = (v_result->>'event_id')::uuid
       and criterion_id = '92000000-0000-4000-8000-000000000030'
       and evaluation_id = v_evaluation_id
       and evaluation_state_snapshot = 'met'
  ) then raise exception 'Criterion basis snapshot was not exact'; end if;
  if not exists (
    select 1 from public.goal_achievement_evidence
     where achievement_event_id = (v_result->>'event_id')::uuid
       and source_type = 'project'
       and source_id = v_project_id
  ) then raise exception 'Goal decision evidence was not persisted'; end if;
  if not exists (
    select 1 from public.goal_milestone_achievement_evidence
     where source_type = 'task'
       and source_id = v_task_id
       and episode_id is not null
  ) then raise exception 'Etappe decision evidence did not retain its episode'; end if;
  select count(*) into v_count
    from public.goal_milestone_achievement_events
   where goal_milestone_id = '92000000-0000-4000-8000-000000000020';
  if v_count <> 3 then raise exception 'Etappe achievement/reopen episodes are incomplete'; end if;

  select updated_at into v_goal_updated_at
    from public.goals
   where id = '92000000-0000-4000-8000-000000000010';
  perform public.execute_goal_command(
    'goal.reopen',
    '92000000-0000-4000-8000-000000000131',
    'goal-reopen-fingerprint',
    jsonb_build_object(
      'goal_id', '92000000-0000-4000-8000-000000000010',
      'expected_updated_at', v_goal_updated_at,
      'occurred_at', '2026-09-21T00:11:00Z'
    )
  );
  if not exists (
    select 1 from public.goals
     where id = '92000000-0000-4000-8000-000000000010'
       and status = 'active'
       and achieved_at is null
  ) then raise exception 'Goal reopen did not persist'; end if;
  select count(*) into v_count
    from public.goal_achievement_events
   where goal_id = '92000000-0000-4000-8000-000000000010';
  if v_count <> 2 then raise exception 'Goal achievement/reopen episode history is incomplete'; end if;

  perform pg_temp.reject(
    $reject$update public.goal_achievement_events set achievement_note = 'mutated' where goal_id = '92000000-0000-4000-8000-000000000010'$reject$,
    'permission denied'
  );
end
$$;

rollback;
select 'PP1_INTEGRATED_GOAL_PATH_DB_PASS';
