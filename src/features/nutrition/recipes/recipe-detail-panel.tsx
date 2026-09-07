import type { ReactNode } from "react";
import { RecipeImage } from "../meal-planner/recipe-image";
import {
  primaryButtonClass,
  quietButtonClass,
  secondaryButtonClass,
  PlannerPanel,
  PlannerPill,
} from "../meal-planner/meal-planner-primitives";
import type { Recipe } from "../meal-planner/meal-planner-types";
import {
  formatMacro,
  macroLabels,
  macroUnits,
  mealTypeLabels,
} from "../meal-planner/meal-planner-utils";
import { RecipeReadinessBadge } from "./recipe-readiness-badge";
import {
  formatRecipeMinutes,
  getRecipeReadiness,
  getRecipeTotalMinutes,
  getTagLabel,
} from "./recipe-utils";

function DetailMetric({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <div className="rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(168,183,204,.04)] px-2.5 py-1.5">
      <p className="text-[9px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
        {label}
      </p>
      <p className="mt-0.5 text-[12px] font-semibold text-[var(--text-secondary)]">
        {value}
      </p>
    </div>
  );
}

function formatIngredientQuantity(
  quantity: number | null | undefined,
  fallbackAmount: number,
) {
  const amount = quantity ?? fallbackAmount;

  if (!Number.isFinite(amount) || amount <= 0) return "";

  return new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 2,
  }).format(amount);
}

function ingredientAmountLabel(
  ingredient: Recipe["ingredients"][number],
) {
  const amount = formatIngredientQuantity(
    ingredient.quantity,
    ingredient.amount,
  );
  const unit = ingredient.displayUnit ?? ingredient.unit;

  if (!amount && !unit) return "";

  return [amount, unit].filter(Boolean).join(" ");
}

export function RecipeDetailPanel({
  recipe,
  confirmingArchive,
  actionsEnabled,
  stateAttributes,
  manualActions,
  onEdit,
  onDuplicate,
  onRequestArchive,
  onCancelArchive,
  onConfirmArchive,
}: Readonly<{
  recipe: Recipe | null;
  confirmingArchive: boolean;
  actionsEnabled: boolean;
  manualActions?: ReactNode;
  stateAttributes?: Record<string, string>;
  onEdit: (recipe: Recipe) => void;
  onDuplicate: (recipe: Recipe) => void;
  onRequestArchive: () => void;
  onCancelArchive: () => void;
  onConfirmArchive: () => void;
}>) {
  if (!recipe) {
    return (
      <PlannerPanel
        bodyClassName="p-3"
        className="min-h-0 xl:h-full"
        stateAttributes={stateAttributes}
        subtitle="Wähle ein Rezept."
        title="Ausgewähltes Rezept"
      >
        <div className="rounded-[14px] border border-dashed border-[var(--border-default)] bg-[rgba(168,183,204,.04)] p-4">
          <p className="text-sm font-semibold text-[var(--text-secondary)]">
            Kein Rezept ausgewählt
          </p>
          <p className="mt-1 text-[11px] leading-5 text-[var(--text-muted)]">
            Wähle ein Rezept aus der Bibliothek oder erstelle ein neues.
          </p>
        </div>
      </PlannerPanel>
    );
  }

  const readiness = getRecipeReadiness(recipe);

  return (
    <PlannerPanel
      bodyClassName="flex min-h-0 flex-col gap-3 p-3 xl:overflow-y-auto"
      className="min-h-0 xl:h-full"
      stateAttributes={stateAttributes}
      subtitle="Details und Rezeptpflege"
      title="Ausgewähltes Rezept"
    >
      <div className="flex min-w-0 gap-2.5">
        <RecipeImage recipe={recipe} variant="compact" />
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold leading-5 text-[var(--text-primary)]">
            {recipe.title}
          </h2>
          <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[var(--text-muted)]">
            {recipe.description ?? "Keine Beschreibung hinterlegt."}
          </p>
        </div>
      </div>

      <RecipeReadinessBadge readiness={readiness} />

      <div className="flex flex-wrap gap-1">
        {recipe.mealTypes.map((mealType) => (
          <PlannerPill accent="var(--accent-orange)" key={mealType}>
            {mealTypeLabels[mealType]}
          </PlannerPill>
        ))}
        {recipe.tags.filter(tag => !recipe.mealTypes.includes(tag as typeof recipe.mealTypes[number])).map((tag) => (
          <PlannerPill key={tag} quiet>
            {getTagLabel(tag)}
          </PlannerPill>
        ))}
      </div>

      <div className="grid gap-1.5 sm:grid-cols-2">
        <DetailMetric label="Portionen" value={`${recipe.defaultServings}`} />
        <DetailMetric
          label="Gesamtzeit"
          value={formatRecipeMinutes(getRecipeTotalMinutes(recipe))}
        />
        <DetailMetric label="Vorbereitung" value={recipe.prepMinutes === undefined ? "—" : formatRecipeMinutes(recipe.prepMinutes)} />
        <DetailMetric label="Kochzeit" value={recipe.cookMinutes === undefined ? "—" : formatRecipeMinutes(recipe.cookMinutes)} />
      </div>

      <section aria-labelledby="recipe-macros-heading" className="grid gap-1.5">
        <h3
          className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]"
          id="recipe-macros-heading"
        >
          Nährwertschätzung (gesamtes Rezept)
        </h3>
        <p className="text-[10px] leading-4 text-[var(--text-muted)]">
          {recipe.nutritionEstimateAvailable === false
            ? "Keine manuelle Nährwertschätzung hinterlegt."
            : "Optionale Rezeptschätzung; keine berechneten oder gemessenen Werte."}
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {(["calories", "protein", "carbs", "fat"] as const).map((macro) => (
            <DetailMetric
              key={macro}
              label={macroLabels[macro]}
              value={
                recipe.nutritionEstimateAvailable === false || (recipe.availableMacros && !recipe.availableMacros.includes(macro))
                  ? "—"
                  : formatMacro(recipe.totals[macro], macroUnits[macro])
              }
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="recipe-ingredients-heading" className="grid gap-1.5">
        <h3
          className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]"
          id="recipe-ingredients-heading"
        >
          Zutaten
        </h3>
        <div className="grid gap-1.5">
          {recipe.ingredients.length > 0 ? (
            recipe.ingredients.map((ingredient) => {
              const amountLabel = ingredientAmountLabel(ingredient);

              return (
                <div
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(168,183,204,.04)] px-2.5 py-1.5"
                  key={ingredient.id}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold text-[var(--text-secondary)]">
                      {ingredient.name}
                    </p>
                    {ingredient.note ? (
                      <p className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-[var(--text-muted)]">
                        {ingredient.note}
                      </p>
                    ) : null}
                  </div>
                  {amountLabel ? (
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {amountLabel}
                    </p>
                  ) : null}
                </div>
              );
            })
          ) : (
            <div className="rounded-[10px] border border-dashed border-[var(--border-default)] bg-[rgba(168,183,204,.04)] px-2.5 py-2">
              <p className="text-[11px] leading-5 text-[var(--text-muted)]">
                Noch keine Zutaten hinterlegt.
              </p>
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="recipe-instructions-heading" className="grid gap-1.5">
        <h3
          className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]"
          id="recipe-instructions-heading"
        >
          Zubereitung
        </h3>
        <ol className="grid gap-1.5">
          {recipe.instructions.map((instruction) => (
            <li
              className="grid grid-cols-[24px_minmax(0,1fr)] gap-2 rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(168,183,204,.04)] px-2.5 py-1.5"
              key={instruction.id}
            >
              <span className="flex size-6 items-center justify-center rounded-full border border-[rgba(217,146,79,.28)] bg-[rgba(217,146,79,.08)] text-[9px] font-semibold text-[var(--text-secondary)]">
                {instruction.order}
              </span>
              <span className="text-[11px] leading-5 text-[var(--text-secondary)]">
                {instruction.text}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-auto grid gap-2 border-t border-[var(--border-subtle)] pt-3">
        {manualActions ? (
          manualActions
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <button
                className={primaryButtonClass}
                disabled={!actionsEnabled}
                onClick={() => onEdit(recipe)}
                type="button"
              >
                Edit
              </button>
              <button
                className={secondaryButtonClass}
                disabled={!actionsEnabled}
                onClick={() => onDuplicate(recipe)}
                type="button"
              >
                Duplicate
              </button>
              <button
                className={quietButtonClass}
                disabled={!actionsEnabled}
                onClick={onRequestArchive}
                type="button"
              >
                Archive
              </button>
            </div>

            {confirmingArchive ? (
              <div
                className="rounded-[12px] border border-[rgba(221,107,95,.30)] bg-[rgba(221,107,95,.08)] p-3"
                role="alert"
              >
                <p className="text-[12px] font-semibold text-[var(--text-secondary)]">
                  Archive this recipe locally?
                </p>
                <p className="mt-1 text-[11px] leading-5 text-[var(--text-muted)]">
                  Archived recipes are hidden from this browser state. No backend
                  data is changed.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className={secondaryButtonClass}
                    onClick={onCancelArchive}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className={primaryButtonClass}
                    onClick={onConfirmArchive}
                    type="button"
                  >
                    Confirm archive
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </PlannerPanel>
  );
}
