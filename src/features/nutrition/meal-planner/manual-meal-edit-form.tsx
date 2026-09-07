"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/feedback/toast-provider";
import {
  updateMealFormStateAction,
  scheduleNutritionMealAction,
  type NutritionActionResult,
} from "@/features/real-data/actions/nutrition.actions";
import { inputClass, primaryButtonClass } from "./meal-planner-primitives";
import type { PlannedMeal, Recipe } from "./meal-planner-types";

const initialState: NutritionActionResult = { message: "", status: "blocked" };

function localDateTimeValue(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function ManualMealEditForm({
  meal,
  recipes,
}: Readonly<{
  meal: PlannedMeal;
  recipes: readonly Recipe[];
}>) {
  const [state, formAction, isPending] = useActionState(
    updateMealFormStateAction,
    initialState,
  );
  const [scheduleState, scheduleAction, scheduling] = useActionState(
    scheduleNutritionMealAction,
    initialState,
  );
  const router = useRouter();
  const { notify } = useToast();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const result = scheduleState.status === "success" ? scheduleState : state;
    if (result.status === "success") {
      notify(result.message);
      router.refresh();
    }
  }, [state, scheduleState, router, notify]);

  return (
    <section
      aria-labelledby="manual-meal-edit-heading"
      className="rounded-[12px] border border-[rgba(217,146,79,.20)] bg-[rgba(217,146,79,.06)] p-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3
            className="text-[13px] font-semibold text-[var(--text-primary)] focus:outline-none"
            id="manual-meal-edit-heading"
            ref={headingRef}
            tabIndex={-1}
          >
            Mahlzeit bearbeiten
          </h3>
          <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
            Rezept, Portionen und Notizen bearbeiten. Eine feste Uhrzeit lässt
            sich unten im Kalender einplanen.
          </p>
          <p className="mt-1 text-[10px] font-semibold text-[var(--text-secondary)]">
            Status: {meal.completedAt ? "Abgeschlossen" : "Geplant"}
          </p>
        </div>
        {state.message ? (
          <p
            className="text-[11px] font-semibold text-[var(--text-secondary)]"
            role={state.status === "success" ? "status" : "alert"}
          >
            {state.message}
          </p>
        ) : null}
      </div>
      <form action={formAction} className="mt-3 grid gap-3 sm:grid-cols-2">
        <input name="mealId" type="hidden" value={meal.id} />
        <label className="grid gap-1 text-[10px] font-semibold text-[var(--text-muted)]">
          Titel
          <input
            className={inputClass}
            defaultValue={meal.title}
            name="title"
            required
          />
        </label>

        <label className="grid gap-1 text-[10px] font-semibold text-[var(--text-muted)] sm:col-span-2">
          Rezept
          <select
            className={inputClass}
            defaultValue={meal.recipeId}
            name="recipeId"
          >
            <option value="">Ohne Rezept</option>
            {recipes.map((recipe) => (
              <option key={recipe.id} value={recipe.id}>
                {recipe.title}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-[10px] font-semibold text-[var(--text-muted)]">
          Portionen
          <input
            className={inputClass}
            defaultValue={meal.servings}
            max="100"
            min="0.01"
            name="servings"
            required
            step="0.01"
            type="number"
          />
        </label>
        <label className="grid gap-1 text-[10px] font-semibold text-[var(--text-muted)] sm:col-span-2">
          Notizen
          <textarea
            className={`${inputClass} min-h-20 resize-y py-2`}
            defaultValue={meal.notes ?? ""}
            name="notes"
          />
        </label>
        <div className="sm:col-span-2">
          <button
            className={primaryButtonClass}
            disabled={isPending}
            type="submit"
          >
            {isPending ? "Mahlzeit wird gespeichert …" : "Mahlzeit speichern"}
          </button>
        </div>
      </form>
      {!meal.completedAt ? (
        <form
          action={scheduleAction}
          aria-label={`${meal.title} als Zeitblock planen`}
          className="mt-3 grid gap-2 border-t border-[var(--border-subtle)] pt-3 sm:grid-cols-[1fr_1fr_100px_auto]"
        >
          <input name="sourceType" type="hidden" value="meal" />
          <input name="sourceId" type="hidden" value={meal.id} />
          <input
            name="plannedDate"
            type="date"
            defaultValue={meal.date}
            className={inputClass}
            aria-label="Blockdatum"
          />
          <input
            name="scheduledTime"
            type="time"
            defaultValue={
              meal.plannedAt
                ? localDateTimeValue(meal.plannedAt).slice(11, 16)
                : "12:00"
            }
            className={inputClass}
            aria-label="Blockzeit"
          />
          <select
            name="durationMinutes"
            defaultValue="30"
            className={inputClass}
            aria-label="Blockdauer"
          >
            <option value="30">30 min</option>
            <option value="45">45 min</option>
            <option value="60">60 min</option>
            <option value="90">90 min</option>
          </select>
          <button
            className={primaryButtonClass}
            disabled={scheduling}
            type="submit"
          >
            Im Kalender planen
          </button>
          {scheduleState.message && (
            <p role={scheduleState.status === "success" ? "status" : "alert"}>
              {scheduleState.message}
            </p>
          )}
        </form>
      ) : null}
    </section>
  );
}
