-- N1: a Meal records the number of Recipe servings actually planned/eaten.
-- Recipe ingredients and optional nutrition estimates remain recipe-scoped;
-- this value is the only deterministic scale factor for their projections.
alter table public.meals
  add column if not exists servings numeric(8, 2) not null default 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'meals_servings_positive'
      and conrelid = 'public.meals'::regclass
  ) then
    alter table public.meals
      add constraint meals_servings_positive check (servings > 0 and servings <= 100);
  end if;
end;
$$;

comment on column public.meals.servings is
  'Number of recipe servings represented by this concrete meal. Recipe ingredients and recipe-scoped estimates are scaled by servings / recipes.servings; unknown recipe nutrition remains unknown.';
