"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  DashboardHabit,
  DashboardHabitTrackers,
  DashboardProfileId,
  HabitTrackerWindow,
} from "@/features/dashboard";
import {
  formatHabitNumber,
  habitSteps,
} from "@/features/dashboard/habit-progress";
import {
  createDashboardHabitAction,
  incrementHabitAction,
  undoHabitAction,
} from "@/features/real-data/actions/habit.actions";
import { useToast } from "@/components/feedback/toast-provider";
import { Panel, contentStateAttrs } from "./section-primitives";
import {
  DashboardDialog,
  SelectField,
  dashboardActionButtonClass,
  dashboardPrimaryButtonClass,
} from "./dashboard-dialog";

function formatHabitValue(habit: DashboardHabit) {
  return `${formatHabitNumber(habit.currentValue)} / ${habit.targetValue === null ? "—" : formatHabitNumber(habit.targetValue)}${habit.unit ? ` ${habit.unit}` : ""}`;
}
function HabitSaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className={dashboardPrimaryButtonClass}
      type="submit"
    >
      {pending ? "Speichert…" : "Save"}
    </button>
  );
}
function AddHabitDialog({
  activeWindow,
  onClose,
}: {
  activeWindow: HabitTrackerWindow;
  onClose: () => void;
}) {
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>(
    {},
  );
  const [error, setError] = useState("");
  const { notify } = useToast();
  const router = useRouter();
  return (
    <DashboardDialog
      labelledBy="add-habit-dialog-heading"
      onClose={onClose}
      open
    >
      <form
        action={async (formData) => {
          const result = await createDashboardHabitAction(formData);
          if (!result.ok) {
            setErrors(result.errors);
            setError(result.error);
            return;
          }
          notify("Habit gespeichert.");
          onClose();
          router.refresh();
        }}
      >
        <input name="returnTo" type="hidden" value="/dashboard" />
        <input name="dashboardWindow" type="hidden" value={activeWindow} />
        <h2
          id="add-habit-dialog-heading"
          className="border-b border-[var(--border-subtle)] p-5 text-lg font-semibold"
        >
          Add habit
        </h2>
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          {[
            ["name", "Name", ""],
            ["dailyTarget", "Target", "1"],
            ["unit", "Unit", ""],
            ["defaultIncrement", "Increment", "1"],
          ].map(([name, label, initial]) => (
            <label key={name} className="text-xs">
              {label}
              <input
                name={name}
                defaultValue={initial}
                aria-invalid={!!errors[name]}
                aria-describedby={
                  errors[name] ? `habit-${name}-error` : undefined
                }
                className="mt-1 block min-h-9 w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-2)] px-3"
              />
              {errors[name] && (
                <p
                  id={`habit-${name}-error`}
                  className="mt-1 text-[var(--accent-red)]"
                >
                  {errors[name]?.join(" ")}
                </p>
              )}
            </label>
          ))}
          <SelectField
            defaultValue={activeWindow}
            label="Time of day"
            name="window"
          >
            <option>Morning</option>
            <option>Midday</option>
            <option>Evening</option>
          </SelectField>
          {error && (
            <p role="alert" className="text-xs text-[var(--accent-red)]">
              {error}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] p-4">
          <button
            className={dashboardActionButtonClass}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <HabitSaveButton />
        </div>
      </form>
    </DashboardDialog>
  );
}
function HabitIncrementButton({
  habit,
  manual,
}: {
  habit: DashboardHabit;
  manual: boolean;
}) {
  const { pending } = useFormStatus();
  const steps = habitSteps(
    habit.currentValue,
    habit.targetValue,
    habit.stepValue,
  );
  return (
    <button
      type="submit"
      disabled={!manual || pending || steps.reached}
      aria-label={`${habit.label} erhöhen`}
      className="habit-increment h-full w-full rounded-[14px] p-3 text-left disabled:cursor-default"
    >
      <span
        className="block truncate text-[11px] font-semibold"
        title={habit.label}
      >
        {habit.label}
      </span>
      <span className="mt-1 block text-xs">{formatHabitValue(habit)}</span>
      <span
        className="mt-3 flex flex-wrap gap-1"
        aria-label={`${steps.completed} / ${steps.total} Schritte`}
      >
        {Array.from({ length: steps.dots }, (_, index) => (
          <span
            key={index}
            className={`size-1.5 rounded-full ${index < steps.filled ? "bg-[var(--accent-purple)]" : "bg-[var(--border-default)]"}`}
          />
        ))}
      </span>
    </button>
  );
}
export function HabitTrackers({
  data,
  profileId,
}: Readonly<{ data: DashboardHabitTrackers; profileId: DashboardProfileId }>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeWindow =
    data.windows.find((window) => window === searchParams.get("habitWindow")) ??
    data.activeWindow;
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const habits = data.habitsByWindow[activeWindow].slice(0, 8);
  const windowSwitch = (
    <div className="flex w-[270px] max-w-full rounded-full border border-[var(--border-subtle)] bg-[#0c1422] p-0.5 text-center text-[10px]">
      {data.windows.map((window) => (
        <button
          key={window}
          type="button"
          aria-pressed={window === activeWindow}
          className={`flex-1 rounded-full px-3 py-1 ${window === activeWindow ? "bg-[rgba(155,124,246,.12)]" : ""}`}
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            for (const key of ["habit", "habitUpdate", "health", "healthUpdate"]) params.delete(key);
            params.set("habitWindow", window);
            router.replace(`/dashboard?${params}`, { scroll: false });
          }}
        >
          {window}
        </button>
      ))}
    </div>
  );
  return (
    <Panel
      title={data.title}
      titleHref={data.href}
      headerAccessory={windowSwitch}
      className="dashboard-habits border-[rgba(155,124,246,.16)] bg-[color-mix(in_srgb,var(--accent-purple)_5%,#101827)]"
      stateAttrs={contentStateAttrs(
        {
          capacity: 8,
          itemCount: habits.length,
          state: habits.length
            ? habits.length === 8
              ? "filled"
              : "partial"
            : "empty",
        },
        profileId,
      )}
    >
      <div className="p-3" data-dashboard-section="habit-tracker">
        <div className="habit-slots grid grid-cols-2 gap-3 min-[1800px]:grid-cols-4">
          {habits.map((habit) => (
            <article
              key={habit.id}
              aria-label={`${habit.label}: ${formatHabitValue(habit)}`}
              className="relative min-w-0 rounded-[14px] border border-[rgba(155,124,246,.16)] bg-[color-mix(in_srgb,var(--accent-purple)_5%,#101a2a)]"
            >
              <form action={incrementHabitAction} className="h-full">
                <input name="habitId" type="hidden" value={habit.id} />
                <input name="returnTo" type="hidden" value="/dashboard" />
                <input
                  name="dashboardWindow"
                  type="hidden"
                  value={activeWindow}
                />
                <HabitIncrementButton
                  habit={habit}
                  manual={profileId === "manual"}
                />
              </form>
              {profileId === "manual" && habit.currentValue > 0 && (
                <form
                  action={undoHabitAction}
                  className="absolute bottom-1 right-1"
                >
                  <input name="habitId" type="hidden" value={habit.id} />
                  <input name="returnTo" type="hidden" value="/dashboard" />
                  <input
                    name="dashboardWindow"
                    type="hidden"
                    value={activeWindow}
                  />
                  <button
                    aria-label={`${habit.label}: Letzten Eintrag rückgängig machen`}
                    title="Letzten Eintrag rückgängig machen"
                    type="submit"
                    className="grid size-6 place-items-center rounded-full text-[var(--text-muted)]"
                  >
                    ↶
                  </button>
                </form>
              )}
            </article>
          ))}
          {Array.from({ length: 8 - habits.length }, (_, index) => (
            <div
              data-habit-placeholder
              key={index}
              className="grid min-h-[100px] place-items-center rounded-[14px] border border-dashed border-[var(--border-subtle)] text-center text-[10px] text-[var(--text-muted)]"
            >
              {profileId === "manual" && index === 0 ? (
                <button
                  className="h-full w-full rounded-[14px]"
                  onClick={() => setAddDialogOpen(true)}
                  type="button"
                >
                  + {data.addHabitLabel}
                </button>
              ) : (
                "Freier Habit-Platz"
              )}
            </div>
          ))}
        </div>
      </div>
      {profileId === "manual" && addDialogOpen && (
        <AddHabitDialog
          activeWindow={activeWindow}
          onClose={() => setAddDialogOpen(false)}
        />
      )}
    </Panel>
  );
}
