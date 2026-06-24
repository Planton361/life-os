import { accentStyle } from "@/components/layout/route-page-primitives";
import { cn } from "@/lib/cn";
import { initialPantryItems } from "../grocery/grocery-mock-data";
import {
  calculateRecipeAvailability,
  mealAvailabilityLabel,
} from "../grocery/grocery-utils";
import type { MealAvailability } from "../grocery/grocery-types";
import { MealSlotCard } from "./meal-slot-card";
import { PlannerPanel, ProgressBar } from "./meal-planner-primitives";
import type {
  MealPlanDay,
  MealPlanSlot,
  MealPlanWeek,
  NutritionMacroTarget,
  Recipe,
  SelectedMealSlot,
} from "./meal-planner-types";
import {
  calculateDayTotals,
  calculateMacroStatus,
  calculateRecipeTotals,
  formatDateLabel,
  formatMacro,
  macroKeys,
  macroLabels,
  macroUnits,
  mealTypeLabels,
  recipeById,
  statusAccent,
} from "./meal-planner-utils";

function selectedMatches(slot: MealPlanSlot, selectedSlot: SelectedMealSlot) {
  return slot.date === selectedSlot.date && slot.mealType === selectedSlot.mealType;
}

function dayStatus(dayTotals: NutritionMacroTarget, targets: NutritionMacroTarget) {
  const calorieStatus = calculateMacroStatus(
    dayTotals.calories,
    targets.calories,
    "calories",
  );
  const proteinStatus = calculateMacroStatus(
    dayTotals.protein,
    targets.protein,
    "protein",
  );

  if (calorieStatus.kind === "over") {
    return calorieStatus;
  }

  if (calorieStatus.kind === "on_target" && proteinStatus.kind === "on_target") {
    return {
      ...calorieStatus,
      detail: "Day balanced after dinner",
    };
  }

  if (calorieStatus.kind === "close" || proteinStatus.kind === "close") {
    return calorieStatus.kind === "close" ? calorieStatus : proteinStatus;
  }

  return proteinStatus.kind === "open" ? proteinStatus : calorieStatus;
}

function statusLineForSlot(
  totals: NutritionMacroTarget,
  dayTotals: NutritionMacroTarget,
  targets: NutritionMacroTarget,
) {
  const proteinRemaining = Math.max(0, targets.protein - dayTotals.protein);

  if (proteinRemaining > 0) {
    return `+${Math.round(totals.protein)} g protein - ${Math.round(
      proteinRemaining,
    )} g remaining`;
  }

  const caloriesStatus = calculateMacroStatus(
    dayTotals.calories,
    targets.calories,
    "calories",
  );

  return caloriesStatus.detail;
}

function availabilityAccent(status: MealAvailability["status"]) {
  if (status === "available") {
    return "var(--accent-green)";
  }

  if (status === "partial") {
    return "var(--accent-yellow)";
  }

  return "var(--accent-red)";
}

function dayAvailability(day: MealPlanDay, recipes: readonly Recipe[]) {
  const mealAvailabilities = day.slots.flatMap((slot) => {
    if (!slot.plannedMeal) {
      return [];
    }

    const recipe = recipeById(recipes, slot.plannedMeal.recipeId);

    if (!recipe) {
      return [];
    }

    return [
      calculateRecipeAvailability(
        recipe,
        slot.plannedMeal.servings,
        initialPantryItems,
      ),
    ];
  });

  if (mealAvailabilities.length === 0) {
    return {
      label: "No meals",
      status: "available" as const,
    };
  }

  const missingCount = mealAvailabilities.reduce(
    (count, availability) => count + availability.missingIngredients.length,
    0,
  );
  const hasAvailableMeal = mealAvailabilities.some(
    (availability) => availability.status === "available",
  );
  const status: MealAvailability["status"] =
    missingCount === 0 ? "available" : hasAvailableMeal ? "partial" : "missing";

  return {
    label:
      missingCount === 0
        ? mealAvailabilityLabel("available")
        : `Missing ${missingCount}`,
    status,
  };
}

function DayMacroSummary({
  totals,
  targets,
}: Readonly<{
  totals: NutritionMacroTarget;
  targets: NutritionMacroTarget;
}>) {
  return (
    <div className="mt-3 grid gap-2">
      {macroKeys.map((macro) => {
        const status = calculateMacroStatus(totals[macro], targets[macro], macro);
        const accent = statusAccent(status.kind);

        return (
          <div key={macro} style={accentStyle(accent)}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-[9px] font-semibold text-[var(--text-muted)]">
                {macroLabels[macro]}
              </p>
              <p className="text-[9px] font-semibold text-[var(--text-secondary)]">
                {formatMacro(totals[macro], macroUnits[macro])} /{" "}
                {formatMacro(targets[macro], macroUnits[macro])}
              </p>
            </div>
            <ProgressBar
              accent={accent}
              label={`${macroLabels[macro]} ${status.detail}`}
              value={status.percentage}
            />
            <p className="mt-1 text-[9px] leading-3 text-[var(--text-muted)]">
              {status.detail}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function DayColumn({
  day,
  recipes,
  targets,
  selectedSlot,
  onSelectSlot,
}: Readonly<{
  day: MealPlanDay;
  recipes: readonly Recipe[];
  targets: NutritionMacroTarget;
  selectedSlot: SelectedMealSlot | null;
  onSelectSlot: (slot: SelectedMealSlot) => void;
}>) {
  const totals = calculateDayTotals(day, recipes);
  const status = dayStatus(totals, targets);
  const statusLabel = status.label;
  const availability = dayAvailability(day, recipes);

  return (
    <section
      aria-label={`${day.label} meal plan`}
      className="min-w-0 rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.72)] p-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">
            {day.label}
          </h3>
          <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
            {formatDateLabel(day.date)}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          <span
            className="rounded-full border border-[color-mix(in_srgb,var(--accent)_26%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] px-2 py-1 text-[9px] font-semibold text-[var(--text-secondary)]"
            style={accentStyle(statusAccent(status.kind))}
          >
            {statusLabel}
          </span>
          <span
            className="rounded-full border border-[color-mix(in_srgb,var(--accent)_26%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] px-2 py-1 text-[9px] font-semibold text-[var(--text-secondary)]"
            style={accentStyle(availabilityAccent(availability.status))}
          >
            {availability.label}
          </span>
        </div>
      </div>

      <DayMacroSummary targets={targets} totals={totals} />

      <div className="mt-3 grid gap-2">
        {day.slots.map((slot) => {
          const recipe = slot.plannedMeal
            ? recipeById(recipes, slot.plannedMeal.recipeId)
            : null;
          const slotTotals =
            slot.plannedMeal && recipe
              ? calculateRecipeTotals(
                  recipe,
                  slot.plannedMeal.servings,
                  slot.plannedMeal.ingredientAdjustments,
                )
              : null;

          return (
            <MealSlotCard
              key={`${slot.date}-${slot.mealType}`}
              onSelect={() =>
                onSelectSlot({
                  date: slot.date,
                  mealType: slot.mealType,
                })
              }
              recipe={recipe}
              selected={selectedSlot ? selectedMatches(slot, selectedSlot) : false}
              slot={slot}
              statusLine={
                slotTotals
                  ? statusLineForSlot(slotTotals, totals, targets)
                  : `Add ${mealTypeLabels[slot.mealType].toLowerCase()}`
              }
              totals={slotTotals}
            />
          );
        })}
      </div>
    </section>
  );
}

export function WeekPlannerGrid({
  week,
  recipes,
  targets,
  selectedSlot,
  selectedDayIndex,
  onSelectSlot,
  onSelectDay,
}: Readonly<{
  week: MealPlanWeek;
  recipes: readonly Recipe[];
  targets: NutritionMacroTarget;
  selectedSlot: SelectedMealSlot | null;
  selectedDayIndex: number;
  onSelectSlot: (slot: SelectedMealSlot) => void;
  onSelectDay: (index: number) => void;
}>) {
  const selectedDay = week.days[selectedDayIndex] ?? week.days[0];

  if (!selectedDay) {
    return (
      <PlannerPanel
        bodyClassName="xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:p-3"
        className="min-w-0 xl:flex xl:h-full xl:min-h-0 xl:flex-col"
        subtitle="No days are available in this local week state."
        title="Weekly Meal Plan"
      >
        <div className="rounded-[14px] border border-dashed border-[var(--border-subtle)] bg-[rgba(168,183,204,.04)] p-4">
          <p className="text-[13px] font-semibold text-[var(--text-primary)]">
            Empty week
          </p>
          <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
            Later data sources can populate the seven day planning structure.
          </p>
        </div>
      </PlannerPanel>
    );
  }

  return (
    <PlannerPanel
      bodyClassName="xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:p-3"
      className="min-w-0 xl:flex xl:h-full xl:min-h-0 xl:flex-col"
      subtitle="Desktop matrix, mobile day switcher. Slots are buttons."
      title="Weekly Meal Plan"
    >
      <div className="flex gap-2 overflow-x-auto pb-2 xl:hidden">
        {week.days.map((day, index) => {
          const totals = calculateDayTotals(day, recipes);
          const status = dayStatus(totals, targets);
          const isActive = index === selectedDayIndex;

          return (
            <button
              aria-pressed={isActive}
              className={cn(
                "min-h-11 min-w-16 rounded-[12px] border px-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
                isActive
                  ? "border-[rgba(217,146,79,.48)] bg-[rgba(217,146,79,.13)]"
                  : "border-[var(--border-subtle)] bg-[rgba(18,28,43,.58)]",
              )}
              key={`meal-week-day-button-${index}`}
              onClick={() => onSelectDay(index)}
              type="button"
            >
              <span className="block text-[12px] font-semibold text-[var(--text-primary)]">
                {day.label}
              </span>
              <span className="mt-1 block text-[9px] text-[var(--text-muted)]">
                {status.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="xl:hidden">
        <DayColumn
          day={selectedDay}
          onSelectSlot={onSelectSlot}
          recipes={recipes}
          selectedSlot={selectedSlot}
          targets={targets}
        />
      </div>

      <div className="hidden grid-cols-7 gap-2 xl:grid">
        {week.days.map((day, index) => (
          <DayColumn
            day={day}
            key={`meal-week-day-column-${index}`}
            onSelectSlot={onSelectSlot}
            recipes={recipes}
            selectedSlot={selectedSlot}
            targets={targets}
          />
        ))}
      </div>
    </PlannerPanel>
  );
}
