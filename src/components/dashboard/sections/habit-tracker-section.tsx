"use client";

import type {
  DashboardHabit,
  DashboardHabitTrackers,
  DashboardProfileId,
  HabitTrackerWindow,
} from "@/features/dashboard";
import { useState } from "react";
import {
  createHabitAction,
  incrementHabitAction,
  undoHabitAction,
} from "@/features/real-data/actions/habit.actions";
import { cn } from "@/lib/cn";
import {
  DashboardEmptyState,
  Panel,
  contentStateAttrs,
} from "./section-primitives";
import {
  DashboardDialog,
  SelectField,
  TextField,
  dashboardActionButtonClass,
  dashboardPrimaryButtonClass,
} from "./dashboard-dialog";

const DASHBOARD_LINK_FOCUS_CLASSES =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-cyan)]";

function formatHabitNumber(value: number) {
  if (Number.isInteger(value)) {
    return value.toString();
  }

  return value.toFixed(1).replace(/\.0$/, "");
}

function formatHabitValue(habit: DashboardHabit) {
  const currentValue = formatHabitNumber(habit.currentValue);

  if (habit.targetValue === null) {
    return `${currentValue}${habit.unit ? ` ${habit.unit}` : ""} · no target`;
  }

  const targetValue = formatHabitNumber(habit.targetValue);

  if (habit.unit === "h") {
    return `${currentValue}h / ${targetValue}h`;
  }

  return `${currentValue} / ${targetValue}${habit.unit ? ` ${habit.unit}` : ""}`;
}

function completedHabitDots(habit: DashboardHabit) {
  if (habit.targetValue === null || habit.targetValue <= 0 || habit.total <= 0) {
    return 0;
  }

  const currentValue = habit.currentValue;

  if (currentValue <= 0) {
    return 0;
  }

  if (currentValue >= habit.targetValue) {
    return habit.total;
  }

  return Math.max(
    1,
    Math.ceil((currentValue / habit.targetValue) * habit.total),
  );
}

function AddHabitDialog({
  activeWindow,
  onClose,
  profileId,
}: Readonly<{
  activeWindow: HabitTrackerWindow;
  onClose: () => void;
  profileId: DashboardProfileId;
}>) {
  return (
    <DashboardDialog
      labelledBy="add-habit-dialog-heading"
      onClose={onClose}
      open
    >
      <form action={createHabitAction}>
        <input name="returnTo" type="hidden" value="/dashboard" />
        <div className="border-b border-[var(--border-subtle)] px-5 py-4">
          <h2
            className="text-lg font-semibold text-[var(--text-primary)]"
            id="add-habit-dialog-heading"
          >
            Add habit
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
            {profileId === "manual"
              ? "Speichert Definition und Slot im authentifizierten Manual-Profil."
              : "Wechsle ins Manual-Profil, um Habits lokal zu speichern."}
          </p>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          <TextField label="Name" name="name" placeholder="Habit name" />
          <SelectField
            defaultValue={activeWindow}
            label="Time of day"
            name="window"
          >
            <option>Morning</option>
            <option>Midday</option>
            <option>Evening</option>
          </SelectField>
          <TextField defaultValue="1" label="Target" name="dailyTarget" />
          <TextField
            label="Unit"
            name="unit"
            optional
            placeholder="min, ml, pages"
          />
          <TextField defaultValue="1" label="Increment" name="defaultIncrement" />
          <TextField defaultValue="1" label="Slot 1–8" name="sortOrder" />
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] px-5 py-4">
          <button
            className={dashboardActionButtonClass}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className={dashboardPrimaryButtonClass}
            type="submit"
          >
            Save
          </button>
        </div>
      </form>
    </DashboardDialog>
  );
}

export function HabitTrackers({
  data,
  feedback,
  profileId,
}: Readonly<{
  data: DashboardHabitTrackers;
  feedback?: string;
  profileId: DashboardProfileId;
}>) {
  const [activeWindow, setActiveWindow] = useState<HabitTrackerWindow>(
    data.activeWindow,
  );
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const habits = data.habitsByWindow[activeWindow];

  const windowSwitch = (
    <div className="flex min-w-0 items-center justify-end">
      <div className="flex w-[270px] max-w-full rounded-full border border-[var(--border-subtle)] bg-[#0c1422] p-0.5 text-center text-[10px] font-semibold text-[var(--text-primary)]">
        {data.windows.map((view) => (
          <button
            aria-pressed={view === activeWindow}
            className={cn(
              "flex-1 rounded-full px-3 py-0.5",
              DASHBOARD_LINK_FOCUS_CLASSES,
              view === activeWindow &&
                "border border-[rgba(155,124,246,.26)] bg-[rgba(155,124,246,.12)] text-[var(--text-secondary)]",
            )}
            key={view}
            onClick={() => setActiveWindow(view)}
            type="button"
          >
            {view}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Panel
      className="border-[rgba(155,124,246,.16)] bg-[color-mix(in_srgb,var(--accent-purple)_5%,#101827)] 2xl:min-h-[292px]"
      headerAccessory={windowSwitch}
      stateAttrs={contentStateAttrs(
        {
          capacity: 8,
          itemCount: habits.length,
          state:
            habits.length === 0
              ? "empty"
              : habits.length >= 8
                ? "filled"
                : "partial",
        },
        profileId,
      )}
      title={data.title}
      titleHref={data.href}
    >
      <div className="p-4 2xl:px-[24px] 2xl:pb-5 2xl:pt-4" data-dashboard-section="habit-tracker">
        {feedback ? (
          <p
            className={cn(
              "mb-2 rounded-[9px] border px-3 py-2 text-[10px] font-semibold",
              feedback === "saved"
                ? "border-[rgba(66,184,131,.28)] text-[var(--accent-green)]"
                : "border-[rgba(217,146,79,.28)] text-[var(--accent-orange)]",
            )}
            role={feedback === "saved" ? "status" : "alert"}
          >
            {feedback === "saved"
              ? "Habit aktualisiert."
              : feedback === "blocked"
                ? "Habit-Tracking benötigt das authentifizierte Manual-Profil."
                : "Habit-Aktion konnte nicht gespeichert werden."}
          </p>
        ) : null}
        {profileId === "empty" ? (
          <DashboardEmptyState
            description="Im Empty-Profil werden keine Demo-Habits oder scheinbar persistente Controls gezeigt."
            title="Keine Habit-Daten"
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 2xl:grid-cols-[130px_130px_130px_130px] 2xl:gap-x-[14px] 2xl:gap-y-3">
            {habits.map((habit) => {
              const valueLabel = formatHabitValue(habit);
              const activeDots = completedHabitDots(habit);

              return (
                <article
                  aria-label={`${habit.label}: ${valueLabel}. ${activeDots} of ${habit.total} active.`}
                  className={cn(
                    "min-h-[68px] rounded-[14px] border border-[rgba(155,124,246,.16)] bg-[color-mix(in_srgb,var(--accent-purple)_5%,#101a2a)] p-2.5 text-left transition hover:border-[rgba(155,124,246,.30)]",
                    DASHBOARD_LINK_FOCUS_CLASSES,
                  )}
                  key={habit.id}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full border border-[rgba(155,124,246,.24)] bg-[rgba(155,124,246,.12)] text-[10px] font-semibold text-[var(--text-primary)]">
                      {habit.marker}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[10px] font-semibold text-[var(--text-primary)]">
                        {habit.label}
                      </h3>
                      <p className="mt-0.5 text-[11px] font-semibold leading-tight text-[var(--text-primary)]">
                        {valueLabel}
                      </p>
                    </div>
                    {profileId === "manual" ? (
                      <form action={incrementHabitAction}>
                        <input name="habitId" type="hidden" value={habit.id} />
                        <input name="returnTo" type="hidden" value="/dashboard" />
                        <button
                          aria-label={`${habit.label} um ${formatHabitNumber(habit.stepValue)} ${habit.unit ?? "Count"} erhöhen`}
                          className="grid size-8 place-items-center rounded-full border border-[rgba(155,124,246,.30)] text-sm font-semibold text-[var(--text-primary)]"
                          type="submit"
                        >
                          +
                        </button>
                      </form>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[8px] font-semibold text-[var(--text-muted)]">
                    {activeDots} of {habit.total} active
                  </p>
                  <div
                    className="mt-2 flex gap-1.5"
                    aria-label={`${activeDots} of ${habit.total} completed`}
                  >
                    {Array.from({ length: habit.total }).map((_, index) => (
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          index < activeDots
                            ? "bg-[var(--accent-purple)] shadow-[0_0_10px_rgba(155,124,246,.36)]"
                            : "bg-[rgba(148,163,184,.20)]",
                        )}
                        key={`${habit.label}-${index}`}
                      />
                    ))}
                  </div>
                  {profileId === "manual" && habit.currentValue > 0 ? (
                    <form action={undoHabitAction} className="mt-2">
                      <input name="habitId" type="hidden" value={habit.id} />
                      <input name="returnTo" type="hidden" value="/dashboard" />
                      <button className="text-[9px] font-semibold text-[var(--text-muted)] underline-offset-2 hover:underline" type="submit">
                        Letzten Eintrag rückgängig
                      </button>
                    </form>
                  ) : null}
                </article>
              );
            })}
            {profileId === "manual" && habits.length < 8 ? (
              <button
                className={cn(
                  "grid min-h-[68px] place-items-center rounded-[14px] border border-[rgba(155,124,246,.16)] bg-[color-mix(in_srgb,var(--accent-purple)_5%,#101a2a)] p-2.5 text-center transition hover:border-[rgba(155,124,246,.30)]",
                  DASHBOARD_LINK_FOCUS_CLASSES,
                )}
                onClick={() => profileId === "manual" && setAddDialogOpen(true)}
                type="button"
              >
                <div>
                  <p className="text-lg font-semibold leading-none text-[var(--text-primary)]">
                    +
                  </p>
                  <p className="mt-1.5 text-[10px] font-semibold text-[var(--text-primary)]">
                    {data.addHabitLabel}
                  </p>
                  <p className="mt-0.5 text-[8px] font-semibold text-[var(--text-muted)]">
                    {data.addHabitMeta}
                  </p>
                </div>
              </button>
            ) : null}
          </div>
        )}
      </div>
      {profileId === "manual" && addDialogOpen ? (
        <AddHabitDialog
          activeWindow={activeWindow}
          onClose={() => setAddDialogOpen(false)}
          profileId={profileId}
        />
      ) : null}
    </Panel>
  );
}
