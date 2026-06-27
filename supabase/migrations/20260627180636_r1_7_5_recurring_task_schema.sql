create table public.recurring_task_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area_id uuid references public.areas(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  goal_id uuid references public.goals(id) on delete set null,
  title text not null,
  description text,
  next_action text,
  priority public.task_priority,
  energy public.task_energy,
  duration_minutes integer,
  recurrence_rule jsonb not null,
  starts_on date not null,
  ends_on date,
  timezone text not null default 'UTC',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recurring_task_templates_title_not_blank check (
    length(btrim(title)) > 0
  ),
  constraint recurring_task_templates_duration_minutes_range check (
    duration_minutes is null
    or (duration_minutes >= 5 and duration_minutes <= 1440)
  ),
  constraint recurring_task_templates_recurrence_rule_object check (
    jsonb_typeof(recurrence_rule) = 'object'
  ),
  constraint recurring_task_templates_date_range check (
    ends_on is null or ends_on >= starts_on
  ),
  constraint recurring_task_templates_timezone_not_blank check (
    length(btrim(timezone)) > 0
  )
);

comment on table public.recurring_task_templates is
  'Recurring task templates describe future generated task instances; templates are not Daily Core task rows.';
comment on column public.recurring_task_templates.recurrence_rule is
  'JSON recurrence contract for later generation use cases. R1.7.5B stores it but does not evaluate it.';
comment on column public.recurring_task_templates.is_active is
  'Template activity flag. Inactive templates must not generate future task instances.';

alter table public.tasks
  add column generated_from_template_id uuid
    references public.recurring_task_templates(id) on delete set null,
  add column instance_date date,
  add constraint tasks_generated_instance_pair_check
  check (
    (
      generated_from_template_id is null
      and instance_date is null
    )
    or
    (
      generated_from_template_id is not null
      and instance_date is not null
    )
  );

comment on column public.tasks.generated_from_template_id is
  'Nullable recurring template provenance for generated task instances.';
comment on column public.tasks.instance_date is
  'User-local date for a generated task instance. Not a scheduled timestamp.';

create unique index tasks_generated_instance_unique
  on public.tasks (user_id, generated_from_template_id, instance_date)
  where generated_from_template_id is not null and instance_date is not null;

create index recurring_task_templates_user_active_idx
  on public.recurring_task_templates (user_id, is_active);

create index recurring_task_templates_user_starts_on_idx
  on public.recurring_task_templates (user_id, starts_on);

create index recurring_task_templates_user_area_id_idx
  on public.recurring_task_templates (user_id, area_id);

create index recurring_task_templates_user_project_id_idx
  on public.recurring_task_templates (user_id, project_id);

create index recurring_task_templates_user_goal_id_idx
  on public.recurring_task_templates (user_id, goal_id);

create index tasks_generated_from_template_idx
  on public.tasks (user_id, generated_from_template_id);

create index tasks_instance_date_idx
  on public.tasks (user_id, instance_date);

create trigger recurring_task_templates_set_updated_at
  before update on public.recurring_task_templates
  for each row
  execute function public.set_updated_at();

alter table public.recurring_task_templates enable row level security;

create policy "Users can select own recurring_task_templates"
on public.recurring_task_templates for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own recurring_task_templates"
on public.recurring_task_templates for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own recurring_task_templates"
on public.recurring_task_templates for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete own recurring_task_templates"
on public.recurring_task_templates for delete
to authenticated
using ((select auth.uid()) = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete
  on table public.recurring_task_templates
  to authenticated;
