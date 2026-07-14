create table public.entertainment_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_type text not null,
  title text not null,
  creator_or_studio text,
  release_year integer,
  status text not null default 'planned',
  started_on date,
  completed_on date,
  rating smallint,
  notes text,
  progress_current numeric,
  progress_total numeric,
  progress_unit text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entertainment_items_title_not_blank check (length(btrim(title)) > 0),
  constraint entertainment_items_media_type_check check (media_type in ('book', 'movie', 'series', 'game')),
  constraint entertainment_items_status_check check (status in ('planned', 'in_progress', 'completed', 'dropped')),
  constraint entertainment_items_release_year_check check (release_year is null or release_year between 1000 and 3000),
  constraint entertainment_items_rating_check check (rating is null or rating between 1 and 10),
  constraint entertainment_items_progress_current_check check (progress_current is null or progress_current >= 0),
  constraint entertainment_items_progress_total_check check (progress_total is null or progress_total > 0),
  constraint entertainment_items_progress_range_check check (progress_current is null or progress_total is null or progress_current <= progress_total),
  constraint entertainment_items_progress_unit_check check (progress_unit is null or progress_unit in ('pages', 'episodes', 'percent', 'hours')),
  constraint entertainment_items_progress_pair_check check (
    (progress_current is null and progress_total is null and progress_unit is null)
    or (progress_unit is not null and (progress_current is not null or progress_total is not null))
  )
);

comment on table public.entertainment_items is
  'Private user-owned entertainment collection for books, movies, series and games.';

create index entertainment_items_user_type_updated_idx
  on public.entertainment_items (user_id, media_type, updated_at desc);

create trigger entertainment_items_set_updated_at
  before update on public.entertainment_items
  for each row execute function public.set_updated_at();

alter table public.entertainment_items enable row level security;

create policy "entertainment_items_select_own"
  on public.entertainment_items for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "entertainment_items_insert_own"
  on public.entertainment_items for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "entertainment_items_update_own"
  on public.entertainment_items for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.entertainment_items to authenticated;
