begin;

insert into auth.users (
  instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('41000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'sr1b2-owner@example.test', '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('42000000-0000-0000-0000-000000000002', '42000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'sr1b2-other@example.test', '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.review_records (
  id, user_id, kind, period_start, period_end, timezone, status
) values
  ('41100000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000001', 'daily', '2026-08-24', '2026-08-24', 'Europe/Berlin', 'draft'),
  ('41100000-0000-0000-0000-000000000002', '41000000-0000-0000-0000-000000000001', 'daily', '2026-08-25', '2026-08-25', 'Europe/Berlin', 'draft'),
  ('41100000-0000-0000-0000-000000000003', '41000000-0000-0000-0000-000000000001', 'daily', '2026-08-26', '2026-08-26', 'Europe/Berlin', 'draft'),
  ('41100000-0000-0000-0000-000000000004', '41000000-0000-0000-0000-000000000001', 'weekly', '2026-08-17', '2026-08-23', 'Europe/Berlin', 'draft'),
  ('41100000-0000-0000-0000-000000000005', '41000000-0000-0000-0000-000000000001', 'daily', '2026-08-27', '2026-08-27', 'Europe/Berlin', 'archived'),
  ('42100000-0000-0000-0000-000000000001', '42000000-0000-0000-0000-000000000002', 'daily', '2026-08-24', '2026-08-24', 'Europe/Berlin', 'draft');

update public.review_records
  set archived_at = now()
  where id = '41100000-0000-0000-0000-000000000005';

insert into public.tasks (id, user_id, title, status, priority) values
  ('42100000-0000-0000-0000-000000000002', '42000000-0000-0000-0000-000000000002', 'SR1B2 foreign task', 'planned', 'P2');

create temporary table sr1b2_links (
  review_id uuid primary key,
  task_id uuid not null
) on commit drop;
grant select, insert on sr1b2_links to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

insert into sr1b2_links (review_id, task_id)
select '41100000-0000-0000-0000-000000000001', (public.schedule_linked_source(
  'review', '41100000-0000-0000-0000-000000000001', '2026-08-24', '2026-08-24T18:00:00+02:00', 30
)).id;

do $$
begin
  if not exists (
    select 1
    from public.schedule_source_links l
    join public.tasks t on t.id = l.task_id and t.user_id = l.user_id
    where l.source_type = 'review'
      and l.source_id = '41100000-0000-0000-0000-000000000001'
      and t.planned_date = '2026-08-24'
      and t.scheduled_start_at = '2026-08-24T16:00:00+00:00'::timestamptz
      and t.status = 'planned'
  ) then
    raise exception 'Daily Review did not receive its Task-only schedule occurrence';
  end if;
end;
$$;

select public.save_daily_review_with_carry_over(
  '2026-08-24', 'Europe/Berlin', 'completed', 'SR1B2 daily outcome',
  array['SR1B2 win'], '{}', '{}', '', '', '{}'
);

do $$
declare
  v_completed_at timestamptz;
begin
  select completed_at into v_completed_at
    from public.review_records where id = '41100000-0000-0000-0000-000000000001';
  if v_completed_at is null then
    raise exception 'Daily Review did not complete';
  end if;
  if not exists (
    select 1 from public.tasks
    where id = (select task_id from sr1b2_links where review_id = '41100000-0000-0000-0000-000000000001')
      and status = 'done' and completed_at = v_completed_at
  ) then
    raise exception 'Daily Review completion did not atomically complete its Task';
  end if;
end;
$$;

reset role;
update public.review_records
  set completed_at = '2026-08-24T19:00:00+00:00'::timestamptz
  where id = '41100000-0000-0000-0000-000000000001';
update public.tasks
  set completed_at = '2026-08-24T19:00:00+00:00'::timestamptz
  where id = (select task_id from sr1b2_links where review_id = '41100000-0000-0000-0000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select public.save_daily_review_with_carry_over(
  '2026-08-24', 'Europe/Berlin', 'completed', 'SR1B2 revised outcome',
  array['SR1B2 revised win'], '{}', '{}', '', '', '{}'
);

do $$
begin
  if (select completed_at from public.review_records where id = '41100000-0000-0000-0000-000000000001')
    <> '2026-08-24T19:00:00+00:00'::timestamptz then
    raise exception 'repeat Daily Review completion changed Review completed_at';
  end if;
  if (select completed_at from public.tasks where id = (select task_id from sr1b2_links where review_id = '41100000-0000-0000-0000-000000000001'))
    <> '2026-08-24T19:00:00+00:00'::timestamptz then
    raise exception 'repeat Daily Review completion changed Task completed_at';
  end if;
  if (select count(*) from public.schedule_source_links where source_type = 'review' and source_id = '41100000-0000-0000-0000-000000000001') <> 1 then
    raise exception 'repeat Daily Review completion created a duplicate link';
  end if;
end;
$$;

select public.complete_linked_task(
  (select task_id from sr1b2_links where review_id = '41100000-0000-0000-0000-000000000001'),
  '2026-08-25T00:00:00+00:00'
);

do $$
begin
  if (select completed_at from public.tasks where id = (select task_id from sr1b2_links where review_id = '41100000-0000-0000-0000-000000000001'))
    <> '2026-08-24T19:00:00+00:00'::timestamptz then
    raise exception 'repeat completed Review Task completion changed Task completed_at';
  end if;
end;
$$;

insert into sr1b2_links (review_id, task_id)
select '41100000-0000-0000-0000-000000000002', (public.schedule_linked_source(
  'review', '41100000-0000-0000-0000-000000000002', '2026-08-25', '2026-08-25T18:00:00+02:00', 30
)).id;

do $$
declare
  v_rejected boolean := false;
begin
  begin
    perform public.complete_linked_task(
      (select task_id from sr1b2_links where review_id = '41100000-0000-0000-0000-000000000002'),
      '2026-08-25T17:00:00+00:00'
    );
  exception when others then
    v_rejected := true;
  end;

  if not v_rejected then
    raise exception 'open Review Task completion was accepted';
  end if;
  if not exists (
    select 1 from public.review_records
    where id = '41100000-0000-0000-0000-000000000002'
      and status = 'draft' and completed_at is null
  ) then
    raise exception 'open Review Task completion fabricated a completed Review';
  end if;
  if not exists (
    select 1 from public.tasks
    where id = (select task_id from sr1b2_links where review_id = '41100000-0000-0000-0000-000000000002')
      and status = 'planned' and completed_at is null
  ) then
    raise exception 'rejected Review Task completion partially mutated the Task';
  end if;
end;
$$;

insert into sr1b2_links (review_id, task_id)
select '41100000-0000-0000-0000-000000000003', (public.schedule_linked_source(
  'review', '41100000-0000-0000-0000-000000000003', '2026-08-26', '2026-08-26T18:00:00+02:00', 30
)).id;

reset role;
update public.tasks
  set archived_at = now()
  where id = (select task_id from sr1b2_links where review_id = '41100000-0000-0000-0000-000000000003');

set local role authenticated;
select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
declare
  v_rejected boolean := false;
begin
  begin
    perform public.save_daily_review_with_carry_over(
      '2026-08-26', 'Europe/Berlin', 'completed', 'SR1B2 rollback', '{}', '{}', '{}', '', '', '{}'
    );
  exception when others then
    v_rejected := true;
  end;

  if not v_rejected then
    raise exception 'unavailable Review Task did not reject Review completion';
  end if;
end;
$$;

reset role;

do $$
begin
  if not exists (
    select 1 from public.review_records
    where id = '41100000-0000-0000-0000-000000000003'
      and status = 'draft' and completed_at is null
  ) then
    raise exception 'failed Review completion partially mutated the Review';
  end if;
  if not exists (
    select 1 from public.tasks
    where id = (select task_id from sr1b2_links where review_id = '41100000-0000-0000-0000-000000000003')
      and status = 'planned' and completed_at is null
  ) then
    raise exception 'failed Review completion partially mutated the Task';
  end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
declare
  v_foreign_review_rejected boolean := false;
  v_foreign_task_rejected boolean := false;
  v_archived_rejected boolean := false;
begin
  begin
    perform public.schedule_linked_source('review', '42100000-0000-0000-0000-000000000001', '2026-08-24', '2026-08-24T19:00:00+02:00', 30);
  exception when others then
    v_foreign_review_rejected := true;
  end;
  begin
    perform public.complete_linked_task('42100000-0000-0000-0000-000000000002', '2026-08-24T17:00:00+00:00');
  exception when others then
    v_foreign_task_rejected := true;
  end;
  begin
    perform public.schedule_linked_source('review', '41100000-0000-0000-0000-000000000005', '2026-08-27', '2026-08-27T18:00:00+02:00', 30);
  exception when others then
    v_archived_rejected := true;
  end;
  if not v_foreign_review_rejected then raise exception 'cross-user Review was accepted'; end if;
  if not v_foreign_task_rejected then raise exception 'cross-user Task was accepted'; end if;
  if not v_archived_rejected then raise exception 'archived Review was scheduled'; end if;
end;
$$;

insert into sr1b2_links (review_id, task_id)
select '41100000-0000-0000-0000-000000000004', (public.schedule_linked_source(
  'review', '41100000-0000-0000-0000-000000000004', '2026-08-23', '2026-08-23T17:00:00+02:00', 45
)).id;

do $$
begin
  if not exists (
    select 1
    from public.schedule_source_links l
    join public.review_records r on r.id = l.source_id and r.user_id = l.user_id
    where l.source_type = 'review'
      and l.source_id = '41100000-0000-0000-0000-000000000004'
      and r.kind = 'weekly'
  ) then
    raise exception 'Weekly Review did not use the canonical Review schedule relation';
  end if;
end;
$$;

reset role;

do $$
begin
  if exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.review_records'::regclass
      and tgname = 'sync_schedule_task_from_review_after_update'
      and not tgisinternal
  ) then
    raise exception 'legacy Review-to-Task trigger remains active';
  end if;
end;
$$;

rollback;
