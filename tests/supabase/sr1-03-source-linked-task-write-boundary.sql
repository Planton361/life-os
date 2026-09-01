begin;

insert into auth.users (
  instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('61000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'sr103-owner@example.test', '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('62000000-0000-0000-0000-000000000002', '62000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'sr103-other@example.test', '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.meals (id, user_id, date, meal_type, title) values
  ('61100000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001', '2026-09-01', 'lunch', 'SR1-03 meal'),
  ('62100000-0000-0000-0000-000000000001', '62000000-0000-0000-0000-000000000002', '2026-09-01', 'lunch', 'SR1-03 foreign meal');

set local role authenticated;
select set_config('request.jwt.claim.sub', '61000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

create temporary table sr103_task_ids (task_id uuid primary key) on commit drop;
grant select, insert on sr103_task_ids to authenticated;

insert into sr103_task_ids (task_id)
select (public.schedule_linked_source(
  'meal',
  '61100000-0000-0000-0000-000000000001',
  '2026-09-02',
  '2026-09-02T12:30:00+02:00',
  30
)).id;

-- The new canonical unschedule operation changes both scheduling projections in one transaction.
select public.unschedule_linked_meal_task(
  (select task_id from sr103_task_ids),
  '2026-09-03',
  45
);

do $$
begin
  if not exists (
    select 1
    from public.tasks t
    join public.meals m on m.id = '61100000-0000-0000-0000-000000000001'
    where t.id = (select task_id from sr103_task_ids)
      and t.planned_date = '2026-09-03'
      and t.scheduled_start_at is null
      and t.duration_minutes = 45
      and m.date = t.planned_date
      and m.planned_at is null
  ) then
    raise exception 'Meal unschedule did not atomically reconcile Meal and Task';
  end if;

  if (select count(*) from public.schedule_source_links where task_id = (select task_id from sr103_task_ids)) <> 1 then
    raise exception 'Meal unschedule removed or duplicated the schedule source link';
  end if;
end;
$$;

-- Repeated schedule/unschedule retains one link and the requested canonical state.
select public.schedule_linked_source(
  'meal',
  '61100000-0000-0000-0000-000000000001',
  '2026-09-04',
  '2026-09-04T13:15:00+02:00',
  60
);
select public.unschedule_linked_meal_task((select task_id from sr103_task_ids));

do $$
begin
  if not exists (
    select 1
    from public.tasks t
    join public.meals m on m.id = '61100000-0000-0000-0000-000000000001'
    where t.id = (select task_id from sr103_task_ids)
      and t.planned_date = '2026-09-04'
      and t.scheduled_start_at is null
      and t.duration_minutes = 60
      and m.date = '2026-09-04'
      and m.planned_at is null
  ) then
    raise exception 'repeat Meal unschedule did not preserve the canonical plan';
  end if;
end;
$$;

-- A foreign task or source cannot enter the transaction.
do $$
declare
  v_foreign_task_rejected boolean := false;
  v_foreign_source_rejected boolean := false;
begin
  begin
    perform public.unschedule_linked_meal_task('62100000-0000-0000-0000-000000000001');
  exception when others then
    v_foreign_task_rejected := true;
  end;

  begin
    perform public.schedule_linked_source(
      'meal',
      '62100000-0000-0000-0000-000000000001',
      '2026-09-04',
      '2026-09-04T12:00:00+02:00',
      30
    );
  exception when others then
    v_foreign_source_rejected := true;
  end;

  if not v_foreign_task_rejected or not v_foreign_source_rejected then
    raise exception 'cross-user task or source was accepted';
  end if;
end;
$$;

-- If the linked domain row is unavailable, the task update rolls back too.
reset role;
delete from public.meals where id = '61100000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub', '61000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
declare
  v_rejected boolean := false;
begin
  begin
    perform public.unschedule_linked_meal_task(
      (select task_id from sr103_task_ids),
      '2026-09-05',
      90
    );
  exception when others then
    v_rejected := true;
  end;

  if not v_rejected then
    raise exception 'unavailable linked Meal was accepted';
  end if;
end;
$$;

reset role;
do $$
begin
  if not exists (
    select 1 from public.tasks
    where id = (select task_id from sr103_task_ids)
      and planned_date = '2026-09-04'
      and scheduled_start_at is null
      and duration_minutes = 60
  ) then
    raise exception 'failed Meal unschedule partially changed the Task';
  end if;

  if exists (
    select 1 from pg_trigger
    where tgrelid = 'public.tasks'::regclass
      and tgname like '%activity%'
      and not tgisinternal
  ) then
    raise exception 'SR1-03 introduced an Activity side effect';
  end if;
end;
$$;

rollback;
