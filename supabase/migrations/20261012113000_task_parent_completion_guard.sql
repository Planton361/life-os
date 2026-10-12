-- #151: extend the existing invoker/row-version locking boundary. Existing
-- Dependency, Source, RLS and Project command guards remain unchanged.
create function public.guard_task_parent_completion() returns trigger
language plpgsql security invoker set search_path=pg_catalog,public as $$
declare
  v_project uuid;
  v_old_project uuid;
  v_parent record;
begin
  if not ((new.status='done' and (tg_op='INSERT' or old.status is distinct from new.status)) or
      (new.completed_at is not null and (tg_op='INSERT' or old.completed_at is distinct from new.completed_at))) then
    return new;
  end if;
  if tg_op='UPDATE' then v_old_project:=old.project_id; end if;
  -- Both persisted and resulting Parent: detaching/moving in the same completion
  -- UPDATE cannot evade the guard. Stable lock order limits transfer deadlocks.
  for v_project in select distinct p from unnest(array[v_old_project,new.project_id]) p where p is not null order by p loop
    -- A real row-version write preserves the existing REPEATABLE READ conflict
    -- behavior. RETURNING observes the locked current version at READ COMMITTED.
    update public.projects set updated_at=clock_timestamp()
      where id=v_project and user_id=new.user_id
      returning status,archived_at into v_parent;
    if not found then raise exception 'TASK_PROJECT_NOT_FOUND'; end if;
    if v_parent.archived_at is not null or v_parent.status='archived' then
      raise exception 'TASK_PROJECT_ARCHIVED';
    end if;
  end loop;
  return new;
end $$;
create trigger guard_task_parent_completion before insert or update of status,completed_at,project_id on public.tasks
  for each row execute function public.guard_task_parent_completion();
revoke all on function public.guard_task_parent_completion() from public,anon,authenticated;

-- Authenticated direct Source UPDATEs are completion boundaries too. Reject
-- before a Source fact/history commits, including paths which do not sync a Task.
create function public.guard_source_task_parent_completion() returns trigger
language plpgsql security invoker set search_path=pg_catalog,public as $$
declare
  n jsonb:=to_jsonb(new);
  o jsonb:=case when tg_op='UPDATE' then to_jsonb(old) else '{}'::jsonb end;
  v_type text;
  v_source uuid;
  v_project uuid;
  v_parent record;
begin
  if not ((n->>'completed_at' is not null and n->>'completed_at' is distinct from o->>'completed_at') or
      (coalesce(n->>'status'='completed',false) and n->>'status' is distinct from o->>'status')) then return new; end if;
  v_type:=case tg_table_name when 'meals' then 'meal' when 'review_records' then 'review' when 'running_sessions' then 'running_plan_item' when 'strength_sessions' then 'strength_plan' end;
  v_source:=(case tg_table_name when 'running_sessions' then n->>'plan_item_id' when 'strength_sessions' then n->>'plan_id' else n->>'id' end)::uuid;
  select t.project_id into v_project from public.schedule_source_links l join public.tasks t on t.id=l.task_id and t.user_id=l.user_id
    where l.user_id=new.user_id and l.source_type=v_type and l.source_id=v_source for update of t;
  if v_project is null then return new; end if;
  update public.projects set updated_at=clock_timestamp() where id=v_project and user_id=new.user_id
    returning status,archived_at into v_parent;
  if not found then raise exception 'TASK_PROJECT_NOT_FOUND'; end if;
  if v_parent.archived_at is not null or v_parent.status='archived' then raise exception 'TASK_PROJECT_ARCHIVED'; end if;
  return new;
end $$;
create trigger guard_meal_task_parent_completion before insert or update on public.meals for each row execute function public.guard_source_task_parent_completion();
create trigger guard_review_task_parent_completion before insert or update on public.review_records for each row execute function public.guard_source_task_parent_completion();
create trigger guard_running_task_parent_completion before insert or update on public.running_sessions for each row execute function public.guard_source_task_parent_completion();
create trigger guard_strength_task_parent_completion before insert or update on public.strength_sessions for each row execute function public.guard_source_task_parent_completion();
revoke all on function public.guard_source_task_parent_completion() from public,anon,authenticated;
