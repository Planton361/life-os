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

export function RecipeDetailPanel({
  recipe,
  confirmingArchive,
  actionsEnabled,
  stateAttributes,
  onEdit,
  onDuplicate,
  onRequestArchive,
  onCancelArchive,
  onConfirmArchive,
}: Readonly<{
  recipe: Recipe | null;
  confirmingArchive: boolean;
  actionsEnabled: boolean;
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
        subtitle="Select a recipe."
        title="Selected Recipe"
      >
        <div className="rounded-[14px] border border-dashed border-[var(--border-default)] bg-[rgba(168,183,204,.04)] p-4">
          <p className="text-sm font-semibold text-[var(--text-secondary)]">
            Kein Rezept ausgewählt
          </p>
          <p className="mt-1 text-[11px] leading-5 text-[var(--text-muted)]">
            Wähle ein Rezept aus der Library oder erstelle später ein neues.
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
      subtitle="Planner context."
      title="Selected Recipe"
    >
      <div className="flex min-w-0 gap-2.5">
        <RecipeImage recipe={recipe} variant="compact" />
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold leading-5 text-[var(--text-primary)]">
            {recipe.title}
          </h2>
          <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[var(--text-muted)]">
            {recipe.description ?? "No description added."}
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
        {recipe.tags.map((tag) => (
          <PlannerPill key={tag} quiet>
            {getTagLabel(tag)}
          </PlannerPill>
        ))}
      </div>

      <div className="grid gap-1.5 sm:grid-cols-2">
        <DetailMetric label="Servings" value={`${recipe.defaultServings}`} />
        <DetailMetric
          label="Total"
          value={formatRecipeMinutes(getRecipeTotalMinutes(recipe))}
        />
        <DetailMetric label="Prep" value={formatRecipeMinutes(recipe.prepMinutes)} />
        <DetailMetric label="Cook" value={formatRecipeMinutes(recipe.cookMinutes)} />
      </div>

      <section aria-labelledby="recipe-macros-heading" className="grid gap-1.5">
        <h3
          className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]"
          id="recipe-macros-heading"
        >
          Macro totals
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          {(["calories", "protein", "carbs", "fat"] as const).map((macro) => (
            <DetailMetric
              key={macro}
              label={macroLabels[macro]}
              value={formatMacro(recipe.totals[macro], macroUnits[macro])}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="recipe-ingredients-heading" className="grid gap-1.5">
        <h3
          className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]"
          id="recipe-ingredients-heading"
        >
          Ingredients
        </h3>
        <div className="grid gap-1.5">
          {recipe.ingredients.map((ingredient) => (
            <div
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(168,183,204,.04)] px-2.5 py-1.5"
              key={ingredient.id}
            >
              <p className="min-w-0 truncate text-[11px] font-semibold text-[var(--text-secondary)]">
                {ingredient.name}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">
                {ingredient.amount} {ingredient.unit}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="recipe-instructions-heading" className="grid gap-1.5">
        <h3
          className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]"
          id="recipe-instructions-heading"
        >
          Instructions
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
              Archived recipes are hidden from this browser state. No backend data is
              changed.
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
      </div>
    </PlannerPanel>
  );
}
