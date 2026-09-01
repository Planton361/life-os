alter table public.review_task_decisions
  add column original_planned_date date,
  add column original_scheduled_start_at timestamptz,
  add column planning_snapshot_captured boolean not null default false;

create or replace function public.save_daily_review_with_carry_over(
  p_period_start date,
  p_timezone text,
  p_status public.review_record_status,
  p_outcome text,
  p_wins text[],
  p_blockers text[],
  p_open_loops text[],
  p_next_period_focus text,
  p_planning_note text,
  p_carry_task_ids uuid[]
)
returns public.review_records
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_carry_ids uuid[];
  v_owned_count integer;
  v_saved public.review_records;
  v_target_date date := p_period_start + 1;
  v_decision public.review_task_decisions;
  v_task public.tasks;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  select coalesce(array_agg(distinct input.task_id order by input.task_id), '{}'::uuid[])
    into v_carry_ids
    from unnest(coalesce(p_carry_task_ids, '{}'::uuid[])) as input(task_id)
    where input.task_id is not null;

  if array_position(coalesce(p_carry_task_ids, '{}'::uuid[]), null) is not null then
    raise exception 'carry-over task ids must be valid';
  end if;

  select count(*)
    into v_owned_count
    from public.tasks
    where tasks.user_id = v_user_id
      and tasks.id = any(v_carry_ids)
      and tasks.archived_at is null
      and tasks.status not in ('done', 'canceled', 'archived');

  if v_owned_count <> cardinality(v_carry_ids) then
    raise exception 'one or more carry-over tasks are unavailable';
  end if;

  v_saved := public.save_review_record(
    'daily', p_period_start, p_period_start, p_timezone, p_status, p_outcome,
    p_wins, p_blockers, p_open_loops, p_next_period_focus, p_planning_note
  );

  for v_decision in
    select *
      from public.review_task_decisions
      where review_task_decisions.user_id = v_user_id
        and review_task_decisions.review_id = v_saved.id
        and review_task_decisions.decision = 'carry_forward'
      for update
  loop
    if not (v_decision.task_id = any(v_carry_ids)) then
      select *
        into v_task
        from public.tasks
        where tasks.id = v_decision.task_id
          and tasks.user_id = v_user_id
        for update;

      if v_task.id is not null
        and v_decision.planning_snapshot_captured
        and v_task.archived_at is null
        and v_task.status not in ('done', 'canceled', 'archived')
        and v_task.planned_date is not distinct from v_decision.target_date
        and v_task.scheduled_start_at is null then
        update public.tasks
          set planned_date = v_decision.original_planned_date,
              scheduled_start_at = v_decision.original_scheduled_start_at,
              updated_at = now()
          where tasks.id = v_decision.task_id
            and tasks.user_id = v_user_id;
      end if;

      delete from public.review_task_decisions
        where review_task_decisions.id = v_decision.id
          and review_task_decisions.user_id = v_user_id;
    end if;
  end loop;

  for v_task in
    select *
      from public.tasks
      where tasks.user_id = v_user_id
        and tasks.id = any(v_carry_ids)
        and tasks.archived_at is null
        and tasks.status not in ('done', 'canceled', 'archived')
      for update
  loop
    if not exists (
      select 1
        from public.review_task_decisions
        where review_task_decisions.user_id = v_user_id
          and review_task_decisions.review_id = v_saved.id
          and review_task_decisions.task_id = v_task.id
          and review_task_decisions.decision = 'carry_forward'
    ) then
      update public.tasks
        set planned_date = v_target_date,
            scheduled_start_at = null,
            updated_at = now()
        where tasks.id = v_task.id
          and tasks.user_id = v_user_id;

      insert into public.review_task_decisions (
        user_id,
        review_id,
        task_id,
        decision,
        target_date,
        original_planned_date,
        original_scheduled_start_at,
        planning_snapshot_captured
      ) values (
        v_user_id,
        v_saved.id,
        v_task.id,
        'carry_forward',
        v_target_date,
        v_task.planned_date,
        v_task.scheduled_start_at,
        true
      );
    end if;
  end loop;

  return v_saved;
end;
$$;

revoke all on function public.save_daily_review_with_carry_over(
  date, text, public.review_record_status, text, text[], text[], text[], text,
  text, uuid[]
) from public;
revoke all on function public.save_daily_review_with_carry_over(
  date, text, public.review_record_status, text, text[], text[], text[], text,
  text, uuid[]
) from anon;
grant execute on function public.save_daily_review_with_carry_over(
  date, text, public.review_record_status, text, text[], text[], text[], text,
  text, uuid[]
) to authenticated;
