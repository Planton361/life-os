import type { MealType, Recipe } from "../meal-planner/meal-planner-types";
import { inputClass, PlannerPanel } from "../meal-planner/meal-planner-primitives";
import { mealTypes, mealTypeLabels } from "../meal-planner/meal-planner-utils";
import { RecipeCard } from "./recipe-card";
import {
  readinessFilterLabels,
  recipeTagLabels,
  recipeTagOptions,
  type ReadinessFilter,
  type RecipeTag,
} from "./recipe-utils";
import { cn } from "@/lib/cn";

type MealTypeFilter = MealType | "all";
type TagFilter = RecipeTag | "all";

function FilterButton({
  active,
  children,
  onClick,
}: Readonly<{
  active: boolean;
  children: string;
  onClick: () => void;
}>) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border px-2.5 text-[10px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] xl:min-h-8",
        active
          ? "border-[rgba(217,146,79,.42)] bg-[rgba(217,146,79,.14)] text-[var(--text-primary)]"
          : "border-[var(--border-subtle)] bg-[rgba(18,28,43,.62)] text-[var(--text-muted)] hover:border-[var(--border-default)] hover:text-[var(--text-secondary)]",
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function RecipeBrowser({
  sort,
  onSortChange,
  recipes,
  query,
  mealType,
  tag,
  readiness,
  selectedRecipeId,
  stateAttributes,
  onQueryChange,
  onMealTypeChange,
  onTagChange,
  onReadinessChange,
  onSelectRecipe,
}: Readonly<{
  sort: string;
  onSortChange: (sort: string) => void;
  recipes: readonly Recipe[];
  query: string;
  mealType: MealTypeFilter;
  tag: TagFilter;
  readiness: ReadinessFilter;
  selectedRecipeId: string | null;
  stateAttributes?: Record<string, string>;
  onQueryChange: (query: string) => void;
  onMealTypeChange: (mealType: MealTypeFilter) => void;
  onTagChange: (tag: TagFilter) => void;
  onReadinessChange: (readiness: ReadinessFilter) => void;
  onSelectRecipe: (recipeId: string) => void;
}>) {
  return (
    <PlannerPanel
      badge={
        <span className="inline-flex min-h-6 items-center rounded-full border border-[var(--border-subtle)] bg-[rgba(168,183,204,.05)] px-2 text-[10px] font-semibold text-[var(--text-muted)]">
          {recipes.length} sichtbar
        </span>
      }
      bodyClassName="flex min-h-0 flex-col gap-3 p-3"
      className="min-h-0 xl:h-full"
      stateAttributes={stateAttributes}
      subtitle="Suchen, filtern und auswählen."
      title="Rezeptbibliothek"
    >
      <label className="text-xs">Sortierung<select aria-label="Sortierung" className={inputClass} value={sort} onChange={e=>onSortChange(e.target.value)}><option value="recent">Zuletzt geändert</option><option value="title">Name</option></select></label>
      <div className="shrink-0 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(14,23,38,.48)] p-2">
        <div className="grid gap-2 xl:grid-cols-1 xl:items-end">
          <label className="block min-w-0">
            <span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
              Suche
            </span>
            <input
              className={cn(inputClass, "xl:min-h-9")}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Name, Tag oder Zutat suchen"
              type="search"
              value={query}
            />
          </label>

          <div className="min-w-0">
            <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
              Mahlzeit
            </p>
            <div className="flex flex-wrap gap-1.5 pb-1">
              <FilterButton active={mealType === "all"} onClick={() => onMealTypeChange("all")}>
                Alle
              </FilterButton>
              {mealTypes.map((type) => (
                <FilterButton
                  active={mealType === type}
                  key={type}
                  onClick={() => onMealTypeChange(type)}
                >
                  {mealTypeLabels[type]}
                </FilterButton>
              ))}
            </div>
          </div>

          <div className="min-w-0">
            <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
              Vollständigkeit
            </p>
            <div className="flex flex-wrap gap-1.5 pb-1">
              {(Object.keys(readinessFilterLabels) as ReadinessFilter[]).map((option) => (
                <FilterButton
                  active={readiness === option}
                  key={option}
                  onClick={() => onReadinessChange(option)}
                >
                  {readinessFilterLabels[option]}
                </FilterButton>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-1 min-w-0">
          <p className="sr-only">Tags</p>
          <div className="flex flex-wrap gap-1.5 pb-1">
            <FilterButton active={tag === "all"} onClick={() => onTagChange("all")}>
              Alle Tags
            </FilterButton>
            {recipeTagOptions.map((option) => (
              <FilterButton
                active={tag === option}
                key={option}
                onClick={() => onTagChange(option)}
              >
                {recipeTagLabels[option]}
              </FilterButton>
            ))}
          </div>
        </div>
      </div>

      <div
        aria-label="Rezeptliste"
        className="grid min-h-0 gap-2 overflow-y-auto pr-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] lg:grid-cols-2 xl:flex-1"
        role="list"
        tabIndex={0}
      >
        {recipes.length > 0 ? (
          recipes.map((recipe) => (
            <div key={recipe.id} role="listitem">
              <RecipeCard
                onSelect={onSelectRecipe}
                recipe={recipe}
                selected={recipe.id === selectedRecipeId}
              />
            </div>
          ))
        ) : (
          <div className="self-start rounded-[14px] border border-dashed border-[var(--border-default)] bg-[rgba(168,183,204,.04)] p-6">
            <p className="text-[16px] font-semibold text-[var(--text-primary)]">
              Noch keine Rezepte
            </p>
            <p className="mt-2 max-w-xl text-[12px] leading-5 text-[var(--text-muted)]">
              Speichere Rezepte, damit Essensplan und Einkauf echte
              Vorschläge erhalten.
            </p>
          </div>
        )}
      </div>
    </PlannerPanel>
  );
}
