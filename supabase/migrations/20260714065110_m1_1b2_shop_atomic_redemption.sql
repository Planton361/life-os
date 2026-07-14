create table public.shop_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  description text,
  category text,
  cost_coins integer not null check (cost_coins > 0),
  is_paused boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shop_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shop_item_id uuid not null references public.shop_items(id) on delete restrict,
  title_snapshot text not null check (length(btrim(title_snapshot)) > 0),
  cost_coins integer not null check (cost_coins > 0),
  request_key uuid not null,
  redeemed_at timestamptz not null default now(),
  unique (user_id, request_key)
);

alter table public.reward_ledger_entries drop constraint reward_ledger_amount_check;
alter table public.reward_ledger_entries drop constraint reward_ledger_type_check;
alter table public.reward_ledger_entries drop constraint reward_ledger_source_check;
alter table public.reward_ledger_entries
  add constraint reward_ledger_amount_check check (amount <> 0),
  add constraint reward_ledger_type_check check (entry_type in ('challenge_reward', 'shop_redemption')),
  add constraint reward_ledger_source_check check (
    (entry_type = 'challenge_reward' and source_type = 'challenge' and amount > 0)
    or (entry_type = 'shop_redemption' and source_type = 'shop_redemption' and amount < 0)
  );

create index shop_items_user_state_idx on public.shop_items(user_id, archived_at, is_paused, updated_at desc, id);
create index shop_redemptions_user_redeemed_idx on public.shop_redemptions(user_id, redeemed_at desc, id desc);
create index shop_redemptions_item_idx on public.shop_redemptions(shop_item_id, redeemed_at desc);
create trigger shop_items_set_updated_at before update on public.shop_items for each row execute function public.set_updated_at();

alter table public.shop_items enable row level security;
alter table public.shop_redemptions enable row level security;
create policy shop_items_select_own on public.shop_items for select to authenticated using ((select auth.uid()) = user_id);
create policy shop_items_insert_own on public.shop_items for insert to authenticated with check ((select auth.uid()) = user_id);
create policy shop_items_update_own on public.shop_items for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy shop_redemptions_select_own on public.shop_redemptions for select to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update on public.shop_items to authenticated;
grant select on public.shop_redemptions to authenticated;

create function public.redeem_shop_item(p_shop_item_id uuid, p_request_key uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_item public.shop_items%rowtype;
  v_existing public.shop_redemptions%rowtype;
  v_balance bigint;
  v_redemption_id uuid;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('shop-redemption:' || v_user::text, 0));

  select * into v_existing from public.shop_redemptions
  where user_id = v_user and request_key = p_request_key;
  if v_existing.id is not null then
    if v_existing.shop_item_id <> p_shop_item_id then raise exception 'request key belongs to another item'; end if;
    return v_existing.id;
  end if;

  select * into v_item from public.shop_items
  where id = p_shop_item_id and user_id = v_user for update;
  if v_item.id is null or v_item.archived_at is not null or v_item.is_paused then
    raise exception 'shop item unavailable';
  end if;

  select coalesce(sum(amount), 0) into v_balance
  from public.reward_ledger_entries where user_id = v_user;
  if v_balance < v_item.cost_coins then raise exception 'insufficient coin balance'; end if;

  insert into public.shop_redemptions(user_id, shop_item_id, title_snapshot, cost_coins, request_key)
  values (v_user, v_item.id, v_item.title, v_item.cost_coins, p_request_key)
  returning id into v_redemption_id;

  insert into public.reward_ledger_entries(user_id, amount, entry_type, source_type, source_id, description)
  values (v_user, -v_item.cost_coins, 'shop_redemption', 'shop_redemption', v_redemption_id, 'Shop redemption: ' || v_item.title);
  return v_redemption_id;
end; $$;

revoke all on function public.redeem_shop_item(uuid, uuid) from public;
grant execute on function public.redeem_shop_item(uuid, uuid) to authenticated;
