-- PP1 repair boundary proof. Run against the canonical local target with psql.
-- All rows roll back; this exercises authenticated RLS, FK identity protection,
-- resolved direct/inherited Goal guards, deferred latest-state gating and the
-- accepted reversible milestone lifecycle.
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
  '91000000-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'pp1-repair-owner@example.test',
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now()
);

insert into public.goals (id, user_id, title, status) values
  ('91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000001', 'PP1 repair Goal', 'active'),
  ('91000000-0000-4000-8000-000000000011', '91000000-0000-4000-8000-000000000001', 'PP1 conflict Goal', 'active');

insert into public.goal_milestones (id, user_id, goal_id, title, status, sort_order) values
  ('91000000-0000-4000-8000-000000000020', '91000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000010', 'PP1 repair milestone', 'active', 0),
  ('91000000-0000-4000-8000-000000000021', '91000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000010', 'PP1 planned milestone', 'planned', 1),
  ('91000000-0000-4000-8000-000000000022', '91000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000011', 'PP1 conflict milestone', 'active', 0);

insert into public.projects (id, user_id, title, status, goal_id) values
  ('91000000-0000-4000-8000-000000000030', '91000000-0000-4000-8000-000000000001', 'PP1 inherited Project', 'active', '91000000-0000-4000-8000-000000000010');

insert into public.tasks (id, user_id, project_id, title, status, priority) values
  ('91000000-0000-4000-8000-000000000040', '91000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000030', 'PP1 inherited Task', 'planned', 'P2'),
  ('91000000-0000-4000-8000-000000000041', '91000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000030', 'PP1 conflicting Task', 'planned', 'P2');

update public.tasks
   set goal_id = '91000000-0000-4000-8000-000000000011'
 where id = '91000000-0000-4000-8000-000000000041';

insert into public.goal_outcome_criteria (id, user_id, goal_id, title, criterion_type)
values ('91000000-0000-4000-8000-000000000050', '91000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000010', 'PP1 deferred criterion', 'boolean');

create function pg_temp.reject(sql text, expected text) returns void language plpgsql as $$
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
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
declare
  u uuid := auth.uid();
  inherited_support_count integer;
  evaluation_count integer;
begin
  insert into public.goal_milestone_task_support (
    user_id, goal_id, goal_milestone_id, task_id
  ) values (
    u,
    '91000000-0000-4000-8000-000000000010',
    '91000000-0000-4000-8000-000000000020',
    '91000000-0000-4000-8000-000000000040'
  );

  select count(*) into inherited_support_count
    from public.goal_milestone_task_support
   where user_id = u
     and task_id = '91000000-0000-4000-8000-000000000040';
  if inherited_support_count <> 1 then
    raise exception 'Inherited Task support was not persisted';
  end if;

  perform pg_temp.reject(
    format($sql$
      insert into public.goal_milestone_task_support(user_id,goal_id,goal_milestone_id,task_id)
      values(%L,%L,%L,%L)
    $sql$, u, '91000000-0000-4000-8000-000000000011', '91000000-0000-4000-8000-000000000022', '91000000-0000-4000-8000-000000000041'),
    'GOAL_TASK_SUPPORT_GOAL_CONFLICT'
  );

  insert into public.goal_criterion_evaluations (
    user_id, criterion_id, is_deferred, evaluated_at, note
  ) values (
    u, '91000000-0000-4000-8000-000000000050', true, '2026-09-21T00:00:01Z', 'Later review'
  );
  if public.goal_outcome_criterion_is_met(u, '91000000-0000-4000-8000-000000000050') then
    raise exception 'Deferred evaluation satisfied achievement';
  end if;

  insert into public.goal_criterion_evaluations (
    user_id, criterion_id, boolean_value, evaluated_at
  ) values (
    u, '91000000-0000-4000-8000-000000000050', true, '2026-09-21T00:00:02Z'
  );
  select count(*) into evaluation_count
    from public.goal_criterion_evaluations
   where user_id = u
     and criterion_id = '91000000-0000-4000-8000-000000000050';
  if evaluation_count <> 2 or not public.goal_outcome_criterion_is_met(u, '91000000-0000-4000-8000-000000000050') then
    raise exception 'Append-only evaluation latest projection failed';
  end if;
  perform pg_temp.reject(
    format('update public.goal_criterion_evaluations set note = %L where criterion_id = %L', 'mutated', '91000000-0000-4000-8000-000000000050'),
    'permission denied'
  );

  update public.goal_milestones set status = 'planned'
   where id = '91000000-0000-4000-8000-000000000020';
  update public.goal_milestones set status = 'active'
   where id = '91000000-0000-4000-8000-000000000020';
  update public.goal_milestones set status = 'achieved'
   where id = '91000000-0000-4000-8000-000000000020';
  update public.goal_milestones set status = 'active'
   where id = '91000000-0000-4000-8000-000000000020';
  perform pg_temp.reject(
    $transition$update public.goal_milestones set status = 'achieved' where id = '91000000-0000-4000-8000-000000000021'$transition$,
    'GOAL_MILESTONE_STATUS_TRANSITION_INVALID'
  );
  update public.goal_milestones
     set status = 'archived', archived_at = now()
   where id = '91000000-0000-4000-8000-000000000021';
end
$$;

rollback;
select 'PP1_GOAL_OUTCOME_REPAIRS_DB_PASS';
