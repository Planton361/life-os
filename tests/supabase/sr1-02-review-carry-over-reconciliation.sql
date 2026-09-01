begin;

insert into auth.users (
  instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('52000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'sr102-owner@example.test', '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('53000000-0000-0000-0000-000000000002', '53000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'sr102-other@example.test', '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.tasks (id, user_id, title, status, priority, planned_date, scheduled_start_at) values
  ('52100000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', 'SR1-02 A', 'planned', 'P2', '2026-08-31', '2026-08-31T08:00:00+00:00'),
  ('52100000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-000000000001', 'SR1-02 B', 'planned', 'P2', null, null),
  ('52100000-0000-0000-0000-000000000003', '52000000-0000-0000-0000-000000000001', 'SR1-02 C', 'planned', 'P2', '2026-09-02', null),
  ('52100000-0000-0000-0000-000000000004', '52000000-0000-0000-0000-000000000001', 'SR1-02 D', 'planned', 'P2', '2026-08-29', '2026-08-29T10:00:00+00:00'),
  ('52100000-0000-0000-0000-000000000005', '52000000-0000-0000-0000-000000000001', 'SR1-02 E', 'planned', 'P2', '2026-08-28', null),
  ('53100000-0000-0000-0000-000000000001', '53000000-0000-0000-0000-000000000002', 'SR1-02 foreign', 'planned', 'P2', '2026-08-28', null),
  ('52100000-0000-0000-0000-000000000006', '52000000-0000-0000-0000-000000000001', 'SR1-02 archived', 'planned', 'P2', '2026-08-28', null);

update public.tasks set archived_at = now() where id = '52100000-0000-0000-0000-000000000006';

set local role authenticated;
select set_config('request.jwt.claim.sub', '52000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- First save: A and B are exactly the active decision set, with snapshots.
select public.save_daily_review_with_carry_over(
  '2026-09-01', 'Europe/Berlin', 'draft', 'SR1-02 first', '{}', '{}', '{}', '', '',
  array['52100000-0000-0000-0000-000000000001', '52100000-0000-0000-0000-000000000002']::uuid[]
);

do $$
begin
  if (select count(*) from public.review_task_decisions where user_id = '52000000-0000-0000-0000-000000000001') <> 2 then
    raise exception 'first carry-over save did not create exactly two decisions';
  end if;
  if not exists (
    select 1 from public.review_task_decisions
    where task_id = '52100000-0000-0000-0000-000000000001'
      and original_planned_date = '2026-08-31'
      and original_scheduled_start_at = '2026-08-31T08:00:00+00:00'::timestamptz
      and planning_snapshot_captured
  ) then raise exception 'A snapshot was not captured'; end if;
  if (select count(*) from public.tasks
      where id in ('52100000-0000-0000-0000-000000000001', '52100000-0000-0000-0000-000000000002')
        and planned_date = '2026-09-02' and scheduled_start_at is null) <> 2 then
    raise exception 'first carry-over did not apply the canonical plan';
  end if;
end;
$$;

-- Same selection is idempotent, including duplicate input normalization.
create temporary table sr102_snapshot as
  select task_id, original_planned_date, original_scheduled_start_at, planning_snapshot_captured
  from public.review_task_decisions;
select public.save_daily_review_with_carry_over(
  '2026-09-01', 'Europe/Berlin', 'draft', 'SR1-02 repeat', '{}', '{}', '{}', '', '',
  array['52100000-0000-0000-0000-000000000002', '52100000-0000-0000-0000-000000000001', '52100000-0000-0000-0000-000000000001']::uuid[]
);
do $$
begin
  if (select count(*) from public.review_task_decisions where user_id = '52000000-0000-0000-0000-000000000001') <> 2
    or exists ((select * from sr102_snapshot) except (select task_id, original_planned_date, original_scheduled_start_at, planning_snapshot_captured from public.review_task_decisions)) then
    raise exception 'repeat carry-over save was not idempotent';
  end if;
end;
$$;

-- Change selection from A/B to B/C: A restores, B remains, C is newly applied.
select public.save_daily_review_with_carry_over(
  '2026-09-01', 'Europe/Berlin', 'draft', 'SR1-02 reconcile', '{}', '{}', '{}', '', '',
  array['52100000-0000-0000-0000-000000000002', '52100000-0000-0000-0000-000000000003']::uuid[]
);
do $$
begin
  if exists (select 1 from public.review_task_decisions where task_id = '52100000-0000-0000-0000-000000000001')
    or (select count(*) from public.review_task_decisions where task_id in ('52100000-0000-0000-0000-000000000002', '52100000-0000-0000-0000-000000000003')) <> 2 then
    raise exception 'carry-over decisions were not reconciled exactly to B and C';
  end if;
  if not exists (select 1 from public.tasks where id = '52100000-0000-0000-0000-000000000001' and planned_date = '2026-08-31' and scheduled_start_at = '2026-08-31T08:00:00+00:00'::timestamptz) then
    raise exception 'A was not safely restored';
  end if;
end;
$$;

-- D restores its original plan when untouched after carry-over.
select public.save_daily_review_with_carry_over('2026-09-03', 'Europe/Berlin', 'draft', 'SR1-02 D apply', '{}', '{}', '{}', '', '', array['52100000-0000-0000-0000-000000000004']::uuid[]);
select public.save_daily_review_with_carry_over('2026-09-03', 'Europe/Berlin', 'draft', 'SR1-02 D remove', '{}', '{}', '{}', '', '', '{}'::uuid[]);
do $$ begin
  if not exists (select 1 from public.tasks where id = '52100000-0000-0000-0000-000000000004' and planned_date = '2026-08-29' and scheduled_start_at = '2026-08-29T10:00:00+00:00'::timestamptz) then
    raise exception 'untouched carry-over did not restore D';
  end if;
end $$;

-- A newer legitimate task-planning write is never overwritten by deselection.
select public.save_daily_review_with_carry_over('2026-09-04', 'Europe/Berlin', 'draft', 'SR1-02 E apply', '{}', '{}', '{}', '', '', array['52100000-0000-0000-0000-000000000005']::uuid[]);
update public.tasks set planned_date = '2026-09-08', scheduled_start_at = '2026-09-08T13:00:00+00:00' where id = '52100000-0000-0000-0000-000000000005';
select public.save_daily_review_with_carry_over('2026-09-04', 'Europe/Berlin', 'draft', 'SR1-02 E remove', '{}', '{}', '{}', '', '', '{}'::uuid[]);
do $$ begin
  if not exists (select 1 from public.tasks where id = '52100000-0000-0000-0000-000000000005' and planned_date = '2026-09-08' and scheduled_start_at = '2026-09-08T13:00:00+00:00'::timestamptz)
    or exists (select 1 from public.review_task_decisions where task_id = '52100000-0000-0000-0000-000000000005') then
    raise exception 'newer task planning was overwritten or E decision remained';
  end if;
end $$;

-- Invalid input, including an archived or foreign task, rolls back the whole save.
create temporary table sr102_rollback_before as
  select outcome, planned_date, scheduled_start_at, (select count(*) from public.review_task_decisions) as decision_count
  from public.review_records r cross join lateral (select planned_date, scheduled_start_at from public.tasks where id = '52100000-0000-0000-0000-000000000003') t
  where r.user_id = '52000000-0000-0000-0000-000000000001' and r.kind = 'daily' and r.period_start = '2026-09-01';
do $$
declare v_rejected boolean := false;
begin
  begin
    perform public.save_daily_review_with_carry_over('2026-09-01', 'Europe/Berlin', 'draft', 'must rollback', '{}', '{}', '{}', '', '', array['52100000-0000-0000-0000-000000000003', '53100000-0000-0000-0000-000000000001']::uuid[]);
  exception when others then v_rejected := true;
  end;
  if not v_rejected then raise exception 'foreign carry-over task was accepted'; end if;
end $$;
do $$ begin
  if exists ((select outcome, planned_date, scheduled_start_at, decision_count from sr102_rollback_before) except (select r.outcome, t.planned_date, t.scheduled_start_at, (select count(*) from public.review_task_decisions) from public.review_records r cross join lateral (select planned_date, scheduled_start_at from public.tasks where id = '52100000-0000-0000-0000-000000000003') t where r.user_id = '52000000-0000-0000-0000-000000000001' and r.kind = 'daily' and r.period_start = '2026-09-01')) then
    raise exception 'foreign carry-over rejection partially mutated review, decisions, or tasks';
  end if;
end $$;
do $$
declare v_archived_rejected boolean := false;
begin
  begin
    perform public.save_daily_review_with_carry_over('2026-09-05', 'Europe/Berlin', 'draft', 'archived', '{}', '{}', '{}', '', '', array['52100000-0000-0000-0000-000000000006']::uuid[]);
  exception when others then v_archived_rejected := true;
  end;
  if not v_archived_rejected then raise exception 'archived carry-over task was accepted'; end if;
end $$;

do $$
declare v_missing_rejected boolean := false;
begin
  begin
    perform public.save_daily_review_with_carry_over('2026-09-06', 'Europe/Berlin', 'draft', 'missing', '{}', '{}', '{}', '', '', array['52100000-0000-0000-0000-000000000099']::uuid[]);
  exception when others then v_missing_rejected := true;
  end;
  if not v_missing_rejected
    or exists (
      select 1 from public.review_records
      where user_id = '52000000-0000-0000-0000-000000000001'
        and kind = 'daily'
        and period_start = '2026-09-06'
    ) then
    raise exception 'missing carry-over task was not atomically rejected';
  end if;
end $$;

do $$
declare v_null_rejected boolean := false;
begin
  begin
    perform public.save_daily_review_with_carry_over('2026-09-07', 'Europe/Berlin', 'draft', 'null', '{}', '{}', '{}', '', '', array[null]::uuid[]);
  exception when others then v_null_rejected := true;
  end;
  if not v_null_rejected then raise exception 'null carry-over task id was accepted'; end if;
end $$;

reset role;

do $$ begin
  if exists (select 1 from pg_trigger where tgrelid = 'public.tasks'::regclass and tgname like '%activity%' and not tgisinternal) then
    raise exception 'carry-over introduced an Activity trigger';
  end if;
  if exists (select 1 from public.review_task_decisions d join public.review_records r on r.id = d.review_id where r.kind = 'weekly') then
    raise exception 'daily carry-over mutated Weekly Review decisions';
  end if;
end $$;

rollback;
