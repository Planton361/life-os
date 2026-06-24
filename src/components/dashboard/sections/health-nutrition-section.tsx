"use client";

import type {
  DashboardMeal,
  DashboardMeals,
  DashboardNutrientBalance,
  DashboardProfileId,
  DashboardRunningRecovery,
  DashboardWeightLossGoal,
  RunningRecoveryMode,
} from "@/features/dashboard";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveDashboardMealSlotAction,
} from "@/features/profile-data/actions";
import { initialDashboardActionState } from "@/features/profile-data/dashboard-action-state";
import { cn } from "@/lib/cn";
import {
  DashboardDialog,
  SelectField,
  TextField,
  dashboardActionButtonClass,
  dashboardPrimaryButtonClass,
} from "./dashboard-dialog";
import {
  Panel,
  Pill,
  ProgressBar,
  contentStateAttrs,
  styleFor,
} from "./section-primitives";

const DASHBOARD_LINK_FOCUS_CLASSES =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-cyan)]";

function runningRhythmAccent(statusLabel: string) {
  const normalizedStatus = statusLabel.toLowerCase();

  if (normalizedStatus.includes("better")) {
    return "var(--accent-green)";
  }

  if (
    normalizedStatus.includes("below") ||
    normalizedStatus.includes("weak") ||
    normalizedStatus.includes("slow")
  ) {
    return "var(--accent-orange)";
  }

  return "var(--accent-cyan)";
}

function minutesFromTime(value: string) {
  const [hours = "0", minutes = "0"] = value.split(":");

  return Number(hours) * 60 + Number(minutes);
}

function hasMealPassed(mealTime: string, currentTime: string) {
  return minutesFromTime(mealTime) <= minutesFromTime(currentTime);
}

function muscleStatusAccent(statusLabel: string) {
  if (statusLabel === "Done") {
    return "var(--accent-green)";
  }

  if (statusLabel === "Missed") {
    return "var(--accent-orange)";
  }

  return "var(--accent-cyan)";
}

function mealStateLabel(state: DashboardMeal["state"]) {
  if (state === "logged") return "Logged";
  if (state === "planned") return "Planned";
  if (state === "skipped") return "Ausgelassen";

  return "Unplanned";
}

function mealStateAccent(state: DashboardMeal["state"]) {
  if (state === "logged") return "var(--accent-green)";
  if (state === "planned") return "var(--accent-yellow)";
  if (state === "skipped") return "var(--text-muted)";

  return "var(--text-muted)";
}

export function WeightLossGoal({
  data,
  profileId,
}: Readonly<{
  data: DashboardWeightLossGoal;
  profileId: DashboardProfileId;
}>) {
  const className = cn(
    "h-[188px] overflow-hidden rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[#0f1724] p-5 shadow-[0_8px_22px_rgba(0,0,0,.12)] 2xl:h-[184px] 2xl:px-[28px] 2xl:py-[22px]",
    data.href && `block ${DASHBOARD_LINK_FOCUS_CLASSES}`,
  );
  const content = (
    <>
      <h2
        className="text-lg font-semibold text-[var(--text-primary)]"
        id="weight-loss-goal-title"
      >
        {data.title}
      </h2>
      <p className="mt-3 text-[31px] font-semibold leading-none text-[var(--text-primary)]">
        {data.currentWeight}
      </p>
      <p className="mt-2 text-[9px] font-semibold leading-tight text-[var(--text-muted)]">
        {data.targetLabel}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Pill accent={data.weeklyStatusAccent}>{data.weeklyStatusLabel}</Pill>
        <span className="text-[10px] font-semibold text-[var(--text-secondary)]">
          {data.remainingLabel}
        </span>
      </div>
      <div className="mt-2">
        <ProgressBar accent={data.accent} progress={data.progress} quiet />
      </div>
    </>
  );

  if (data.href) {
    return (
      <Link
        aria-label={`Open health: ${data.title}`}
        className={className}
        href={data.href}
        {...contentStateAttrs(data.contentState, profileId)}
      >
        {content}
      </Link>
    );
  }

  return (
    <section
      aria-labelledby="weight-loss-goal-title"
      className={className}
      {...contentStateAttrs(data.contentState, profileId)}
    >
      {content}
    </section>
  );
}

export function NutrientBalance({
  data,
  profileId,
}: Readonly<{
  data: DashboardNutrientBalance;
  profileId: DashboardProfileId;
}>) {
  const className = cn(
    "h-[188px] overflow-hidden rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[#0f1724] p-5 shadow-[0_8px_22px_rgba(0,0,0,.12)] 2xl:h-[184px] 2xl:p-[18px]",
    data.href && `block ${DASHBOARD_LINK_FOCUS_CLASSES}`,
  );
  const content = (
    <>
      <h2
        className="text-lg font-semibold text-[var(--text-primary)]"
        id="nutrient-balance-title"
      >
        {data.title}
      </h2>
      <div className="mt-3 space-y-2.5">
        {data.items.map((item, index) => (
          <div key={`dashboard-nutrient-${index}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold text-[var(--text-muted)]">
                {item.label}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-semibold text-[var(--text-secondary)]">
                  {item.value}
                </p>
                <span
                  className="rounded-full border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-2 py-0.5 text-[8px] font-semibold text-[var(--text-secondary)]"
                  style={styleFor(item.statusAccent)}
                >
                  {item.status}
                </span>
              </div>
            </div>
            <div className="mt-2">
              <ProgressBar accent={item.accent} progress={item.progress} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[8px] font-semibold text-[var(--text-faint)]">
        {data.lastUpdatedLabel}
      </p>
    </>
  );

  if (data.href) {
    return (
      <Link
        aria-label={`Open meal planner: ${data.title}`}
        className={className}
        href={data.href}
        {...contentStateAttrs(data.contentState, profileId)}
      >
        {content}
      </Link>
    );
  }

  return (
    <section
      aria-labelledby="nutrient-balance-title"
      className={className}
      {...contentStateAttrs(data.contentState, profileId)}
    >
      {content}
    </section>
  );
}

export function MealsToday({
  data,
  profileId,
}: Readonly<{
  data: DashboardMeals;
  profileId: DashboardProfileId;
}>) {
  const [editingMeal, setEditingMeal] = useState<DashboardMeal | null>(null);
  const [state, formAction, pending] = useActionState(
    saveDashboardMealSlotAction,
    initialDashboardActionState,
  );
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <>
      <Panel
        className="border-[rgba(217,146,79,.22)] bg-[color-mix(in_srgb,var(--accent-orange)_5%,#0f1724)] 2xl:h-[384px]"
        stateAttrs={contentStateAttrs(data.contentState, profileId)}
        title={data.title}
        titleHref={data.href}
      >
        <div className="space-y-3 p-4 2xl:space-y-2 2xl:p-3">
          {data.items.map((meal) => {
              const isPast = hasMealPassed(meal.time, data.currentTimeLabel);
              const unplanned = meal.state === "unplanned";

              return (
                <article
                  className="grid min-h-[84px] grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-[14px] border border-[rgba(217,146,79,.18)] bg-[color-mix(in_srgb,var(--accent-orange)_7%,#101a2a)] p-3 2xl:min-h-[92px]"
                  key={meal.mealId}
                >
                  <Link
                    aria-label={`Open meal slot ${meal.type}: ${meal.name}`}
                    className={cn(
                      "grid min-w-0 grid-cols-[64px_minmax(0,1fr)] gap-4 rounded-[12px] 2xl:grid-cols-[72px_minmax(0,1fr)]",
                      DASHBOARD_LINK_FOCUS_CLASSES,
                    )}
                    href={meal.href ?? "/nutrition/meal-planner?view=today"}
                  >
                    <div
                      className={cn(
                        "rounded-[14px] border 2xl:h-[68px] 2xl:w-[72px]",
                        unplanned
                          ? "border-[var(--border-subtle)] bg-[rgba(168,183,204,.06)]"
                          : "border-[rgba(217,146,79,.20)] bg-[rgba(217,146,79,.14)]",
                      )}
                    />
                    <div className="min-w-0 py-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Pill accent="var(--accent-yellow)">{meal.type}</Pill>
                        {unplanned ? (
                          <Pill quiet>Unplanned</Pill>
                        ) : isPast ? (
                          <Pill accent="var(--accent-green)">
                            Done · time passed
                          </Pill>
                        ) : (
                          <Pill quiet>{meal.time}</Pill>
                        )}
                        <Pill accent={mealStateAccent(meal.state)}>
                          {mealStateLabel(meal.state)}
                        </Pill>
                      </div>
                      <h3 className="mt-1 truncate text-xs font-semibold text-[var(--text-secondary)]">
                        {meal.name}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-medium text-[var(--text-secondary)]">
                        <span>{meal.kcal}</span>
                        {meal.macros.map((macro, index) => (
                          <span key={`${meal.mealId}-macro-${index}`}>
                            {macro}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Link>
                  <button
                    aria-label={`${meal.ctaLabel ?? "Planen"} ${meal.type}`}
                    className={cn(
                      "self-start rounded-full border border-[rgba(217,146,79,.22)] bg-[rgba(217,146,79,.09)] px-3 py-1 text-[9px] font-semibold text-[var(--text-secondary)] transition hover:border-[rgba(217,146,79,.36)] hover:text-[var(--text-primary)]",
                      DASHBOARD_LINK_FOCUS_CLASSES,
                    )}
                    onClick={() => setEditingMeal(meal)}
                    type="button"
                  >
                    {meal.ctaLabel ?? "Planen"}
                  </button>
                </article>
              );
            })}
        </div>
      </Panel>

      {editingMeal ? (
        <DashboardDialog
          labelledBy="meal-change-dialog-heading"
          onClose={() => setEditingMeal(null)}
          open
        >
          <form action={formAction}>
            <div className="border-b border-[var(--border-subtle)] px-5 py-4">
              <h2
                className="text-lg font-semibold text-[var(--text-primary)]"
                id="meal-change-dialog-heading"
              >
                Meal slot
              </h2>
              <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                {profileId === "manual"
                  ? "Speichert den Slot lokal im Manual-Profil."
                  : "Wechsle ins Manual-Profil, um Mahlzeiten lokal zu speichern."}
              </p>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <SelectField
                defaultValue={editingMeal.type}
                label="Meal Slot"
                name="meal"
              >
                <option>Breakfast</option>
                <option>Lunch</option>
                <option>Dinner</option>
              </SelectField>
              <SelectField
                defaultValue={editingMeal.state ?? "planned"}
                label="State"
                name="state"
              >
                <option value="planned">Planned</option>
                <option value="logged">Logged</option>
                <option value="skipped">Skipped</option>
              </SelectField>
              <TextField
                defaultValue={
                  editingMeal.state === "unplanned" ? "" : editingMeal.name
                }
                label="Name"
                name="name"
                placeholder="Meal name"
              />
              <TextField
                defaultValue={editingMeal.time}
                label="Time"
                name="time"
                type="time"
              />
              <TextField
                defaultValue={editingMeal.kcal === "-" ? "" : editingMeal.kcal}
                label="Kcal"
                name="kcal"
                optional
                placeholder="560 kcal"
              />
              <TextField label="Protein" name="protein" optional placeholder="P 40g" />
              <TextField label="Carbs" name="carbs" optional placeholder="C 55g" />
              <TextField label="Fat" name="fat" optional placeholder="F 15g" />
            </div>
            {state.message ? (
              <p
                className={cn(
                  "px-5 pb-2 text-[11px] font-semibold",
                  state.status === "success"
                    ? "text-[var(--accent-green)]"
                    : state.status === "blocked"
                      ? "text-[var(--accent-orange)]"
                      : "text-[var(--text-muted)]",
                )}
                role="status"
              >
                {state.message}
              </p>
            ) : null}
            <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] px-5 py-4">
              <button
                className={dashboardActionButtonClass}
                onClick={() => setEditingMeal(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className={dashboardPrimaryButtonClass}
                disabled={pending}
                type="submit"
              >
                {pending ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </DashboardDialog>
      ) : null}
    </>
  );
}

export function RunningTracker({
  data,
  profileId,
}: Readonly<{
  data: DashboardRunningRecovery;
  profileId: DashboardProfileId;
}>) {
  const [activeMode, setActiveMode] = useState<RunningRecoveryMode>(
    data.activeMode,
  );
  const rhythmAccent = runningRhythmAccent(data.rhythm.statusLabel);
  const modeSwitch = (
    <div className="flex w-[294px] max-w-full rounded-full border border-[var(--border-subtle)] bg-[#0b1422] p-0.5 text-center text-[10px] font-semibold text-[var(--text-primary)]">
      {data.modes.map((view) => (
        <button
          aria-pressed={view === activeMode}
          className={cn(
            "flex-1 rounded-full px-3 py-0.5",
            DASHBOARD_LINK_FOCUS_CLASSES,
            view === activeMode &&
              "border border-[var(--border-subtle)] bg-[rgba(168,183,204,.06)] text-[var(--text-secondary)]",
          )}
          key={view}
          onClick={() => setActiveMode(view)}
          type="button"
        >
          {view}
        </button>
      ))}
    </div>
  );

  return (
    <Panel
      className="border-[var(--border-subtle)] bg-[#0f1724] 2xl:h-[226px]"
      headerAccessory={modeSwitch}
      stateAttrs={contentStateAttrs(data.contentState, profileId)}
      subtitle={data.subtitle}
      title={data.title}
      titleHref={data.href}
    >
      <div className="p-3 2xl:flex 2xl:h-[152px] 2xl:flex-col 2xl:justify-between 2xl:p-2.5">
        {activeMode === "Running" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3 2xl:gap-2">
              {data.stats.map((stat, index) => (
                <article
                  className="rounded-[14px] border border-[var(--border-subtle)] bg-[#101a2a] p-2.5 2xl:min-h-[52px] 2xl:p-2"
                  key={`running-stat-${index}`}
                >
                  <p className="text-[10px] font-medium text-[var(--text-muted)]">
                    {stat.label}
                  </p>
                  <div className="mt-1.5 flex items-baseline justify-between gap-3">
                    <p className="text-base font-semibold text-[var(--text-primary)]">
                      {stat.value}
                    </p>
                    <p className="text-[10px] font-medium text-[var(--text-secondary)]">
                      {stat.delta}
                    </p>
                  </div>
                </article>
              ))}
            </div>
            <article className="mt-2 grid gap-3 rounded-[14px] border border-[var(--border-subtle)] bg-[#101a2a] p-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center 2xl:mt-0 2xl:min-h-[62px] 2xl:gap-2 2xl:p-2">
              <div>
                <p className="text-[10px] font-semibold text-[var(--text-primary)]">
                  {data.rhythm.title}
                </p>
                <p className="mt-1 text-[10px] font-semibold text-[var(--text-secondary)]">
                  {data.rhythm.detail}
                </p>
                <p className="mt-1 text-[9px] font-semibold text-[var(--text-muted)]">
                  {data.todayGoalLabel} · {data.lastSyncLabel}
                </p>
              </div>
              <Pill accent={rhythmAccent}>{data.rhythm.statusLabel}</Pill>
            </article>
          </>
        ) : (
          <Link
            aria-label={`Open workout: ${data.muscle.title}`}
            className={cn(
              "block rounded-[14px] border border-[var(--border-subtle)] bg-[#101a2a] p-3",
              DASHBOARD_LINK_FOCUS_CLASSES,
            )}
            href={data.muscle.href ?? "/health/strength"}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  {data.muscle.title}
                </h3>
                <p className="mt-1 text-[10px] font-semibold text-[var(--text-secondary)]">
                  {data.muscle.detail}
                </p>
              </div>
              <Pill accent={muscleStatusAccent(data.muscle.statusLabel)}>
                {data.muscle.statusLabel}
              </Pill>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {data.muscle.focusGroups.map((group, index) => (
                <Pill key={`muscle-focus-${index}`} quiet>
                  {group}
                </Pill>
              ))}
            </div>
            <p className="mt-3 text-[10px] font-semibold text-[var(--text-secondary)]">
              {data.muscle.nextStep}
            </p>
            <p className="mt-1 text-[9px] font-semibold text-[var(--text-muted)]">
              {data.lastSyncLabel}
            </p>
          </Link>
        )}
      </div>
    </Panel>
  );
}
