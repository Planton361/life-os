-- Canonical project stages; legacy tasks remain unassigned.
alter table public.projects add constraint projects_owner_identity unique (user_id, id);
create table public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null,
  title text not null check (length(btrim(title)) between 1 and 500),
  description text check (length(description) <= 10000),
  status text not null default 'open' check (status in ('open','active','done')),
  target_date date,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (user_id, project_id, id),
  unique (project_id, sort_order) deferrable initially deferred,
  foreign key (user_id, project_id) references public.projects(user_id,id) on delete cascade
);
create index project_milestones_project_order on public.project_milestones(user_id,project_id,sort_order,id);
create unique index project_milestones_one_active on public.project_milestones(project_id)
  where status = 'active' and archived_at is null;
alter table public.tasks add column milestone_id uuid,
  add constraint tasks_milestone_requires_project check (milestone_id is null or project_id is not null),
  add constraint tasks_milestone_project_owner foreign key (user_id,project_id,milestone_id)
    references public.project_milestones(user_id,project_id,id);
create index tasks_milestone_owner on public.tasks(user_id,project_id,milestone_id);
create trigger project_milestones_updated before update on public.project_milestones
  for each row execute function public.set_updated_at();
alter table public.project_milestones enable row level security;
revoke all on public.project_milestones from public, anon, authenticated;
grant select, insert, update on public.project_milestones to authenticated;
create policy milestones_read on public.project_milestones for select to authenticated
  using (user_id = (select auth.uid()));
create policy milestones_insert on public.project_milestones for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid()) and p.archived_at is null));
create policy milestones_update on public.project_milestones for update to authenticated
  using (user_id = (select auth.uid()) and archived_at is null)
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid()) and p.archived_at is null));

create function public.guard_project_milestone() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.user_id <> auth.uid() or auth.uid() is null then
    raise exception 'Milestone ownership required' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    if (new.id,new.user_id,new.project_id) is distinct from (old.id,old.user_id,old.project_id) then
      raise exception 'Milestone identity is immutable' using errcode = '23514';
    end if;
    if old.archived_at is not null then raise exception 'Milestone archived'; end if;
  end if;
  perform 1 from public.projects where id = new.project_id and user_id = auth.uid() and archived_at is null for update;
  if not found then raise exception 'Project unavailable' using errcode = '42501'; end if;
  if new.archived_at is not null then
    update public.tasks set milestone_id = null
      where user_id = new.user_id and milestone_id = new.id;
  end if;
  return new;
end $$;
create trigger guard_project_milestone before insert or update on public.project_milestones
  for each row execute function public.guard_project_milestone();

create function public.guard_task_milestone() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.milestone_id is not null then
    if new.archived_at is not null then raise exception 'Task archived'; end if;
    perform 1 from public.project_milestones m
      join public.projects p on p.id = m.project_id and p.user_id = m.user_id
      where m.id = new.milestone_id and m.user_id = new.user_id
        and m.project_id = new.project_id and m.archived_at is null and p.archived_at is null for share of m, p;
    if not found then raise exception 'Milestone unavailable or outside Project' using errcode = '23514'; end if;
  end if;
  return new;
end $$;
create trigger guard_task_milestone before insert or update of milestone_id,project_id,user_id on public.tasks
  for each row execute function public.guard_task_milestone();

-- All coupled changes serialize on the owned project. Direct writes retain
-- ownership/FK/active-index/archival defenses.
create function public.write_project_milestone(
  p_project_id uuid, p_operation text, p_milestone_id uuid default null,
  p_title text default null, p_description text default null,
  p_status text default 'open', p_target_date date default null,
  p_task_id uuid default null
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_user uuid := auth.uid(); v_id uuid; v_order integer; v_other uuid; v_other_order integer; v_done boolean;
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  perform 1 from public.projects where id = p_project_id and user_id = v_user and archived_at is null for update;
  if not found then raise exception 'Project unavailable' using errcode = '42501'; end if;
  if p_operation not in ('save','assign','up','down','archive') or p_operation is null then raise exception 'Invalid operation'; end if;
  if p_milestone_id is not null then
    select id,sort_order,status = 'done' into v_id,v_order,v_done from public.project_milestones
      where id=p_milestone_id and project_id=p_project_id and user_id=v_user and archived_at is null for update;
    if not found then raise exception 'Milestone unavailable' using errcode = '42501'; end if;
  end if;
  if p_operation = 'assign' then
    update public.tasks set milestone_id=p_milestone_id where id=p_task_id and user_id=v_user
      and project_id=p_project_id and archived_at is null;
    if not found then raise exception 'Task unavailable' using errcode = '42501'; end if;
    return p_milestone_id;
  elsif p_operation = 'save' then
    if p_status is null or p_status not in ('open','active','done') then raise exception 'Invalid status'; end if;
    if p_status = 'active' then
      update public.project_milestones set status='open'
        where user_id=v_user and project_id=p_project_id and status='active' and archived_at is null
          and id is distinct from p_milestone_id;
    end if;
    if p_milestone_id is null then
      select coalesce(max(sort_order),-1)+1 into v_order from public.project_milestones where project_id=p_project_id and user_id=v_user;
      insert into public.project_milestones(user_id,project_id,title,description,status,target_date,sort_order)
        values(v_user,p_project_id,p_title,p_description,p_status,p_target_date,v_order) returning id into v_id;
    else
      update public.project_milestones set title=p_title,description=p_description,status=p_status,target_date=p_target_date
        where id=v_id and user_id=v_user;
    end if;
  elsif v_id is null then raise exception 'Milestone required';
  elsif p_operation = 'archive' then
    update public.project_milestones set archived_at=now() where id=v_id and user_id=v_user;
  else
    -- Reorder within open/active or completed stages; history stays secondary.
    if p_operation = 'up' then
      select id,sort_order into v_other,v_other_order from public.project_milestones
        where project_id=p_project_id and user_id=v_user and archived_at is null and (status='done')=v_done
          and (sort_order,id)<(v_order,v_id) order by sort_order desc,id desc limit 1;
    else
      select id,sort_order into v_other,v_other_order from public.project_milestones
        where project_id=p_project_id and user_id=v_user and archived_at is null and (status='done')=v_done
          and (sort_order,id)>(v_order,v_id) order by sort_order,id limit 1;
    end if;
    if v_other is not null then
      update public.project_milestones set sort_order=v_other_order where id=v_id and user_id=v_user;
      update public.project_milestones set sort_order=v_order where id=v_other and user_id=v_user;
    end if;
  end if;
  return v_id;
end $$;
revoke all on function public.guard_project_milestone(), public.guard_task_milestone() from public, anon, authenticated;
revoke all on function public.write_project_milestone(uuid,text,uuid,text,text,text,date,uuid) from public, anon;
grant execute on function public.write_project_milestone(uuid,text,uuid,text,text,text,date,uuid) to authenticated;
