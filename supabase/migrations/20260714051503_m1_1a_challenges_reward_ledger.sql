create table public.challenges (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, description text, period_type text not null, start_date date not null, end_date date not null,
  target_value numeric not null, unit text not null, reward_coins integer not null default 0,
  status text not null default 'active', completed_at timestamptz, archived_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint challenges_title_not_blank check (length(btrim(title)) > 0),
  constraint challenges_period_check check (period_type in ('daily','weekly','monthly','custom')),
  constraint challenges_dates_check check (end_date >= start_date),
  constraint challenges_target_check check (target_value > 0),
  constraint challenges_unit_not_blank check (length(btrim(unit)) > 0),
  constraint challenges_reward_check check (reward_coins >= 0),
  constraint challenges_status_check check (status in ('active','completed','abandoned')),
  constraint challenges_completed_check check ((status = 'completed') = (completed_at is not null))
);

create table public.challenge_progress_logs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete restrict,
  increment numeric not null, note text, recorded_at timestamptz not null default now(), archived_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint challenge_progress_increment_check check (increment > 0)
);

create table public.reward_ledger_entries (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null, entry_type text not null, source_type text not null, source_id uuid not null,
  description text not null, created_at timestamptz not null default now(),
  constraint reward_ledger_amount_check check (amount > 0),
  constraint reward_ledger_type_check check (entry_type = 'challenge_reward'),
  constraint reward_ledger_source_check check (source_type = 'challenge'),
  constraint reward_ledger_description_not_blank check (length(btrim(description)) > 0),
  unique (entry_type, source_type, source_id)
);

create index challenges_user_status_updated_idx on public.challenges (user_id, status, updated_at desc, id);
create index challenge_progress_user_challenge_recorded_idx on public.challenge_progress_logs (user_id, challenge_id, recorded_at desc, id desc);
create index reward_ledger_user_created_idx on public.reward_ledger_entries (user_id, created_at desc, id desc);
create trigger challenges_set_updated_at before update on public.challenges for each row execute function public.set_updated_at();
create trigger challenge_progress_logs_set_updated_at before update on public.challenge_progress_logs for each row execute function public.set_updated_at();

create function public.protect_completed_challenge_reward() returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if old.status = 'completed' and new.reward_coins is distinct from old.reward_coins then raise exception 'completed challenge reward is immutable'; end if;
  return new;
end; $$;
create trigger challenges_protect_completed_reward before update on public.challenges for each row execute function public.protect_completed_challenge_reward();
revoke all on function public.protect_completed_challenge_reward() from public;

alter table public.challenges enable row level security;
alter table public.challenge_progress_logs enable row level security;
alter table public.reward_ledger_entries enable row level security;
create policy "challenges_select_own" on public.challenges for select to authenticated using ((select auth.uid()) = user_id);
create policy "challenges_insert_own" on public.challenges for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "challenges_update_own" on public.challenges for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "challenge_progress_select_own" on public.challenge_progress_logs for select to authenticated using ((select auth.uid()) = user_id);
create policy "challenge_progress_insert_own" on public.challenge_progress_logs for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.challenges where id = challenge_id and user_id = (select auth.uid()) and status = 'active' and archived_at is null));
create policy "challenge_progress_update_own_active" on public.challenge_progress_logs for update to authenticated using ((select auth.uid()) = user_id and exists (select 1 from public.challenges where id = challenge_id and user_id = (select auth.uid()) and status = 'active' and archived_at is null)) with check ((select auth.uid()) = user_id and exists (select 1 from public.challenges where id = challenge_id and user_id = (select auth.uid()) and status = 'active' and archived_at is null));
create policy "reward_ledger_select_own" on public.reward_ledger_entries for select to authenticated using ((select auth.uid()) = user_id);
create policy "reward_ledger_insert_valid_challenge" on public.reward_ledger_entries for insert to authenticated with check ((select auth.uid()) = user_id and entry_type = 'challenge_reward' and source_type = 'challenge' and exists (select 1 from public.challenges where id = source_id and user_id = (select auth.uid()) and status = 'completed' and reward_coins = amount));
grant select, insert, update on public.challenges, public.challenge_progress_logs to authenticated;
grant select, insert on public.reward_ledger_entries to authenticated;

create function public.complete_challenge_with_reward(p_challenge_id uuid)
returns uuid language plpgsql security invoker set search_path = public as $$
declare v_challenge public.challenges%rowtype; v_progress numeric; v_ledger_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into v_challenge from public.challenges where id = p_challenge_id and user_id = auth.uid() for update;
  if v_challenge.id is null or v_challenge.archived_at is not null then raise exception 'challenge unavailable'; end if;
  if v_challenge.status = 'completed' then
    if v_challenge.reward_coins = 0 then return v_challenge.id; end if;
    select id into v_ledger_id from public.reward_ledger_entries where user_id = auth.uid() and entry_type = 'challenge_reward' and source_type = 'challenge' and source_id = v_challenge.id;
    if v_ledger_id is null then raise exception 'completed challenge reward missing'; end if;
    return v_ledger_id;
  end if;
  if v_challenge.status <> 'active' then raise exception 'challenge is not active'; end if;
  select coalesce(sum(increment), 0) into v_progress from public.challenge_progress_logs where challenge_id = v_challenge.id and user_id = auth.uid() and archived_at is null;
  if v_progress < v_challenge.target_value then raise exception 'challenge target not reached'; end if;
  update public.challenges set status = 'completed', completed_at = now() where id = v_challenge.id and user_id = auth.uid();
  if v_challenge.reward_coins = 0 then return v_challenge.id; end if;
  insert into public.reward_ledger_entries (user_id, amount, entry_type, source_type, source_id, description)
  values (auth.uid(), v_challenge.reward_coins, 'challenge_reward', 'challenge', v_challenge.id, 'Challenge reward: ' || v_challenge.title)
  on conflict (entry_type, source_type, source_id) do nothing
  returning id into v_ledger_id;
  if v_ledger_id is null then
    select id into v_ledger_id from public.reward_ledger_entries where user_id = auth.uid() and entry_type = 'challenge_reward' and source_type = 'challenge' and source_id = v_challenge.id;
  end if;
  return v_ledger_id;
end; $$;
revoke all on function public.complete_challenge_with_reward(uuid) from public;
grant execute on function public.complete_challenge_with_reward(uuid) to authenticated;
