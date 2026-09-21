-- PP1 Slice-1 history and evidence-ledger proof.
-- Run against the canonical local target with psql. All rows roll back.
-- This is intentionally limited to Goal/Etappe/Criterion history and
-- decision-specific evidence; Task/Project completion history is out of scope.
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
  '93000000-0000-4000-8000-000000000001',
  '93000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'pp1-goal-history-ledger@example.test',
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now()
);

insert into public.goals (
  id, user_id, title, description, why, status, achieved_at, achievement_note
) values
  (
    '93000000-0000-4000-8000-000000000010',
    '93000000-0000-4000-8000-000000000001',
    'Slice-1 ledger Goal',
    'Current live Goal description.',
    'Current live Goal why.',
    'active',
    null,
    null
  ),
  (
    '93000000-0000-4000-8000-000000000011',
    '93000000-0000-4000-8000-000000000001',
    'Current identity after legacy transition',
    'This description was not available at the old transition.',
    'This why was not available at the old transition.',
    'active',
    null,
    null
  );

insert into public.goal_milestones (
  id, user_id, goal_id, title, description, status, sort_order
) values
  (
    '93000000-0000-4000-8000-000000000020',
    '93000000-0000-4000-8000-000000000001',
    '93000000-0000-4000-8000-000000000010',
    'Slice-1 ledger Etappe',
    'Live Etappe context.',
    'active',
    0
  ),
  (
    '93000000-0000-4000-8000-000000000021',
    '93000000-0000-4000-8000-000000000001',
    '93000000-0000-4000-8000-000000000011',
    'Current Etappe identity after legacy transition',
    'This Etappe description was not available at the old transition.',
    'achieved',
    0
  );

insert into public.goal_outcome_criteria (
  id, user_id, goal_id, title, criterion_type
) values
  (
    '93000000-0000-4000-8000-000000000030',
    '93000000-0000-4000-8000-000000000001',
    '93000000-0000-4000-8000-000000000010',
    'Slice-1 ledger criterion',
    'boolean'
  ),
  (
    '93000000-0000-4000-8000-000000000031',
    '93000000-0000-4000-8000-000000000001',
    '93000000-0000-4000-8000-000000000011',
    'Legacy criterion',
    'boolean'
  );

insert into public.projects (id, user_id, title, status, goal_id) values
  (
    '93000000-0000-4000-8000-000000000040',
    '93000000-0000-4000-8000-000000000001',
    'Original decision source',
    'active',
    '93000000-0000-4000-8000-000000000010'
  ),
  (
    '93000000-0000-4000-8000-000000000041',
    '93000000-0000-4000-8000-000000000001',
    'Replacement decision source',
    'active',
    '93000000-0000-4000-8000-000000000010'
  );

insert into public.tasks (id, user_id, title, status, priority, goal_id) values (
  '93000000-0000-4000-8000-000000000050',
  '93000000-0000-4000-8000-000000000001',
  'Retrospective source Task',
  'planned',
  'P2',
  '93000000-0000-4000-8000-000000000010'
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
select set_config('request.jwt.claim.sub', '93000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
declare
  v_result jsonb;
  v_evaluation_id uuid;
  v_criterion_reference_id uuid;
  v_criterion_replacement_id uuid;
  v_milestone_event_id uuid;
  v_milestone_amendment_id uuid;
  v_milestone_reference_id uuid;
  v_milestone_replacement_id uuid;
  v_goal_event_id uuid;
  v_goal_amendment_id uuid;
  v_goal_reference_id uuid;
  v_goal_replacement_id uuid;
  v_legacy_goal_episode_id uuid;
  v_legacy_milestone_episode_id uuid;
  v_count integer;
  v_occurred_at timestamptz;
  v_title text;
  v_legacy_state jsonb;
  v_retrospective boolean;
  v_description text;
begin
  select count(*) into v_count
    from pg_indexes
   where schemaname = 'public'
     and indexname in (
       'goal_criterion_evidence_one_successor_idx',
       'goal_milestone_evidence_one_successor_idx',
       'goal_evidence_one_successor_idx'
     )
     and indexdef like 'CREATE UNIQUE INDEX%';
  if v_count <> 3 then
    raise exception 'Evidence successor indexes are not all unique';
  end if;

  -- Re-run the migration backfill against a state that represents the old
  -- world. The old evaluation is explicitly legacy, never retrospective.
  execute 'set local role postgres';
  insert into public.goal_criterion_evaluations (
    user_id, criterion_id, is_deferred, boolean_value, evaluated_at, retrospective
  ) values (
    auth.uid(),
    '93000000-0000-4000-8000-000000000031',
    false,
    true,
    '2026-09-19T12:00:00Z',
    true
  );
  update public.goals
     set status = 'achieved',
         achieved_at = '2026-09-20T12:00:00Z',
         achievement_note = 'Legacy achievement note retained as a bounded fact.'
   where id = '93000000-0000-4000-8000-000000000011';
  perform public.backfill_goal_legacy_history();

  select e.occurred_at, e.goal_title_snapshot, e.legacy_state, e.retrospective, e.episode_id
    into v_occurred_at, v_title, v_legacy_state, v_retrospective, v_legacy_goal_episode_id
    from public.goal_achievement_events e
   where e.goal_id = '93000000-0000-4000-8000-000000000011'
     and e.event_type = 'achieved';
  if v_occurred_at <> '2026-09-20T12:00:00Z'
     or v_title is not null
     or (v_legacy_state->>'legacy_state') <> 'true'
     or v_retrospective
     or v_legacy_goal_episode_id is null then
    raise exception 'Legacy Goal marker did not preserve only bounded historical facts';
  end if;

  select e.occurred_at, e.goal_milestone_title_snapshot, e.goal_milestone_description_snapshot,
         e.legacy_state, e.retrospective, e.episode_id
    into v_occurred_at, v_title, v_description, v_legacy_state, v_retrospective, v_legacy_milestone_episode_id
    from public.goal_milestone_achievement_events e
   where e.goal_milestone_id = '93000000-0000-4000-8000-000000000021'
     and e.event_type = 'achieved';
  if v_occurred_at is not null
     or v_title is not null
     or v_description is not null
     or (v_legacy_state->>'legacy_state') <> 'true'
     or v_retrospective
     or v_legacy_milestone_episode_id is null then
    raise exception 'Legacy Etappe marker invented historical identity or time';
  end if;

  select retrospective, legacy_state into v_retrospective, v_legacy_state
    from public.goal_criterion_evaluations
   where criterion_id = '93000000-0000-4000-8000-000000000031';
  if v_retrospective or (v_legacy_state->>'legacy_state') <> 'true' then
    raise exception 'Existing evaluation was presented as retrospective instead of legacy';
  end if;
  execute 'set local role authenticated';

  -- Live Slice-1 criterion decision plus attach -> replace -> withdraw -> supplement.
  v_result := public.execute_goal_command(
    'criterion.evaluate',
    '93000000-0000-0000-8000-000000000100',
    'ledger-criterion-evaluation',
    jsonb_build_object(
      'goal_id', '93000000-0000-4000-8000-000000000010',
      'criterion_id', '93000000-0000-4000-8000-000000000030',
      'boolean_value', true,
      'deferred', false,
      'occurred_at', '2026-09-21T01:00:00Z'
    )
  );
  v_evaluation_id := (v_result->>'evaluation_id')::uuid;

  perform public.execute_goal_command(
    'criterion.evidence',
    '93000000-0000-0000-8000-000000000101',
    'ledger-criterion-attach',
    jsonb_build_object(
      'goal_id', '93000000-0000-4000-8000-000000000010',
      'evaluation_id', v_evaluation_id,
      'action', 'attached',
      'references', jsonb_build_array(jsonb_build_object(
        'source_type', 'project',
        'source_id', '93000000-0000-4000-8000-000000000040'
      ))
    )
  );
  select id into v_criterion_reference_id
   from public.goal_criterion_evaluation_evidence
   where evaluation_id = v_evaluation_id
     and reference_action = 'attached'
   order by recorded_at desc, id desc limit 1;

  perform public.execute_goal_command(
    'criterion.evidence',
    '93000000-0000-0000-8000-000000000102',
    'ledger-criterion-replace',
    jsonb_build_object(
      'goal_id', '93000000-0000-4000-8000-000000000010',
      'evaluation_id', v_evaluation_id,
      'action', 'replaced',
      'references', jsonb_build_array(jsonb_build_object(
        'source_type', 'project',
        'source_id', '93000000-0000-4000-8000-000000000041',
        'supersedes_reference_id', v_criterion_reference_id,
        'reason', 'New active source is more precise.'
      ))
    )
  );
  select id into v_criterion_replacement_id
   from public.goal_criterion_evaluation_evidence
   where evaluation_id = v_evaluation_id
     and reference_action = 'replaced'
   order by recorded_at desc, id desc limit 1;
  if not exists (
    select 1 from public.goal_criterion_evaluation_evidence
     where id = v_criterion_replacement_id
       and source_id = '93000000-0000-4000-8000-000000000041'
       and supersedes_reference_id = v_criterion_reference_id
       and reason = 'New active source is more precise.'
  ) then raise exception 'Criterion replacement did not retain exact superseded reference'; end if;

  perform pg_temp.reject(
    format(
      'select public.execute_goal_command(%L,%L,%L,%L::jsonb)',
      'criterion.evidence',
      '93000000-0000-0000-8000-000000000105',
      'ledger-criterion-second-replace',
      jsonb_build_object(
        'goal_id', '93000000-0000-4000-8000-000000000010',
        'evaluation_id', v_evaluation_id,
        'action', 'replaced',
        'references', jsonb_build_array(jsonb_build_object(
          'source_type', 'project',
          'source_id', '93000000-0000-4000-8000-000000000041',
          'supersedes_reference_id', v_criterion_reference_id,
          'reason', 'Second successor must be rejected.'
        ))
      )::text
    ),
    'GOAL_EVIDENCE_REFERENCE_ALREADY_SUPERSEDED'
  );

  perform public.execute_goal_command(
    'criterion.evidence',
    '93000000-0000-0000-8000-000000000103',
    'ledger-criterion-withdraw',
    jsonb_build_object(
      'goal_id', '93000000-0000-4000-8000-000000000010',
      'evaluation_id', v_evaluation_id,
      'action', 'withdrawn',
      'references', jsonb_build_array(jsonb_build_object(
        'supersedes_reference_id', v_criterion_replacement_id,
        'reason', 'Source withdrawn from this decision.'
      ))
    )
  );
  if not exists (
    select 1 from public.goal_criterion_evaluation_evidence
     where evaluation_id = v_evaluation_id
       and reference_action = 'withdrawn'
       and supersedes_reference_id = v_criterion_replacement_id
       and reason = 'Source withdrawn from this decision.'
  ) then raise exception 'Criterion withdrawal did not preserve reason and superseded reference'; end if;
  perform pg_temp.reject(
    format(
      'select public.execute_goal_command(%L,%L,%L,%L::jsonb)',
      'criterion.evidence',
      '93000000-0000-0000-8000-000000000106',
      'ledger-criterion-second-withdraw',
      jsonb_build_object(
        'goal_id', '93000000-0000-4000-8000-000000000010',
        'evaluation_id', v_evaluation_id,
        'action', 'withdrawn',
        'references', jsonb_build_array(jsonb_build_object(
          'supersedes_reference_id', v_criterion_reference_id,
          'reason', 'Second successor must be rejected.'
        ))
      )::text
    ),
    'GOAL_EVIDENCE_REFERENCE_ALREADY_SUPERSEDED'
  );
  select count(*) into v_count
    from public.goal_criterion_evaluation_evidence leaf
   where leaf.evaluation_id = v_evaluation_id
     and not exists (
       select 1 from public.goal_criterion_evaluation_evidence successor
        where successor.supersedes_reference_id = leaf.id
     )
     and leaf.reference_action <> 'withdrawn';
  if v_count <> 0 then raise exception 'Withdrawn criterion evidence remains active'; end if;

  perform public.execute_goal_command(
    'criterion.evidence',
    '93000000-0000-0000-8000-000000000104',
    'ledger-criterion-supplement',
    jsonb_build_object(
      'goal_id', '93000000-0000-4000-8000-000000000010',
      'evaluation_id', v_evaluation_id,
      'action', 'supplemented',
      'retrospective', true,
      'references', jsonb_build_array(jsonb_build_object(
        'source_type', 'task',
        'source_id', '93000000-0000-4000-8000-000000000050',
        'reason', 'Retrospective decision supplement.'
      ))
    )
  );
  if not exists (
    select 1 from public.goal_criterion_evaluation_evidence
     where evaluation_id = v_evaluation_id
       and reference_action = 'supplemented'
       and retrospective
       and reason = 'Retrospective decision supplement.'
  ) then raise exception 'Criterion retrospective supplement was not represented'; end if;
  select count(*) into v_count
    from public.goal_criterion_evaluation_evidence leaf
   where leaf.evaluation_id = v_evaluation_id
     and not exists (
       select 1 from public.goal_criterion_evaluation_evidence successor
        where successor.supersedes_reference_id = leaf.id
     )
     and leaf.reference_action <> 'withdrawn';
  if v_count <> 1 then raise exception 'Criterion evidence projection has a non-deterministic active leaf'; end if;

  -- Etappe history and its exact event-scoped ledger.
  v_result := public.execute_goal_command(
    'milestone.achieve',
    '93000000-0000-0000-8000-000000000110',
    'ledger-milestone-achieve',
    jsonb_build_object(
      'goal_id', '93000000-0000-4000-8000-000000000010',
      'milestone_id', '93000000-0000-4000-8000-000000000020',
      'occurred_at', '2026-09-21T01:01:00Z'
    )
  );
  v_milestone_event_id := (v_result->>'event_id')::uuid;
  perform public.execute_goal_command(
    'milestone.evidence',
    '93000000-0000-0000-8000-000000000111',
    'ledger-milestone-attach',
    jsonb_build_object(
      'goal_id', '93000000-0000-4000-8000-000000000010',
      'milestone_id', '93000000-0000-4000-8000-000000000020',
      'achievement_event_id', v_milestone_event_id,
      'action', 'attached',
      'references', jsonb_build_array(jsonb_build_object(
        'source_type', 'project',
        'source_id', '93000000-0000-4000-8000-000000000040'
      ))
    )
  );
  select id into v_milestone_reference_id
   from public.goal_milestone_achievement_evidence
   where achievement_event_id = v_milestone_event_id
     and reference_action = 'attached'
   order by recorded_at desc, id desc limit 1;
  perform public.execute_goal_command(
    'milestone.evidence',
    '93000000-0000-0000-8000-000000000112',
    'ledger-milestone-replace',
    jsonb_build_object(
      'goal_id', '93000000-0000-4000-8000-000000000010',
      'milestone_id', '93000000-0000-4000-8000-000000000020',
      'achievement_event_id', v_milestone_event_id,
      'action', 'replaced',
      'references', jsonb_build_array(jsonb_build_object(
        'source_type', 'project',
        'source_id', '93000000-0000-4000-8000-000000000041',
        'supersedes_reference_id', v_milestone_reference_id,
        'reason', 'Replacement Etappe source.'
      ))
    )
  );
  perform pg_temp.reject(
    format(
      'select public.execute_goal_command(%L,%L,%L,%L::jsonb)',
      'milestone.evidence',
      '93000000-0000-0000-8000-000000000116',
      'ledger-milestone-second-replace',
      jsonb_build_object(
        'goal_id', '93000000-0000-4000-8000-000000000010',
        'milestone_id', '93000000-0000-4000-8000-000000000020',
        'achievement_event_id', v_milestone_event_id,
        'action', 'replaced',
        'references', jsonb_build_array(jsonb_build_object(
          'source_type', 'project',
          'source_id', '93000000-0000-4000-8000-000000000041',
          'supersedes_reference_id', v_milestone_reference_id,
          'reason', 'Second successor must be rejected.'
        ))
      )::text
    ),
    'GOAL_EVIDENCE_REFERENCE_ALREADY_SUPERSEDED'
  );
  select id into v_milestone_replacement_id
   from public.goal_milestone_achievement_evidence
   where achievement_event_id = v_milestone_event_id
     and reference_action = 'replaced'
   order by recorded_at desc, id desc limit 1;
  perform public.execute_goal_command(
    'milestone.evidence',
    '93000000-0000-0000-8000-000000000113',
    'ledger-milestone-withdraw',
    jsonb_build_object(
      'goal_id', '93000000-0000-4000-8000-000000000010',
      'milestone_id', '93000000-0000-4000-8000-000000000020',
      'achievement_event_id', v_milestone_event_id,
      'action', 'withdrawn',
      'references', jsonb_build_array(jsonb_build_object(
        'supersedes_reference_id', v_milestone_replacement_id,
        'reason', 'Etappe source withdrawn.'
      ))
    )
  );
  perform pg_temp.reject(
    format(
      'select public.execute_goal_command(%L,%L,%L,%L::jsonb)',
      'milestone.evidence',
      '93000000-0000-0000-8000-000000000117',
      'ledger-milestone-second-withdraw',
      jsonb_build_object(
        'goal_id', '93000000-0000-4000-8000-000000000010',
        'milestone_id', '93000000-0000-4000-8000-000000000020',
        'achievement_event_id', v_milestone_event_id,
        'action', 'withdrawn',
        'references', jsonb_build_array(jsonb_build_object(
          'supersedes_reference_id', v_milestone_reference_id,
          'reason', 'Second successor must be rejected.'
        ))
      )::text
    ),
    'GOAL_EVIDENCE_REFERENCE_ALREADY_SUPERSEDED'
  );
  perform public.execute_goal_command(
    'milestone.evidence',
    '93000000-0000-0000-8000-000000000114',
    'ledger-milestone-supplement',
    jsonb_build_object(
      'goal_id', '93000000-0000-4000-8000-000000000010',
      'milestone_id', '93000000-0000-4000-8000-000000000020',
      'achievement_event_id', v_milestone_event_id,
      'action', 'supplemented',
      'retrospective', true,
      'references', jsonb_build_array(jsonb_build_object(
        'source_type', 'task',
        'source_id', '93000000-0000-4000-8000-000000000050',
        'reason', 'Retrospective Etappe supplement.'
      ))
    )
  );
  if not exists (
    select 1 from public.goal_milestone_achievement_evidence
     where achievement_event_id = v_milestone_event_id
       and reference_action = 'supplemented'
       and retrospective
  ) then raise exception 'Etappe retrospective supplement was not represented'; end if;
  select count(*) into v_count
    from public.goal_milestone_achievement_evidence leaf
   where leaf.achievement_event_id = v_milestone_event_id
     and not exists (
       select 1 from public.goal_milestone_achievement_evidence successor
        where successor.supersedes_reference_id = leaf.id
     )
     and leaf.reference_action <> 'withdrawn';
  if v_count <> 1 then raise exception 'Etappe evidence projection has a non-deterministic active leaf'; end if;

  v_result := public.execute_goal_command(
    'milestone.amend',
    '93000000-0000-0000-8000-000000000115',
    'ledger-milestone-amend',
    jsonb_build_object(
      'goal_id', '93000000-0000-4000-8000-000000000010',
      'milestone_id', '93000000-0000-4000-8000-000000000020',
      'event_id', v_milestone_event_id,
      'occurred_at', '2026-09-21T01:02:00Z',
      'note', 'Amended Etappe note.',
      'correction_reason', 'Etappe history correction proof.',
      'retrospective', true
    )
  );
  v_milestone_amendment_id := (v_result->>'event_id')::uuid;
  if not exists (
    select 1 from public.goal_milestone_achievement_events
     where id = v_milestone_amendment_id
       and event_type = 'amended'
       and corrects_event_id = v_milestone_event_id
       and correction_reason = 'Etappe history correction proof.'
       and retrospective
       and goal_milestone_title_snapshot = 'Slice-1 ledger Etappe'
  ) then raise exception 'Etappe amendment did not preserve bounded history'; end if;

  -- Goal achievement and amendment; the Goal event has no description/why snapshots.
  v_result := public.execute_goal_command(
    'goal.achieve',
    '93000000-0000-0000-8000-000000000120',
    'ledger-goal-achieve',
    jsonb_build_object(
      'goal_id', '93000000-0000-4000-8000-000000000010',
      'note', 'Initial exact Goal outcome.',
      'occurred_at', '2026-09-21T01:03:00Z',
      'references', jsonb_build_array(jsonb_build_object(
        'source_type', 'project',
        'source_id', '93000000-0000-4000-8000-000000000040'
      ))
    )
  );
  v_goal_event_id := (v_result->>'event_id')::uuid;
  -- The achieved Goal is now authoritative for criterion decisions. Direct
  -- authenticated RPC calls must reject all three revision forms until reopen.
  perform pg_temp.reject(
    format(
      'select public.execute_goal_command(%L,%L,%L,%L::jsonb)',
      'criterion.evaluate',
      '93000000-0000-0000-8000-000000000126',
      'ledger-achieved-criterion-evaluate',
      jsonb_build_object(
        'goal_id', '93000000-0000-4000-8000-000000000010',
        'criterion_id', '93000000-0000-4000-8000-000000000030',
        'boolean_value', false,
        'deferred', false,
        'expected_latest_evaluation_id', v_evaluation_id
      )::text
    ),
    'GOAL_CRITERION_ACHIEVED_REQUIRES_REOPEN'
  );
  perform pg_temp.reject(
    format(
      'select public.execute_goal_command(%L,%L,%L,%L::jsonb)',
      'criterion.correct',
      '93000000-0000-0000-8000-000000000127',
      'ledger-achieved-criterion-correct',
      jsonb_build_object(
        'goal_id', '93000000-0000-4000-8000-000000000010',
        'criterion_id', '93000000-0000-4000-8000-000000000030',
        'boolean_value', true,
        'deferred', false,
        'correction_reason', 'Reopen is required.',
        'expected_latest_evaluation_id', v_evaluation_id
      )::text
    ),
    'GOAL_CRITERION_ACHIEVED_REQUIRES_REOPEN'
  );
  perform pg_temp.reject(
    format(
      'select public.execute_goal_command(%L,%L,%L,%L::jsonb)',
      'criterion.retract',
      '93000000-0000-0000-8000-000000000128',
      'ledger-achieved-criterion-retract',
      jsonb_build_object(
        'goal_id', '93000000-0000-4000-8000-000000000010',
        'criterion_id', '93000000-0000-4000-8000-000000000030',
        'correction_reason', 'Reopen is required.',
        'expected_latest_evaluation_id', v_evaluation_id
      )::text
    ),
    'GOAL_CRITERION_ACHIEVED_REQUIRES_REOPEN'
  );
  perform public.execute_goal_command(
    'goal.reopen',
    '93000000-0000-0000-8000-000000000129',
    'ledger-goal-reopen-for-criterion',
    jsonb_build_object(
      'goal_id', '93000000-0000-4000-8000-000000000010',
      'occurred_at', '2026-09-21T01:03:15Z'
    )
  );
  v_result := public.execute_goal_command(
    'criterion.correct',
    '93000000-0000-0000-8000-00000000012a',
    'ledger-reopened-criterion-correct',
    jsonb_build_object(
      'goal_id', '93000000-0000-4000-8000-000000000010',
      'criterion_id', '93000000-0000-4000-8000-000000000030',
      'boolean_value', true,
      'deferred', false,
      'correction_reason', 'Corrected after explicit reopen.',
      'expected_latest_evaluation_id', v_evaluation_id
    )
  );
  if (v_result->>'evaluation_id') is null then
    raise exception 'Criterion correction did not succeed after Goal reopen';
  end if;
  v_evaluation_id := (v_result->>'evaluation_id')::uuid;
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'goal_achievement_events'
       and column_name in ('goal_description_snapshot', 'goal_why_snapshot')
  ) then raise exception 'Forbidden Goal narrative snapshot columns still exist'; end if;

  v_result := public.execute_goal_command(
    'goal.amend',
    '93000000-0000-0000-8000-000000000121',
    'ledger-goal-amend',
    jsonb_build_object(
      'goal_id', '93000000-0000-4000-8000-000000000010',
      'event_id', v_goal_event_id,
      'achievement_note', 'Amended exact Goal outcome.',
      'correction_reason', 'Goal history correction proof.',
      'retrospective', true
    )
  );
  v_goal_amendment_id := (v_result->>'event_id')::uuid;
  if not exists (
    select 1 from public.goal_achievement_events
     where id = v_goal_amendment_id
       and event_type = 'amended'
       and corrects_event_id = v_goal_event_id
       and correction_reason = 'Goal history correction proof.'
       and retrospective
       and goal_title_snapshot = 'Slice-1 ledger Goal'
       and achievement_note = 'Amended exact Goal outcome.'
  ) then raise exception 'Goal amendment did not preserve bounded history'; end if;

  v_result := public.execute_goal_command(
    'goal.amend',
    '93000000-0000-0000-8000-00000000012b',
    'ledger-goal-amend-twice',
    jsonb_build_object(
      'goal_id', '93000000-0000-4000-8000-000000000010',
      'event_id', v_goal_amendment_id,
      'occurred_at', '2026-09-21T01:03:30Z',
      'achievement_note', 'Final exact Goal outcome.',
      'correction_reason', 'Second Goal history correction proof.',
      'retrospective', false
    )
  );
  v_goal_amendment_id := (v_result->>'event_id')::uuid;
  if not exists (
    select 1 from public.goal_achievement_events current_event
     join public.goal_achievement_events prior_event
       on prior_event.id = current_event.corrects_event_id
    where current_event.id = v_goal_amendment_id
      and current_event.corrects_event_id = prior_event.id
      and current_event.achievement_note = 'Final exact Goal outcome.'
      and current_event.occurred_at = '2026-09-21T01:03:30Z'
      and current_event.correction_reason = 'Second Goal history correction proof.'
      and prior_event.corrects_event_id = v_goal_event_id
  ) then raise exception 'Second Goal amendment did not form a linear correction chain'; end if;
  select count(*) into v_count
    from public.goal_achievement_criterion_basis
   where achievement_event_id = v_goal_event_id;
  if v_count <> 1 then raise exception 'Original Goal criterion basis was not retained'; end if;
  select count(*) into v_count
    from public.goal_achievement_milestone_basis
   where achievement_event_id = v_goal_event_id;
  if v_count <> 1 then raise exception 'Original Goal Etappe basis was not retained'; end if;
  select count(*) into v_count
    from public.goal_achievement_criterion_basis
   where achievement_event_id in (
     (select corrects_event_id from public.goal_achievement_events where id = v_goal_amendment_id),
     v_goal_amendment_id
   );
  if v_count <> 0 then raise exception 'Goal amendments duplicated immutable criterion basis'; end if;
  select count(*) into v_count
    from public.goal_achievement_milestone_basis
   where achievement_event_id in (
     (select corrects_event_id from public.goal_achievement_events where id = v_goal_amendment_id),
     v_goal_amendment_id
   );
  if v_count <> 0 then raise exception 'Goal amendments duplicated immutable Etappe basis'; end if;

  perform public.execute_goal_command(
    'goal.evidence',
    '93000000-0000-0000-8000-000000000122',
    'ledger-goal-attach',
    jsonb_build_object(
      'goal_id', '93000000-0000-4000-8000-000000000010',
      'achievement_event_id', v_goal_amendment_id,
      'action', 'attached',
      'references', jsonb_build_array(jsonb_build_object(
        'source_type', 'project',
        'source_id', '93000000-0000-4000-8000-000000000040'
      ))
    )
  );
  select id into v_goal_reference_id
   from public.goal_achievement_evidence
   where achievement_event_id = v_goal_amendment_id
     and reference_action = 'attached'
   order by recorded_at desc, id desc limit 1;
  perform public.execute_goal_command(
    'goal.evidence',
    '93000000-0000-0000-8000-000000000123',
    'ledger-goal-replace',
    jsonb_build_object(
      'goal_id', '93000000-0000-4000-8000-000000000010',
      'achievement_event_id', v_goal_amendment_id,
      'action', 'replaced',
      'references', jsonb_build_array(jsonb_build_object(
        'source_type', 'project',
        'source_id', '93000000-0000-4000-8000-000000000041',
        'supersedes_reference_id', v_goal_reference_id,
        'reason', 'Goal replacement source.'
      ))
    )
  );
  select id into v_goal_replacement_id
   from public.goal_achievement_evidence
   where achievement_event_id = v_goal_amendment_id
     and reference_action = 'replaced'
   order by recorded_at desc, id desc limit 1;
  perform pg_temp.reject(
    format(
      'select public.execute_goal_command(%L,%L,%L,%L::jsonb)',
      'goal.evidence',
      '93000000-0000-0000-8000-00000000012c',
      'ledger-goal-second-replace',
      jsonb_build_object(
        'goal_id', '93000000-0000-4000-8000-000000000010',
        'achievement_event_id', v_goal_amendment_id,
        'action', 'replaced',
        'references', jsonb_build_array(jsonb_build_object(
          'source_type', 'project',
          'source_id', '93000000-0000-4000-8000-000000000041',
          'supersedes_reference_id', v_goal_reference_id,
          'reason', 'Second successor must be rejected.'
        ))
      )::text
    ),
    'GOAL_EVIDENCE_REFERENCE_ALREADY_SUPERSEDED'
  );
  perform public.execute_goal_command(
    'goal.evidence',
    '93000000-0000-0000-8000-000000000124',
    'ledger-goal-withdraw',
    jsonb_build_object(
      'goal_id', '93000000-0000-4000-8000-000000000010',
      'achievement_event_id', v_goal_amendment_id,
      'action', 'withdrawn',
      'references', jsonb_build_array(jsonb_build_object(
        'supersedes_reference_id', v_goal_replacement_id,
        'reason', 'Goal source withdrawn.'
      ))
    )
  );
  perform pg_temp.reject(
    format(
      'select public.execute_goal_command(%L,%L,%L,%L::jsonb)',
      'goal.evidence',
      '93000000-0000-0000-8000-00000000012d',
      'ledger-goal-second-withdraw',
      jsonb_build_object(
        'goal_id', '93000000-0000-4000-8000-000000000010',
        'achievement_event_id', v_goal_amendment_id,
        'action', 'withdrawn',
        'references', jsonb_build_array(jsonb_build_object(
          'supersedes_reference_id', v_goal_reference_id,
          'reason', 'Second successor must be rejected.'
        ))
      )::text
    ),
    'GOAL_EVIDENCE_REFERENCE_ALREADY_SUPERSEDED'
  );
  perform public.execute_goal_command(
    'goal.evidence',
    '93000000-0000-0000-8000-000000000125',
    'ledger-goal-supplement',
    jsonb_build_object(
      'goal_id', '93000000-0000-4000-8000-000000000010',
      'achievement_event_id', v_goal_amendment_id,
      'action', 'supplemented',
      'retrospective', true,
      'references', jsonb_build_array(jsonb_build_object(
        'source_type', 'task',
        'source_id', '93000000-0000-4000-8000-000000000050',
        'reason', 'Retrospective Goal supplement.'
      ))
    )
  );
  if not exists (
    select 1 from public.goal_achievement_evidence
     where achievement_event_id = v_goal_amendment_id
       and reference_action = 'supplemented'
       and retrospective
  ) then raise exception 'Goal retrospective supplement was not represented'; end if;
  select count(*) into v_count
    from public.goal_achievement_evidence leaf
   where leaf.achievement_event_id = v_goal_amendment_id
     and not exists (
       select 1 from public.goal_achievement_evidence successor
        where successor.supersedes_reference_id = leaf.id
     )
     and leaf.reference_action <> 'withdrawn';
  if v_count <> 1 then raise exception 'Goal evidence projection has a non-deterministic active leaf'; end if;

  perform pg_temp.reject(
    format('update public.goal_achievement_events set achievement_note = %L where id = %L', 'mutated', v_goal_event_id),
    'permission denied'
  );
  perform pg_temp.reject(
    format('update public.goal_achievement_evidence set reason = %L where id = %L', 'mutated', v_goal_reference_id),
    'permission denied'
  );

  -- Legacy achieved Goal and Etappe reopen into their original episode; the
  -- marker remains intact and never borrows current identity.
  v_result := public.execute_goal_command(
    'milestone.reopen',
    '93000000-0000-0000-8000-000000000130',
    'legacy-milestone-reopen',
    jsonb_build_object(
      'goal_id', '93000000-0000-4000-8000-000000000011',
      'milestone_id', '93000000-0000-4000-8000-000000000021',
      'occurred_at', '2026-09-21T01:04:00Z'
    )
  );
  if (v_result->>'episode_id')::uuid <> v_legacy_milestone_episode_id then
    raise exception 'Legacy Etappe reopened into a new invented episode';
  end if;
  if exists (
    select 1
      from public.goal_milestone_achievement_events
     where id = (v_result->>'event_id')::uuid
       and (goal_title_snapshot is not null
         or goal_milestone_title_snapshot is not null
         or goal_milestone_description_snapshot is not null)
  ) then
    raise exception 'Legacy Etappe reopen borrowed current identity as historical context';
  end if;
  select count(*) into v_count
    from public.goal_milestone_achievement_events
   where goal_milestone_id = '93000000-0000-4000-8000-000000000021';
  if v_count <> 2 then raise exception 'Legacy Etappe achievement episode was not preserved'; end if;

  v_result := public.execute_goal_command(
    'goal.reopen',
    '93000000-0000-0000-8000-000000000131',
    'legacy-goal-reopen',
    jsonb_build_object(
      'goal_id', '93000000-0000-4000-8000-000000000011',
      'occurred_at', '2026-09-21T01:05:00Z'
    )
  );
  if (v_result->>'episode_id')::uuid <> v_legacy_goal_episode_id then
    raise exception 'Legacy Goal reopened into a new invented episode';
  end if;
  if exists (
    select 1
      from public.goal_achievement_events
     where id = (v_result->>'event_id')::uuid
       and goal_title_snapshot is not null
  ) then
    raise exception 'Legacy Goal reopen borrowed current identity as historical context';
  end if;
  select count(*) into v_count
    from public.goal_achievement_events
   where goal_id = '93000000-0000-4000-8000-000000000011';
  if v_count <> 2 then raise exception 'Legacy Goal achievement episode was not preserved'; end if;
  if not exists (
    select 1 from public.goal_achievement_events
     where goal_id = '93000000-0000-4000-8000-000000000011'
       and event_type = 'achieved'
       and goal_title_snapshot is null
       and occurred_at = '2026-09-20T12:00:00Z'
       and (legacy_state->>'legacy_state') = 'true'
  ) then raise exception 'Legacy Goal marker was altered during reopen'; end if;
end
$$;

rollback;
select 'PP1_GOAL_HISTORY_LEDGER_DB_PASS';
