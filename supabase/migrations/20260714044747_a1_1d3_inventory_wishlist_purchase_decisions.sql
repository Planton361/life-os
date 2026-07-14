create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category text not null,
  priority text not null default 'medium',
  expected_price numeric,
  currency text,
  target_date date,
  status text not null default 'considering',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wishlist_items_title_not_blank check (length(btrim(title)) > 0),
  constraint wishlist_items_category_not_blank check (length(btrim(category)) > 0),
  constraint wishlist_items_priority_check check (priority in ('low', 'medium', 'high')),
  constraint wishlist_items_status_check check (status in ('considering', 'planned', 'approved', 'acquired', 'rejected')),
  constraint wishlist_items_price_check check (expected_price is null or expected_price >= 0),
  constraint wishlist_items_currency_check check (currency is null or currency ~ '^[A-Z]{3}$'),
  constraint wishlist_items_money_pair_check check ((expected_price is null) = (currency is null))
);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_wishlist_item_id uuid references public.wishlist_items(id) on delete set null,
  name text not null,
  category text not null,
  description text,
  quantity numeric,
  unit text,
  acquired_on date,
  location text,
  condition text,
  acquisition_value numeric,
  currency text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_items_name_not_blank check (length(btrim(name)) > 0),
  constraint inventory_items_category_not_blank check (length(btrim(category)) > 0),
  constraint inventory_items_quantity_check check (quantity is null or quantity > 0),
  constraint inventory_items_unit_pair_check check ((quantity is null and unit is null) or (quantity is not null and unit is not null and length(btrim(unit)) > 0)),
  constraint inventory_items_condition_check check (condition is null or condition in ('new', 'good', 'used', 'damaged', 'retired')),
  constraint inventory_items_value_check check (acquisition_value is null or acquisition_value >= 0),
  constraint inventory_items_currency_check check (currency is null or currency ~ '^[A-Z]{3}$'),
  constraint inventory_items_money_pair_check check ((acquisition_value is null) = (currency is null)),
  unique (source_wishlist_item_id)
);

create table public.purchase_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wishlist_item_id uuid not null references public.wishlist_items(id) on delete restrict,
  inventory_item_id uuid references public.inventory_items(id) on delete set null,
  decision_date date not null,
  context text not null,
  criteria text,
  decision text not null,
  rationale text not null,
  status text not null default 'open',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint purchase_decisions_context_not_blank check (length(btrim(context)) > 0),
  constraint purchase_decisions_decision_not_blank check (length(btrim(decision)) > 0),
  constraint purchase_decisions_rationale_not_blank check (length(btrim(rationale)) > 0),
  constraint purchase_decisions_status_check check (status in ('open', 'decided_buy', 'decided_skip', 'deferred'))
);

create index wishlist_items_user_updated_idx on public.wishlist_items (user_id, updated_at desc, created_at desc);
create index inventory_items_user_updated_idx on public.inventory_items (user_id, updated_at desc, created_at desc);
create index purchase_decisions_user_wishlist_updated_idx on public.purchase_decisions (user_id, wishlist_item_id, updated_at desc);

create trigger wishlist_items_set_updated_at before update on public.wishlist_items for each row execute function public.set_updated_at();
create trigger inventory_items_set_updated_at before update on public.inventory_items for each row execute function public.set_updated_at();
create trigger purchase_decisions_set_updated_at before update on public.purchase_decisions for each row execute function public.set_updated_at();

alter table public.wishlist_items enable row level security;
alter table public.inventory_items enable row level security;
alter table public.purchase_decisions enable row level security;

create policy "wishlist_items_select_own" on public.wishlist_items for select to authenticated using ((select auth.uid()) = user_id);
create policy "wishlist_items_insert_own" on public.wishlist_items for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "wishlist_items_update_own" on public.wishlist_items for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "inventory_items_select_own" on public.inventory_items for select to authenticated using ((select auth.uid()) = user_id);
create policy "inventory_items_insert_own" on public.inventory_items for insert to authenticated with check ((select auth.uid()) = user_id and (source_wishlist_item_id is null or exists (select 1 from public.wishlist_items where id = source_wishlist_item_id and user_id = (select auth.uid()))));
create policy "inventory_items_update_own" on public.inventory_items for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and (source_wishlist_item_id is null or exists (select 1 from public.wishlist_items where id = source_wishlist_item_id and user_id = (select auth.uid()))));
create policy "purchase_decisions_select_own" on public.purchase_decisions for select to authenticated using ((select auth.uid()) = user_id);
create policy "purchase_decisions_insert_own" on public.purchase_decisions for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.wishlist_items where id = wishlist_item_id and user_id = (select auth.uid())) and (inventory_item_id is null or exists (select 1 from public.inventory_items where id = inventory_item_id and user_id = (select auth.uid()))));
create policy "purchase_decisions_update_own" on public.purchase_decisions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and exists (select 1 from public.wishlist_items where id = wishlist_item_id and user_id = (select auth.uid())) and (inventory_item_id is null or exists (select 1 from public.inventory_items where id = inventory_item_id and user_id = (select auth.uid()))));

grant select, insert, update on public.wishlist_items, public.inventory_items, public.purchase_decisions to authenticated;

create function public.convert_wishlist_item_to_inventory(p_wishlist_item_id uuid)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_wishlist public.wishlist_items%rowtype;
  v_inventory_id uuid;
begin
  select * into v_wishlist from public.wishlist_items
  where id = p_wishlist_item_id and user_id = auth.uid() and archived_at is null
  for update;
  if v_wishlist.id is null then raise exception 'Wishlist item unavailable'; end if;

  select id into v_inventory_id from public.inventory_items
  where source_wishlist_item_id = v_wishlist.id and user_id = auth.uid();

  if v_inventory_id is null then
    insert into public.inventory_items (user_id, source_wishlist_item_id, name, category, description, acquisition_value, currency)
    values (auth.uid(), v_wishlist.id, v_wishlist.title, v_wishlist.category, v_wishlist.description, v_wishlist.expected_price, v_wishlist.currency)
    returning id into v_inventory_id;
  end if;

  update public.wishlist_items set status = 'acquired' where id = v_wishlist.id and user_id = auth.uid();
  update public.purchase_decisions set inventory_item_id = v_inventory_id
  where wishlist_item_id = v_wishlist.id and user_id = auth.uid() and inventory_item_id is null;
  return v_inventory_id;
end;
$$;

revoke all on function public.convert_wishlist_item_to_inventory(uuid) from public;
grant execute on function public.convert_wishlist_item_to_inventory(uuid) to authenticated;
