begin;

-- All identities and domain rows below are deterministic synthetic proof data.
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
) values
  (
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'sr1-owner@example.test',
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'sr1-other@example.test',
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  );

insert into public.meals (id, user_id, date, meal_type, title) values
  ('11000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '2026-08-24', 'lunch', 'SR1 owner meal'),
  ('11000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '2026-08-24', 'dinner', 'SR1 spare owner meal'),
  ('21000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '2026-08-24', 'lunch', 'SR1 other meal');

insert into public.review_records (
  id, user_id, kind, period_start, period_end, timezone, status
) values (
  '12000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'daily',
  '2026-08-24',
  '2026-08-24',
  'Europe/Berlin',
  'draft'
);

insert into public.review_records (
  id, user_id, kind, period_start, period_end, timezone, status
) values (
  '22000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002',
  'daily',
  '2026-08-24',
  '2026-08-24',
  'Europe/Berlin',
  'draft'
);

insert into public.running_plans (id, user_id, name, goal) values (
  '13000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'SR1 running plan',
  'Foundation proof'
);

insert into public.running_plan_items (
  id, user_id, plan_id, title, sort_order
) values (
  '13100000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '13000000-0000-0000-0000-000000000001',
  'SR1 running item',
  0
);

insert into public.running_plans (id, user_id, name, goal) values (
  '23000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002',
  'SR1 other running plan',
  'Foundation proof'
);

insert into public.running_plan_items (
  id, user_id, plan_id, title, sort_order
) values (
  '23100000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002',
  '23000000-0000-0000-0000-000000000001',
  'SR1 other running item',
  0
);

insert into public.strength_plans (id, user_id, name, goal) values (
  '14000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'SR1 strength plan',
  'Foundation proof'
);

insert into public.strength_plans (id, user_id, name, goal) values (
  '24000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002',
  'SR1 other strength plan',
  'Foundation proof'
);

insert into public.tasks (id, user_id, title, status, priority) values (
  '22000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000002',
  'SR1 other task',
  'planned',
  'P2'
);

create temporary table sr1_created_tasks (
  source_type text primary key,
  task_id uuid not null
) on commit drop;
grant select, insert on sr1_created_tasks to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

insert into sr1_created_tasks (source_type, task_id)
select 'meal', (public.schedule_linked_source(
  'meal',
  '11000000-0000-0000-0000-000000000001',
  '2026-08-24',
  '2026-08-24T12:00:00+02:00',
  30
)).id;

insert into sr1_created_tasks (source_type, task_id)
select 'review', (public.schedule_linked_source(
  'review',
  '12000000-0000-0000-0000-000000000001',
  '2026-08-24',
  '2026-08-24T18:00:00+02:00',
  30
)).id;

insert into sr1_created_tasks (source_type, task_id)
select 'running_plan_item', (public.schedule_linked_source(
  'running_plan_item',
  '13100000-0000-0000-0000-000000000001',
  '2026-08-25',
  '2026-08-25T08:00:00+02:00',
  45
)).id;

insert into sr1_created_tasks (source_type, task_id)
select 'strength_plan', (public.schedule_linked_source(
  'strength_plan',
  '14000000-0000-0000-0000-000000000001',
  '2026-08-25',
  '2026-08-25T17:00:00+02:00',
  60
)).id;

do $$
declare
  v_task_id uuid;
begin
  select (public.schedule_linked_source(
    'meal',
    '11000000-0000-0000-0000-000000000001',
    '2026-08-24',
    '2026-08-24T12:00:00+02:00',
    30
  )).id into v_task_id;

  if v_task_id <> (select task_id from sr1_created_tasks where source_type = 'meal') then
    raise exception 'idempotent meal scheduling returned a different task';
  end if;

  if (select count(*) from public.schedule_source_links) <> 4 then
    raise exception 'expected one canonical link for each source type';
  end if;
end;
$$;

do $$
begin
  begin
    perform public.schedule_linked_source(
      'unknown',
      '11000000-0000-0000-0000-000000000001',
      '2026-08-24',
      '2026-08-24T12:00:00+02:00',
      30
    );
  exception when others then
    return;
  end;
  raise exception 'unknown source type was accepted';
end;
$$;

do $$
begin
  begin
    perform public.schedule_linked_source(
      'meal',
      '19999999-0000-0000-0000-000000000001',
      '2026-08-24',
      '2026-08-24T12:00:00+02:00',
      30
    );
  exception when others then
    return;
  end;
  raise exception 'missing source was accepted';
end;
$$;

do $$
declare
  v_source_type text;
  v_source_id uuid;
begin
  for v_source_type, v_source_id in
    select sources.source_type, sources.source_id
    from (
      values
        ('meal'::text, '21000000-0000-0000-0000-000000000002'::uuid),
        ('review'::text, '22000000-0000-0000-0000-000000000001'::uuid),
        ('running_plan_item'::text, '23100000-0000-0000-0000-000000000001'::uuid),
        ('strength_plan'::text, '24000000-0000-0000-0000-000000000001'::uuid)
    ) as sources(source_type, source_id)
  loop
    begin
      perform public.schedule_linked_source(
        v_source_type,
        v_source_id,
        '2026-08-24',
        '2026-08-24T12:00:00+02:00',
        30
      );
    exception when others then
      continue;
    end;
    raise exception 'foreign schedule source was accepted for %', v_source_type;
  end loop;
end;
$$;

do $$
declare
  v_denied boolean := false;
begin
  begin
    insert into public.schedule_source_links (user_id, source_type, source_id, task_id)
    values (
      '10000000-0000-0000-0000-000000000001',
      'meal',
      '11000000-0000-0000-0000-000000000002',
      (select task_id from sr1_created_tasks where source_type = 'meal')
    );
  exception when insufficient_privilege then
    v_denied := true;
  end;

  if not v_denied then
    raise exception 'authenticated direct schedule source mutation was not denied';
  end if;
end;
$$;

reset role;

do $$
begin
  begin
    insert into public.schedule_source_links (user_id, source_type, source_id, task_id)
    values (
      '10000000-0000-0000-0000-000000000001',
      'meal',
      '11000000-0000-0000-0000-000000000001',
      (select task_id from sr1_created_tasks where source_type = 'review')
    );
  exception when unique_violation then
    return;
  end;
  raise exception 'one source was linked to two tasks';
end;
$$;

do $$
begin
  begin
    insert into public.schedule_source_links (user_id, source_type, source_id, task_id)
    values (
      '10000000-0000-0000-0000-000000000001',
      'meal',
      '11000000-0000-0000-0000-000000000002',
      (select task_id from sr1_created_tasks where source_type = 'meal')
    );
  exception when unique_violation then
    return;
  end;
  raise exception 'one task was linked to two sources';
end;
$$;

do $$
begin
  begin
    insert into public.schedule_source_links (user_id, source_type, source_id, task_id)
    values (
      '10000000-0000-0000-0000-000000000001',
      'meal',
      '11000000-0000-0000-0000-000000000002',
      '22000000-0000-0000-0000-000000000002'
    );
  exception when foreign_key_violation then
    return;
  end;
  raise exception 'foreign task was accepted by the composite ownership key';
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
begin
  if exists (select 1 from public.schedule_source_links) then
    raise exception 'RLS exposed another user schedule source links';
  end if;
end;
$$;

rollback;
