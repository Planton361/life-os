create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  name text not null,
  quantity numeric,
  unit text,
  note text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_ingredients_name_not_blank check (length(btrim(name)) > 0),
  constraint recipe_ingredients_quantity_positive check (
    quantity is null or quantity > 0
  ),
  constraint recipe_ingredients_position_nonnegative check (position >= 0),
  constraint recipe_ingredients_unit_not_blank check (
    unit is null or length(btrim(unit)) > 0
  ),
  constraint recipe_ingredients_note_not_blank check (
    note is null or length(btrim(note)) > 0
  )
);

comment on table public.recipe_ingredients is
  'User-scoped recipe ingredient rows. No global ingredient catalog, grocery generation, nutrition calculation or external food source.';
comment on column public.recipe_ingredients.quantity is
  'Optional positive quantity. Null supports entries such as salt to taste.';
comment on column public.recipe_ingredients.unit is
  'Optional free-text unit such as g, ml, EL, TL or Stueck. No automatic conversion.';
comment on column public.recipe_ingredients.position is
  'Manual ordering field within a recipe.';

create index recipe_ingredients_user_recipe_position_idx
  on public.recipe_ingredients (user_id, recipe_id, position, created_at);

create index recipe_ingredients_user_created_idx
  on public.recipe_ingredients (user_id, created_at desc);

create index recipe_ingredients_recipe_idx
  on public.recipe_ingredients (recipe_id);

create trigger recipe_ingredients_set_updated_at
  before update on public.recipe_ingredients
  for each row
  execute function public.set_updated_at();

alter table public.recipe_ingredients enable row level security;

create policy "Users can select own recipe ingredients"
on public.recipe_ingredients for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own active recipe ingredients"
on public.recipe_ingredients for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.recipes
    where recipes.id = recipe_ingredients.recipe_id
      and recipes.user_id = recipe_ingredients.user_id
      and recipes.is_archived = false
  )
);

create policy "Users can update own active recipe ingredients"
on public.recipe_ingredients for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.recipes
    where recipes.id = recipe_ingredients.recipe_id
      and recipes.user_id = recipe_ingredients.user_id
      and recipes.is_archived = false
  )
);

create policy "Users can delete own recipe ingredients"
on public.recipe_ingredients for delete
to authenticated
using ((select auth.uid()) = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.recipe_ingredients to authenticated;
