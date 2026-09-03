import Link from "next/link";
import { cn } from "@/lib/cn";
import type { MealAvailability } from "../grocery/grocery-types";
import {
  formatGroceryQuantity,
  groceryCategoryLabels,
  ingredientReferenceFor,
  mealAvailabilityLabel,
} from "../grocery/grocery-utils";
import { SelectedRecipePanel } from "./selected-recipe-panel";
import { ManualMealEditForm } from "./manual-meal-edit-form";
import {
  PlannerPanel,
  quietButtonClass,
} from "./meal-planner-primitives";
import type {
  MacroKey,
  MealPlanDay,
  MealPlanSlot,
  NutritionMacroTarget,
  Recipe,
  SelectedMealSlot,
} from "./meal-planner-types";
import {
  formatMacro,
  macroLabels,
  macroUnits,
  mealTypeLabels,
} from "./meal-planner-utils";

export type MealPlannerWeekStatus = {
  plannedMeals: number;
  totalSlots: number;
  openSlots: number;
  daysInTarget: number;
  openProteinGap: number;
  largestProteinGap: string;
  largestDeviation: string;
};

type InspectorStat = {
  label: string;
  value: string;
  detail?: string;
  tone?: "default" | "good" | "warn" | "alert";
};

export function MealPlannerInspector({
  selectedSlot,
  selectedDay,
  selectedSlotData,
  selectedRecipe,
  selectedMealTotals,
  dayTotals,
  targets,
  weekStatus,
  replaceMode,
  ingredientErrors,
  onServingsChange,
  onIngredientAmountChange,
  onApplyChanges,
  onReplaceRecipe,
  onCancelReplace,
  onClearSlot,
  onResetIngredientChanges,
  availability,
  stateAttributes,
  manualEditEnabled,
  recipes,
}: Readonly<{
  selectedSlot: SelectedMealSlot | null;
  selectedDay: MealPlanDay | null;
  selectedSlotData: MealPlanSlot | null;
  selectedRecipe: Recipe | null;
  selectedMealTotals: NutritionMacroTarget | null;
  dayTotals: NutritionMacroTarget | null;
  targets: NutritionMacroTarget;
  weekStatus: MealPlannerWeekStatus;
  replaceMode: boolean;
  ingredientErrors: Readonly<Record<string, string | undefined>>;
  onServingsChange: (servings: number) => void;
  onIngredientAmountChange: (ingredientId: string, amount: number) => void;
  onApplyChanges: () => void;
  onReplaceRecipe: () => void;
  onCancelReplace: () => void;
  onClearSlot: () => void;
  onResetIngredientChanges: () => void;
  availability: Pick<
    MealAvailability,
    "status" | "missingIngredients" | "coveredIngredientCount" | "totalIngredientCount"
  > | null;
  stateAttributes?: Record<string, string>;
  manualEditEnabled: boolean;
  recipes: readonly Recipe[];
}>) {
  const plannedMeal = selectedSlotData?.plannedMeal ?? null;
  const hasSelectedSlot = selectedSlot && selectedDay && selectedSlotData;

  return (
    <PlannerPanel
      bodyClassName="p-3"
      subtitle="Compact slot context, target deltas and local recipe edits."
      stateAttributes={stateAttributes}
      title="Selected Meal / Meal Inspector"
    >
      {!hasSelectedSlot ? (
        <div className="grid gap-3">
          <InspectorIntro
            text="Choose breakfast, lunch or dinner in the week plan to see meal context and suggestions."
            title="Select a meal slot"
          />
          <InspectorStatGrid stats={weekStats(weekStatus)} />
        </div>
      ) : plannedMeal && selectedRecipe && selectedMealTotals ? (
        <div className="grid gap-3">
          {replaceMode ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[rgba(217,146,79,.20)] bg-[rgba(217,146,79,.07)] px-3 py-2">
              <p className="text-[11px] leading-4 text-[var(--text-secondary)]">
                Replacement mode is active. Suggestions on the right are filtered
                for this slot.
              </p>
              <button
                className={quietButtonClass}
                onClick={onCancelReplace}
                type="button"
              >
                Keep recipe
              </button>
            </div>
          ) : null}
          <InspectorStatGrid
            stats={slotStats({
              availability,
              dayTotals,
              planned: true,
              replaceMode,
              selectedSlot,
              targets,
            })}
          />
          <AvailabilityNotice availability={availability} />
          {manualEditEnabled ? (
            <ManualMealEditForm meal={plannedMeal} recipes={recipes} />
          ) : null}
          {!manualEditEnabled ? (
            <SelectedRecipePanel
              ingredientErrors={ingredientErrors}
              onApplyChanges={onApplyChanges}
              onClearSlot={onClearSlot}
              onIngredientAmountChange={onIngredientAmountChange}
              onReplaceRecipe={onReplaceRecipe}
              onResetIngredientChanges={onResetIngredientChanges}
              onServingsChange={onServingsChange}
              plannedMeal={plannedMeal}
              recipe={selectedRecipe}
              totals={selectedMealTotals}
            />
          ) : null}
        </div>
      ) : (
        <div className="grid gap-3">
          <InspectorIntro
            text={`Suggestions on the right are filtered for ${selectedSlot.mealType}.`}
            title={`${selectedDay.label} - ${mealTypeLabels[selectedSlot.mealType]}`}
          />
          <InspectorStatGrid
            stats={slotStats({
              availability: null,
              dayTotals,
              planned: false,
              replaceMode: false,
              selectedSlot,
              targets,
            })}
          />
        </div>
      )}
    </PlannerPanel>
  );
}

function AvailabilityNotice({
  availability,
}: Readonly<{
  availability: Pick<
    MealAvailability,
    "status" | "missingIngredients" | "coveredIngredientCount" | "totalIngredientCount"
  > | null;
}>) {
  if (!availability) {
    return null;
  }

  return (
    <section className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.50)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">
            Pantry availability
          </p>
          <p className="mt-1 text-[13px] font-semibold text-[var(--text-primary)]">
            {mealAvailabilityLabel(
              availability.status,
              availability.missingIngredients.length,
            )}
          </p>
        </div>
        <Link className={quietButtonClass} href="/nutrition/grocery">
          Open grocery
        </Link>
      </div>
      <p className="mt-2 text-[10px] leading-4 text-[var(--text-muted)]">
        {availability.coveredIngredientCount}/{availability.totalIngredientCount}{" "}
        ingredients covered by the current mock pantry estimate.
      </p>
      {availability.missingIngredients.length > 0 ? (
        <div
          aria-label="Missing ingredients for selected meal"
          className="mt-2 grid gap-1.5"
        >
          {availability.missingIngredients.slice(0, 4).map((ingredient) => {
            const reference = ingredientReferenceFor(ingredient.name, ingredient.unit);

            return (
              <div
                className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(168,183,204,.04)] px-2.5 py-2"
                key={`${ingredient.ingredientId}-${ingredient.unit}`}
              >
                <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                  {ingredient.name}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  {groceryCategoryLabels[reference.category]} -{" "}
                  {formatGroceryQuantity(
                    ingredient.missingQuantity,
                    ingredient.unit,
                  )}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function InspectorIntro({
  title,
  text,
}: Readonly<{
  title: string;
  text: string;
}>) {
  return (
    <div className="rounded-[12px] border border-dashed border-[var(--border-subtle)] bg-[rgba(168,183,204,.04)] px-3 py-2.5">
      <p className="text-[14px] font-semibold text-[var(--text-primary)]">
        {title}
      </p>
      <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
        {text}
      </p>
    </div>
  );
}

function InspectorStatGrid({
  stats,
}: Readonly<{
  stats: readonly InspectorStat[];
}>) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {stats.map((stat, index) => (
        <article
          className={cn(
            "min-h-[64px] rounded-[12px] border px-3 py-2",
            statToneClass(stat.tone ?? "default"),
          )}
          key={`meal-inspector-stat-${index}`}
        >
          <p className="text-[9px] font-semibold uppercase text-[var(--text-muted)]">
            {stat.label}
          </p>
          <p className="mt-1 text-[13px] font-semibold leading-5 text-[var(--text-primary)]">
            {stat.value}
          </p>
          {stat.detail ? (
            <p className="mt-0.5 text-[9px] leading-3 text-[var(--text-muted)]">
              {stat.detail}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function statToneClass(tone: NonNullable<InspectorStat["tone"]>) {
  if (tone === "good") {
    return "border-[rgba(66,184,131,.20)] bg-[rgba(66,184,131,.06)]";
  }

  if (tone === "warn") {
    return "border-[rgba(216,180,90,.22)] bg-[rgba(216,180,90,.07)]";
  }

  if (tone === "alert") {
    return "border-[rgba(221,107,95,.22)] bg-[rgba(221,107,95,.06)]";
  }

  return "border-[var(--border-subtle)] bg-[rgba(18,28,43,.50)]";
}

function weekStats(weekStatus: MealPlannerWeekStatus): InspectorStat[] {
  return [
    {
      label: "Planned meals",
      value: `${weekStatus.plannedMeals} / ${weekStatus.totalSlots}`,
      detail: `${weekStatus.openSlots} open`,
      tone: weekStatus.openSlots === 0 ? "good" : "default",
    },
    {
      label: "Days in range",
      value: `${weekStatus.daysInTarget} / 7`,
      detail: "Calories and protein",
      tone: weekStatus.daysInTarget >= 4 ? "good" : "warn",
    },
    {
      label: "Protein gap",
      value: `${Math.round(weekStatus.openProteinGap)} g`,
      detail: "Remaining this week",
      tone: weekStatus.openProteinGap <= 120 ? "good" : "warn",
    },
    {
      label: "Largest gap",
      value: weekStatus.largestProteinGap,
      detail: "Protein",
    },
    {
      label: "Kcal deviation",
      value: weekStatus.largestDeviation,
      detail: "Largest day delta",
    },
    {
      label: "Slot state",
      value: "No slot",
      detail: "Select a meal",
    },
  ];
}

function slotStats({
  selectedSlot,
  dayTotals,
  targets,
  planned,
  replaceMode,
  availability,
}: Readonly<{
  selectedSlot: SelectedMealSlot;
  dayTotals: NutritionMacroTarget | null;
  targets: NutritionMacroTarget;
  planned: boolean;
  replaceMode: boolean;
  availability: Pick<MealAvailability, "status" | "missingIngredients"> | null;
}>): InspectorStat[] {
  const totals = dayTotals ?? {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };
  const proteinRemaining = Math.max(0, targets.protein - totals.protein);
  const carbs = macroDelta(totals.carbs, targets.carbs, "carbs");
  const fat = macroDelta(totals.fat, targets.fat, "fat");

  return [
    {
      label: "Selected day kcal",
      value: `${formatMacro(totals.calories, "kcal")}`,
      detail: `Target ${formatMacro(targets.calories, "kcal")}`,
      tone: totals.calories > targets.calories * 1.05 ? "alert" : "default",
    },
    {
      label: "Protein remaining",
      value:
        proteinRemaining > 0
          ? formatMacro(proteinRemaining, macroUnits.protein)
          : "Target met",
      detail: `${formatMacro(totals.protein, "g")} logged`,
      tone: proteinRemaining === 0 ? "good" : "warn",
    },
    {
      label: "Carbs delta",
      value: carbs.value,
      detail: carbs.detail,
      tone: carbs.tone,
    },
    {
      label: "Fat delta",
      value: fat.value,
      detail: fat.detail,
      tone: fat.tone,
    },
    {
      label: "Meal type",
      value: mealTypeLabels[selectedSlot.mealType],
      detail: "Suggestion filter",
    },
    {
      label: "Slot status",
      value: replaceMode ? "Replacing" : planned ? "Planned" : "Open",
      detail: planned ? "Editable locally" : "Ready for recipe",
      tone: planned ? "good" : "default",
    },
    {
      label: "Grocery",
      value: availability
        ? mealAvailabilityLabel(
            availability.status,
            availability.missingIngredients.length,
          )
        : "No recipe",
      detail: availability?.missingIngredients.length
        ? "Shopping needed"
        : "Pantry estimate",
      tone:
        availability?.status === "available"
          ? "good"
          : availability
            ? "warn"
            : "default",
    },
  ];
}

function macroDelta(actual: number, target: number, macro: MacroKey) {
  const unit = macroUnits[macro];
  const delta = actual - target;
  const absoluteDelta = Math.abs(delta);

  if (target > 0 && absoluteDelta <= target * 0.05) {
    return {
      value: "On target",
      detail: `${formatMacro(actual, unit)} logged`,
      tone: "good" as const,
    };
  }

  if (delta > 0) {
    return {
      value: `+${formatMacro(absoluteDelta, unit)}`,
      detail: `${macroLabels[macro]} above target`,
      tone: "alert" as const,
    };
  }

  return {
    value: `${formatMacro(absoluteDelta, unit)} open`,
    detail: `${formatMacro(actual, unit)} logged`,
    tone: "warn" as const,
  };
}
