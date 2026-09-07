"use client";

import Link from "next/link";
import { ManualMealPlanner } from "./manual-meal-planner";
import { useMemo, useState } from "react";
import {
  contentStateDataAttributes,
  resolveContentStateMeta,
} from "@/features/content-state";
import { initialPantryItems } from "../grocery/grocery-mock-data";
import { calculateRecipeAvailability } from "../grocery/grocery-utils";
import { MealPlannerInspector } from "./meal-planner-inspector";
import { NutritionTargetSummary } from "./nutrition-target-summary";
import { RecipeSuggestionList } from "./recipe-suggestion-list";
import { WeekPlannerGrid } from "./week-planner-grid";
import {
  primaryButtonClass,
  quietButtonClass,
  secondaryButtonClass,
} from "./meal-planner-primitives";
import type {
  IngredientAdjustment,
  MealPlanSlot,
  MealPlanWeek,
  MealPlannerViewModel,
  NutritionMacroTarget,
  PlannedMeal,
  RecipeFilter,
  RecipeSort,
  SelectedMealSlot,
} from "./meal-planner-types";
import {
  calculateDayTotals,
  calculateMacroStatus,
  calculateRecipeTotals,
  emptyTotals,
  formatMacro,
  formatWeekRange,
  mealTypes,
  recipeById,
  shiftWeek,
} from "./meal-planner-utils";

function findDay(week: MealPlanWeek, date: string) {
  return week.days.find((day) => day.date === date) ?? null;
}

function findSlot(week: MealPlanWeek, selectedSlot: SelectedMealSlot | null) {
  if (!selectedSlot) {
    return null;
  }

  return (
    findDay(week, selectedSlot.date)?.slots.find(
      (slot) => slot.mealType === selectedSlot.mealType,
    ) ?? null
  );
}

function updateSlot(
  week: MealPlanWeek,
  selectedSlot: SelectedMealSlot,
  updater: (slot: MealPlanSlot) => MealPlanSlot,
): MealPlanWeek {
  return {
    ...week,
    days: week.days.map((day) => {
      if (day.date !== selectedSlot.date) {
        return day;
      }

      return {
        ...day,
        slots: day.slots.map((slot) =>
          slot.mealType === selectedSlot.mealType ? updater(slot) : slot,
        ),
      };
    }),
  };
}

function createPlannedMeal(
  selectedSlot: SelectedMealSlot,
  recipeId: string,
): PlannedMeal {
  return {
    id: `${selectedSlot.date}-${selectedSlot.mealType}-${recipeId}-${Date.now()}`,
    recipeId,
    mealType: selectedSlot.mealType,
    date: selectedSlot.date,
    servings: 1,
    ingredientAdjustments: [],
  };
}

function upsertAdjustment(
  adjustments: readonly IngredientAdjustment[],
  ingredientId: string,
  amount: number,
) {
  const next = adjustments.filter(
    (adjustment) => adjustment.ingredientId !== ingredientId,
  );

  return [...next, { ingredientId, amount }];
}

function calculateWeekStatus(
  week: MealPlanWeek,
  recipes: MealPlannerViewModel["recipes"],
  targets: NutritionMacroTarget,
) {
  const totalSlots = week.days.length * mealTypes.length;
  const plannedMeals = week.days.reduce(
    (count, day) =>
      count + day.slots.filter((slot) => Boolean(slot.plannedMeal)).length,
    0,
  );
  let daysInTarget = 0;
  let openProteinGap = 0;
  let largestProteinGap = {
    label: "none",
    value: 0,
  };
  let largestDeviation = {
    label: "none",
    value: 0,
  };

  week.days.forEach((day) => {
    const totals = calculateDayTotals(day, recipes);
    const calories = calculateMacroStatus(
      totals.calories,
      targets.calories,
      "calories",
    );
    const protein = calculateMacroStatus(
      totals.protein,
      targets.protein,
      "protein",
    );

    if (
      calories.kind === "on_target" &&
      (protein.kind === "on_target" || protein.kind === "close")
    ) {
      daysInTarget += 1;
    }

    const proteinGap = Math.max(0, targets.protein - totals.protein);

    openProteinGap += proteinGap;

    if (proteinGap > largestProteinGap.value) {
      largestProteinGap = {
        label: `${day.label} - ${formatMacro(proteinGap, "g")}`,
        value: proteinGap,
      };
    }

    const calorieDeviation = Math.abs(targets.calories - totals.calories);

    if (calorieDeviation > largestDeviation.value) {
      largestDeviation = {
        label: `${day.label} - ${formatMacro(calorieDeviation, "kcal")}`,
        value: calorieDeviation,
      };
    }
  });

  return {
    plannedMeals,
    totalSlots,
    openSlots: totalSlots - plannedMeals,
    daysInTarget,
    openProteinGap,
    largestProteinGap: largestProteinGap.label,
    largestDeviation: largestDeviation.label,
  };
}

function DemoMealPlannerView({
  initialSelectedSlot = null,
  viewModel,
}: Readonly<{
  initialSelectedSlot?: SelectedMealSlot | null;
  viewModel: MealPlannerViewModel;
}>) {
  const profileId = viewModel.profileId ?? "demo";
  const actionsEnabled = viewModel.actionsEnabled ?? true;
  const [weekOffset, setWeekOffset] = useState(0);
  const [week, setWeek] = useState(viewModel.week);
  const [selectedSlot, setSelectedSlot] = useState<SelectedMealSlot | null>(initialSelectedSlot);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [activeProfileId, setActiveProfileId] = useState(viewModel.defaultProfileId);
  const [filter, setFilter] = useState<RecipeFilter>("all");
  const [sort, setSort] = useState<RecipeSort>("best-fit");
  const [query, setQuery] = useState("");
  const [replaceMode, setReplaceMode] = useState(false);
  const [ingredientErrors, setIngredientErrors] = useState<
    Record<string, string | undefined>
  >({});
  const [toast, setToast] = useState<string | null>(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const activeProfile =
    viewModel.profiles.find((profile) => profile.id === activeProfileId) ??
    viewModel.profiles[0] ??
    null;
  const targets = activeProfile?.targets ?? emptyTotals();
  const selectedDay = selectedSlot ? findDay(week, selectedSlot.date) : null;
  const selectedSlotData = findSlot(week, selectedSlot);
  const selectedRecipe = selectedSlotData?.plannedMeal
    ? recipeById(viewModel.recipes, selectedSlotData.plannedMeal.recipeId)
    : null;
  const selectedMealTotals =
    selectedRecipe && selectedSlotData?.plannedMeal
      ? calculateRecipeTotals(
          selectedRecipe,
          selectedSlotData.plannedMeal.servings,
          selectedSlotData.plannedMeal.ingredientAdjustments,
        )
      : null;
  const selectedDayTotals = selectedDay
    ? calculateDayTotals(selectedDay, viewModel.recipes)
    : null;
  const selectedSlotHasPlannedMeal = Boolean(selectedSlotData?.plannedMeal);
  const selectedAvailability =
    selectedRecipe && selectedSlotData?.plannedMeal
      ? calculateRecipeAvailability(
          selectedRecipe,
          selectedSlotData.plannedMeal.servings,
          initialPantryItems,
        )
      : null;
  const suggestionDayTotals = selectedDayTotals ?? emptyTotals();
  const weekStatus = useMemo(
    () => calculateWeekStatus(week, viewModel.recipes, targets),
    [targets, viewModel.recipes, week],
  );
  const contentStates =
    viewModel.contentStates ??
    {
      inspector: resolveContentStateMeta({
        capacity: 1,
        itemCount: selectedSlot ? 1 : 0,
      }),
      page: resolveContentStateMeta({
        capacity: 21,
        itemCount: weekStatus.plannedMeals,
      }),
      recipeSuggestions: resolveContentStateMeta({
        capacity: 8,
        itemCount: viewModel.recipes.length,
      }),
      targetProfile: resolveContentStateMeta({
        capacity: 1,
        itemCount: activeProfile ? 1 : 0,
      }),
      weekPlan: resolveContentStateMeta({
        capacity: 21,
        itemCount: weekStatus.plannedMeals,
      }),
    };
  const stateAttrs = (meta: (typeof contentStates)[keyof typeof contentStates]) =>
    contentStateDataAttributes(meta, profileId);

  function selectSlot(slot: SelectedMealSlot) {
    const dayIndex = week.days.findIndex((day) => day.date === slot.date);

    setSelectedSlot(slot);
    setSelectedDayIndex(Math.max(0, dayIndex));
    setReplaceMode(false);
    setIngredientErrors({});
  }

  function selectDay(index: number) {
    setSelectedDayIndex(index);
  }

  function moveWeek(delta: number) {
    const nextOffset = weekOffset + delta;
    const nextWeek = shiftWeek(viewModel.week, nextOffset);

    setWeekOffset(nextOffset);
    setWeek(nextWeek);
    setSelectedDayIndex(0);
    setSelectedSlot(null);
    setReplaceMode(false);
    setToast(null);
    setUnsavedChanges(false);
  }

  function resetChanges() {
    setWeek(shiftWeek(viewModel.week, weekOffset));
    setSelectedSlot(null);
    setSelectedDayIndex(0);
    setReplaceMode(false);
    setIngredientErrors({});
    setUnsavedChanges(false);
    setToast("Local changes reset for this week");
  }

  function saveWeek() {
    if (!unsavedChanges) {
      return;
    }

    setUnsavedChanges(false);
    setToast("Week plan saved locally for this session");
  }

  function addRecipe(recipeId: string) {
    if (!selectedSlot) {
      return;
    }

    setWeek((currentWeek) =>
      updateSlot(currentWeek, selectedSlot, (slot) => ({
        ...slot,
        plannedMeal: createPlannedMeal(selectedSlot, recipeId),
      })),
    );
    setReplaceMode(false);
    setUnsavedChanges(true);
    setToast(null);
  }

  function previewRecipe(recipeId: string) {
    const recipe = recipeById(viewModel.recipes, recipeId);

    if (!recipe || !selectedDayTotals) {
      return;
    }

    const totals = calculateRecipeTotals(recipe);
    const afterCalories = selectedDayTotals.calories + totals.calories;

    setToast(
      `Preview impact: ${recipe.title} would bring the day to ${Math.round(
        afterCalories,
      )} kcal`,
    );
  }

  function updateSelectedMeal(updater: (meal: PlannedMeal) => PlannedMeal) {
    if (!selectedSlot) {
      return;
    }

    setWeek((currentWeek) =>
      updateSlot(currentWeek, selectedSlot, (slot) => {
        if (!slot.plannedMeal) {
          return slot;
        }

        return {
          ...slot,
          plannedMeal: updater(slot.plannedMeal),
        };
      }),
    );
    setUnsavedChanges(true);
  }

  function changeServings(servings: number) {
    if (!Number.isFinite(servings) || servings < 0.25) {
      return;
    }

    updateSelectedMeal((meal) => ({
      ...meal,
      servings,
    }));
  }

  function changeIngredientAmount(ingredientId: string, amount: number) {
    if (!Number.isFinite(amount) || amount <= 0) {
      setIngredientErrors((current) => ({
        ...current,
        [ingredientId]: "Amount must be greater than 0.",
      }));
      return;
    }

    setIngredientErrors((current) => ({
      ...current,
      [ingredientId]: undefined,
    }));
    updateSelectedMeal((meal) => ({
      ...meal,
      ingredientAdjustments: upsertAdjustment(
        meal.ingredientAdjustments,
        ingredientId,
        amount,
      ),
    }));
  }

  function resetIngredientChanges() {
    updateSelectedMeal((meal) => ({
      ...meal,
      ingredientAdjustments: [],
    }));
    setIngredientErrors({});
  }

  function clearSlot() {
    if (!selectedSlot) {
      return;
    }

    setWeek((currentWeek) =>
      updateSlot(currentWeek, selectedSlot, (slot) => ({
        ...slot,
        plannedMeal: undefined,
      })),
    );
    setReplaceMode(false);
    setIngredientErrors({});
    setUnsavedChanges(true);
  }

  return (
    <div
      className="mx-auto flex w-full max-w-[2208px] flex-col gap-3 pb-6 xl:h-[calc(100dvh-20px)] xl:max-h-[calc(100dvh-20px)] xl:gap-2 xl:overflow-hidden xl:pb-0"
      id="meal-planner-page"
      {...stateAttrs(contentStates.page)}
    >
      <header className="shrink-0 overflow-hidden rounded-[18px] border border-[rgba(216,180,90,.18)] bg-[rgba(15,23,36,.80)] shadow-[0_8px_22px_rgba(0,0,0,.12)]">
        <div className="grid gap-4 bg-[rgba(217,146,79,.055)] px-4 py-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-[var(--accent-yellow)]">
              {viewModel.header.eyebrow}
            </p>
            <h1 className="mt-1 text-[32px] font-semibold leading-none text-[var(--text-primary)]">
              {viewModel.header.title}
            </h1>
            <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">
              {viewModel.header.subline}
            </p>
            <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
              {formatWeekRange(week)} -{" "}
              {profileId === "demo"
                ? "Mock recipes - local planning state"
                : profileId === "manual"
                  ? "Manual Supabase meals - edit and reschedule connected"
                  : "No meal plan data"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 xl:justify-end">
            <button
              className={secondaryButtonClass}
              onClick={() => moveWeek(-1)}
              type="button"
            >
              Previous Week
            </button>
            <button
              className={secondaryButtonClass}
              onClick={() => moveWeek(-weekOffset)}
              type="button"
            >
              Current Week
            </button>
            <button
              className={secondaryButtonClass}
              onClick={() => moveWeek(1)}
              type="button"
            >
              Next Week
            </button>
            <button
              className={primaryButtonClass}
              disabled={!actionsEnabled || !unsavedChanges}
              onClick={saveWeek}
              type="button"
            >
              Save week
            </button>
            <button
              className={quietButtonClass}
              disabled={!actionsEnabled || !unsavedChanges}
              onClick={resetChanges}
              type="button"
            >
              Reset changes
            </button>
            <Link className={secondaryButtonClass} href="/nutrition/grocery">
              View grocery signal
            </Link>
          </div>
        </div>

        {toast ? (
          <div
            className="border-t border-[var(--border-subtle)] bg-[rgba(18,28,43,.56)] px-4 py-2 text-[11px] font-semibold text-[var(--text-secondary)]"
            role="status"
          >
            {toast}
          </div>
        ) : null}
      </header>

      <div className="grid min-h-0 gap-3 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] xl:items-stretch xl:gap-2 xl:overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-col gap-3 xl:gap-2 xl:overflow-hidden">
          <div className="grid shrink-0 gap-3 xl:grid-cols-[minmax(280px,0.42fr)_minmax(360px,0.58fr)] xl:items-start xl:gap-2">
            <NutritionTargetSummary
              activeProfileId={activeProfileId}
              onProfileChange={(profileId) => {
                setActiveProfileId(profileId);
                setUnsavedChanges(true);
              }}
              profiles={viewModel.profiles}
              stateAttributes={stateAttrs(contentStates.targetProfile)}
              targets={targets}
            />

            <MealPlannerInspector
              availability={selectedAvailability}
              dayTotals={selectedDayTotals}
              ingredientErrors={ingredientErrors}
              manualEditEnabled={Boolean(viewModel.mealEditEnabled)}
              onApplyChanges={() => setToast("Meal changes applied locally")}
              onCancelReplace={() => setReplaceMode(false)}
              onClearSlot={clearSlot}
              onIngredientAmountChange={changeIngredientAmount}
              onReplaceRecipe={() => setReplaceMode(true)}
              onResetIngredientChanges={resetIngredientChanges}
              onServingsChange={changeServings}
              replaceMode={replaceMode}
              recipes={viewModel.recipes}
              selectedDay={selectedDay}
              selectedMealTotals={selectedMealTotals}
              selectedRecipe={selectedRecipe}
              selectedSlot={selectedSlot}
              selectedSlotData={selectedSlotData}
              targets={targets}
              stateAttributes={stateAttrs(contentStates.inspector)}
              weekStatus={weekStatus}
            />
          </div>

          <div className="min-h-0 xl:flex-1 xl:overflow-hidden">
            <WeekPlannerGrid
              actionsEnabled={actionsEnabled}
              onSelectDay={selectDay}
              onSelectSlot={selectSlot}
              recipes={viewModel.recipes}
              selectedDayIndex={selectedDayIndex}
              selectedSlot={selectedSlot}
              stateAttributes={stateAttrs(contentStates.weekPlan)}
              targets={targets}
              week={week}
            />
          </div>
        </div>

        <aside className="min-h-0 min-w-0 xl:h-full xl:overflow-hidden">
          <RecipeSuggestionList
            dayTotals={suggestionDayTotals}
            filter={filter}
            onAddRecipe={addRecipe}
            onFilterChange={setFilter}
            onPreviewRecipe={previewRecipe}
            onQueryChange={setQuery}
            onSortChange={setSort}
            query={query}
            recipes={viewModel.recipes}
            selectedDay={selectedDay}
            selectedSlot={selectedSlot}
              selectedSlotHasPlannedMeal={selectedSlotHasPlannedMeal}
              actionsEnabled={actionsEnabled}
            sort={sort}
            stateAttributes={stateAttrs(contentStates.recipeSuggestions)}
            targets={targets}
          />
        </aside>
      </div>
    </div>
  );
}

export function MealPlannerView(props: Readonly<{initialSelectedSlot?: SelectedMealSlot | null; viewModel: MealPlannerViewModel}>) {
  return props.viewModel.profileId && props.viewModel.profileId !== "demo"
    ? <ManualMealPlanner key={props.viewModel.week.weekStartsOn} viewModel={props.viewModel} initialSelectedSlot={props.initialSelectedSlot ?? null} />
    : <DemoMealPlannerView {...props} />;
}
