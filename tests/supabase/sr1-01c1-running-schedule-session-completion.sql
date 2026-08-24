begin;

insert into auth.users (
  instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('51000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'sr1c1-owner@example.test', '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('52000000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'sr1c1-other@example.test', '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.running_plans (id, user_id, name, goal) values
  ('51100000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 'SR1C1 owner plan', 'Finish a measured running block'),
  ('52100000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-000000000002', 'SR1C1 other plan', 'Remain private'),
  ('51100000-0000-0000-0000-000000000003', '51000000-0000-0000-0000-000000000001', 'SR1C1 archived plan', 'Archive guard');

insert into public.running_plan_items (
  id, user_id, plan_id, title, planned_distance_km, planned_duration_minutes, sort_order
) values
  ('51200000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', '51100000-0000-0000-0000-000000000001', 'SR1C1 measured run', 6.5, 42, 1),
  ('51200000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000001', '51100000-0000-0000-0000-000000000001', 'SR1C1 guard run', 5.0, 35, 2),
  ('51200000-0000-0000-0000-000000000003', '51000000-0000-0000-0000-000000000001', '51100000-0000-0000-0000-000000000001', 'SR1C1 rollback run', 8.0, 55, 3),
  ('52200000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000002', '52100000-0000-0000-0000-000000000002', 'SR1C1 foreign run', 7.0, 48, 1),
  ('51200000-0000-0000-0000-000000000004', '51000000-0000-0000-0000-000000000001', '51100000-0000-0000-0000-000000000003', 'SR1C1 archived run', 4.0, 28, 1);

update public.running_plans
  set archived_at = now()
  where id = '51100000-0000-0000-0000-000000000003';

insert into public.running_sessions (
  id, user_id, plan_item_id, session_date, distance_km, duration_minutes, status, completed_at
) values (
  '52200000-0000-0000-0000-000000000002',
  '52000000-0000-0000-0000-000000000002',
  '52200000-0000-0000-0000-000000000001',
  '2026-08-24', 7.0, 48, 'completed', '2026-08-24T08:00:00+00:00'
);

insert into public.tasks (id, user_id, title, status, priority) values
  ('52200000-0000-0000-0000-000000000003', '52000000-0000-0000-0000-000000000002', 'SR1C1 foreign task', 'planned', 'P2');

create temporary table sr1c1_cases (
  case_name text primary key,
  task_id uuid,
  session_id uuid
) on commit drop;
grant select, insert, update on sr1c1_cases to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

insert into sr1c1_cases (case_name, task_id)
select 'main', (public.schedule_linked_source(
  'running_plan_item', '51200000-0000-0000-0000-000000000001',
  '2026-08-25', '2026-08-25T18:30:00+02:00', 42
)).id;

select public.schedule_linked_source(
  'running_plan_item', '51200000-0000-0000-0000-000000000001',
  '2026-08-25', '2026-08-25T19:00:00+02:00', 45
);

do $$
begin
  if not exists (
    select 1
    from public.schedule_source_links link
    join public.tasks task on task.id = link.task_id and task.user_id = link.user_id
    where link.user_id = '51000000-0000-0000-0000-000000000001'
      and link.source_type = 'running_plan_item'
      and link.source_id = '51200000-0000-0000-0000-000000000001'
      and task.id = (select task_id from sr1c1_cases where case_name = 'main')
      and task.planned_date = '2026-08-25'
      and task.scheduled_start_at = '2026-08-25T17:00:00+00:00'::timestamptz
      and task.duration_minutes = 45
      and task.status = 'planned'
  ) then
    raise exception 'Running Plan Item did not receive one canonical scheduled Task';
  end if;

  if (select count(*) from public.schedule_source_links
      where user_id = '51000000-0000-0000-0000-000000000001'
        and source_type = 'running_plan_item'
        and source_id = '51200000-0000-0000-0000-000000000001') <> 1 then
    raise exception 'Running source schedule was not idempotent';
  end if;
end;
$$;

update sr1c1_cases
  set session_id = (public.save_completed_running_session(
    null, '51200000-0000-0000-0000-000000000001', '2026-08-25',
    '2026-08-25T17:06:00+00:00', 6.75, 43, 151,
    'SR1C1 unique actual running data', '2026-08-25T17:50:00+00:00'
  )).id
  where case_name = 'main';

do $$
begin
  if not exists (
    select 1
    from public.running_sessions session
    join public.tasks task on task.id = (select task_id from sr1c1_cases where case_name = 'main')
    where session.id = (select session_id from sr1c1_cases where case_name = 'main')
      and session.plan_item_id = '51200000-0000-0000-0000-000000000001'
      and session.session_date = '2026-08-25'
      and session.started_at = '2026-08-25T17:06:00+00:00'::timestamptz
      and session.distance_km = 6.75
      and session.duration_minutes = 43
      and session.average_heart_rate = 151
      and session.notes = 'SR1C1 unique actual running data'
      and session.status = 'completed'
      and session.completed_at = '2026-08-25T17:50:00+00:00'::timestamptz
      and task.status = 'done'
      and task.completed_at = session.completed_at
  ) then
    raise exception 'completed real Running Session did not atomically complete its Task';
  end if;
end;
$$;

select public.save_completed_running_session(
  (select session_id from sr1c1_cases where case_name = 'main'),
  '51200000-0000-0000-0000-000000000001', '2026-08-25',
  '2026-08-25T17:06:00+00:00', 6.75, 43, 151,
  'SR1C1 unique actual running data', '2026-08-26T17:50:00+00:00'
);

select public.complete_running_session(
  (select session_id from sr1c1_cases where case_name = 'main'),
  '2026-08-27T17:50:00+00:00'
);

select public.complete_linked_task(
  (select task_id from sr1c1_cases where case_name = 'main'),
  '2026-08-28T17:50:00+00:00'
);

do $$
begin
  if (select completed_at from public.running_sessions where id = (select session_id from sr1c1_cases where case_name = 'main'))
    <> '2026-08-25T17:50:00+00:00'::timestamptz then
    raise exception 'repeated Running completion changed Session completed_at';
  end if;
  if (select completed_at from public.tasks where id = (select task_id from sr1c1_cases where case_name = 'main'))
    <> '2026-08-25T17:50:00+00:00'::timestamptz then
    raise exception 'repeated Running completion changed Task completed_at';
  end if;
  if (select count(*) from public.tasks where user_id = '51000000-0000-0000-0000-000000000001'
        and title = 'Run: SR1C1 measured run') <> 1 then
    raise exception 'Running completion created a duplicate Task';
  end if;
end;
$$;

insert into sr1c1_cases (case_name, task_id)
select 'guard', (public.schedule_linked_source(
  'running_plan_item', '51200000-0000-0000-0000-000000000002',
  '2026-08-26', '2026-08-26T18:00:00+02:00', 35
)).id;

do $$
declare
  v_rejected boolean := false;
begin
  begin
    perform public.complete_linked_task(
      (select task_id from sr1c1_cases where case_name = 'guard'),
      '2026-08-26T17:00:00+00:00'
    );
  exception when others then
    v_rejected := true;
  end;

  if not v_rejected then
    raise exception 'open Running Task completion was accepted';
  end if;
  if not exists (
    select 1 from public.tasks
    where id = (select task_id from sr1c1_cases where case_name = 'guard')
      and status = 'planned' and completed_at is null
  ) then
    raise exception 'rejected Running Task completion partially mutated the Task';
  end if;
  if exists (
    select 1 from public.running_sessions
    where user_id = '51000000-0000-0000-0000-000000000001'
      and plan_item_id = '51200000-0000-0000-0000-000000000002'
  ) then
    raise exception 'Task completion fabricated a Running Session';
  end if;
end;
$$;

insert into sr1c1_cases (case_name, task_id)
select 'rollback', (public.schedule_linked_source(
  'running_plan_item', '51200000-0000-0000-0000-000000000003',
  '2026-08-27', '2026-08-27T18:00:00+02:00', 55
)).id;

reset role;
update public.tasks
  set archived_at = now()
  where id = (select task_id from sr1c1_cases where case_name = 'rollback');

set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
declare
  v_rejected boolean := false;
begin
  begin
    perform public.save_completed_running_session(
      null, '51200000-0000-0000-0000-000000000003', '2026-08-27',
      '2026-08-27T16:00:00+00:00', 8.25, 56, null,
      'SR1C1 rollback data', '2026-08-27T17:00:00+00:00'
    );
  exception when others then
    v_rejected := true;
  end;

  if not v_rejected then
    raise exception 'unavailable linked Task allowed a partial Running Session completion';
  end if;
  if exists (
    select 1 from public.running_sessions
    where user_id = '51000000-0000-0000-0000-000000000001'
      and plan_item_id = '51200000-0000-0000-0000-000000000003'
  ) then
    raise exception 'failed Running Session completion was not rolled back';
  end if;
end;
$$;

do $$
declare
  v_rejected boolean := false;
begin
  begin
    perform public.schedule_linked_source(
      'running_plan_item', '52200000-0000-0000-0000-000000000001',
      '2026-08-25', '2026-08-25T18:00:00+02:00', 48
    );
  exception when others then
    v_rejected := true;
  end;
  if not v_rejected then
    raise exception 'foreign Running Plan Item was accepted';
  end if;

  v_rejected := false;
  begin
    perform public.complete_linked_task(
      '52200000-0000-0000-0000-000000000003', '2026-08-25T17:00:00+00:00'
    );
  exception when others then
    v_rejected := true;
  end;
  if not v_rejected then
    raise exception 'foreign Task was accepted';
  end if;

  v_rejected := false;
  begin
    perform public.save_completed_running_session(
      '52200000-0000-0000-0000-000000000002',
      '51200000-0000-0000-0000-000000000002', '2026-08-25',
      '2026-08-25T17:00:00+00:00', 5.1, 36, null,
      'SR1C1 forbidden foreign session update', '2026-08-25T18:00:00+00:00'
    );
  exception when others then
    v_rejected := true;
  end;
  if not v_rejected then
    raise exception 'foreign Running Session was accepted';
  end if;

  v_rejected := false;
  begin
    perform public.schedule_linked_source(
      'running_plan_item', '51200000-0000-0000-0000-000000000004',
      '2026-08-28', '2026-08-28T18:00:00+02:00', 28
    );
  exception when others then
    v_rejected := true;
  end;
  if not v_rejected then
    raise exception 'Running Plan Item under an archived Plan was accepted';
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
        where user_id = '51000000-0000-0000-0000-000000000001'
      )
    $sql$ into v_has_activity_event;
  end if;

  if coalesce(v_has_activity_event, false) then
    raise exception 'Running completion produced an Activity Event side effect';
  end if;
end;
$$;

rollback;
