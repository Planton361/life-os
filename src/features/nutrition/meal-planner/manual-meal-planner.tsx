"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { applyNutritionPlanAction } from "@/features/real-data/actions/nutrition.actions";
import type { NutritionPlanOperation } from "@/features/real-data/schemas/nutrition.schema";
import type { Meal } from "@/features/real-data";
import { ManualMealEditForm } from "./manual-meal-edit-form";
import {
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
  PlannerPanel,
} from "./meal-planner-primitives";
import type {
  MealPlannerViewModel,
  SelectedMealSlot,
} from "./meal-planner-types";
import { cn } from "@/lib/cn";
import "../nutrition-workspace.css";

const types = {
  breakfast: "Frühstück",
  lunch: "Mittagessen",
  dinner: "Abendessen",
} as const;
const shift = (date: string, days: number) =>
  new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000)
    .toISOString()
    .slice(0, 10);

export function ManualMealPlanner({
  viewModel,
  initialSelectedSlot,
}: {
  viewModel: MealPlannerViewModel;
  initialSelectedSlot: SelectedMealSlot | null;
}) {
  const router = useRouter();
  const meals = viewModel.canonicalMeals ?? [];
  const enabled = Boolean(viewModel.mealEditEnabled);
  const [selected, setSelected] = useState(initialSelectedSlot);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<NutritionPlanOperation[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("title");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const dragId = useRef<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const selectedMeals = meals.filter(
    (m) => m.date === selected?.date && m.mealType === selected.mealType,
  );
  const meal =
    selectedMeals.find((m) => m.id === selectedId) ?? selectedMeals[0];
  const recipe = viewModel.recipes.find((r) => r.id === meal?.recipeId);
  const suggestions = viewModel.recipes
    .filter(
      (r) =>
        `${r.title} ${r.tags.join(" ")} ${r.ingredients.map((i) => i.name).join(" ")}`
          .toLocaleLowerCase("de-DE")
          .includes(query.toLocaleLowerCase("de-DE")) &&
        (filter === "all" ||
          r.mealTypes.includes(filter as keyof typeof types)),
    )
    .sort((a, b) =>
      sort === "recent"
        ? (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")
        : sort === "prep"
          ? (a.prepMinutes ?? Infinity) - (b.prepMinutes ?? Infinity)
          : a.title.localeCompare(b.title, "de-DE"),
    );
  function feedback(text: string, failed = false) {
    setMessage(text);
    setError(failed);
  }
  function persist(operations: NutritionPlanOperation[], after?: () => void) {
    if (!enabled || pending) return;
    startTransition(async () => {
      const result = await applyNutritionPlanAction(operations);
      feedback(result.message, result.status !== "success");
      if (result.status === "success") {
        after?.();
        router.refresh();
      }
    });
  }
  function move(source: Meal, target: SelectedMealSlot) {
    if (draft.length) {
      feedback(
        "Zuerst die Woche speichern oder Änderungen zurücksetzen.",
        true,
      );
      return;
    }
    if (source.date === target.date && source.mealType === target.mealType)
      return;
    if (
      source.completedAt ||
      meals.some(
        (m) =>
          m.id !== source.id &&
          m.date === target.date &&
          m.mealType === target.mealType,
      )
    ) {
      feedback(
        "Dieser Platz ist bereits belegt oder die Mahlzeit abgeschlossen. Keine Mahlzeit wurde verändert.",
        true,
      );
      return;
    }
    persist(
      [
        {
          kind: "move",
          id: source.id,
          expectedUpdatedAt: source.updatedAt,
          ...target,
        },
      ],
      () => {
        setSelected(target);
        setSelectedId(source.id);
      },
    );
  }
  function cancelDrag() {
    dragId.current = null;
    setDragging(null);
    setOver(null);
  }
  return (
    <div
      id="meal-planner-page"
      className="nutrition-workspace-page"
      data-nutrition-surface="planner"
      onKeyDown={(e) => {
        if (e.key === "Escape") cancelDrag();
      }}
    >
      <header className="nutrition-header">
        <div>
          <p className="nutrition-eyebrow">Life OS / Ernährung</p>
          <h1>Essensplan</h1>
          <p>
            {viewModel.week.weekStartsOn} –{" "}
            {shift(viewModel.week.weekStartsOn, 6)} · Frühstück, Mittagessen und
            Abendessen
          </p>
        </div>
        <nav aria-label="Essensplan Woche" className="flex flex-wrap gap-2">
          {[
            ["Vorherige Woche", shift(viewModel.week.weekStartsOn, -7)],
            ["Aktuelle Woche", ""],
            ["Nächste Woche", shift(viewModel.week.weekStartsOn, 7)],
          ].map(([label, date]) => (
            <Link
              aria-disabled={pending || draft.length > 0}
              onClick={(e) => {
                if (pending || draft.length) {
                  e.preventDefault();
                  feedback(
                    "Zuerst speichern oder Änderungen zurücksetzen.",
                    true,
                  );
                }
              }}
              className={secondaryButtonClass}
              href={`/nutrition/meal-planner${date ? `?week=${date}` : ""}`}
              key={label}
            >
              {label}
            </Link>
          ))}
          <button
            className={primaryButtonClass}
            disabled={!draft.length || pending}
            onClick={() => persist(draft, () => setDraft([]))}
          >
            Woche speichern
          </button>
          <button
            className={secondaryButtonClass}
            disabled={!draft.length || pending}
            onClick={() => {
              setDraft([]);
              feedback("Änderungen zurückgesetzt.");
            }}
          >
            Änderungen zurücksetzen
          </button>
          <Link
            className={secondaryButtonClass}
            href={`/nutrition/grocery?week=${viewModel.week.weekStartsOn}`}
          >
            Einkauf öffnen
          </Link>
          <Link className={secondaryButtonClass} href="/nutrition">
            Ernährungsstatus
          </Link>
        </nav>
      </header>
      {viewModel.unavailableReason && (
        <p role="alert">{viewModel.unavailableReason}</p>
      )}
      {message && (
        <p className="nutrition-feedback" role={error ? "alert" : "status"}>
          {message}
        </p>
      )}
      <div
        className="nutrition-planner-context"
        data-selected={Boolean(selected)}
      >
        <PlannerPanel title="Zielprofil">
          <p className="text-sm text-[var(--text-muted)]">
            Keine Ernährungsziele hinterlegt.
          </p>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Nährwerte stammen ausschließlich aus deinen Rezeptschätzungen.
          </p>
        </PlannerPanel>
        <PlannerPanel
          title="Ausgewählte Mahlzeit"
          className="nutrition-inspector"
          bodyClassName="overflow-auto min-h-0"
        >
          {!selected ? (
            <p className="text-sm text-[var(--text-muted)]">
              Wähle einen Platz im Wochenplan.
            </p>
          ) : (
            <>
              <p className="text-xs text-[var(--accent-orange)]">
                {selected.date} · {types[selected.mealType]}
              </p>
              {!meal ? (
                <p className="mt-2 text-sm">
                  {draft.some(
                    (d) =>
                      d.kind === "assign" &&
                      d.date === selected.date &&
                      d.mealType === selected.mealType,
                  )
                    ? "Rezept vorgemerkt. Woche speichern, um es zu planen."
                    : "Wähle rechts ein Rezept für diesen Platz."}
                </p>
              ) : (
                <>
                  <h3 className="mt-1 font-semibold">{meal.title}</h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    {meal.servings} Portionen ·{" "}
                    {meal.completedAt ? "Gegessen" : "Geplant"}
                    {recipe?.availableMacros?.includes("calories")
                      ? ` · ${Math.round((recipe.totals.calories * meal.servings) / recipe.defaultServings)} kcal`
                      : " · Energie nicht hinterlegt"}
                  </p>
                  {meal.notes && <p className="mt-1 text-xs">{meal.notes}</p>}
                  {!meal.completedAt && (
                    <form
                      aria-label="Mahlzeit verschieben"
                      className="mt-3 flex flex-wrap items-end gap-2"
                      key={`${meal.id}-${meal.updatedAt}`}
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        move(meal, {
                          date: String(f.get("date")),
                          mealType: String(
                            f.get("mealType"),
                          ) as keyof typeof types,
                        });
                      }}
                    >
                      <label className="text-xs">
                        Tag
                        <input
                          className={inputClass}
                          name="date"
                          type="date"
                          defaultValue={meal.date}
                          required
                        />
                      </label>
                      <label className="text-xs">
                        Mahlzeit
                        <select
                          aria-label="Mahlzeit"
                          className={inputClass}
                          name="mealType"
                          defaultValue={meal.mealType}
                        >
                          {Object.entries(types).map(([v, l]) => (
                            <option value={v} key={v}>
                              {l}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        className={secondaryButtonClass}
                        disabled={pending || !enabled}
                      >
                        Verschieben
                      </button>
                    </form>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {recipe && (
                      <Link
                        className={secondaryButtonClass}
                        href={`/nutrition/recipes/${recipe.id}`}
                      >
                        Rezept öffnen
                      </Link>
                    )}
                    {!meal.completedAt && (
                      <details>
                        <summary className={secondaryButtonClass}>
                          Aus Plan entfernen
                        </summary>
                        <p className="my-2 text-xs">
                          Diese offene Mahlzeit und ihre Zeitplanung entfernen?
                        </p>
                        <button
                          className={secondaryButtonClass}
                          disabled={pending || !enabled}
                          onClick={() =>
                            persist([
                              {
                                kind: "remove",
                                id: meal.id,
                                expectedUpdatedAt: meal.updatedAt,
                              },
                            ])
                          }
                        >
                          Entfernen bestätigen
                        </button>
                      </details>
                    )}
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-[var(--text-secondary)]">
                      Bearbeiten / Zeitplanung
                    </summary>
                    <ManualMealEditForm
                      key={`${meal.id}-${meal.updatedAt}`}
                      meal={{
                        ...meal,
                        mealType: selected.mealType,
                        recipeId: meal.recipeId ?? "",
                        ingredientAdjustments: [],
                      }}
                      recipes={viewModel.recipes}
                    />
                  </details>
                </>
              )}
            </>
          )}
        </PlannerPanel>
        <PlannerPanel
          title="Rezeptauswahl"
          className="nutrition-suggestions"
          bodyClassName="flex min-h-0 flex-col gap-2"
        >
          {!viewModel.recipes.length ? (
            <p className="text-sm text-[var(--text-muted)]">
              Noch keine Rezepte.{" "}
              <Link className="underline" href="/nutrition/recipes">
                Erstes Rezept erstellen
              </Link>
            </p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                <label className="text-xs">
                  Suche
                  <input
                    className={inputClass}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <label className="text-xs">
                  Mahlzeitfilter
                  <select
                    aria-label="Mahlzeitfilter"
                    className={inputClass}
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">Alle</option>
                    {Object.entries(types).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs">
                  Sortierung
                  <select
                    aria-label="Sortierung"
                    className={inputClass}
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="title">Name</option>
                    <option value="recent">Zuletzt geändert</option>
                    <option value="prep">Zubereitungszeit</option>
                  </select>
                </label>
              </div>
              <ul
                className="min-h-0 overflow-auto"
                aria-label="Rezeptvorschläge"
              >
                {suggestions.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{r.title}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {r.prepMinutes !== undefined
                          ? `${r.prepMinutes} min · `
                          : ""}
                        {r.mealTypes.map((t) => types[t]).join(" / ")}
                      </p>
                    </div>
                    <button
                      className={secondaryButtonClass}
                      disabled={
                        !selected ||
                        !enabled ||
                        pending ||
                        Boolean(meal) ||
                        draft.some(
                          (d) =>
                            d.kind === "assign" &&
                            d.date === selected?.date &&
                            d.mealType === selected.mealType,
                        )
                      }
                      onClick={() => {
                        if (selected) {
                          setDraft([
                            ...draft,
                            {
                              kind: "assign",
                              id: crypto.randomUUID(),
                              recipeId: r.id,
                              ...selected,
                            },
                          ]);
                          feedback(
                            "Rezept vorgemerkt. Woche speichern oder Änderungen zurücksetzen.",
                          );
                        }
                      }}
                    >
                      Zuordnen
                    </button>
                  </li>
                ))}
              </ul>
              {!suggestions.length && (
                <p className="text-sm">Keine passenden Rezepte.</p>
              )}
            </>
          )}
        </PlannerPanel>
      </div>
      <PlannerPanel
        title="Wochenplan"
        className="nutrition-week"
        bodyClassName="nutrition-week-body"
        subtitle="Ziehen speichert die Verschiebung direkt. Alternativ Tag und Mahlzeit im Inspector ändern."
      >
        <div className="nutrition-week-grid">
          {viewModel.week.days.map((day) => (
            <section
              key={day.date}
              aria-label={`${day.date} Essensplan`}
              className="nutrition-day"
            >
              <h3>
                {day.label} <span>{day.date.slice(5)}</span>
              </h3>
              {day.slots.map((slot) => {
                const slotMeals = meals.filter(
                  (m) => m.date === slot.date && m.mealType === slot.mealType,
                );
                const assignment = draft.find(
                  (d) =>
                    d.kind === "assign" &&
                    d.date === slot.date &&
                    d.mealType === slot.mealType,
                );
                const key = `${slot.date}-${slot.mealType}`;
                return (
                  <div
                    key={key}
                    data-meal-slot={key}
                    data-drop-state={
                      over === key
                        ? slotMeals.length
                          ? "occupied"
                          : "target"
                        : undefined
                    }
                    className={cn(
                      "nutrition-slot",
                      selected?.date === slot.date &&
                        selected.mealType === slot.mealType &&
                        "is-selected",
                    )}
                    onDragOver={(e) => {
                      if (dragId.current && enabled && !pending) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        setOver(key);
                      }
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node))
                        setOver(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const id = dragId.current;
                      cancelDrag();
                      const source = meals.find((m) => m.id === id);
                      if (source && enabled && !pending)
                        move(source, {
                          date: slot.date,
                          mealType: slot.mealType,
                        });
                    }}
                  >
                    <button
                      className="nutrition-slot-label"
                      aria-pressed={
                        selected?.date === slot.date &&
                        selected.mealType === slot.mealType
                      }
                      onClick={() => {
                        setSelected({
                          date: slot.date,
                          mealType: slot.mealType,
                        });
                        setSelectedId(null);
                      }}
                    >
                      {types[slot.mealType]}
                    </button>
                    {slotMeals.map((m) => (
                      <button
                        key={m.id}
                        data-meal-id={m.id}
                        data-dragging={dragging === m.id || undefined}
                        draggable={enabled && !pending && !m.completedAt}
                        className="nutrition-meal"
                        onClick={() => {
                          setSelected({
                            date: slot.date,
                            mealType: slot.mealType,
                          });
                          setSelectedId(m.id);
                        }}
                        onDragStart={(e) => {
                          dragId.current = m.id;
                          setDragging(m.id);
                          e.dataTransfer.setData("text/plain", m.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={cancelDrag}
                      >
                        <strong>{m.title}</strong>
                        <span>
                          {m.completedAt ? "Gegessen" : "Geplant"} ·{" "}
                          {m.servings} Portionen
                        </span>
                      </button>
                    ))}
                    {assignment?.kind === "assign" && (
                      <p className="text-sm text-[var(--accent-orange)]">
                        {
                          viewModel.recipes.find(
                            (r) => r.id === assignment.recipeId,
                          )?.title
                        }
                        <span className="block text-xs">
                          Noch nicht gespeichert
                        </span>
                      </p>
                    )}
                    {!slotMeals.length && !assignment && (
                      <button
                        className="nutrition-empty-slot"
                        onClick={() => {
                          setSelected({
                            date: slot.date,
                            mealType: slot.mealType,
                          });
                          setSelectedId(null);
                        }}
                      >
                        Rezept wählen
                      </button>
                    )}
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      </PlannerPanel>
    </div>
  );
}
