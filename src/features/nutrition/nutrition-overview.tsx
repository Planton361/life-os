"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Pill, accentStyle } from "@/components/layout/route-page-primitives";
import {
  contentStateDataAttributes,
  resolveContentStateMeta,
  type ContentStateMeta,
} from "@/features/content-state";
import { cn } from "@/lib/cn";
import { buildNutritionMetrics } from "./nutrition-view-model";
import type {
  MealEntry,
  MealSource,
  MealType,
  NutritionDay,
  NutritionMetricType,
  NutritionMetricViewModel,
  NutritionOverviewViewModel,
  NutritionPeriod,
} from "./nutrition-types";

type NutritionStyle = CSSProperties & {
  "--accent"?: string;
  "--bar-height"?: string;
  "--progress-width"?: string;
};

type ToastState = {
  title: string;
  body: string;
  tone: "success" | "info";
};

type MealDraft = {
  meal_type: MealType;
  title: string;
  amount: string;
  source: MealSource;
  note: string;
};

const periods: readonly NutritionPeriod[] = ["today", "week", "month"];
const nutritionAccent = "var(--accent-orange)";

const mealTypeLabels: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

const mealSourceLabels: Record<MealSource, string> = {
  manual: "Manual",
  meal_planner: "Meal planner",
  recipe: "Recipe",
  imported: "Imported",
};

const buttonBaseClass =
  "inline-flex min-h-10 items-center justify-center rounded-[12px] border px-4 text-[11px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50";

const primaryButtonClass = cn(
  buttonBaseClass,
  "border-[rgba(216,180,90,.26)] bg-[rgba(217,146,79,.92)] text-[var(--bg-app)] hover:bg-[rgba(217,146,79,1)]",
);

const secondaryButtonClass = cn(
  buttonBaseClass,
  "border-[var(--border-subtle)] bg-[rgba(18,28,43,.82)] text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]",
);

const ghostButtonClass =
  "inline-flex min-h-8 items-center justify-center rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.58)] px-3 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]";

const inputClass =
  "mt-1 min-h-11 w-full rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.62)] px-3 text-[12px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--focus-ring)] disabled:opacity-60";

function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(value);
}

function formatMealTime(value?: string) {
  if (!value) {
    return "not set";
  }

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function sentenceCase(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function progressStyle(percentage: number): NutritionStyle {
  return {
    "--progress-width": `${Math.max(0, Math.min(100, percentage))}%`,
  };
}

function barHeightStyle(value: number): NutritionStyle {
  return {
    "--bar-height": `${Math.max(10, Math.min(100, value * 100))}%`,
  };
}

function metricByType(
  metrics: readonly NutritionMetricViewModel[],
  type: NutritionMetricType,
) {
  return metrics.find((metric) => metric.type === type) ?? metrics[0];
}

function nextOpenMeal(meals: readonly MealEntry[]) {
  return (
    [...meals]
      .filter((meal) => meal.planned_at && !meal.consumed_at)
      .sort(
        (left, right) =>
          new Date(left.planned_at ?? "").getTime() -
          new Date(right.planned_at ?? "").getTime(),
      )[0] ?? null
  );
}

function recentMeals(meals: readonly MealEntry[]) {
  return [...meals]
    .filter((meal) => meal.consumed_at)
    .sort(
      (left, right) =>
        new Date(right.consumed_at ?? "").getTime() -
        new Date(left.consumed_at ?? "").getTime(),
    )
    .slice(0, 5);
}

function applyMealToDay(day: NutritionDay, meal: MealEntry): NutritionDay {
  return {
    ...day,
    calorie_actual: day.calorie_actual + meal.calories,
    protein_actual: day.protein_actual + meal.macros.protein,
    carbs_actual: day.carbs_actual + meal.macros.carbs,
    fat_actual: day.fat_actual + meal.macros.fat,
  };
}

function createManualMeal(draft: MealDraft): MealEntry {
  return {
    id: `manual-${Date.now()}`,
    meal_type: draft.meal_type,
    title: draft.title.trim(),
    consumed_at: new Date().toISOString(),
    calories: 420,
    macros: {
      protein: 28,
      carbs: 42,
      fat: 14,
    },
    source: draft.source,
  };
}

function proteinStatement(
  proteinMetric: NutritionMetricViewModel,
  nextMeal: MealEntry | null,
) {
  if (proteinMetric.target <= 0 && proteinMetric.actual <= 0) {
    return "Today Nutrition neutral: noch keine Mahlzeit und kein Zielprofil gesetzt.";
  }

  if (proteinMetric.target <= 0) {
    return "Lokale Mahlzeiten sind sichtbar; ein Zielprofil ist noch nicht gesetzt.";
  }

  const gap = Math.max(0, proteinMetric.target - proteinMetric.actual);

  if (gap === 0) {
    return "Proteinziel ist aktuell gedeckt; die naechste Mahlzeit kann ruhig bleiben.";
  }

  if (!nextMeal) {
    return `Protein liegt ${formatNumber(gap)} g unter Ziel; keine offene Mahlzeit ist geplant.`;
  }

  return `Protein liegt ${formatNumber(gap)} g unter Ziel; ${mealTypeLabels[nextMeal.meal_type]} kann die Lücke voraussichtlich schließen.`;
}

function stateAttrs(meta: ContentStateMeta, profileId: string) {
  return contentStateDataAttributes(meta, profileId);
}

function NutritionPanel({
  title,
  subtitle,
  badge,
  children,
  className,
  stateAttributes,
}: Readonly<{
  title: string;
  subtitle: string;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
  stateAttributes?: Record<string, string>;
}>) {
  const headingId = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-heading`;

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "min-w-0 overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-1)] shadow-[0_8px_22px_rgba(0,0,0,.12)]",
        className,
      )}
      {...stateAttributes}
    >
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] px-4 py-3">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              className="truncate text-[18px] font-semibold leading-6 text-[var(--text-primary)]"
              id={headingId}
            >
              {title}
            </h2>
            <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
              {subtitle}
            </p>
          </div>
          {badge ? <div className="shrink-0">{badge}</div> : null}
        </div>
      </div>
      <div className="min-w-0 p-4">{children}</div>
    </section>
  );
}

function FieldLabel({
  children,
  optional,
}: Readonly<{
  children: ReactNode;
  optional?: boolean;
}>) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
      {children}
      {optional ? (
        <span className="normal-case tracking-normal text-[var(--text-faint)]">
          {" "}
          optional
        </span>
      ) : null}
    </span>
  );
}

function ProgressBar({
  metric,
}: Readonly<{
  metric: NutritionMetricViewModel;
}>) {
  return (
    <div
      className="h-[7px] overflow-hidden rounded-full bg-[rgba(23,34,53,.92)]"
      style={accentStyle(metric.accent)}
    >
      <div
        aria-hidden="true"
        className="h-full w-[var(--progress-width)] rounded-full bg-[var(--accent)] opacity-80"
        style={progressStyle(metric.percentage)}
      />
    </div>
  );
}

function MetricButton({
  metric,
  onSelect,
}: Readonly<{
  metric: NutritionMetricViewModel;
  onSelect: (metric: NutritionMetricViewModel) => void;
}>) {
  return (
    <button
      aria-label={`Open ${metric.label} details: ${metric.valueLabel}`}
      className="grid min-w-0 gap-1 rounded-[12px] border border-transparent p-2 text-left transition hover:border-[color-mix(in_srgb,var(--accent)_30%,transparent)] hover:bg-[color-mix(in_srgb,var(--accent)_6%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
      onClick={() => onSelect(metric)}
      style={accentStyle(metric.accent)}
      type="button"
    >
      <span className="flex min-w-0 items-center justify-between gap-3">
        <span className="text-[12px] font-semibold text-[var(--text-secondary)]">
          {metric.label}
        </span>
        <span className="truncate text-right text-[12px] font-semibold text-[var(--text-primary)]">
          {metric.valueLabel}
        </span>
      </span>
      <ProgressBar metric={metric} />
      <span className="text-[10px] leading-4 text-[var(--text-muted)]">
        {metric.meta}
      </span>
    </button>
  );
}

function TodayNutritionCard({
  metrics,
  nextMeal,
  profileId,
  stateMeta,
  actionsEnabled,
  onAddWater,
  onSelectMetric,
}: Readonly<{
  metrics: readonly NutritionMetricViewModel[];
  nextMeal: MealEntry | null;
  profileId: string;
  stateMeta: ContentStateMeta;
  actionsEnabled: boolean;
  onAddWater: () => void;
  onSelectMetric: (metric: NutritionMetricViewModel) => void;
}>) {
  const calories = metricByType(metrics, "calories");
  const protein = metricByType(metrics, "protein");
  const secondaryMetrics = metrics.filter((metric) => metric.type !== "calories");

  return (
    <NutritionPanel
      badge={<Pill accent={nutritionAccent}>P0 · Decision</Pill>}
      className="order-1 xl:col-span-7"
      subtitle="Tagesfortschritt, verbleibende Zielwerte und relevante Lücken"
      stateAttributes={stateAttrs(stateMeta, profileId)}
      title="Today Nutrition"
    >
      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="min-w-0">
          <p className="text-[18px] font-medium leading-7 text-[var(--text-primary)]">
            {proteinStatement(protein, nextMeal)}
          </p>
          <div className="mt-4">
            <p className="text-[42px] font-semibold leading-none text-[var(--text-primary)]">
              {calories.target <= 0 && calories.actual <= 0
                ? "—"
                : formatNumber(calories.actual)}
            </p>
            <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
              {calories.target > 0
                ? `/ ${formatNumber(calories.target)} kcal`
                : "Zielprofil nicht gesetzt"}
            </p>
            <p className="mt-3 text-[12px] font-semibold text-[var(--accent-yellow)]">
              {calories.remainingLabel}
            </p>
          </div>
        </div>

        <div className="grid min-w-0 gap-2 md:grid-cols-2">
          {secondaryMetrics.map((metric) => (
            <MetricButton
              key={metric.type}
              metric={metric}
              onSelect={onSelectMetric}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.44)] p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="flex min-w-0 gap-3">
          <span
            aria-hidden="true"
            className="mt-1 size-2.5 shrink-0 rounded-full bg-[var(--accent-orange)]"
          />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold leading-5 text-[var(--text-primary)]">
              {calories.target > 0 || protein.actual > 0
                ? "Nächste sinnvolle Handlung: Proteinreiche geplante Mahlzeit prüfen oder direkt als gegessen markieren."
                : "Nächste sinnvolle Handlung: erst lokale Mahlzeiten oder Ziele erfassen."}
            </p>
            <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-muted)]">
              {actionsEnabled
                ? "Klick auf ein Makro öffnet den Detailbereich."
                : "Detailaktionen bleiben deaktiviert, bis ein echter Nutrition-Flow existiert."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={ghostButtonClass}
            disabled={!actionsEnabled}
            onClick={() => onSelectMetric(protein)}
            type="button"
          >
            Protein details
          </button>
          <button
            className={ghostButtonClass}
            disabled={!actionsEnabled}
            onClick={onAddWater}
            type="button"
          >
            Add water
          </button>
        </div>
      </div>
    </NutritionPanel>
  );
}

function NextMealCard({
  meal,
  profileId,
  stateMeta,
  actionsEnabled,
  onMarkAsEaten,
  onOpenMeal,
}: Readonly<{
  meal: MealEntry | null;
  profileId: string;
  stateMeta: ContentStateMeta;
  actionsEnabled: boolean;
  onMarkAsEaten: (meal: MealEntry) => void;
  onOpenMeal: (meal: MealEntry) => void;
}>) {
  return (
    <NutritionPanel
      badge={
        meal ? (
          <Pill accent={nutritionAccent}>
            Planned · {formatMealTime(meal.planned_at)}
          </Pill>
        ) : (
          <Pill quiet>No open meal</Pill>
        )
      }
      className="order-2 xl:col-span-5"
      subtitle="Planung und direkte Essens-Aktion"
      stateAttributes={stateAttrs(stateMeta, profileId)}
      title="Next Meal"
    >
      {meal ? (
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-start">
            <p className="text-[34px] font-semibold leading-none text-[var(--text-primary)]">
              {formatMealTime(meal.planned_at)}
            </p>
            <div className="min-w-0">
              <h3 className="text-[22px] font-semibold leading-7 text-[var(--text-primary)]">
                {meal.title}
              </h3>
              <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
                {actionsEnabled
                  ? "Meal Planner · Rezept aus Wochenplan · 3 missing ingredients"
                  : "Lokale Mahlzeit · noch keine Recipe- oder Grocery-Verknüpfung"}
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-4">
            <MealMacroCard
              detail="planned"
              label="Calories"
              value={`${meal.calories} kcal`}
            />
            <MealMacroCard
              detail="schliesst Luecke"
              label="Protein"
              value={`${meal.macros.protein} g`}
            />
            <MealMacroCard
              detail="balanced"
              label="Carbs"
              value={`${meal.macros.carbs} g`}
            />
            <MealMacroCard
              detail="within target"
              label="Fat"
              value={`${meal.macros.fat} g`}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
            <p className="text-[11px] leading-5 text-[var(--text-muted)]">
              {actionsEnabled
                ? "Grocery Signal: Paprika ist optional. Alternative vorhanden."
                : "Grocery Signal: keine Zutaten ohne Recipe-Verknüpfung."}
            </p>
            <button
              className={secondaryButtonClass}
              disabled={!actionsEnabled}
              onClick={() => onOpenMeal(meal)}
              type="button"
            >
              Open
            </button>
            <button
              className={primaryButtonClass}
              disabled={!actionsEnabled}
              onClick={() => onMarkAsEaten(meal)}
              type="button"
            >
              Mark as eaten
            </button>
          </div>
        </div>
      ) : (
        <EmptyNutritionState
          actionLabel="Open meal planner"
          description="Planung bleibt getrennt vom Tagesstatus und erscheint erst mit lokalen Mahlzeiten."
          href="/nutrition/meal-planner"
          title="Keine offene Mahlzeit"
        />
      )}
    </NutritionPanel>
  );
}

function MealMacroCard({
  label,
  value,
  detail,
}: Readonly<{
  label: string;
  value: string;
  detail: string;
}>) {
  return (
    <article className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.46)] p-3">
      <p className="flex items-center gap-2 text-[10px] font-semibold text-[var(--text-muted)]">
        <span
          aria-hidden="true"
          className="size-1.5 rounded-full bg-[var(--accent-orange)]"
        />
        {label}
      </p>
      <p className="mt-2 text-[20px] font-semibold text-[var(--text-primary)]">
        {value}
      </p>
      <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
        {detail}
      </p>
    </article>
  );
}

function WeekBalanceCard({
  items,
  statement,
  profileId,
  stateMeta,
}: Readonly<{
  items: NutritionOverviewViewModel["weekBalance"];
  statement: string;
  profileId: string;
  stateMeta: ContentStateMeta;
}>) {
  const isEmpty = stateMeta.state === "empty";

  return (
    <NutritionPanel
      badge={<Pill quiet>{isEmpty ? "0 / 7" : "Common gap: water"}</Pill>}
      className="order-5 xl:order-3"
      subtitle="7-day consistency with one clear reading"
      stateAttributes={stateAttrs(stateMeta, profileId)}
      title="Week Balance"
    >
      <p className="text-[13px] font-medium leading-5 text-[var(--text-primary)]">
        {statement}
      </p>
      <div
        aria-label={
          isEmpty
            ? "Week balance: noch keine Mahlzeiten geplant"
            : `Week balance: ${items
                .map((item) => `${item.day} ${item.label}`)
                .join(", ")}`
        }
        className="mt-5 flex h-36 items-end justify-between gap-2"
        role="img"
      >
        {items.map((item, index) => (
          <div
            className="flex h-full flex-1 flex-col justify-end gap-2"
            key={`nutrition-week-balance-${index}`}
          >
            <div className="flex min-h-0 flex-1 items-end rounded-[10px] bg-[rgba(23,34,53,.58)] px-1.5">
              <div
                aria-hidden="true"
                className="h-[var(--bar-height)] w-full rounded-[8px] bg-[var(--accent-yellow)] opacity-80"
                style={barHeightStyle(item.value)}
              />
            </div>
            <span className="text-center text-[10px] font-semibold text-[var(--text-muted)]">
              {item.day}
            </span>
          </div>
        ))}
      </div>
    </NutritionPanel>
  );
}

function MealPlanAdherenceCard({
  adherence,
  profileId,
  stateMeta,
}: Readonly<{
  adherence: NutritionOverviewViewModel["adherence"];
  profileId: string;
  stateMeta: ContentStateMeta;
}>) {
  const total = Math.max(1, adherence.planned);
  const items = [
    {
      label: "Planned",
      value: adherence.planned,
      detail: "this week",
      accent: "var(--accent-blue)",
    },
    {
      label: "Eaten",
      value: adherence.eaten,
      detail: "logged",
      accent: "var(--accent-green)",
    },
    {
      label: "Replaced",
      value: adherence.replaced,
      detail: "valid swaps",
      accent: "var(--accent-yellow)",
    },
    {
      label: "Open",
      value: adherence.open,
      detail: "tonight",
      accent: "var(--accent-orange)",
    },
  ] as const;

  return (
    <NutritionPanel
      className="order-6 xl:order-4"
      subtitle="Geplant, gegessen, ersetzt und offen"
      stateAttributes={stateAttrs(stateMeta, profileId)}
      title="Meal Plan Adherence"
    >
      <div
        aria-label={`Meal plan adherence: ${adherence.eaten} eaten, ${adherence.replaced} replaced, ${adherence.open} open out of ${adherence.planned} planned`}
        className="flex h-5 overflow-hidden rounded-full bg-[rgba(23,34,53,.8)]"
        role="img"
      >
        <span
          className="bg-[var(--accent-green)]"
          style={{ width: `${(adherence.eaten / total) * 100}%` }}
        />
        <span
          className="bg-[var(--accent-yellow)] opacity-75"
          style={{ width: `${(adherence.replaced / total) * 100}%` }}
        />
        <span
          className="bg-[var(--accent-orange)] opacity-72"
          style={{ width: `${(adherence.open / total) * 100}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {items.map((item, index) => (
          <article
            className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.46)] p-3"
            key={`nutrition-adherence-item-${index}`}
            style={accentStyle(item.accent)}
          >
            <p className="flex items-center gap-2 text-[10px] font-semibold text-[var(--text-muted)]">
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-[var(--accent)]"
              />
              {item.label}
            </p>
            <p className="mt-2 text-[20px] font-semibold text-[var(--text-primary)]">
              {item.value}
            </p>
            <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
              {item.detail}
            </p>
          </article>
        ))}
      </div>
      <p className="mt-4 text-[11px] leading-5 text-[var(--text-muted)]">
        {adherence.statement}
      </p>
    </NutritionPanel>
  );
}

function NutritionPrioritiesCard({
  priorities,
  profileId,
  stateMeta,
  actionsEnabled,
  onAddWater,
}: Readonly<{
  priorities: NutritionOverviewViewModel["priorities"];
  profileId: string;
  stateMeta: ContentStateMeta;
  actionsEnabled: boolean;
  onAddWater: () => void;
}>) {
  return (
    <NutritionPanel
      className="order-4 xl:order-5"
      subtitle="Maximal drei konkrete Hinweise mit Aktion"
      stateAttributes={stateAttrs(stateMeta, profileId)}
      title="Nutrition Priorities"
    >
      <div className="grid gap-3">
        {priorities.length > 0 ? priorities.map((priority) => (
          <article
            className="grid gap-3 rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-3 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-center"
            key={priority.id}
            style={accentStyle(priority.accent)}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                aria-hidden="true"
                className="h-10 w-1 rounded-full bg-[var(--accent)]"
              />
              <p className="font-semibold text-[var(--text-primary)]">
                {priority.label}
              </p>
            </div>
            <p className="text-[12px] leading-5 text-[var(--text-secondary)]">
              {priority.detail}
            </p>
            <button
              className={ghostButtonClass}
              disabled={!actionsEnabled}
              onClick={priority.id === "water" ? onAddWater : undefined}
              type="button"
            >
              {priority.actionLabel}
            </button>
          </article>
        )) : (
          <EmptyNutritionState
            actionLabel="Später konfigurieren"
            description="Hinweise erscheinen, sobald Mahlzeiten, Wasser oder Ziele vorhanden sind."
            title="Noch keine Prioritäten"
          />
        )}
      </div>
    </NutritionPanel>
  );
}

function WeightTrendCard({
  trend,
  profileId,
  stateMeta,
}: Readonly<{
  trend: NutritionOverviewViewModel["weightTrend"];
  profileId: string;
  stateMeta: ContentStateMeta;
}>) {
  const isEmpty = trend.values.length === 0;

  return (
    <NutritionPanel
      className="order-9 xl:order-6"
      subtitle={`${trend.periodLabel} · text first, no medical judgement`}
      stateAttributes={stateAttrs(stateMeta, profileId)}
      title="Weight Trend"
    >
      <p className="text-[13px] leading-5 text-[var(--text-secondary)]">
        {trend.statement}
      </p>
      {isEmpty ? (
        <div
          aria-label="Weight trend: noch kein Gewichtstrend"
          className="mt-4 h-20 rounded-[14px] border border-dashed border-[var(--border-subtle)] bg-[rgba(168,183,204,.035)]"
          role="img"
        />
      ) : (
        <Sparkline
          label={`Weight trend ${trend.values.join(", ")}`}
          values={trend.values}
        />
      )}
      <p className="mt-2 text-[11px] leading-4 text-[var(--text-muted)]">
        {trend.axisLabel}
      </p>
    </NutritionPanel>
  );
}

function Sparkline({
  values,
  label,
}: Readonly<{
  values: readonly number[];
  label: string;
}>) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
      const y = 35 - ((value - min) / range) * 25;

      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      aria-label={label}
      className="mt-4 h-20 w-full overflow-visible"
      role="img"
      viewBox="0 0 100 42"
    >
      <polyline
        aria-hidden="true"
        fill="none"
        points="0,36 100,36"
        stroke="rgba(148,163,184,.14)"
        strokeWidth="1"
      />
      <polyline
        aria-hidden="true"
        fill="none"
        points={points}
        stroke="var(--accent-yellow)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
        vectorEffect="non-scaling-stroke"
      />
      {values.map((value, index) => {
        const [cx, cy] = points.split(" ")[index].split(",");

        return (
          <circle
            aria-hidden="true"
            cx={cx}
            cy={cy}
            fill="var(--accent-yellow)"
            key={`${value}-${index}`}
            r="1.8"
          />
        );
      })}
    </svg>
  );
}

function HydrationCard({
  metric,
  profileId,
  stateMeta,
  actionsEnabled,
  onAddWater,
}: Readonly<{
  metric: NutritionMetricViewModel;
  profileId: string;
  stateMeta: ContentStateMeta;
  actionsEnabled: boolean;
  onAddWater: () => void;
}>) {
  return (
    <NutritionPanel
      className="order-7 xl:order-7"
      subtitle="Tagesstatus mit direkter Erfassung"
      stateAttributes={stateAttrs(stateMeta, profileId)}
      title="Hydration"
    >
      <p className="text-[30px] font-semibold leading-none text-[var(--text-primary)]">
        {metric.valueLabel}
      </p>
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between gap-3">
          <p className="text-[12px] font-semibold text-[var(--text-secondary)]">
            {metric.label}
          </p>
          <p className="text-[12px] font-semibold text-[var(--text-primary)]">
            {metric.percentage}%
          </p>
        </div>
        <ProgressBar metric={metric} />
        <p className="mt-2 text-[10px] leading-4 text-[var(--text-muted)]">
          {metric.target > 0
            ? `${metric.remainingLabel} · Ziel bleibt erreichbar`
            : "Hydration bleibt neutral, bis lokale Wasser- oder Zielwerte vorhanden sind."}
        </p>
      </div>
      <button
        className={secondaryButtonClass}
        disabled={!actionsEnabled}
        onClick={onAddWater}
        type="button"
      >
        Add 300 ml
      </button>
    </NutritionPanel>
  );
}

function RecentMealsCard({
  meals,
  profileId,
  stateMeta,
  actionsEnabled,
  onOpenMeal,
  onLogMeal,
}: Readonly<{
  meals: readonly MealEntry[];
  profileId: string;
  stateMeta: ContentStateMeta;
  actionsEnabled: boolean;
  onOpenMeal: (meal: MealEntry) => void;
  onLogMeal: () => void;
}>) {
  return (
    <NutritionPanel
      badge={<Pill quiet>{meals.length} logged</Pill>}
      className="order-8 xl:order-8"
      subtitle="Letzte Einträge und Detailzugriff"
      stateAttributes={stateAttrs(stateMeta, profileId)}
      title="Recent Meals"
    >
      {meals.length > 0 ? (
        <div className="grid gap-2">
          {meals.map((meal) => (
            <button
              className="grid min-w-0 gap-1 rounded-[10px] border border-[rgba(148,163,184,.08)] bg-[rgba(18,28,43,.34)] px-3 py-2 text-left transition hover:border-[var(--border-default)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] sm:grid-cols-[minmax(0,1fr)_150px_170px] sm:items-center"
              disabled={!actionsEnabled}
              key={meal.id}
              onClick={() => onOpenMeal(meal)}
              type="button"
            >
              <span className="flex min-w-0 items-center gap-2 text-[12px] font-semibold text-[var(--text-primary)]">
                <span
                  aria-hidden="true"
                  className="size-1.5 shrink-0 rounded-full bg-[var(--accent-green)]"
                />
                <span className="truncate">{meal.title}</span>
              </span>
              <span className="text-[10px] leading-4 text-[var(--text-muted)]">
                {formatMealTime(meal.consumed_at)} · {mealTypeLabels[meal.meal_type]}
              </span>
              <span className="text-[10px] leading-4 text-[var(--text-secondary)] sm:text-right">
                {meal.calories} kcal · P{meal.macros.protein} C
                {meal.macros.carbs} F{meal.macros.fat}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <EmptyNutritionState
          actionLabel="Log first meal"
          description="Mahlzeiten erscheinen hier, sobald lokale Einträge vorhanden sind."
          onAction={actionsEnabled ? onLogMeal : undefined}
          title="Noch keine Mahlzeiten"
        />
      )}
    </NutritionPanel>
  );
}

function GrocerySignalCard({
  signal,
  profileId,
  stateMeta,
}: Readonly<{
  signal: NutritionOverviewViewModel["grocerySignal"];
  profileId: string;
  stateMeta: ContentStateMeta;
}>) {
  const isEmpty = signal.missingCount === 0 && signal.ingredients.length === 0;

  return (
    <NutritionPanel
      badge={<Pill quiet>{signal.linkedMealsLabel}</Pill>}
      className="order-10 xl:order-9"
      subtitle="Fehlende Zutaten aus geplanten Mahlzeiten"
      stateAttributes={stateAttrs(stateMeta, profileId)}
      title="Grocery Signal"
    >
      {isEmpty ? (
        <>
          <p className="text-[18px] font-semibold leading-7 text-[var(--text-primary)]">
            Keine Einkaufssignale
          </p>
          <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
            Zutaten erscheinen, sobald geplante Mahlzeiten oder lokale
            Einkaufsdaten vorhanden sind.
          </p>
        </>
      ) : (
        <>
          <p className="text-[24px] font-semibold leading-8 text-[var(--text-primary)]">
            {signal.missingCount} missing ingredients
          </p>
          <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
            {signal.ingredients.join(" · ")}
          </p>
        </>
      )}
      <Link className={cn(secondaryButtonClass, "mt-5 w-fit")} href={signal.href}>
        {signal.actionLabel}
      </Link>
    </NutritionPanel>
  );
}

function EmptyNutritionState({
  title,
  description,
  actionLabel,
  href,
  onAction,
}: Readonly<{
  title: string;
  description: string;
  actionLabel: string;
  href?: "/nutrition/meal-planner";
  onAction?: () => void;
}>) {
  const body = (
    <>
      <span
        aria-hidden="true"
        className="mx-auto block size-12 rounded-full bg-[rgba(217,146,79,.16)]"
      />
      <span className="mt-4 block text-center text-[16px] font-semibold text-[var(--text-primary)]">
        {title}
      </span>
      <span className="mt-2 block text-center text-[12px] leading-5 text-[var(--text-secondary)]">
        {description}
      </span>
    </>
  );

  if (href) {
    return (
      <Link className="block rounded-[14px] p-3" href={href}>
        {body}
        <span className={cn(primaryButtonClass, "mx-auto mt-4 w-fit")}>
          {actionLabel}
        </span>
      </Link>
    );
  }

  return (
    <div className="rounded-[14px] p-3 text-center">
      {body}
      {onAction ? (
        <button className={cn(primaryButtonClass, "mx-auto mt-4")} onClick={onAction} type="button">
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function PageHeader({
  header,
  period,
  actionsEnabled,
  onPeriodChange,
  onLogMeal,
}: Readonly<{
  header: NutritionOverviewViewModel["header"];
  period: NutritionPeriod;
  actionsEnabled: boolean;
  onPeriodChange: (period: NutritionPeriod) => void;
  onLogMeal: () => void;
}>) {
  return (
    <header className="overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.72)] shadow-[0_8px_22px_rgba(0,0,0,.12)]">
      <div className="grid gap-3 bg-[linear-gradient(90deg,rgba(217,146,79,.055),transparent_46%)] px-4 py-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-yellow)]">
            {header.eyebrow}
          </p>
          <h1 className="mt-1 text-[30px] font-semibold leading-none text-[var(--text-primary)]">
            {header.title}
          </h1>
          <p className="mt-2 text-xs leading-4 text-[var(--text-secondary)]">
            {header.summary}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <div
            aria-label="Nutrition period"
            className="flex rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.82)] p-1"
            role="group"
          >
            {periods.map((periodOption) => (
              <button
                aria-pressed={period === periodOption}
                className={cn(
                  "min-h-8 rounded-[9px] px-3 text-[10px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
                  period === periodOption
                    ? "border border-[rgba(217,146,79,.55)] bg-[rgba(23,34,53,.92)] text-[var(--text-primary)]"
                    : "border border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                )}
                key={periodOption}
                onClick={() => onPeriodChange(periodOption)}
                type="button"
              >
                {sentenceCase(periodOption)}
              </button>
            ))}
          </div>
          {header.secondaryActions.map((action) => (
            <Link className={secondaryButtonClass} href={action.href} key={action.href}>
              {action.label}
            </Link>
          ))}
          <button
            className={primaryButtonClass}
            disabled={!actionsEnabled}
            onClick={onLogMeal}
            type="button"
          >
            {header.primaryAction}
          </button>
        </div>
      </div>
    </header>
  );
}

function LogMealDialog({
  open,
  onClose,
  onSave,
  defaultMeal,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  onSave: (meal: MealEntry, draft: MealDraft) => void;
  defaultMeal: MealEntry | null;
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<MealDraft>({
    meal_type: "dinner",
    title: "Protein Bowl mit Gemuese",
    amount: "",
    source: "meal_planner",
    note: "",
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      setDraft({
        meal_type: defaultMeal?.meal_type ?? "dinner",
        title: defaultMeal?.title ?? "Protein Bowl mit Gemuese",
        amount: "",
        source: defaultMeal?.source ?? "meal_planner",
        note: "",
      });
      setTouched({});
      dialog.showModal();
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [defaultMeal, open]);

  function updateDraft(
    key: keyof MealDraft,
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    setDraft((current) => ({
      ...current,
      [key]: event.target.value,
    }));
  }

  function markTouched(key: keyof MealDraft) {
    setTouched((current) => ({
      ...current,
      [key]: true,
    }));
  }

  const amountNumber = Number(draft.amount);
  const amountInvalid =
    touched.amount && (!draft.amount.trim() || Number.isNaN(amountNumber));
  const titleInvalid = touched.title && !draft.title.trim();
  const canSave =
    draft.title.trim().length > 0 &&
    draft.amount.trim().length > 0 &&
    !Number.isNaN(amountNumber) &&
    amountNumber > 0 &&
    draft.source.length > 0 &&
    draft.meal_type.length > 0;

  return (
    <dialog
      aria-labelledby="nutrition-log-meal-heading"
      className="w-[min(680px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] overflow-hidden rounded-[18px] border border-[var(--border-default)] bg-[var(--surface-1)] p-0 text-left text-[var(--text-primary)] shadow-[0_24px_80px_rgba(0,0,0,.48)] backdrop:bg-[rgba(0,0,0,.58)]"
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
      <form
        className="flex max-h-[calc(100dvh-24px)] flex-col"
        onSubmit={(event) => {
          event.preventDefault();

          if (!canSave) {
            setTouched({
              meal_type: true,
              title: true,
              amount: true,
              source: true,
            });
            return;
          }

          onSave(createManualMeal(draft), draft);
        }}
      >
        <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-yellow)]">
                Dialog · Log Meal
              </p>
              <h2
                className="mt-1 text-[18px] font-semibold leading-6 text-[var(--text-primary)]"
                id="nutrition-log-meal-heading"
              >
                Log meal
              </h2>
              <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
                Pflichtfelder: meal type, title, amount/source. Optional: note.
              </p>
            </div>
            <button
              aria-label="Close log meal dialog"
              className="size-8 shrink-0 rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.82)] text-[15px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              onClick={onClose}
              type="button"
            >
              x
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-4 py-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block min-w-0">
              <FieldLabel>Meal type</FieldLabel>
              <select
                className={inputClass}
                onBlur={() => markTouched("meal_type")}
                onChange={(event) => updateDraft("meal_type", event)}
                value={draft.meal_type}
              >
                {(Object.keys(mealTypeLabels) as MealType[]).map((type) => (
                  <option key={type} value={type}>
                    {mealTypeLabels[type]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block min-w-0">
              <FieldLabel>Title</FieldLabel>
              <input
                aria-invalid={titleInvalid}
                className={cn(
                  inputClass,
                  titleInvalid && "border-[rgba(221,107,95,.65)]",
                )}
                onBlur={() => markTouched("title")}
                onChange={(event) => updateDraft("title", event)}
                placeholder="Protein Bowl mit Gemuese"
                type="text"
                value={draft.title}
              />
              {titleInvalid ? (
                <p className="mt-1 text-[10px] leading-4 text-[var(--accent-red)]">
                  Required field
                </p>
              ) : null}
            </label>

            <label className="block min-w-0">
              <FieldLabel>Amount</FieldLabel>
              <input
                aria-describedby={amountInvalid ? "amount-error" : undefined}
                aria-invalid={amountInvalid}
                className={cn(
                  inputClass,
                  amountInvalid && "border-[rgba(221,107,95,.65)]",
                )}
                min="0"
                onBlur={() => markTouched("amount")}
                onChange={(event) => updateDraft("amount", event)}
                placeholder="1"
                type="number"
                value={draft.amount}
              />
              {amountInvalid ? (
                <p
                  className="mt-1 text-[10px] leading-4 text-[var(--accent-red)]"
                  id="amount-error"
                >
                  Required field
                </p>
              ) : null}
            </label>

            <label className="block min-w-0">
              <FieldLabel>Source</FieldLabel>
              <select
                className={inputClass}
                onBlur={() => markTouched("source")}
                onChange={(event) => updateDraft("source", event)}
                value={draft.source}
              >
                {(Object.keys(mealSourceLabels) as MealSource[]).map((source) => (
                  <option key={source} value={source}>
                    {mealSourceLabels[source]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block min-w-0 sm:col-span-2">
              <FieldLabel optional>Note</FieldLabel>
              <textarea
                className={cn(inputClass, "min-h-[76px] resize-none py-2 leading-5")}
                onChange={(event) => updateDraft("note", event)}
                placeholder="Optional: Hunger, context, replacement reason"
                rows={3}
                value={draft.note}
              />
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] bg-[rgba(11,17,28,.58)] px-4 py-3">
          <p className="max-w-md text-[10px] leading-4 text-[var(--text-faint)]">
            Phase 2 UI only. This updates the current page state and does not
            write to Supabase.
          </p>
          <div className="flex flex-wrap gap-2">
            <button className={secondaryButtonClass} onClick={onClose} type="button">
              Cancel
            </button>
            <button className={primaryButtonClass} disabled={!canSave} type="submit">
              Save
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}

function MacroDetailDialog({
  metric,
  nextMeal,
  onClose,
}: Readonly<{
  metric: NutritionMetricViewModel | null;
  nextMeal: MealEntry | null;
  onClose: () => void;
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (metric && !dialog.open) {
      dialog.showModal();
    }

    if (!metric && dialog.open) {
      dialog.close();
    }
  }, [metric]);

  return (
    <dialog
      aria-labelledby="nutrition-macro-detail-heading"
      className="w-[min(520px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] overflow-hidden rounded-[18px] border border-[var(--border-default)] bg-[var(--surface-1)] p-0 text-left text-[var(--text-primary)] shadow-[0_24px_80px_rgba(0,0,0,.48)] backdrop:bg-[rgba(0,0,0,.58)]"
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
      {metric ? (
        <div className="flex max-h-[calc(100dvh-24px)] flex-col">
          <div
            className="border-b border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--accent)_7%,rgba(14,23,38,.92))] px-4 py-3"
            style={accentStyle(metric.accent)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                  Detail Sheet
                </p>
                <h2
                  className="mt-1 text-[20px] font-semibold leading-6 text-[var(--text-primary)]"
                  id="nutrition-macro-detail-heading"
                >
                  {metric.label} detail
                </h2>
              </div>
              <button
                aria-label="Close macro detail"
                className="size-8 shrink-0 rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.82)] text-[15px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                onClick={onClose}
                type="button"
              >
                x
              </button>
            </div>
          </div>
          <div className="p-4">
            <p className="text-[13px] leading-5 text-[var(--text-secondary)]">
              {metric.valueLabel}. {metric.remainingLabel}.{" "}
              {nextMeal
                ? `Geplante ${mealTypeLabels[nextMeal.meal_type]} liefert ${nextMeal.macros.protein} g Protein und kann die Luecke schliessen.`
                : "Keine offene Mahlzeit ist geplant."}
            </p>
            <div className="mt-5">
              <div className="mb-1 flex items-center justify-between gap-3">
                <p className="text-[12px] font-semibold text-[var(--text-secondary)]">
                  {metric.label}
                </p>
                <p className="text-[12px] font-semibold text-[var(--text-primary)]">
                  {metric.percentage}%
                </p>
              </div>
              <ProgressBar metric={metric} />
              <p className="mt-2 text-[10px] leading-4 text-[var(--text-muted)]">
                Current day target
              </p>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-2">
              <Link className={secondaryButtonClass} href="/nutrition/meal-planner">
                Open next meal
              </Link>
              <button className={secondaryButtonClass} onClick={onClose} type="button">
                Close
              </button>
              <p className="text-[10px] leading-4 text-[var(--text-muted)]">
                Close: X button or Escape
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}

function MealDetailDialog({
  meal,
  onClose,
}: Readonly<{
  meal: MealEntry | null;
  onClose: () => void;
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (meal && !dialog.open) {
      dialog.showModal();
    }

    if (!meal && dialog.open) {
      dialog.close();
    }
  }, [meal]);

  return (
    <dialog
      aria-labelledby="nutrition-meal-detail-heading"
      className="w-[min(520px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] overflow-hidden rounded-[18px] border border-[var(--border-default)] bg-[var(--surface-1)] p-0 text-left text-[var(--text-primary)] shadow-[0_24px_80px_rgba(0,0,0,.48)] backdrop:bg-[rgba(0,0,0,.58)]"
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
      {meal ? (
        <div className="flex max-h-[calc(100dvh-24px)] flex-col">
          <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-yellow)]">
                  Meal detail
                </p>
                <h2
                  className="mt-1 text-[20px] font-semibold leading-6 text-[var(--text-primary)]"
                  id="nutrition-meal-detail-heading"
                >
                  {meal.title}
                </h2>
                <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
                  {mealTypeLabels[meal.meal_type]} · {mealSourceLabels[meal.source]}
                </p>
              </div>
              <button
                aria-label="Close meal detail"
                className="size-8 shrink-0 rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.82)] text-[15px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                onClick={onClose}
                type="button"
              >
                x
              </button>
            </div>
          </div>
          <div className="p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <MealMacroCard
                detail={meal.consumed_at ? "logged" : "planned"}
                label="Calories"
                value={`${meal.calories} kcal`}
              />
              <MealMacroCard
                detail="macro"
                label="Protein"
                value={`${meal.macros.protein} g`}
              />
              <MealMacroCard
                detail="macro"
                label="Carbs"
                value={`${meal.macros.carbs} g`}
              />
              <MealMacroCard
                detail="macro"
                label="Fat"
                value={`${meal.macros.fat} g`}
              />
            </div>
            <p className="mt-4 text-[12px] leading-5 text-[var(--text-secondary)]">
              {meal.consumed_at
                ? `Consumed at ${formatMealTime(meal.consumed_at)}.`
                : `Planned for ${formatMealTime(meal.planned_at)}.`}{" "}
              Detaildaten bleiben lokal und koennen spaeter aus Meals oder
              Recipes geladen werden.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Link className={secondaryButtonClass} href="/nutrition/meal-planner">
                Open meal planner
              </Link>
              <button className={secondaryButtonClass} onClick={onClose} type="button">
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}

function Toast({
  toast,
  onDismiss,
}: Readonly<{
  toast: ToastState | null;
  onDismiss: () => void;
}>) {
  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = setTimeout(onDismiss, 4200);

    return () => {
      clearTimeout(timeout);
    };
  }, [onDismiss, toast]);

  if (!toast) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-40 w-[min(420px,calc(100vw-32px))] rounded-[14px] border bg-[rgba(18,28,43,.96)] p-4 shadow-[0_18px_48px_rgba(0,0,0,.38)]",
        toast.tone === "success"
          ? "border-[rgba(66,184,131,.32)]"
          : "border-[rgba(95,200,215,.32)]",
      )}
      role="status"
    >
      <div className="flex gap-3">
        <span
          aria-hidden="true"
          className={cn(
            "mt-1 size-2.5 shrink-0 rounded-full",
            toast.tone === "success"
              ? "bg-[var(--accent-green)]"
              : "bg-[var(--accent-cyan)]",
          )}
        />
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-[var(--text-primary)]">
            {toast.title}
          </p>
          <p className="mt-1 text-[11px] leading-4 text-[var(--text-secondary)]">
            {toast.body}
          </p>
        </div>
      </div>
    </div>
  );
}

export function NutritionOverviewPage({
  viewModel,
}: Readonly<{
  viewModel: NutritionOverviewViewModel;
}>) {
  const profileId = viewModel.profileId ?? "demo";
  const actionsEnabled = viewModel.actionsEnabled ?? true;
  const [period, setPeriod] = useState<NutritionPeriod>("today");
  const [day, setDay] = useState<NutritionDay>(viewModel.day);
  const [meals, setMeals] = useState<MealEntry[]>([...viewModel.meals]);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [activeMetric, setActiveMetric] =
    useState<NutritionMetricViewModel | null>(null);
  const [activeMeal, setActiveMeal] = useState<MealEntry | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const metrics = useMemo(() => buildNutritionMetrics(day), [day]);
  const openMeal = useMemo(() => nextOpenMeal(meals), [meals]);
  const loggedMeals = useMemo(() => recentMeals(meals), [meals]);
  const waterMetric = metricByType(metrics, "water");
  const hasData =
    day.calorie_actual > 0 ||
    day.protein_actual > 0 ||
    day.water_actual > 0 ||
    loggedMeals.length > 0;
  const initialLoggedCount = useMemo(
    () => viewModel.meals.filter((meal) => meal.consumed_at).length,
    [viewModel.meals],
  );
  const localAdherence = useMemo(() => {
    const eatenDelta = Math.max(0, loggedMeals.length - initialLoggedCount);
    const openDelta = openMeal ? 0 : 1;

    return {
      ...viewModel.adherence,
      eaten: viewModel.adherence.eaten + eatenDelta,
      open: Math.max(0, viewModel.adherence.open - openDelta),
    };
  }, [initialLoggedCount, loggedMeals.length, openMeal, viewModel.adherence]);
  const contentStates =
    viewModel.contentStates ??
    {
      adherence: resolveContentStateMeta({
        capacity: 21,
        itemCount: viewModel.adherence.planned,
      }),
      grocerySignal: resolveContentStateMeta({
        capacity: 1,
        itemCount: viewModel.grocerySignal.missingCount > 0 ? 1 : 0,
      }),
      hydration: resolveContentStateMeta({
        capacity: 1,
        hasPrimaryValue: waterMetric.actual > 0,
        itemCount: waterMetric.actual > 0 ? 1 : 0,
      }),
      nextMeal: resolveContentStateMeta({
        capacity: 1,
        itemCount: openMeal ? 1 : 0,
      }),
      page: resolveContentStateMeta({
        capacity: 7,
        itemCount: viewModel.meals.length + viewModel.priorities.length,
      }),
      priorities: resolveContentStateMeta({
        capacity: 3,
        itemCount: viewModel.priorities.length,
      }),
      recentMeals: resolveContentStateMeta({
        capacity: 5,
        itemCount: loggedMeals.length,
      }),
      todayNutrition: resolveContentStateMeta({
        capacity: 5,
        itemCount: hasData ? 1 : 0,
      }),
      weekBalance: resolveContentStateMeta({
        capacity: 7,
        itemCount: viewModel.weekBalance.filter((item) => item.value > 0).length,
      }),
      weightTrend: resolveContentStateMeta({
        capacity: 3,
        hasHistory: viewModel.weightTrend.values.length > 1,
        hasPrimaryValue: viewModel.weightTrend.values.length > 0,
        itemCount: viewModel.weightTrend.values.length,
      }),
    };

  function showToast(nextToast: ToastState) {
    setToast(nextToast);
  }

  function handleAddWater() {
    setDay((current) => ({
      ...current,
      water_actual: Math.min(
        current.water_target,
        Math.round((current.water_actual + 0.3) * 10) / 10,
      ),
    }));
    showToast({
      title: "Water added",
      body: "300 ml wurden lokal zum Tagesstatus addiert.",
      tone: "success",
    });
  }

  function handleMarkAsEaten(meal: MealEntry) {
    const consumedAt = new Date().toISOString();
    const consumedMeal = {
      ...meal,
      consumed_at: consumedAt,
    };

    setMeals((current) =>
      current.map((item) => (item.id === meal.id ? consumedMeal : item)),
    );
    setDay((current) => applyMealToDay(current, meal));
    showToast({
      title: "Meal logged",
      body: `${meal.title} wurde als gegessen markiert und Tageswerte wurden aktualisiert.`,
      tone: "success",
    });
  }

  function handleSaveMeal(meal: MealEntry, draft: MealDraft) {
    setMeals((current) => [meal, ...current]);
    setDay((current) => applyMealToDay(current, meal));
    setLogDialogOpen(false);
    showToast({
      title: "Meal logged",
      body: `${draft.title.trim()} wurde gespeichert. Amount: ${draft.amount}.`,
      tone: "success",
    });
  }

  function handlePeriodChange(nextPeriod: NutritionPeriod) {
    setPeriod(nextPeriod);
    showToast({
      title: `${sentenceCase(nextPeriod)} view selected`,
      body: "Der Zeitraum steuert aktuell lokalen View-State mit denselben Mockdaten.",
      tone: "info",
    });
  }

  return (
    <>
      <div
        className="mx-auto flex w-full max-w-[2208px] flex-col gap-2 pb-6"
        id="nutrition-page"
        {...stateAttrs(contentStates.page, profileId)}
      >
        <PageHeader
          actionsEnabled={actionsEnabled}
          header={viewModel.header}
          onLogMeal={() => setLogDialogOpen(true)}
          onPeriodChange={handlePeriodChange}
          period={period}
        />

        <div className="grid min-w-0 gap-2 xl:grid-cols-12">
          <TodayNutritionCard
            actionsEnabled={actionsEnabled}
            metrics={metrics}
            nextMeal={openMeal}
            onAddWater={handleAddWater}
            onSelectMetric={setActiveMetric}
            profileId={profileId}
            stateMeta={contentStates.todayNutrition}
          />
          <NextMealCard
            actionsEnabled={actionsEnabled}
            meal={openMeal}
            onMarkAsEaten={handleMarkAsEaten}
            onOpenMeal={setActiveMeal}
            profileId={profileId}
            stateMeta={contentStates.nextMeal}
          />
        </div>

        <div className="grid min-w-0 gap-2 xl:grid-cols-[minmax(300px,.9fr)_minmax(300px,.75fr)_minmax(420px,1.3fr)]">
          <NutritionPrioritiesCard
            actionsEnabled={actionsEnabled}
            onAddWater={handleAddWater}
            profileId={profileId}
            priorities={viewModel.priorities}
            stateMeta={contentStates.priorities}
          />
          <WeekBalanceCard
            items={viewModel.weekBalance}
            profileId={profileId}
            stateMeta={contentStates.weekBalance}
            statement={viewModel.weekBalanceStatement}
          />
          <MealPlanAdherenceCard
            adherence={localAdherence}
            profileId={profileId}
            stateMeta={contentStates.adherence}
          />
        </div>

        <div className="grid min-w-0 gap-2 xl:grid-cols-[minmax(260px,.8fr)_minmax(260px,.75fr)_minmax(420px,1.1fr)_minmax(320px,.8fr)]">
          <HydrationCard
            actionsEnabled={actionsEnabled}
            metric={waterMetric}
            onAddWater={handleAddWater}
            profileId={profileId}
            stateMeta={contentStates.hydration}
          />
          <RecentMealsCard
            actionsEnabled={actionsEnabled}
            meals={loggedMeals}
            onLogMeal={() => setLogDialogOpen(true)}
            onOpenMeal={setActiveMeal}
            profileId={profileId}
            stateMeta={contentStates.recentMeals}
          />
          <WeightTrendCard
            profileId={profileId}
            stateMeta={contentStates.weightTrend}
            trend={viewModel.weightTrend}
          />
          <GrocerySignalCard
            profileId={profileId}
            signal={viewModel.grocerySignal}
            stateMeta={contentStates.grocerySignal}
          />
        </div>
      </div>

      <LogMealDialog
        defaultMeal={openMeal}
        onClose={() => setLogDialogOpen(false)}
        onSave={handleSaveMeal}
        open={logDialogOpen}
      />
      <MacroDetailDialog
        metric={activeMetric}
        nextMeal={openMeal}
        onClose={() => setActiveMetric(null)}
      />
      <MealDetailDialog meal={activeMeal} onClose={() => setActiveMeal(null)} />
      <Toast onDismiss={() => setToast(null)} toast={toast} />
    </>
  );
}
