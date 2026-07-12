create table public.schedule_source_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('meal', 'review')),
  source_id uuid not null,
  task_id uuid not null references public.tasks(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source_type, source_id),
  unique (user_id, task_id)
);

create index schedule_source_links_task_id_idx
  on public.schedule_source_links (task_id);

alter table public.schedule_source_links enable row level security;

create policy "schedule_source_links_select_own"
  on public.schedule_source_links for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "schedule_source_links_insert_own"
  on public.schedule_source_links for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "schedule_source_links_update_own"
  on public.schedule_source_links for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "schedule_source_links_delete_own"
  on public.schedule_source_links for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.schedule_source_links to authenticated;

create or replace function public.schedule_linked_source(
  p_source_type text,
  p_source_id uuid,
  p_planned_date date,
  p_scheduled_start_at timestamptz,
  p_duration_minutes integer
)
returns public.tasks
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_title text;
  v_task public.tasks;
  v_task_id uuid;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_duration_minutes < 1 or p_duration_minutes > 1440 then
    raise exception 'invalid duration';
  end if;

  if p_source_type = 'meal' then
    select title into v_title from public.meals
      where id = p_source_id and user_id = v_user_id;
  elsif p_source_type = 'review' then
    select case kind when 'daily' then 'Daily Review' else 'Weekly Review' end
      into v_title from public.review_records
      where id = p_source_id and user_id = v_user_id and archived_at is null;
  else
    raise exception 'unsupported schedule source';
  end if;

  if p_source_type = 'meal' then
    update public.meals set date = p_planned_date, planned_at = p_scheduled_start_at, updated_at = now()
      where id = p_source_id and user_id = v_user_id;
  end if;
  if v_title is null then raise exception 'source not found'; end if;

  select task_id into v_task_id from public.schedule_source_links
    where user_id = v_user_id and source_type = p_source_type and source_id = p_source_id;

  if v_task_id is null then
    insert into public.tasks (
      user_id, title, status, priority, planned_date, scheduled_start_at,
      duration_minutes
    ) values (
      v_user_id, v_title, 'planned', 'none', p_planned_date,
      p_scheduled_start_at, p_duration_minutes
    ) returning id into v_task_id;

    insert into public.schedule_source_links (user_id, source_type, source_id, task_id)
      values (v_user_id, p_source_type, p_source_id, v_task_id);
  else
    update public.tasks set
      title = v_title,
      status = 'planned',
      completed_at = null,
      planned_date = p_planned_date,
      scheduled_start_at = p_scheduled_start_at,
      duration_minutes = p_duration_minutes,
      updated_at = now()
    where id = v_task_id and user_id = v_user_id and archived_at is null;
  end if;

  select * into v_task from public.tasks where id = v_task_id and user_id = v_user_id;
  return v_task;
end;
$$;

create or replace function public.complete_linked_task(p_task_id uuid, p_completed_at timestamptz)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_link public.schedule_source_links;
  v_task public.tasks;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  select * into v_link from public.schedule_source_links
    where task_id = p_task_id and user_id = v_user_id;

  if v_link.source_type = 'meal' then
    update public.meals set completed_at = p_completed_at, updated_at = now()
      where id = v_link.source_id and user_id = v_user_id;
  elsif v_link.source_type = 'review' then
    update public.review_records set status = 'completed', completed_at = p_completed_at, updated_at = now()
      where id = v_link.source_id and user_id = v_user_id and archived_at is null;
  end if;

  update public.tasks set status = 'done', completed_at = p_completed_at, updated_at = now()
    where id = p_task_id and user_id = v_user_id and archived_at is null
    returning * into v_task;
  if v_task.id is null then raise exception 'task not found'; end if;
  return v_task;
end;
$$;

create or replace function public.complete_linked_meal(p_meal_id uuid, p_completed_at timestamptz)
returns public.meals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_meal public.meals;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  update public.meals set completed_at = p_completed_at, updated_at = now()
    where id = p_meal_id and user_id = v_user_id returning * into v_meal;
  if v_meal.id is null then raise exception 'meal not found'; end if;
  update public.tasks t set status = 'done', completed_at = p_completed_at, updated_at = now()
    from public.schedule_source_links l
    where l.user_id = v_user_id and l.source_type = 'meal'
      and l.source_id = p_meal_id and l.task_id = t.id and t.user_id = v_user_id;
  return v_meal;
end;
$$;

revoke all on function public.schedule_linked_source(text, uuid, date, timestamptz, integer) from public, anon;
revoke all on function public.complete_linked_task(uuid, timestamptz) from public, anon;
revoke all on function public.complete_linked_meal(uuid, timestamptz) from public, anon;
grant execute on function public.schedule_linked_source(text, uuid, date, timestamptz, integer) to authenticated;
grant execute on function public.complete_linked_task(uuid, timestamptz) to authenticated;
grant execute on function public.complete_linked_meal(uuid, timestamptz) to authenticated;

create or replace function public.sync_schedule_source_from_task()
returns trigger language plpgsql security invoker set search_path = public as $$
declare v_link public.schedule_source_links;
begin
  if new.status = 'done' and (old.status is distinct from 'done') then
    select * into v_link from public.schedule_source_links
      where task_id = new.id and user_id = new.user_id;
    if v_link.source_type = 'meal' then
      update public.meals set completed_at = coalesce(new.completed_at, now()), updated_at = now()
        where id = v_link.source_id and user_id = new.user_id and completed_at is null;
    elsif v_link.source_type = 'review' then
      update public.review_records set status = 'completed', completed_at = coalesce(new.completed_at, now()), updated_at = now()
        where id = v_link.source_id and user_id = new.user_id and archived_at is null and status <> 'completed';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.sync_schedule_task_from_meal()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.completed_at is not null and old.completed_at is null then
    update public.tasks t set status = 'done', completed_at = new.completed_at, updated_at = now()
      from public.schedule_source_links l
      where l.user_id = new.user_id and l.source_type = 'meal' and l.source_id = new.id
        and l.task_id = t.id and t.user_id = new.user_id and t.status <> 'done';
  end if;
  return new;
end;
$$;

create or replace function public.sync_schedule_task_from_review()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    update public.tasks t set status = 'done', completed_at = coalesce(new.completed_at, now()), updated_at = now()
      from public.schedule_source_links l
      where l.user_id = new.user_id and l.source_type = 'review' and l.source_id = new.id
        and l.task_id = t.id and t.user_id = new.user_id and t.status <> 'done';
  end if;
  return new;
end;
$$;

create trigger sync_schedule_source_from_task_after_update
after update of status on public.tasks for each row execute function public.sync_schedule_source_from_task();
create trigger sync_schedule_task_from_meal_after_update
after update of completed_at on public.meals for each row execute function public.sync_schedule_task_from_meal();
create trigger sync_schedule_task_from_review_after_update
after update of status on public.review_records for each row execute function public.sync_schedule_task_from_review();

create or replace function public.sync_meal_schedule_from_task()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  update public.meals m set
    date = new.planned_date,
    planned_at = new.scheduled_start_at,
    updated_at = now()
  from public.schedule_source_links l
  where l.user_id = new.user_id and l.source_type = 'meal' and l.task_id = new.id
    and l.source_id = m.id and m.user_id = new.user_id;
  return new;
end;
$$;

create trigger sync_meal_schedule_from_task_after_update
after update of planned_date, scheduled_start_at on public.tasks
for each row execute function public.sync_meal_schedule_from_task();
