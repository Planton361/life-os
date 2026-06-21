"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Pill, accentStyle } from "@/components/layout/route-page-primitives";
import { cn } from "@/lib/cn";
import type { CalendarRawTimedBlock } from "../calendar-view-model";
import {
  calendarBlockTypeLabels,
  type CalendarCreateBlockType,
  type CalendarSelectedTimeSlotViewModel,
  type SchedulableTaskViewModel,
} from "../calendar-types";

type CalendarCreateDefaults = Partial<CalendarSelectedTimeSlotViewModel>;
type ScheduleTab = "existing-task" | "new-item";
type SortMode =
  | "priority"
  | "due-date"
  | "shortest"
  | "longest"
  | "recently-updated";

type CalendarCreateProps = {
  defaults?: CalendarCreateDefaults;
  onCreateBlock: (block: CalendarRawTimedBlock) => void;
  resolveDayId: (date: string) => string;
  tasks: readonly SchedulableTaskViewModel[];
};

const typeOptions = [
  "event",
  "task_block",
  "focus_block",
  "routine",
  "meal",
  "review",
  "deadline",
] satisfies CalendarCreateBlockType[];

const inputClass =
  "mt-1 min-h-9 w-full rounded-[9px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.76)] px-3 text-[12px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--focus-ring)]";

const actionButtonClass =
  "min-h-8 rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.76)] px-3 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]";

const priorityRank = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
};

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

function addMinutes(time: string, minutesToAdd: number) {
  const minutes = timeToMinutes(time) + minutesToAdd;

  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function accentForType(type: CalendarCreateBlockType) {
  if (type === "event") return "var(--accent-green)";
  if (type === "task_block") return "var(--accent-blue)";
  if (type === "focus_block") return "var(--accent-cyan)";
  if (type === "routine") return "var(--accent-orange)";
  if (type === "deadline") return "var(--accent-red)";
  if (type === "meal") return "var(--accent-yellow)";
  return "var(--accent-cyan)";
}

function sourceForType(type: CalendarCreateBlockType): CalendarRawTimedBlock["source"] {
  if (type === "task_block") return "task";
  if (type === "meal") return "meal_planner";
  if (type === "review") return "review";
  if (type === "routine") return "routine";
  return "manual";
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
  onChange,
  optional,
  placeholder,
  type = "text",
  value,
}: Readonly<{
  label: string;
  onChange: (value: string) => void;
  optional?: boolean;
  placeholder?: string;
  type?: "text" | "date" | "time";
  value: string;
}>) {
  const id = useId();

  return (
    <label className="block min-w-0" htmlFor={id}>
      <FieldLabel label={label} optional={optional} />
      <input
        className={inputClass}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

function SelectField({
  children,
  label,
  onChange,
  value,
}: Readonly<{
  children: React.ReactNode;
  label: string;
  onChange: (value: string) => void;
  value: string;
}>) {
  const id = useId();

  return (
    <label className="block min-w-0" htmlFor={id}>
      <FieldLabel label={label} />
      <select
        className={inputClass}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
    </label>
  );
}

function buildBlock({
  area,
  date,
  dayId,
  endTime,
  id,
  priority,
  project,
  sourceHref,
  sourceLabel,
  startTime,
  status = "planned",
  taskId,
  title,
  type,
}: {
  area: string;
  date: string;
  dayId: string;
  endTime: string;
  id: string;
  priority?: CalendarRawTimedBlock["priority"];
  project?: string;
  sourceHref?: string;
  sourceLabel: string;
  startTime: string;
  status?: CalendarRawTimedBlock["status"];
  taskId?: string;
  title: string;
  type: CalendarCreateBlockType;
}): CalendarRawTimedBlock {
  return {
    id,
    dayId,
    date,
    title,
    type,
    status,
    source: sourceForType(type),
    area,
    sourceEntity: {
      type: type === "task_block" ? "task" : "free_event",
      label: sourceLabel,
      href: sourceHref,
    },
    accent: accentForType(type),
    meta: type === "task_block" ? "Scheduled existing task" : "Local calendar draft",
    linkedEntity: project,
    plannedOutcome: "Prepared from the Calendar scheduling flow.",
    priority,
    project,
    taskId,
    isFlexible: true,
    isLocked: false,
    startTime,
    endTime,
    startMinutes: timeToMinutes(startTime),
    endMinutes: timeToMinutes(endTime),
  };
}

export function CalendarCreateMenu({
  defaults = {},
  onCreateBlock,
  resolveDayId,
  tasks,
}: Readonly<CalendarCreateProps>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<ScheduleTab>("existing-task");
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("all");
  const [area, setArea] = useState("all");
  const [project, setProject] = useState("all");
  const [status, setStatus] = useState("all");
  const [duration, setDuration] = useState("all");
  const [dueDate, setDueDate] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("priority");
  const [selectedTaskId, setSelectedTaskId] = useState(tasks[0]?.id ?? "");
  const [date, setDate] = useState(defaults.date ?? "2026-06-12");
  const [startTime, setStartTime] = useState(defaults.startTime ?? "15:30");
  const [endTime, setEndTime] = useState(defaults.endTime ?? "17:00");
  const [blockType, setBlockType] =
    useState<CalendarCreateBlockType>("task_block");
  const [newType, setNewType] = useState<CalendarCreateBlockType>("event");
  const [newTitle, setNewTitle] = useState("");
  const [newArea, setNewArea] = useState("Coding");
  const [newProject, setNewProject] = useState("");
  const [newStatus, setNewStatus] = useState("planned");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const areas = useMemo(
    () => Array.from(new Set(tasks.map((task) => task.area))).sort(),
    [tasks],
  );
  const projects = useMemo(
    () => Array.from(new Set(tasks.map((task) => task.project))).sort(),
    [tasks],
  );

  const filteredTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const next = tasks.filter((task) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        `${task.title} ${task.area} ${task.project}`
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesPriority = priority === "all" || task.priority === priority;
      const matchesArea = area === "all" || task.area === area;
      const matchesProject = project === "all" || task.project === project;
      const matchesStatus = status === "all" || task.status === status;
      const matchesDuration =
        duration === "all" ||
        (duration === "short" && task.estimatedMinutes <= 30) ||
        (duration === "medium" &&
          task.estimatedMinutes > 30 &&
          task.estimatedMinutes <= 60) ||
        (duration === "long" && task.estimatedMinutes > 60);
      const matchesDueDate =
        dueDate === "all" ||
        (dueDate === "scheduled" && task.dueDate) ||
        (dueDate === "unscheduled" && !task.dueDate);

      return (
        matchesQuery &&
        matchesPriority &&
        matchesArea &&
        matchesProject &&
        matchesStatus &&
        matchesDuration &&
        matchesDueDate
      );
    });

    return next.sort((a, b) => {
      if (sortMode === "due-date") {
        return (a.dueDate ?? "9999-12-31").localeCompare(
          b.dueDate ?? "9999-12-31",
        );
      }

      if (sortMode === "shortest") {
        return a.estimatedMinutes - b.estimatedMinutes;
      }

      if (sortMode === "longest") {
        return b.estimatedMinutes - a.estimatedMinutes;
      }

      if (sortMode === "recently-updated") {
        return b.recentlyUpdated.localeCompare(a.recentlyUpdated);
      }

      return priorityRank[a.priority] - priorityRank[b.priority];
    });
  }, [
    area,
    dueDate,
    duration,
    priority,
    project,
    query,
    sortMode,
    status,
    tasks,
  ]);

  const selectedTask =
    tasks.find((task) => task.id === selectedTaskId) ?? filteredTasks[0] ?? tasks[0];

  function closeDialog() {
    setOpen(false);
    setNotice(null);
    setError(null);
  }

  function validateTime() {
    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      setError("End time must be after start time.");
      return false;
    }

    setError(null);
    return true;
  }

  function saveExistingTask() {
    if (!selectedTask || !validateTime()) {
      return;
    }

    onCreateBlock(
      buildBlock({
        area: selectedTask.area,
        date,
        dayId: resolveDayId(date),
        endTime,
        id: `scheduled-${selectedTask.id}-${Date.now()}`,
        priority: selectedTask.priority,
        project: selectedTask.project,
        sourceHref: "/tasks",
        sourceLabel: "Task / Scheduling Queue",
        startTime,
        status: "planned",
        taskId: selectedTask.id,
        title:
          blockType === "focus_block"
            ? `Focus Block: ${selectedTask.title}`
            : `Task Block: ${selectedTask.title}`,
        type: blockType,
      }),
    );
    setNotice("Task scheduled locally. No backend record was written.");
  }

  function saveNewItem() {
    if (!validateTime()) {
      return;
    }

    onCreateBlock(
      buildBlock({
        area: newArea,
        date,
        dayId: resolveDayId(date),
        endTime,
        id: `calendar-draft-${Date.now()}`,
        project: newProject || undefined,
        sourceLabel: "Manual calendar draft",
        startTime,
        status: newStatus as CalendarRawTimedBlock["status"],
        title:
          newTitle.trim() ||
          `${calendarBlockTypeLabels[newType]} · ${date} ${startTime}`,
        type: newType,
      }),
    );
    setNotice("New item added to the local calendar mock state.");
  }

  return (
    <>
      <button
        className="min-h-8 rounded-full border border-[rgba(95,200,215,.28)] bg-[rgba(95,200,215,.14)] px-3 text-[11px] font-semibold text-[var(--text-primary)] transition hover:border-[rgba(95,200,215,.42)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        onClick={() => setOpen(true)}
        type="button"
      >
        + New
      </button>

      <dialog
        aria-labelledby="calendar-schedule-dialog-heading"
        className="w-[min(980px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] overflow-hidden rounded-[18px] border border-[var(--border-default)] bg-[var(--surface-1)] p-0 text-left text-[var(--text-primary)] shadow-[0_24px_80px_rgba(0,0,0,.48)] backdrop:bg-[rgba(0,0,0,.58)]"
        onCancel={(event) => {
          event.preventDefault();
          closeDialog();
        }}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            closeDialog();
          }
        }}
        ref={dialogRef}
      >
        <div className="flex max-h-[calc(100dvh-24px)] flex-col">
          <div className="border-b border-[var(--border-subtle)] bg-[rgba(14,23,38,.92)] px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-cyan)]">
                  Calendar scheduling
                </p>
                <h2
                  className="mt-1 text-[18px] font-semibold leading-6 text-[var(--text-primary)]"
                  id="calendar-schedule-dialog-heading"
                >
                  Schedule something
                </h2>
                <p className="mt-1 max-w-2xl text-[11px] leading-4 text-[var(--text-muted)]">
                  Existing tasks and new calendar items are added to local mock
                  state only.
                </p>
              </div>
              <button
                aria-label="Close scheduling dialog"
                className="size-8 shrink-0 rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.82)] text-[15px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                onClick={closeDialog}
                type="button"
              >
                x
              </button>
            </div>

            <div className="mt-3 flex w-full max-w-[360px] rounded-full border border-[var(--border-subtle)] bg-[rgba(11,17,28,.72)] p-1">
              {[
                ["existing-task", "Existing task"],
                ["new-item", "New item"],
              ].map(([value, label]) => (
                <button
                  aria-pressed={tab === value}
                  className={cn(
                    "min-h-7 flex-1 rounded-full px-3 text-[10px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
                    tab === value
                      ? "border border-[rgba(95,200,215,.28)] bg-[rgba(95,200,215,.16)] text-[var(--text-primary)]"
                      : "border border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                  )}
                  key={value}
                  onClick={() => setTab(value as ScheduleTab)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid min-h-0 gap-3 overflow-y-auto p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            {tab === "existing-task" ? (
              <div className="min-w-0">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <TextField
                    label="Search"
                    onChange={setQuery}
                    placeholder="Task, area or project"
                    value={query}
                  />
                  <SelectField label="Priority" onChange={setPriority} value={priority}>
                    <option value="all">All priorities</option>
                    {["P0", "P1", "P2", "P3"].map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField label="Area" onChange={setArea} value={area}>
                    <option value="all">All areas</option>
                    {areas.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField label="Project" onChange={setProject} value={project}>
                    <option value="all">All projects</option>
                    {projects.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField label="Status" onChange={setStatus} value={status}>
                    <option value="all">All statuses</option>
                    {["open", "planned", "in-progress", "done"].map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField
                    label="Duration"
                    onChange={setDuration}
                    value={duration}
                  >
                    <option value="all">Any duration</option>
                    <option value="short">30 min or less</option>
                    <option value="medium">31-60 min</option>
                    <option value="long">Over 60 min</option>
                  </SelectField>
                  <SelectField label="Due date" onChange={setDueDate} value={dueDate}>
                    <option value="all">Any due date</option>
                    <option value="scheduled">Has due date</option>
                    <option value="unscheduled">No due date</option>
                  </SelectField>
                  <SelectField
                    label="Sort"
                    onChange={(value) => setSortMode(value as SortMode)}
                    value={sortMode}
                  >
                    <option value="priority">Priority</option>
                    <option value="due-date">Due date</option>
                    <option value="shortest">Shortest first</option>
                    <option value="longest">Longest first</option>
                    <option value="recently-updated">Recently updated</option>
                  </SelectField>
                </div>

                <div className="mt-3 grid gap-2">
                  {filteredTasks.length > 0 ? (
                    filteredTasks.map((task) => (
                      <button
                        aria-pressed={selectedTask?.id === task.id}
                        className={cn(
                          "rounded-[10px] border bg-[rgba(18,28,43,.54)] px-3 py-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
                          selectedTask?.id === task.id
                            ? "border-[color-mix(in_srgb,var(--accent)_48%,transparent)]"
                            : "border-[var(--border-subtle)] hover:border-[var(--border-default)]",
                        )}
                        key={task.id}
                        onClick={() => {
                          setSelectedTaskId(task.id);
                          setEndTime(addMinutes(startTime, task.estimatedMinutes));
                        }}
                        style={accentStyle(task.accent)}
                        type="button"
                      >
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-semibold text-[var(--text-primary)]">
                              {task.title}
                            </p>
                            <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
                              {task.priority} · {task.estimatedMinutes} min ·{" "}
                              {task.area} / {task.project}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <Pill accent={task.accent}>{task.status}</Pill>
                            {task.alreadyScheduled ? (
                              <span className="text-[9px] font-semibold text-[var(--text-faint)]">
                                already scheduled
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <p className="mt-1 text-[10px] leading-4 text-[var(--text-secondary)]">
                          Due {task.dueDate ?? "not set"} · updated{" "}
                          {task.recentlyUpdated}
                        </p>
                      </button>
                    ))
                  ) : (
                    <p className="rounded-[10px] border border-dashed border-[var(--border-default)] bg-[rgba(168,183,204,.05)] px-3 py-3 text-[11px] text-[var(--text-muted)]">
                      No tasks match the selected filters.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <SelectField
                  label="Type"
                  onChange={(value) => setNewType(value as CalendarCreateBlockType)}
                  value={newType}
                >
                  {typeOptions.map((type) => (
                    <option key={type} value={type}>
                      {calendarBlockTypeLabels[type]}
                    </option>
                  ))}
                </SelectField>
                <TextField
                  label="Title"
                  onChange={setNewTitle}
                  placeholder="Team sync"
                  value={newTitle}
                />
                <TextField label="Area / label" onChange={setNewArea} value={newArea} />
                <TextField
                  label="Project"
                  onChange={setNewProject}
                  optional
                  placeholder="Life OS App"
                  value={newProject}
                />
                <SelectField label="Status" onChange={setNewStatus} value={newStatus}>
                  <option value="planned">planned</option>
                  <option value="draft">draft</option>
                </SelectField>
              </div>
            )}

            <aside className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.42)] p-3">
              <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">
                Time planning
              </h3>
              <div className="mt-3 grid gap-3">
                <TextField label="Date" onChange={setDate} type="date" value={date} />
                <TextField
                  label="Start time"
                  onChange={setStartTime}
                  type="time"
                  value={startTime}
                />
                <TextField
                  label="End time"
                  onChange={setEndTime}
                  type="time"
                  value={endTime}
                />
                {tab === "existing-task" ? (
                  <SelectField
                    label="Block type"
                    onChange={(value) =>
                      setBlockType(value as CalendarCreateBlockType)
                    }
                    value={blockType}
                  >
                    <option value="task_block">Task Block</option>
                    <option value="focus_block">Focus Block</option>
                  </SelectField>
                ) : null}
              </div>
              <div className="mt-3 rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] px-3 py-2 text-[10px] leading-4 text-[var(--text-muted)]">
                <p className="font-semibold text-[var(--text-secondary)]">
                  Suggested slots
                </p>
                <p>Stub only: Thu 15:30-17:00, Fri 09:00-10:00.</p>
              </div>
              {error ? (
                <p
                  className="mt-3 rounded-[10px] border border-[rgba(221,107,95,.24)] bg-[rgba(221,107,95,.08)] px-3 py-2 text-[11px] text-[var(--text-secondary)]"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}
              {notice ? (
                <p
                  className="mt-3 rounded-[10px] border border-[rgba(95,200,215,.22)] bg-[rgba(95,200,215,.08)] px-3 py-2 text-[11px] text-[var(--text-secondary)]"
                  role="status"
                >
                  {notice}
                </p>
              ) : null}
            </aside>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] bg-[rgba(11,17,28,.58)] px-4 py-3">
            <p className="max-w-md text-[10px] leading-4 text-[var(--text-faint)]">
              Phase 2 UI only. No calendar sync, automation or Supabase write is
              performed.
            </p>
            <div className="flex flex-wrap gap-2">
              <button className={actionButtonClass} onClick={closeDialog} type="button">
                Cancel
              </button>
              <button
                className="min-h-8 rounded-full border border-[rgba(95,200,215,.34)] bg-[rgba(95,200,215,.16)] px-3 text-[10px] font-semibold text-[var(--text-primary)] transition hover:border-[rgba(95,200,215,.48)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                onClick={tab === "existing-task" ? saveExistingTask : saveNewItem}
                type="button"
              >
                Save to mock calendar
              </button>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}

export function CalendarCreateActionButtons({
  defaults,
  onCreateBlock,
  resolveDayId,
  tasks,
}: Readonly<
  CalendarCreateProps & {
    defaults: CalendarSelectedTimeSlotViewModel;
  }
>) {
  return (
    <CalendarCreateMenu
      defaults={defaults}
      onCreateBlock={onCreateBlock}
      resolveDayId={resolveDayId}
      tasks={tasks}
    />
  );
}
