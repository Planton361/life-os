import {
  inputClass,
  primaryButtonClass,
  quietButtonClass,
  secondaryButtonClass,
} from "./meal-planner-primitives";
import { RecipeImage } from "./recipe-image";
import type {
  IngredientAdjustment,
  MealType,
  NutritionMacroTarget,
  PlannedMeal,
  Recipe,
} from "./meal-planner-types";
import {
  formatMacro,
  macroUnits,
  mealTypeLabels,
} from "./meal-planner-utils";

function adjustedAmount(
  ingredientId: string,
  baseAmount: number,
  servings: number,
  defaultServings: number,
  adjustments: readonly IngredientAdjustment[],
) {
  return (
    adjustments.find((adjustment) => adjustment.ingredientId === ingredientId)
      ?.amount ?? baseAmount * (servings / defaultServings)
  );
}

export function SelectedRecipePanel({
  recipe,
  plannedMeal,
  totals,
  ingredientErrors,
  onServingsChange,
  onIngredientAmountChange,
  onApplyChanges,
  onReplaceRecipe,
  onClearSlot,
  onResetIngredientChanges,
}: Readonly<{
  recipe: Recipe;
  plannedMeal: PlannedMeal;
  totals: NutritionMacroTarget;
  ingredientErrors: Readonly<Record<string, string | undefined>>;
  onServingsChange: (servings: number) => void;
  onIngredientAmountChange: (ingredientId: string, amount: number) => void;
  onApplyChanges: () => void;
  onReplaceRecipe: () => void;
  onClearSlot: () => void;
  onResetIngredientChanges: () => void;
}>) {
  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
      <div className="grid content-start gap-3">
        <div className="flex gap-3">
          <RecipeImage recipe={recipe} />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">
              Selected recipe
            </p>
            <h3 className="mt-1 text-[18px] font-semibold leading-6 text-[var(--text-primary)]">
              {recipe.title}
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {recipe.mealTypes.map((mealType) => (
                <MealTypeBadge
                  key={mealType}
                  mealType={mealType}
                  selected={mealType === plannedMeal.mealType}
                />
              ))}
            </div>
            <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
              Planned as {mealTypeLabels[plannedMeal.mealType]} -{" "}
              {recipe.tags.join(" - ")}
            </p>
          </div>
        </div>

        <label className="block text-[10px] font-semibold uppercase text-[var(--text-muted)]">
          Servings / Portion
          <input
            className={`${inputClass} mt-1 min-h-9`}
            min="0.25"
            onChange={(event) => onServingsChange(Number(event.target.value))}
            step="0.25"
            type="number"
            value={plannedMeal.servings}
          />
        </label>

        <div className="grid grid-cols-2 gap-2 2xl:grid-cols-4">
          <MacroCard label="Calories" value={formatMacro(totals.calories, "kcal")} />
          <MacroCard
            label="Protein"
            value={formatMacro(totals.protein, macroUnits.protein)}
          />
          <MacroCard
            label="Carbs"
            value={formatMacro(totals.carbs, macroUnits.carbs)}
          />
          <MacroCard label="Fat" value={formatMacro(totals.fat, macroUnits.fat)} />
        </div>

        <div className="flex flex-wrap gap-2">
          <button className={primaryButtonClass} onClick={onApplyChanges} type="button">
            Apply changes
          </button>
          <button
            className={secondaryButtonClass}
            onClick={onReplaceRecipe}
            type="button"
          >
            Replace recipe
          </button>
          <button className={quietButtonClass} onClick={onClearSlot} type="button">
            Clear slot
          </button>
        </div>
      </div>

      <div className="min-h-0">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">
            Ingredients
          </p>
          <button
            className={quietButtonClass}
            onClick={onResetIngredientChanges}
            type="button"
          >
            Reset ingredient changes
          </button>
        </div>

        <div
          aria-label="Ingredient adjustment list"
          className="mt-2 grid max-h-[180px] gap-2 overflow-y-auto pr-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
          tabIndex={0}
        >
          {recipe.ingredients.map((ingredient) => {
            const amount = adjustedAmount(
              ingredient.id,
              ingredient.amount,
              plannedMeal.servings,
              recipe.defaultServings,
              plannedMeal.ingredientAdjustments,
            );
            const error = ingredientErrors[ingredient.id];

            return (
              <label
                className="grid gap-1.5 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.50)] p-2.5"
                key={ingredient.id}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                    {ingredient.name}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {ingredient.unit}
                  </span>
                </span>
                <input
                  aria-invalid={Boolean(error)}
                  className={`${inputClass} min-h-9`}
                  min="0"
                  onChange={(event) =>
                    onIngredientAmountChange(
                      ingredient.id,
                      Number(event.target.value),
                    )
                  }
                  step={ingredient.unit === "piece" ? "1" : "5"}
                  type="number"
                  value={Number(amount.toFixed(1))}
                />
                {error ? (
                  <span className="text-[10px] leading-4 text-[var(--accent-red)]">
                    {error}
                  </span>
                ) : null}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MealTypeBadge({
  mealType,
  selected,
}: Readonly<{
  mealType: MealType;
  selected: boolean;
}>) {
  return (
    <span
      className={
        selected
          ? "inline-flex min-h-7 items-center rounded-full border border-[rgba(217,146,79,.32)] bg-[rgba(217,146,79,.12)] px-2.5 text-[10px] font-semibold text-[var(--text-secondary)]"
          : "inline-flex min-h-7 items-center rounded-full border border-[var(--border-subtle)] bg-[rgba(168,183,204,.05)] px-2.5 text-[10px] font-semibold text-[var(--text-muted)]"
      }
    >
      {mealTypeLabels[mealType]}
    </span>
  );
}

function MacroCard({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <article className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.38)] p-2.5">
      <p className="text-[10px] font-semibold text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-[15px] font-semibold leading-5 text-[var(--text-primary)]">
        {value}
      </p>
    </article>
  );
}
