alter table public.profiles
  add column habit_morning_starts_at time not null default '05:00',
  add column habit_midday_starts_at time not null default '11:00',
  add column habit_evening_starts_at time not null default '17:00',
  add constraint profiles_habit_window_boundaries_ordered check (
    habit_morning_starts_at < habit_midday_starts_at
    and habit_midday_starts_at < habit_evening_starts_at
  );

comment on column public.profiles.habit_morning_starts_at is
  'Local time when the Morning habit window begins; time before this belongs to the wrapping Evening window.';
comment on column public.profiles.habit_midday_starts_at is
  'Local time when the Midday habit window begins.';
comment on column public.profiles.habit_evening_starts_at is
  'Local time when the Evening habit window begins.';

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  unit text,
  daily_target numeric,
  default_increment numeric not null default 1,
  time_window text not null,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint habits_name_not_blank check (length(btrim(name)) > 0),
  constraint habits_unit_not_blank check (unit is null or length(btrim(unit)) > 0),
  constraint habits_daily_target_positive check (daily_target is null or daily_target > 0),
  constraint habits_default_increment_positive check (default_increment > 0),
  constraint habits_time_window_valid check (time_window in ('Morning', 'Midday', 'Evening')),
  constraint habits_sort_order_dashboard_slot check (sort_order between 1 and 8)
);

create unique index habits_active_user_window_slot_unique
  on public.habits (user_id, time_window, sort_order)
  where archived_at is null;
create index habits_user_archived_window_order_idx
  on public.habits (user_id, archived_at, time_window, sort_order);
create index habits_profile_id_idx on public.habits (profile_id);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  value numeric not null,
  recorded_at timestamptz not null default now(),
  local_date date not null,
  timezone text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint habit_logs_value_positive check (value > 0),
  constraint habit_logs_timezone_not_blank check (length(btrim(timezone)) > 0)
);

create index habit_logs_habit_id_idx on public.habit_logs (habit_id);
create index habit_logs_profile_id_idx on public.habit_logs (profile_id);
create index habit_logs_user_local_date_recorded_idx
  on public.habit_logs (user_id, local_date, recorded_at desc)
  where archived_at is null;
create index habit_logs_user_habit_local_date_idx
  on public.habit_logs (user_id, habit_id, local_date)
  where archived_at is null;

create trigger habits_set_updated_at
  before update on public.habits
  for each row execute function public.set_updated_at();
create trigger habit_logs_set_updated_at
  before update on public.habit_logs
  for each row execute function public.set_updated_at();

alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;

create policy "Users can select own habits"
on public.habits for select to authenticated
using ((select auth.uid()) = user_id);
create policy "Users can insert own habits"
on public.habits for insert to authenticated
with check ((select auth.uid()) = user_id and profile_id = (select auth.uid()));
create policy "Users can update own habits"
on public.habits for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id and profile_id = (select auth.uid()));

create policy "Users can select own habit logs"
on public.habit_logs for select to authenticated
using ((select auth.uid()) = user_id);
create policy "Users can insert own habit logs"
on public.habit_logs for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and profile_id = (select auth.uid())
  and exists (
    select 1 from public.habits
    where habits.id = habit_logs.habit_id
      and habits.user_id = (select auth.uid())
  )
);
create policy "Users can update own habit logs"
on public.habit_logs for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and profile_id = (select auth.uid())
  and exists (
    select 1 from public.habits
    where habits.id = habit_logs.habit_id
      and habits.user_id = (select auth.uid())
  )
);

grant select, insert, update on table public.habits to authenticated;
grant select, insert, update on table public.habit_logs to authenticated;
