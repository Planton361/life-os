import { accentStyle } from "@/components/layout/route-page-primitives";
import { cn } from "@/lib/cn";
import { initialPantryItems } from "../grocery/grocery-mock-data";
import {
  calculateRecipeAvailability,
  mealAvailabilityLabel,
} from "../grocery/grocery-utils";
import type { MealAvailability } from "../grocery/grocery-types";
import { RecipeImage } from "./recipe-image";
import type {
  MealPlanSlot,
  NutritionMacroTarget,
  Recipe,
} from "./meal-planner-types";
import {
  formatMealTypeList,
  formatMacro,
  macroUnits,
  mealTypeLabels,
} from "./meal-planner-utils";

function availabilityClasses(status: MealAvailability["status"]) {
  if (status === "available") {
    return "border-[rgba(66,184,131,.24)] bg-[rgba(66,184,131,.08)] text-[var(--text-secondary)]";
  }

  if (status === "partial") {
    return "border-[rgba(216,180,90,.28)] bg-[rgba(216,180,90,.09)] text-[var(--text-secondary)]";
  }

  return "border-[rgba(223,106,87,.26)] bg-[rgba(223,106,87,.08)] text-[var(--text-secondary)]";
}

export function MealSlotCard({
  slot,
  recipe,
  totals,
  selected,
  statusLine,
  onSelect,
}: Readonly<{
  slot: MealPlanSlot;
  recipe: Recipe | null;
  totals: NutritionMacroTarget | null;
  selected: boolean;
  statusLine: string;
  onSelect: () => void;
}>) {
  const label = mealTypeLabels[slot.mealType];
  const availability =
    recipe && slot.plannedMeal
      ? calculateRecipeAvailability(
          recipe,
          slot.plannedMeal.servings,
          initialPantryItems,
        )
      : null;

  return (
    <button
      aria-pressed={selected}
      className={cn(
        "min-h-[108px] w-full rounded-[14px] border p-2.5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
        selected
          ? "border-[rgba(217,146,79,.56)] bg-[rgba(217,146,79,.12)] shadow-[0_0_0_1px_rgba(217,146,79,.20)]"
          : "border-[var(--border-subtle)] bg-[rgba(18,28,43,.58)] hover:border-[rgba(217,146,79,.30)] hover:bg-[rgba(18,28,43,.76)]",
      )}
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold text-[var(--text-muted)]">
          {label}
        </p>
        <div className="flex flex-wrap justify-end gap-1">
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[9px] font-semibold",
              recipe
                ? "border-[rgba(66,184,131,.24)] bg-[rgba(66,184,131,.08)] text-[var(--text-secondary)]"
                : "border-[var(--border-subtle)] bg-[rgba(168,183,204,.04)] text-[var(--text-muted)]",
            )}
          >
            {recipe ? "Planned" : "Open"}
          </span>
          {availability ? (
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[9px] font-semibold",
                availabilityClasses(availability.status),
              )}
            >
              {mealAvailabilityLabel(
                availability.status,
                availability.missingIngredients.length,
              )}
            </span>
          ) : null}
        </div>
      </div>

      {recipe && totals ? (
        <div className="mt-2 min-w-0">
          <RecipeImage decorative recipe={recipe} variant="strip" />
          <h3 className="text-[13px] font-semibold leading-5 text-[var(--text-primary)]">
            {recipe.title}
          </h3>
          <p className="text-[9px] font-semibold text-[var(--text-muted)]">
            {formatMealTypeList(recipe.mealTypes)}
          </p>
          <p className="mt-1 text-[18px] font-semibold leading-none text-[var(--text-primary)]">
            {formatMacro(totals.calories, "kcal")}
          </p>
          <p className="mt-1 text-[10px] leading-4 text-[var(--text-secondary)]">
            Protein {formatMacro(totals.protein, macroUnits.protein)} - Carbs{" "}
            {formatMacro(totals.carbs, macroUnits.carbs)} - Fat{" "}
            {formatMacro(totals.fat, macroUnits.fat)}
          </p>
          <p
            className="mt-1 border-l-2 border-[var(--accent)] pl-2 text-[10px] leading-4 text-[var(--text-muted)]"
            style={accentStyle("var(--accent-orange)")}
          >
            {statusLine}
          </p>
          {availability?.missingIngredients.length ? (
            <p className="mt-1 text-[10px] leading-4 text-[var(--text-secondary)]">
              Missing:{" "}
              {availability.missingIngredients
                .slice(0, 2)
                .map((ingredient) => ingredient.name)
                .join(", ")}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 flex min-h-[64px] items-center justify-center rounded-[12px] border border-dashed border-[var(--border-subtle)] bg-[rgba(168,183,204,.025)] text-[12px] font-semibold text-[var(--text-secondary)]">
          Add {slot.mealType}
        </div>
      )}
    </button>
  );
}
