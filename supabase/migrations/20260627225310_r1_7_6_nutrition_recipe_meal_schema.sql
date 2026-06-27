create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area_id uuid references public.areas(id) on delete set null,
  title text not null,
  summary text,
  instructions text,
  servings integer,
  prep_minutes integer,
  tags jsonb not null default '[]'::jsonb,
  nutrition_estimate jsonb,
  source text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipes_title_not_blank check (length(btrim(title)) > 0),
  constraint recipes_servings_range check (
    servings is null or (servings >= 1 and servings <= 100)
  ),
  constraint recipes_prep_minutes_range check (
    prep_minutes is null or (prep_minutes >= 0 and prep_minutes <= 1440)
  ),
  constraint recipes_tags_array check (jsonb_typeof(tags) = 'array'),
  constraint recipes_nutrition_estimate_object check (
    nutrition_estimate is null
    or jsonb_typeof(nutrition_estimate) = 'object'
  )
);

comment on table public.recipes is
  'Reusable nutrition recipe templates. R1.7.6B stores rough optional nutrition estimates only, not a food database.';
comment on column public.recipes.nutrition_estimate is
  'Optional rough estimate object. Not medical advice and not an external nutrition database result.';
comment on column public.recipes.is_archived is
  'Soft archive flag. Archived recipes remain referenceable by existing meals.';

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid references public.recipes(id) on delete set null,
  date date not null,
  meal_type text not null,
  title text not null,
  planned_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meals_title_not_blank check (length(btrim(title)) > 0),
  constraint meals_meal_type_valid check (
    meal_type in ('breakfast', 'lunch', 'dinner', 'snack', 'other')
  )
);

comment on table public.meals is
  'Concrete user-local meal rows for planning and logging. Meal plans are derived from future meals; nutrition logs are derived from completed_at and notes.';
comment on column public.meals.date is
  'User-local meal date. Do not derive this from UTC timestamp slices.';
comment on column public.meals.recipe_id is
  'Optional recipe reference. Repository/actions must validate same-user ownership when this is set.';
comment on column public.meals.notes is
  'Private health/lifestyle context; do not use for external analysis or medical recommendations.';

create index recipes_user_archived_idx
  on public.recipes (user_id, is_archived);

create index recipes_user_created_idx
  on public.recipes (user_id, created_at desc);

create index meals_user_date_idx
  on public.meals (user_id, date);

create index meals_user_date_type_idx
  on public.meals (user_id, date, meal_type);

create index meals_user_recipe_idx
  on public.meals (user_id, recipe_id);

create trigger recipes_set_updated_at
  before update on public.recipes
  for each row
  execute function public.set_updated_at();

create trigger meals_set_updated_at
  before update on public.meals
  for each row
  execute function public.set_updated_at();

alter table public.recipes enable row level security;
alter table public.meals enable row level security;

create policy "Users can select own recipes"
on public.recipes for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own recipes"
on public.recipes for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own recipes"
on public.recipes for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete own recipes"
on public.recipes for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can select own meals"
on public.meals for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own meals"
on public.meals for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own meals"
on public.meals for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete own meals"
on public.meals for delete
to authenticated
using ((select auth.uid()) = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.recipes to authenticated;
grant select, insert, update, delete on table public.meals to authenticated;
