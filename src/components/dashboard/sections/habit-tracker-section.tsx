"use client";

import type {
  DashboardHabit,
  DashboardHabitTrackers,
  HabitTrackerWindow,
} from "@/features/dashboard";
import { useState, type FormEvent } from "react";
import { cn } from "@/lib/cn";
import { Panel } from "./section-primitives";
import {
  DashboardDialog,
  SelectField,
  TextField,
  dashboardActionButtonClass,
  dashboardPrimaryButtonClass,
} from "./dashboard-dialog";

const DASHBOARD_LINK_FOCUS_CLASSES =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-cyan)]";

function habitIdFromName(name: string) {
  return `habit-${name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}-${Date.now().toString(36)}`;
}

function markerFromName(name: string) {
  return (name.trim().charAt(0) || "H").toUpperCase();
}

function parsePositiveNumber(value: string, fallback: number) {
  const parsedValue = Number.parseFloat(value.replace(",", "."));

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return parsedValue;
}

function defaultStepValue(targetValue: number) {
  if (targetValue <= 1) {
    return 1;
  }

  if (targetValue <= 10) {
    return 1;
  }

  return Math.max(1, Math.round(targetValue / 5));
}

function clampHabitValue(habit: DashboardHabit) {
  return Math.min(Math.max(habit.currentValue, 0), habit.targetValue);
}

function formatHabitNumber(value: number) {
  if (Number.isInteger(value)) {
    return value.toString();
  }

  return value.toFixed(1).replace(/\.0$/, "");
}

function formatHabitValue(habit: DashboardHabit) {
  const currentValue = formatHabitNumber(clampHabitValue(habit));
  const targetValue = formatHabitNumber(habit.targetValue);

  if (habit.unit === "h") {
    return `${currentValue}h / ${targetValue}h`;
  }

  return `${currentValue} / ${targetValue}${habit.unit ? ` ${habit.unit}` : ""}`;
}

function completedHabitDots(habit: DashboardHabit) {
  if (habit.targetValue <= 0 || habit.total <= 0) {
    return 0;
  }

  const currentValue = clampHabitValue(habit);

  if (currentValue <= 0) {
    return 0;
  }

  if (currentValue >= habit.targetValue) {
    return habit.total;
  }

  return Math.max(1, Math.ceil((currentValue / habit.targetValue) * habit.total));
}

function nextHabitCurrentValue(habit: DashboardHabit) {
  const targetValue = Math.max(habit.targetValue, 0);
  const stepValue = Math.max(habit.stepValue, 0.01);
  const currentValue = Math.min(Math.max(habit.currentValue, 0), targetValue);

  if (currentValue >= targetValue) {
    return Math.max(0, targetValue - stepValue);
  }

  return Math.min(targetValue, currentValue + stepValue);
}

function AddHabitDialog({
  activeWindow,
  onClose,
  onSave,
}: Readonly<{
  activeWindow: HabitTrackerWindow;
  onClose: () => void;
  onSave: (window: HabitTrackerWindow, habit: DashboardHabit) => void;
}>) {
  function saveHabit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim() || "New habit";
    const window = String(formData.get("window") ?? activeWindow) as HabitTrackerWindow;
    const target = String(formData.get("target") ?? "1").trim() || "1";
    const targetValue = parsePositiveNumber(target, 1);
    const unit = String(formData.get("unit") ?? "").trim();

    onSave(window, {
      id: habitIdFromName(name),
      marker: markerFromName(name),
      label: name,
      currentValue: 0,
      targetValue,
      unit: unit || undefined,
      stepValue: defaultStepValue(targetValue),
      total: 5,
      area: "health",
    });
    onClose();
  }

  return (
    <DashboardDialog
      labelledBy="add-habit-dialog-heading"
      onClose={onClose}
      open
    >
      <form onSubmit={saveHabit}>
        <div className="border-b border-[var(--border-subtle)] px-5 py-4">
          <h2
            className="text-lg font-semibold text-[var(--text-primary)]"
            id="add-habit-dialog-heading"
          >
            Add habit
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
            Local dashboard habit only. No habit log is written.
          </p>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          <TextField label="Name" name="name" placeholder="Habit name" />
          <SelectField defaultValue={activeWindow} label="Time of day" name="window">
            <option>Morning</option>
            <option>Midday</option>
            <option>Evening</option>
          </SelectField>
          <TextField defaultValue="1" label="Target" name="target" />
          <TextField label="Unit" name="unit" optional placeholder="min, ml, pages" />
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] px-5 py-4">
          <button
            className={dashboardActionButtonClass}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button className={dashboardPrimaryButtonClass} type="submit">
            Save
          </button>
        </div>
      </form>
    </DashboardDialog>
  );
}

export function HabitTrackers({
  data,
}: Readonly<{
  data: DashboardHabitTrackers;
}>) {
  const [activeWindow, setActiveWindow] =
    useState<HabitTrackerWindow>(data.activeWindow);
  const [habitsByWindow, setHabitsByWindow] = useState(() => ({
    Morning: [...data.habitsByWindow.Morning],
    Midday: [...data.habitsByWindow.Midday],
    Evening: [...data.habitsByWindow.Evening],
  }));
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const habits = habitsByWindow[activeWindow];

  function toggleHabit(habitId: string) {
    setHabitsByWindow((current) => ({
      ...current,
      [activeWindow]: current[activeWindow].map((habit) =>
        habit.id === habitId
          ? {
              ...habit,
              currentValue: nextHabitCurrentValue(habit),
            }
          : habit,
      ),
    }));
  }

  function addHabit(window: HabitTrackerWindow, habit: DashboardHabit) {
    setHabitsByWindow((current) => ({
      ...current,
      [window]: [habit, ...current[window]].slice(0, 7),
    }));
    setActiveWindow(window);
  }

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
      title={data.title}
      titleHref={data.href}
    >
      <div className="p-4 2xl:px-[24px] 2xl:pb-5 2xl:pt-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 2xl:grid-cols-[130px_130px_130px_130px] 2xl:gap-x-[14px] 2xl:gap-y-3">
          {habits.map((habit) => {
            const valueLabel = formatHabitValue(habit);
            const activeDots = completedHabitDots(habit);

            return (
              <button
                aria-label={`${habit.label}: ${valueLabel}. ${activeDots} of ${habit.total} active. Toggle progress.`}
                className={cn(
                  "min-h-[68px] rounded-[14px] border border-[rgba(155,124,246,.16)] bg-[color-mix(in_srgb,var(--accent-purple)_5%,#101a2a)] p-2.5 text-left transition hover:border-[rgba(155,124,246,.30)]",
                  DASHBOARD_LINK_FOCUS_CLASSES,
                )}
                key={habit.id}
                onClick={() => toggleHabit(habit.id)}
                type="button"
              >
                <div className="flex items-start gap-2.5">
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
              </button>
            );
          })}
          <button
            className={cn(
              "grid min-h-[68px] place-items-center rounded-[14px] border border-[rgba(155,124,246,.16)] bg-[color-mix(in_srgb,var(--accent-purple)_5%,#101a2a)] p-2.5 text-center transition hover:border-[rgba(155,124,246,.30)]",
              DASHBOARD_LINK_FOCUS_CLASSES,
            )}
            onClick={() => setAddDialogOpen(true)}
            type="button"
          >
            <div>
              <p className="text-lg font-semibold leading-none text-[var(--text-primary)]">+</p>
              <p className="mt-1.5 text-[10px] font-semibold text-[var(--text-primary)]">
                {data.addHabitLabel}
              </p>
              <p className="mt-0.5 text-[8px] font-semibold text-[var(--text-muted)]">
                {data.addHabitMeta}
              </p>
            </div>
          </button>
        </div>
      </div>
      {addDialogOpen ? (
        <AddHabitDialog
          activeWindow={activeWindow}
          onClose={() => setAddDialogOpen(false)}
          onSave={addHabit}
        />
      ) : null}
    </Panel>
  );
}
