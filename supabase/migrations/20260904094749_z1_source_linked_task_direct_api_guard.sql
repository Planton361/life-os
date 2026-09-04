-- Source-linked tasks are executable projections, not independent lifecycle
-- records. Normal authenticated Data API writes remain valid for unlinked
-- tasks, while canonical SECURITY DEFINER RPCs retain the coupled paths.

create or replace function public.guard_source_linked_task_direct_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_source_type text;
begin
  -- PostgREST executes normal user requests with the authenticated database
  -- role. The canonical source RPCs run as SECURITY DEFINER, which is an
  -- unspoofable database execution boundary rather than a client-provided
  -- flag.
  if current_user <> 'authenticated' then
    return new;
  end if;

  select schedule_source_links.source_type
    into v_source_type
    from public.schedule_source_links
    where schedule_source_links.user_id = old.user_id
      and schedule_source_links.task_id = old.id;

  if v_source_type is null then
    return new;
  end if;

  if new.status is distinct from old.status
    or new.completed_at is distinct from old.completed_at
    or new.archived_at is distinct from old.archived_at then
    raise exception 'source-linked task lifecycle must use its canonical flow';
  end if;

  if v_source_type = 'meal'
    and (
      new.planned_date is distinct from old.planned_date
      or new.scheduled_start_at is distinct from old.scheduled_start_at
      or new.duration_minutes is distinct from old.duration_minutes
    ) then
    raise exception 'meal-linked task scheduling must use its canonical flow';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_source_linked_task_direct_mutation on public.tasks;

create trigger guard_source_linked_task_direct_mutation
before update of planned_date, scheduled_start_at, duration_minutes, status, completed_at, archived_at
on public.tasks
for each row
execute function public.guard_source_linked_task_direct_mutation();

revoke all on function public.guard_source_linked_task_direct_mutation() from public, anon, authenticated;
