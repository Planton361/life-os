-- SR1-01A establishes only the canonical Schedule Source link foundation.
-- Completion and cross-domain reschedule synchronization deliberately remain
-- outside this migration's scope.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tasks_user_id_id_unique'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_user_id_id_unique unique (user_id, id);
  end if;
end
$$;

alter table public.schedule_source_links
  drop constraint if exists schedule_source_links_task_id_fkey,
  drop constraint if exists schedule_source_links_source_type_check,
  drop constraint if exists schedule_source_links_user_id_source_type_source_id_key,
  drop constraint if exists schedule_source_links_user_id_task_id_key;

alter table public.schedule_source_links
  add constraint schedule_source_links_source_type_check
    check (source_type in ('meal', 'review', 'running_plan_item', 'strength_plan')),
  add constraint schedule_source_links_user_source_unique
    unique (user_id, source_type, source_id),
  add constraint schedule_source_links_user_task_unique
    unique (user_id, task_id),
  add constraint schedule_source_links_task_owner_fkey
    foreign key (user_id, task_id)
    references public.tasks (user_id, id)
    on delete cascade;

comment on table public.schedule_source_links is
  'Canonical, user-owned bridge from one supported Domain Record to one executable Task Occurrence. source_id is polymorphic only within the explicit source_type contract.';
comment on column public.schedule_source_links.source_type is
  'Exactly one of meal, review, running_plan_item or strength_plan.';
comment on column public.schedule_source_links.source_id is
  'Owned source identifier validated by schedule_linked_source for its explicit source_type.';

alter table public.schedule_source_links enable row level security;

drop policy if exists "schedule_source_links_select_own" on public.schedule_source_links;
drop policy if exists "schedule_source_links_insert_own" on public.schedule_source_links;
drop policy if exists "schedule_source_links_update_own" on public.schedule_source_links;
drop policy if exists "schedule_source_links_delete_own" on public.schedule_source_links;

create policy "schedule_source_links_select_own"
on public.schedule_source_links for select
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.schedule_source_links from anon, authenticated;
grant select on table public.schedule_source_links to authenticated;

create or replace function public.schedule_linked_source(
  p_source_type text,
  p_source_id uuid,
  p_planned_date date,
  p_scheduled_start_at timestamptz,
  p_duration_minutes integer
)
returns public.tasks
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_title text;
  v_task_id uuid;
  v_task public.tasks;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_source_type not in ('meal', 'review', 'running_plan_item', 'strength_plan') then
    raise exception 'unsupported schedule source type';
  end if;

  if p_source_id is null then
    raise exception 'schedule source is required';
  end if;

  if p_planned_date is null or p_scheduled_start_at is null then
    raise exception 'planned date and scheduled start are required';
  end if;

  if p_duration_minutes is null or p_duration_minutes < 1 or p_duration_minutes > 1440 then
    raise exception 'invalid schedule duration';
  end if;

  if p_source_type = 'meal' then
    select meals.title
      into v_title
      from public.meals
      where meals.id = p_source_id
        and meals.user_id = v_user_id;
  elsif p_source_type = 'review' then
    select case review_records.kind when 'daily' then 'Daily Review' else 'Weekly Review' end
      into v_title
      from public.review_records
      where review_records.id = p_source_id
        and review_records.user_id = v_user_id
        and review_records.archived_at is null
        and review_records.status <> 'archived';
  elsif p_source_type = 'running_plan_item' then
    select 'Run: ' || running_plan_items.title
      into v_title
      from public.running_plan_items
      join public.running_plans
        on running_plans.id = running_plan_items.plan_id
       and running_plans.user_id = running_plan_items.user_id
      where running_plan_items.id = p_source_id
        and running_plan_items.user_id = v_user_id
        and running_plan_items.archived_at is null
        and running_plans.archived_at is null;
  else
    select 'Strength: ' || strength_plans.name
      into v_title
      from public.strength_plans
      where strength_plans.id = p_source_id
        and strength_plans.user_id = v_user_id
        and strength_plans.archived_at is null;
  end if;

  if v_title is null then
    raise exception 'schedule source not found or inactive';
  end if;

  -- Serialize the one supported polymorphic identity before looking up or
  -- creating its link. A hash collision can only serialize unrelated writes.
  perform pg_advisory_xact_lock(
    hashtextextended(p_source_type || ':' || p_source_id::text, 0)
  );

  select schedule_source_links.task_id
    into v_task_id
    from public.schedule_source_links
    where schedule_source_links.user_id = v_user_id
      and schedule_source_links.source_type = p_source_type
      and schedule_source_links.source_id = p_source_id
    for update;

  if v_task_id is null then
    insert into public.tasks (
      user_id,
      title,
      status,
      priority,
      planned_date,
      scheduled_start_at,
      duration_minutes
    ) values (
      v_user_id,
      v_title,
      'planned',
      'none',
      p_planned_date,
      p_scheduled_start_at,
      p_duration_minutes
    )
    returning id into v_task_id;

    insert into public.schedule_source_links (
      user_id,
      source_type,
      source_id,
      task_id
    ) values (
      v_user_id,
      p_source_type,
      p_source_id,
      v_task_id
    );
  else
    update public.tasks
      set title = v_title,
          status = 'planned',
          completed_at = null,
          planned_date = p_planned_date,
          scheduled_start_at = p_scheduled_start_at,
          duration_minutes = p_duration_minutes,
          updated_at = now()
      where tasks.id = v_task_id
        and tasks.user_id = v_user_id
        and tasks.archived_at is null
        and tasks.status <> 'archived'
      returning * into v_task;

    if v_task.id is null then
      raise exception 'linked task is unavailable';
    end if;

    return v_task;
  end if;

  select *
    into v_task
    from public.tasks
    where tasks.id = v_task_id
      and tasks.user_id = v_user_id;

  if v_task.id is null then
    raise exception 'linked task is unavailable';
  end if;

  return v_task;
end;
$$;

revoke all on function public.schedule_linked_source(text, uuid, date, timestamptz, integer)
  from public, anon;
grant execute on function public.schedule_linked_source(text, uuid, date, timestamptz, integer)
  to authenticated;
