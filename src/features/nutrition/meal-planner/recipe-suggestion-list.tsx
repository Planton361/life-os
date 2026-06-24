import { accentStyle } from "@/components/layout/route-page-primitives";
import { cn } from "@/lib/cn";
import { RecipeImage } from "./recipe-image";
import {
  chipButtonClass,
  inputClass,
  PlannerPanel,
  PlannerPill,
  primaryButtonClass,
  quietButtonClass,
  secondaryButtonClass,
} from "./meal-planner-primitives";
import type {
  MealPlanDay,
  MealType,
  NutritionMacroTarget,
  Recipe,
  RecipeFilter,
  RecipeSort,
  SelectedMealSlot,
} from "./meal-planner-types";
import {
  calculateRecipeFit,
  filterRecipes,
  formatMacro,
  mealTypeLabels,
  macroUnits,
  sortRecipes,
} from "./meal-planner-utils";

const recipeFilters: readonly {
  label: string;
  value: RecipeFilter;
}[] = [
  { label: "All", value: "all" },
  { label: "High protein", value: "high-protein" },
  { label: "Low carb", value: "low-carb" },
  { label: "Quick", value: "quick" },
  { label: "Meal prep", value: "meal-prep" },
  { label: "Vegetarian", value: "vegetarian" },
];

const recipeSorts: readonly {
  label: string;
  value: RecipeSort;
}[] = [
  { label: "Best fit", value: "best-fit" },
  { label: "Protein", value: "protein" },
  { label: "Calories", value: "calories" },
  { label: "Recently used", value: "recent" },
];

export function RecipeSuggestionList({
  recipes,
  dayTotals,
  targets,
  selectedSlot,
  selectedDay,
  selectedSlotHasPlannedMeal,
  filter,
  sort,
  query,
  onFilterChange,
  onSortChange,
  onQueryChange,
  onAddRecipe,
  onPreviewRecipe,
}: Readonly<{
  recipes: readonly Recipe[];
  dayTotals: NutritionMacroTarget;
  targets: NutritionMacroTarget;
  selectedSlot: SelectedMealSlot | null;
  selectedDay: MealPlanDay | null;
  selectedSlotHasPlannedMeal: boolean;
  filter: RecipeFilter;
  sort: RecipeSort;
  query: string;
  onFilterChange: (filter: RecipeFilter) => void;
  onSortChange: (sort: RecipeSort) => void;
  onQueryChange: (query: string) => void;
  onAddRecipe: (recipeId: string) => void;
  onPreviewRecipe: (recipeId: string) => void;
}>) {
  const selectedMealType = selectedSlot?.mealType ?? null;
  const panelSubtitle = selectedSlot && selectedDay
    ? `Best matches for ${selectedDay.label} - ${mealTypeLabels[selectedSlot.mealType]}`
    : "Select a slot to get meal-specific suggestions.";
  const actionLabel = selectedSlotHasPlannedMeal ? "Replace" : "Add to slot";
  const fits = new Map(
    recipes.map((recipe) => [
      recipe.id,
      calculateRecipeFit(recipe, dayTotals, targets, selectedMealType),
    ]),
  );
  const visibleRecipes = sortRecipes(
    filterRecipes(recipes, filter, query),
    sort,
    fits,
    selectedMealType,
  );

  return (
    <PlannerPanel
      bodyClassName="flex min-h-0 flex-1 flex-col gap-3 p-3"
      className="flex h-full min-h-0 flex-col"
      subtitle={panelSubtitle}
      title="Recipe Suggestions"
    >
      <div className="shrink-0">
        <label className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">
          Recipe search
          <input
            className={cn(inputClass, "mt-2")}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search recipes or tags"
            type="search"
            value={query}
          />
        </label>
      </div>

      <div className="shrink-0">
        <p className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">
          Filter
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {recipeFilters.map((item, index) => {
            const isActive = filter === item.value;

            return (
              <button
                aria-pressed={isActive}
                className={cn(
                  chipButtonClass,
                  isActive
                    ? "border-[rgba(217,146,79,.42)] bg-[rgba(217,146,79,.14)] text-[var(--text-primary)]"
                    : "border-[var(--border-subtle)] bg-[rgba(168,183,204,.04)] text-[var(--text-secondary)] hover:border-[var(--border-default)]",
                )}
                key={`recipe-filter-${index}`}
                onClick={() => onFilterChange(item.value)}
                type="button"
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="shrink-0">
        <p className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">
          Sort
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {recipeSorts.map((item, index) => {
            const isActive = sort === item.value;

            return (
              <button
                aria-pressed={isActive}
                className={cn(
                  chipButtonClass,
                  isActive
                    ? "border-[rgba(216,180,90,.42)] bg-[rgba(216,180,90,.12)] text-[var(--text-primary)]"
                    : "border-[var(--border-subtle)] bg-[rgba(168,183,204,.04)] text-[var(--text-secondary)] hover:border-[var(--border-default)]",
                )}
                key={`recipe-sort-${index}`}
                onClick={() => onSortChange(item.value)}
                type="button"
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        aria-label="Recipe suggestion list"
        className="min-h-0 flex-1 overflow-y-auto pr-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        tabIndex={0}
      >
        <div className="grid gap-2">
        {visibleRecipes.length > 0 ? (
          visibleRecipes.map((recipe) => {
            const fit =
              fits.get(recipe.id) ??
              calculateRecipeFit(recipe, dayTotals, targets, selectedMealType);
            const isMealTypeMatch = selectedMealType
              ? recipe.mealTypes.includes(selectedMealType)
              : false;

            return (
              <article
                className="rounded-[14px] border border-[color-mix(in_srgb,var(--accent)_18%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_4%,rgba(18,28,43,.68))] p-2.5"
                key={recipe.id}
                style={accentStyle(fit.accent)}
              >
                <div className="flex items-start gap-3">
                  <RecipeImage recipe={recipe} />
                  <div className="min-w-0">
                    <h3 className="text-[13px] font-semibold leading-5 text-[var(--text-primary)]">
                      {recipe.title}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {recipe.mealTypes.map((mealType) => (
                        <MealTypePill
                          key={mealType}
                          mealType={mealType}
                          selected={mealType === selectedMealType}
                        />
                      ))}
                    </div>
                    <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
                      {recipe.prepMinutes ? `${recipe.prepMinutes} min - ` : ""}
                      {recipe.tags.join(" - ")}
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex items-start justify-between gap-3">
                  <p className="text-[11px] leading-4 text-[var(--text-secondary)]">
                    {fit.detail}
                  </p>
                  <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                    <span className="rounded-full border border-[color-mix(in_srgb,var(--accent)_26%,transparent)] bg-[color-mix(in_srgb,var(--accent)_9%,transparent)] px-2 py-1 text-[9px] font-semibold text-[var(--text-secondary)]">
                      {fit.label}
                    </span>
                    {selectedMealType ? (
                      <span className="text-[9px] font-semibold text-[var(--text-muted)]">
                        {isMealTypeMatch ? "Meal type first" : "Other option"}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2 text-[10px]">
                  <MacroMini label="kcal" value={formatMacro(recipe.totals.calories, "kcal")} />
                  <MacroMini
                    label="Protein"
                    value={formatMacro(recipe.totals.protein, macroUnits.protein)}
                  />
                  <MacroMini
                    label="Carbs"
                    value={formatMacro(recipe.totals.carbs, macroUnits.carbs)}
                  />
                  <MacroMini label="Fat" value={formatMacro(recipe.totals.fat, macroUnits.fat)} />
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    className={primaryButtonClass}
                    disabled={!selectedSlot}
                    onClick={() => onAddRecipe(recipe.id)}
                    type="button"
                  >
                    {selectedSlot ? actionLabel : "Select slot first"}
                  </button>
                  {selectedSlot ? (
                    <button
                      className={secondaryButtonClass}
                      onClick={() => onPreviewRecipe(recipe.id)}
                      type="button"
                    >
                      Preview impact
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-[14px] border border-dashed border-[var(--border-subtle)] bg-[rgba(168,183,204,.04)] p-4">
            <p className="text-[13px] font-semibold text-[var(--text-primary)]">
              No recipes match this filter
            </p>
            <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
              Clear search or use All to return to the typed mock Recipe List.
            </p>
            <button
              className={quietButtonClass}
              onClick={() => {
                onFilterChange("all");
                onQueryChange("");
              }}
              type="button"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>
      </div>
    </PlannerPanel>
  );
}

function MealTypePill({
  mealType,
  selected,
}: Readonly<{
  mealType: MealType;
  selected: boolean;
}>) {
  return (
    <PlannerPill
      accent={selected ? "var(--accent-orange)" : "var(--accent-yellow)"}
      quiet={!selected}
    >
      {mealTypeLabels[mealType]}
    </PlannerPill>
  );
}

function MacroMini({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <div className="rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.36)] p-2">
      <p className="text-[9px] text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 truncate text-[10px] font-semibold text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}
