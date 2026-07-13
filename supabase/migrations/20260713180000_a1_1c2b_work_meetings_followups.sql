create table public.work_meetings (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete restrict, meeting_date date not null, started_at time,
  duration_minutes integer not null, title text not null, participants text, agenda text, outcome text not null, notes text,
  archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint work_meetings_duration_positive check (duration_minutes > 0), constraint work_meetings_title_not_blank check (length(btrim(title)) > 0), constraint work_meetings_outcome_not_blank check (length(btrim(outcome)) > 0)
);
create table public.work_meeting_followups (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  meeting_id uuid not null references public.work_meetings(id) on delete cascade, task_id uuid not null references public.tasks(id) on delete cascade,
  created_at timestamptz not null default now(), unique (meeting_id, task_id)
);
create index work_meetings_user_project_date_idx on public.work_meetings (user_id, project_id, meeting_date desc, created_at desc);
create index work_meeting_followups_user_meeting_idx on public.work_meeting_followups (user_id, meeting_id);
create trigger work_meetings_set_updated_at before update on public.work_meetings for each row execute function public.set_updated_at();
alter table public.work_meetings enable row level security;
alter table public.work_meeting_followups enable row level security;
create policy "work_meetings_select_own" on public.work_meetings for select to authenticated using ((select auth.uid()) = user_id);
create policy "work_meetings_insert_own" on public.work_meetings for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.projects join public.areas on areas.id = projects.area_id where projects.id = work_meetings.project_id and projects.user_id = (select auth.uid()) and projects.archived_at is null and areas.key = 'work' and areas.archived_at is null));
create policy "work_meetings_update_own" on public.work_meetings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and exists (select 1 from public.projects join public.areas on areas.id = projects.area_id where projects.id = work_meetings.project_id and projects.user_id = (select auth.uid()) and projects.archived_at is null and areas.key = 'work' and areas.archived_at is null));
create policy "work_meeting_followups_select_own" on public.work_meeting_followups for select to authenticated using ((select auth.uid()) = user_id);
create policy "work_meeting_followups_insert_own" on public.work_meeting_followups for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.work_meetings join public.tasks on tasks.id = work_meeting_followups.task_id where work_meetings.id = work_meeting_followups.meeting_id and work_meetings.user_id = (select auth.uid()) and tasks.user_id = (select auth.uid()) and tasks.archived_at is null));
create policy "work_meeting_followups_delete_own" on public.work_meeting_followups for delete to authenticated using ((select auth.uid()) = user_id);
grant select, insert, update on public.work_meetings to authenticated;
grant select, insert, delete on public.work_meeting_followups to authenticated;

create function public.create_work_meeting_followup(p_meeting_id uuid, p_title text, p_description text default null) returns uuid language plpgsql security invoker set search_path = public as $$
declare v_task_id uuid; v_project_id uuid;
begin
  select project_id into v_project_id from public.work_meetings where id = p_meeting_id and user_id = auth.uid() and archived_at is null;
  if v_project_id is null then raise exception 'Meeting unavailable'; end if;
  insert into public.tasks (user_id, project_id, title, description, status) values (auth.uid(), v_project_id, p_title, p_description, 'planned') returning id into v_task_id;
  insert into public.work_meeting_followups (user_id, meeting_id, task_id) values (auth.uid(), p_meeting_id, v_task_id);
  return v_task_id;
end;
$$;
grant execute on function public.create_work_meeting_followup(uuid, text, text) to authenticated;
