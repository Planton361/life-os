"use client";

import type { CSSProperties, ReactNode } from "react";
import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import type { ContentStateMeta } from "@/features/content-state";
import {
  getInboxCaptureTypeLabel,
  getInboxStageLabel,
  type InboxAISuggestion,
  type InboxChecklistItem,
  type InboxClarificationField,
  type InboxExistingTargetType,
  type InboxOutcomeRoute,
  type InboxOutcomeOption,
  type InboxPlanningSignal,
  type InboxQueueItem,
  type InboxRelatedContextItem,
  type InboxSignal,
  type InboxViewModel,
} from "@/features/inbox";
import {
  archiveInboxItemFormStateAction,
  captureInboxItemFormAction,
  type InboxArchiveActionResult,
  triageInboxItemToTaskFormAction,
} from "@/features/real-data/actions/inbox.actions";
import { cn } from "@/lib/cn";

type AccentStyle = CSSProperties & {
  "--accent"?: string;
};

function accentStyle(accent: string): AccentStyle {
  return {
    "--accent": accent,
  };
}

const panelClasses =
  "overflow-hidden rounded-[22px] border border-[var(--border-default)] bg-[rgba(15,23,36,.96)] shadow-[0_8px_22px_rgba(0,0,0,.12)]";

const panelHeaderClasses =
  "border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.72)] px-4 py-3";

const focusClasses =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-cyan)]";

const disabledActionClasses =
  "disabled:cursor-not-allowed disabled:border-[var(--border-subtle)] disabled:bg-[rgba(18,28,43,.42)] disabled:text-[var(--text-muted)] disabled:opacity-70";

const draftInputClasses =
  "mt-1.5 w-full rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(12,20,34,.74)] px-3 py-2 text-xs leading-5 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]";

const taskDraftPriorities = ["P0", "P1", "P2", "P3", "none"] as const;
const taskDraftEnergies = ["low", "medium", "high"] as const;
const taskDraftDurations = [15, 30, 45, 60, 90, 120] as const;

const planningSignalDefinitions = [
  { label: "Priority", savedInTaskDraft: true },
  { label: "Energy", savedInTaskDraft: true },
  { label: "Effort / Duration", savedInTaskDraft: true },
  { label: "Area", savedInTaskDraft: true },
  { label: "Review needed", savedInTaskDraft: false },
  { label: "Today candidate", savedInTaskDraft: true },
  { label: "Deadline hint", savedInTaskDraft: false },
  { label: "Recurrence hint", savedInTaskDraft: false },
] as const;

function contentStateAttributes(
  meta: ContentStateMeta,
  profileId: InboxViewModel["profileId"],
) {
  return {
    "data-capacity": meta.capacity?.toString(),
    "data-content-state": meta.state,
    "data-item-count": meta.itemCount.toString(),
    "data-profile-id": profileId,
  };
}

function SectionTitle({
  children,
  id,
  label,
}: Readonly<{
  children?: ReactNode;
  id: string;
  label: string;
}>) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3">
      <h2 className="text-base font-semibold text-[var(--text-primary)]" id={id}>
        {label}
      </h2>
      {children}
    </div>
  );
}

function Pill({
  children,
  accent = "var(--accent-blue)",
  active = false,
  className,
  tinted = false,
}: Readonly<{
  children: ReactNode;
  accent?: string;
  active?: boolean;
  className?: string;
  tinted?: boolean;
}>) {
  return (
    <span
      className={cn(
        "inline-flex min-h-5 items-center rounded-full border px-2 text-[10px] font-medium",
        active
          ? "border-[color-mix(in_srgb,var(--accent)_34%,transparent)] bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] text-[var(--text-primary)]"
          : tinted
            ? "border-[color-mix(in_srgb,var(--accent)_26%,transparent)] bg-[color-mix(in_srgb,var(--accent)_11%,transparent)] text-[var(--text-secondary)]"
          : "border-[var(--border-subtle)] bg-[rgba(168,183,204,.045)] text-[var(--text-secondary)]",
        className,
      )}
      style={accentStyle(accent)}
    >
      {children}
    </span>
  );
}

function stageAccent(stage: InboxQueueItem["stage"]) {
  switch (stage) {
    case "raw":
      return "var(--accent-blue)";
    case "clarify":
      return "var(--accent-orange)";
    case "review":
      return "var(--accent-red)";
    case "ready":
      return "var(--accent-green)";
  }
}

function captureTypeAccent(type: InboxQueueItem["type"]) {
  switch (type) {
    case "task":
      return "var(--accent-green)";
    case "note":
    case "question":
      return "var(--accent-cyan)";
    case "idea":
    case "agent":
      return "var(--accent-purple)";
    case "resource":
      return "var(--accent-yellow)";
    case "decision":
      return "var(--accent-orange)";
  }
}

function outcomeRouteStatus(route: InboxOutcomeRoute) {
  if (route === "add_to_existing") {
    return "Teilweise verbunden";
  }

  if (route === "standalone_task" || route === "solved_archive") {
    return "Verbunden";
  }

  return "Noch nicht verbunden";
}

function planningSignalValue(
  label: (typeof planningSignalDefinitions)[number]["label"],
  signals: readonly InboxPlanningSignal[],
) {
  const signal = signals.find((item) => {
    if (label === "Effort / Duration") {
      return item.label === "Effort" || item.label === "Duration";
    }

    if (label === "Review needed") return item.label === "Review needed";
    if (label === "Today candidate") return item.label === "Today candidate";
    if (label === "Deadline hint") return item.label === "Deadline hint";
    if (label === "Recurrence hint") return item.label === "Recurrence hint";

    return item.label === label;
  });

  return signal?.value ?? "Noch nicht gesetzt";
}

function planningSignalAccent(
  label: (typeof planningSignalDefinitions)[number]["label"],
  signals: readonly InboxPlanningSignal[],
) {
  const signal = signals.find((item) => {
    if (label === "Effort / Duration") {
      return item.label === "Effort" || item.label === "Duration";
    }

    return item.label === label;
  });

  return signal?.accent ?? "var(--text-muted)";
}

function Dot({
  accent,
  className,
}: Readonly<{
  accent: string;
  className?: string;
}>) {
  return (
    <span
      aria-hidden="true"
      className={cn("size-2 rounded-full bg-[var(--accent)]", className)}
      style={accentStyle(accent)}
    />
  );
}

function InboxEmptyState({
  className,
  description,
  title,
}: Readonly<{
  className?: string;
  description: string;
  title: string;
}>) {
  return (
    <div
      className={cn(
        "rounded-[16px] border border-dashed border-[var(--border-subtle)] bg-[rgba(168,183,204,.035)] px-4 py-5",
        className,
      )}
    >
      <p className="text-sm font-semibold text-[var(--text-primary)]">
        {title}
      </p>
      <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
        {description}
      </p>
    </div>
  );
}

function InboxPageHeader({
  contentState,
  kicker,
  modePills,
  purpose,
  profileId,
  signals,
  title,
}: Readonly<{
  contentState: ContentStateMeta;
  kicker: string;
  modePills: string[];
  profileId: InboxViewModel["profileId"];
  purpose: string;
  signals: InboxSignal[];
  title: string;
}>) {
  return (
    <header
      className="shrink-0 rounded-[22px] border border-[var(--border-default)] bg-[rgba(15,23,36,.96)] px-5 py-4 shadow-[0_8px_22px_rgba(0,0,0,.12)] 2xl:px-7"
      data-inbox-section="header-metrics"
      {...contentStateAttributes(contentState, profileId)}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(520px,788px)] xl:items-center">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase text-[var(--accent-cyan)]">
            {kicker}
          </p>
          <h1 className="mt-1 text-[34px] font-semibold leading-tight text-[var(--text-primary)]">
            {title}
          </h1>
          <p className="mt-1.5 max-w-4xl text-sm leading-5 text-[var(--text-secondary)]">
            {purpose}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {modePills.map((pill, index) => (
              <Pill
                active={index === 0}
                accent={index === 0 ? "var(--accent-blue)" : "var(--accent-green)"}
                key={pill}
              >
                {pill}
              </Pill>
            ))}
          </div>
        </div>

        <dl className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {signals.map((signal, index) => (
            <div
              className="rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(12,20,34,.72)] p-2.5"
              key={`inbox-overview-signal-${index}`}
              style={accentStyle(signal.accent)}
            >
              <dt className="text-[10px] font-medium text-[var(--text-muted)]">
                {signal.label}
              </dt>
              <dd className="mt-0.5 flex items-center justify-between gap-3">
                <span className="text-[22px] font-semibold leading-none text-[var(--text-primary)]">
                  {signal.value}
                </span>
                <Dot accent={signal.accent} />
              </dd>
              <p className="mt-0.5 text-[10px] text-[var(--text-secondary)]">
                {signal.sublabel}
              </p>
            </div>
          ))}
        </dl>
      </div>
    </header>
  );
}

function InboxQueueItemView({ item }: Readonly<{ item: InboxQueueItem }>) {
  const stage = getInboxStageLabel(item.stage);
  const type = getInboxCaptureTypeLabel(item.type);
  const stageColor = stageAccent(item.stage);
  const typeColor = captureTypeAccent(item.type);

  return (
    <article
      className={cn(
        "grid min-h-[92px] grid-cols-[4px_minmax(0,1fr)] overflow-hidden rounded-[16px] border bg-[rgba(18,28,43,.54)] transition",
        item.active
          ? "border-[color-mix(in_srgb,var(--accent)_34%,transparent)] bg-[color-mix(in_srgb,var(--accent)_7%,rgba(18,28,43,.72))]"
          : "border-[var(--border-subtle)]",
      )}
      style={accentStyle(item.accent)}
    >
      <span className="h-full rounded-full bg-[var(--accent)]" />
      <div className="min-w-0 p-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 truncate text-sm font-semibold text-[var(--text-primary)]">
            {item.title}
          </h3>
          <span className="shrink-0 text-[10px] font-medium text-[var(--text-muted)]">
            {item.age}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <Pill active={item.active} accent={stageColor} tinted>
            {stage}
          </Pill>
          <Pill accent={typeColor} tinted>
            {type}
          </Pill>
        </div>
        <p className="mt-2 truncate text-[11px] text-[var(--text-secondary)]">
          <span className="font-semibold text-[var(--text-muted)]">Next: </span>
          {item.next}
        </p>
      </div>
    </article>
  );
}

function InboxQueue({
  contentState,
  emptyState,
  filters,
  items,
  profileId,
  quickCapture,
}: Readonly<{
  contentState: ContentStateMeta;
  emptyState: InboxViewModel["queueEmptyState"];
  filters: string[];
  items: InboxQueueItem[];
  profileId: InboxViewModel["profileId"];
  quickCapture: InboxViewModel["quickCapture"];
}>) {
  return (
    <section
      aria-labelledby="inbox-queue-title"
      className={cn(panelClasses, "2xl:flex 2xl:min-h-0 2xl:flex-col")}
      data-inbox-section="queue"
      {...contentStateAttributes(contentState, profileId)}
    >
      <div className={panelHeaderClasses}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              className="text-lg font-semibold text-[var(--text-primary)]"
              id="inbox-queue-title"
            >
              Inbox Queue
            </h2>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Stage + Quick Capture label.
            </p>
          </div>
          <input
            aria-label="Search inbox"
            className={cn(
              "h-9 w-full rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.72)] px-3 text-xs text-[var(--text-secondary)] placeholder:text-[var(--text-muted)] sm:w-44",
              focusClasses,
            )}
            placeholder="Search inbox"
            readOnly
          />
        </div>
      </div>

      <div className="p-3 2xl:flex 2xl:min-h-0 2xl:flex-1 2xl:flex-col">
        <div
          aria-label="Inbox filters"
          className="flex shrink-0 flex-wrap gap-1.5 rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(168,183,204,.035)] p-1.5"
        >
          {filters.map((filter) => (
            <button
              aria-pressed={filter === "All"}
              className={cn(
                "min-h-[26px] rounded-full border px-3 text-[10px] font-medium text-[var(--text-secondary)]",
                filter === "All"
                  ? "border-[rgba(91,124,250,.34)] bg-[rgba(91,124,250,.18)] text-[var(--text-primary)]"
                  : "border-[var(--border-subtle)] bg-[rgba(18,28,43,.60)]",
                focusClasses,
                disabledActionClasses,
              )}
              disabled={filter !== "All"}
              key={filter}
              type="button"
            >
              {filter}
            </button>
          ))}
        </div>
        <form
          action={captureInboxItemFormAction}
          aria-label="Inbox Quick Capture"
          className="mt-3 rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-3"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--text-primary)]">
                {quickCapture.title}
              </p>
              <p className="mt-1 text-[11px] leading-4 text-[var(--text-secondary)]">
                {quickCapture.description}
              </p>
            </div>
            <select
              aria-label="Quick Capture type"
              className={cn(
                "h-8 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(12,20,34,.74)] px-2 text-[11px] text-[var(--text-secondary)]",
                focusClasses,
              )}
              defaultValue="note"
              disabled={!quickCapture.enabled}
              name="type"
            >
              <option value="note">Note</option>
              <option value="task">Task</option>
              <option value="question">Question</option>
              <option value="idea">Idea</option>
              <option value="resource">Resource</option>
              <option value="agent">Agent</option>
              <option value="decision">Decision</option>
            </select>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <label className="min-w-0">
              <span className="sr-only">Quick Capture</span>
              <input
                aria-label="Quick Capture"
                className={cn(
                  "h-9 w-full rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(12,20,34,.74)] px-3 text-xs text-[var(--text-secondary)] placeholder:text-[var(--text-muted)]",
                  focusClasses,
                )}
                disabled={!quickCapture.enabled}
                name="title"
                placeholder="Gedanken, Aufgabe oder Frage erfassen"
                required={quickCapture.enabled}
              />
            </label>
            <button
              className={cn(
                "min-h-9 rounded-[12px] border border-[rgba(73,209,163,.34)] bg-[rgba(73,209,163,.16)] px-3 text-xs font-semibold text-[var(--text-primary)]",
                focusClasses,
                disabledActionClasses,
              )}
              disabled={!quickCapture.enabled}
              type="submit"
            >
              Capture
            </button>
          </div>
          <label className="mt-2 block">
            <span className="sr-only">Quick Capture note</span>
            <input
              aria-label="Quick Capture note"
              className={cn(
                "h-8 w-full rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(12,20,34,.54)] px-3 text-[11px] text-[var(--text-secondary)] placeholder:text-[var(--text-muted)]",
                focusClasses,
              )}
              disabled={!quickCapture.enabled}
              name="note"
              placeholder="Optionaler Kontext"
            />
          </label>
          {quickCapture.disabledReason ? (
            <p className="mt-2 text-[11px] leading-4 text-[var(--text-muted)]">
              {quickCapture.disabledReason}
            </p>
          ) : null}
        </form>
        <div className="mt-3 grid gap-2 2xl:min-h-0 2xl:flex-1 2xl:overflow-y-auto 2xl:pr-1">
          {items.length > 0 ? (
            items.map((item) => (
              <InboxQueueItemView item={item} key={item.id} />
            ))
          ) : (
            <InboxEmptyState
              description={emptyState.description}
              title={emptyState.title}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function FieldSurface({
  className,
  field,
  rows,
}: Readonly<{
  className?: string;
  field: InboxClarificationField;
  rows: number;
}>) {
  return (
    <label className="block min-w-0">
      <span className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">
        {field.label}
      </span>
      <textarea
        className={cn(
          "mt-1.5 w-full resize-none rounded-[14px] border border-[var(--border-default)] bg-[rgba(18,28,43,.64)] px-3 py-2 text-[13px] leading-5 text-[var(--text-secondary)]",
          className,
          focusClasses,
        )}
        readOnly
        rows={rows}
        value={field.value}
      />
    </label>
  );
}

function InboxPlanningSignals({
  activeItem,
  selectedRoute,
  signals,
}: Readonly<{
  activeItem: InboxViewModel["activeItem"];
  selectedRoute: InboxOutcomeRoute | null;
  signals: InboxPlanningSignal[];
}>) {
  return (
    <section
      aria-labelledby="planning-signals-title"
      className="rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.52)] p-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3
            className="text-sm font-semibold text-[var(--text-primary)]"
            id="planning-signals-title"
          >
            Planning Signals
          </h3>
          <p className="mt-1 text-[11px] leading-4 text-[var(--text-secondary)]">
            Hinweise für spätere Planung. Keine feste Terminierung.
          </p>
        </div>
        <Pill accent="var(--accent-cyan)">Hinweise, kein Scheduling</Pill>
      </div>
      <div className="mt-2.5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {activeItem.hasSelection ? (
          planningSignalDefinitions.map((definition) => {
            const accent = planningSignalAccent(definition.label, signals);
            const savedInTaskDraft =
              (selectedRoute === "standalone_task" ||
                selectedRoute === "add_to_existing") &&
              definition.savedInTaskDraft &&
              (definition.label !== "Area" || Boolean(activeItem.persistedAreaId));
            const status =
              definition.label === "Today candidate" &&
              (selectedRoute === "standalone_task" ||
                selectedRoute === "add_to_existing")
                ? "optional im Task Draft"
                : savedInTaskDraft
                  ? "wird im Task Draft gespeichert"
                  : "Hinweis - nicht gespeichert";

            return (
              <article
                className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.70)] px-3 py-2"
                key={`inbox-planning-signal-${definition.label}`}
                style={accentStyle(accent)}
              >
                <p className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--text-muted)]">
                  <Dot accent={accent} className="size-1.5 opacity-75" />
                  <span>{definition.label}</span>
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                  {planningSignalValue(definition.label, signals)}
                </p>
                <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                  {status}
                </p>
              </article>
            );
          })
        ) : (
          <InboxEmptyState
            className="sm:col-span-2 xl:col-span-4"
            description="Planning-Signale erscheinen erst mit einem ausgewählten Eintrag."
            title="Keine Planning-Signale"
          />
        )}
      </div>
    </section>
  );
}

function InboxOutcomeRoutes({
  description,
  onSelectRoute,
  options,
  selectedRoute,
  title,
}: Readonly<{
  description: string;
  onSelectRoute: (route: InboxOutcomeRoute) => void;
  options: InboxOutcomeOption[];
  selectedRoute: InboxOutcomeRoute | null;
  title: string;
}>) {
  return (
    <section
      aria-labelledby="outcome-route-title"
      className="rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.52)] p-3"
    >
      <h3
        className="text-sm font-semibold text-[var(--text-primary)]"
        id="outcome-route-title"
      >
        {title}
      </h3>
      <p className="mt-1 text-[11px] leading-4 text-[var(--text-secondary)]">
        {description}
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {options.map((option) => {
          const isSelected = selectedRoute === option.id;
          const isConnected =
            option.id === "add_to_existing" ||
            option.id === "standalone_task" ||
            option.id === "solved_archive";
          const status = outcomeRouteStatus(option.id);

          return (
            <button
              aria-pressed={isSelected}
              className={cn(
                "min-h-[76px] rounded-[14px] border px-3 py-2.5 text-left",
                isConnected
                  ? "border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,rgba(15,23,36,.68))]"
                  : "border-[var(--border-subtle)] bg-[rgba(15,23,36,.40)]",
                isSelected &&
                  "border-[color-mix(in_srgb,var(--accent)_48%,transparent)] bg-[color-mix(in_srgb,var(--accent)_14%,rgba(15,23,36,.74))]",
                focusClasses,
              )}
              data-outcome-route={option.id}
              key={option.id}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  onSelectRoute(option.id);
                }
              }}
              onClick={() => onSelectRoute(option.id)}
              onPointerDown={() => onSelectRoute(option.id)}
              style={accentStyle(option.accent)}
              type="button"
            >
              <span className="flex items-start gap-2.5">
                <Dot accent={option.accent} className="mt-1 shrink-0" />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="block text-[13px] font-semibold text-[var(--text-primary)]">
                      {option.title}
                    </span>
                    {isSelected ? (
                      <Pill active accent={option.accent}>
                        gewählt
                      </Pill>
                    ) : null}
                    <Pill
                      accent={isConnected ? "var(--accent-green)" : "var(--text-muted)"}
                      tinted={isConnected}
                    >
                      Status: {status}
                    </Pill>
                  </span>
                  <span className="mt-1 block text-[11px] leading-4 text-[var(--text-secondary)]">
                    {option.description}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function DraftTextInput({
  defaultValue,
  label,
  name,
  placeholder,
}: Readonly<{
  defaultValue: string;
  label: string;
  name: string;
  placeholder?: string;
}>) {
  return (
    <label className="block min-w-0">
      <span className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">
        {label}
      </span>
      <input
        className={cn(draftInputClasses, focusClasses)}
        defaultValue={defaultValue}
        name={name}
        placeholder={placeholder}
        required={name === "title"}
      />
    </label>
  );
}

function DraftTextarea({
  defaultValue,
  label,
  name,
}: Readonly<{
  defaultValue: string;
  label: string;
  name: string;
}>) {
  return (
    <label className="block min-w-0">
      <span className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">
        {label}
      </span>
      <textarea
        className={cn(draftInputClasses, "min-h-[76px] resize-none", focusClasses)}
        defaultValue={defaultValue}
        name={name}
        rows={3}
      />
    </label>
  );
}

function DraftSelect({
  children,
  defaultValue,
  label,
  name,
}: Readonly<{
  children: ReactNode;
  defaultValue?: string;
  label: string;
  name: string;
}>) {
  return (
    <label className="block min-w-0">
      <span className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">
        {label}
      </span>
      <select
        className={cn(draftInputClasses, focusClasses)}
        defaultValue={defaultValue}
        name={name}
      >
        {children}
      </select>
    </label>
  );
}

function DraftShellReadOnlyField({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <label className="block min-w-0">
      <span className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">
        {label}
      </span>
      <input
        className={cn(draftInputClasses, focusClasses)}
        readOnly
        value={value}
      />
    </label>
  );
}

function DraftShellSelect({
  label,
  options,
}: Readonly<{
  label: string;
  options: readonly string[];
}>) {
  return (
    <label className="block min-w-0">
      <span className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">
        {label}
      </span>
      <select
        className={cn(draftInputClasses, focusClasses)}
        defaultValue={options[0]}
        disabled
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function PreparedDraftShell({
  activeItem,
  route,
}: Readonly<{
  activeItem: InboxViewModel["activeItem"];
  route: Exclude<
    InboxOutcomeRoute,
    "add_to_existing" | "standalone_task" | "solved_archive"
  >;
}>) {
  const shell = {
    create_new: {
      accent: "var(--accent-green)",
      title: "Create New Draft",
      description:
        "Diese Route bereitet ein neues Objekt vor. Es wird noch kein Project, Goal, Skill oder Resource erstellt.",
      fields: (
        <>
          <DraftShellSelect
            label="Neues Objekt"
            options={["Project", "Goal", "Skill", "Resource"]}
          />
          <DraftShellReadOnlyField
            label="Arbeitstitel"
            value={activeItem.title}
          />
          <DraftShellReadOnlyField
            label="Warum relevant?"
            value="Noch nicht verbunden"
          />
          <DraftShellReadOnlyField
            label="Nächster Schritt"
            value="Noch nicht verbunden"
          />
        </>
      ),
    },
    knowledge_resource: {
      accent: "var(--accent-purple)",
      title: "Resource Draft",
      description:
        "Diese Route bereitet Wissen, Link, Notiz oder Material vor. Es wird noch keine Resource gespeichert.",
      fields: (
        <>
          <DraftShellSelect
            label="Resource Typ"
            options={["Note", "Link", "Document", "Idea"]}
          />
          <DraftShellReadOnlyField
            label="Cluster / Bezug"
            value="Noch nicht verbunden"
          />
          <DraftShellReadOnlyField
            label="Kurzfassung"
            value={activeItem.originalCapture || "Noch nicht verbunden"}
          />
        </>
      ),
    },
  } satisfies Record<
    Exclude<
      InboxOutcomeRoute,
      "add_to_existing" | "standalone_task" | "solved_archive"
    >,
    {
      accent: string;
      description: string;
      fields: ReactNode;
      title: string;
    }
  >;
  const config = shell[route];

  return (
    <section
      aria-labelledby="prepared-draft-title"
      className="rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.52)] p-3"
      style={accentStyle(config.accent)}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3
            className="text-sm font-semibold text-[var(--text-primary)]"
            id="prepared-draft-title"
          >
            {config.title}
          </h3>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
            {config.description}
          </p>
        </div>
        <Pill accent="var(--text-muted)">
          Noch nicht verbunden
        </Pill>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {config.fields}
      </div>
      <p className="mt-2 text-[10px] leading-4 text-[var(--text-muted)]">
        Diese Auswahl erzeugt keinen Submit und schreibt keine Daten.
      </p>
    </section>
  );
}

const existingTargetTypeLabels: Record<InboxExistingTargetType, string> = {
  goal: "Goal",
  project: "Project",
  resource: "Resource",
  skill: "Skill",
};

function targetsForType(
  targets: InboxViewModel["existingTargets"],
  type: InboxExistingTargetType,
) {
  if (type === "project") return targets.projects;
  if (type === "goal") return targets.goals;
  if (type === "resource") return targets.resources;

  return targets.skills;
}

function InboxAddToExistingDraft({
  activeItem,
  canCreateTask,
  existingTargets,
  nextAction,
}: Readonly<{
  activeItem: InboxViewModel["activeItem"];
  canCreateTask: boolean;
  existingTargets: InboxViewModel["existingTargets"];
  nextAction: InboxClarificationField;
}>) {
  const [targetType, setTargetType] =
    useState<InboxExistingTargetType>("project");
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [contributionType, setContributionType] = useState<
    "decision" | "note" | "resource_link" | "task"
  >("task");
  const area =
    activeItem.planningSignals.find((signal) => signal.label === "Area")
      ?.value ?? "Review";
  const activeTargets = targetsForType(existingTargets, targetType);
  const selectedTarget =
    activeTargets.find((target) => target.id === selectedTargetId) ??
    activeTargets[0] ??
    null;
  const canPersistTask =
    canCreateTask &&
    contributionType === "task" &&
    Boolean(selectedTarget) &&
    (targetType === "project" || targetType === "goal");
  const contributionStatus =
    contributionType === "task" &&
    Boolean(selectedTarget) &&
    (targetType === "project" || targetType === "goal")
      ? "Verbunden"
      : contributionType === "resource_link"
        ? "Vorbereitet"
        : contributionType === "task" &&
            (targetType === "project" || targetType === "goal")
          ? "Ziel fehlt"
        : "Noch nicht verbunden";
  const targetEmptyCopy =
    targetType === "skill"
      ? "Skill bleibt Future Scope, bis eine echte persistierte Skill-Entity existiert."
      : targetType === "project"
        ? "Noch keine bestehenden Projects vorhanden. Create New folgt später."
        : targetType === "goal"
          ? "Noch keine bestehenden Goals vorhanden. Create New folgt später."
          : "Noch keine bestehenden Resources vorhanden. Resource Link folgt später.";

  return (
    <section
      aria-labelledby="add-to-existing-draft-title"
      className="rounded-[18px] border border-[rgba(91,124,250,.30)] bg-[rgba(91,124,250,.075)] p-3"
    >
      <form action={triageInboxItemToTaskFormAction}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3
              className="text-sm font-semibold text-[var(--text-primary)]"
              id="add-to-existing-draft-title"
            >
              Bestehendem Objekt zuordnen
            </h3>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
              Bestehendes Project oder Goal auswählen und daraus einen
              Task-Beitrag erstellen. Resource Link ist vorbereitet; Skill ist
              Future Scope.
            </p>
          </div>
          <Pill
            active={contributionStatus === "Verbunden"}
            accent={
              contributionStatus === "Verbunden"
                ? "var(--accent-green)"
                : contributionStatus === "Vorbereitet"
                  ? "var(--accent-yellow)"
                  : "var(--text-muted)"
            }
          >
            Beitrag: {contributionStatus}
          </Pill>
        </div>

        <div
          aria-label="Target type"
          className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4"
        >
          {(["project", "goal", "resource", "skill"] as const).map((type) => {
            const count = targetsForType(existingTargets, type).length;
            const active = targetType === type;

            return (
              <button
                aria-pressed={active}
                className={cn(
                  "min-h-16 rounded-[14px] border px-3 py-2 text-left",
                  active
                    ? "border-[rgba(91,124,250,.42)] bg-[rgba(91,124,250,.16)] text-[var(--text-primary)]"
                    : "border-[var(--border-subtle)] bg-[rgba(15,23,36,.48)] text-[var(--text-secondary)]",
                  focusClasses,
                )}
                key={type}
                onClick={() => {
                  setTargetType(type);
                  setSelectedTargetId("");
                }}
                type="button"
              >
                <span className="block text-xs font-semibold">
                  {existingTargetTypeLabels[type]}
                </span>
                <span className="mt-1 block text-[10px] text-[var(--text-muted)]">
                  {type === "skill"
                    ? "Future Scope"
                    : `${count} DB-Ziel${count === 1 ? "" : "e"}`}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 grid gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(260px,360px)]">
          <label className="block min-w-0">
            <span className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">
              Ziel auswählen
            </span>
            <select
              aria-label="Existing target"
              className={cn(draftInputClasses, focusClasses)}
              disabled={activeTargets.length === 0}
              onChange={(event) => setSelectedTargetId(event.target.value)}
              value={selectedTarget?.id ?? ""}
            >
              {selectedTarget ? null : <option value="">{targetEmptyCopy}</option>}
              {activeTargets.map((target) => (
                <option key={target.id} value={target.id}>
                  {target.title}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
              {selectedTarget ? selectedTarget.meta : targetEmptyCopy}
            </p>
          </label>

          <div>
            <p className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">
              Beitragstyp
            </p>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              {[
                ["task", "Task"],
                ["note", "Note"],
                ["resource_link", "Resource Link"],
                ["decision", "Decision"],
              ].map(([value, label]) => (
                <button
                  aria-pressed={contributionType === value}
                  className={cn(
                    "min-h-8 rounded-[12px] border px-2 text-[11px] font-semibold",
                    contributionType === value
                      ? "border-[rgba(66,184,131,.38)] bg-[rgba(66,184,131,.16)] text-[var(--text-primary)]"
                      : "border-[var(--border-subtle)] bg-[rgba(18,28,43,.60)] text-[var(--text-secondary)]",
                    focusClasses,
                  )}
                  key={value}
                  onClick={() =>
                    setContributionType(
                      value as "decision" | "note" | "resource_link" | "task",
                    )
                  }
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {canPersistTask || contributionType === "task" ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <input name="inboxItemId" type="hidden" value={activeItem.id} />
            <input name="outcomeRoute" type="hidden" value="add_to_existing" />
            {targetType === "project" && selectedTarget ? (
              <input name="projectId" type="hidden" value={selectedTarget.id} />
            ) : null}
            {targetType === "goal" && selectedTarget ? (
              <input name="goalId" type="hidden" value={selectedTarget.id} />
            ) : null}
            <DraftTextInput
              defaultValue={activeItem.title}
              label="Titel"
              name="title"
            />
            <DraftTextarea
              defaultValue={activeItem.originalCapture}
              label="Beschreibung / Kontext"
              name="description"
            />
            <DraftTextInput
              defaultValue={nextAction.value}
              label="Nächste Aktion"
              name="nextAction"
            />
            <DraftSelect label="Area" name="areaId">
              {activeItem.persistedAreaId ? (
                <option value={activeItem.persistedAreaId}>{area}</option>
              ) : null}
              <option value="">
                {activeItem.persistedAreaId
                  ? "Keine Area setzen"
                  : "Nicht gesetzt - nicht gespeichert"}
              </option>
            </DraftSelect>
            <DraftSelect
              defaultValue={activeItem.priority ?? "P2"}
              label="Priorität"
              name="priority"
            >
              {taskDraftPriorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </DraftSelect>
            <DraftSelect
              defaultValue="30"
              label="Effort / Dauer"
              name="durationMinutes"
            >
              {taskDraftDurations.map((duration) => (
                <option key={duration} value={duration}>
                  {duration} min
                </option>
              ))}
            </DraftSelect>
            <DraftSelect defaultValue="medium" label="Energie" name="energy">
              {taskDraftEnergies.map((energy) => (
                <option key={energy} value={energy}>
                  {energy}
                </option>
              ))}
            </DraftSelect>
            <button
              className={cn(
                "min-h-10 self-end rounded-[12px] border border-[rgba(66,184,131,.42)] bg-[rgba(66,184,131,.22)] px-3 text-xs font-semibold text-[var(--text-primary)]",
                focusClasses,
                disabledActionClasses,
              )}
              disabled={!canPersistTask}
              type="submit"
            >
              Task-Beitrag erstellen
            </button>
          </div>
        ) : (
          <div className="mt-3 rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.58)] p-3">
            <p className="text-xs font-semibold text-[var(--text-primary)]">
              {contributionType === "resource_link"
                ? "Resource Link vorbereitet"
                : "Beitragstyp noch nicht verbunden"}
            </p>
            <p className="mt-1 text-[11px] leading-4 text-[var(--text-secondary)]">
              Diese Auswahl schreibt aktuell keine Daten. Persistenz ist nur
              für Task-Beiträge zu bestehenden Projects oder Goals verbunden.
            </p>
          </div>
        )}

        <p className="mt-2 text-[10px] leading-4 text-[var(--text-muted)]">
          Persistenter Pfad: Task + Project/Goal-ID über bestehende
          Inbox-Triage-RPC. Kein Resource Graph, keine Skill-Persistence, keine
          neue Entity.
        </p>
      </form>
    </section>
  );
}

function DraftSlot({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <section
      aria-labelledby="draft-slot-title"
      className="rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(12,20,34,.38)] p-2.5"
      data-inbox-section="draft-slot"
    >
      <p
        className="px-1 pb-2 text-[10px] font-semibold uppercase text-[var(--text-muted)]"
        id="draft-slot-title"
      >
        Draft
      </p>
      {children}
    </section>
  );
}

function EmptyDraftSlot() {
  return (
    <InboxEmptyState
      description="Wähle zuerst eine Outcome Route."
      title="Noch kein Draft ausgewählt"
    />
  );
}

function InboxSolvedArchiveDraft({
  activeItem,
  canArchive,
}: Readonly<{
  activeItem: InboxViewModel["activeItem"];
  canArchive: boolean;
}>) {
  const [archiveState, archiveFormAction, archivePending] = useActionState<
    InboxArchiveActionResult | null,
    FormData
  >(archiveInboxItemFormStateAction, null);
  const archivedCurrentItem =
    archiveState?.status === "success" &&
    archiveState.inboxItemId === activeItem.id;

  if (archivedCurrentItem) {
    return (
      <section
        aria-labelledby="inbox-archive-success-title"
        className="rounded-[18px] border border-[rgba(66,184,131,.34)] bg-[rgba(66,184,131,.10)] p-3"
      >
        <h3
          className="text-sm font-semibold text-[var(--text-primary)]"
          id="inbox-archive-success-title"
        >
          Inbox-Eintrag abgeschlossen
        </h3>
        <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
          Dieser Eintrag wurde aus der aktiven Inbox entfernt. Es wurde kein
          Zielobjekt erstellt.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="solved-archive-draft-title"
      className="rounded-[18px] border border-[rgba(95,200,215,.30)] bg-[rgba(95,200,215,.075)] p-3"
    >
      <form action={archiveFormAction}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3
              className="text-sm font-semibold text-[var(--text-primary)]"
              id="solved-archive-draft-title"
            >
              Solved / Archive Draft
            </h3>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
              Kein Zielobjekt nötig. Dieses Capture wird aus der aktiven Inbox
              entfernt und archiviert.
            </p>
          </div>
          <input name="inboxItemId" type="hidden" value={activeItem.id} />
          <button
            className={cn(
              "min-h-9 rounded-[12px] border border-[rgba(95,200,215,.42)] bg-[rgba(95,200,215,.18)] px-3 text-xs font-semibold text-[var(--text-primary)]",
              focusClasses,
              disabledActionClasses,
            )}
            disabled={!canArchive || archivePending}
            type="submit"
          >
            {archivePending ? "Archiviert..." : "Als erledigt archivieren"}
          </button>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <DraftShellReadOnlyField
            label="Kein Zielobjekt nötig"
            value="Wird ohne Task, Project, Goal oder Resource abgeschlossen"
          />
          <DraftShellReadOnlyField
            label="Archivstatus"
            value="Setzt archived_at und Status archived"
          />
          <DraftShellReadOnlyField
            label="Abschlussnotiz"
            value="Nicht dauerhaft gespeichert"
          />
        </div>
        <p className="mt-2 text-[10px] leading-4 text-[var(--text-muted)]">
          Kein Hard Delete. Die Abschlussnotiz wird aktuell nicht dauerhaft
          gespeichert.
        </p>
        {archiveState?.status === "blocked" || archiveState?.status === "error" ? (
          <p className="mt-2 text-[11px] leading-4 text-[var(--accent-orange)]">
            {archiveState.message}
          </p>
        ) : null}
      </form>
    </section>
  );
}

function InboxTaskDraft({
  activeItem,
  canCreateTask,
  nextAction,
}: Readonly<{
  activeItem: InboxViewModel["activeItem"];
  canCreateTask: boolean;
  nextAction: InboxClarificationField;
}>) {
  const area =
    activeItem.planningSignals.find((signal) => signal.label === "Area")
      ?.value ?? "Review";

  if (activeItem.triagedTaskId) {
    return (
      <section
        aria-labelledby="task-created-title"
        className="rounded-[18px] border border-[rgba(66,184,131,.34)] bg-[rgba(66,184,131,.10)] p-3"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3
              className="text-sm font-semibold text-[var(--text-primary)]"
              id="task-created-title"
            >
              Task erstellt
            </h3>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
              Diese Inbox wurde in eine Task umgewandelt. Planung und
              Terminierung bleiben in Portfolio, Today und Calendar.
            </p>
          </div>
          <Link
            className={cn(
              "inline-flex min-h-8 items-center rounded-[12px] border border-[rgba(91,124,250,.34)] bg-[rgba(91,124,250,.16)] px-3 text-xs font-semibold text-[var(--text-primary)]",
              focusClasses,
            )}
            href={activeItem.portfolioHref ?? "/portfolio?view=tasks"}
          >
            Portfolio öffnen
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="task-draft-title"
      className="rounded-[18px] border border-[rgba(66,184,131,.30)] bg-[rgba(66,184,131,.075)] p-3"
    >
      <form action={triageInboxItemToTaskFormAction}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3
              className="text-sm font-semibold text-[var(--text-primary)]"
              id="task-draft-title"
            >
              Task Draft
            </h3>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
              Review aus der Inbox. Task-Erstellung passiert erst über diese
              Aktion.
            </p>
          </div>
          <input name="inboxItemId" type="hidden" value={activeItem.id} />
          <input name="outcomeRoute" type="hidden" value="standalone_task" />
          <input name="reviewNeeded" type="hidden" value="true" />
          <button
            className={cn(
              "min-h-9 rounded-[12px] border border-[rgba(66,184,131,.42)] bg-[rgba(66,184,131,.22)] px-3 text-xs font-semibold text-[var(--text-primary)]",
              focusClasses,
              disabledActionClasses,
            )}
            disabled={!canCreateTask}
            type="submit"
          >
            Task erstellen
          </button>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <DraftTextInput
            defaultValue={activeItem.title}
            label="Titel"
            name="title"
          />
          <DraftTextarea
            defaultValue={activeItem.originalCapture}
            label="Beschreibung / Kontext"
            name="description"
          />
          <DraftTextInput
            defaultValue={nextAction.value}
            label="Nächste Aktion"
            name="nextAction"
          />
          <DraftSelect label="Area" name="areaId">
            {activeItem.persistedAreaId ? (
              <option value={activeItem.persistedAreaId}>{area}</option>
            ) : null}
            <option value="">
              {activeItem.persistedAreaId
                ? "Keine Area setzen"
                : "Nicht gesetzt - nicht gespeichert"}
            </option>
          </DraftSelect>
          <DraftSelect
            defaultValue={activeItem.priority ?? "P2"}
            label="Priorität"
            name="priority"
          >
            {taskDraftPriorities.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </DraftSelect>
          <DraftSelect
            defaultValue="30"
            label="Effort / Dauer"
            name="durationMinutes"
          >
            {taskDraftDurations.map((duration) => (
              <option key={duration} value={duration}>
                {duration} min
              </option>
            ))}
          </DraftSelect>
          <DraftSelect defaultValue="medium" label="Energie" name="energy">
            {taskDraftEnergies.map((energy) => (
              <option key={energy} value={energy}>
                {energy}
              </option>
            ))}
          </DraftSelect>
          <label className="block min-w-0">
            <span className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">
              Review nötig
            </span>
            <span className="mt-1.5 flex min-h-10 items-center rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(12,20,34,.74)] px-3 text-xs leading-5 text-[var(--text-primary)]">
              Ja - Task startet im Inbox-Status
            </span>
          </label>
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <input
            className={cn("size-4 accent-[var(--accent-green)]", focusClasses)}
            name="planToday"
            type="checkbox"
          />
          Heute planen
        </label>
        <p className="mt-2 text-[10px] leading-4 text-[var(--text-muted)]">
          Persistiert: Titel, Beschreibung inklusive nächster Aktion, Priorität,
          Energie, Dauer und optionale Tagesplanung. Area wird nur gespeichert,
          wenn eine DB-Area vorhanden ist.
        </p>
      </form>
    </section>
  );
}

function InboxActiveItemPanel({
  activeItem,
  addToExistingEnabled,
  archiveEnabled,
  contentState,
  existingTargets,
  onSelectOutcomeRoute,
  outcome,
  selectedOutcomeRoute,
  taskCreationEnabled,
  profileId,
}: Readonly<{
  activeItem: InboxViewModel["activeItem"];
  addToExistingEnabled: boolean;
  archiveEnabled: boolean;
  contentState: ContentStateMeta;
  existingTargets: InboxViewModel["existingTargets"];
  onSelectOutcomeRoute: (route: InboxOutcomeRoute) => void;
  outcome: InboxViewModel["outcome"];
  selectedOutcomeRoute: InboxOutcomeRoute | null;
  taskCreationEnabled: boolean;
  profileId: InboxViewModel["profileId"];
}>) {
  const [cleanTitle, description, nextAction, missingInfo] = activeItem.fields;
  const selectedDraftRoute = activeItem.triagedTaskId
    ? null
    : selectedOutcomeRoute;
  let draftSlot: ReactNode = <EmptyDraftSlot />;

  if (selectedDraftRoute === "standalone_task") {
    draftSlot = (
      <InboxTaskDraft
        activeItem={activeItem}
        canCreateTask={taskCreationEnabled}
        nextAction={nextAction}
      />
    );
  } else if (selectedDraftRoute === "solved_archive") {
    draftSlot = (
      <InboxSolvedArchiveDraft
        activeItem={activeItem}
        canArchive={archiveEnabled}
      />
    );
  } else if (selectedDraftRoute === "add_to_existing") {
    draftSlot = (
      <InboxAddToExistingDraft
        activeItem={activeItem}
        canCreateTask={addToExistingEnabled}
        existingTargets={existingTargets}
        nextAction={nextAction}
      />
    );
  } else if (
    selectedDraftRoute === "create_new" ||
    selectedDraftRoute === "knowledge_resource"
  ) {
    draftSlot = (
      <PreparedDraftShell activeItem={activeItem} route={selectedDraftRoute} />
    );
  }

  return (
    <section
      aria-labelledby="active-item-title"
      className={cn(panelClasses, "2xl:flex 2xl:min-h-0 2xl:flex-col")}
      data-inbox-section="active-item"
      {...contentStateAttributes(contentState, profileId)}
    >
      <div className={panelHeaderClasses}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase text-[var(--accent-orange)]">
              Active item
            </p>
            <h2
              className="mt-0.5 text-lg font-semibold text-[var(--text-primary)]"
              id="active-item-title"
            >
              {activeItem.title}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill active accent="var(--accent-orange)">
              Stage: {activeItem.stage}
            </Pill>
            <Pill active accent="var(--accent-cyan)">
              Type: {activeItem.type}
            </Pill>
          </div>
        </div>
      </div>

      {activeItem.hasSelection ? (
      <div className="space-y-3 p-3 2xl:flex 2xl:min-h-0 2xl:flex-1 2xl:flex-col 2xl:gap-3 2xl:space-y-0">
        <section
          aria-labelledby="original-capture-title"
          className="rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.52)] p-3 2xl:min-h-[102px]"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h3
              className="text-[10px] font-semibold uppercase text-[var(--text-muted)]"
              id="original-capture-title"
            >
              Original Capture
            </h3>
            <Pill>{activeItem.source}</Pill>
          </div>
          <blockquote className="mt-2 border-l-[3px] border-[var(--accent-blue)] pl-3 text-[13px] leading-5 text-[var(--text-primary)]">
            {`"${activeItem.originalCapture}"`}
          </blockquote>
        </section>

        <section
          aria-labelledby="clarification-fields-title"
          className="space-y-3 2xl:space-y-3"
        >
          <h3 className="sr-only" id="clarification-fields-title">
            Clarification Fields
          </h3>
          <div className="grid gap-3 xl:grid-cols-[minmax(260px,420px)_minmax(0,1fr)]">
            <FieldSurface
              className="2xl:min-h-[54px]"
              field={cleanTitle}
              rows={1}
            />
            <div className="hidden xl:block" />
          </div>
          <FieldSurface
            className="2xl:min-h-[110px]"
            field={description}
            rows={2}
          />
          <div className="grid gap-3 xl:grid-cols-2">
            <FieldSurface
              className="2xl:min-h-[98px]"
              field={nextAction}
              rows={2}
            />
            <FieldSurface
              className="2xl:min-h-[98px]"
              field={missingInfo}
              rows={2}
            />
          </div>
        </section>

        {activeItem.triagedTaskId ? (
          <DraftSlot>
            <InboxTaskDraft
              activeItem={activeItem}
              canCreateTask={false}
              nextAction={nextAction}
            />
          </DraftSlot>
        ) : (
          <>
            <InboxOutcomeRoutes
              description={outcome.description}
              onSelectRoute={onSelectOutcomeRoute}
              options={outcome.options}
              selectedRoute={selectedDraftRoute}
              title={outcome.title}
            />
            <DraftSlot>{draftSlot}</DraftSlot>
          </>
        )}
        <InboxPlanningSignals
          activeItem={activeItem}
          selectedRoute={selectedDraftRoute}
          signals={activeItem.planningSignals}
        />
        <div
          aria-label="Inbox item actions"
          className="mt-auto flex flex-wrap gap-2 border-t border-[var(--border-subtle)] pt-3"
        >
          {["Save progress", "Mark as clarified", "Snooze", "Dismiss"].map(
            (action, index) => (
              <button
                className={cn(
                  "min-h-8 rounded-[12px] border px-3 text-xs font-semibold",
                  index === 1
                    ? "border-[rgba(66,184,131,.34)] bg-[rgba(66,184,131,.18)] text-[var(--text-primary)]"
                    : "border-[var(--border-subtle)] bg-[rgba(18,28,43,.70)] text-[var(--text-secondary)]",
                  focusClasses,
                  disabledActionClasses,
                )}
                disabled={!activeItem.actionsEnabled}
                key={`inbox-action-${index}`}
                type="button"
              >
                {action}
              </button>
            ),
          )}
        </div>
      </div>
      ) : (
        <div className="space-y-3 p-3 2xl:flex 2xl:min-h-0 2xl:flex-1 2xl:flex-col">
          <InboxEmptyState
            className="2xl:min-h-[180px]"
            description={activeItem.emptyState.description}
            title={activeItem.emptyState.title}
          />
          <div
            aria-label="Inbox item actions"
            className="mt-auto flex flex-wrap gap-2 border-t border-[var(--border-subtle)] pt-3"
          >
            {["Save progress", "Mark as clarified", "Snooze", "Dismiss"].map(
              (action, index) => (
                <button
                  className={cn(
                    "min-h-8 rounded-[12px] border px-3 text-xs font-semibold",
                    index === 1
                      ? "border-[rgba(66,184,131,.34)] bg-[rgba(66,184,131,.18)] text-[var(--text-primary)]"
                      : "border-[var(--border-subtle)] bg-[rgba(18,28,43,.70)] text-[var(--text-secondary)]",
                    focusClasses,
                    disabledActionClasses,
                  )}
                  disabled
                  key={`inbox-empty-action-${index}`}
                  type="button"
                >
                  {action}
                </button>
              ),
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function AIAssistantPanel({
  assistant,
  contentState,
  profileId,
}: Readonly<{
  assistant: InboxViewModel["aiAssistant"];
  contentState: ContentStateMeta;
  profileId: InboxViewModel["profileId"];
}>) {
  return (
    <section
      aria-labelledby="ai-assistant-title"
      className={panelClasses}
      data-inbox-section="ai-assistant"
      {...contentStateAttributes(contentState, profileId)}
    >
      <div className={panelHeaderClasses}>
        <SectionTitle id="ai-assistant-title" label={assistant.title}>
          <Pill active accent="var(--accent-purple)">
            {assistant.mode}
          </Pill>
        </SectionTitle>
      </div>
      <div className="space-y-3 p-4">
        <p className="text-xs text-[var(--text-secondary)]">
          {assistant.description}
        </p>
        <div className="rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.52)] p-3">
          <p className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">
            Suggested Planning
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {assistant.planning.map((suggestion, index) => (
              <SuggestionBox
                key={`inbox-ai-suggestion-${index}`}
                suggestion={suggestion}
              />
            ))}
          </div>
          <p className="mt-2 text-[10px] leading-4 text-[var(--text-muted)]">
            Vorschlagsschicht. Keine automatische Übernahme.
          </p>
        </div>
        <div className="rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.52)] p-3">
          <p className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">
            Suggested Routes
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {assistant.outcomes.length > 0 ? (
              assistant.outcomes.map((outcome, index) => (
                <Pill
                  active={index === 0}
                  accent={
                    index === 0
                      ? "var(--accent-blue)"
                      : index === 1
                        ? "var(--accent-purple)"
                        : "var(--accent-orange)"
                  }
                  key={outcome}
                >
                  {outcome}
                </Pill>
              ))
            ) : (
              <InboxEmptyState
                className="w-full py-3"
                description={assistant.emptyState.description}
                title={assistant.emptyState.title}
              />
            )}
          </div>
        </div>
        <label className="block">
          <span className="sr-only">Discuss this item with AI</span>
          <textarea
            className={cn(
              "min-h-[72px] w-full resize-none rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.72)] px-3 py-2 text-xs leading-5 text-[var(--text-secondary)] placeholder:text-[var(--text-muted)]",
              focusClasses,
            )}
            placeholder={assistant.placeholder}
            readOnly
          />
        </label>
      </div>
    </section>
  );
}

function SuggestionBox({
  suggestion,
}: Readonly<{
  suggestion: InboxAISuggestion;
}>) {
  return (
    <article
      className="rounded-[12px] border border-[var(--border-subtle)] border-l-[3px] border-l-[var(--accent)] bg-[rgba(15,23,36,.70)] px-3 py-2"
      style={accentStyle(suggestion.accent)}
    >
      <p className="text-[10px] text-[var(--text-muted)]">{suggestion.label}</p>
      <p className="mt-0.5 text-xs font-semibold text-[var(--text-primary)]">
        {suggestion.value}
      </p>
    </article>
  );
}

function DecisionChecklist({
  checklist,
  contentState,
  profileId,
}: Readonly<{
  checklist: InboxViewModel["checklist"];
  contentState: ContentStateMeta;
  profileId: InboxViewModel["profileId"];
}>) {
  return (
    <section
      aria-labelledby="decision-checklist-title"
      className={panelClasses}
      data-inbox-section="decision-checklist"
      {...contentStateAttributes(contentState, profileId)}
    >
      <div className={panelHeaderClasses}>
        <SectionTitle id="decision-checklist-title" label={checklist.title}>
          <Pill active accent="var(--accent-orange)">
            {checklist.progress}
          </Pill>
        </SectionTitle>
      </div>
      <div className="p-4">
        <ul className="space-y-2">
          {checklist.items.map((item, index) => (
            <ChecklistItem item={item} key={`inbox-checklist-${index}`} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function ChecklistItem({ item }: Readonly<{ item: InboxChecklistItem }>) {
  const isDone = item.state === "done";
  const accent = isDone ? "var(--accent-green)" : "var(--accent-orange)";

  return (
    <li className="flex items-center justify-between gap-3">
      <span className="flex min-w-0 items-center gap-2">
        <Dot accent={accent} className={isDone ? "opacity-90" : "opacity-72"} />
        <span
          className={cn(
            "truncate text-xs font-medium",
            isDone ? "text-[var(--text-secondary)]" : "text-[var(--text-muted)]",
          )}
        >
          {item.label}
        </span>
      </span>
      <span
        className={cn(
          "shrink-0 text-[11px] font-medium",
          isDone ? "text-[var(--accent-green)]" : "text-[var(--accent-orange)]",
        )}
      >
        {item.state}
      </span>
    </li>
  );
}

function RelatedContext({
  contentState,
  context,
  profileId,
}: Readonly<{
  contentState: ContentStateMeta;
  context: InboxViewModel["relatedContext"];
  profileId: InboxViewModel["profileId"];
}>) {
  return (
    <section
      aria-labelledby="related-context-title"
      className={cn(panelClasses, "2xl:flex 2xl:min-h-0 2xl:flex-1 2xl:flex-col")}
      data-inbox-section="related-context"
      {...contentStateAttributes(contentState, profileId)}
    >
      <div className={panelHeaderClasses}>
        <SectionTitle id="related-context-title" label={context.title}>
          <Pill active>{context.mode}</Pill>
        </SectionTitle>
      </div>
      <div className="space-y-2 p-4 2xl:flex 2xl:min-h-0 2xl:flex-1 2xl:flex-col">
        <input
          aria-label="Search related context"
          className={cn(
            "h-9 w-full shrink-0 rounded-[13px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.72)] px-3 text-xs text-[var(--text-secondary)] placeholder:text-[var(--text-muted)]",
            focusClasses,
          )}
          placeholder={context.placeholder}
          readOnly
        />
        <div className="grid gap-2 2xl:min-h-0 2xl:flex-1 2xl:overflow-y-auto 2xl:pr-1">
          {context.items.length > 0 ? (
            context.items.map((item, index) => (
              <RelatedContextRow
                actionsEnabled={context.actionsEnabled}
                item={item}
                key={`inbox-related-context-${index}`}
              />
            ))
          ) : (
            <InboxEmptyState
              description={context.emptyState.description}
              title={context.emptyState.title}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function RelatedContextRow({
  actionsEnabled,
  item,
}: Readonly<{
  actionsEnabled: boolean;
  item: InboxRelatedContextItem;
}>) {
  return (
    <article className="grid min-h-[52px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.54)] px-3 py-2">
      <div className="flex min-w-0 items-center gap-3">
        <Dot accent={item.accent} className="shrink-0" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Pill accent={item.accent}>{item.typeArea}</Pill>
            <p className="min-w-0 truncate text-sm font-semibold text-[var(--text-primary)]">
              {item.name}
            </p>
          </div>
          <p className="mt-1 truncate text-[10px] text-[var(--text-muted)]">
            {item.meta}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-[10px] font-medium text-[var(--text-muted)]">
          {item.score}
        </span>
        <button
          className={cn(
            "min-h-8 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.76)] px-3 text-xs font-semibold text-[var(--text-secondary)]",
            focusClasses,
            disabledActionClasses,
          )}
          disabled={!actionsEnabled}
          type="button"
        >
          Use
        </button>
      </div>
    </article>
  );
}

function InboxAIAssistantPanel({
  viewModel,
}: Readonly<{
  viewModel: InboxViewModel;
}>) {
  return (
    <aside
      className="space-y-4 2xl:flex 2xl:h-full 2xl:min-h-0 2xl:flex-col 2xl:gap-3 2xl:space-y-0"
      aria-label="Inbox assistant and context"
    >
      <AIAssistantPanel
        assistant={viewModel.aiAssistant}
        contentState={viewModel.contentStates.aiAssistant}
        profileId={viewModel.profileId}
      />
      <DecisionChecklist
        checklist={viewModel.checklist}
        contentState={viewModel.contentStates.checklist}
        profileId={viewModel.profileId}
      />
      <RelatedContext
        contentState={viewModel.contentStates.relatedContext}
        context={viewModel.relatedContext}
        profileId={viewModel.profileId}
      />
    </aside>
  );
}

export function InboxPage({
  viewModel,
}: Readonly<{
  viewModel: InboxViewModel;
}>) {
  const activeItemKey = `${viewModel.activeItem.id ?? "empty"}:${
    viewModel.activeItem.type
  }:${viewModel.activeItem.triagedTaskId ?? "open"}`;
  const [outcomeSelection, setOutcomeSelection] = useState<{
    key: string;
    route: InboxOutcomeRoute | null;
  }>({
    key: activeItemKey,
    route: null,
  });
  const selectedOutcomeRoute =
    outcomeSelection.key === activeItemKey
      ? outcomeSelection.route
      : null;
  const setSelectedOutcomeRoute = (route: InboxOutcomeRoute) => {
    setOutcomeSelection({ key: activeItemKey, route });
  };

  const taskCreationEnabled = Boolean(
    viewModel.quickCapture.enabled &&
      viewModel.activeItem.hasSelection &&
      !viewModel.activeItem.triagedTaskId &&
      selectedOutcomeRoute === "standalone_task",
  );
  const addToExistingEnabled = Boolean(
    viewModel.quickCapture.enabled &&
      viewModel.activeItem.hasSelection &&
      !viewModel.activeItem.triagedTaskId &&
      selectedOutcomeRoute === "add_to_existing",
  );
  const archiveEnabled = Boolean(
    viewModel.quickCapture.enabled &&
      viewModel.activeItem.hasSelection &&
      !viewModel.activeItem.triagedTaskId,
  );
  const routeSelected = Boolean(selectedOutcomeRoute);
  const checklist = useMemo(() => {
    const items = viewModel.checklist.items.map((item) => {
      if (item.label === "Outcome Route gewählt" && routeSelected) {
        return { ...item, state: "done" as const };
      }

      return item;
    });
    const doneCount = items.filter((item) => item.state === "done").length;

    return {
      ...viewModel.checklist,
      items,
      progress: `${doneCount} / ${items.length} ready`,
    };
  }, [routeSelected, viewModel.checklist]);

  return (
    <div
      className="mx-auto flex w-full max-w-[2168px] flex-col gap-3 pb-8 2xl:h-[calc(100dvh-20px)] 2xl:min-h-0 2xl:overflow-hidden 2xl:pb-0"
      data-inbox-section="page-root"
      id="inbox-page"
      {...contentStateAttributes(viewModel.contentStates.page, viewModel.profileId)}
    >
      <InboxPageHeader
        contentState={viewModel.contentStates.header}
        kicker={viewModel.kicker}
        modePills={viewModel.modePills}
        profileId={viewModel.profileId}
        purpose={viewModel.purpose}
        signals={viewModel.signals}
        title={viewModel.title}
      />

      <div className="grid gap-3 2xl:min-h-0 2xl:flex-1 2xl:grid-cols-[minmax(360px,560px)_minmax(680px,1fr)_minmax(360px,604px)] 2xl:items-stretch">
        <InboxQueue
          contentState={viewModel.contentStates.queue}
          emptyState={viewModel.queueEmptyState}
          filters={viewModel.filters}
          items={viewModel.queue}
          profileId={viewModel.profileId}
          quickCapture={viewModel.quickCapture}
        />
        <InboxActiveItemPanel
          activeItem={viewModel.activeItem}
          addToExistingEnabled={addToExistingEnabled}
          archiveEnabled={archiveEnabled}
          contentState={viewModel.contentStates.activeItem}
          existingTargets={viewModel.existingTargets}
          onSelectOutcomeRoute={setSelectedOutcomeRoute}
          outcome={viewModel.outcome}
          selectedOutcomeRoute={selectedOutcomeRoute}
          taskCreationEnabled={taskCreationEnabled}
          profileId={viewModel.profileId}
        />
        <InboxAIAssistantPanel
          viewModel={{
            ...viewModel,
            checklist,
          }}
        />
      </div>
    </div>
  );
}
