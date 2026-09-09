-- R2-10: one bounded, same-project Finish-to-Start graph.
alter table public.tasks add constraint tasks_graph_identity unique (user_id, project_id, id);
create table public.task_dependencies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null,
  predecessor_task_id uuid not null,
  successor_task_id uuid not null,
  created_at timestamptz not null default now(),
  constraint task_dependencies_no_self check (predecessor_task_id <> successor_task_id),
  constraint task_dependencies_unique unique (predecessor_task_id, successor_task_id),
  constraint task_dependencies_predecessor foreign key (user_id,project_id,predecessor_task_id)
    references public.tasks(user_id,project_id,id) on delete restrict,
  constraint task_dependencies_successor foreign key (user_id,project_id,successor_task_id)
    references public.tasks(user_id,project_id,id) on delete restrict
);
create index task_dependencies_successors on public.task_dependencies(user_id,successor_task_id);
create index task_dependencies_project on public.task_dependencies(user_id,project_id);
alter table public.task_dependencies enable row level security;
revoke all on public.task_dependencies from anon, authenticated;
grant select, insert, delete on public.task_dependencies to authenticated;
create policy task_dependencies_read on public.task_dependencies for select to authenticated using (user_id=(select auth.uid()));
create policy task_dependencies_add on public.task_dependencies for insert to authenticated with check (user_id=(select auth.uid()));
create policy task_dependencies_remove on public.task_dependencies for delete to authenticated using (user_id=(select auth.uid()));

create function public.guard_task_dependency() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
declare
  v_project uuid;
  v_owner uuid;
  v_pre public.tasks;
  v_post public.tasks;
begin
  v_project := case when tg_op='DELETE' then old.project_id else new.project_id end;
  v_owner := case when tg_op='DELETE' then old.user_id else new.user_id end;
  if auth.uid() is null or v_owner <> auth.uid() then raise exception 'DEPENDENCY_OWNER'; end if;
  -- Actual row version change, not just advisory locking: under REPEATABLE READ
  -- competing graph/lifecycle writers abort rather than validate a stale snapshot.
  update public.projects set updated_at=clock_timestamp() where id=v_project and user_id=v_owner;
  if not found then raise exception 'DEPENDENCY_PROJECT'; end if;
  if tg_op='DELETE' then return old; end if;
  if new.predecessor_task_id=new.successor_task_id then raise exception 'DEPENDENCY_SELF'; end if;
  if not exists(select 1 from public.projects where id=v_project and user_id=v_owner and archived_at is null and status <> 'archived') then
    raise exception 'DEPENDENCY_PROJECT';
  end if;
  select * into v_pre from public.tasks where id=new.predecessor_task_id and user_id=v_owner and project_id=v_project;
  select * into v_post from public.tasks where id=new.successor_task_id and user_id=v_owner and project_id=v_project;
  if v_pre.id is null or v_post.id is null then raise exception 'DEPENDENCY_TARGET'; end if;
  if v_pre.archived_at is not null or v_post.archived_at is not null or v_pre.status='archived' or v_post.status='archived' then raise exception 'DEPENDENCY_ARCHIVED'; end if;
  if exists(select 1 from public.task_dependencies where predecessor_task_id=new.predecessor_task_id and successor_task_id=new.successor_task_id and user_id=v_owner) then raise exception 'DEPENDENCY_DUPLICATE'; end if;
  if exists(
    with recursive reachable(id) as (
      select new.successor_task_id
      union
      select d.successor_task_id from public.task_dependencies d join reachable r on d.predecessor_task_id=r.id
        where d.user_id=v_owner and d.project_id=v_project
    ) select 1 from reachable where id=new.predecessor_task_id
  ) then raise exception 'DEPENDENCY_CYCLE'; end if;
  if (v_post.status='done' or v_post.completed_at is not null) and (v_pre.status <> 'done' or v_pre.completed_at is null) then raise exception 'DEPENDENCY_COMPLETED_SUCCESSOR'; end if;
  return new;
end $$;
create trigger guard_task_dependency before insert or delete on public.task_dependencies for each row execute function public.guard_task_dependency();
revoke all on function public.guard_task_dependency() from public, anon, authenticated;

create function public.guard_task_dependency_lifecycle() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if tg_op='UPDATE' and (new.project_id is distinct from old.project_id or new.user_id is distinct from old.user_id or new.id is distinct from old.id) and exists(
    select 1 from public.task_dependencies where user_id=old.user_id and (predecessor_task_id=old.id or successor_task_id=old.id)
  ) then raise exception 'DEPENDENCY_PROJECT_MOVE'; end if;
  -- Also serialize tasks without edges: an edge can be added concurrently.
  if new.project_id is not null then
    update public.projects set updated_at=clock_timestamp() where id=new.project_id and user_id=new.user_id;
  end if;
  if ((new.status='done' and (tg_op='INSERT' or old.status is distinct from new.status)) or
      (new.completed_at is not null and (tg_op='INSERT' or old.completed_at is distinct from new.completed_at))) and exists(
       select 1 from public.task_dependencies d join public.tasks p on p.id=d.predecessor_task_id and p.user_id=d.user_id
       where d.user_id=new.user_id and d.successor_task_id=new.id
         and (p.status <> 'done' or p.completed_at is null or p.archived_at is not null)
     ) then raise exception 'DEPENDENCY_BLOCKED: complete the predecessors first'; end if;
  return new;
end $$;
-- No role bypass: coupled source RPCs must roll back with the Task write.
create trigger guard_task_dependency_lifecycle before insert or update of status,completed_at,archived_at,project_id,user_id,id on public.tasks
  for each row execute function public.guard_task_dependency_lifecycle();
revoke all on function public.guard_task_dependency_lifecycle() from public, anon, authenticated;

-- Single MVCC snapshot; JSON aggregation avoids PostgREST's row-page cap.
create function public.read_task_dependency_graph() returns jsonb
language sql stable security invoker set search_path=pg_catalog,public as $$
  select jsonb_build_object(
    'tasks', coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',title,'project_id',project_id,'status',status,'completed_at',completed_at,'archived_at',archived_at)) from public.tasks where user_id=auth.uid()),'[]'::jsonb),
    'dependencies', coalesce((select jsonb_agg(jsonb_build_object('id',id,'predecessor_task_id',predecessor_task_id,'successor_task_id',successor_task_id)) from public.task_dependencies where user_id=auth.uid()),'[]'::jsonb)
  );
$$;
revoke all on function public.read_task_dependency_graph() from public,anon;
grant execute on function public.read_task_dependency_graph() to authenticated;

-- Source table API writes are also completion boundaries; do not allow a
-- source fact to claim completion while its linked Task remains blocked.
create function public.guard_dependency_source_completion() returns trigger
language plpgsql security invoker set search_path=pg_catalog,public as $$
declare
  n jsonb := to_jsonb(new);
  o jsonb := case when tg_op='UPDATE' then to_jsonb(old) else '{}'::jsonb end;
  v_type text;
  v_source uuid;
  v_task public.tasks;
begin
  if not ((n->>'completed_at' is not null and n->>'completed_at' is distinct from o->>'completed_at') or
    (coalesce(n->>'status'='completed',false) and n->>'status' is distinct from o->>'status')) then return new; end if;
  v_type := case tg_table_name when 'meals' then 'meal' when 'review_records' then 'review' when 'running_sessions' then 'running_plan_item' when 'strength_sessions' then 'strength_plan' end;
  v_source := (case tg_table_name when 'running_sessions' then n->>'plan_item_id' when 'strength_sessions' then n->>'plan_id' else n->>'id' end)::uuid;
  select t.* into v_task from public.schedule_source_links l join public.tasks t on t.id=l.task_id and t.user_id=l.user_id
    where l.user_id=new.user_id and l.source_type=v_type and l.source_id=v_source;
  if v_task.id is null then return new; end if;
  if v_task.project_id is not null then
    update public.projects set updated_at=clock_timestamp() where id=v_task.project_id and user_id=new.user_id;
  end if;
  if exists(select 1 from public.task_dependencies d join public.tasks p on p.id=d.predecessor_task_id and p.user_id=d.user_id
    where d.user_id=new.user_id and d.successor_task_id=v_task.id and (p.status<>'done' or p.completed_at is null or p.archived_at is not null)) then
    raise exception 'DEPENDENCY_BLOCKED: complete the predecessors first';
  end if;
  return new;
end $$;
create trigger guard_meal_dependency_completion before insert or update on public.meals for each row execute function public.guard_dependency_source_completion();
create trigger guard_review_dependency_completion before insert or update on public.review_records for each row execute function public.guard_dependency_source_completion();
create trigger guard_running_dependency_completion before insert or update on public.running_sessions for each row execute function public.guard_dependency_source_completion();
create trigger guard_strength_dependency_completion before insert or update on public.strength_sessions for each row execute function public.guard_dependency_source_completion();
revoke all on function public.guard_dependency_source_completion() from public,anon,authenticated;
