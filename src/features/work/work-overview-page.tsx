"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import type {
  WorkArchitectureItem,
  WorkArchitectureItemType,
  WorkFollowUp,
  WorkLogEntry,
  WorkLogStatus,
  WorkOverviewViewModel,
  WorkWikiEntry,
  WorkWikiType,
} from "./types";

type WorkStyle = CSSProperties & {
  "--accent"?: string;
};

type DialogKind = "log" | "wiki" | "follow-up" | null;

type InspectorState =
  | { type: "log"; id: string }
  | { type: "wiki"; id: string }
  | { type: "architecture"; id: string }
  | null;

type ToastState = {
  title: string;
  body: string;
  tone: "success" | "info" | "error";
};

type WorkSegment = "overview" | "log" | "wiki" | "architecture" | "follow-ups";

type LogDraft = {
  title: string;
  date: string;
  summary: string;
  accomplished: string;
  howItWasDone: string;
  blockers: string;
  followUps: string;
  linkedWikiEntryId: string;
  linkedArchitectureItemId: string;
  status: WorkLogStatus;
};

type WikiDraft = {
  title: string;
  type: WorkWikiType;
  summary: string;
  body: string;
  tags: string;
  status: WorkWikiEntry["status"];
  relatedArchitectureItemId: string;
  relatedLogEntryId: string;
  relatedTaskId: string;
};

type FollowUpDraft = {
  title: string;
  source: WorkFollowUp["source"];
  priority: WorkFollowUp["priority"];
  status: WorkFollowUp["status"];
  nextAction: string;
  linkedLogEntryId: string;
  linkedWikiEntryId: string;
};

const workAccent = "var(--accent-green)";
const referenceAccent = "var(--accent-cyan)";
const warningAccent = "var(--accent-orange)";
const riskAccent = "var(--accent-red)";
const mutedAccent = "var(--text-muted)";

const segments: readonly { value: WorkSegment; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "log", label: "Log" },
  { value: "wiki", label: "Wiki" },
  { value: "architecture", label: "Architecture" },
  { value: "follow-ups", label: "Follow-ups" },
];

const logStatuses: readonly WorkLogStatus[] = [
  "draft",
  "logged",
  "review_needed",
  "follow_up_open",
  "closed",
];

const wikiTypes: readonly WorkWikiType[] = [
  "concept",
  "process",
  "how_to",
  "architecture",
  "decision",
  "reference",
  "glossary",
  "checklist",
];

const architectureTypes: readonly WorkArchitectureItemType[] = [
  "system",
  "module",
  "service",
  "data_flow",
  "process",
  "interface",
  "dependency",
  "concept",
];

const logStatusMeta: Record<WorkLogStatus, { label: string; accent: string }> = {
  draft: { label: "Draft", accent: mutedAccent },
  logged: { label: "Logged", accent: workAccent },
  review_needed: { label: "Review needed", accent: warningAccent },
  follow_up_open: { label: "Follow-up open", accent: warningAccent },
  closed: { label: "Closed", accent: workAccent },
};

const architectureStatusMeta: Record<
  WorkArchitectureItem["status"],
  { label: string; accent: string }
> = {
  known: { label: "Known", accent: workAccent },
  learning: { label: "Learning", accent: referenceAccent },
  unclear: { label: "Unclear", accent: warningAccent },
  needs_review: { label: "Needs review", accent: riskAccent },
};

const followUpStatusMeta: Record<
  WorkFollowUp["status"],
  { label: string; accent: string }
> = {
  open: { label: "Open", accent: warningAccent },
  waiting: { label: "Waiting", accent: referenceAccent },
  done: { label: "Done", accent: workAccent },
  blocked: { label: "Blocked", accent: riskAccent },
};

const priorityMeta: Record<WorkFollowUp["priority"], { label: string; accent: string }> = {
  low: { label: "Low", accent: mutedAccent },
  medium: { label: "Medium", accent: referenceAccent },
  high: { label: "High", accent: warningAccent },
};

const sourceLabels: Record<WorkFollowUp["source"], string> = {
  work_log: "Work log",
  activity: "Activity",
  meeting: "Meeting",
  wiki: "Wiki",
  manual: "Manual",
};

const buttonBaseClass =
  "inline-flex min-h-11 items-center justify-center rounded-[12px] border px-4 text-[11px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50";

const primaryButtonClass = cn(
  buttonBaseClass,
  "border-[rgba(66,184,131,.36)] bg-[rgba(66,184,131,.92)] text-[var(--bg-app)] hover:bg-[rgba(66,184,131,1)]",
);

const secondaryButtonClass = cn(
  buttonBaseClass,
  "border-[var(--border-subtle)] bg-[rgba(18,28,43,.82)] text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]",
);

const quietButtonClass =
  "inline-flex min-h-9 items-center justify-center rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.58)] px-3 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50";

const inputClass =
  "mt-1 min-h-11 w-full rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.62)] px-3 text-[12px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--focus-ring)] disabled:opacity-60";

const textareaClass = cn(inputClass, "min-h-[104px] py-3");

function accentStyle(accent: string): WorkStyle {
  return { "--accent": accent };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}`;
}

function empty(value: string) {
  return value.trim().length === 0;
}

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function optionLabel(value: string) {
  return value
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function matchesSearch(values: readonly string[], query: string) {
  if (!query) {
    return true;
  }

  return normalize(values.join(" ")).includes(query);
}

function splitLines(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function findLog(logs: readonly WorkLogEntry[], id?: string) {
  return logs.find((entry) => entry.id === id) ?? null;
}

function findWiki(wikiEntries: readonly WorkWikiEntry[], id?: string) {
  return wikiEntries.find((entry) => entry.id === id) ?? null;
}

function findArchitecture(
  architectureItems: readonly WorkArchitectureItem[],
  id?: string,
) {
  return architectureItems.find((item) => item.id === id) ?? null;
}

function dialogBackdropClose(
  event: MouseEvent<HTMLDialogElement>,
  onClose: () => void,
) {
  if (event.target === event.currentTarget) {
    onClose();
  }
}

function Pill({
  children,
  accent = workAccent,
  quiet = false,
}: Readonly<{
  children: ReactNode;
  accent?: string;
  quiet?: boolean;
}>) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold text-[var(--text-secondary)]",
        quiet
          ? "border-[var(--border-subtle)] bg-[rgba(168,183,204,.06)]"
          : "border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]",
      )}
      style={accentStyle(accent)}
    >
      {children}
    </span>
  );
}

function Panel({
  title,
  subtitle,
  badge,
  children,
  className,
}: Readonly<{
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}>) {
  const id = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-section`;

  return (
    <section
      aria-labelledby={id}
      className={cn(
        "min-w-0 overflow-hidden rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[var(--surface-1)] shadow-[0_8px_22px_rgba(0,0,0,.12)]",
        className,
      )}
    >
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(14,23,38,.78)] px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              className="text-[18px] font-semibold leading-6 text-[var(--text-primary)]"
              id={id}
            >
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
                {subtitle}
              </p>
            ) : null}
          </div>
          {badge ? <div className="shrink-0">{badge}</div> : null}
        </div>
      </div>
      <div className="min-w-0 p-4 sm:p-5">{children}</div>
    </section>
  );
}

function FieldLabel({
  children,
  optional,
}: Readonly<{ children: ReactNode; optional?: boolean }>) {
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

function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: Readonly<{
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}>) {
  return (
    <div className="rounded-[14px] border border-dashed border-[var(--border-default)] bg-[rgba(168,183,204,.045)] p-4">
      <p className="text-sm font-semibold text-[var(--text-secondary)]">
        {title}
      </p>
      <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
        {description}
      </p>
      {actionLabel && onAction ? (
        <button className={cn(quietButtonClass, "mt-3")} onClick={onAction} type="button">
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function Metric({
  label,
  value,
  accent = workAccent,
}: Readonly<{ label: string; value: ReactNode; accent?: string }>) {
  return (
    <div
      className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-3"
      style={accentStyle(accent)}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-[18px] font-semibold leading-6 text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

function DialogShell({
  children,
  labelledBy,
  onClose,
  open,
  sheet = false,
}: Readonly<{
  children: ReactNode;
  labelledBy: string;
  onClose: () => void;
  open: boolean;
  sheet?: boolean;
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null);

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

  return (
    <dialog
      aria-labelledby={labelledBy}
      className={cn(
        "max-h-[calc(100dvh-24px)] overflow-hidden border border-[var(--border-default)] bg-[var(--surface-1)] p-0 text-left text-[var(--text-primary)] shadow-[0_24px_80px_rgba(0,0,0,.48)] backdrop:bg-[rgba(0,0,0,.58)]",
        sheet
          ? "fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-dvh w-[min(560px,100vw)] rounded-none border-y-0 border-r-0"
          : "w-[min(760px,calc(100vw-24px))] rounded-[18px]",
      )}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onMouseDown={(event) => dialogBackdropClose(event, onClose)}
      ref={dialogRef}
    >
      {children}
    </dialog>
  );
}

function Toast({
  toast,
  onDismiss,
}: Readonly<{ toast: ToastState | null; onDismiss: () => void }>) {
  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = setTimeout(onDismiss, 4200);

    return () => clearTimeout(timeout);
  }, [onDismiss, toast]);

  if (!toast) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-40 w-[min(420px,calc(100vw-32px))] rounded-[14px] border bg-[rgba(18,28,43,.96)] p-4 shadow-[0_18px_48px_rgba(0,0,0,.38)]",
        toast.tone === "success" && "border-[rgba(66,184,131,.34)]",
        toast.tone === "info" && "border-[rgba(95,200,215,.34)]",
        toast.tone === "error" && "border-[rgba(221,107,95,.34)]",
      )}
      role="status"
    >
      <p className="text-[14px] font-semibold text-[var(--text-primary)]">
        {toast.title}
      </p>
      <p className="mt-1 text-[11px] leading-4 text-[var(--text-secondary)]">
        {toast.body}
      </p>
    </div>
  );
}

function WorkHeader({
  onAddFollowUp,
  onAddWiki,
  onLogEntry,
}: Readonly<{
  onAddFollowUp: () => void;
  onAddWiki: () => void;
  onLogEntry: () => void;
}>) {
  return (
    <header className="rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[var(--surface-1)] px-4 py-5 shadow-[0_8px_22px_rgba(0,0,0,.12)] sm:px-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-green)]">
            Work · Area Overview
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight text-[var(--text-primary)]">
            Work Overview
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            Work log, outcomes, architecture context and wiki lookup
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-4 xl:flex xl:justify-end">
          <button className={primaryButtonClass} onClick={onLogEntry} type="button">
            Log work entry
          </button>
          <button className={secondaryButtonClass} onClick={onAddWiki} type="button">
            Add wiki note
          </button>
          <button className={secondaryButtonClass} onClick={onAddFollowUp} type="button">
            Add follow-up
          </button>
          <Link className={secondaryButtonClass} href="/work/wiki">
            Open wiki
          </Link>
        </div>
      </div>
    </header>
  );
}

function WorkFilters({
  architectureTypeFilter,
  blockerFilter,
  followUpFilter,
  priorityFilter,
  search,
  segment,
  statusFilter,
  wikiTypeFilter,
  onArchitectureTypeFilter,
  onBlockerFilter,
  onFollowUpFilter,
  onPriorityFilter,
  onSearch,
  onSegment,
  onStatusFilter,
  onWikiTypeFilter,
}: Readonly<{
  architectureTypeFilter: string;
  blockerFilter: string;
  followUpFilter: string;
  priorityFilter: string;
  search: string;
  segment: WorkSegment;
  statusFilter: string;
  wikiTypeFilter: string;
  onArchitectureTypeFilter: (value: string) => void;
  onBlockerFilter: (value: string) => void;
  onFollowUpFilter: (value: string) => void;
  onPriorityFilter: (value: string) => void;
  onSearch: (value: string) => void;
  onSegment: (value: WorkSegment) => void;
  onStatusFilter: (value: string) => void;
  onWikiTypeFilter: (value: string) => void;
}>) {
  return (
    <section
      aria-label="Work filters"
      className="rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-3"
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(240px,360px)_1fr]">
        <label htmlFor="work-search">
          <FieldLabel>Search</FieldLabel>
          <input
            className={inputClass}
            id="work-search"
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search work"
            type="search"
            value={search}
          />
        </label>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
          <label htmlFor="work-status-filter">
            <FieldLabel>Status</FieldLabel>
            <select
              className={inputClass}
              id="work-status-filter"
              onChange={(event) => onStatusFilter(event.target.value)}
              value={statusFilter}
            >
              <option value="all">All statuses</option>
              {logStatuses.map((status) => (
                <option key={status} value={status}>
                  {logStatusMeta[status].label}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="work-wiki-type-filter">
            <FieldLabel>Wiki Type</FieldLabel>
            <select
              className={inputClass}
              id="work-wiki-type-filter"
              onChange={(event) => onWikiTypeFilter(event.target.value)}
              value={wikiTypeFilter}
            >
              <option value="all">All wiki</option>
              {wikiTypes.map((type) => (
                <option key={type} value={type}>
                  {optionLabel(type)}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="work-architecture-type-filter">
            <FieldLabel>Architecture Type</FieldLabel>
            <select
              className={inputClass}
              id="work-architecture-type-filter"
              onChange={(event) => onArchitectureTypeFilter(event.target.value)}
              value={architectureTypeFilter}
            >
              <option value="all">All architecture</option>
              {architectureTypes.map((type) => (
                <option key={type} value={type}>
                  {optionLabel(type)}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="work-priority-filter">
            <FieldLabel>Follow-up Priority</FieldLabel>
            <select
              className={inputClass}
              id="work-priority-filter"
              onChange={(event) => onPriorityFilter(event.target.value)}
              value={priorityFilter}
            >
              <option value="all">All priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
          <label htmlFor="work-blocker-filter">
            <FieldLabel>Has blocker</FieldLabel>
            <select
              className={inputClass}
              id="work-blocker-filter"
              onChange={(event) => onBlockerFilter(event.target.value)}
              value={blockerFilter}
            >
              <option value="all">All logs</option>
              <option value="yes">Has blocker</option>
              <option value="no">No blocker</option>
            </select>
          </label>
          <label htmlFor="work-follow-up-filter">
            <FieldLabel>Has follow-up</FieldLabel>
            <select
              className={inputClass}
              id="work-follow-up-filter"
              onChange={(event) => onFollowUpFilter(event.target.value)}
              value={followUpFilter}
            >
              <option value="all">All logs</option>
              <option value="yes">Has follow-up</option>
              <option value="no">No follow-up</option>
            </select>
          </label>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Work view">
        {segments.map((item, index) => (
          <button
            aria-pressed={segment === item.value}
            className={cn(
              quietButtonClass,
              segment === item.value &&
                "border-[rgba(66,184,131,.42)] bg-[rgba(66,184,131,.14)] text-[var(--text-primary)]",
            )}
            key={`work-overview-segment-${index}`}
            onClick={() => onSegment(item.value)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function CurrentWorkJournal({
  entry,
  linkedArchitecture,
  linkedWiki,
  onContinueDraft,
  onLogEntry,
  onOpenArchitecture,
  onOpenEntry,
  onOpenWiki,
}: Readonly<{
  entry: WorkLogEntry | null;
  linkedArchitecture: readonly WorkArchitectureItem[];
  linkedWiki: readonly WorkWikiEntry[];
  onContinueDraft: () => void;
  onLogEntry: () => void;
  onOpenArchitecture: (item: WorkArchitectureItem) => void;
  onOpenEntry: (entry: WorkLogEntry) => void;
  onOpenWiki: (entry: WorkWikiEntry) => void;
}>) {
  if (!entry) {
    return (
      <Panel
        className="border-[rgba(66,184,131,.30)]"
        subtitle="Work journal appears here once an entry exists."
        title="Current Work Journal"
      >
        <EmptyState
          actionLabel="Log work entry"
          description="Create a local work log entry with outcome, method and follow-ups."
          onAction={onLogEntry}
          title="No work log entry yet"
        />
      </Panel>
    );
  }

  return (
    <section
      aria-labelledby="current-work-journal-title"
      className="overflow-hidden rounded-[var(--panel-radius)] border border-[rgba(66,184,131,.34)] bg-[linear-gradient(180deg,rgba(15,23,36,.98),rgba(15,23,36,.92))] shadow-[0_8px_22px_rgba(0,0,0,.12)]"
    >
      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-green)]">
                Current Work Journal
              </p>
              <h2
                className="mt-2 text-2xl font-semibold leading-7 text-[var(--text-primary)]"
                id="current-work-journal-title"
              >
                {entry.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {entry.summary}
              </p>
            </div>
            <Pill accent={logStatusMeta[entry.status].accent}>
              {logStatusMeta[entry.status].label}
            </Pill>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <JournalBlock label="Done" value={entry.accomplished} />
            <JournalBlock label="How" value={entry.howItWasDone} />
          </div>
          <div className="mt-4 rounded-[16px] border border-[rgba(217,146,79,.24)] bg-[rgba(217,146,79,.07)] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-orange)]">
              Open Follow-ups
            </p>
            {entry.followUps.length > 0 ? (
              <ul className="mt-2 grid gap-2">
                {entry.followUps.slice(0, 3).map((followUp) => (
                  <li
                    className="text-[12px] leading-5 text-[var(--text-primary)]"
                    key={followUp}
                  >
                    {followUp}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[12px] text-[var(--text-secondary)]">
                No open follow-up on this journal entry.
              </p>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className={primaryButtonClass} onClick={onLogEntry} type="button">
              Log entry
            </button>
            <button className={secondaryButtonClass} onClick={onContinueDraft} type="button">
              Continue draft
            </button>
            <button
              className={secondaryButtonClass}
              onClick={() => onOpenEntry(entry)}
              type="button"
            >
              Open entry
            </button>
          </div>
        </div>
        <div className="border-t border-[var(--border-subtle)] bg-[rgba(7,11,18,.26)] p-4 sm:p-5 xl:border-l xl:border-t-0">
          <div className="grid gap-3">
            <Metric label="Date" value={formatDate(entry.date)} />
            <Metric
              accent={referenceAccent}
              label="Linked Wiki"
              value={linkedWiki.length}
            />
            <Metric
              accent={referenceAccent}
              label="Architecture"
              value={linkedArchitecture.length}
            />
            <Metric
              accent={warningAccent}
              label="Blockers"
              value={entry.blockers.length}
            />
          </div>
          <div className="mt-4 grid gap-2">
            {linkedWiki.slice(0, 2).map((wiki) => (
              <button
                className={quietButtonClass}
                key={wiki.id}
                onClick={() => onOpenWiki(wiki)}
                type="button"
              >
                {wiki.title}
              </button>
            ))}
            {linkedArchitecture.slice(0, 2).map((item) => (
              <button
                className={quietButtonClass}
                key={item.id}
                onClick={() => onOpenArchitecture(item)}
                type="button"
              >
                {item.title}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function JournalBlock({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
        {value}
      </p>
    </div>
  );
}

export function WorkOverviewPage({
  viewModel,
}: Readonly<{ viewModel: WorkOverviewViewModel }>) {
  const [logs, setLogs] = useState<WorkLogEntry[]>(viewModel.logs);
  const [wikiEntries, setWikiEntries] = useState<WorkWikiEntry[]>(
    viewModel.wikiEntries,
  );
  const [followUps, setFollowUps] = useState<WorkFollowUp[]>(
    viewModel.followUps,
  );
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState<WorkSegment>("overview");
  const [statusFilter, setStatusFilter] = useState("all");
  const [wikiTypeFilter, setWikiTypeFilter] = useState("all");
  const [architectureTypeFilter, setArchitectureTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [blockerFilter, setBlockerFilter] = useState("all");
  const [followUpFilter, setFollowUpFilter] = useState("all");
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [inspector, setInspector] = useState<InspectorState>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [logDraft, setLogDraft] = useState<LogDraft>(() =>
    initialLogDraft(viewModel.wikiEntries, viewModel.architectureItems),
  );
  const [wikiDraft, setWikiDraft] = useState<WikiDraft>(() =>
    initialWikiDraft(viewModel.logs, viewModel.architectureItems),
  );
  const [followUpDraft, setFollowUpDraft] = useState<FollowUpDraft>(() =>
    initialFollowUpDraft(viewModel.logs, viewModel.wikiEntries),
  );

  const dismissToast = useCallback(() => setToast(null), []);
  const query = normalize(search);

  const sortedLogs = useMemo(
    () =>
      logs
        .slice()
        .sort(
          (first, second) =>
            new Date(second.date).getTime() - new Date(first.date).getTime(),
        ),
    [logs],
  );

  const filteredLogs = useMemo(
    () =>
      sortedLogs.filter(
        (entry) =>
          (statusFilter === "all" || entry.status === statusFilter) &&
          (blockerFilter === "all" ||
            (blockerFilter === "yes" && entry.blockers.length > 0) ||
            (blockerFilter === "no" && entry.blockers.length === 0)) &&
          (followUpFilter === "all" ||
            (followUpFilter === "yes" && entry.followUps.length > 0) ||
            (followUpFilter === "no" && entry.followUps.length === 0)) &&
          matchesSearch(
            [
              entry.title,
              entry.summary,
              entry.accomplished,
              entry.howItWasDone,
              entry.blockers.join(" "),
              entry.followUps.join(" "),
              logStatusMeta[entry.status].label,
            ],
            query,
          ),
      ),
    [blockerFilter, followUpFilter, query, sortedLogs, statusFilter],
  );

  const filteredWiki = useMemo(
    () =>
      wikiEntries.filter(
        (entry) =>
          (wikiTypeFilter === "all" || entry.type === wikiTypeFilter) &&
          matchesSearch(
            [
              entry.title,
              entry.summary,
              entry.tags.join(" "),
              optionLabel(entry.type),
            ],
            query,
          ),
      ),
    [query, wikiEntries, wikiTypeFilter],
  );

  const filteredArchitecture = useMemo(
    () =>
      viewModel.architectureItems.filter(
        (item) =>
          (architectureTypeFilter === "all" ||
            item.type === architectureTypeFilter) &&
          matchesSearch(
            [
              item.title,
              item.summary,
              item.note,
              optionLabel(item.type),
              architectureStatusMeta[item.status].label,
            ],
            query,
          ),
      ),
    [architectureTypeFilter, query, viewModel.architectureItems],
  );

  const filteredFollowUps = useMemo(
    () =>
      followUps.filter(
        (followUp) =>
          followUp.status !== "done" &&
          (priorityFilter === "all" || followUp.priority === priorityFilter) &&
          matchesSearch(
            [
              followUp.title,
              followUp.nextAction,
              sourceLabels[followUp.source],
              followUpStatusMeta[followUp.status].label,
              priorityMeta[followUp.priority].label,
            ],
            query,
          ),
      ),
    [followUps, priorityFilter, query],
  );

  const currentEntry = sortedLogs[0] ?? null;
  const currentLinkedWiki = currentEntry
    ? currentEntry.linkedWikiEntryIds
        .map((id) => findWiki(wikiEntries, id))
        .filter((entry): entry is WorkWikiEntry => Boolean(entry))
    : [];
  const currentLinkedArchitecture = currentEntry
    ? currentEntry.linkedArchitectureItemIds
        .map((id) => findArchitecture(viewModel.architectureItems, id))
        .filter((item): item is WorkArchitectureItem => Boolean(item))
    : [];
  const selectedLog =
    inspector?.type === "log" ? findLog(logs, inspector.id) : null;
  const selectedWiki =
    inspector?.type === "wiki" ? findWiki(wikiEntries, inspector.id) : null;
  const selectedArchitecture =
    inspector?.type === "architecture"
      ? findArchitecture(viewModel.architectureItems, inspector.id)
      : null;
  const openFollowUpCount = followUps.filter((followUp) => followUp.status !== "done").length;
  const linkedWikiCount = wikiEntries.filter(
    (entry) => entry.relatedLogEntryIds.length > 0,
  ).length;
  const unclearArchitectureCount = viewModel.architectureItems.filter((item) =>
    ["unclear", "needs_review"].includes(item.status),
  ).length;

  function showSection(section: Exclude<WorkSegment, "overview">) {
    return segment === "overview" || segment === section;
  }

  function openDialog(kind: DialogKind, context: { logId?: string; wikiId?: string; architectureId?: string } = {}) {
    setDialogError(null);
    setInspector(null);

    if (kind === "log") {
      setLogDraft(initialLogDraft(wikiEntries, viewModel.architectureItems));
    }

    if (kind === "wiki") {
      setWikiDraft(initialWikiDraft(logs, viewModel.architectureItems, context));
    }

    if (kind === "follow-up") {
      setFollowUpDraft(initialFollowUpDraft(logs, wikiEntries, context));
    }

    setDialog(kind);
  }

  function openDraft() {
    const draftSource = currentEntry;

    setDialogError(null);
    setInspector(null);
    setLogDraft({
      title: draftSource ? `${draftSource.title} · Draft` : "Work Block Draft",
      date: today(),
      summary: draftSource?.summary ?? "Aktuellen Arbeitsblock neutral zusammenfassen.",
      accomplished: draftSource?.accomplished ?? "",
      howItWasDone: draftSource?.howItWasDone ?? "",
      blockers: draftSource?.blockers.join("\n") ?? "",
      followUps: draftSource?.followUps.join("\n") ?? "",
      linkedWikiEntryId: draftSource?.linkedWikiEntryIds[0] ?? wikiEntries[0]?.id ?? "",
      linkedArchitectureItemId:
        draftSource?.linkedArchitectureItemIds[0] ??
        viewModel.architectureItems[0]?.id ??
        "",
      status: "draft",
    });
    setDialog("log");
  }

  function closeDialog() {
    setDialog(null);
    setDialogError(null);
  }

  function submitLog() {
    if (
      empty(logDraft.title) ||
      empty(logDraft.summary) ||
      empty(logDraft.accomplished) ||
      empty(logDraft.howItWasDone)
    ) {
      setDialogError(
        "Complete Title, What was done, What was accomplished and How it was done before saving.",
      );
      return;
    }

    const entry: WorkLogEntry = {
      id: createId("work-log-local"),
      title: logDraft.title.trim(),
      date: logDraft.date || today(),
      status: logDraft.status,
      taskIds: [],
      activityIds: [],
      summary: logDraft.summary.trim(),
      accomplished: logDraft.accomplished.trim(),
      howItWasDone: logDraft.howItWasDone.trim(),
      blockers: splitLines(logDraft.blockers),
      followUps: splitLines(logDraft.followUps),
      linkedWikiEntryIds: logDraft.linkedWikiEntryId ? [logDraft.linkedWikiEntryId] : [],
      linkedArchitectureItemIds: logDraft.linkedArchitectureItemId
        ? [logDraft.linkedArchitectureItemId]
        : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setLogs((current) => [entry, ...current]);
    setToast({
      title: "Work entry logged locally",
      body: "The entry is mock/local state only and contains no external work data.",
      tone: "success",
    });
    closeDialog();
  }

  function submitWiki() {
    if (empty(wikiDraft.title) || empty(wikiDraft.summary)) {
      setDialogError("Complete Title and Summary before saving.");
      return;
    }

    const entry: WorkWikiEntry = {
      id: createId("work-wiki-local"),
      title: wikiDraft.title.trim(),
      type: wikiDraft.type,
      summary: wikiDraft.summary.trim(),
      body: wikiDraft.body.trim() || wikiDraft.summary.trim(),
      tags: splitLines(wikiDraft.tags),
      status: wikiDraft.status,
      lastReviewedAt: today(),
      relatedArchitectureItemIds: wikiDraft.relatedArchitectureItemId
        ? [wikiDraft.relatedArchitectureItemId]
        : [],
      relatedLogEntryIds: wikiDraft.relatedLogEntryId ? [wikiDraft.relatedLogEntryId] : [],
      relatedTaskIds: wikiDraft.relatedTaskId ? [wikiDraft.relatedTaskId] : [],
    };

    setWikiEntries((current) => [entry, ...current]);
    setToast({
      title: "Wiki note added locally",
      body: "This is a personal lookup note, not official documentation.",
      tone: "success",
    });
    closeDialog();
  }

  function submitFollowUp() {
    if (empty(followUpDraft.title) || empty(followUpDraft.nextAction)) {
      setDialogError("Complete Title and Next Action before saving.");
      return;
    }

    const followUp: WorkFollowUp = {
      id: createId("work-follow-up-local"),
      title: followUpDraft.title.trim(),
      source: followUpDraft.source,
      priority: followUpDraft.priority,
      status: followUpDraft.status,
      nextAction: followUpDraft.nextAction.trim(),
      linkedLogEntryId: followUpDraft.linkedLogEntryId || undefined,
      linkedWikiEntryId: followUpDraft.linkedWikiEntryId || undefined,
    };

    setFollowUps((current) => [followUp, ...current]);
    setToast({
      title: "Follow-up added locally",
      body: "No task, calendar or company system was updated.",
      tone: "success",
    });
    closeDialog();
  }

  function markFollowUpDone(followUp: WorkFollowUp) {
    setFollowUps((current) =>
      current.map((entry) =>
        entry.id === followUp.id ? { ...entry, status: "done" } : entry,
      ),
    );
    setToast({
      title: "Follow-up marked done locally",
      body: "The status changed only in local UI state.",
      tone: "success",
    });
  }

  function openFollowUpSource(followUp: WorkFollowUp) {
    if (followUp.linkedLogEntryId) {
      setInspector({ type: "log", id: followUp.linkedLogEntryId });
      return;
    }

    if (followUp.linkedWikiEntryId) {
      setInspector({ type: "wiki", id: followUp.linkedWikiEntryId });
      return;
    }

    setToast({
      title: "No source linked",
      body: "This manual follow-up has no linked source yet.",
      tone: "info",
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-[2208px] flex-col gap-4 pb-8">
      <WorkHeader
        onAddFollowUp={() => openDialog("follow-up")}
        onAddWiki={() => openDialog("wiki")}
        onLogEntry={() => openDialog("log")}
      />

      <WorkFilters
        architectureTypeFilter={architectureTypeFilter}
        blockerFilter={blockerFilter}
        followUpFilter={followUpFilter}
        onArchitectureTypeFilter={setArchitectureTypeFilter}
        onBlockerFilter={setBlockerFilter}
        onFollowUpFilter={setFollowUpFilter}
        onPriorityFilter={setPriorityFilter}
        onSearch={setSearch}
        onSegment={setSegment}
        onStatusFilter={setStatusFilter}
        onWikiTypeFilter={setWikiTypeFilter}
        priorityFilter={priorityFilter}
        search={search}
        segment={segment}
        statusFilter={statusFilter}
        wikiTypeFilter={wikiTypeFilter}
      />

      <CurrentWorkJournal
        entry={currentEntry}
        linkedArchitecture={currentLinkedArchitecture}
        linkedWiki={currentLinkedWiki}
        onContinueDraft={openDraft}
        onLogEntry={() => openDialog("log")}
        onOpenArchitecture={(item) =>
          setInspector({ type: "architecture", id: item.id })
        }
        onOpenEntry={(entry) => setInspector({ type: "log", id: entry.id })}
        onOpenWiki={(entry) => setInspector({ type: "wiki", id: entry.id })}
      />

      <QuickActions
        onAddFollowUp={() => openDialog("follow-up")}
        onAddWiki={() => openDialog("wiki")}
        onLogEntry={() => openDialog("log")}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <OpenFollowUpsPanel
          followUps={filteredFollowUps}
          onAddFollowUp={() => openDialog("follow-up")}
          onMarkDone={markFollowUpDone}
          onOpenSource={openFollowUpSource}
        />
        <WorkSignals
          linkedWikiCount={linkedWikiCount}
          openFollowUpCount={openFollowUpCount}
          unclearArchitectureCount={unclearArchitectureCount}
          workEntryCount={logs.length}
        />
      </div>

      {showSection("log") ? (
        <RecentWorkLogPanel
          entries={filteredLogs}
          onLogEntry={() => openDialog("log")}
          onOpen={(entry) => setInspector({ type: "log", id: entry.id })}
          query={query}
        />
      ) : null}

      {showSection("architecture") ? (
        <ArchitectureSnapshot
          architectureItems={filteredArchitecture}
          onAddWiki={(item) => openDialog("wiki", { architectureId: item.id })}
          onOpen={(item) => setInspector({ type: "architecture", id: item.id })}
          query={query}
        />
      ) : null}

      {showSection("wiki") ? (
        <WikiLookupPanel
          onAddWiki={() => openDialog("wiki")}
          onOpen={(entry) => setInspector({ type: "wiki", id: entry.id })}
          query={query}
          wikiEntries={filteredWiki}
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <WorkSectionsPanel sections={viewModel.sections} />
        <RecentMeetingsPanel meetings={viewModel.meetings} />
      </div>

      <WorkPrivacyNotes notes={viewModel.privacyNotes} />

      {dialog ? (
        <DialogShell labelledBy="work-dialog-heading" onClose={closeDialog} open>
          <WorkFormDialog
            architectureItems={viewModel.architectureItems}
            dialog={dialog}
            dialogError={dialogError}
            followUpDraft={followUpDraft}
            logDraft={logDraft}
            logs={logs}
            onClose={closeDialog}
            onFollowUpDraft={setFollowUpDraft}
            onLogDraft={setLogDraft}
            onSubmitFollowUp={submitFollowUp}
            onSubmitLog={submitLog}
            onSubmitWiki={submitWiki}
            onWikiDraft={setWikiDraft}
            wikiDraft={wikiDraft}
            wikiEntries={wikiEntries}
          />
        </DialogShell>
      ) : null}

      <WorkInspector
        architectureItems={viewModel.architectureItems}
        followUps={followUps}
        inspector={inspector}
        logs={logs}
        onAddFollowUp={(logId) => openDialog("follow-up", { logId })}
        onAddWiki={(architectureId) => openDialog("wiki", { architectureId })}
        onClose={() => setInspector(null)}
        onEditLog={(entry) => {
          setLogDraft({
            title: entry.title,
            date: entry.date,
            summary: entry.summary,
            accomplished: entry.accomplished,
            howItWasDone: entry.howItWasDone,
            blockers: entry.blockers.join("\n"),
            followUps: entry.followUps.join("\n"),
            linkedWikiEntryId: entry.linkedWikiEntryIds[0] ?? wikiEntries[0]?.id ?? "",
            linkedArchitectureItemId:
              entry.linkedArchitectureItemIds[0] ??
              viewModel.architectureItems[0]?.id ??
              "",
            status: "draft",
          });
          setDialogError(null);
          setInspector(null);
          setDialog("log");
        }}
        onEditWiki={(entry) => {
          setWikiDraft({
            title: entry.title,
            type: entry.type,
            summary: entry.summary,
            body: entry.body,
            tags: entry.tags.join(", "),
            status: entry.status,
            relatedArchitectureItemId:
              entry.relatedArchitectureItemIds[0] ??
              viewModel.architectureItems[0]?.id ??
              "",
            relatedLogEntryId: entry.relatedLogEntryIds[0] ?? logs[0]?.id ?? "",
            relatedTaskId: entry.relatedTaskIds[0] ?? "",
          });
          setDialogError(null);
          setInspector(null);
          setDialog("wiki");
        }}
        selectedArchitecture={selectedArchitecture}
        selectedLog={selectedLog}
        selectedWiki={selectedWiki}
        wikiEntries={wikiEntries}
      />
      <Toast onDismiss={dismissToast} toast={toast} />
    </div>
  );
}

function QuickActions({
  onAddFollowUp,
  onAddWiki,
  onLogEntry,
}: Readonly<{
  onAddFollowUp: () => void;
  onAddWiki: () => void;
  onLogEntry: () => void;
}>) {
  return (
    <section aria-label="Work quick actions" className="grid gap-2 sm:grid-cols-3">
      <button className={primaryButtonClass} onClick={onLogEntry} type="button">
        Log Entry
      </button>
      <button className={secondaryButtonClass} onClick={onAddWiki} type="button">
        Add Wiki Note
      </button>
      <button className={secondaryButtonClass} onClick={onAddFollowUp} type="button">
        Add Follow-up
      </button>
    </section>
  );
}

function OpenFollowUpsPanel({
  followUps,
  onAddFollowUp,
  onMarkDone,
  onOpenSource,
}: Readonly<{
  followUps: readonly WorkFollowUp[];
  onAddFollowUp: () => void;
  onMarkDone: (followUp: WorkFollowUp) => void;
  onOpenSource: (followUp: WorkFollowUp) => void;
}>) {
  return (
    <Panel
      badge={<Pill accent={warningAccent}>{followUps.length} open</Pill>}
      subtitle="Prioritized open loops without turning Work into a task board."
      title="Open Follow-ups"
    >
      {followUps.length === 0 ? (
        <EmptyState
          actionLabel="Add follow-up"
          description="Capture a local follow-up when a work note needs a next check."
          onAction={onAddFollowUp}
          title="No open follow-ups match the filters"
        />
      ) : (
        <div className="grid gap-3">
          {followUps.map((followUp) => (
            <article
              className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-4"
              key={followUp.id}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="text-[14px] font-semibold leading-5 text-[var(--text-primary)]">
                    {followUp.title}
                  </h3>
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    {sourceLabels[followUp.source]}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Pill accent={priorityMeta[followUp.priority].accent}>
                    {priorityMeta[followUp.priority].label}
                  </Pill>
                  <Pill accent={followUpStatusMeta[followUp.status].accent}>
                    {followUpStatusMeta[followUp.status].label}
                  </Pill>
                </div>
              </div>
              <p className="mt-3 text-[12px] leading-5 text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text-primary)]">Next:</span>{" "}
                {followUp.nextAction}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className={quietButtonClass}
                  onClick={() => onMarkDone(followUp)}
                  type="button"
                >
                  Mark done
                </button>
                <button
                  className={quietButtonClass}
                  onClick={() => onOpenSource(followUp)}
                  type="button"
                >
                  Open source
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </Panel>
  );
}

function WorkSignals({
  linkedWikiCount,
  openFollowUpCount,
  unclearArchitectureCount,
  workEntryCount,
}: Readonly<{
  linkedWikiCount: number;
  openFollowUpCount: number;
  unclearArchitectureCount: number;
  workEntryCount: number;
}>) {
  return (
    <Panel
      subtitle="Small text signals only. No productivity scoring."
      title="Work Signals"
    >
      <div className="grid gap-2">
        <Metric label="Work entries" value={`${Math.min(3, workEntryCount)} this week`} />
        <Metric
          accent={warningAccent}
          label="Follow-ups"
          value={`${openFollowUpCount} open`}
        />
        <Metric
          accent={referenceAccent}
          label="Wiki notes"
          value={`${linkedWikiCount} linked`}
        />
        <Metric
          accent={warningAccent}
          label="Architecture"
          value={`${unclearArchitectureCount} unclear`}
        />
      </div>
    </Panel>
  );
}

function RecentWorkLogPanel({
  entries,
  onLogEntry,
  onOpen,
  query,
}: Readonly<{
  entries: readonly WorkLogEntry[];
  onLogEntry: () => void;
  onOpen: (entry: WorkLogEntry) => void;
  query: string;
}>) {
  return (
    <Panel
      badge={<Pill>{entries.length} entries</Pill>}
      subtitle="Recent work journal entries with outcome and method snippets."
      title="Recent Work Log"
    >
      {entries.length === 0 ? (
        <EmptyState
          actionLabel="Log work entry"
          description="No work entry matches the current filters."
          onAction={onLogEntry}
          title={query ? "No work logs match the filters" : "No work logs yet"}
        />
      ) : (
        <div className="grid gap-3">
          {entries.slice(0, 7).map((entry) => (
            <article
              className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-4 transition hover:border-[var(--border-default)]"
              key={entry.id}
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <button
                    className="text-left text-[14px] font-semibold leading-5 text-[var(--text-primary)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                    onClick={() => onOpen(entry)}
                    type="button"
                  >
                    {entry.title}
                  </button>
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    {formatDate(entry.date)} · {entry.followUps.length} follow-ups ·{" "}
                    {entry.linkedWikiEntryIds.length} wiki links
                  </p>
                </div>
                <Pill accent={logStatusMeta[entry.status].accent}>
                  {logStatusMeta[entry.status].label}
                </Pill>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <p className="text-[12px] leading-5 text-[var(--text-secondary)]">
                  <span className="font-semibold text-[var(--text-primary)]">Done:</span>{" "}
                  {entry.accomplished}
                </p>
                <p className="text-[12px] leading-5 text-[var(--text-secondary)]">
                  <span className="font-semibold text-[var(--text-primary)]">How:</span>{" "}
                  {entry.howItWasDone}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </Panel>
  );
}

function ArchitectureSnapshot({
  architectureItems,
  onAddWiki,
  onOpen,
  query,
}: Readonly<{
  architectureItems: readonly WorkArchitectureItem[];
  onAddWiki: (item: WorkArchitectureItem) => void;
  onOpen: (item: WorkArchitectureItem) => void;
  query: string;
}>) {
  return (
    <Panel
      badge={<Pill accent={referenceAccent}>{architectureItems.length} items</Pill>}
      subtitle="Personal learning map: Input / Import -> Validation -> Processing -> Review / Output."
      title="Architecture Snapshot"
    >
      {architectureItems.length === 0 ? (
        <EmptyState
          description="Architecture context appears here as simple text cards, not as a system graph."
          title={query ? "No architecture items match the filters" : "No architecture items yet"}
        />
      ) : (
        <div className="grid gap-3 xl:grid-cols-4">
          {architectureItems.map((item) => (
            <article
              className="rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-4"
              key={item.id}
            >
              <div className="flex flex-wrap gap-2">
                <Pill accent={architectureStatusMeta[item.status].accent}>
                  {architectureStatusMeta[item.status].label}
                </Pill>
                <Pill accent={referenceAccent}>{optionLabel(item.type)}</Pill>
              </div>
              <h3 className="mt-3 text-[14px] font-semibold leading-5 text-[var(--text-primary)]">
                {item.title}
              </h3>
              <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
                {item.summary}
              </p>
              <p className="mt-2 text-[11px] leading-4 text-[var(--text-muted)]">
                Related: {item.relatedIds.length} · Wiki: {item.wikiEntryIds.length}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className={quietButtonClass} onClick={() => onOpen(item)} type="button">
                  Open architecture note
                </button>
                <button
                  className={quietButtonClass}
                  onClick={() => onAddWiki(item)}
                  type="button"
                >
                  Add wiki note
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </Panel>
  );
}

function WikiLookupPanel({
  onAddWiki,
  onOpen,
  query,
  wikiEntries,
}: Readonly<{
  onAddWiki: () => void;
  onOpen: (entry: WorkWikiEntry) => void;
  query: string;
  wikiEntries: readonly WorkWikiEntry[];
}>) {
  return (
    <Panel
      badge={<Pill accent={referenceAccent}>{wikiEntries.length} notes</Pill>}
      subtitle="Personal lookup notes, not official company documentation."
      title="Wiki Lookup"
    >
      <label className="mb-3 block" htmlFor="work-wiki-local-search-note">
        <FieldLabel>Search work wiki</FieldLabel>
        <input
          className={inputClass}
          disabled
          id="work-wiki-local-search-note"
          placeholder="Use Search work above"
        />
      </label>
      {wikiEntries.length === 0 ? (
        <EmptyState
          actionLabel="Add wiki note"
          description="Add a personal lookup note for a process, concept or how-to."
          onAction={onAddWiki}
          title={query ? "No wiki entries match the filters" : "No wiki entries yet"}
        />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {wikiEntries.map((entry) => (
            <article
              className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-4"
              key={entry.id}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <button
                    className="text-left text-[14px] font-semibold leading-5 text-[var(--text-primary)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                    onClick={() => onOpen(entry)}
                    type="button"
                  >
                    {entry.title}
                  </button>
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    {optionLabel(entry.type)} · reviewed{" "}
                    {entry.lastReviewedAt ? formatDate(entry.lastReviewedAt) : "not yet"}
                  </p>
                </div>
                <Pill accent={referenceAccent}>
                  {entry.relatedArchitectureItemIds.length} architecture
                </Pill>
              </div>
              <p className="mt-3 text-[12px] leading-5 text-[var(--text-secondary)]">
                {entry.summary}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {entry.tags.map((tag) => (
                  <Pill key={tag} quiet>
                    #{tag}
                  </Pill>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </Panel>
  );
}

function WorkSectionsPanel({
  sections,
}: Readonly<{ sections: WorkOverviewViewModel["sections"] }>) {
  return (
    <Panel
      subtitle="The canonical Work subroutes already exist and remain the next step for deeper work."
      title="Work Sections"
    >
      <div className="grid gap-3">
        {sections.map((section) => (
          <article
            className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-4"
            key={section.id}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">
                  {section.title}
                </h3>
                <p className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)]">
                  {section.purpose}
                </p>
              </div>
              <Pill accent={section.openItems > 0 ? warningAccent : workAccent}>
                {section.openItems} open
              </Pill>
            </div>
            <p className="mt-3 text-[11px] text-[var(--text-muted)]">
              Last: {section.lastActivity}
            </p>
            <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
              Next: {section.nextAction}
            </p>
            <Link className={cn(quietButtonClass, "mt-3")} href={section.href}>
              Open {section.title}
            </Link>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function RecentMeetingsPanel({
  meetings,
}: Readonly<{ meetings: WorkOverviewViewModel["meetings"] }>) {
  return (
    <Panel
      badge={<Pill quiet>{meetings.length} contexts</Pill>}
      subtitle="Meeting context only. Full meeting workflows stay on the Meetings route."
      title="Recent Meetings"
    >
      <div className="grid gap-3">
        {meetings.map((meeting) => (
          <article
            className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-4"
            key={meeting.id}
          >
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">
              {meeting.title}
            </h3>
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
              {formatDate(meeting.date)} · {meeting.decisions.length} decisions ·{" "}
              {meeting.followUps.length} follow-ups
            </p>
            <p className="mt-3 text-[12px] leading-5 text-[var(--text-secondary)]">
              {meeting.summary}
            </p>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function WorkPrivacyNotes({ notes }: Readonly<{ notes: readonly string[] }>) {
  return (
    <Panel
      className="opacity-95"
      subtitle="Work notes are personal context and must stay sanitized."
      title="Work Privacy Notes"
    >
      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {notes.map((note, index) => (
          <li
            className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.40)] p-3 text-[11px] leading-4 text-[var(--text-secondary)]"
            key={`work-privacy-note-${index}`}
          >
            {note}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function initialLogDraft(
  wikiEntries: readonly WorkWikiEntry[],
  architectureItems: readonly WorkArchitectureItem[],
): LogDraft {
  return {
    title: "",
    date: today(),
    summary: "",
    accomplished: "",
    howItWasDone: "",
    blockers: "",
    followUps: "",
    linkedWikiEntryId: wikiEntries[0]?.id ?? "",
    linkedArchitectureItemId: architectureItems[0]?.id ?? "",
    status: "logged",
  };
}

function initialWikiDraft(
  logs: readonly WorkLogEntry[],
  architectureItems: readonly WorkArchitectureItem[],
  context: { logId?: string; architectureId?: string } = {},
): WikiDraft {
  return {
    title: "",
    type: "reference",
    summary: "",
    body: "",
    tags: "",
    status: "active",
    relatedArchitectureItemId: context.architectureId ?? architectureItems[0]?.id ?? "",
    relatedLogEntryId: context.logId ?? logs[0]?.id ?? "",
    relatedTaskId: "",
  };
}

function initialFollowUpDraft(
  logs: readonly WorkLogEntry[],
  wikiEntries: readonly WorkWikiEntry[],
  context: { logId?: string; wikiId?: string } = {},
): FollowUpDraft {
  return {
    title: "",
    source: context.wikiId ? "wiki" : context.logId ? "work_log" : "manual",
    priority: "medium",
    status: "open",
    nextAction: "",
    linkedLogEntryId: context.logId ?? logs[0]?.id ?? "",
    linkedWikiEntryId: context.wikiId ?? wikiEntries[0]?.id ?? "",
  };
}

function WorkFormDialog({
  architectureItems,
  dialog,
  dialogError,
  followUpDraft,
  logDraft,
  logs,
  onClose,
  onFollowUpDraft,
  onLogDraft,
  onSubmitFollowUp,
  onSubmitLog,
  onSubmitWiki,
  onWikiDraft,
  wikiDraft,
  wikiEntries,
}: Readonly<{
  architectureItems: readonly WorkArchitectureItem[];
  dialog: Exclude<DialogKind, null>;
  dialogError: string | null;
  followUpDraft: FollowUpDraft;
  logDraft: LogDraft;
  logs: readonly WorkLogEntry[];
  onClose: () => void;
  onFollowUpDraft: (draft: FollowUpDraft) => void;
  onLogDraft: (draft: LogDraft) => void;
  onSubmitFollowUp: () => void;
  onSubmitLog: () => void;
  onSubmitWiki: () => void;
  onWikiDraft: (draft: WikiDraft) => void;
  wikiDraft: WikiDraft;
  wikiEntries: readonly WorkWikiEntry[];
}>) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (dialog === "log") {
      onSubmitLog();
    } else if (dialog === "wiki") {
      onSubmitWiki();
    } else {
      onSubmitFollowUp();
    }
  }

  const title =
    dialog === "log"
      ? "Log work entry"
      : dialog === "wiki"
        ? "Add wiki note"
        : "Add follow-up";

  return (
    <form className="flex max-h-[calc(100dvh-24px)] flex-col" onSubmit={submit}>
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-green)]">
          Work Overview
        </p>
        <h2
          className="mt-1 text-[20px] font-semibold leading-6 text-[var(--text-primary)]"
          id="work-dialog-heading"
        >
          {title}
        </h2>
        <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
          Local mock save only. Do not add real employer or customer details.
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {dialogError ? (
          <div
            className="mb-4 rounded-[12px] border border-[rgba(221,107,95,.34)] bg-[rgba(221,107,95,.08)] p-3 text-[12px] text-[var(--text-primary)]"
            role="alert"
          >
            {dialogError}
          </div>
        ) : null}

        {dialog === "log" ? (
          <div className="grid gap-4">
            <label htmlFor="work-log-title">
              <FieldLabel>Title *</FieldLabel>
              <input
                className={inputClass}
                id="work-log-title"
                onChange={(event) =>
                  onLogDraft({ ...logDraft, title: event.target.value })
                }
                value={logDraft.title}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label htmlFor="work-log-date">
                <FieldLabel>Date</FieldLabel>
                <input
                  className={inputClass}
                  id="work-log-date"
                  onChange={(event) =>
                    onLogDraft({ ...logDraft, date: event.target.value })
                  }
                  type="date"
                  value={logDraft.date}
                />
              </label>
              <label htmlFor="work-log-status">
                <FieldLabel>Status</FieldLabel>
                <select
                  className={inputClass}
                  id="work-log-status"
                  onChange={(event) =>
                    onLogDraft({
                      ...logDraft,
                      status: event.target.value as WorkLogStatus,
                    })
                  }
                  value={logDraft.status}
                >
                  {logStatuses.map((status) => (
                    <option key={status} value={status}>
                      {logStatusMeta[status].label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label htmlFor="work-log-summary">
              <FieldLabel>What was done *</FieldLabel>
              <textarea
                className={textareaClass}
                id="work-log-summary"
                onChange={(event) =>
                  onLogDraft({ ...logDraft, summary: event.target.value })
                }
                value={logDraft.summary}
              />
            </label>
            <label htmlFor="work-log-accomplished">
              <FieldLabel>What was accomplished *</FieldLabel>
              <textarea
                className={textareaClass}
                id="work-log-accomplished"
                onChange={(event) =>
                  onLogDraft({ ...logDraft, accomplished: event.target.value })
                }
                value={logDraft.accomplished}
              />
            </label>
            <label htmlFor="work-log-how">
              <FieldLabel>How it was done *</FieldLabel>
              <textarea
                className={textareaClass}
                id="work-log-how"
                onChange={(event) =>
                  onLogDraft({ ...logDraft, howItWasDone: event.target.value })
                }
                value={logDraft.howItWasDone}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label htmlFor="work-log-blockers">
                <FieldLabel optional>Blockers</FieldLabel>
                <textarea
                  className={textareaClass}
                  id="work-log-blockers"
                  onChange={(event) =>
                    onLogDraft({ ...logDraft, blockers: event.target.value })
                  }
                  value={logDraft.blockers}
                />
              </label>
              <label htmlFor="work-log-follow-ups">
                <FieldLabel optional>Follow-ups</FieldLabel>
                <textarea
                  className={textareaClass}
                  id="work-log-follow-ups"
                  onChange={(event) =>
                    onLogDraft({ ...logDraft, followUps: event.target.value })
                  }
                  value={logDraft.followUps}
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label htmlFor="work-log-wiki">
                <FieldLabel optional>Linked wiki entries</FieldLabel>
                <select
                  className={inputClass}
                  id="work-log-wiki"
                  onChange={(event) =>
                    onLogDraft({
                      ...logDraft,
                      linkedWikiEntryId: event.target.value,
                    })
                  }
                  value={logDraft.linkedWikiEntryId}
                >
                  <option value="">No wiki link</option>
                  {wikiEntries.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.title}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="work-log-architecture">
                <FieldLabel optional>Linked architecture items</FieldLabel>
                <select
                  className={inputClass}
                  id="work-log-architecture"
                  onChange={(event) =>
                    onLogDraft({
                      ...logDraft,
                      linkedArchitectureItemId: event.target.value,
                    })
                  }
                  value={logDraft.linkedArchitectureItemId}
                >
                  <option value="">No architecture link</option>
                  {architectureItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ) : null}

        {dialog === "wiki" ? (
          <div className="grid gap-4">
            <label htmlFor="work-wiki-title">
              <FieldLabel>Title *</FieldLabel>
              <input
                className={inputClass}
                id="work-wiki-title"
                onChange={(event) =>
                  onWikiDraft({ ...wikiDraft, title: event.target.value })
                }
                value={wikiDraft.title}
              />
            </label>
            <label htmlFor="work-wiki-type">
              <FieldLabel>Type</FieldLabel>
              <select
                className={inputClass}
                id="work-wiki-type"
                onChange={(event) =>
                  onWikiDraft({
                    ...wikiDraft,
                    type: event.target.value as WorkWikiType,
                  })
                }
                value={wikiDraft.type}
              >
                {wikiTypes.map((type) => (
                  <option key={type} value={type}>
                    {optionLabel(type)}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="work-wiki-summary">
              <FieldLabel>Summary *</FieldLabel>
              <textarea
                className={textareaClass}
                id="work-wiki-summary"
                onChange={(event) =>
                  onWikiDraft({ ...wikiDraft, summary: event.target.value })
                }
                value={wikiDraft.summary}
              />
            </label>
            <label htmlFor="work-wiki-tags">
              <FieldLabel optional>Tags</FieldLabel>
              <input
                className={inputClass}
                id="work-wiki-tags"
                onChange={(event) =>
                  onWikiDraft({ ...wikiDraft, tags: event.target.value })
                }
                value={wikiDraft.tags}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label htmlFor="work-wiki-architecture">
                <FieldLabel optional>Related architecture</FieldLabel>
                <select
                  className={inputClass}
                  id="work-wiki-architecture"
                  onChange={(event) =>
                    onWikiDraft({
                      ...wikiDraft,
                      relatedArchitectureItemId: event.target.value,
                    })
                  }
                  value={wikiDraft.relatedArchitectureItemId}
                >
                  <option value="">No architecture link</option>
                  {architectureItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="work-wiki-log">
                <FieldLabel optional>Related work log</FieldLabel>
                <select
                  className={inputClass}
                  id="work-wiki-log"
                  onChange={(event) =>
                    onWikiDraft({
                      ...wikiDraft,
                      relatedLogEntryId: event.target.value,
                    })
                  }
                  value={wikiDraft.relatedLogEntryId}
                >
                  <option value="">No log link</option>
                  {logs.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ) : null}

        {dialog === "follow-up" ? (
          <div className="grid gap-4">
            <label htmlFor="work-follow-up-title">
              <FieldLabel>Title *</FieldLabel>
              <input
                className={inputClass}
                id="work-follow-up-title"
                onChange={(event) =>
                  onFollowUpDraft({
                    ...followUpDraft,
                    title: event.target.value,
                  })
                }
                value={followUpDraft.title}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label htmlFor="work-follow-up-source">
                <FieldLabel>Source</FieldLabel>
                <select
                  className={inputClass}
                  id="work-follow-up-source"
                  onChange={(event) =>
                    onFollowUpDraft({
                      ...followUpDraft,
                      source: event.target.value as WorkFollowUp["source"],
                    })
                  }
                  value={followUpDraft.source}
                >
                  {Object.entries(sourceLabels).map(([source, label]) => (
                    <option key={source} value={source}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="work-follow-up-priority">
                <FieldLabel>Priority</FieldLabel>
                <select
                  className={inputClass}
                  id="work-follow-up-priority"
                  onChange={(event) =>
                    onFollowUpDraft({
                      ...followUpDraft,
                      priority: event.target.value as WorkFollowUp["priority"],
                    })
                  }
                  value={followUpDraft.priority}
                >
                  {Object.entries(priorityMeta).map(([priority, meta]) => (
                    <option key={priority} value={priority}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="work-follow-up-status">
                <FieldLabel>Status</FieldLabel>
                <select
                  className={inputClass}
                  id="work-follow-up-status"
                  onChange={(event) =>
                    onFollowUpDraft({
                      ...followUpDraft,
                      status: event.target.value as WorkFollowUp["status"],
                    })
                  }
                  value={followUpDraft.status}
                >
                  {Object.entries(followUpStatusMeta).map(([status, meta]) => (
                    <option key={status} value={status}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label htmlFor="work-follow-up-next">
              <FieldLabel>Next Action *</FieldLabel>
              <textarea
                className={textareaClass}
                id="work-follow-up-next"
                onChange={(event) =>
                  onFollowUpDraft({
                    ...followUpDraft,
                    nextAction: event.target.value,
                  })
                }
                value={followUpDraft.nextAction}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label htmlFor="work-follow-up-log">
                <FieldLabel optional>Linked log entry</FieldLabel>
                <select
                  className={inputClass}
                  id="work-follow-up-log"
                  onChange={(event) =>
                    onFollowUpDraft({
                      ...followUpDraft,
                      linkedLogEntryId: event.target.value,
                    })
                  }
                  value={followUpDraft.linkedLogEntryId}
                >
                  <option value="">No log link</option>
                  {logs.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.title}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="work-follow-up-wiki">
                <FieldLabel optional>Linked wiki entry</FieldLabel>
                <select
                  className={inputClass}
                  id="work-follow-up-wiki"
                  onChange={(event) =>
                    onFollowUpDraft({
                      ...followUpDraft,
                      linkedWikiEntryId: event.target.value,
                    })
                  }
                  value={followUpDraft.linkedWikiEntryId}
                >
                  <option value="">No wiki link</option>
                  {wikiEntries.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ) : null}
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-[var(--border-subtle)] bg-[rgba(7,11,18,.22)] p-4 sm:flex-row sm:justify-end">
        <button className={secondaryButtonClass} onClick={onClose} type="button">
          Cancel
        </button>
        <button className={primaryButtonClass} type="submit">
          Save
        </button>
      </div>
    </form>
  );
}

function WorkInspector({
  architectureItems,
  followUps,
  inspector,
  logs,
  onAddFollowUp,
  onAddWiki,
  onClose,
  onEditLog,
  onEditWiki,
  selectedArchitecture,
  selectedLog,
  selectedWiki,
  wikiEntries,
}: Readonly<{
  architectureItems: readonly WorkArchitectureItem[];
  followUps: readonly WorkFollowUp[];
  inspector: InspectorState;
  logs: readonly WorkLogEntry[];
  onAddFollowUp: (logId?: string) => void;
  onAddWiki: (architectureId?: string) => void;
  onClose: () => void;
  onEditLog: (entry: WorkLogEntry) => void;
  onEditWiki: (entry: WorkWikiEntry) => void;
  selectedArchitecture: WorkArchitectureItem | null;
  selectedLog: WorkLogEntry | null;
  selectedWiki: WorkWikiEntry | null;
  wikiEntries: readonly WorkWikiEntry[];
}>) {
  if (!inspector) {
    return null;
  }

  const title =
    selectedLog?.title ??
    selectedWiki?.title ??
    selectedArchitecture?.title ??
    "Work detail";

  return (
    <DialogShell labelledBy="work-inspector-heading" onClose={onClose} open sheet>
      <div className="flex h-full flex-col">
        <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-green)]">
            Work Inspector
          </p>
          <h2
            className="mt-1 text-[20px] font-semibold leading-6 text-[var(--text-primary)]"
            id="work-inspector-heading"
          >
            {title}
          </h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {selectedLog ? (
            <LogInspectorBody
              architectureItems={architectureItems}
              entry={selectedLog}
              followUps={followUps.filter(
                (followUp) => followUp.linkedLogEntryId === selectedLog.id,
              )}
              onAddFollowUp={() => onAddFollowUp(selectedLog.id)}
              onEditLog={() => onEditLog(selectedLog)}
              wikiEntries={wikiEntries}
            />
          ) : null}
          {selectedWiki ? (
            <WikiInspectorBody
              architectureItems={architectureItems}
              entry={selectedWiki}
              logs={logs}
              onEditWiki={() => onEditWiki(selectedWiki)}
            />
          ) : null}
          {selectedArchitecture ? (
            <ArchitectureInspectorBody
              architectureItems={architectureItems}
              item={selectedArchitecture}
              onAddWiki={() => onAddWiki(selectedArchitecture.id)}
              wikiEntries={wikiEntries}
            />
          ) : null}
        </div>
        <div className="border-t border-[var(--border-subtle)] p-4">
          <button className={secondaryButtonClass} onClick={onClose} type="button">
            Close
          </button>
        </div>
      </div>
    </DialogShell>
  );
}

function LogInspectorBody({
  architectureItems,
  entry,
  followUps,
  onAddFollowUp,
  onEditLog,
  wikiEntries,
}: Readonly<{
  architectureItems: readonly WorkArchitectureItem[];
  entry: WorkLogEntry;
  followUps: readonly WorkFollowUp[];
  onAddFollowUp: () => void;
  onEditLog: () => void;
  wikiEntries: readonly WorkWikiEntry[];
}>) {
  const linkedWiki = entry.linkedWikiEntryIds
    .map((id) => findWiki(wikiEntries, id))
    .filter((item): item is WorkWikiEntry => Boolean(item));
  const linkedArchitecture = entry.linkedArchitectureItemIds
    .map((id) => findArchitecture(architectureItems, id))
    .filter((item): item is WorkArchitectureItem => Boolean(item));

  return (
    <div className="grid gap-4">
      <Pill accent={logStatusMeta[entry.status].accent}>
        {logStatusMeta[entry.status].label}
      </Pill>
      <JournalBlock label="Summary" value={entry.summary} />
      <JournalBlock label="Accomplished" value={entry.accomplished} />
      <JournalBlock label="How it was done" value={entry.howItWasDone} />
      <InspectorList title="Blockers">
        {entry.blockers.length === 0 ? (
          <p className="text-[12px] text-[var(--text-muted)]">No blockers logged.</p>
        ) : (
          entry.blockers.map((blocker) => (
            <p className="text-[12px] text-[var(--text-secondary)]" key={blocker}>
              {blocker}
            </p>
          ))
        )}
      </InspectorList>
      <InspectorList title="Follow-ups">
        {[...entry.followUps, ...followUps.map((followUp) => followUp.title)].length === 0 ? (
          <p className="text-[12px] text-[var(--text-muted)]">No follow-ups logged.</p>
        ) : (
          [...entry.followUps, ...followUps.map((followUp) => followUp.title)].map((item) => (
            <p className="text-[12px] text-[var(--text-secondary)]" key={item}>
              {item}
            </p>
          ))
        )}
      </InspectorList>
      <InspectorList title="Linked Wiki">
        {linkedWiki.map((wiki) => (
          <p className="text-[12px] text-[var(--text-secondary)]" key={wiki.id}>
            {wiki.title}
          </p>
        ))}
      </InspectorList>
      <InspectorList title="Linked Architecture">
        {linkedArchitecture.map((item) => (
          <p className="text-[12px] text-[var(--text-secondary)]" key={item.id}>
            {item.title}
          </p>
        ))}
      </InspectorList>
      <div className="grid gap-2">
        <button className={primaryButtonClass} onClick={onEditLog} type="button">
          Edit draft
        </button>
        <button className={secondaryButtonClass} onClick={onAddFollowUp} type="button">
          Add follow-up
        </button>
      </div>
    </div>
  );
}

function WikiInspectorBody({
  architectureItems,
  entry,
  logs,
  onEditWiki,
}: Readonly<{
  architectureItems: readonly WorkArchitectureItem[];
  entry: WorkWikiEntry;
  logs: readonly WorkLogEntry[];
  onEditWiki: () => void;
}>) {
  const relatedLogs = entry.relatedLogEntryIds
    .map((id) => findLog(logs, id))
    .filter((item): item is WorkLogEntry => Boolean(item));
  const relatedArchitecture = entry.relatedArchitectureItemIds
    .map((id) => findArchitecture(architectureItems, id))
    .filter((item): item is WorkArchitectureItem => Boolean(item));

  return (
    <div className="grid gap-4">
      <Pill accent={referenceAccent}>{optionLabel(entry.type)}</Pill>
      <JournalBlock label="Summary" value={entry.summary} />
      <InspectorList title="Tags">
        <div className="flex flex-wrap gap-1.5">
          {entry.tags.map((tag) => (
            <Pill key={tag} quiet>
              #{tag}
            </Pill>
          ))}
        </div>
      </InspectorList>
      <InspectorList title="Related Work Logs">
        {relatedLogs.length === 0 ? (
          <p className="text-[12px] text-[var(--text-muted)]">No related log linked.</p>
        ) : (
          relatedLogs.map((log) => (
            <p className="text-[12px] text-[var(--text-secondary)]" key={log.id}>
              {log.title}
            </p>
          ))
        )}
      </InspectorList>
      <InspectorList title="Related Architecture">
        {relatedArchitecture.map((item) => (
          <p className="text-[12px] text-[var(--text-secondary)]" key={item.id}>
            {item.title}
          </p>
        ))}
      </InspectorList>
      <button className={primaryButtonClass} onClick={onEditWiki} type="button">
        Edit note
      </button>
    </div>
  );
}

function ArchitectureInspectorBody({
  architectureItems,
  item,
  onAddWiki,
  wikiEntries,
}: Readonly<{
  architectureItems: readonly WorkArchitectureItem[];
  item: WorkArchitectureItem;
  onAddWiki: () => void;
  wikiEntries: readonly WorkWikiEntry[];
}>) {
  const relatedItems = item.relatedIds
    .map((id) => findArchitecture(architectureItems, id))
    .filter((entry): entry is WorkArchitectureItem => Boolean(entry));
  const linkedWiki = item.wikiEntryIds
    .map((id) => findWiki(wikiEntries, id))
    .filter((entry): entry is WorkWikiEntry => Boolean(entry));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <Pill accent={architectureStatusMeta[item.status].accent}>
          {architectureStatusMeta[item.status].label}
        </Pill>
        <Pill accent={referenceAccent}>{optionLabel(item.type)}</Pill>
      </div>
      <JournalBlock label="Summary" value={item.summary} />
      <JournalBlock label="Note" value={item.note} />
      <InspectorList title="Related Items">
        {relatedItems.map((related) => (
          <p className="text-[12px] text-[var(--text-secondary)]" key={related.id}>
            {related.title}
          </p>
        ))}
      </InspectorList>
      <InspectorList title="Wiki Entries">
        {linkedWiki.map((wiki) => (
          <p className="text-[12px] text-[var(--text-secondary)]" key={wiki.id}>
            {wiki.title}
          </p>
        ))}
      </InspectorList>
      <button className={primaryButtonClass} onClick={onAddWiki} type="button">
        Add wiki note
      </button>
    </div>
  );
}

function InspectorList({
  children,
  title,
}: Readonly<{ children: ReactNode; title: string }>) {
  return (
    <section
      aria-label={title}
      className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.34)] p-4"
    >
      <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">
        {title}
      </h3>
      <div className="mt-3 grid gap-2">{children}</div>
    </section>
  );
}
