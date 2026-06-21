import { cn } from "@/lib/cn";
import { RecipeImage } from "../meal-planner/recipe-image";
import type { Recipe } from "../meal-planner/meal-planner-types";
import { mealTypeLabels } from "../meal-planner/meal-planner-utils";
import { RecipeReadinessBadge } from "./recipe-readiness-badge";
import {
  getRecipeReadiness,
  getRecipeTotalMinutes,
  getTagLabel,
} from "./recipe-utils";

export function RecipeCard({
  recipe,
  selected,
  onSelect,
}: Readonly<{
  recipe: Recipe;
  selected: boolean;
  onSelect: (recipeId: string) => void;
}>) {
  const readiness = getRecipeReadiness(recipe);
  const totalMinutes = getRecipeTotalMinutes(recipe);
  const visibleTags = recipe.tags.slice(0, 3);

  return (
    <button
      aria-pressed={selected}
      className={cn(
        "group flex min-h-[104px] w-full min-w-0 flex-col rounded-[12px] border bg-[rgba(14,23,38,.70)] p-2.5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
        selected
          ? "border-[rgba(217,146,79,.48)] shadow-[inset_3px_0_0_rgba(217,146,79,.88)]"
          : "border-[var(--border-subtle)] hover:border-[rgba(217,146,79,.34)]",
      )}
      onClick={() => onSelect(recipe.id)}
      type="button"
    >
      <div className="flex min-w-0 gap-2.5">
        <RecipeImage recipe={recipe} variant="compact" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="line-clamp-1 text-[13px] font-semibold leading-5 text-[var(--text-primary)]">
                {recipe.title || "Untitled recipe"}
              </h3>
              <div className="mt-1 flex flex-wrap gap-1">
                {recipe.mealTypes.map((mealType) => (
                  <span
                    className="inline-flex min-h-5 items-center rounded-full border border-[rgba(217,146,79,.24)] bg-[rgba(217,146,79,.08)] px-1.5 text-[8px] font-semibold text-[var(--text-secondary)]"
                    key={mealType}
                  >
                    {mealTypeLabels[mealType]}
                  </span>
                ))}
                {visibleTags.map((tag) => (
                  <span
                    className="inline-flex min-h-5 items-center rounded-full border border-[var(--border-subtle)] bg-[rgba(168,183,204,.05)] px-1.5 text-[8px] font-semibold text-[var(--text-muted)]"
                    key={tag}
                  >
                    {getTagLabel(tag)}
                  </span>
                ))}
                {recipe.tags.length > visibleTags.length ? (
                  <span className="inline-flex min-h-5 items-center text-[9px] text-[var(--text-faint)]">
                    +{recipe.tags.length - visibleTags.length}
                  </span>
                ) : null}
              </div>
            </div>
            <RecipeReadinessBadge compact dense readiness={readiness} />
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-[var(--border-subtle)] pt-2 text-[10px] font-semibold text-[var(--text-muted)]">
        <span>{Math.round(recipe.totals.calories)} kcal</span>
        <span>{Math.round(recipe.totals.protein)}g protein</span>
        <span>{Math.round(recipe.totals.carbs)}g carbs</span>
        <span>{Math.round(recipe.totals.fat)}g fat</span>
        <span>{totalMinutes} min total</span>
      </div>
    </button>
  );
}
