create table public.work_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete restrict,
  decision_date date not null,
  title text not null,
  decision text not null,
  rationale text,
  status text not null default 'active',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint work_decisions_title_not_blank check (length(btrim(title)) > 0),
  constraint work_decisions_decision_not_blank check (length(btrim(decision)) > 0),
  constraint work_decisions_status_check check (status in ('active', 'revisited', 'superseded'))
);

create index work_decisions_user_project_date_idx on public.work_decisions (user_id, project_id, decision_date desc, created_at desc);
create trigger work_decisions_set_updated_at before update on public.work_decisions for each row execute function public.set_updated_at();
alter table public.work_decisions enable row level security;
create policy "work_decisions_select_own" on public.work_decisions for select to authenticated using ((select auth.uid()) = user_id);
create policy "work_decisions_insert_own" on public.work_decisions for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.projects join public.areas on areas.id = projects.area_id where projects.id = work_decisions.project_id and projects.user_id = (select auth.uid()) and projects.archived_at is null and areas.key = 'work' and areas.archived_at is null));
create policy "work_decisions_update_own" on public.work_decisions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and exists (select 1 from public.projects join public.areas on areas.id = projects.area_id where projects.id = work_decisions.project_id and projects.user_id = (select auth.uid()) and projects.archived_at is null and areas.key = 'work' and areas.archived_at is null));
grant select, insert, update on public.work_decisions to authenticated;
