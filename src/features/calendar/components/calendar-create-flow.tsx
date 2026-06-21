"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Pill, accentStyle } from "@/components/layout/route-page-primitives";
import { cn } from "@/lib/cn";
import {
  calendarBlockTypeLabels,
  type CalendarCreateBlockType,
  type CalendarSelectedTimeSlotViewModel,
} from "../calendar-types";

type CalendarCreateOption = {
  type: CalendarCreateBlockType;
  label: string;
  microcopy: string;
  accent: string;
};

type CalendarCreateDefaults = Partial<CalendarSelectedTimeSlotViewModel>;

const CREATE_OPTIONS = [
  {
    type: "event",
    label: "Event",
    microcopy: "fixed appointment",
    accent: "var(--accent-green)",
  },
  {
    type: "task_block",
    label: "Task Block",
    microcopy: "schedule an existing task",
    accent: "var(--accent-blue)",
  },
  {
    type: "focus_block",
    label: "Focus Block",
    microcopy: "reserve deep work time",
    accent: "var(--accent-cyan)",
  },
  {
    type: "batch_block",
    label: "Batch Block",
    microcopy: "group small tasks",
    accent: "var(--accent-purple)",
  },
  {
    type: "routine",
    label: "Routine",
    microcopy: "recurring ritual",
    accent: "var(--accent-orange)",
  },
  {
    type: "deadline",
    label: "Deadline",
    microcopy: "due date marker",
    accent: "var(--accent-red)",
  },
  {
    type: "reminder",
    label: "Reminder",
    microcopy: "soft nudge",
    accent: "var(--accent-yellow)",
  },
] satisfies CalendarCreateOption[];

const inputClass =
  "mt-1 min-h-9 w-full rounded-[9px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.76)] px-3 text-[12px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--focus-ring)]";

const actionButtonClass =
  "min-h-8 rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.76)] px-3 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]";

function optionFor(type: CalendarCreateBlockType) {
  return CREATE_OPTIONS.find((option) => option.type === type) ?? CREATE_OPTIONS[0];
}

function FieldLabel({
  label,
  optional,
}: Readonly<{
  label: string;
  optional?: boolean;
}>) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
      {label}
      {optional ? (
        <span className="normal-case tracking-normal text-[var(--text-faint)]">
          {" "}
          optional
        </span>
      ) : null}
    </span>
  );
}

function TextField({
  label,
  optional,
  type = "text",
  defaultValue,
  placeholder,
}: Readonly<{
  label: string;
  optional?: boolean;
  type?: "text" | "date" | "time" | "number" | "url";
  defaultValue?: string;
  placeholder?: string;
}>) {
  const id = useId();

  return (
    <label className="block min-w-0" htmlFor={id}>
      <FieldLabel label={label} optional={optional} />
      <input
        className={inputClass}
        defaultValue={defaultValue}
        id={id}
        placeholder={placeholder}
        type={type}
      />
    </label>
  );
}

function TextAreaField({
  label,
  optional,
  placeholder,
}: Readonly<{
  label: string;
  optional?: boolean;
  placeholder?: string;
}>) {
  const id = useId();

  return (
    <label className="block min-w-0" htmlFor={id}>
      <FieldLabel label={label} optional={optional} />
      <textarea
        className={cn(inputClass, "min-h-[76px] resize-none py-2 leading-5")}
        id={id}
        placeholder={placeholder}
        rows={3}
      />
    </label>
  );
}

function SelectField({
  label,
  optional,
  options,
  defaultValue,
}: Readonly<{
  label: string;
  optional?: boolean;
  options: string[];
  defaultValue?: string;
}>) {
  const id = useId();

  return (
    <label className="block min-w-0" htmlFor={id}>
      <FieldLabel label={label} optional={optional} />
      <select className={inputClass} defaultValue={defaultValue ?? ""} id={id}>
        {optional ? <option value="">Not set</option> : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ActiveDaysField() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <fieldset className="min-w-0">
      <legend>
        <FieldLabel label="Active days" />
      </legend>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {days.map((day) => {
          const id = `routine-day-${day.toLowerCase()}`;

          return (
            <label
              className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.64)] px-2.5 text-[10px] font-semibold text-[var(--text-secondary)]"
              htmlFor={id}
              key={day}
            >
              <input
                className="size-3 accent-[var(--accent-cyan)]"
                defaultChecked={["Mon", "Tue", "Wed", "Thu", "Fri"].includes(day)}
                id={id}
                type="checkbox"
              />
              {day}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function DateTimeFields({
  defaults,
}: Readonly<{
  defaults: CalendarCreateDefaults;
}>) {
  return (
    <>
      <TextField
        defaultValue={defaults.date ?? "2026-06-12"}
        label="Date"
        type="date"
      />
      <TextField
        defaultValue={defaults.startTime ?? "15:30"}
        label="Start time"
        type="time"
      />
      <TextField
        defaultValue={defaults.endTime ?? "17:00"}
        label="End time"
        type="time"
      />
    </>
  );
}

function CreateFields({
  type,
  defaults,
}: Readonly<{
  type: CalendarCreateBlockType;
  defaults: CalendarCreateDefaults;
}>) {
  if (type === "event") {
    return (
      <>
        <TextField label="Title" placeholder="Team sync" />
        <DateTimeFields defaults={defaults} />
        <SelectField
          label="Area"
          options={["Work", "Education", "Coding", "Health", "Personal"]}
        />
        <TextField label="Location / link" optional placeholder="Room or URL" />
        <TextAreaField label="Notes" optional placeholder="Context for the appointment" />
        <SelectField
          label="Repeat"
          optional
          options={["Does not repeat", "Daily", "Weekly", "Weekdays", "Custom"]}
        />
      </>
    );
  }

  if (type === "task_block") {
    return (
      <>
        <SelectField
          label="Linked task"
          options={[
            "Literaturstruktur uberarbeiten",
            "Run lint and TypeScript checks",
            "Prepare static review route copy",
          ]}
        />
        <DateTimeFields defaults={defaults} />
        <SelectField label="Priority" optional options={["P1", "P2", "P3", "none"]} />
        <SelectField
          label="Energy fit"
          optional
          options={["Deep work", "Medium", "Low", "Any"]}
        />
        <TextAreaField
          label="Planned outcome"
          optional
          placeholder="What should be true after this block?"
        />
      </>
    );
  }

  if (type === "focus_block") {
    return (
      <>
        <TextField label="Title" placeholder="Deep Work: Masterarbeit" />
        <SelectField
          label="Area"
          options={["Education", "Coding", "Work", "Personal"]}
        />
        <SelectField
          label="Project"
          optional
          options={["Masterarbeit", "Life OS App", "Java Learning"]}
        />
        <SelectField
          label="Goal"
          optional
          options={["Thesis progress", "V5 implementation", "Skill practice"]}
        />
        <DateTimeFields defaults={defaults} />
        <TextAreaField
          label="Intended outcome"
          placeholder="Define the useful output for this focus window."
        />
      </>
    );
  }

  if (type === "batch_block") {
    return (
      <>
        <TextField label="Title" placeholder="Batch Block: Admin Cleanup" />
        <DateTimeFields defaults={defaults} />
        <TextAreaField
          label="Included tasks"
          placeholder="List the small tasks grouped into this time window."
        />
        <TextField label="Max task count" optional placeholder="5" type="number" />
        <TextAreaField
          label="Batch goal"
          placeholder="A batch block groups several small items into one planned time window."
        />
      </>
    );
  }

  if (type === "routine") {
    return (
      <>
        <TextField label="Title" placeholder="Routine: Morning Briefing" />
        <TextField label="Ritual type" optional placeholder="Startup / shutdown" />
        <TextField
          defaultValue={defaults.startTime ?? "07:30"}
          label="Start time"
          type="time"
        />
        <TextField
          defaultValue={defaults.endTime ?? "07:50"}
          label="End time"
          type="time"
        />
        <SelectField
          defaultValue="Weekdays"
          label="Repeat"
          options={["Daily", "Weekly", "Weekdays", "Custom days"]}
        />
        <ActiveDaysField />
        <TextField label="End date" optional type="date" />
      </>
    );
  }

  if (type === "deadline") {
    return (
      <>
        <TextField label="Title" placeholder="Literature source deadline" />
        <TextField
          defaultValue={defaults.date ?? "2026-06-12"}
          label="Due date"
          type="date"
        />
        <TextField
          defaultValue={defaults.startTime}
          label="Due time"
          optional
          type="time"
        />
        <SelectField
          label="Linked project/task/goal"
          optional
          options={["Masterarbeit", "Literature source task", "Thesis progress goal"]}
        />
        <SelectField
          label="Warning window"
          optional
          options={["Same day", "1 day before", "3 days before", "1 week before"]}
        />
      </>
    );
  }

  return (
    <>
      <TextField label="Title" placeholder="Reminder: Send source list" />
      <TextField
        defaultValue={defaults.date ?? "2026-06-12"}
        label="Date"
        type="date"
      />
      <TextField
        defaultValue={defaults.startTime}
        label="Time"
        optional
        type="time"
      />
      <SelectField
        label="Area"
        optional
        options={["Education", "Work", "Coding", "Health", "Personal"]}
      />
      <TextAreaField label="Notes" optional placeholder="Soft context for the nudge." />
    </>
  );
}

function CalendarCreateDialog({
  activeType,
  defaults,
  onClose,
}: Readonly<{
  activeType: CalendarCreateBlockType | null;
  defaults: CalendarCreateDefaults;
  onClose: () => void;
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const activeOption = activeType ? optionFor(activeType) : null;

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (activeType && !dialog.open) {
      dialog.showModal();
    }

    if (!activeType && dialog.open) {
      dialog.close();
    }
  }, [activeType]);

  function closeDialog() {
    setDraftNotice(null);
    onClose();
  }

  return (
    <dialog
      aria-labelledby="calendar-create-dialog-heading"
      className="w-[min(720px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] overflow-hidden rounded-[18px] border border-[var(--border-default)] bg-[var(--surface-1)] p-0 text-left text-[var(--text-primary)] shadow-[0_24px_80px_rgba(0,0,0,.48)] backdrop:bg-[rgba(0,0,0,.58)]"
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
      onClose={() => {
        setDraftNotice(null);
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeDialog();
        }
      }}
      ref={dialogRef}
    >
      {activeOption ? (
        <div className="flex max-h-[calc(100dvh-24px)] flex-col">
          <div
            className="border-b border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--accent)_7%,rgba(14,23,38,.92))] px-4 py-3"
            style={accentStyle(activeOption.accent)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                  Create calendar block
                </p>
                <h2
                  className="mt-1 text-[18px] font-semibold leading-6 text-[var(--text-primary)]"
                  id="calendar-create-dialog-heading"
                >
                  {activeOption.label}
                </h2>
                <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
                  {activeOption.microcopy}. Calendar prepares time; source
                  entities stay in Tasks, Projects, Goals or domain pages.
                </p>
              </div>
              <button
                aria-label="Close create panel"
                className="size-8 shrink-0 rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.82)] text-[15px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                onClick={closeDialog}
                type="button"
              >
                x
              </button>
            </div>
            {defaults.dayLabel ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Pill accent={activeOption.accent}>{defaults.dayLabel}</Pill>
                <Pill quiet>
                  {defaults.startTime ?? "15:30"}-{defaults.endTime ?? "17:00"}
                </Pill>
              </div>
            ) : null}
          </div>

          <div className="overflow-y-auto px-4 py-3">
            {activeOption.type === "batch_block" ? (
              <p className="mb-3 rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.58)] px-3 py-2 text-[11px] leading-4 text-[var(--text-muted)]">
                A batch block groups several small items into one planned time window.
              </p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <CreateFields defaults={defaults} type={activeOption.type} />
            </div>
            {draftNotice ? (
              <p
                className="mt-3 rounded-[10px] border border-[rgba(95,200,215,.22)] bg-[rgba(95,200,215,.08)] px-3 py-2 text-[11px] leading-4 text-[var(--text-secondary)]"
                role="status"
              >
                {draftNotice}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] bg-[rgba(11,17,28,.58)] px-4 py-3">
            <p className="max-w-md text-[10px] leading-4 text-[var(--text-faint)]">
              Phase 2 UI only. This prepares a draft shape and does not save to
              Supabase, sync calendars or mutate Tasks.
            </p>
            <div className="flex flex-wrap gap-2">
              <button className={actionButtonClass} onClick={closeDialog} type="button">
                Cancel
              </button>
              <button
                className="min-h-8 rounded-full border border-[color-mix(in_srgb,var(--accent)_34%,transparent)] bg-[color-mix(in_srgb,var(--accent)_16%,rgba(18,28,43,.86))] px-3 text-[10px] font-semibold text-[var(--text-primary)] transition hover:border-[color-mix(in_srgb,var(--accent)_52%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                onClick={() => {
                  setDraftNotice(
                    `${activeOption.label} draft prepared locally. No calendar record was saved.`,
                  );
                }}
                style={accentStyle(activeOption.accent)}
                type="button"
              >
                Prepare draft
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}

export function CalendarCreateMenu({
  defaults = {},
}: Readonly<{
  defaults?: CalendarCreateDefaults;
}>) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeType, setActiveType] = useState<CalendarCreateBlockType | null>(
    null,
  );
  const menuId = useId();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function openType(type: CalendarCreateBlockType) {
    setMenuOpen(false);
    setActiveType(type);
  }

  return (
    <div className="relative">
      <button
        aria-controls={menuOpen ? menuId : undefined}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        className="min-h-8 rounded-full border border-[rgba(95,200,215,.28)] bg-[rgba(95,200,215,.14)] px-3 text-[11px] font-semibold text-[var(--text-primary)] transition hover:border-[rgba(95,200,215,.42)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        onClick={() => setMenuOpen((open) => !open)}
        type="button"
      >
        + New
      </button>

      {menuOpen ? (
        <div
          className="absolute right-0 z-20 mt-2 w-[min(320px,calc(100vw-32px))] overflow-hidden rounded-[14px] border border-[var(--border-default)] bg-[rgba(15,23,36,.98)] p-1.5 shadow-[0_18px_48px_rgba(0,0,0,.38)]"
          id={menuId}
          role="menu"
        >
          {CREATE_OPTIONS.map((option) => (
            <button
              className="grid w-full rounded-[10px] px-3 py-2 text-left transition hover:bg-[rgba(168,183,204,.07)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              key={option.type}
              onClick={() => openType(option.type)}
              role="menuitem"
              style={accentStyle(option.accent)}
              type="button"
            >
              <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                {option.label}
              </span>
              <span className="mt-0.5 text-[10px] leading-4 text-[var(--text-muted)]">
                {option.microcopy}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <CalendarCreateDialog
        activeType={activeType}
        defaults={defaults}
        onClose={() => setActiveType(null)}
      />
    </div>
  );
}

export function CalendarCreateActionButtons({
  defaults,
  types,
}: Readonly<{
  defaults: CalendarSelectedTimeSlotViewModel;
  types: CalendarCreateBlockType[];
}>) {
  const [activeType, setActiveType] = useState<CalendarCreateBlockType | null>(
    null,
  );

  return (
    <>
      <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        {types.map((type) => {
          const option = optionFor(type);

          return (
            <button
              className="min-h-8 rounded-full border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,rgba(18,28,43,.74))] px-3 text-left text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[color-mix(in_srgb,var(--accent)_48%,transparent)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              key={type}
              onClick={() => setActiveType(type)}
              style={accentStyle(option.accent)}
              type="button"
            >
              + {calendarBlockTypeLabels[type]}
            </button>
          );
        })}
      </div>
      <CalendarCreateDialog
        activeType={activeType}
        defaults={defaults}
        onClose={() => setActiveType(null)}
      />
    </>
  );
}
