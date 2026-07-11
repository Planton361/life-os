"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  updateMealFormStateAction,
  type NutritionActionResult,
} from "@/features/real-data/actions/nutrition.actions";
import { inputClass, primaryButtonClass } from "./meal-planner-primitives";
import type { PlannedMeal, Recipe } from "./meal-planner-types";
import { mealTypeLabels } from "./meal-planner-utils";

const initialState: NutritionActionResult = { message: "", status: "blocked" };

function localDateTimeValue(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function ManualMealEditForm({ meal, recipes }: Readonly<{
  meal: PlannedMeal;
  recipes: readonly Recipe[];
}>) {
  const [state, formAction, isPending] = useActionState(
    updateMealFormStateAction,
    initialState,
  );
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [date, setDate] = useState(meal.date);
  const [plannedAt, setPlannedAt] = useState(localDateTimeValue(meal.plannedAt));

  useEffect(() => {
    if (state.status === "success") {
      headingRef.current?.focus();
      const reloadTimer = window.setTimeout(() => window.location.reload(), 700);
      return () => window.clearTimeout(reloadTimer);
    }
  }, [state.status]);

  return (
    <section aria-labelledby="manual-meal-edit-heading" className="rounded-[12px] border border-[rgba(217,146,79,.20)] bg-[rgba(217,146,79,.06)] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[13px] font-semibold text-[var(--text-primary)] focus:outline-none" id="manual-meal-edit-heading" ref={headingRef} tabIndex={-1}>
            Meal bearbeiten
          </h3>
          <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
            Datum, Slot und Uhrzeit werden persistiert. Der Abschlussstatus bleibt unverändert.
          </p>
          <p className="mt-1 text-[10px] font-semibold text-[var(--text-secondary)]">
            Status: {meal.completedAt ? "Abgeschlossen" : "Geplant"}
          </p>
        </div>
        {state.message ? (
          <p className="text-[11px] font-semibold text-[var(--text-secondary)]" role={state.status === "success" ? "status" : "alert"}>
            {state.message}
          </p>
        ) : null}
      </div>
      <form action={formAction} className="mt-3 grid gap-3 sm:grid-cols-2">
        <input name="mealId" type="hidden" value={meal.id} />
        <label className="grid gap-1 text-[10px] font-semibold text-[var(--text-muted)]">Titel<input className={inputClass} defaultValue={meal.title} name="title" required /></label>
        <label className="grid gap-1 text-[10px] font-semibold text-[var(--text-muted)]">Datum<input className={inputClass} name="date" onChange={(event) => { const nextDate = event.target.value; setDate(nextDate); setPlannedAt((current) => current ? `${nextDate}${current.slice(10)}` : current); }} required type="date" value={date} /></label>
        <label className="grid gap-1 text-[10px] font-semibold text-[var(--text-muted)]">Meal Type<select className={inputClass} defaultValue={meal.mealType} name="mealType" required>{Object.entries(mealTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="grid gap-1 text-[10px] font-semibold text-[var(--text-muted)]">Geplante Zeit<input className={inputClass} name="plannedAt" onChange={(event) => setPlannedAt(event.target.value)} type="datetime-local" value={plannedAt} /></label>
        <label className="grid gap-1 text-[10px] font-semibold text-[var(--text-muted)] sm:col-span-2">Recipe<select className={inputClass} defaultValue={meal.recipeId} name="recipeId"><option value="">Kein Recipe</option>{recipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.title}</option>)}</select></label>
        <label className="grid gap-1 text-[10px] font-semibold text-[var(--text-muted)] sm:col-span-2">Notizen<textarea className={`${inputClass} min-h-20 resize-y py-2`} defaultValue={meal.notes ?? ""} name="notes" /></label>
        <div className="sm:col-span-2"><button className={primaryButtonClass} disabled={isPending} type="submit">{isPending ? "Meal wird gespeichert …" : "Meal speichern"}</button></div>
      </form>
    </section>
  );
}
