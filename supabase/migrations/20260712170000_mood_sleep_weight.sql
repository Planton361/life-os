create table public.mood_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  mood text not null check (mood in ('calm','content','focused','tired','anxious','stressed','happy')),
  recorded_at timestamptz not null default now(),
  local_date date not null,
  timezone text not null default 'Europe/Berlin',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mood_entries_owner_matches_profile check (user_id = profile_id)
);

create table public.sleep_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  sleep_date date not null,
  duration_minutes integer not null check (duration_minutes between 1 and 1440),
  quality smallint check (quality between 1 and 5),
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sleep_entries_owner_matches_profile check (user_id = profile_id),
  constraint sleep_entries_one_night unique (user_id, sleep_date)
);

create table public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  measured_on date not null,
  weight_kg numeric(5,2) not null check (weight_kg between 20 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weight_entries_owner_matches_profile check (user_id = profile_id),
  constraint weight_entries_one_per_day unique (user_id, measured_on)
);

create table public.weight_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  target_weight_kg numeric(5,2) not null check (target_weight_kg between 20 and 500),
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weight_goals_owner_matches_profile check (user_id = profile_id),
  constraint weight_goals_one_per_user unique (user_id)
);

create index mood_entries_user_recorded_idx on public.mood_entries (user_id, recorded_at desc) where archived_at is null;
create index sleep_entries_user_date_idx on public.sleep_entries (user_id, sleep_date desc);
create index weight_entries_user_date_idx on public.weight_entries (user_id, measured_on desc);

alter table public.mood_entries enable row level security;
alter table public.sleep_entries enable row level security;
alter table public.weight_entries enable row level security;
alter table public.weight_goals enable row level security;

create policy mood_entries_owner_all on public.mood_entries for all to authenticated using ((select auth.uid()) = user_id and (select auth.uid()) = profile_id) with check ((select auth.uid()) = user_id and (select auth.uid()) = profile_id);
create policy sleep_entries_owner_all on public.sleep_entries for all to authenticated using ((select auth.uid()) = user_id and (select auth.uid()) = profile_id) with check ((select auth.uid()) = user_id and (select auth.uid()) = profile_id);
create policy weight_entries_owner_all on public.weight_entries for all to authenticated using ((select auth.uid()) = user_id and (select auth.uid()) = profile_id) with check ((select auth.uid()) = user_id and (select auth.uid()) = profile_id);
create policy weight_goals_owner_all on public.weight_goals for all to authenticated using ((select auth.uid()) = user_id and (select auth.uid()) = profile_id) with check ((select auth.uid()) = user_id and (select auth.uid()) = profile_id);

grant select, insert, update, delete on public.mood_entries to authenticated;
grant select, insert, update, delete on public.sleep_entries to authenticated;
grant select, insert, update, delete on public.weight_entries to authenticated;
grant select, insert, update, delete on public.weight_goals to authenticated;

comment on table public.mood_entries is 'Timestamped self-reported mood signals; no diagnostic meaning.';
comment on table public.sleep_entries is 'Manual sleep duration and optional self-reported quality; no recovery score.';
comment on table public.weight_entries is 'Manual body-weight measurements; no medical interpretation.';
comment on table public.weight_goals is 'Single personal weight target with optional date; no weight-loss advice.';
