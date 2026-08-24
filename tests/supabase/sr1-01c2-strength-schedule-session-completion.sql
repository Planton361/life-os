begin;

insert into auth.users (
  instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('61000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'sr1c2-owner@example.test', '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('62000000-0000-0000-0000-000000000002', '62000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'sr1c2-other@example.test', '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.exercises (id, user_id, name, equipment) values
  ('61300000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001', 'SR1C2 owner squat', 'Barbell'),
  ('62300000-0000-0000-0000-000000000002', '62000000-0000-0000-0000-000000000002', 'SR1C2 other squat', 'Barbell');

insert into public.strength_plans (id, user_id, name, goal) values
  ('61100000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001', 'SR1C2 main plan', 'Real squat session'),
  ('61100000-0000-0000-0000-000000000002', '61000000-0000-0000-0000-000000000001', 'SR1C2 guard plan', 'No fake training'),
  ('61100000-0000-0000-0000-000000000003', '61000000-0000-0000-0000-000000000001', 'SR1C2 invalid session plan', 'Preserve session rule'),
  ('61100000-0000-0000-0000-000000000004', '61000000-0000-0000-0000-000000000001', 'SR1C2 rollback plan', 'Rollback proof'),
  ('61100000-0000-0000-0000-000000000005', '61000000-0000-0000-0000-000000000001', 'SR1C2 archived plan', 'Archive guard'),
  ('62100000-0000-0000-0000-000000000002', '62000000-0000-0000-0000-000000000002', 'SR1C2 foreign plan', 'Remain private');

insert into public.strength_plan_items (
  id, user_id, plan_id, exercise_id, sort_order, target_sets, target_reps, target_weight_kg
) values
  ('61400000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001', '61100000-0000-0000-0000-000000000001', '61300000-0000-0000-0000-000000000001', 1, 3, 8, 75),
  ('61400000-0000-0000-0000-000000000002', '61000000-0000-0000-0000-000000000001', '61100000-0000-0000-0000-000000000002', '61300000-0000-0000-0000-000000000001', 1, 3, 8, 75),
  ('61400000-0000-0000-0000-000000000003', '61000000-0000-0000-0000-000000000001', '61100000-0000-0000-0000-000000000003', '61300000-0000-0000-0000-000000000001', 1, 3, 8, 75),
  ('61400000-0000-0000-0000-000000000004', '61000000-0000-0000-0000-000000000001', '61100000-0000-0000-0000-000000000004', '61300000-0000-0000-0000-000000000001', 1, 3, 8, 75),
  ('61400000-0000-0000-0000-000000000005', '61000000-0000-0000-0000-000000000001', '61100000-0000-0000-0000-000000000005', '61300000-0000-0000-0000-000000000001', 1, 3, 8, 75),
  ('62400000-0000-0000-0000-000000000002', '62000000-0000-0000-0000-000000000002', '62100000-0000-0000-0000-000000000002', '62300000-0000-0000-0000-000000000002', 1, 3, 8, 75);

update public.strength_plans
  set archived_at = now()
  where id = '61100000-0000-0000-0000-000000000005';

insert into public.strength_sessions (
  id, user_id, plan_id, session_date, status, completed_at
) values (
  '62200000-0000-0000-0000-000000000002',
  '62000000-0000-0000-0000-000000000002',
  '62100000-0000-0000-0000-000000000002',
  '2026-08-24', 'in_progress', null
);

insert into public.tasks (id, user_id, title, status, priority) values
  ('62200000-0000-0000-0000-000000000003', '62000000-0000-0000-0000-000000000002', 'SR1C2 foreign task', 'planned', 'P2');

create temporary table sr1c2_cases (
  case_name text primary key,
  task_id uuid,
  session_id uuid
) on commit drop;
grant select, insert, update on sr1c2_cases to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub', '61000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

insert into sr1c2_cases (case_name, task_id)
select 'main', (public.schedule_linked_source(
  'strength_plan', '61100000-0000-0000-0000-000000000001',
  '2026-08-26', '2026-08-26T18:00:00+02:00', 60
)).id;

select public.schedule_linked_source(
  'strength_plan', '61100000-0000-0000-0000-000000000001',
  '2026-08-26', '2026-08-26T18:30:00+02:00', 65
);

do $$
begin
  if not exists (
    select 1
    from public.schedule_source_links link
    join public.tasks task on task.id = link.task_id and task.user_id = link.user_id
    where link.user_id = '61000000-0000-0000-0000-000000000001'
      and link.source_type = 'strength_plan'
      and link.source_id = '61100000-0000-0000-0000-000000000001'
      and task.id = (select task_id from sr1c2_cases where case_name = 'main')
      and task.planned_date = '2026-08-26'
      and task.scheduled_start_at = '2026-08-26T16:30:00+00:00'::timestamptz
      and task.duration_minutes = 65
      and task.status = 'planned'
  ) then
    raise exception 'Strength Plan did not receive one canonical scheduled Task';
  end if;

  if (select count(*) from public.schedule_source_links
      where user_id = '61000000-0000-0000-0000-000000000001'
        and source_type = 'strength_plan'
        and source_id = '61100000-0000-0000-0000-000000000001') <> 1 then
    raise exception 'Strength source schedule was not idempotent';
  end if;
end;
$$;

update sr1c2_cases
  set session_id = '61200000-0000-0000-0000-000000000001'
  where case_name = 'main';

insert into public.strength_sessions (id, user_id, plan_id, session_date, started_at, notes)
select session_id, '61000000-0000-0000-0000-000000000001',
       '61100000-0000-0000-0000-000000000001', '2026-08-26',
       '2026-08-26T16:35:00+00:00', 'SR1C2 real strength session'
from sr1c2_cases where case_name = 'main';

insert into public.strength_set_logs (
  id, user_id, session_id, exercise_id, set_order, repetitions, weight_kg, notes
)
select '61500000-0000-0000-0000-000000000001',
       '61000000-0000-0000-0000-000000000001', session_id,
       '61300000-0000-0000-0000-000000000001', 1, 8, 77.5,
       'SR1C2 real working set'
from sr1c2_cases where case_name = 'main';

select public.complete_strength_session(
  (select session_id from sr1c2_cases where case_name = 'main'),
  '2026-08-26T17:42:00+00:00'
);

do $$
begin
  if not exists (
    select 1
    from public.strength_sessions session
    join public.strength_set_logs set_log
      on set_log.session_id = session.id and set_log.user_id = session.user_id
    join public.tasks task on task.id = (select task_id from sr1c2_cases where case_name = 'main')
    where session.id = (select session_id from sr1c2_cases where case_name = 'main')
      and session.plan_id = '61100000-0000-0000-0000-000000000001'
      and session.status = 'completed'
      and session.completed_at = '2026-08-26T17:42:00+00:00'::timestamptz
      and set_log.exercise_id = '61300000-0000-0000-0000-000000000001'
      and set_log.set_order = 1
      and set_log.repetitions = 8
      and set_log.weight_kg = 77.5
      and set_log.notes = 'SR1C2 real working set'
      and task.status = 'done'
      and task.completed_at = session.completed_at
  ) then
    raise exception 'completed real Strength Session did not atomically complete its Task';
  end if;
end;
$$;

select public.complete_strength_session(
  (select session_id from sr1c2_cases where case_name = 'main'),
  '2026-08-27T17:42:00+00:00'
);

select public.complete_linked_task(
  (select task_id from sr1c2_cases where case_name = 'main'),
  '2026-08-28T17:42:00+00:00'
);

do $$
begin
  if (select completed_at from public.strength_sessions where id = (select session_id from sr1c2_cases where case_name = 'main'))
    <> '2026-08-26T17:42:00+00:00'::timestamptz then
    raise exception 'repeated Strength completion changed Session completed_at';
  end if;
  if (select completed_at from public.tasks where id = (select task_id from sr1c2_cases where case_name = 'main'))
    <> '2026-08-26T17:42:00+00:00'::timestamptz then
    raise exception 'repeated Strength completion changed Task completed_at';
  end if;
  if (select count(*) from public.tasks where user_id = '61000000-0000-0000-0000-000000000001'
        and title = 'Strength: SR1C2 main plan') <> 1 then
    raise exception 'Strength completion created a duplicate Task';
  end if;
end;
$$;

insert into sr1c2_cases (case_name, task_id)
select 'guard', (public.schedule_linked_source(
  'strength_plan', '61100000-0000-0000-0000-000000000002',
  '2026-08-27', '2026-08-27T18:00:00+02:00', 60
)).id;

do $$
declare
  v_rejected boolean := false;
begin
  begin
    perform public.complete_linked_task(
      (select task_id from sr1c2_cases where case_name = 'guard'),
      '2026-08-27T17:00:00+00:00'
    );
  exception when others then
    v_rejected := true;
  end;

  if not v_rejected then
    raise exception 'open Strength Task completion was accepted';
  end if;
  if not exists (
    select 1 from public.tasks
    where id = (select task_id from sr1c2_cases where case_name = 'guard')
      and status = 'planned' and completed_at is null
  ) then
    raise exception 'rejected Strength Task completion partially mutated the Task';
  end if;
  if exists (
    select 1 from public.strength_sessions
    where user_id = '61000000-0000-0000-0000-000000000001'
      and plan_id = '61100000-0000-0000-0000-000000000002'
  ) then
    raise exception 'Task completion fabricated a Strength Session';
  end if;
  if exists (
    select 1
    from public.strength_set_logs set_log
    join public.strength_sessions session
      on session.id = set_log.session_id
     and session.user_id = set_log.user_id
    where set_log.user_id = '61000000-0000-0000-0000-000000000001'
      and session.plan_id = '61100000-0000-0000-0000-000000000002'
  ) then
    raise exception 'Task completion fabricated Strength Set Logs';
  end if;
end;
$$;

insert into sr1c2_cases (case_name, task_id, session_id)
select 'invalid', (public.schedule_linked_source(
  'strength_plan', '61100000-0000-0000-0000-000000000003',
  '2026-08-28', '2026-08-28T18:00:00+02:00', 60
)).id, '61200000-0000-0000-0000-000000000003';

insert into public.strength_sessions (id, user_id, plan_id, session_date)
select session_id, '61000000-0000-0000-0000-000000000001',
       '61100000-0000-0000-0000-000000000003', '2026-08-28'
from sr1c2_cases where case_name = 'invalid';

do $$
declare
  v_rejected boolean := false;
begin
  begin
    perform public.complete_strength_session(
      (select session_id from sr1c2_cases where case_name = 'invalid'),
      '2026-08-28T17:00:00+00:00'
    );
  exception when others then
    v_rejected := true;
  end;

  if not v_rejected then
    raise exception 'Strength Session without a Set Log was accepted';
  end if;
  if not exists (
    select 1 from public.strength_sessions
    where id = (select session_id from sr1c2_cases where case_name = 'invalid')
      and status = 'in_progress' and completed_at is null
  ) then
    raise exception 'invalid Strength Session partially completed';
  end if;
  if not exists (
    select 1 from public.tasks
    where id = (select task_id from sr1c2_cases where case_name = 'invalid')
      and status = 'planned' and completed_at is null
  ) then
    raise exception 'invalid Strength Session changed its Task';
  end if;
end;
$$;

insert into sr1c2_cases (case_name, task_id, session_id)
select 'rollback', (public.schedule_linked_source(
  'strength_plan', '61100000-0000-0000-0000-000000000004',
  '2026-08-29', '2026-08-29T18:00:00+02:00', 60
)).id, '61200000-0000-0000-0000-000000000004';

insert into public.strength_sessions (id, user_id, plan_id, session_date)
select session_id, '61000000-0000-0000-0000-000000000001',
       '61100000-0000-0000-0000-000000000004', '2026-08-29'
from sr1c2_cases where case_name = 'rollback';

insert into public.strength_set_logs (id, user_id, session_id, exercise_id, set_order, repetitions)
select '61500000-0000-0000-0000-000000000004',
       '61000000-0000-0000-0000-000000000001', session_id,
       '61300000-0000-0000-0000-000000000001', 1, 8
from sr1c2_cases where case_name = 'rollback';

reset role;
update public.tasks
  set archived_at = now()
  where id = (select task_id from sr1c2_cases where case_name = 'rollback');

set local role authenticated;
select set_config('request.jwt.claim.sub', '61000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
declare
  v_rejected boolean := false;
begin
  begin
    perform public.complete_strength_session(
      (select session_id from sr1c2_cases where case_name = 'rollback'),
      '2026-08-29T17:00:00+00:00'
    );
  exception when others then
    v_rejected := true;
  end;

  if not v_rejected then
    raise exception 'unavailable linked Task allowed a partial Strength Session completion';
  end if;
  if not exists (
    select 1 from public.strength_sessions
    where id = (select session_id from sr1c2_cases where case_name = 'rollback')
      and status = 'in_progress' and completed_at is null
  ) then
    raise exception 'failed Strength completion was not rolled back';
  end if;
end;
$$;

do $$
declare
  v_rejected boolean := false;
begin
  begin
    perform public.schedule_linked_source(
      'strength_plan', '62100000-0000-0000-0000-000000000002',
      '2026-08-26', '2026-08-26T18:00:00+02:00', 60
    );
  exception when others then
    v_rejected := true;
  end;
  if not v_rejected then
    raise exception 'foreign Strength Plan was accepted';
  end if;

  v_rejected := false;
  begin
    perform public.complete_linked_task(
      '62200000-0000-0000-0000-000000000003', '2026-08-26T17:00:00+00:00'
    );
  exception when others then
    v_rejected := true;
  end;
  if not v_rejected then
    raise exception 'foreign Task was accepted';
  end if;

  v_rejected := false;
  begin
    perform public.complete_strength_session(
      '62200000-0000-0000-0000-000000000002', '2026-08-26T17:00:00+00:00'
    );
  exception when others then
    v_rejected := true;
  end;
  if not v_rejected then
    raise exception 'foreign Strength Session was accepted';
  end if;

  v_rejected := false;
  begin
    perform public.schedule_linked_source(
      'strength_plan', '61100000-0000-0000-0000-000000000005',
      '2026-08-30', '2026-08-30T18:00:00+02:00', 60
    );
  exception when others then
    v_rejected := true;
  end;
  if not v_rejected then
    raise exception 'archived Strength Plan was accepted';
  end if;
end;
$$;

reset role;

do $$
declare
  v_has_activity_event boolean;
begin
  if to_regclass('public.activity_events') is not null then
    execute $sql$
      select exists (
        select 1 from public.activity_events
        where user_id = '61000000-0000-0000-0000-000000000001'
      )
    $sql$ into v_has_activity_event;
  end if;

  if coalesce(v_has_activity_event, false) then
    raise exception 'Strength completion produced an Activity Event side effect';
  end if;
end;
$$;

rollback;
