create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  title text,
  body text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint journal_entries_title_not_blank
    check (title is null or length(btrim(title)) > 0),
  constraint journal_entries_body_not_blank check (length(btrim(body)) > 0)
);

comment on table public.journal_entries is
  'Private user-owned journal entries; reviews, mood and health remain canonical in their own domains.';

create index journal_entries_user_date_idx
  on public.journal_entries (user_id, entry_date desc, created_at desc);

create trigger journal_entries_set_updated_at
  before update on public.journal_entries
  for each row execute function public.set_updated_at();

alter table public.journal_entries enable row level security;

create policy "journal_entries_select_own"
  on public.journal_entries for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "journal_entries_insert_own"
  on public.journal_entries for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "journal_entries_update_own"
  on public.journal_entries for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.journal_entries to authenticated;
