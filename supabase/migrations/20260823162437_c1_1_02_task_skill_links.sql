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

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'skills_user_id_id_unique'
      and conrelid = 'public.skills'::regclass
  ) then
    alter table public.skills
      add constraint skills_user_id_id_unique unique (user_id, id);
  end if;
end
$$;

create table public.task_skill_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null,
  skill_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_skill_links_task_owner_fkey
    foreign key (user_id, task_id)
    references public.tasks (user_id, id)
    on delete cascade,
  constraint task_skill_links_skill_owner_fkey
    foreign key (user_id, skill_id)
    references public.skills (user_id, id)
    on delete cascade,
  constraint task_skill_links_unique_link unique (user_id, task_id, skill_id)
);

comment on table public.task_skill_links is
  'Immutable user-owned Task-to-Skill context links. A link is practice/application context and never creates Skill Evidence.';
comment on column public.task_skill_links.updated_at is
  'Kept for the shared user-table timestamp contract; links are immutable and are replaced only by explicit unlink/link.';

create index task_skill_links_user_skill_task_idx
  on public.task_skill_links (user_id, skill_id, task_id);

alter table public.task_skill_links enable row level security;

create policy "Users can select own task_skill_links"
on public.task_skill_links for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own active task_skill_links"
on public.task_skill_links for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.tasks
    where tasks.user_id = task_skill_links.user_id
      and tasks.id = task_skill_links.task_id
      and tasks.archived_at is null
      and tasks.status <> 'archived'
  )
  and exists (
    select 1
    from public.skills
    where skills.user_id = task_skill_links.user_id
      and skills.id = task_skill_links.skill_id
      and skills.archived_at is null
      and skills.status <> 'archived'
  )
);

create policy "Users can delete own task_skill_links"
on public.task_skill_links for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.task_skill_links from anon, authenticated;
grant select, insert, delete on table public.task_skill_links to authenticated;
