begin;

insert into auth.users (
  instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('31000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'sr1b-owner@example.test', '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('32000000-0000-0000-0000-000000000002', '32000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'sr1b-other@example.test', '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.recipes (id, user_id, title) values
  ('31100000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', 'SR1B unchanged recipe');

insert into public.meals (id, user_id, recipe_id, date, meal_type, title, planned_at) values
  ('31200000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', '31100000-0000-0000-0000-000000000001', '2026-08-24', 'lunch', 'SR1B meal completes task', '2026-08-24T12:00:00+02:00'),
  ('31200000-0000-0000-0000-000000000002', '31000000-0000-0000-0000-000000000001', '31100000-0000-0000-0000-000000000001', '2026-08-24', 'dinner', 'SR1B task completes meal', '2026-08-24T18:00:00+02:00'),
  ('31200000-0000-0000-0000-000000000003', '31000000-0000-0000-0000-000000000001', '31100000-0000-0000-0000-000000000001', '2026-08-24', 'snack', 'SR1B rollback meal', '2026-08-24T15:00:00+02:00'),
  ('32200000-0000-0000-0000-000000000001', '32000000-0000-0000-0000-000000000002', null, '2026-08-24', 'lunch', 'SR1B foreign meal', '2026-08-24T12:00:00+02:00');

insert into public.tasks (id, user_id, title, status, priority) values
  ('32100000-0000-0000-0000-000000000001', '32000000-0000-0000-0000-000000000002', 'SR1B foreign task', 'planned', 'P2');

create temporary table sr1b_tasks (
  meal_id uuid primary key,
  task_id uuid not null
) on commit drop;
grant select, insert on sr1b_tasks to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub', '31000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

insert into sr1b_tasks (meal_id, task_id)
select '31200000-0000-0000-0000-000000000001', (public.schedule_linked_source(
  'meal', '31200000-0000-0000-0000-000000000001', '2026-08-25', '2026-08-25T12:30:00+02:00', 35
)).id;

do $$
declare
  v_task_id uuid := (select task_id from sr1b_tasks where meal_id = '31200000-0000-0000-0000-000000000001');
begin
  if not exists (
    select 1
    from public.tasks t
    join public.meals m on m.id = '31200000-0000-0000-0000-000000000001'
    where t.id = v_task_id
      and t.user_id = m.user_id
      and t.planned_date = m.date
      and t.scheduled_start_at = m.planned_at
      and t.duration_minutes = 35
  ) then
    raise exception 'initial Meal and Task schedule projections differ';
  end if;
end;
$$;

select public.schedule_linked_source(
  'meal', '31200000-0000-0000-0000-000000000001', '2026-08-26', '2026-08-26T13:15:00+02:00', 45
);

do $$
declare
  v_task_id uuid := (select task_id from sr1b_tasks where meal_id = '31200000-0000-0000-0000-000000000001');
begin
  if (select count(*) from public.schedule_source_links where source_type = 'meal' and source_id = '31200000-0000-0000-0000-000000000001') <> 1 then
    raise exception 'reschedule created a duplicate Meal schedule link';
  end if;

  if not exists (
    select 1
    from public.tasks t
    join public.meals m on m.id = '31200000-0000-0000-0000-000000000001'
    where t.id = v_task_id
      and t.planned_date = '2026-08-26'
      and m.date = '2026-08-26'
      and t.scheduled_start_at = '2026-08-26T11:15:00+00:00'::timestamptz
      and m.planned_at = t.scheduled_start_at
      and t.duration_minutes = 45
  ) then
    raise exception 'rescheduled Meal and Task projections differ';
  end if;
end;
$$;

insert into sr1b_tasks (meal_id, task_id)
select '31200000-0000-0000-0000-000000000002', (public.schedule_linked_source(
  'meal', '31200000-0000-0000-0000-000000000002', '2026-08-25', '2026-08-25T18:30:00+02:00', 30
)).id;

insert into sr1b_tasks (meal_id, task_id)
select '31200000-0000-0000-0000-000000000003', (public.schedule_linked_source(
  'meal', '31200000-0000-0000-0000-000000000003', '2026-08-25', '2026-08-25T15:30:00+02:00', 15
)).id;

select public.complete_linked_meal('31200000-0000-0000-0000-000000000001', '2026-08-26T12:00:00+00:00');

do $$
declare
  v_completed_at timestamptz;
begin
  select completed_at into v_completed_at from public.meals where id = '31200000-0000-0000-0000-000000000001';
  if v_completed_at <> '2026-08-26T12:00:00+00:00'::timestamptz then
    raise exception 'Meal completion did not retain the requested time';
  end if;
  if not exists (
    select 1 from public.tasks
    where id = (select task_id from sr1b_tasks where meal_id = '31200000-0000-0000-0000-000000000001')
      and status = 'done' and completed_at = v_completed_at
  ) then
    raise exception 'Meal completion did not atomically complete its Task';
  end if;
end;
$$;

select public.complete_linked_task(
  (select task_id from sr1b_tasks where meal_id = '31200000-0000-0000-0000-000000000002'),
  '2026-08-26T13:00:00+00:00'
);

do $$
begin
  if not exists (
    select 1 from public.meals
    where id = '31200000-0000-0000-0000-000000000002'
      and completed_at = '2026-08-26T13:00:00+00:00'::timestamptz
  ) then
    raise exception 'Task completion did not atomically complete its Meal';
  end if;
end;
$$;

select public.complete_linked_meal('31200000-0000-0000-0000-000000000001', '2026-08-27T12:00:00+00:00');

do $$
begin
  if (select completed_at from public.meals where id = '31200000-0000-0000-0000-000000000001') <> '2026-08-26T12:00:00+00:00'::timestamptz then
    raise exception 'repeat Meal completion changed a completed Meal';
  end if;
  if (select completed_at from public.tasks where id = (select task_id from sr1b_tasks where meal_id = '31200000-0000-0000-0000-000000000001')) <> '2026-08-26T12:00:00+00:00'::timestamptz then
    raise exception 'repeat Meal completion changed a completed Task';
  end if;
end;
$$;

select public.schedule_linked_source(
  'meal', '31200000-0000-0000-0000-000000000001', '2026-08-27', '2026-08-27T14:00:00+02:00', 45
);

do $$
begin
  if not exists (
    select 1
    from public.meals m
    join public.tasks t on t.id = (select task_id from sr1b_tasks where meal_id = m.id)
    where m.id = '31200000-0000-0000-0000-000000000001'
      and m.date = '2026-08-27'
      and m.planned_at = '2026-08-27T12:00:00+00:00'::timestamptz
      and t.planned_date = m.date
      and t.scheduled_start_at = m.planned_at
      and t.status = 'done'
      and t.completed_at = '2026-08-26T12:00:00+00:00'::timestamptz
  ) then
    raise exception 'rescheduling a completed Meal broke canonical completion consistency';
  end if;
end;
$$;

do $$
declare
  v_foreign_meal_rejected boolean := false;
  v_foreign_meal_completion_rejected boolean := false;
  v_foreign_task_rejected boolean := false;
begin
  begin
    perform public.schedule_linked_source('meal', '32200000-0000-0000-0000-000000000001', '2026-08-25', '2026-08-25T12:00:00+02:00', 30);
  exception when others then
    v_foreign_meal_rejected := true;
  end;

  begin
    perform public.complete_linked_meal('32200000-0000-0000-0000-000000000001', '2026-08-26T13:00:00+00:00');
  exception when others then
    v_foreign_meal_completion_rejected := true;
  end;

  begin
    perform public.complete_linked_task('32100000-0000-0000-0000-000000000001', '2026-08-26T13:00:00+00:00');
  exception when others then
    v_foreign_task_rejected := true;
  end;

  if not v_foreign_meal_rejected then
    raise exception 'cross-user Meal source was accepted';
  end if;
  if not v_foreign_meal_completion_rejected then
    raise exception 'cross-user Meal completion was accepted';
  end if;
  if not v_foreign_task_rejected then
    raise exception 'cross-user Task was accepted';
  end if;
end;
$$;

reset role;
update public.tasks
  set archived_at = now()
  where id = (select task_id from sr1b_tasks where meal_id = '31200000-0000-0000-0000-000000000003');

set local role authenticated;
select set_config('request.jwt.claim.sub', '31000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
declare
  v_unavailable_task_rejected boolean := false;
  v_unavailable_completion_rejected boolean := false;
begin
  begin
    perform public.schedule_linked_source('meal', '31200000-0000-0000-0000-000000000003', '2026-08-27', '2026-08-27T16:00:00+02:00', 60);
  exception when others then
    v_unavailable_task_rejected := true;
  end;

  if not v_unavailable_task_rejected then
    raise exception 'unavailable linked Task did not reject reschedule';
  end if;

  begin
    perform public.complete_linked_meal('31200000-0000-0000-0000-000000000003', '2026-08-27T14:00:00+00:00');
  exception when others then
    v_unavailable_completion_rejected := true;
  end;

  if not v_unavailable_completion_rejected then
    raise exception 'unavailable linked Task did not roll back Meal completion';
  end if;
end;
$$;

reset role;

do $$
begin
  if not exists (
    select 1 from public.meals
    where id = '31200000-0000-0000-0000-000000000003'
      and date = '2026-08-25'
      and planned_at = '2026-08-25T13:30:00+00:00'::timestamptz
      and completed_at is null
  ) then
    raise exception 'failed coupled operation partially changed the Meal';
  end if;
  if not exists (
    select 1
    from public.tasks
    where id = (select task_id from sr1b_tasks where meal_id = '31200000-0000-0000-0000-000000000003')
      and planned_date = '2026-08-25'
      and scheduled_start_at = '2026-08-25T13:30:00+00:00'::timestamptz
      and status = 'planned'
      and completed_at is null
  ) then
    raise exception 'failed coupled operation partially changed the Task';
  end if;
  if (select count(*) from public.schedule_source_links where source_type = 'meal') <> 3 then
    raise exception 'Meal schedule proof created an orphan or duplicate link';
  end if;
  if not exists (
    select 1 from public.recipes
    where id = '31100000-0000-0000-0000-000000000001'
      and title = 'SR1B unchanged recipe'
  ) then
    raise exception 'Meal scheduling or completion modified Recipe data';
  end if;
  if exists (
    select 1
    from pg_trigger
    where tgrelid in ('public.meals'::regclass, 'public.tasks'::regclass)
      and tgname in ('sync_schedule_task_from_meal_after_update', 'sync_meal_schedule_from_task_after_update')
      and not tgisinternal
  ) then
    raise exception 'legacy Meal synchronization trigger remains active';
  end if;
end;
$$;

rollback;
