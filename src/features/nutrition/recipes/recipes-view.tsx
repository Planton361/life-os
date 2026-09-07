"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/feedback/toast-provider";
import { NutritionDialog } from "../nutrition-dialog";
import "../nutrition-workspace.css";
import type { CSSProperties } from "react";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  contentStateDataAttributes,
  resolveContentStateMeta,
} from "@/features/content-state";
import {
  archiveRecipeFormStateAction,
  createRecipeIngredientFormStateAction,
  createRecipeFormStateAction,
  deleteRecipeIngredientFormStateAction,
  updateRecipeIngredientFormStateAction,
  updateRecipeFormStateAction,
  type NutritionIngredientActionPayload,
  type NutritionActionResult,
} from "@/features/real-data/actions/nutrition.actions";
import type {
  IngredientUnit,
  MealType,
  Recipe,
  RecipeIngredient,
} from "../meal-planner/meal-planner-types";
import {
  primaryButtonClass,
  quietButtonClass,
  secondaryButtonClass,
} from "../meal-planner/meal-planner-primitives";
import { RecipeBrowser } from "./recipe-browser";
import { RecipeDetailPanel } from "./recipe-detail-panel";
import { RecipeEditorDialog } from "./recipe-editor-dialog";
import type { RecipesViewModel } from "./recipes-view-model";
import {
  cloneRecipe,
  createBlankRecipe,
  duplicateRecipe,
  filterRecipeList,
  ingredientUnitOptions,
  summarizeRecipes,
  type ReadinessFilter,
  type RecipeFormMode,
  type RecipeStats,
  type RecipeTag,
} from "./recipe-utils";

type MealTypeFilter = MealType | "all";
type TagFilter = RecipeTag | "all";

type EditorState = {
  mode: RecipeFormMode;
  recipe: Recipe;
};

const initialNutritionActionState: NutritionActionResult = {
  message: "",
  status: "blocked",
};
const manualInputClass =
  "mt-1 min-h-11 w-full rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.62)] px-3 text-[12px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--focus-ring)] disabled:opacity-60";
const manualTextareaClass =
  "mt-1 min-h-20 w-full resize-y rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.62)] px-3 py-2 text-[12px] leading-5 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--focus-ring)] disabled:opacity-60";

function RecipeActionMessage({
  message,
  status,
}: Readonly<{
  message: string;
  status: "blocked" | "error" | "success";
}>) {
  if (!message) return null;

  return (
    <p
      className={
        status === "success"
          ? "text-[11px] font-semibold text-[var(--accent-green)]"
          : "text-[11px] font-semibold text-[var(--accent-red)]"
      }
      role={status === "error" ? "alert" : "status"}
    >
      {message}
    </p>
  );
}

function recipeInstructionsText(recipe: Recipe) {
  return [...recipe.instructions]
    .sort((first, second) => first.order - second.order)
    .map((instruction) => instruction.text)
    .join("\n");
}

function coerceIngredientUnit(unit: string | null): IngredientUnit {
  const normalized = (unit ?? "").trim().toLowerCase();

  if (normalized === "el") return "tbsp";
  if (normalized === "tl") return "tsp";
  if (normalized === "stück" || normalized === "stueck") return "piece";

  return ingredientUnitOptions.includes(normalized as IngredientUnit)
    ? (normalized as IngredientUnit)
    : "g";
}

function ingredientPayloadToRecipeIngredient(
  ingredient: NutritionIngredientActionPayload,
): RecipeIngredient {
  return {
    amount: ingredient.quantity ?? 0,
    calories: 0,
    carbs: 0,
    displayUnit: ingredient.unit,
    fat: 0,
    id: ingredient.id,
    name: ingredient.name,
    note: ingredient.note,
    position: ingredient.position,
    protein: 0,
    quantity: ingredient.quantity,
    unit: coerceIngredientUnit(ingredient.unit),
  };
}

function sortedRecipeIngredients(
  ingredients: readonly RecipeIngredient[],
): RecipeIngredient[] {
  return [...ingredients].sort((first, second) => {
    const firstPosition = first.position ?? 0;
    const secondPosition = second.position ?? 0;

    if (firstPosition !== secondPosition) {
      return firstPosition - secondPosition;
    }

    return first.name.localeCompare(second.name);
  });
}

function ManualRecipeIngredientCreateForm({
  actionsEnabled,
  recipe,
  onIngredientSaved,
}: Readonly<{
  actionsEnabled: boolean;
  recipe: Recipe;
  onIngredientSaved: (ingredient: NutritionIngredientActionPayload) => void;
}>) {
  const formRef = useRef<HTMLFormElement>(null);
  const handledStateRef = useRef<NutritionActionResult | null>(null);
  const [state, formAction, isPending] = useActionState(
    createRecipeIngredientFormStateAction,
    initialNutritionActionState,
  );
  const disabled = !actionsEnabled || isPending;

  useEffect(() => {
    if (
      state.status !== "success" ||
      !state.ingredient ||
      state === handledStateRef.current
    ) {
      return;
    }

    handledStateRef.current = state;
    onIngredientSaved(state.ingredient);
    formRef.current?.reset();
  }, [onIngredientSaved, state]);

  return (
    <form
      action={formAction}
      aria-labelledby="manual-recipe-ingredient-create-heading"
      className="grid gap-2 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(168,183,204,.04)] p-2.5"
      ref={formRef}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <h4
          className="text-[11px] font-semibold text-[var(--text-primary)]"
          id="manual-recipe-ingredient-create-heading"
        >
          Zutat hinzufügen
        </h4>
        <RecipeActionMessage message={state.message} status={state.status} />
      </div>

      <input name="recipeId" type="hidden" value={recipe.id} />
      <input name="position" type="hidden" value={recipe.ingredients.length} />

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1.2fr)_88px_88px]">
        <label className="min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Name
          </span>
          <input
            className={manualInputClass}
            disabled={disabled}
            name="name"
            placeholder="Olivenöl"
            required
          />
        </label>

        <label className="min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Menge
          </span>
          <input
            className={manualInputClass}
            disabled={disabled}
            inputMode="decimal"
            min="0.01"
            name="quantity"
            step="0.01"
            type="number"
          />
        </label>

        <label className="min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Einheit
          </span>
          <input
            className={manualInputClass}
            disabled={disabled}
            name="unit"
            placeholder="EL"
          />
        </label>
      </div>

      <label className="min-w-0">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
          Notiz optional
        </span>
        <textarea
          className={manualTextareaClass}
          disabled={disabled}
          name="note"
          placeholder="z. B. kalt gepresst"
        />
      </label>

      <button className={primaryButtonClass} disabled={disabled} type="submit">
        Zutat hinzufügen
      </button>
    </form>
  );
}

function ManualRecipeIngredientRowForm({
  actionsEnabled,
  ingredient,
  recipeId,
  onIngredientDeleted,
  onIngredientSaved,
}: Readonly<{
  actionsEnabled: boolean;
  ingredient: RecipeIngredient;
  recipeId: string;
  onIngredientDeleted: (recipeId: string, ingredientId: string) => void;
  onIngredientSaved: (ingredient: NutritionIngredientActionPayload) => void;
}>) {
  const handledUpdateStateRef = useRef<NutritionActionResult | null>(null);
  const handledDeleteStateRef = useRef<NutritionActionResult | null>(null);
  const [updateState, updateAction, isUpdating] = useActionState(
    updateRecipeIngredientFormStateAction,
    initialNutritionActionState,
  );
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deleteRecipeIngredientFormStateAction,
    initialNutritionActionState,
  );
  const disabled = !actionsEnabled || isUpdating || isDeleting;

  useEffect(() => {
    if (
      updateState.status !== "success" ||
      !updateState.ingredient ||
      updateState === handledUpdateStateRef.current
    ) {
      return;
    }

    handledUpdateStateRef.current = updateState;
    onIngredientSaved(updateState.ingredient);
  }, [onIngredientSaved, updateState]);

  useEffect(() => {
    if (
      deleteState.status !== "success" ||
      !deleteState.ingredientId ||
      deleteState === handledDeleteStateRef.current
    ) {
      return;
    }

    handledDeleteStateRef.current = deleteState;
    onIngredientDeleted(deleteState.recipeId ?? recipeId, deleteState.ingredientId);
  }, [deleteState, onIngredientDeleted, recipeId]);

  return (
    <div
      className="grid gap-2 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(14,23,38,.44)] p-2.5"
      data-recipe-ingredient-id={ingredient.id}
      role="listitem"
    >
      <form
        action={updateAction}
        aria-label={`Zutat bearbeiten: ${ingredient.name}`}
        className="grid gap-2"
      >
        <input name="ingredientId" type="hidden" value={ingredient.id} />
        <input name="recipeId" type="hidden" value={recipeId} />
        <input
          name="position"
          type="hidden"
          value={ingredient.position ?? 0}
        />

        <div className="grid gap-2 sm:grid-cols-[minmax(0,1.2fr)_88px_88px]">
          <label className="min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
              Name
            </span>
            <input
              className={manualInputClass}
              defaultValue={ingredient.name}
              disabled={disabled}
              name="name"
              required
            />
          </label>

          <label className="min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
              Menge
            </span>
            <input
              className={manualInputClass}
              defaultValue={ingredient.quantity ?? (ingredient.amount || "")}
              disabled={disabled}
              inputMode="decimal"
              min="0.01"
              name="quantity"
              step="0.01"
              type="number"
            />
          </label>

          <label className="min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
              Einheit
            </span>
            <input
              className={manualInputClass}
              defaultValue={ingredient.displayUnit ?? ""}
              disabled={disabled}
              name="unit"
            />
          </label>
        </div>

        <label className="min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Notiz optional
          </span>
          <textarea
            className={manualTextareaClass}
            defaultValue={ingredient.note ?? ""}
            disabled={disabled}
            name="note"
          />
        </label>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <RecipeActionMessage
            message={updateState.message}
            status={updateState.status}
          />
          <button className={secondaryButtonClass} disabled={disabled} type="submit">
            Zutat speichern
          </button>
        </div>
      </form>

      <form
        action={deleteAction}
        aria-label={`Zutat entfernen: ${ingredient.name}`}
        className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-2 sm:flex-row sm:items-center sm:justify-between"
      >
        <input name="ingredientId" type="hidden" value={ingredient.id} />
        <input name="recipeId" type="hidden" value={recipeId} />
        <RecipeActionMessage
          message={deleteState.message}
          status={deleteState.status}
        />
        <button className={quietButtonClass} disabled={disabled} type="submit">
          Zutat entfernen
        </button>
      </form>
    </div>
  );
}

function ManualRecipeIngredientManager({
  actionsEnabled,
  recipe,
  onIngredientDeleted,
  onIngredientSaved,
}: Readonly<{
  actionsEnabled: boolean;
  recipe: Recipe;
  onIngredientDeleted: (recipeId: string, ingredientId: string) => void;
  onIngredientSaved: (ingredient: NutritionIngredientActionPayload) => void;
}>) {
  const ingredients = sortedRecipeIngredients(recipe.ingredients);

  return (
    <section
      aria-labelledby="manual-recipe-ingredients-heading"
      className="grid gap-2 rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(14,23,38,.48)] p-3"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3
            className="text-[12px] font-semibold text-[var(--text-primary)]"
            id="manual-recipe-ingredients-heading"
          >
            Zutaten verwalten
          </h3>
          <p className="mt-0.5 text-[11px] leading-4 text-[var(--text-muted)]">
            Zutaten bilden die Grundlage für deinen Einkaufsentwurf.
          </p>
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
          {ingredients.length} aktiv
        </p>
      </div>

      {ingredients.length > 0 ? (
        <div
          aria-label="Persistierte Zutaten"
          className="grid gap-2"
          role="list"
        >
          {ingredients.map((ingredient) => (
            <ManualRecipeIngredientRowForm
              actionsEnabled={actionsEnabled}
              ingredient={ingredient}
              key={ingredient.id}
              onIngredientDeleted={onIngredientDeleted}
              onIngredientSaved={onIngredientSaved}
              recipeId={recipe.id}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[12px] border border-dashed border-[var(--border-default)] bg-[rgba(168,183,204,.04)] p-3">
          <p className="text-[11px] leading-5 text-[var(--text-muted)]">
            Noch keine Zutaten hinterlegt.
          </p>
        </div>
      )}

      <ManualRecipeIngredientCreateForm
        actionsEnabled={actionsEnabled}
        onIngredientSaved={onIngredientSaved}
        recipe={recipe}
      />
    </section>
  );
}

function RecipeEstimateFields({ recipe }: {recipe?: Recipe}) {
  return <fieldset className="col-span-full grid gap-2 sm:grid-cols-2"><legend className="text-xs text-[var(--text-muted)]">Optionale Nährwertschätzung für das gesamte Rezept · nur bekannte Werte angeben</legend>{([['calories','Energie (kcal)'],['protein','Protein (g)'],['carbs','Kohlenhydrate (g)'],['fat','Fett (g)']] as const).map(([key,label])=><label key={key} className="text-xs">{label}<input className={manualInputClass} type="number" min="0" step="0.1" name={`estimate_${key}`} defaultValue={recipe?.nutritionEstimateAvailable && (!recipe.availableMacros || recipe.availableMacros.includes(key)) ? recipe.totals[key] : ""}/></label>)}</fieldset>;
}

function ManualRecipePersistedActions({
  actionsEnabled,
  onIngredientDeleted,
  onIngredientSaved,
  recipe,
}: Readonly<{
  actionsEnabled: boolean;
  onIngredientDeleted: (recipeId: string, ingredientId: string) => void;
  onIngredientSaved: (ingredient: NutritionIngredientActionPayload) => void;
  recipe: Recipe;
}>) {
  const [updateState, updateAction, isUpdating] = useActionState(
    updateRecipeFormStateAction,
    initialNutritionActionState,
  );
  const [archiveState, archiveAction, isArchiving] = useActionState(
    archiveRecipeFormStateAction,
    initialNutritionActionState,
  );
  const disabled = !actionsEnabled || isUpdating || isArchiving;
  const router = useRouter();
  const { notify } = useToast();
  useEffect(() => { const state = archiveState.status === "success" ? archiveState : updateState;
    if (state.status === "success") { notify(state.message); router.refresh(); }
  }, [archiveState, updateState, router, notify]);

  return (
    <details className="grid gap-3"><summary className={secondaryButtonClass}>Rezept bearbeiten</summary>
      <form
        action={updateAction}
        aria-labelledby="manual-recipe-edit-heading"
        className="grid gap-3 rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(14,23,38,.48)] p-3"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <h3
            className="text-[12px] font-semibold text-[var(--text-primary)]"
            id="manual-recipe-edit-heading"
          >
            Rezept bearbeiten
          </h3>
          <RecipeActionMessage
            message={updateState.message}
            status={updateState.status}
          />
        </div>

        <input name="recipeId" type="hidden" value={recipe.id} />

        <label className="min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Titel
          </span>
          <input
            className="mt-1 min-h-11 w-full rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.62)] px-3 text-[12px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--focus-ring)] disabled:opacity-60"
            defaultValue={recipe.title}
            disabled={disabled}
            name="title"
            required
          />
        </label>

        <label className="min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Kurzbeschreibung
          </span>
          <input
            className="mt-1 min-h-11 w-full rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.62)] px-3 text-[12px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--focus-ring)] disabled:opacity-60"
            defaultValue={recipe.description ?? ""}
            disabled={disabled}
            name="summary"
          />
        </label>

        <label className="min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Zubereitung
          </span>
          <textarea
            className="mt-1 min-h-24 w-full resize-y rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.62)] px-3 py-2 text-[12px] leading-5 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--focus-ring)] disabled:opacity-60"
            defaultValue={recipeInstructionsText(recipe)}
            disabled={disabled}
            name="instructions"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
              Portionen
            </span>
            <input
              className="mt-1 min-h-11 w-full rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.62)] px-3 text-[12px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--focus-ring)] disabled:opacity-60"
              defaultValue={recipe.defaultServings}
              disabled={disabled}
              min="1"
              name="servings"
              type="number"
            />
          </label>

          <label className="min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
              Zubereitungszeit (min)
            </span>
            <input
              className="mt-1 min-h-11 w-full rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.62)] px-3 text-[12px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--focus-ring)] disabled:opacity-60"
              defaultValue={recipe.prepMinutes ?? ""}
              disabled={disabled}
              min="0"
              name="prepMinutes"
              type="number"
            />
          </label>
        </div>

        <label className="min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Tags / Mahlzeiten (breakfast, lunch, dinner)
          </span>
          <input
            className="mt-1 min-h-11 w-full rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.62)] px-3 text-[12px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--focus-ring)] disabled:opacity-60"
            defaultValue={recipe.tags.join(", ")}
            disabled={disabled}
            name="tags"
          />
        </label>

        <RecipeEstimateFields recipe={recipe}/>
        <button className={primaryButtonClass} disabled={disabled} type="submit">
          Rezept speichern
        </button>
      </form>

      <ManualRecipeIngredientManager
        actionsEnabled={actionsEnabled && !isUpdating && !isArchiving}
        onIngredientDeleted={onIngredientDeleted}
        onIngredientSaved={onIngredientSaved}
        recipe={recipe}
      />

      <form
        action={archiveAction}
        aria-labelledby="manual-recipe-archive-heading"
        className="grid gap-2 rounded-[14px] border border-[rgba(221,107,95,.28)] bg-[rgba(221,107,95,.06)] p-3"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <h3
            className="text-[12px] font-semibold text-[var(--text-primary)]"
            id="manual-recipe-archive-heading"
          >
            Rezept archivieren
          </h3>
          <RecipeActionMessage
            message={archiveState.message}
            status={archiveState.status}
          />
        </div>

        <input name="recipeId" type="hidden" value={recipe.id} />
        <button className={quietButtonClass} disabled={disabled} type="submit">
          Rezept archivieren
        </button>
      </form>
    </details>
  );
}

function ManualRecipeCreateForm({
  actionsEnabled,
}: Readonly<{
  actionsEnabled: boolean;
}>) {
  const [state, formAction, isPending] = useActionState(
    createRecipeFormStateAction,
    initialNutritionActionState,
  );

  const router = useRouter();
  const { notify } = useToast();
  useEffect(() => { if (state.status === "success") { notify("Rezept erstellt."); router.refresh(); } }, [state, router, notify]);

  return (
    <section
      aria-labelledby="manual-recipe-create-heading"
      className="shrink-0 rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-3 shadow-[0_8px_22px_rgba(0,0,0,.12)]"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h2
            className="text-[13px] font-semibold text-[var(--text-primary)]"
            id="manual-recipe-create-heading"
          >
            Rezept erstellen
          </h2>
          <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
            Wiederverwendbares Rezept für deinen Essensplan.
          </p>
        </div>
        <RecipeActionMessage message={state.message} status={state.status} />
      </div>

      <form action={formAction} className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Titel
          </span>
          <input
            className="mt-1 min-h-11 w-full rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.62)] px-3 text-[12px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--focus-ring)] disabled:opacity-60"
            disabled={!actionsEnabled || isPending}
            name="title"
            placeholder="Rezeptname"
            required
          />
        </label>
        <label className="min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Kurzbeschreibung
          </span>
          <input
            className="mt-1 min-h-11 w-full rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.62)] px-3 text-[12px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--focus-ring)] disabled:opacity-60"
            disabled={!actionsEnabled || isPending}
            name="summary"
            placeholder="Kurze Beschreibung"
          />
        </label>
        <label className="min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Portionen
          </span>
          <input
            className="mt-1 min-h-11 w-full rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.62)] px-3 text-[12px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--focus-ring)] disabled:opacity-60"
            defaultValue="1"
            disabled={!actionsEnabled || isPending}
            min="1"
            name="servings"
            type="number"
          />
        </label>
        <label className="min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Zubereitungszeit (min)
          </span>
          <input
            className="mt-1 min-h-11 w-full rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.62)] px-3 text-[12px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--focus-ring)] disabled:opacity-60"
            disabled={!actionsEnabled || isPending}
            min="1"
            name="prepMinutes"
            type="number"
          />
        </label>
        <label className="min-w-0 sm:col-span-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Tags / Mahlzeiten (breakfast, lunch, dinner)
          </span>
          <input
            className="mt-1 min-h-11 w-full rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.62)] px-3 text-[12px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--focus-ring)] disabled:opacity-60"
            disabled={!actionsEnabled || isPending}
            name="tags"
            placeholder="lunch, quick"
          />
        </label>
        <label className="text-xs sm:col-span-2">Zubereitung<textarea className={manualTextareaClass} name="instructions" /></label>
        <RecipeEstimateFields/>
        <input name="source" type="hidden" value="manual" />
        <div className="flex items-end sm:col-span-2">
          <button
            className={primaryButtonClass}
            disabled={!actionsEnabled || isPending}
            type="submit"
          >
            Rezept erstellen
          </button>
        </div>
      </form>
    </section>
  );
}

function StatTile({
  label,
  value,
  helper,
  accent = "var(--accent-orange)",
}: Readonly<{
  label: string;
  value: string;
  helper: string;
  accent?: string;
}>) {
  return (
    <div
      className="flex min-h-12 items-center justify-between gap-3 rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_22%,var(--border-subtle))] bg-[rgba(168,183,204,.04)] px-3 py-2"
      style={{ "--accent": accent } as CSSProperties}
    >
      <div className="min-w-0">
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
          {label}
        </p>
        <p className="truncate text-[10px] leading-4 text-[var(--text-muted)]">
          {helper}
        </p>
      </div>
      <p className="shrink-0 text-lg font-semibold text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

function RecipeSummary({
  stats,
  stateAttributes,
}: Readonly<{
  stats: RecipeStats;
  stateAttributes?: Record<string, string>;
}>) {
  return (
    <section
      aria-labelledby="recipe-summary-heading"
      className="shrink-0 rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-3 shadow-[0_8px_22px_rgba(0,0,0,.12)]"
      {...stateAttributes}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2
            className="text-[13px] font-semibold text-[var(--text-primary)]"
            id="recipe-summary-heading"
          >
            Bibliotheksstatus
          </h2>
        </div>
        <p className="truncate text-[10px] leading-4 text-[var(--text-muted)]">
          Rezepte für Essensplan und Einkauf.
        </p>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile
          helper={`${stats.activeRecipes} aktiv`}
          label="Rezepte gesamt"
          value={`${stats.totalRecipes}`}
        />
        <StatTile
          accent="var(--accent-green)"
          helper="Alle Angaben vorhanden"
          label="Vollständig"
          value={`${stats.readyForPlanner}`}
        />
        <StatTile
          accent="var(--accent-yellow)"
          helper="Optionale Schätzung"
          label="Nährwerte fehlen"
          value={`${stats.needsMacros}`}
        />
        <StatTile
          accent="var(--accent-cyan)"
          helper="Zutaten ergänzen"
          label="Zutaten fehlen"
          value={`${stats.needsIngredients}`}
        />
        <StatTile
          accent="var(--accent-orange)"
          helper={stats.mealTypeCoverage}
          label="Ø Zubereitungszeit"
          value={stats.totalRecipes ? `${stats.averageTotalMinutes} min` : "—"}
        />
      </div>
    </section>
  );
}

function RecipesWorkbench({
  viewModel,
  initialRecipeId,
}: Readonly<{
  viewModel: RecipesViewModel;
  initialRecipeId?: string;
}>) {
  const profileId = viewModel.profileId ?? "demo";
  const actionsEnabled = viewModel.actionsEnabled ?? true;
  const hasPersistedManualActions = profileId === "manual";
  const [recipes, setRecipes] = useState<Recipe[]>(() =>
    viewModel.recipes.map(cloneRecipe),
  );
  const [query, setQuery] = useState("");
  const [mealType, setMealType] = useState<MealTypeFilter>("all");
  const [tag, setTag] = useState<TagFilter>("all");
  const [readiness, setReadiness] = useState<ReadinessFilter>("all");
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(
    () => viewModel.recipes.find((recipe) => !recipe.archived && recipe.id === initialRecipeId)?.id ?? viewModel.recipes.find((recipe) => !recipe.archived)?.id ?? null,
  );
  const [manualCreateOpen, setManualCreateOpen] = useState(false);
  const [sort, setSort] = useState("recent");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const stats = useMemo(() => summarizeRecipes(recipes), [recipes]);
  const filteredRecipes = useMemo(
    () => filterRecipeList(recipes, query, mealType, tag, readiness).sort((a,b) => sort === "title" ? a.title.localeCompare(b.title,"de-DE") : (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")),
    [mealType, query, readiness, recipes, tag, sort],
  );
  const activeRecipes = recipes.filter((recipe) => !recipe.archived);
  const selectedRecipe =
    activeRecipes.find((recipe) => recipe.id === selectedRecipeId) ??
    filteredRecipes[0] ??
    activeRecipes[0] ??
    null;
  const contentStates =
    viewModel.contentStates ??
    {
      browser: resolveContentStateMeta({
        capacity: 8,
        itemCount: filteredRecipes.length,
      }),
      page: resolveContentStateMeta({
        capacity: 8,
        itemCount: activeRecipes.length,
      }),
      selectedRecipe: resolveContentStateMeta({
        capacity: 1,
        itemCount: selectedRecipe ? 1 : 0,
      }),
      summary: resolveContentStateMeta({
        capacity: 5,
        itemCount: activeRecipes.length > 0 ? 5 : 0,
      }),
    };
  const stateAttrs = (meta: (typeof contentStates)[keyof typeof contentStates]) =>
    contentStateDataAttributes(meta, profileId);

  function openNewRecipe() {
    setEditor({
      mode: "new",
      recipe: createBlankRecipe(),
    });
    setConfirmingArchive(false);
  }

  function openEditRecipe(recipe: Recipe) {
    setEditor({
      mode: "edit",
      recipe: cloneRecipe(recipe),
    });
    setConfirmingArchive(false);
  }

  function saveRecipe(recipe: Recipe) {
    if (editor?.mode === "new") {
      setRecipes((current) => [recipe, ...current]);
    } else {
      setRecipes((current) =>
        current.map((currentRecipe) =>
          currentRecipe.id === recipe.id ? recipe : currentRecipe,
        ),
      );
    }

    setSelectedRecipeId(recipe.id);
    setEditor(null);
    setToast("Recipe saved locally for this session");
  }

  function duplicateSelectedRecipe(recipe: Recipe) {
    const duplicate = duplicateRecipe(recipe);

    setRecipes((current) => [duplicate, ...current]);
    setSelectedRecipeId(duplicate.id);
    setConfirmingArchive(false);
    setToast("Recipe duplicated locally for this session");
  }

  function archiveSelectedRecipe() {
    if (!selectedRecipe) {
      return;
    }

    const nextActive = activeRecipes.filter((recipe) => recipe.id !== selectedRecipe.id);

    setRecipes((current) =>
      current.map((recipe) =>
        recipe.id === selectedRecipe.id
          ? {
              ...recipe,
              archived: true,
              updatedAt: new Date().toISOString().slice(0, 10),
            }
          : recipe,
      ),
    );
    setSelectedRecipeId(nextActive[0]?.id ?? null);
    setConfirmingArchive(false);
    setToast("Recipe archived locally for this session");
  }

  function upsertRecipeIngredient(
    ingredient: NutritionIngredientActionPayload,
  ) {
    const nextIngredient = ingredientPayloadToRecipeIngredient(ingredient);

    setRecipes((current) =>
      current.map((recipe) => {
        if (recipe.id !== ingredient.recipeId) {
          return recipe;
        }

        const existingIngredients = recipe.ingredients.filter(
          (candidate) => candidate.id !== ingredient.id,
        );

        return {
          ...recipe,
          ingredients: sortedRecipeIngredients([
            ...existingIngredients,
            nextIngredient,
          ]),
          updatedAt: new Date().toISOString().slice(0, 10),
        };
      }),
    );
    setSelectedRecipeId(ingredient.recipeId);
  }

  function deleteRecipeIngredient(recipeId: string, ingredientId: string) {
    setRecipes((current) =>
      current.map((recipe) =>
        recipe.id === recipeId
          ? {
              ...recipe,
              ingredients: recipe.ingredients.filter(
                (ingredient) => ingredient.id !== ingredientId,
              ),
              updatedAt: new Date().toISOString().slice(0, 10),
            }
          : recipe,
      ),
    );
    setSelectedRecipeId(recipeId);
  }

  return (
    <div
      className="nutrition-workspace-page"
      id="recipes-page"
      data-nutrition-surface="recipes"
      {...stateAttrs(contentStates.page)}
    >
      <header className="shrink-0 overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-1)] shadow-[0_8px_22px_rgba(0,0,0,.12)]">
        <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              {profileId === "demo" ? viewModel.header.eyebrow : "Life OS / Ernährung / Rezepte"}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-[var(--text-primary)]">
              {profileId !== "demo" ? "Rezepte" : viewModel.header.title}
            </h1>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--text-secondary)]">
              {profileId !== "demo" ? "Deine Rezeptbibliothek · auswählen, pflegen und im Essensplan verwenden" : viewModel.header.subline}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className={secondaryButtonClass} href="/nutrition/meal-planner">
              Essensplan
            </Link>
            <button
              className={primaryButtonClass}
              disabled={!actionsEnabled}
              onClick={() => hasPersistedManualActions ? setManualCreateOpen(true) : openNewRecipe()}
              type="button"
            >
              Neues Rezept
            </button>
          </div>
        </div>

        {toast ? (
          <div
            className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] bg-[rgba(18,28,43,.56)] px-4 py-2 text-[11px] font-semibold text-[var(--text-secondary)]"
            role="status"
          >
            <span>{toast}</span>
            <button
              className="min-h-8 rounded-full border border-[var(--border-subtle)] px-3 text-[10px] text-[var(--text-muted)] transition hover:text-[var(--text-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              onClick={() => setToast(null)}
              type="button"
            >
              Schließen
            </button>
          </div>
        ) : null}
      </header>

      {hasPersistedManualActions && manualCreateOpen ? (
        <NutritionDialog title="Neues Rezept" onClose={()=>setManualCreateOpen(false)}><ManualRecipeCreateForm actionsEnabled={actionsEnabled} /></NutritionDialog>
      ) : null}

      {viewModel.unavailableReason && <p role="alert">{viewModel.unavailableReason}</p>}
      <RecipeSummary
        stateAttributes={stateAttrs(contentStates.summary)}
        stats={stats}
      />

      <div className="nutrition-recipes-grid grid min-h-0 gap-3 xl:flex-1 xl:items-stretch">
        <RecipeBrowser
          sort={sort}
          onSortChange={setSort}
          mealType={mealType}
          onMealTypeChange={setMealType}
          onQueryChange={setQuery}
          onReadinessChange={setReadiness}
          onSelectRecipe={(recipeId) => {
            setSelectedRecipeId(recipeId);
            setConfirmingArchive(false);
          }}
          onTagChange={setTag}
          query={query}
          readiness={readiness}
          recipes={filteredRecipes}
          selectedRecipeId={selectedRecipe?.id ?? null}
          stateAttributes={stateAttrs(contentStates.browser)}
          tag={tag}
        />

        <RecipeDetailPanel
          confirmingArchive={confirmingArchive}
          actionsEnabled={actionsEnabled && !hasPersistedManualActions}
          manualActions={
            hasPersistedManualActions && selectedRecipe ? (
              <ManualRecipePersistedActions
                actionsEnabled={actionsEnabled}
                key={selectedRecipe.id}
                onIngredientDeleted={deleteRecipeIngredient}
                onIngredientSaved={upsertRecipeIngredient}
                recipe={selectedRecipe}
              />
            ) : undefined
          }
          onCancelArchive={() => setConfirmingArchive(false)}
          onConfirmArchive={archiveSelectedRecipe}
          onDuplicate={duplicateSelectedRecipe}
          onEdit={openEditRecipe}
          onRequestArchive={() => setConfirmingArchive(true)}
          recipe={selectedRecipe}
          stateAttributes={stateAttrs(contentStates.selectedRecipe)}
        />
      </div>

      {editor ? (
        <RecipeEditorDialog
          key={`${editor.mode}-${editor.recipe.id}`}
          mode={editor.mode}
          onClose={() => setEditor(null)}
          onSave={saveRecipe}
          recipe={editor.recipe}
        />
      ) : null}
    </div>
  );
}

export function RecipesView(props: Readonly<{viewModel: RecipesViewModel; initialRecipeId?: string}>) {
  return <RecipesWorkbench key={props.viewModel.recipes.map(r=>`${r.id}:${r.updatedAt}:${r.archived}`).join("|")} {...props}/>;
}
