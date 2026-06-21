"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type {
  IngredientUnit,
  MealType,
  Recipe,
  RecipeIngredient,
  RecipeInstruction,
} from "../meal-planner/meal-planner-types";
import {
  chipButtonClass,
  inputClass,
  primaryButtonClass,
  quietButtonClass,
  secondaryButtonClass,
} from "../meal-planner/meal-planner-primitives";
import {
  emptyTotals,
  macroLabels,
  macroUnits,
  mealTypes,
  mealTypeLabels,
} from "../meal-planner/meal-planner-utils";
import { RecipeReadinessBadge } from "./recipe-readiness-badge";
import {
  calculateIngredientTotals,
  cloneRecipe,
  createBlankIngredient,
  createBlankInstruction,
  getRecipeReadiness,
  ingredientUnitOptions,
  normalizeRecipeForSave,
  recipeImageOptions,
  recipeTagLabels,
  recipeTagOptions,
  validateRecipeDraft,
  type RecipeFormMode,
  type RecipeTag,
} from "./recipe-utils";

function numberFromInput(value: string) {
  const next = Number(value);

  return Number.isFinite(next) ? next : 0;
}

function FieldLabel({
  children,
  optional = false,
}: Readonly<{
  children: string;
  optional?: boolean;
}>) {
  return (
    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
      {children}
      {optional ? (
        <span className="ml-1 font-medium normal-case tracking-normal text-[var(--text-faint)]">
          optional
        </span>
      ) : null}
    </span>
  );
}

function ToggleButton({
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
        chipButtonClass,
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

export function RecipeEditorDialog({
  mode,
  recipe,
  onClose,
  onSave,
}: Readonly<{
  mode: RecipeFormMode;
  recipe: Recipe;
  onClose: () => void;
  onSave: (recipe: Recipe) => void;
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<Recipe>(() => cloneRecipe(recipe));

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog.open) {
        dialog.close();
      }
    };
  }, []);

  const validation = useMemo(
    () => validateRecipeDraft(draft),
    [draft],
  );
  const totalsFromIngredients = draft.ingredients.length > 0;
  const readiness = getRecipeReadiness(draft);

  function updateDraft(updater: (current: Recipe) => Recipe) {
    setDraft((current) => updater(current));
  }

  function updateText(
    key: "title" | "description",
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    updateDraft((current) => ({
      ...current,
      [key]: event.target.value,
    }));
  }

  function updateNumber(
    key: "defaultServings" | "prepMinutes" | "cookMinutes",
    event: ChangeEvent<HTMLInputElement>,
  ) {
    updateDraft((current) => ({
      ...current,
      [key]: numberFromInput(event.target.value),
    }));
  }

  function updateMacro(
    key: keyof Recipe["totals"],
    event: ChangeEvent<HTMLInputElement>,
  ) {
    updateDraft((current) => ({
      ...current,
      totals: {
        ...current.totals,
        [key]: numberFromInput(event.target.value),
      },
    }));
  }

  function toggleMealType(mealType: MealType) {
    updateDraft((current) => {
      const mealTypesForRecipe = current.mealTypes.includes(mealType)
        ? current.mealTypes.filter((type) => type !== mealType)
        : [...current.mealTypes, mealType];

      return {
        ...current,
        mealTypes: mealTypesForRecipe,
      };
    });
  }

  function toggleTag(tag: RecipeTag) {
    updateDraft((current) => {
      const tags = current.tags.includes(tag)
        ? current.tags.filter((currentTag) => currentTag !== tag)
        : [...current.tags, tag];

      return {
        ...current,
        tags,
      };
    });
  }

  function updateImage(event: ChangeEvent<HTMLSelectElement>) {
    const selected = recipeImageOptions.find(
      (option) => option.imageUrl === event.target.value,
    );

    updateDraft((current) => ({
      ...current,
      imageUrl: selected?.imageUrl,
      imageAlt: selected?.imageAlt,
    }));
  }

  function updateIngredient(
    ingredientId: string,
    updater: (ingredient: RecipeIngredient) => RecipeIngredient,
  ) {
    updateDraft((current) => {
      const ingredients = current.ingredients.map((ingredient) =>
        ingredient.id === ingredientId ? updater(ingredient) : ingredient,
      );

      return {
        ...current,
        ingredients,
        totals: ingredients.length > 0 ? calculateIngredientTotals(ingredients) : emptyTotals(),
      };
    });
  }

  function addIngredient() {
    updateDraft((current) => {
      const ingredients = [
        ...current.ingredients,
        createBlankIngredient(Date.now() + current.ingredients.length),
      ];

      return {
        ...current,
        ingredients,
        totals: calculateIngredientTotals(ingredients),
      };
    });
  }

  function removeIngredient(ingredientId: string) {
    updateDraft((current) => {
      const ingredients = current.ingredients.filter(
        (ingredient) => ingredient.id !== ingredientId,
      );

      return {
        ...current,
        ingredients,
        totals: ingredients.length > 0 ? calculateIngredientTotals(ingredients) : emptyTotals(),
      };
    });
  }

  function updateInstruction(
    instructionId: string,
    updater: (instruction: RecipeInstruction) => RecipeInstruction,
  ) {
    updateDraft((current) => ({
      ...current,
      instructions: current.instructions.map((instruction) =>
        instruction.id === instructionId ? updater(instruction) : instruction,
      ),
    }));
  }

  function addInstruction() {
    updateDraft((current) => ({
      ...current,
      instructions: [
        ...current.instructions,
        createBlankInstruction(
          current.instructions.length + 1,
          Date.now() + current.instructions.length,
        ),
      ],
    }));
  }

  function removeInstruction(instructionId: string) {
    updateDraft((current) => ({
      ...current,
      instructions: current.instructions
        .filter((instruction) => instruction.id !== instructionId)
        .map((instruction, index) => ({ ...instruction, order: index + 1 })),
    }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validation.canSave) {
      return;
    }

    onSave(normalizeRecipeForSave(draft));
  }

  return (
    <dialog
      aria-labelledby="recipe-editor-dialog-heading"
      className="max-h-[calc(100dvh-24px)] w-[min(980px,calc(100vw-24px))] overflow-hidden rounded-[18px] border border-[var(--border-default)] bg-[var(--surface-1)] p-0 text-left text-[var(--text-primary)] shadow-[0_24px_80px_rgba(0,0,0,.48)] backdrop:bg-[rgba(0,0,0,.58)]"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      ref={dialogRef}
    >
      <form className="flex max-h-[calc(100dvh-24px)] flex-col" onSubmit={submit}>
          <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-yellow)]">
                  Dialog - Recipe Workbench
                </p>
                <h2
                  className="mt-1 text-[18px] font-semibold leading-6 text-[var(--text-primary)]"
                  id="recipe-editor-dialog-heading"
                >
                  {mode === "new" ? "New recipe" : "Edit recipe"}
                </h2>
                <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
                  Totals are stored locally from recipe input.
                </p>
              </div>
              <button
                aria-label="Close recipe editor"
                className="size-8 shrink-0 rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.82)] text-[15px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                onClick={onClose}
                type="button"
              >
                x
              </button>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto px-4 py-4">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,.95fr)_minmax(320px,.55fr)]">
              <div className="grid gap-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block min-w-0 sm:col-span-2">
                    <FieldLabel>Title</FieldLabel>
                    <input
                      aria-invalid={!draft.title.trim()}
                      className={cn(
                        inputClass,
                        !draft.title.trim() && "border-[rgba(221,107,95,.55)]",
                      )}
                      onChange={(event) => updateText("title", event)}
                      placeholder="Chicken wrap"
                      type="text"
                      value={draft.title}
                    />
                  </label>

                  <label className="block min-w-0 sm:col-span-2">
                    <FieldLabel optional>Description</FieldLabel>
                    <textarea
                      className={cn(inputClass, "min-h-[84px] resize-y py-2 leading-5")}
                      onChange={(event) => updateText("description", event)}
                      placeholder="Short planner-facing note"
                      rows={3}
                      value={draft.description ?? ""}
                    />
                  </label>

                  <label className="block min-w-0">
                    <FieldLabel>Default servings</FieldLabel>
                    <input
                      className={inputClass}
                      min="0"
                      onChange={(event) => updateNumber("defaultServings", event)}
                      step="0.5"
                      type="number"
                      value={draft.defaultServings}
                    />
                  </label>

                  <label className="block min-w-0">
                    <FieldLabel optional>Image placeholder</FieldLabel>
                    <select
                      className={inputClass}
                      onChange={updateImage}
                      value={draft.imageUrl ?? ""}
                    >
                      {recipeImageOptions.map((option) => (
                        <option key={option.imageUrl} value={option.imageUrl}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-2">
                  <FieldLabel>Meal types</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {mealTypes.map((mealType) => (
                      <ToggleButton
                        active={draft.mealTypes.includes(mealType)}
                        key={mealType}
                        onClick={() => toggleMealType(mealType)}
                      >
                        {mealTypeLabels[mealType]}
                      </ToggleButton>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2">
                  <FieldLabel optional>Tags</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {recipeTagOptions.map((tag) => (
                      <ToggleButton
                        active={draft.tags.includes(tag)}
                        key={tag}
                        onClick={() => toggleTag(tag)}
                      >
                        {recipeTagLabels[tag]}
                      </ToggleButton>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block min-w-0">
                    <FieldLabel>Prep minutes</FieldLabel>
                    <input
                      className={inputClass}
                      min="0"
                      onChange={(event) => updateNumber("prepMinutes", event)}
                      type="number"
                      value={draft.prepMinutes ?? 0}
                    />
                  </label>
                  <label className="block min-w-0">
                    <FieldLabel>Cook minutes</FieldLabel>
                    <input
                      className={inputClass}
                      min="0"
                      onChange={(event) => updateNumber("cookMinutes", event)}
                      type="number"
                      value={draft.cookMinutes ?? 0}
                    />
                  </label>
                </div>

                <section
                  aria-labelledby="recipe-editor-ingredients-heading"
                  className="grid gap-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3
                        className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]"
                        id="recipe-editor-ingredients-heading"
                      >
                        Ingredients
                      </h3>
                      <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
                        Ingredient macros update recipe totals automatically.
                      </p>
                    </div>
                    <button className={secondaryButtonClass} onClick={addIngredient} type="button">
                      Add ingredient
                    </button>
                  </div>

                  <div className="grid gap-3">
                    {draft.ingredients.map((ingredient, index) => (
                      <div
                        className="grid gap-2 rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(168,183,204,.04)] p-3"
                        key={ingredient.id}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[11px] font-semibold text-[var(--text-muted)]">
                            Ingredient {index + 1}
                          </p>
                          <button
                            className={quietButtonClass}
                            onClick={() => removeIngredient(ingredient.id)}
                            type="button"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-[minmax(180px,1.3fr)_minmax(80px,.6fr)_minmax(92px,.6fr)]">
                          <label className="block min-w-0">
                            <FieldLabel>Name</FieldLabel>
                            <input
                              className={inputClass}
                              onChange={(event) =>
                                updateIngredient(ingredient.id, (current) => ({
                                  ...current,
                                  name: event.target.value,
                                }))
                              }
                              placeholder="Chicken breast"
                              type="text"
                              value={ingredient.name}
                            />
                          </label>
                          <label className="block min-w-0">
                            <FieldLabel>Amount</FieldLabel>
                            <input
                              className={inputClass}
                              min="0"
                              onChange={(event) =>
                                updateIngredient(ingredient.id, (current) => ({
                                  ...current,
                                  amount: numberFromInput(event.target.value),
                                }))
                              }
                              type="number"
                              value={ingredient.amount}
                            />
                          </label>
                          <label className="block min-w-0">
                            <FieldLabel>Unit</FieldLabel>
                            <select
                              className={inputClass}
                              onChange={(event) =>
                                updateIngredient(ingredient.id, (current) => ({
                                  ...current,
                                  unit: event.target.value as IngredientUnit,
                                }))
                              }
                              value={ingredient.unit}
                            >
                              {ingredientUnitOptions.map((unit) => (
                                <option key={unit} value={unit}>
                                  {unit}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-4">
                          {(["calories", "protein", "carbs", "fat"] as const).map(
                            (macro) => (
                              <label className="block min-w-0" key={macro}>
                                <FieldLabel>{macroLabels[macro]}</FieldLabel>
                                <input
                                  aria-label={`${ingredient.name || "Ingredient"} ${macroLabels[macro]}`}
                                  className={inputClass}
                                  min="0"
                                  onChange={(event) =>
                                    updateIngredient(ingredient.id, (current) => ({
                                      ...current,
                                      [macro]: numberFromInput(event.target.value),
                                    }))
                                  }
                                  step="0.1"
                                  type="number"
                                  value={ingredient[macro]}
                                />
                              </label>
                            ),
                          )}
                        </div>
                      </div>
                    ))}
                    {draft.ingredients.length === 0 ? (
                      <div className="rounded-[14px] border border-dashed border-[var(--border-default)] bg-[rgba(168,183,204,.04)] p-3">
                        <p className="text-[12px] font-semibold text-[var(--text-secondary)]">
                          No ingredients yet
                        </p>
                        <p className="mt-1 text-[11px] leading-5 text-[var(--text-muted)]">
                          Save is still possible after required identity fields, but
                          readiness will stay incomplete.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </section>

                <section
                  aria-labelledby="recipe-editor-instructions-heading"
                  className="grid gap-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3
                        className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]"
                        id="recipe-editor-instructions-heading"
                      >
                        Instructions
                      </h3>
                      <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
                        Steps are stored in display order.
                      </p>
                    </div>
                    <button className={secondaryButtonClass} onClick={addInstruction} type="button">
                      Add step
                    </button>
                  </div>

                  <div className="grid gap-3">
                    {draft.instructions.map((instruction, index) => (
                      <div
                        className="grid gap-2 rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(168,183,204,.04)] p-3"
                        key={instruction.id}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[11px] font-semibold text-[var(--text-muted)]">
                            Step {index + 1}
                          </p>
                          <button
                            className={quietButtonClass}
                            onClick={() => removeInstruction(instruction.id)}
                            type="button"
                          >
                            Remove
                          </button>
                        </div>
                        <textarea
                          aria-label={`Instruction step ${index + 1}`}
                          className={cn(inputClass, "min-h-[76px] resize-y py-2 leading-5")}
                          onChange={(event) =>
                            updateInstruction(instruction.id, (current) => ({
                              ...current,
                              order: index + 1,
                              text: event.target.value,
                            }))
                          }
                          rows={3}
                          value={instruction.text}
                        />
                      </div>
                    ))}
                    {draft.instructions.length === 0 ? (
                      <div className="rounded-[14px] border border-dashed border-[var(--border-default)] bg-[rgba(168,183,204,.04)] p-3">
                        <p className="text-[12px] font-semibold text-[var(--text-secondary)]">
                          No instructions yet
                        </p>
                        <p className="mt-1 text-[11px] leading-5 text-[var(--text-muted)]">
                          The recipe can be stored locally, but it will not be ready
                          for planner use.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </section>
              </div>

              <aside className="grid h-fit gap-4 rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(14,23,38,.58)] p-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
                    Readiness
                  </p>
                  <div className="mt-2">
                    <RecipeReadinessBadge readiness={readiness} />
                  </div>
                </div>

                <section aria-labelledby="recipe-editor-macros-heading" className="grid gap-3">
                  <div>
                    <h3
                      className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]"
                      id="recipe-editor-macros-heading"
                    >
                      Macro totals
                    </h3>
                    <p className="mt-1 text-[11px] leading-5 text-[var(--text-muted)]">
                      {totalsFromIngredients
                        ? "Totals are calculated from ingredient macros."
                        : "Manual totals are enabled until ingredients are added."}
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                    {(["calories", "protein", "carbs", "fat"] as const).map((macro) => (
                      <label className="block min-w-0" key={macro}>
                        <FieldLabel>{`${macroLabels[macro]} (${macroUnits[macro]})`}</FieldLabel>
                        <input
                          className={cn(
                            inputClass,
                            totalsFromIngredients && "opacity-80",
                          )}
                          min="0"
                          onChange={(event) => updateMacro(macro, event)}
                          readOnly={totalsFromIngredients}
                          step="0.1"
                          type="number"
                          value={draft.totals[macro]}
                        />
                      </label>
                    ))}
                  </div>
                </section>

                {validation.errors.length > 0 ? (
                  <div
                    className="rounded-[14px] border border-[rgba(221,107,95,.30)] bg-[rgba(221,107,95,.08)] p-3"
                    role="alert"
                  >
                    <p className="text-[12px] font-semibold text-[var(--text-secondary)]">
                      Required before save
                    </p>
                    <ul className="mt-2 grid gap-1 text-[11px] leading-5 text-[var(--text-muted)]">
                      {validation.errors.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="rounded-[14px] border border-[rgba(79,208,164,.26)] bg-[rgba(79,208,164,.06)] p-3">
                    <p className="text-[12px] font-semibold text-[var(--text-secondary)]">
                      Required fields complete
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-[var(--text-muted)]">
                      Save updates the local workbench state only.
                    </p>
                  </div>
                )}
              </aside>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] bg-[rgba(11,17,28,.58)] px-4 py-3">
            <p className="max-w-md text-[10px] leading-4 text-[var(--text-faint)]">
              Phase 2 UI only. No Supabase write, no external nutrition lookup and no
              image upload runs here.
            </p>
            <div className="flex flex-wrap gap-2">
              <button className={secondaryButtonClass} onClick={onClose} type="button">
                Cancel
              </button>
              <button className={primaryButtonClass} disabled={!validation.canSave} type="submit">
                Save recipe
              </button>
            </div>
          </div>
      </form>
    </dialog>
  );
}
