"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import {
  contentStateDataAttributes,
  resolveContentStateMeta,
} from "@/features/content-state";
import type { MealType, Recipe } from "../meal-planner/meal-planner-types";
import {
  primaryButtonClass,
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
            Planner readiness strip
          </h2>
        </div>
        <p className="truncate text-[10px] leading-4 text-[var(--text-muted)]">
          Local state - shared Meal Planner recipe source.
        </p>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile
          helper={`${stats.activeRecipes} active`}
          label="Total recipes"
          value={`${stats.totalRecipes}`}
        />
        <StatTile
          accent="var(--accent-green)"
          helper="Planner usable"
          label="Ready"
          value={`${stats.readyForPlanner}`}
        />
        <StatTile
          accent="var(--accent-yellow)"
          helper="Macro review"
          label="Needs macros"
          value={`${stats.needsMacros}`}
        />
        <StatTile
          accent="var(--accent-cyan)"
          helper="Missing inputs"
          label="Needs ingredients"
          value={`${stats.needsIngredients}`}
        />
        <StatTile
          accent="var(--accent-orange)"
          helper={stats.mealTypeCoverage}
          label="Avg total time"
          value={`${stats.averageTotalMinutes} min`}
        />
      </div>
    </section>
  );
}

export function RecipesView({
  viewModel,
}: Readonly<{
  viewModel: RecipesViewModel;
}>) {
  const profileId = viewModel.profileId ?? "demo";
  const actionsEnabled = viewModel.actionsEnabled ?? true;
  const [recipes, setRecipes] = useState<Recipe[]>(() =>
    viewModel.recipes.map(cloneRecipe),
  );
  const [query, setQuery] = useState("");
  const [mealType, setMealType] = useState<MealTypeFilter>("all");
  const [tag, setTag] = useState<TagFilter>("all");
  const [readiness, setReadiness] = useState<ReadinessFilter>("all");
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(
    () => viewModel.recipes.find((recipe) => !recipe.archived)?.id ?? null,
  );
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const stats = useMemo(() => summarizeRecipes(recipes), [recipes]);
  const filteredRecipes = useMemo(
    () => filterRecipeList(recipes, query, mealType, tag, readiness),
    [mealType, query, readiness, recipes, tag],
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

  return (
    <div
      className="mx-auto flex w-full max-w-7xl flex-col gap-3 pb-4 xl:h-[calc(100dvh-88px)] xl:min-h-0 xl:overflow-hidden xl:pb-0"
      id="recipes-page"
      {...stateAttrs(contentStates.page)}
    >
      <header className="shrink-0 overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-1)] shadow-[0_8px_22px_rgba(0,0,0,.12)]">
        <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              {viewModel.header.eyebrow}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-[var(--text-primary)]">
              {viewModel.header.title}
            </h1>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--text-secondary)]">
              {viewModel.header.subline}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className={secondaryButtonClass} href="/nutrition/meal-planner">
              Meal Planner
            </Link>
            <button
              className={primaryButtonClass}
              disabled={!actionsEnabled}
              onClick={openNewRecipe}
              type="button"
            >
              New recipe
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
              Dismiss
            </button>
          </div>
        ) : null}
      </header>

      <RecipeSummary
        stateAttributes={stateAttrs(contentStates.summary)}
        stats={stats}
      />

      <div className="grid min-h-0 gap-3 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-stretch xl:overflow-hidden">
        <RecipeBrowser
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
          actionsEnabled={actionsEnabled}
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
