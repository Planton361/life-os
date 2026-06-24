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
import { cn } from "@/lib/cn";
import type {
  LearningInsight,
  LearningLogViewModel,
  LearningSession,
  LearningTrack,
  LearningTrackStatus,
  LearningTrackType,
  PracticeQueueItem,
  WeeklyLearningDay,
} from "./types";

type LearningStyle = CSSProperties & {
  "--accent"?: string;
  "--progress-width"?: string;
};

type DialogKind = "session" | "track" | "practice" | null;

type InspectorState =
  | { type: "track"; id: string }
  | { type: "session"; id: string }
  | { type: "insight"; id: string }
  | null;

type ToastState = {
  title: string;
  body: string;
  tone: "success" | "info" | "error";
};

type LearningSegment = "overview" | "tracks" | "sessions" | "practice" | "insights";

type SessionDraft = {
  title: string;
  trackId: string;
  date: string;
  durationMinutes: string;
  outcome: string;
  evidence: string;
  energyLabel: LearningSession["energyLabel"];
  status: LearningSession["status"];
  notes: string;
};

type TrackDraft = {
  title: string;
  type: LearningTrackType;
  status: LearningTrackStatus;
  focusArea: string;
  progress: string;
  currentModule: string;
  nextAction: string;
  linkedSkill: string;
  linkedProject: string;
};

type PracticeDraft = {
  title: string;
  source: PracticeQueueItem["source"];
  difficulty: PracticeQueueItem["difficulty"];
  linkedTrackId: string;
  linkedSkill: string;
  status: PracticeQueueItem["status"];
  nextAction: string;
};

const educationAccent = "var(--accent-blue)";
const evidenceAccent = "var(--accent-cyan)";
const successAccent = "var(--accent-green)";
const warningAccent = "var(--accent-orange)";
const riskAccent = "var(--accent-red)";
const mutedAccent = "var(--text-muted)";

const segments: readonly { value: LearningSegment; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "tracks", label: "Tracks" },
  { value: "sessions", label: "Sessions" },
  { value: "practice", label: "Practice" },
  { value: "insights", label: "Insights" },
];

const trackTypes: readonly LearningTrackType[] = [
  "course",
  "practice",
  "reading",
  "project",
  "platform",
  "exam",
  "other",
];

const trackStatuses: readonly LearningTrackStatus[] = [
  "active",
  "paused",
  "completed",
  "planned",
  "blocked",
];

const sessionStatuses: readonly LearningSession["status"][] = [
  "planned",
  "done",
  "skipped",
  "review_needed",
];

const practiceSources: readonly PracticeQueueItem["source"][] = [
  "hyperskill",
  "leetcode",
  "course",
  "book",
  "manual",
  "other",
];

const practiceStatuses: readonly PracticeQueueItem["status"][] = [
  "queued",
  "in_progress",
  "done",
  "blocked",
];

const practiceDifficulties: readonly PracticeQueueItem["difficulty"][] = [
  "easy",
  "medium",
  "hard",
];

const energyLabels: readonly LearningSession["energyLabel"][] = [
  "low",
  "medium",
  "high",
];

const trackStatusMeta: Record<LearningTrackStatus, { label: string; accent: string }> = {
  active: { label: "Active", accent: educationAccent },
  paused: { label: "Paused", accent: mutedAccent },
  completed: { label: "Completed", accent: successAccent },
  planned: { label: "Planned", accent: evidenceAccent },
  blocked: { label: "Blocked", accent: riskAccent },
};

const sessionStatusMeta: Record<
  LearningSession["status"],
  { label: string; accent: string }
> = {
  planned: { label: "Planned", accent: evidenceAccent },
  done: { label: "Done", accent: successAccent },
  skipped: { label: "Skipped", accent: mutedAccent },
  review_needed: { label: "Review needed", accent: warningAccent },
};

const practiceStatusMeta: Record<
  PracticeQueueItem["status"],
  { label: string; accent: string }
> = {
  queued: { label: "Queued", accent: evidenceAccent },
  in_progress: { label: "In progress", accent: educationAccent },
  done: { label: "Done", accent: successAccent },
  blocked: { label: "Blocked", accent: riskAccent },
};

const weeklyDayMeta: Record<WeeklyLearningDay["status"], { label: string; accent: string }> = {
  done: { label: "Done", accent: successAccent },
  planned: { label: "Planned", accent: evidenceAccent },
  missed: { label: "Missed", accent: warningAccent },
  rest: { label: "Rest", accent: mutedAccent },
};

const sourceLabels: Record<PracticeQueueItem["source"], string> = {
  hyperskill: "Practice platform",
  leetcode: "LeetCode",
  course: "Course",
  book: "Book",
  manual: "Manual",
  other: "Other",
};

const difficultyMeta: Record<
  PracticeQueueItem["difficulty"],
  { label: string; accent: string }
> = {
  easy: { label: "Easy", accent: successAccent },
  medium: { label: "Medium", accent: evidenceAccent },
  hard: { label: "Hard", accent: warningAccent },
};

const energyMeta: Record<LearningSession["energyLabel"], { label: string; accent: string }> = {
  low: { label: "Low energy", accent: warningAccent },
  medium: { label: "Medium energy", accent: evidenceAccent },
  high: { label: "High energy", accent: successAccent },
};

const buttonBaseClass =
  "inline-flex min-h-11 items-center justify-center rounded-[12px] border px-4 text-[11px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50";

const primaryButtonClass = cn(
  buttonBaseClass,
  "border-[rgba(91,124,250,.36)] bg-[rgba(91,124,250,.92)] text-[var(--bg-app)] hover:bg-[rgba(91,124,250,1)]",
);

const secondaryButtonClass = cn(
  buttonBaseClass,
  "border-[var(--border-subtle)] bg-[rgba(18,28,43,.82)] text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]",
);

const quietButtonClass =
  "inline-flex min-h-9 items-center justify-center rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.58)] px-3 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50";

const inputClass =
  "mt-1 min-h-11 w-full rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.62)] px-3 text-[12px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--focus-ring)] disabled:opacity-60";

const textareaClass = cn(inputClass, "min-h-[110px] py-3");

function accentStyle(accent: string): LearningStyle {
  return { "--accent": accent };
}

function progressStyle(progress: number): LearningStyle {
  return { "--progress-width": `${Math.max(0, Math.min(100, progress))}%` };
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

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}

function optionLabel(value: string) {
  return value
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function findTrack(tracks: readonly LearningTrack[], id?: string) {
  return tracks.find((track) => track.id === id) ?? null;
}

function trackTitle(tracks: readonly LearningTrack[], id?: string) {
  return findTrack(tracks, id)?.title ?? "No linked track";
}

function matchesSearch(values: readonly string[], query: string) {
  if (!query) {
    return true;
  }

  return normalize(values.join(" ")).includes(query);
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
  accent = educationAccent,
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
  accent = educationAccent,
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

function ProgressBar({ value }: Readonly<{ value: number }>) {
  return (
    <div
      className="h-[8px] overflow-hidden rounded-full bg-[rgba(23,34,53,.92)]"
      style={progressStyle(value)}
    >
      <div className="h-full w-[var(--progress-width)] rounded-full bg-[var(--accent-cyan)]" />
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

function LearningHeader({
  onAddPractice,
  onAddTrack,
  onLogSession,
}: Readonly<{
  onAddPractice: () => void;
  onAddTrack: () => void;
  onLogSession: () => void;
}>) {
  return (
    <header className="rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[var(--surface-1)] px-4 py-5 shadow-[0_8px_22px_rgba(0,0,0,.12)] sm:px-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-blue)]">
            Education · Learning Log
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight text-[var(--text-primary)]">
            Learning Log
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            Learning sessions, practice rhythm and learning evidence
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 xl:flex xl:justify-end">
          <button className={primaryButtonClass} onClick={onLogSession} type="button">
            Log learning session
          </button>
          <button className={secondaryButtonClass} onClick={onAddTrack} type="button">
            Add learning track
          </button>
          <button className={secondaryButtonClass} onClick={onAddPractice} type="button">
            Add practice item
          </button>
        </div>
      </div>
    </header>
  );
}

function LearningFilters({
  activeSegment,
  difficultyFilter,
  onDifficultyFilter,
  onReviewFilter,
  onSearch,
  onSegment,
  onSourceFilter,
  onStatusFilter,
  onTrackFilter,
  reviewFilter,
  search,
  sourceFilter,
  statusFilter,
  trackFilter,
  tracks,
}: Readonly<{
  activeSegment: LearningSegment;
  difficultyFilter: string;
  onDifficultyFilter: (value: string) => void;
  onReviewFilter: (value: string) => void;
  onSearch: (value: string) => void;
  onSegment: (value: LearningSegment) => void;
  onSourceFilter: (value: string) => void;
  onStatusFilter: (value: string) => void;
  onTrackFilter: (value: string) => void;
  reviewFilter: string;
  search: string;
  sourceFilter: string;
  statusFilter: string;
  trackFilter: string;
  tracks: readonly LearningTrack[];
}>) {
  return (
    <section
      aria-label="Learning Log filters"
      className="rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-3"
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(240px,360px)_1fr]">
        <label htmlFor="learning-search">
          <FieldLabel>Search</FieldLabel>
          <input
            className={inputClass}
            id="learning-search"
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search learning"
            type="search"
            value={search}
          />
        </label>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <label htmlFor="learning-track-filter">
            <FieldLabel>Track</FieldLabel>
            <select
              className={inputClass}
              id="learning-track-filter"
              onChange={(event) => onTrackFilter(event.target.value)}
              value={trackFilter}
            >
              <option value="all">All tracks</option>
              {tracks.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.title}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="learning-status-filter">
            <FieldLabel>Status</FieldLabel>
            <select
              className={inputClass}
              id="learning-status-filter"
              onChange={(event) => onStatusFilter(event.target.value)}
              value={statusFilter}
            >
              <option value="all">All statuses</option>
              {[...trackStatuses, ...sessionStatuses, ...practiceStatuses]
                .filter((value, index, values) => values.indexOf(value) === index)
                .map((status) => (
                  <option key={status} value={status}>
                    {optionLabel(status)}
                  </option>
                ))}
            </select>
          </label>
          <label htmlFor="learning-source-filter">
            <FieldLabel>Source</FieldLabel>
            <select
              className={inputClass}
              id="learning-source-filter"
              onChange={(event) => onSourceFilter(event.target.value)}
              value={sourceFilter}
            >
              <option value="all">All sources</option>
              {practiceSources.map((source) => (
                <option key={source} value={source}>
                  {sourceLabels[source]}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="learning-difficulty-filter">
            <FieldLabel>Difficulty</FieldLabel>
            <select
              className={inputClass}
              id="learning-difficulty-filter"
              onChange={(event) => onDifficultyFilter(event.target.value)}
              value={difficultyFilter}
            >
              <option value="all">All difficulty</option>
              {practiceDifficulties.map((difficulty) => (
                <option key={difficulty} value={difficulty}>
                  {difficultyMeta[difficulty].label}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="learning-review-filter">
            <FieldLabel>Review Needed</FieldLabel>
            <select
              className={inputClass}
              id="learning-review-filter"
              onChange={(event) => onReviewFilter(event.target.value)}
              value={reviewFilter}
            >
              <option value="all">All insights</option>
              <option value="needed">Needs review</option>
              <option value="clear">No review flag</option>
            </select>
          </label>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Learning view">
        {segments.map((segment) => (
          <button
            aria-pressed={activeSegment === segment.value}
            className={cn(
              quietButtonClass,
              activeSegment === segment.value &&
                "border-[rgba(91,124,250,.42)] bg-[rgba(91,124,250,.14)] text-[var(--text-primary)]",
            )}
            key={segment.value}
            onClick={() => onSegment(segment.value)}
            type="button"
          >
            {segment.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function CurrentLearningFocus({
  currentTrack,
  lastSession,
  nextPractice,
  onAddTrack,
  onLogSession,
  onOpenTrack,
  onStartPractice,
  weeklyGoal,
}: Readonly<{
  currentTrack: LearningTrack | null;
  lastSession: LearningSession | null;
  nextPractice: PracticeQueueItem | null;
  onAddTrack: () => void;
  onLogSession: () => void;
  onOpenTrack: (track: LearningTrack) => void;
  onStartPractice: (item: PracticeQueueItem | null) => void;
  weeklyGoal: string;
}>) {
  if (!currentTrack) {
    return (
      <Panel
        className="border-[rgba(91,124,250,.30)]"
        subtitle="The main learning focus appears here once a track exists."
        title="Current Learning Focus"
      >
        <EmptyState
          actionLabel="Add learning track"
          description="Create a local track to anchor sessions, practice items and evidence."
          onAction={onAddTrack}
          title="No learning track yet"
        />
      </Panel>
    );
  }

  return (
    <section
      aria-labelledby="current-learning-focus-title"
      className="overflow-hidden rounded-[var(--panel-radius)] border border-[rgba(91,124,250,.34)] bg-[linear-gradient(180deg,rgba(15,23,36,.98),rgba(15,23,36,.92))] shadow-[0_8px_22px_rgba(0,0,0,.12)]"
    >
      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-blue)]">
                Current Learning Focus
              </p>
              <h2
                className="mt-2 text-2xl font-semibold leading-7 text-[var(--text-primary)]"
                id="current-learning-focus-title"
              >
                {currentTrack.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {currentTrack.currentModule ?? currentTrack.focusArea}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Pill accent={trackStatusMeta[currentTrack.status].accent}>
                {trackStatusMeta[currentTrack.status].label}
              </Pill>
              <Pill accent={evidenceAccent}>{optionLabel(currentTrack.type)}</Pill>
            </div>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="min-w-0 rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  Progress
                </p>
                <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                  {currentTrack.progress}%
                </span>
              </div>
              <div className="mt-3">
                <ProgressBar value={currentTrack.progress} />
              </div>
              <p className="mt-4 text-[12px] leading-5 text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text-primary)]">Next:</span>{" "}
                {currentTrack.nextAction}
              </p>
            </div>
            <div className="rounded-[16px] border border-[rgba(95,200,215,.24)] bg-[rgba(95,200,215,.07)] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-cyan)]">
                Last Session
              </p>
              {lastSession ? (
                <>
                  <p className="mt-2 text-sm font-semibold leading-5 text-[var(--text-primary)]">
                    {formatDate(lastSession.date)} · {formatDuration(lastSession.durationMinutes)}
                  </p>
                  <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
                    {lastSession.outcome}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
                  No session logged for this track yet.
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 rounded-[16px] border border-[rgba(217,146,79,.24)] bg-[rgba(217,146,79,.07)] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-orange)]">
              Weekly Goal
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">
              {weeklyGoal}
            </p>
          </div>
        </div>
        <div className="border-t border-[var(--border-subtle)] bg-[rgba(7,11,18,.26)] p-4 sm:p-5 xl:border-l xl:border-t-0">
          <div className="grid gap-3">
            <Metric label="Focus Area" value={currentTrack.focusArea} />
            <Metric
              accent={evidenceAccent}
              label="Next Practice"
              value={nextPractice?.title ?? "No queued practice"}
            />
            <Metric
              accent={successAccent}
              label="Linked Skill"
              value={currentTrack.linkedSkill ?? "Not linked"}
            />
          </div>
          <div className="mt-4 grid gap-2">
            <button className={primaryButtonClass} onClick={onLogSession} type="button">
              Log session
            </button>
            <button
              className={secondaryButtonClass}
              disabled={!nextPractice}
              onClick={() => onStartPractice(nextPractice)}
              type="button"
            >
              Start practice
            </button>
            <button
              className={secondaryButtonClass}
              onClick={() => onOpenTrack(currentTrack)}
              type="button"
            >
              Open track
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function QuickActions({
  onAddPractice,
  onAddTrack,
  onLogSession,
}: Readonly<{
  onAddPractice: () => void;
  onAddTrack: () => void;
  onLogSession: () => void;
}>) {
  return (
    <section
      aria-label="Learning quick actions"
      className="grid gap-2 sm:grid-cols-3"
    >
      <button className={primaryButtonClass} onClick={onLogSession} type="button">
        Log Session
      </button>
      <button className={secondaryButtonClass} onClick={onAddTrack} type="button">
        Add Track
      </button>
      <button className={secondaryButtonClass} onClick={onAddPractice} type="button">
        Add Practice
      </button>
    </section>
  );
}

function WeeklyRhythm({
  summary,
  week,
}: Readonly<{ summary: string; week: readonly WeeklyLearningDay[] }>) {
  return (
    <Panel
      badge={<Pill accent={evidenceAccent}>Rhythm</Pill>}
      subtitle={summary}
      title="Weekly Learning Rhythm"
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
        {week.map((day) => (
          <div
            className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-3"
            key={day.id}
            style={accentStyle(weeklyDayMeta[day.status].accent)}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                {day.dayLabel}
              </span>
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
            </div>
            <p className="mt-2 text-[11px] font-semibold text-[var(--text-secondary)]">
              {weeklyDayMeta[day.status].label}
            </p>
            <p className="mt-1 text-[10px] text-[var(--text-muted)]">
              {day.minutes > 0 ? formatDuration(day.minutes) : "No minutes"}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function TrackCard({
  onLogSession,
  onOpen,
  track,
}: Readonly<{
  onLogSession: (track: LearningTrack) => void;
  onOpen: (track: LearningTrack) => void;
  track: LearningTrack;
}>) {
  return (
    <article className="rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-4 transition hover:border-[var(--border-default)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <button
            className="text-left text-[15px] font-semibold leading-5 text-[var(--text-primary)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
            onClick={() => onOpen(track)}
            type="button"
          >
            {track.title}
          </button>
          <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
            {track.focusArea}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Pill accent={trackStatusMeta[track.status].accent}>
            {trackStatusMeta[track.status].label}
          </Pill>
          <Pill accent={evidenceAccent}>{optionLabel(track.type)}</Pill>
        </div>
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Progress
          </p>
          <span className="text-[11px] font-semibold text-[var(--text-primary)]">
            {track.progress}%
          </span>
        </div>
        <div className="mt-2">
          <ProgressBar value={track.progress} />
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Metric label="Current Module" value={track.currentModule ?? "Not set"} />
        <Metric
          accent={successAccent}
          label="Linked Skill"
          value={track.linkedSkill ?? "Not linked"}
        />
      </div>
      <p className="mt-3 text-[12px] leading-5 text-[var(--text-secondary)]">
        <span className="font-semibold text-[var(--text-primary)]">Next:</span>{" "}
        {track.nextAction}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className={quietButtonClass} onClick={() => onOpen(track)} type="button">
          Open track
        </button>
        <button
          className={quietButtonClass}
          onClick={() => onLogSession(track)}
          type="button"
        >
          Log session
        </button>
      </div>
    </article>
  );
}

function SessionRow({
  onOpen,
  session,
}: Readonly<{
  onOpen: (session: LearningSession) => void;
  session: LearningSession;
}>) {
  return (
    <article className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-4 transition hover:border-[var(--border-default)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <button
            className="text-left text-[14px] font-semibold leading-5 text-[var(--text-primary)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
            onClick={() => onOpen(session)}
            type="button"
          >
            {session.title}
          </button>
          <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
            {session.trackTitle} · {formatDate(session.date)} ·{" "}
            {formatDuration(session.durationMinutes)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Pill accent={sessionStatusMeta[session.status].accent}>
            {sessionStatusMeta[session.status].label}
          </Pill>
          <Pill accent={energyMeta[session.energyLabel].accent}>
            {energyMeta[session.energyLabel].label}
          </Pill>
        </div>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <p className="text-[12px] leading-5 text-[var(--text-secondary)]">
          <span className="font-semibold text-[var(--text-primary)]">Outcome:</span>{" "}
          {session.outcome}
        </p>
        <p className="text-[12px] leading-5 text-[var(--text-secondary)]">
          <span className="font-semibold text-[var(--text-primary)]">Evidence:</span>{" "}
          {session.evidence}
        </p>
      </div>
    </article>
  );
}

function PracticeItemCard({
  item,
  onMarkDone,
  onStart,
  tracks,
}: Readonly<{
  item: PracticeQueueItem;
  onMarkDone: (item: PracticeQueueItem) => void;
  onStart: (item: PracticeQueueItem) => void;
  tracks: readonly LearningTrack[];
}>) {
  return (
    <article className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-4 transition hover:border-[var(--border-default)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold leading-5 text-[var(--text-primary)]">
            {item.title}
          </h3>
          <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
            {sourceLabels[item.source]} · {trackTitle(tracks, item.linkedTrackId)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Pill accent={practiceStatusMeta[item.status].accent}>
            {practiceStatusMeta[item.status].label}
          </Pill>
          <Pill accent={difficultyMeta[item.difficulty].accent}>
            {difficultyMeta[item.difficulty].label}
          </Pill>
        </div>
      </div>
      <p className="mt-3 text-[12px] leading-5 text-[var(--text-secondary)]">
        <span className="font-semibold text-[var(--text-primary)]">Next:</span>{" "}
        {item.nextAction}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className={quietButtonClass}
          disabled={item.status === "done"}
          onClick={() => onStart(item)}
          type="button"
        >
          Start practice
        </button>
        <button
          className={quietButtonClass}
          disabled={item.status === "done"}
          onClick={() => onMarkDone(item)}
          type="button"
        >
          Mark done
        </button>
      </div>
    </article>
  );
}

function InsightCard({
  insight,
  onOpen,
  onSaveAsNote,
  tracks,
}: Readonly<{
  insight: LearningInsight;
  onOpen: (insight: LearningInsight) => void;
  onSaveAsNote: (insight: LearningInsight) => void;
  tracks: readonly LearningTrack[];
}>) {
  return (
    <article className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <button
            className="text-left text-[14px] font-semibold leading-5 text-[var(--text-primary)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
            onClick={() => onOpen(insight)}
            type="button"
          >
            {insight.title}
          </button>
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">
            {optionLabel(insight.source)} · {trackTitle(tracks, insight.linkedTrackId)}
          </p>
        </div>
        <Pill accent={insight.reviewNeeded ? warningAccent : successAccent}>
          {insight.reviewNeeded ? "Review needed" : "Reviewed"}
        </Pill>
      </div>
      <p className="mt-3 text-[12px] leading-5 text-[var(--text-secondary)]">
        {insight.snippet}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className={quietButtonClass} onClick={() => onOpen(insight)} type="button">
          Open insight
        </button>
        <button
          className={quietButtonClass}
          onClick={() => onSaveAsNote(insight)}
          type="button"
        >
          Save as note
        </button>
      </div>
    </article>
  );
}

export function LearningLogPage({
  viewModel,
}: Readonly<{ viewModel: LearningLogViewModel }>) {
  const [tracks, setTracks] = useState<LearningTrack[]>(viewModel.tracks);
  const [sessions, setSessions] = useState<LearningSession[]>(viewModel.sessions);
  const [practiceQueue, setPracticeQueue] = useState<PracticeQueueItem[]>(
    viewModel.practiceQueue,
  );
  const [insights] = useState<LearningInsight[]>(viewModel.insights);
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState<LearningSegment>("overview");
  const [trackFilter, setTrackFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [reviewFilter, setReviewFilter] = useState("all");
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [inspector, setInspector] = useState<InspectorState>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [sessionDraft, setSessionDraft] = useState<SessionDraft>(() =>
    initialSessionDraft(viewModel.tracks),
  );
  const [trackDraft, setTrackDraft] = useState<TrackDraft>(initialTrackDraft);
  const [practiceDraft, setPracticeDraft] = useState<PracticeDraft>(() =>
    initialPracticeDraft(viewModel.tracks),
  );

  const dismissToast = useCallback(() => setToast(null), []);
  const query = normalize(search);

  const sortedSessions = useMemo(
    () =>
      sessions
        .slice()
        .sort(
          (first, second) =>
            new Date(second.date).getTime() - new Date(first.date).getTime(),
        ),
    [sessions],
  );

  const filteredTracks = useMemo(
    () =>
      tracks.filter(
        (track) =>
          (trackFilter === "all" || track.id === trackFilter) &&
          (statusFilter === "all" || track.status === statusFilter) &&
          matchesSearch(
            [
              track.title,
              track.focusArea,
              track.currentModule ?? "",
              track.nextAction,
              track.linkedSkill ?? "",
              track.linkedProject ?? "",
              optionLabel(track.type),
              trackStatusMeta[track.status].label,
            ],
            query,
          ),
      ),
    [query, statusFilter, trackFilter, tracks],
  );

  const filteredSessions = useMemo(
    () =>
      sortedSessions.filter(
        (session) =>
          (trackFilter === "all" || session.trackId === trackFilter) &&
          (statusFilter === "all" || session.status === statusFilter) &&
          matchesSearch(
            [
              session.title,
              session.trackTitle,
              session.outcome,
              session.evidence,
              session.notes ?? "",
              sessionStatusMeta[session.status].label,
              energyMeta[session.energyLabel].label,
            ],
            query,
          ),
      ),
    [query, sortedSessions, statusFilter, trackFilter],
  );

  const filteredPractice = useMemo(
    () =>
      practiceQueue.filter(
        (item) =>
          (trackFilter === "all" || item.linkedTrackId === trackFilter) &&
          (statusFilter === "all" || item.status === statusFilter) &&
          (sourceFilter === "all" || item.source === sourceFilter) &&
          (difficultyFilter === "all" || item.difficulty === difficultyFilter) &&
          matchesSearch(
            [
              item.title,
              item.nextAction,
              item.linkedSkill ?? "",
              sourceLabels[item.source],
              difficultyMeta[item.difficulty].label,
              practiceStatusMeta[item.status].label,
              trackTitle(tracks, item.linkedTrackId),
            ],
            query,
          ),
      ),
    [difficultyFilter, practiceQueue, query, sourceFilter, statusFilter, trackFilter, tracks],
  );

  const filteredInsights = useMemo(
    () =>
      insights.filter(
        (insight) =>
          (trackFilter === "all" || insight.linkedTrackId === trackFilter) &&
          (reviewFilter === "all" ||
            (reviewFilter === "needed" && insight.reviewNeeded) ||
            (reviewFilter === "clear" && !insight.reviewNeeded)) &&
          matchesSearch(
            [
              insight.title,
              insight.snippet,
              optionLabel(insight.source),
              trackTitle(tracks, insight.linkedTrackId),
              insight.reviewNeeded ? "Review needed" : "Reviewed",
            ],
            query,
          ),
      ),
    [insights, query, reviewFilter, trackFilter, tracks],
  );

  const currentTrack =
    tracks.find((track) => track.status === "active" && track.id === "track-java-hyperskill") ??
    tracks.find((track) => track.status === "active") ??
    tracks[0] ??
    null;
  const currentTrackLastSession = currentTrack
    ? sortedSessions.find((session) => session.trackId === currentTrack.id) ?? null
    : null;
  const nextPractice =
    filteredPractice.find((item) => item.status === "queued" || item.status === "in_progress") ??
    null;
  const activeTracks = filteredTracks.filter((track) => track.status === "active");
  const visibleTrackList = activeTracks.length > 0 ? activeTracks : filteredTracks;
  const thisWeekMinutes = viewModel.week.reduce((total, day) => total + day.minutes, 0);
  const doneDays = viewModel.week.filter((day) => day.status === "done").length;
  const plannedDays = viewModel.week.filter((day) => day.status === "planned").length;
  const weeklySummary = `${doneDays} sessions logged · ${plannedDays} planned · rhythm stable`;
  const selectedTrack =
    inspector?.type === "track" ? findTrack(tracks, inspector.id) : null;
  const selectedSession =
    inspector?.type === "session"
      ? sessions.find((session) => session.id === inspector.id) ?? null
      : null;
  const selectedInsight =
    inspector?.type === "insight"
      ? insights.find((insight) => insight.id === inspector.id) ?? null
      : null;

  function showSection(section: Exclude<LearningSegment, "overview">) {
    return segment === "overview" || segment === section;
  }

  function openDialog(kind: DialogKind, context: { trackId?: string } = {}) {
    setDialogError(null);
    setInspector(null);

    if (kind === "session") {
      setSessionDraft(initialSessionDraft(tracks, context.trackId));
    }

    if (kind === "track") {
      setTrackDraft(initialTrackDraft());
    }

    if (kind === "practice") {
      setPracticeDraft(initialPracticeDraft(tracks, context.trackId));
    }

    setDialog(kind);
  }

  function closeDialog() {
    setDialog(null);
    setDialogError(null);
  }

  function submitSession() {
    if (
      empty(sessionDraft.title) ||
      empty(sessionDraft.trackId) ||
      empty(sessionDraft.outcome)
    ) {
      setDialogError("Complete Title, Learning Track and Outcome before saving.");
      return;
    }

    const track = findTrack(tracks, sessionDraft.trackId);
    const parsedDuration = Number.parseInt(sessionDraft.durationMinutes, 10);
    const session: LearningSession = {
      id: createId("learning-session-local"),
      title: sessionDraft.title.trim(),
      trackId: sessionDraft.trackId,
      trackTitle: track?.title ?? "Learning Track",
      date: sessionDraft.date || today(),
      durationMinutes: Number.isNaN(parsedDuration) ? 0 : Math.max(0, parsedDuration),
      outcome: sessionDraft.outcome.trim(),
      evidence: sessionDraft.evidence.trim() || "Evidence will be clarified later.",
      energyLabel: sessionDraft.energyLabel,
      status: sessionDraft.status,
      notes: sessionDraft.notes.trim() || undefined,
    };

    setSessions((current) => [session, ...current]);
    setToast({
      title: "Learning session logged locally",
      body: "The session is stored only in local UI state.",
      tone: "success",
    });
    closeDialog();
  }

  function submitTrack() {
    if (
      empty(trackDraft.title) ||
      empty(trackDraft.focusArea) ||
      empty(trackDraft.nextAction)
    ) {
      setDialogError("Complete Title, Focus Area and Next Action before saving.");
      return;
    }

    const parsedProgress = Number.parseInt(trackDraft.progress, 10);
    const track: LearningTrack = {
      id: createId("learning-track-local"),
      title: trackDraft.title.trim(),
      type: trackDraft.type,
      status: trackDraft.status,
      focusArea: trackDraft.focusArea.trim(),
      progress: Number.isNaN(parsedProgress)
        ? 0
        : Math.max(0, Math.min(100, parsedProgress)),
      currentModule: trackDraft.currentModule.trim() || undefined,
      nextAction: trackDraft.nextAction.trim(),
      linkedSkill: trackDraft.linkedSkill.trim() || undefined,
      linkedProject: trackDraft.linkedProject.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    setTracks((current) => [track, ...current]);
    setToast({
      title: "Learning track added locally",
      body: "No course platform or skill detection was used.",
      tone: "success",
    });
    closeDialog();
  }

  function submitPractice() {
    if (empty(practiceDraft.title) || empty(practiceDraft.nextAction)) {
      setDialogError("Complete Title and Next Action before saving.");
      return;
    }

    const item: PracticeQueueItem = {
      id: createId("practice-local"),
      title: practiceDraft.title.trim(),
      source: practiceDraft.source,
      difficulty: practiceDraft.difficulty,
      linkedTrackId: practiceDraft.linkedTrackId || undefined,
      linkedSkill: practiceDraft.linkedSkill.trim() || undefined,
      status: practiceDraft.status,
      nextAction: practiceDraft.nextAction.trim(),
    };

    setPracticeQueue((current) => [item, ...current]);
    setToast({
      title: "Practice item added locally",
      body: "The queue item has no external platform connection.",
      tone: "success",
    });
    closeDialog();
  }

  function startPractice(item: PracticeQueueItem | null) {
    if (!item) {
      setToast({
        title: "No practice item available",
        body: "Add a practice item before starting practice.",
        tone: "info",
      });
      return;
    }

    setPracticeQueue((current) =>
      current.map((entry) =>
        entry.id === item.id ? { ...entry, status: "in_progress" } : entry,
      ),
    );
    setToast({
      title: "Practice started locally",
      body: `${item.title} is now marked as in progress.`,
      tone: "info",
    });
  }

  function markPracticeDone(item: PracticeQueueItem) {
    setPracticeQueue((current) =>
      current.map((entry) =>
        entry.id === item.id ? { ...entry, status: "done" } : entry,
      ),
    );
    setToast({
      title: "Practice marked done locally",
      body: "No external course or coding platform was updated.",
      tone: "success",
    });
  }

  function saveInsightAsNote(insight: LearningInsight) {
    setToast({
      title: "Prepared as local note",
      body: `${insight.title} is ready to become a note in a later persisted flow.`,
      tone: "info",
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-[2208px] flex-col gap-4 pb-8">
      <LearningHeader
        onAddPractice={() => openDialog("practice")}
        onAddTrack={() => openDialog("track")}
        onLogSession={() => openDialog("session")}
      />

      <LearningFilters
        activeSegment={segment}
        difficultyFilter={difficultyFilter}
        onDifficultyFilter={setDifficultyFilter}
        onReviewFilter={setReviewFilter}
        onSearch={setSearch}
        onSegment={setSegment}
        onSourceFilter={setSourceFilter}
        onStatusFilter={setStatusFilter}
        onTrackFilter={setTrackFilter}
        reviewFilter={reviewFilter}
        search={search}
        sourceFilter={sourceFilter}
        statusFilter={statusFilter}
        trackFilter={trackFilter}
        tracks={tracks}
      />

      <CurrentLearningFocus
        currentTrack={currentTrack}
        lastSession={currentTrackLastSession}
        nextPractice={nextPractice}
        onAddTrack={() => openDialog("track")}
        onLogSession={() => openDialog("session", { trackId: currentTrack?.id })}
        onOpenTrack={(track) => setInspector({ type: "track", id: track.id })}
        onStartPractice={startPractice}
        weeklyGoal={viewModel.weeklyGoal}
      />

      <QuickActions
        onAddPractice={() => openDialog("practice", { trackId: currentTrack?.id })}
        onAddTrack={() => openDialog("track")}
        onLogSession={() => openDialog("session", { trackId: currentTrack?.id })}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <WeeklyRhythm summary={weeklySummary} week={viewModel.week} />
        <Panel
          subtitle="Small signals only. Learning Log does not score XP or streaks."
          title="Track Summary"
        >
          <div className="grid gap-2">
            <Metric label="Active Tracks" value={tracks.filter((track) => track.status === "active").length} />
            <Metric
              accent={evidenceAccent}
              label="This Week"
              value={formatDuration(thisWeekMinutes)}
            />
            <Metric
              accent={warningAccent}
              label="Practice Items"
              value={practiceQueue.filter((item) => item.status !== "done").length}
            />
            <Metric
              accent={successAccent}
              label="Insights"
              value={insights.length}
            />
          </div>
        </Panel>
      </div>

      {showSection("tracks") ? (
        <Panel
          badge={<Pill>{visibleTrackList.length} tracks</Pill>}
          subtitle="Active and planned learning tracks with module, progress and next action."
          title="Active Learning Tracks"
        >
          {visibleTrackList.length === 0 ? (
            <EmptyState
              actionLabel="Add learning track"
              description="Create a local learning track to connect sessions and practice work."
              onAction={() => openDialog("track")}
              title={query ? "No learning tracks match the filters" : "No learning tracks yet"}
            />
          ) : (
            <div className="grid gap-3 xl:grid-cols-2">
              {visibleTrackList.map((track) => (
                <TrackCard
                  key={track.id}
                  onLogSession={(item) => openDialog("session", { trackId: item.id })}
                  onOpen={(item) => setInspector({ type: "track", id: item.id })}
                  track={track}
                />
              ))}
            </div>
          )}
        </Panel>
      ) : null}

      {showSection("practice") ? (
        <Panel
          badge={<Pill accent={warningAccent}>{filteredPractice.length} items</Pill>}
          subtitle="Next exercises and course tasks. No external platform state is implied."
          title="Practice Queue"
        >
          {filteredPractice.length === 0 ? (
            <EmptyState
              actionLabel="Add practice item"
              description="Add the next manual exercise, course task or reading practice."
              onAction={() => openDialog("practice")}
              title={query ? "No practice items match the filters" : "No practice items yet"}
            />
          ) : (
            <div className="grid gap-3 xl:grid-cols-2">
              {filteredPractice.map((item) => (
                <PracticeItemCard
                  item={item}
                  key={item.id}
                  onMarkDone={markPracticeDone}
                  onStart={startPractice}
                  tracks={tracks}
                />
              ))}
            </div>
          )}
        </Panel>
      ) : null}

      {showSection("sessions") ? (
        <Panel
          badge={<Pill accent={evidenceAccent}>{filteredSessions.length} sessions</Pill>}
          subtitle="Recent sessions with outcome and evidence rather than scorekeeping."
          title="Recent Learning Sessions"
        >
          {filteredSessions.length === 0 ? (
            <EmptyState
              actionLabel="Log learning session"
              description="Log a local study session with outcome and evidence."
              onAction={() => openDialog("session")}
              title={query ? "No sessions match the filters" : "No learning sessions yet"}
            />
          ) : (
            <div className="grid gap-3">
              {filteredSessions.slice(0, segment === "overview" ? 6 : undefined).map((session) => (
                <SessionRow
                  key={session.id}
                  onOpen={(item) => setInspector({ type: "session", id: item.id })}
                  session={session}
                />
              ))}
            </div>
          )}
        </Panel>
      ) : null}

      {showSection("insights") ? (
        <Panel
          badge={<Pill>{filteredInsights.length} insights</Pill>}
          subtitle="Learning observations that may become notes after manual review."
          title="Learning Insights"
        >
          {filteredInsights.length === 0 ? (
            <EmptyState
              description="Insights appear after sessions, practice or reflection notes."
              title={query ? "No insights match the filters" : "No learning insights yet"}
            />
          ) : (
            <div className="grid gap-3 xl:grid-cols-2">
              {filteredInsights.map((insight) => (
                <InsightCard
                  insight={insight}
                  key={insight.id}
                  onOpen={(item) => setInspector({ type: "insight", id: item.id })}
                  onSaveAsNote={saveInsightAsNote}
                  tracks={tracks}
                />
              ))}
            </div>
          )}
        </Panel>
      ) : null}

      <Panel
        className="opacity-95"
        subtitle="Prepared method rules for the manual MVP flow."
        title="Learning Method Notes"
      >
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {viewModel.methodNotes.map((note, index) => (
            <li
              className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.40)] p-3 text-[11px] leading-4 text-[var(--text-secondary)]"
              key={`learning-log-method-note-${index}`}
            >
              {note}
            </li>
          ))}
        </ul>
      </Panel>

      {dialog ? (
        <DialogShell
          labelledBy="learning-dialog-heading"
          onClose={closeDialog}
          open
        >
          <LearningFormDialog
            dialog={dialog}
            dialogError={dialogError}
            onClose={closeDialog}
            onPracticeDraft={setPracticeDraft}
            onSessionDraft={setSessionDraft}
            onSubmitPractice={submitPractice}
            onSubmitSession={submitSession}
            onSubmitTrack={submitTrack}
            onTrackDraft={setTrackDraft}
            practiceDraft={practiceDraft}
            sessionDraft={sessionDraft}
            trackDraft={trackDraft}
            tracks={tracks}
          />
        </DialogShell>
      ) : null}

      <LearningInspector
        insights={insights}
        inspector={inspector}
        onAddPractice={(trackId) => openDialog("practice", { trackId })}
        onClose={() => setInspector(null)}
        onEditSession={(session) => {
          setSessionDraft({
            title: session.title,
            trackId: session.trackId,
            date: session.date,
            durationMinutes: String(session.durationMinutes),
            outcome: session.outcome,
            evidence: session.evidence,
            energyLabel: session.energyLabel,
            status: session.status,
            notes: session.notes ?? "",
          });
          setDialogError(null);
          setInspector(null);
          setDialog("session");
        }}
        onLogSession={(trackId) => openDialog("session", { trackId })}
        onSaveAsNote={saveInsightAsNote}
        practiceQueue={practiceQueue}
        selectedInsight={selectedInsight}
        selectedSession={selectedSession}
        selectedTrack={selectedTrack}
        sessions={sessions}
        tracks={tracks}
      />
      <Toast onDismiss={dismissToast} toast={toast} />
    </div>
  );
}

function initialSessionDraft(
  tracks: readonly LearningTrack[],
  trackId?: string,
): SessionDraft {
  const track = findTrack(tracks, trackId) ?? tracks[0];

  return {
    title: "",
    trackId: track?.id ?? "",
    date: today(),
    durationMinutes: "30",
    outcome: "",
    evidence: "",
    energyLabel: "medium",
    status: "done",
    notes: "",
  };
}

function initialTrackDraft(): TrackDraft {
  return {
    title: "",
    type: "course",
    status: "active",
    focusArea: "",
    progress: "0",
    currentModule: "",
    nextAction: "",
    linkedSkill: "",
    linkedProject: "",
  };
}

function initialPracticeDraft(
  tracks: readonly LearningTrack[],
  trackId?: string,
): PracticeDraft {
  const track = findTrack(tracks, trackId) ?? tracks[0];

  return {
    title: "",
    source: "manual",
    difficulty: "medium",
    linkedTrackId: track?.id ?? "",
    linkedSkill: track?.linkedSkill ?? "",
    status: "queued",
    nextAction: "",
  };
}

function LearningFormDialog({
  dialog,
  dialogError,
  onClose,
  onPracticeDraft,
  onSessionDraft,
  onSubmitPractice,
  onSubmitSession,
  onSubmitTrack,
  onTrackDraft,
  practiceDraft,
  sessionDraft,
  trackDraft,
  tracks,
}: Readonly<{
  dialog: Exclude<DialogKind, null>;
  dialogError: string | null;
  onClose: () => void;
  onPracticeDraft: (draft: PracticeDraft) => void;
  onSessionDraft: (draft: SessionDraft) => void;
  onSubmitPractice: () => void;
  onSubmitSession: () => void;
  onSubmitTrack: () => void;
  onTrackDraft: (draft: TrackDraft) => void;
  practiceDraft: PracticeDraft;
  sessionDraft: SessionDraft;
  trackDraft: TrackDraft;
  tracks: readonly LearningTrack[];
}>) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (dialog === "session") {
      onSubmitSession();
    } else if (dialog === "track") {
      onSubmitTrack();
    } else {
      onSubmitPractice();
    }
  }

  const title =
    dialog === "session"
      ? "Log learning session"
      : dialog === "track"
        ? "Add learning track"
        : "Add practice item";
  const description =
    dialog === "session"
      ? "Save a local session with outcome and evidence."
      : dialog === "track"
        ? "Create a local learning track. No platform sync is used."
        : "Add a local practice queue item.";

  return (
    <form className="flex max-h-[calc(100dvh-24px)] flex-col" onSubmit={submit}>
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-blue)]">
          Learning Log
        </p>
        <h2
          className="mt-1 text-[20px] font-semibold leading-6 text-[var(--text-primary)]"
          id="learning-dialog-heading"
        >
          {title}
        </h2>
        <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
          {description}
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

        {dialog === "session" ? (
          <div className="grid gap-4">
            <label htmlFor="session-title">
              <FieldLabel>Title *</FieldLabel>
              <input
                className={inputClass}
                id="session-title"
                onChange={(event) =>
                  onSessionDraft({ ...sessionDraft, title: event.target.value })
                }
                value={sessionDraft.title}
              />
            </label>
            <label htmlFor="session-track">
              <FieldLabel>Learning Track *</FieldLabel>
              <select
                className={inputClass}
                id="session-track"
                onChange={(event) =>
                  onSessionDraft({ ...sessionDraft, trackId: event.target.value })
                }
                value={sessionDraft.trackId}
              >
                {tracks.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label htmlFor="session-date">
                <FieldLabel>Date</FieldLabel>
                <input
                  className={inputClass}
                  id="session-date"
                  onChange={(event) =>
                    onSessionDraft({ ...sessionDraft, date: event.target.value })
                  }
                  type="date"
                  value={sessionDraft.date}
                />
              </label>
              <label htmlFor="session-duration">
                <FieldLabel>Duration minutes</FieldLabel>
                <input
                  className={inputClass}
                  id="session-duration"
                  min={0}
                  onChange={(event) =>
                    onSessionDraft({
                      ...sessionDraft,
                      durationMinutes: event.target.value,
                    })
                  }
                  type="number"
                  value={sessionDraft.durationMinutes}
                />
              </label>
            </div>
            <label htmlFor="session-outcome">
              <FieldLabel>Outcome *</FieldLabel>
              <textarea
                className={textareaClass}
                id="session-outcome"
                onChange={(event) =>
                  onSessionDraft({ ...sessionDraft, outcome: event.target.value })
                }
                value={sessionDraft.outcome}
              />
            </label>
            <label htmlFor="session-evidence">
              <FieldLabel optional>Evidence</FieldLabel>
              <textarea
                className={textareaClass}
                id="session-evidence"
                onChange={(event) =>
                  onSessionDraft({ ...sessionDraft, evidence: event.target.value })
                }
                value={sessionDraft.evidence}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label htmlFor="session-energy">
                <FieldLabel>Energy Label</FieldLabel>
                <select
                  className={inputClass}
                  id="session-energy"
                  onChange={(event) =>
                    onSessionDraft({
                      ...sessionDraft,
                      energyLabel: event.target.value as LearningSession["energyLabel"],
                    })
                  }
                  value={sessionDraft.energyLabel}
                >
                  {energyLabels.map((energy) => (
                    <option key={energy} value={energy}>
                      {energyMeta[energy].label}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="session-status">
                <FieldLabel>Status</FieldLabel>
                <select
                  className={inputClass}
                  id="session-status"
                  onChange={(event) =>
                    onSessionDraft({
                      ...sessionDraft,
                      status: event.target.value as LearningSession["status"],
                    })
                  }
                  value={sessionDraft.status}
                >
                  {sessionStatuses.map((status) => (
                    <option key={status} value={status}>
                      {sessionStatusMeta[status].label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label htmlFor="session-notes">
              <FieldLabel optional>Notes</FieldLabel>
              <textarea
                className={textareaClass}
                id="session-notes"
                onChange={(event) =>
                  onSessionDraft({ ...sessionDraft, notes: event.target.value })
                }
                value={sessionDraft.notes}
              />
            </label>
          </div>
        ) : null}

        {dialog === "track" ? (
          <div className="grid gap-4">
            <label htmlFor="track-title">
              <FieldLabel>Title *</FieldLabel>
              <input
                className={inputClass}
                id="track-title"
                onChange={(event) =>
                  onTrackDraft({ ...trackDraft, title: event.target.value })
                }
                value={trackDraft.title}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label htmlFor="track-type">
                <FieldLabel>Type</FieldLabel>
                <select
                  className={inputClass}
                  id="track-type"
                  onChange={(event) =>
                    onTrackDraft({
                      ...trackDraft,
                      type: event.target.value as LearningTrackType,
                    })
                  }
                  value={trackDraft.type}
                >
                  {trackTypes.map((type) => (
                    <option key={type} value={type}>
                      {optionLabel(type)}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="track-status">
                <FieldLabel>Status</FieldLabel>
                <select
                  className={inputClass}
                  id="track-status"
                  onChange={(event) =>
                    onTrackDraft({
                      ...trackDraft,
                      status: event.target.value as LearningTrackStatus,
                    })
                  }
                  value={trackDraft.status}
                >
                  {trackStatuses.map((status) => (
                    <option key={status} value={status}>
                      {trackStatusMeta[status].label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label htmlFor="track-focus">
              <FieldLabel>Focus Area *</FieldLabel>
              <input
                className={inputClass}
                id="track-focus"
                onChange={(event) =>
                  onTrackDraft({ ...trackDraft, focusArea: event.target.value })
                }
                value={trackDraft.focusArea}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label htmlFor="track-progress">
                <FieldLabel>Progress</FieldLabel>
                <input
                  className={inputClass}
                  id="track-progress"
                  max={100}
                  min={0}
                  onChange={(event) =>
                    onTrackDraft({ ...trackDraft, progress: event.target.value })
                  }
                  type="number"
                  value={trackDraft.progress}
                />
              </label>
              <label htmlFor="track-module">
                <FieldLabel optional>Current Module</FieldLabel>
                <input
                  className={inputClass}
                  id="track-module"
                  onChange={(event) =>
                    onTrackDraft({
                      ...trackDraft,
                      currentModule: event.target.value,
                    })
                  }
                  value={trackDraft.currentModule}
                />
              </label>
            </div>
            <label htmlFor="track-next-action">
              <FieldLabel>Next Action *</FieldLabel>
              <textarea
                className={textareaClass}
                id="track-next-action"
                onChange={(event) =>
                  onTrackDraft({ ...trackDraft, nextAction: event.target.value })
                }
                value={trackDraft.nextAction}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label htmlFor="track-linked-skill">
                <FieldLabel optional>Linked Skill</FieldLabel>
                <input
                  className={inputClass}
                  id="track-linked-skill"
                  onChange={(event) =>
                    onTrackDraft({ ...trackDraft, linkedSkill: event.target.value })
                  }
                  value={trackDraft.linkedSkill}
                />
              </label>
              <label htmlFor="track-linked-project">
                <FieldLabel optional>Linked Project</FieldLabel>
                <input
                  className={inputClass}
                  id="track-linked-project"
                  onChange={(event) =>
                    onTrackDraft({
                      ...trackDraft,
                      linkedProject: event.target.value,
                    })
                  }
                  value={trackDraft.linkedProject}
                />
              </label>
            </div>
          </div>
        ) : null}

        {dialog === "practice" ? (
          <div className="grid gap-4">
            <label htmlFor="practice-title">
              <FieldLabel>Title *</FieldLabel>
              <input
                className={inputClass}
                id="practice-title"
                onChange={(event) =>
                  onPracticeDraft({ ...practiceDraft, title: event.target.value })
                }
                value={practiceDraft.title}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label htmlFor="practice-source">
                <FieldLabel>Source</FieldLabel>
                <select
                  className={inputClass}
                  id="practice-source"
                  onChange={(event) =>
                    onPracticeDraft({
                      ...practiceDraft,
                      source: event.target.value as PracticeQueueItem["source"],
                    })
                  }
                  value={practiceDraft.source}
                >
                  {practiceSources.map((source) => (
                    <option key={source} value={source}>
                      {sourceLabels[source]}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="practice-difficulty">
                <FieldLabel>Difficulty</FieldLabel>
                <select
                  className={inputClass}
                  id="practice-difficulty"
                  onChange={(event) =>
                    onPracticeDraft({
                      ...practiceDraft,
                      difficulty: event.target.value as PracticeQueueItem["difficulty"],
                    })
                  }
                  value={practiceDraft.difficulty}
                >
                  {practiceDifficulties.map((difficulty) => (
                    <option key={difficulty} value={difficulty}>
                      {difficultyMeta[difficulty].label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label htmlFor="practice-track">
              <FieldLabel optional>Linked Track</FieldLabel>
              <select
                className={inputClass}
                id="practice-track"
                onChange={(event) => {
                  const linkedTrack = findTrack(tracks, event.target.value);
                  onPracticeDraft({
                    ...practiceDraft,
                    linkedSkill: linkedTrack?.linkedSkill ?? practiceDraft.linkedSkill,
                    linkedTrackId: event.target.value,
                  });
                }}
                value={practiceDraft.linkedTrackId}
              >
                <option value="">No linked track</option>
                {tracks.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label htmlFor="practice-linked-skill">
                <FieldLabel optional>Linked Skill</FieldLabel>
                <input
                  className={inputClass}
                  id="practice-linked-skill"
                  onChange={(event) =>
                    onPracticeDraft({
                      ...practiceDraft,
                      linkedSkill: event.target.value,
                    })
                  }
                  value={practiceDraft.linkedSkill}
                />
              </label>
              <label htmlFor="practice-status">
                <FieldLabel>Status</FieldLabel>
                <select
                  className={inputClass}
                  id="practice-status"
                  onChange={(event) =>
                    onPracticeDraft({
                      ...practiceDraft,
                      status: event.target.value as PracticeQueueItem["status"],
                    })
                  }
                  value={practiceDraft.status}
                >
                  {practiceStatuses.map((status) => (
                    <option key={status} value={status}>
                      {practiceStatusMeta[status].label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label htmlFor="practice-next-action">
              <FieldLabel>Next Action *</FieldLabel>
              <textarea
                className={textareaClass}
                id="practice-next-action"
                onChange={(event) =>
                  onPracticeDraft({
                    ...practiceDraft,
                    nextAction: event.target.value,
                  })
                }
                value={practiceDraft.nextAction}
              />
            </label>
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

function LearningInspector({
  insights,
  inspector,
  onAddPractice,
  onClose,
  onEditSession,
  onLogSession,
  onSaveAsNote,
  practiceQueue,
  selectedInsight,
  selectedSession,
  selectedTrack,
  sessions,
  tracks,
}: Readonly<{
  insights: readonly LearningInsight[];
  inspector: InspectorState;
  onAddPractice: (trackId?: string) => void;
  onClose: () => void;
  onEditSession: (session: LearningSession) => void;
  onLogSession: (trackId?: string) => void;
  onSaveAsNote: (insight: LearningInsight) => void;
  practiceQueue: readonly PracticeQueueItem[];
  selectedInsight: LearningInsight | null;
  selectedSession: LearningSession | null;
  selectedTrack: LearningTrack | null;
  sessions: readonly LearningSession[];
  tracks: readonly LearningTrack[];
}>) {
  if (!inspector) {
    return null;
  }

  const title =
    selectedTrack?.title ??
    selectedSession?.title ??
    selectedInsight?.title ??
    "Learning detail";

  return (
    <DialogShell
      labelledBy="learning-inspector-heading"
      onClose={onClose}
      open
      sheet
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-blue)]">
            Learning Inspector
          </p>
          <h2
            className="mt-1 text-[20px] font-semibold leading-6 text-[var(--text-primary)]"
            id="learning-inspector-heading"
          >
            {title}
          </h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {selectedTrack ? (
            <TrackInspectorBody
              insights={insights.filter(
                (insight) => insight.linkedTrackId === selectedTrack.id,
              )}
              onAddPractice={() => onAddPractice(selectedTrack.id)}
              onLogSession={() => onLogSession(selectedTrack.id)}
              practiceQueue={practiceQueue.filter(
                (item) => item.linkedTrackId === selectedTrack.id,
              )}
              sessions={sessions.filter(
                (session) => session.trackId === selectedTrack.id,
              )}
              track={selectedTrack}
            />
          ) : null}

          {selectedSession ? (
            <div className="grid gap-3">
              <Metric label="Linked Track" value={selectedSession.trackTitle} />
              <Metric
                accent={evidenceAccent}
                label="Duration"
                value={formatDuration(selectedSession.durationMinutes)}
              />
              <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  Outcome
                </p>
                <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
                  {selectedSession.outcome}
                </p>
              </div>
              <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  Evidence
                </p>
                <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
                  {selectedSession.evidence}
                </p>
              </div>
              <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  Notes
                </p>
                <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
                  {selectedSession.notes ?? "No notes captured yet."}
                </p>
              </div>
              <button
                className={secondaryButtonClass}
                onClick={() => onEditSession(selectedSession)}
                type="button"
              >
                Edit draft
              </button>
            </div>
          ) : null}

          {selectedInsight ? (
            <div className="grid gap-3">
              <Pill accent={selectedInsight.reviewNeeded ? warningAccent : successAccent}>
                {selectedInsight.reviewNeeded ? "Review needed" : "Reviewed"}
              </Pill>
              <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  Snippet
                </p>
                <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
                  {selectedInsight.snippet}
                </p>
              </div>
              <Metric
                accent={evidenceAccent}
                label="Linked Track"
                value={trackTitle(tracks, selectedInsight.linkedTrackId)}
              />
              <button
                className={secondaryButtonClass}
                onClick={() => onSaveAsNote(selectedInsight)}
                type="button"
              >
                Save as note
              </button>
            </div>
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

function TrackInspectorBody({
  insights,
  onAddPractice,
  onLogSession,
  practiceQueue,
  sessions,
  track,
}: Readonly<{
  insights: readonly LearningInsight[];
  onAddPractice: () => void;
  onLogSession: () => void;
  practiceQueue: readonly PracticeQueueItem[];
  sessions: readonly LearningSession[];
  track: LearningTrack;
}>) {
  return (
    <div className="grid gap-4">
      <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-4">
        <div className="flex flex-wrap gap-2">
          <Pill accent={trackStatusMeta[track.status].accent}>
            {trackStatusMeta[track.status].label}
          </Pill>
          <Pill accent={evidenceAccent}>{optionLabel(track.type)}</Pill>
        </div>
        <p className="mt-3 text-[12px] leading-5 text-[var(--text-secondary)]">
          {track.focusArea}
        </p>
        <div className="mt-3">
          <ProgressBar value={track.progress} />
        </div>
        <p className="mt-3 text-[12px] leading-5 text-[var(--text-secondary)]">
          <span className="font-semibold text-[var(--text-primary)]">Next:</span>{" "}
          {track.nextAction}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Metric label="Sessions" value={sessions.length} />
        <Metric
          accent={warningAccent}
          label="Practice"
          value={practiceQueue.filter((item) => item.status !== "done").length}
        />
        <Metric
          accent={successAccent}
          label="Insights"
          value={insights.length}
        />
        <Metric label="Module" value={track.currentModule ?? "Not set"} />
      </div>
      <div className="grid gap-2">
        <button className={primaryButtonClass} onClick={onLogSession} type="button">
          Log session
        </button>
        <button className={secondaryButtonClass} onClick={onAddPractice} type="button">
          Add practice
        </button>
      </div>
      <InspectorList title="Sessions">
        {sessions.length === 0 ? (
          <p className="text-[12px] text-[var(--text-muted)]">No sessions yet.</p>
        ) : (
          sessions.slice(0, 4).map((session) => (
            <div
              className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(7,11,18,.22)] p-3"
              key={session.id}
            >
              <p className="text-[12px] font-semibold text-[var(--text-primary)]">
                {session.title}
              </p>
              <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                {formatDate(session.date)} · {formatDuration(session.durationMinutes)}
              </p>
            </div>
          ))
        )}
      </InspectorList>
      <InspectorList title="Practice Queue">
        {practiceQueue.length === 0 ? (
          <p className="text-[12px] text-[var(--text-muted)]">No practice items yet.</p>
        ) : (
          practiceQueue.slice(0, 4).map((item) => (
            <div
              className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(7,11,18,.22)] p-3"
              key={item.id}
            >
              <p className="text-[12px] font-semibold text-[var(--text-primary)]">
                {item.title}
              </p>
              <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                {practiceStatusMeta[item.status].label} · {item.nextAction}
              </p>
            </div>
          ))
        )}
      </InspectorList>
      <InspectorList title="Insights">
        {insights.length === 0 ? (
          <p className="text-[12px] text-[var(--text-muted)]">No insights yet.</p>
        ) : (
          insights.slice(0, 3).map((insight) => (
            <div
              className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(7,11,18,.22)] p-3"
              key={insight.id}
            >
              <p className="text-[12px] font-semibold text-[var(--text-primary)]">
                {insight.title}
              </p>
              <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                {insight.reviewNeeded ? "Review needed" : "Reviewed"}
              </p>
            </div>
          ))
        )}
      </InspectorList>
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
