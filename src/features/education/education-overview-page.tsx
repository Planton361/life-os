"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { contentStateDataAttributes } from "@/features/content-state";
import { cn } from "@/lib/cn";
import type {
  AcademicRhythmSignal,
  EducationOverviewStats,
  EducationOverviewViewModel,
  EducationSegment,
  LiteratureItem,
  LiteratureStatus,
  ResearchField,
  ResearchIdea,
  ResearchIdeaStatus,
  ResearchNote,
  ResearchNoteType,
  ResearchQuestion,
  ThesisPotential,
} from "./types";
import { EducationManualWorkspace } from "./education-manual-workspace";

type EducationStyle = CSSProperties & {
  "--accent"?: string;
  "--progress-width"?: string;
};

type ToastState = {
  title: string;
  body: string;
  tone: "success" | "info" | "error";
};

type ActiveDialog = "idea" | "literature" | "note" | "question" | null;

type InspectorState =
  | { type: "idea"; id: string }
  | { type: "literature"; id: string }
  | { type: "question"; id: string }
  | null;

type LinkContext = {
  ideaId?: string;
  literatureId?: string;
  fieldId?: string;
};

type IdeaDraft = {
  title: string;
  fieldId: string;
  status: ResearchIdeaStatus;
  thesisPotential: ThesisPotential;
  summary: string;
  researchQuestion: string;
  nextAction: string;
};

type LiteratureDraft = {
  title: string;
  authors: string;
  year: string;
  type: LiteratureItem["type"];
  status: LiteratureStatus;
  relevance: LiteratureItem["relevance"];
  ideaId: string;
  fieldId: string;
  nextAction: string;
  note: string;
};

type NoteDraft = {
  title: string;
  type: ResearchNoteType;
  ideaId: string;
  literatureId: string;
  fieldId: string;
  snippet: string;
  tags: string;
  source: ResearchNote["source"];
  reviewNeeded: boolean;
};

type QuestionDraft = {
  question: string;
  ideaId: string;
  fieldId: string;
  importance: ResearchQuestion["importance"];
  status: ResearchQuestion["status"];
  nextAction: string;
};

const educationAccent = "var(--accent-blue)";
const literatureAccent = "var(--accent-cyan)";
const ideaAccent = "var(--accent-purple)";
const questionAccent = "var(--accent-orange)";

const educationSegments: readonly { value: EducationSegment; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "ideas", label: "Ideas" },
  { value: "literature", label: "Literature" },
  { value: "questions", label: "Questions" },
  { value: "fields", label: "Fields" },
];

const ideaStatuses: readonly ResearchIdeaStatus[] = [
  "idea",
  "exploring",
  "promising",
  "active",
  "paused",
  "rejected",
  "archived",
];

const literatureStatuses: readonly LiteratureStatus[] = [
  "to_read",
  "reading",
  "extracting",
  "reviewed",
  "used",
  "discarded",
];

const noteTypes: readonly ResearchNoteType[] = [
  "summary",
  "argument",
  "method",
  "quote",
  "question",
  "decision",
  "source_note",
];

const ideaStatusMeta: Record<
  ResearchIdeaStatus,
  { label: string; accent: string }
> = {
  idea: { label: "Idea", accent: educationAccent },
  exploring: { label: "Exploring", accent: educationAccent },
  promising: { label: "Promising", accent: ideaAccent },
  active: { label: "Active", accent: "var(--accent-green)" },
  paused: { label: "Paused", accent: "var(--text-muted)" },
  rejected: { label: "Rejected", accent: "var(--accent-red)" },
  archived: { label: "Archived", accent: "var(--text-muted)" },
};

const thesisPotentialLabels: Record<ThesisPotential, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  unknown: "Unknown",
};

const literatureStatusMeta: Record<
  LiteratureStatus,
  { label: string; accent: string }
> = {
  to_read: { label: "To read", accent: literatureAccent },
  reading: { label: "Reading", accent: educationAccent },
  extracting: { label: "Extracting", accent: ideaAccent },
  reviewed: { label: "Reviewed", accent: "var(--accent-green)" },
  used: { label: "Used", accent: "var(--accent-green)" },
  discarded: { label: "Discarded", accent: "var(--accent-red)" },
};

const literatureTypeLabels: Record<LiteratureItem["type"], string> = {
  paper: "Paper",
  book: "Book",
  article: "Article",
  thesis: "Thesis",
  report: "Report",
  website: "Website",
  other: "Other",
};

const noteTypeLabels: Record<ResearchNoteType, string> = {
  summary: "Summary",
  argument: "Argument",
  method: "Method",
  quote: "Quote",
  question: "Question",
  decision: "Decision",
  source_note: "Source note",
};

const questionStatusMeta: Record<
  ResearchQuestion["status"],
  { label: string; accent: string }
> = {
  open: { label: "Open", accent: questionAccent },
  investigating: { label: "Investigating", accent: educationAccent },
  answered: { label: "Answered", accent: "var(--accent-green)" },
  parked: { label: "Parked", accent: "var(--text-muted)" },
};

const importanceMeta: Record<
  ResearchQuestion["importance"],
  { label: string; accent: string }
> = {
  low: { label: "Low", accent: "var(--text-muted)" },
  medium: { label: "Medium", accent: educationAccent },
  high: { label: "High", accent: questionAccent },
};

const relevanceMeta: Record<
  LiteratureItem["relevance"],
  { label: string; accent: string }
> = {
  low: { label: "Low relevance", accent: "var(--text-muted)" },
  medium: { label: "Medium relevance", accent: educationAccent },
  high: { label: "High relevance", accent: literatureAccent },
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

function accentStyle(accent: string): EducationStyle {
  return {
    "--accent": accent,
  };
}

function progressStyle(value: number): EducationStyle {
  return {
    "--progress-width": `${Math.max(0, Math.min(100, value))}%`,
  };
}

function sectionId(title: string) {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-section`;
}

function fieldIsEmpty(value: string) {
  return value.trim().length === 0;
}

function optionLabel(value: string) {
  return value
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function formatDate(value: string) {
  return value.split("T")[0] ?? value;
}

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function dialogBackdropClose(
  event: MouseEvent<HTMLDialogElement>,
  onClose: () => void,
) {
  if (event.target === event.currentTarget) {
    onClose();
  }
}

function linkedIdeaTitle(ideas: readonly ResearchIdea[], ideaId?: string) {
  if (!ideaId) {
    return "No linked idea";
  }

  return ideas.find((idea) => idea.id === ideaId)?.title ?? "Linked idea";
}

function linkedFieldTitle(fields: readonly ResearchField[], fieldId?: string) {
  if (!fieldId) {
    return "No linked field";
  }

  return fields.find((field) => field.id === fieldId)?.title ?? "Linked field";
}

function EducationPill({
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

function EducationPanel({
  title,
  subtitle,
  badge,
  children,
  className,
  dataSection,
  stateAttributes,
}: Readonly<{
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
  dataSection?: string;
  stateAttributes?: Record<string, string>;
}>) {
  const id = sectionId(title);

  return (
    <section
      aria-labelledby={id}
      className={cn(
        "min-w-0 overflow-hidden rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[var(--surface-1)] shadow-[0_8px_22px_rgba(0,0,0,.12)]",
        className,
      )}
      data-education-section={dataSection}
      {...stateAttributes}
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

function FormField({
  id,
  label,
  children,
  error,
  optional,
}: Readonly<{
  id: string;
  label: string;
  children: ReactNode;
  error?: string | null;
  optional?: boolean;
}>) {
  return (
    <label className="block" htmlFor={id}>
      <FieldLabel optional={optional}>{label}</FieldLabel>
      {children}
      {error ? (
        <p className="mt-1 text-[11px] leading-4 text-[var(--accent-red)]">
          {error}
        </p>
      ) : null}
    </label>
  );
}

function EducationEmptyState({
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

function EducationErrorState({
  message,
  onDismiss,
}: Readonly<{
  message: string;
  onDismiss: () => void;
}>) {
  return (
    <div
      className="rounded-[14px] border border-[rgba(221,107,95,.36)] bg-[rgba(221,107,95,.08)] p-4"
      role="alert"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Local save error
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
            {message}
          </p>
        </div>
        <button className={quietButtonClass} onClick={onDismiss} type="button">
          Dismiss
        </button>
      </div>
    </div>
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
        toast.tone === "success" && "border-[rgba(66,184,131,.34)]",
        toast.tone === "info" && "border-[rgba(95,200,215,.34)]",
        toast.tone === "error" && "border-[rgba(221,107,95,.34)]",
      )}
      role="status"
    >
      <div className="flex gap-3">
        <span
          aria-hidden="true"
          className={cn(
            "mt-1 size-2.5 shrink-0 rounded-full",
            toast.tone === "success" && "bg-[var(--accent-green)]",
            toast.tone === "info" && "bg-[var(--accent-cyan)]",
            toast.tone === "error" && "bg-[var(--accent-red)]",
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

function EducationDialog({
  open,
  onClose,
  labelledBy,
  children,
  sheet = false,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
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
          ? "fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-dvh w-[min(540px,100vw)] rounded-none border-y-0 border-r-0"
          : "w-[min(720px,calc(100vw-24px))] rounded-[18px]",
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

function DialogHeader({
  eyebrow,
  title,
  description,
  id,
}: Readonly<{
  eyebrow: string;
  title: string;
  description: string;
  id: string;
}>) {
  return (
    <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-blue)]">
        {eyebrow}
      </p>
      <h2
        className="mt-1 text-[20px] font-semibold leading-6 text-[var(--text-primary)]"
        id={id}
      >
        {title}
      </h2>
      <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
        {description}
      </p>
    </div>
  );
}

function DialogFooter({
  error,
  onClose,
  submitLabel,
}: Readonly<{
  error: string | null;
  onClose: () => void;
  submitLabel: string;
}>) {
  return (
    <div className="border-t border-[var(--border-subtle)] bg-[rgba(7,11,18,.58)] px-4 py-3">
      {error ? (
        <p className="mb-3 text-[11px] leading-4 text-[var(--accent-red)]">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button className={secondaryButtonClass} onClick={onClose} type="button">
          Cancel
        </button>
        <button className={primaryButtonClass} type="submit">
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

function TextStat({
  label,
  value,
  accent = educationAccent,
}: Readonly<{
  label: string;
  value: string | number;
  accent?: string;
}>) {
  return (
    <div
      className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-3"
      style={accentStyle(accent)}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-[20px] font-semibold leading-6 text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

function EducationPageHeader({
  viewModel,
  actionsEnabled,
  onAddIdea,
  onAddLiterature,
  onAddNote,
  onAddQuestion,
}: Readonly<{
  viewModel: EducationOverviewViewModel;
  actionsEnabled: boolean;
  onAddIdea: () => void;
  onAddLiterature: () => void;
  onAddNote: () => void;
  onAddQuestion: () => void;
}>) {
  return (
    <header className="rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[var(--surface-1)] px-4 py-5 shadow-[0_8px_22px_rgba(0,0,0,.12)] sm:px-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-blue)]">
            {viewModel.header.eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight text-[var(--text-primary)]">
            {viewModel.header.title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            {viewModel.header.summary}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:flex xl:justify-end">
          <button
            className={primaryButtonClass}
            disabled={!actionsEnabled}
            onClick={onAddIdea}
            type="button"
          >
            Add research idea
          </button>
          <button
            className={secondaryButtonClass}
            disabled={!actionsEnabled}
            onClick={onAddLiterature}
            type="button"
          >
            Add literature
          </button>
          <button
            className={secondaryButtonClass}
            disabled={!actionsEnabled}
            onClick={onAddNote}
            type="button"
          >
            Capture research note
          </button>
          <button
            className={secondaryButtonClass}
            disabled={!actionsEnabled}
            onClick={onAddQuestion}
            type="button"
          >
            Add question
          </button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link className={quietButtonClass} href="/education/scientific-work">
          Scientific Work
        </Link>
        <Link className={quietButtonClass} href="/education/literature">
          Literature
        </Link>
        <Link className={quietButtonClass} href="/education/learning-log">
          Learning Log
        </Link>
      </div>
    </header>
  );
}

function EducationControls({
  activeSegment,
  fieldFilter,
  fields,
  ideaStatusFilter,
  literatureStatusFilter,
  relevanceFilter,
  reviewNeededFilter,
  search,
  stateAttributes,
  thesisFilter,
  onActiveSegmentChange,
  onFieldFilterChange,
  onIdeaStatusFilterChange,
  onLiteratureStatusFilterChange,
  onRelevanceFilterChange,
  onReviewNeededFilterChange,
  onSearchChange,
  onThesisFilterChange,
}: Readonly<{
  activeSegment: EducationSegment;
  fieldFilter: string;
  fields: readonly ResearchField[];
  ideaStatusFilter: string;
  literatureStatusFilter: string;
  relevanceFilter: string;
  reviewNeededFilter: string;
  search: string;
  stateAttributes?: Record<string, string>;
  thesisFilter: string;
  onActiveSegmentChange: (value: EducationSegment) => void;
  onFieldFilterChange: (value: string) => void;
  onIdeaStatusFilterChange: (value: string) => void;
  onLiteratureStatusFilterChange: (value: string) => void;
  onRelevanceFilterChange: (value: string) => void;
  onReviewNeededFilterChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onThesisFilterChange: (value: string) => void;
}>) {
  return (
    <section
      aria-label="Education filters"
      className="rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-3"
      data-education-section="filters"
      {...stateAttributes}
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(240px,360px)_1fr]">
        <label className="block" htmlFor="education-search">
          <FieldLabel>Search research</FieldLabel>
          <input
            className={inputClass}
            id="education-search"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search research"
            type="search"
            value={search}
          />
        </label>
        <div>
          <FieldLabel>View</FieldLabel>
          <div className="mt-1 grid gap-2 sm:grid-cols-5">
            {educationSegments.map((segment) => (
              <button
                aria-pressed={activeSegment === segment.value}
                className={cn(
                  quietButtonClass,
                  activeSegment === segment.value &&
                    "border-[rgba(91,124,250,.42)] bg-[rgba(91,124,250,.14)] text-[var(--text-primary)]",
                )}
                key={segment.value}
                onClick={() => onActiveSegmentChange(segment.value)}
                type="button"
              >
                {segment.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
        <label className="block" htmlFor="education-field-filter">
          <FieldLabel>Field</FieldLabel>
          <select
            className={inputClass}
            id="education-field-filter"
            onChange={(event) => onFieldFilterChange(event.target.value)}
            value={fieldFilter}
          >
            <option value="all">All fields</option>
            {fields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block" htmlFor="education-idea-status-filter">
          <FieldLabel>Status</FieldLabel>
          <select
            className={inputClass}
            id="education-idea-status-filter"
            onChange={(event) => onIdeaStatusFilterChange(event.target.value)}
            value={ideaStatusFilter}
          >
            <option value="all">All idea statuses</option>
            {ideaStatuses.map((status) => (
              <option key={status} value={status}>
                {ideaStatusMeta[status].label}
              </option>
            ))}
          </select>
        </label>
        <label className="block" htmlFor="education-literature-status-filter">
          <FieldLabel>Literature Status</FieldLabel>
          <select
            className={inputClass}
            id="education-literature-status-filter"
            onChange={(event) => onLiteratureStatusFilterChange(event.target.value)}
            value={literatureStatusFilter}
          >
            <option value="all">All literature</option>
            {literatureStatuses.map((status) => (
              <option key={status} value={status}>
                {literatureStatusMeta[status].label}
              </option>
            ))}
          </select>
        </label>
        <label className="block" htmlFor="education-relevance-filter">
          <FieldLabel>Relevance</FieldLabel>
          <select
            className={inputClass}
            id="education-relevance-filter"
            onChange={(event) => onRelevanceFilterChange(event.target.value)}
            value={relevanceFilter}
          >
            <option value="all">All relevance</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        <label className="block" htmlFor="education-review-filter">
          <FieldLabel>Review Needed</FieldLabel>
          <select
            className={inputClass}
            id="education-review-filter"
            onChange={(event) => onReviewNeededFilterChange(event.target.value)}
            value={reviewNeededFilter}
          >
            <option value="all">All notes</option>
            <option value="needed">Needs review</option>
            <option value="clear">No review flag</option>
          </select>
        </label>
        <label className="block" htmlFor="education-thesis-filter">
          <FieldLabel>Thesis Potential</FieldLabel>
          <select
            className={inputClass}
            id="education-thesis-filter"
            onChange={(event) => onThesisFilterChange(event.target.value)}
            value={thesisFilter}
          >
            <option value="all">All potential</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>
      </div>
    </section>
  );
}

function CurrentResearchFocusCard({
  actionsEnabled,
  focusIdea,
  focusField,
  focusLiterature,
  focusNotes,
  focusQuestions,
  onAddSource,
  onOpenFocus,
  stateAttributes,
}: Readonly<{
  actionsEnabled: boolean;
  focusIdea: ResearchIdea | null;
  focusField: ResearchField | null;
  focusLiterature: readonly LiteratureItem[];
  focusNotes: readonly ResearchNote[];
  focusQuestions: readonly ResearchQuestion[];
  onAddSource: () => void;
  onOpenFocus: () => void;
  stateAttributes?: Record<string, string>;
}>) {
  const reviewedCount = focusLiterature.filter((item) =>
    ["reviewed", "used"].includes(item.status),
  ).length;
  const toReadCount = focusLiterature.filter(
    (item) => item.status === "to_read",
  ).length;
  const progress =
    focusLiterature.length === 0
      ? 0
      : Math.round((reviewedCount / focusLiterature.length) * 100);
  const hasFocus = Boolean(focusIdea);

  return (
    <section
      aria-labelledby="current-research-focus-heading"
      className="overflow-hidden rounded-[24px] border border-[rgba(91,124,250,.30)] bg-[linear-gradient(180deg,rgba(18,28,43,.96),rgba(15,23,36,.96))] shadow-[0_12px_30px_rgba(0,0,0,.18)]"
      data-education-section="current-research-focus"
      {...stateAttributes}
    >
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(91,124,250,.08)] px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-blue)]">
              P0 · Current Research Focus
            </p>
            <h2
              className="mt-2 text-2xl font-semibold leading-tight text-[var(--text-primary)]"
              id="current-research-focus-heading"
            >
              {focusIdea?.title ?? "No current research focus"}
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--text-secondary)]">
              {focusIdea?.summary ??
                "Add or select a research idea to connect fields, literature, notes and open questions."}
            </p>
          </div>
          {focusIdea ? (
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <EducationPill accent={ideaStatusMeta[focusIdea.status].accent}>
                Status · {ideaStatusMeta[focusIdea.status].label}
              </EducationPill>
              <EducationPill accent={ideaAccent}>
                Thesis · {thesisPotentialLabels[focusIdea.thesisPotential]}
              </EducationPill>
            </div>
          ) : null}
        </div>
      </div>
      <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          {focusIdea ? (
            <>
              <div className="grid gap-3 lg:grid-cols-3">
                <TextStat
                  accent={educationAccent}
                  label="Research Field"
                  value={focusField?.title ?? focusIdea.fieldTitle}
                />
                <TextStat
                  accent={questionAccent}
                  label="Open Questions"
                  value={focusQuestions.length}
                />
                <TextStat
                  accent={literatureAccent}
                  label="Evidence Notes"
                  value={focusNotes.length}
                />
              </div>
              <div className="rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(7,11,18,.28)] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  Research Question
                </p>
                <p className="mt-2 text-[18px] font-semibold leading-7 text-[var(--text-primary)]">
                  {focusIdea.researchQuestion ?? "No research question set yet."}
                </p>
              </div>
              <div className="rounded-[16px] border border-[rgba(217,146,79,.26)] bg-[rgba(217,146,79,.07)] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-orange)]">
                  Next Action
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">
                  {focusIdea.nextAction}
                </p>
              </div>
            </>
          ) : (
            <EducationEmptyState
              actionLabel={actionsEnabled ? "Add research idea" : undefined}
              description="Lege später eine lokale Research-Idee an, um Felder, Literatur, Notizen und offene Fragen zu verbinden."
              onAction={actionsEnabled ? onOpenFocus : undefined}
              title="Noch kein Forschungsfokus"
            />
          )}
        </div>
        <aside className="min-w-0 rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Literature Progress
          </p>
          <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
            {focusLiterature.length} sources · {reviewedCount} reviewed ·{" "}
            {toReadCount} to read
          </p>
          <div
            className="mt-3 h-[8px] overflow-hidden rounded-full bg-[rgba(23,34,53,.92)]"
            style={progressStyle(progress)}
          >
            <div className="h-full w-[var(--progress-width)] rounded-full bg-[var(--accent-cyan)]" />
          </div>
          <div className="mt-4 space-y-2">
            {focusLiterature.slice(0, 3).map((item) => (
              <div
                className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(7,11,18,.22)] p-3"
                key={item.id}
              >
                <p className="line-clamp-1 text-[12px] font-semibold text-[var(--text-primary)]">
                  {item.title}
                </p>
                <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                  {literatureStatusMeta[item.status].label} ·{" "}
                  {relevanceMeta[item.relevance].label}
                </p>
              </div>
            ))}
            {focusLiterature.length === 0 ? (
              <EducationEmptyState
                description="Add sources locally to prepare the focus evidence trail."
                title="No linked literature yet"
              />
            ) : null}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <button
              className={primaryButtonClass}
              disabled={!hasFocus && !actionsEnabled}
              onClick={onOpenFocus}
              type="button"
            >
              {hasFocus ? "Open focus" : "Add idea"}
            </button>
            <button
              className={secondaryButtonClass}
              disabled={!actionsEnabled}
              onClick={onAddSource}
              type="button"
            >
              Add source
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}

function ResearchIdeaPipeline({
  ideas,
  selectedIdeaId,
  onAddNote,
  onOpenIdea,
  stateAttributes,
}: Readonly<{
  ideas: readonly ResearchIdea[];
  selectedIdeaId: string | null;
  onAddNote: (idea: ResearchIdea) => void;
  onOpenIdea: (idea: ResearchIdea) => void;
  stateAttributes?: Record<string, string>;
}>) {
  return (
    <EducationPanel
      badge={<EducationPill accent={ideaAccent}>{ideas.length} ideas</EducationPill>}
      dataSection="research-idea-pipeline"
      stateAttributes={stateAttributes}
      subtitle="Track ideas by status, thesis potential, evidence and next academic action."
      title="Research Idea Pipeline"
    >
      {ideas.length === 0 ? (
        <EducationEmptyState
          description="Research-Ideen erscheinen hier, sobald lokale Ideen existieren."
          title="Noch keine Research-Ideen"
        />
      ) : (
        <div className="grid gap-3">
          {ideas.map((idea) => (
            <article
              className={cn(
                "rounded-[16px] border bg-[rgba(18,28,43,.48)] p-4 transition hover:border-[var(--border-default)]",
                selectedIdeaId === idea.id
                  ? "border-[rgba(91,124,250,.42)]"
                  : "border-[var(--border-subtle)]",
              )}
              key={idea.id}
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <button
                    className="text-left text-[15px] font-semibold leading-5 text-[var(--text-primary)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                    onClick={() => onOpenIdea(idea)}
                    type="button"
                  >
                    {idea.title}
                  </button>
                  <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
                    {idea.summary}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <EducationPill accent={ideaStatusMeta[idea.status].accent}>
                    {ideaStatusMeta[idea.status].label}
                  </EducationPill>
                  <EducationPill accent={ideaAccent}>
                    Thesis · {thesisPotentialLabels[idea.thesisPotential]}
                  </EducationPill>
                </div>
              </div>
              <div className="mt-3 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(7,11,18,.22)] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  Research Question
                </p>
                <p className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)]">
                  {idea.researchQuestion ?? "No research question set yet."}
                </p>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                <TextStat label="Field" value={idea.fieldTitle} />
                <TextStat
                  accent={literatureAccent}
                  label="Sources"
                  value={idea.sourceCount}
                />
                <TextStat accent={educationAccent} label="Notes" value={idea.noteCount} />
                <TextStat
                  accent={questionAccent}
                  label="Open Questions"
                  value={idea.openQuestionCount}
                />
              </div>
              <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-[12px] leading-5 text-[var(--text-secondary)]">
                  <span className="font-semibold text-[var(--text-primary)]">
                    Next:
                  </span>{" "}
                  {idea.nextAction}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    className={quietButtonClass}
                    onClick={() => onOpenIdea(idea)}
                    type="button"
                  >
                    Open idea
                  </button>
                  <button
                    className={quietButtonClass}
                    onClick={() => onAddNote(idea)}
                    type="button"
                  >
                    Add note
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </EducationPanel>
  );
}

function LiteratureQueue({
  ideas,
  fields,
  literature,
  selectedLiteratureId,
  onAddNote,
  onOpenLiterature,
  stateAttributes,
}: Readonly<{
  ideas: readonly ResearchIdea[];
  fields: readonly ResearchField[];
  literature: readonly LiteratureItem[];
  selectedLiteratureId: string | null;
  onAddNote: (item: LiteratureItem) => void;
  onOpenLiterature: (item: LiteratureItem) => void;
  stateAttributes?: Record<string, string>;
}>) {
  const queueStatuses: readonly LiteratureStatus[] = literatureStatuses;

  return (
    <EducationPanel
      badge={
        <EducationPill accent={literatureAccent}>
          {literature.length} sources
        </EducationPill>
      }
      dataSection="literature-queue"
      stateAttributes={stateAttributes}
      subtitle="Compact reading queue, not a full literature database."
      title="Literature Queue"
    >
      {literature.length === 0 ? (
        <EducationEmptyState
          description="Quellen erscheinen hier, sobald lokale Literatureinträge existieren."
          title="Noch keine Literatur"
        />
      ) : (
        <div className="space-y-4">
          {queueStatuses.map((status) => {
            const items = literature.filter((item) => item.status === status);

            if (items.length === 0) {
              return null;
            }

            return (
              <div key={status}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    {literatureStatusMeta[status].label}
                  </h3>
                  <EducationPill accent={literatureStatusMeta[status].accent} quiet>
                    {items.length}
                  </EducationPill>
                </div>
                <div className="grid gap-2">
                  {items.map((item) => (
                    <article
                      className={cn(
                        "rounded-[14px] border bg-[rgba(18,28,43,.48)] p-3 transition hover:border-[var(--border-default)]",
                        selectedLiteratureId === item.id
                          ? "border-[rgba(95,200,215,.42)]"
                          : "border-[var(--border-subtle)]",
                      )}
                      key={item.id}
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <button
                            className="text-left text-[14px] font-semibold leading-5 text-[var(--text-primary)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                            onClick={() => onOpenLiterature(item)}
                            type="button"
                          >
                            {item.title}
                          </button>
                          <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
                            {item.authors || "No authors yet"}
                            {item.year ? ` · ${item.year}` : ""} ·{" "}
                            {literatureTypeLabels[item.type]}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          <EducationPill accent={literatureStatusMeta[item.status].accent}>
                            {literatureStatusMeta[item.status].label}
                          </EducationPill>
                          <EducationPill accent={relevanceMeta[item.relevance].accent}>
                            {relevanceMeta[item.relevance].label}
                          </EducationPill>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 lg:grid-cols-2">
                        <p className="text-[11px] leading-4 text-[var(--text-secondary)]">
                          <span className="font-semibold text-[var(--text-primary)]">
                            Linked:
                          </span>{" "}
                          {linkedIdeaTitle(ideas, item.ideaId)} ·{" "}
                          {linkedFieldTitle(fields, item.fieldId)}
                        </p>
                        <p className="text-[11px] leading-4 text-[var(--text-secondary)]">
                          <span className="font-semibold text-[var(--text-primary)]">
                            Next:
                          </span>{" "}
                          {item.nextAction || "No next action set"}
                        </p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          className={quietButtonClass}
                          onClick={() => onOpenLiterature(item)}
                          type="button"
                        >
                          Open source
                        </button>
                        <button
                          className={quietButtonClass}
                          onClick={() => onAddNote(item)}
                          type="button"
                        >
                          Add note
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </EducationPanel>
  );
}

function OpenResearchQuestions({
  fields,
  ideas,
  questions,
  onAddNote,
  onOpenQuestion,
}: Readonly<{
  fields: readonly ResearchField[];
  ideas: readonly ResearchIdea[];
  questions: readonly ResearchQuestion[];
  onAddNote: (question: ResearchQuestion) => void;
  onOpenQuestion: (question: ResearchQuestion) => void;
}>) {
  return (
    <EducationPanel
      badge={
        <EducationPill accent={questionAccent}>{questions.length} questions</EducationPill>
      }
      subtitle="Research questions stay actionable and linked to fields or ideas."
      title="Open Research Questions"
    >
      {questions.length === 0 ? (
        <EducationEmptyState
          description="Use Add question to create a local research question with status, importance and next action."
          title="No research questions match this view"
        />
      ) : (
        <div className="grid gap-3">
          {questions.map((question) => (
            <article
              className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-4 transition hover:border-[var(--border-default)]"
              key={question.id}
            >
              <button
                className="text-left text-[14px] font-semibold leading-5 text-[var(--text-primary)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                onClick={() => onOpenQuestion(question)}
                type="button"
              >
                {question.question}
              </button>
              <div className="mt-3 flex flex-wrap gap-2">
                <EducationPill accent={questionStatusMeta[question.status].accent}>
                  Status · {questionStatusMeta[question.status].label}
                </EducationPill>
                <EducationPill accent={importanceMeta[question.importance].accent}>
                  Importance · {importanceMeta[question.importance].label}
                </EducationPill>
                <EducationPill quiet>
                  {linkedIdeaTitle(ideas, question.ideaId)}
                </EducationPill>
                <EducationPill quiet>
                  {linkedFieldTitle(fields, question.fieldId)}
                </EducationPill>
              </div>
              <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-[12px] leading-5 text-[var(--text-secondary)]">
                  <span className="font-semibold text-[var(--text-primary)]">
                    Next:
                  </span>{" "}
                  {question.nextAction || "No next action set"}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    className={quietButtonClass}
                    onClick={() => onOpenQuestion(question)}
                    type="button"
                  >
                    Open question
                  </button>
                  <button
                    className={quietButtonClass}
                    onClick={() => onAddNote(question)}
                    type="button"
                  >
                    Add note
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </EducationPanel>
  );
}

function ResearchFieldsPanel({
  fields,
  selectedFieldId,
  onSelectField,
  stateAttributes,
}: Readonly<{
  fields: readonly ResearchField[];
  selectedFieldId: string;
  onSelectField: (fieldId: string) => void;
  stateAttributes?: Record<string, string>;
}>) {
  return (
    <EducationPanel
      badge={<EducationPill accent={educationAccent}>{fields.length} fields</EducationPill>}
      dataSection="research-fields"
      stateAttributes={stateAttributes}
      subtitle="Theme clusters for active scientific work. No graph or canvas in this MVP."
      title="Research Fields"
    >
      {fields.length === 0 ? (
        <EducationEmptyState
          description="Fields will group ideas, literature and open questions once research context is connected."
          title="Noch keine Forschungsfelder"
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {fields.map((field) => (
            <article
              className={cn(
                "rounded-[16px] border bg-[rgba(18,28,43,.48)] p-4 transition hover:border-[var(--border-default)]",
                selectedFieldId === field.id
                  ? "border-[rgba(91,124,250,.42)]"
                  : "border-[var(--border-subtle)]",
              )}
              key={field.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">
                    {field.title}
                  </h3>
                  <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
                    {field.description}
                  </p>
                </div>
                <EducationPill accent={educationAccent}>
                  {optionLabel(field.status)}
                </EducationPill>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <TextStat label="Ideas" value={field.ideaCount} />
                <TextStat accent={literatureAccent} label="Literature" value={field.literatureCount} />
                <TextStat accent={questionAccent} label="Questions" value={field.openQuestionCount} />
              </div>
              <p className="mt-3 text-[12px] leading-5 text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text-primary)]">
                  Next:
                </span>{" "}
                {field.nextAction}
              </p>
              <button
                aria-pressed={selectedFieldId === field.id}
                className={cn(quietButtonClass, "mt-3")}
                onClick={() => onSelectField(field.id)}
                type="button"
              >
                Select field
              </button>
            </article>
          ))}
        </div>
      )}
    </EducationPanel>
  );
}

function RecentResearchNotes({
  notes,
  stateAttributes,
}: Readonly<{
  notes: readonly ResearchNote[];
  stateAttributes?: Record<string, string>;
}>) {
  return (
    <EducationPanel
      badge={<EducationPill accent={educationAccent}>{notes.length} notes</EducationPill>}
      dataSection="recent-research-notes"
      stateAttributes={stateAttributes}
      subtitle="Evidence, arguments and decisions. No automatic knowledge processing."
      title="Recent Research Notes"
    >
      {notes.length === 0 ? (
        <EducationEmptyState
          description="Research-Notizen erscheinen hier, sobald lokale Notizen existieren."
          title="Noch keine Research-Notizen"
        />
      ) : (
        <div className="grid gap-3">
          {notes.slice(0, 6).map((note) => (
            <article
              className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-3"
              key={note.id}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">
                    {note.title}
                  </h3>
                  <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
                    {noteTypeLabels[note.type]} · {formatDate(note.updatedAt)}
                  </p>
                </div>
                {note.reviewNeeded ? (
                  <EducationPill accent={questionAccent}>Review needed</EducationPill>
                ) : (
                  <EducationPill accent="var(--accent-green)">Reviewed</EducationPill>
                )}
              </div>
              <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
                {note.snippet}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {note.tags.map((tag) => (
                  <EducationPill key={tag} quiet>
                    #{tag}
                  </EducationPill>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </EducationPanel>
  );
}

function AcademicRhythm({
  rhythm,
}: Readonly<{
  rhythm: readonly AcademicRhythmSignal[];
}>) {
  const toneAccent: Record<AcademicRhythmSignal["tone"], string> = {
    blue: educationAccent,
    cyan: literatureAccent,
    orange: questionAccent,
    green: "var(--accent-green)",
    red: "var(--accent-red)",
    muted: "var(--text-muted)",
  };

  return (
    <EducationPanel
      subtitle="Small signals for academic cadence without performance pressure."
      title="Academic Rhythm"
    >
      <div className="grid gap-3">
        {rhythm.map((signal) => (
          <div
            className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-3"
            key={signal.id}
            style={accentStyle(toneAccent[signal.tone])}
          >
            <p className="text-[22px] font-semibold leading-6 text-[var(--text-primary)]">
              {signal.value}
            </p>
            <p className="mt-1 text-[12px] leading-4 text-[var(--text-secondary)]">
              {signal.label}
            </p>
          </div>
        ))}
      </div>
      <div aria-label="This week research rhythm" className="mt-4 flex gap-1.5">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => (
          <span
            className={cn(
              "h-2 flex-1 rounded-full",
              index < 2
                ? "bg-[var(--accent-blue)]"
                : index === 4
                  ? "bg-[var(--accent-cyan)]"
                  : "bg-[rgba(148,163,184,.16)]",
            )}
            key={day}
            title={day}
          />
        ))}
      </div>
    </EducationPanel>
  );
}

function EducationMethodNotes({
  methodNotes,
}: Readonly<{
  methodNotes: readonly string[];
}>) {
  return (
    <EducationPanel
      className="opacity-95"
      subtitle="Method boundaries for the static MVP."
      title="Education Method Notes"
    >
      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {methodNotes.map((note, index) => (
          <li
            className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(168,183,204,.045)] p-3 text-[12px] leading-5 text-[var(--text-secondary)]"
            key={`education-method-note-${index}`}
          >
            {note}
          </li>
        ))}
      </ul>
    </EducationPanel>
  );
}

function StatsStrip({
  stats,
  stateAttributes,
}: Readonly<{
  stats: EducationOverviewStats;
  stateAttributes?: Record<string, string>;
}>) {
  return (
    <section
      aria-label="Education summary"
      className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4"
      data-education-section="summary"
      {...stateAttributes}
    >
      <TextStat
        accent={ideaAccent}
        label="Active ideas"
        value={stats.activeIdeaCount}
      />
      <TextStat
        accent={literatureAccent}
        label="Literature queue"
        value={stats.queuedLiteratureCount}
      />
      <TextStat
        accent={questionAccent}
        label="Open questions"
        value={stats.openQuestionCount}
      />
      <TextStat
        accent={educationAccent}
        label="Review notes"
        value={stats.reviewNeededNoteCount}
      />
    </section>
  );
}

function AddResearchIdeaDialog({
  fields,
  open,
  onClose,
  onSave,
}: Readonly<{
  fields: readonly ResearchField[];
  open: boolean;
  onClose: () => void;
  onSave: (draft: IdeaDraft) => void;
}>) {
  const initialDraft = useMemo<IdeaDraft>(
    () => ({
      title: "",
      fieldId: fields[0]?.id ?? "",
      status: "idea",
      thesisPotential: "unknown",
      summary: "",
      researchQuestion: "",
      nextAction: "",
    }),
    [fields],
  );
  const [draft, setDraft] = useState<IdeaDraft>(initialDraft);
  const [touched, setTouched] = useState<Partial<Record<keyof IdeaDraft, boolean>>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  function updateDraft(
    key: keyof IdeaDraft,
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    setDraft((current) => ({
      ...current,
      [key]: event.target.value,
    }));
    setSaveError(null);
  }

  function markTouched(key: keyof IdeaDraft) {
    setTouched((current) => ({
      ...current,
      [key]: true,
    }));
  }

  function fieldInvalid(key: keyof Pick<IdeaDraft, "title" | "fieldId" | "nextAction">) {
    return Boolean(touched[key] || saveError) && fieldIsEmpty(draft[key]);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      fieldIsEmpty(draft.title) ||
      fieldIsEmpty(draft.fieldId) ||
      fieldIsEmpty(draft.nextAction)
    ) {
      setTouched({ title: true, fieldId: true, nextAction: true });
      setSaveError("Research idea could not be saved. Complete required fields first.");
      return;
    }

    onSave(draft);
  }

  return (
    <EducationDialog
      labelledBy="add-research-idea-heading"
      onClose={onClose}
      open={open}
    >
      <form className="flex max-h-[calc(100dvh-24px)] flex-col" onSubmit={handleSubmit}>
        <DialogHeader
          description="Create a local mock idea. It is not persisted or synced."
          eyebrow="Dialog · Research idea"
          id="add-research-idea-heading"
          title="Add research idea"
        />
        <div className="grid gap-3 overflow-y-auto p-4 sm:grid-cols-2">
          <FormField
            error={fieldInvalid("title") ? "Title is required." : null}
            id="idea-title"
            label="Title *"
          >
            <input
              className={inputClass}
              id="idea-title"
              onBlur={() => markTouched("title")}
              onChange={(event) => updateDraft("title", event)}
              value={draft.title}
            />
          </FormField>
          <FormField
            error={fieldInvalid("fieldId") ? "Research field is required." : null}
            id="idea-field"
            label="Research field *"
          >
            <select
              className={inputClass}
              id="idea-field"
              onBlur={() => markTouched("fieldId")}
              onChange={(event) => updateDraft("fieldId", event)}
              value={draft.fieldId}
            >
              {fields.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.title}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="idea-status" label="Status">
            <select
              className={inputClass}
              id="idea-status"
              onChange={(event) => updateDraft("status", event)}
              value={draft.status}
            >
              {ideaStatuses.map((status) => (
                <option key={status} value={status}>
                  {ideaStatusMeta[status].label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="idea-thesis-potential" label="Thesis potential">
            <select
              className={inputClass}
              id="idea-thesis-potential"
              onChange={(event) => updateDraft("thesisPotential", event)}
              value={draft.thesisPotential}
            >
              {(["unknown", "low", "medium", "high"] as const).map((potential) => (
                <option key={potential} value={potential}>
                  {thesisPotentialLabels[potential]}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="idea-summary" label="Summary" optional>
            <textarea
              className={cn(inputClass, "min-h-24 py-3")}
              id="idea-summary"
              onChange={(event) => updateDraft("summary", event)}
              value={draft.summary}
            />
          </FormField>
          <FormField id="idea-research-question" label="Research question" optional>
            <textarea
              className={cn(inputClass, "min-h-24 py-3")}
              id="idea-research-question"
              onChange={(event) => updateDraft("researchQuestion", event)}
              value={draft.researchQuestion}
            />
          </FormField>
          <div className="sm:col-span-2">
            <FormField
              error={fieldInvalid("nextAction") ? "Next action is required." : null}
              id="idea-next-action"
              label="Next action *"
            >
              <input
                className={inputClass}
                id="idea-next-action"
                onBlur={() => markTouched("nextAction")}
                onChange={(event) => updateDraft("nextAction", event)}
                value={draft.nextAction}
              />
            </FormField>
          </div>
        </div>
        <DialogFooter error={saveError} onClose={onClose} submitLabel="Save locally" />
      </form>
    </EducationDialog>
  );
}

function AddLiteratureDialog({
  context,
  fields,
  ideas,
  open,
  onClose,
  onSave,
}: Readonly<{
  context: LinkContext;
  fields: readonly ResearchField[];
  ideas: readonly ResearchIdea[];
  open: boolean;
  onClose: () => void;
  onSave: (draft: LiteratureDraft) => void;
}>) {
  const initialDraft = useMemo<LiteratureDraft>(
    () => ({
      title: "",
      authors: "",
      year: "",
      type: "paper",
      status: "to_read",
      relevance: "medium",
      ideaId: context.ideaId ?? "",
      fieldId: context.fieldId ?? "",
      nextAction: "",
      note: "",
    }),
    [context.fieldId, context.ideaId],
  );
  const [draft, setDraft] = useState<LiteratureDraft>(initialDraft);
  const [touched, setTouched] = useState<Partial<Record<keyof LiteratureDraft, boolean>>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  function updateDraft(
    key: keyof LiteratureDraft,
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    setDraft((current) => ({
      ...current,
      [key]: event.target.value,
    }));
    setSaveError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (fieldIsEmpty(draft.title)) {
      setTouched({ title: true });
      setSaveError("Literature item could not be saved. Title is required.");
      return;
    }

    onSave(draft);
  }

  return (
    <EducationDialog
      labelledBy="add-literature-heading"
      onClose={onClose}
      open={open}
    >
      <form className="flex max-h-[calc(100dvh-24px)] flex-col" onSubmit={handleSubmit}>
        <DialogHeader
          description="Create a local mock literature item. No DOI, Zotero or external API is used."
          eyebrow="Dialog · Literature"
          id="add-literature-heading"
          title="Add literature"
        />
        <div className="grid gap-3 overflow-y-auto p-4 sm:grid-cols-2">
          <FormField
            error={Boolean(touched.title || saveError) && fieldIsEmpty(draft.title) ? "Title is required." : null}
            id="literature-title"
            label="Title *"
          >
            <input
              className={inputClass}
              id="literature-title"
              onBlur={() => setTouched((current) => ({ ...current, title: true }))}
              onChange={(event) => updateDraft("title", event)}
              value={draft.title}
            />
          </FormField>
          <FormField id="literature-authors" label="Authors" optional>
            <input
              className={inputClass}
              id="literature-authors"
              onChange={(event) => updateDraft("authors", event)}
              value={draft.authors}
            />
          </FormField>
          <FormField id="literature-year" label="Year" optional>
            <input
              className={inputClass}
              id="literature-year"
              inputMode="numeric"
              onChange={(event) => updateDraft("year", event)}
              value={draft.year}
            />
          </FormField>
          <FormField id="literature-type" label="Type">
            <select
              className={inputClass}
              id="literature-type"
              onChange={(event) => updateDraft("type", event)}
              value={draft.type}
            >
              {Object.entries(literatureTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="literature-status" label="Status">
            <select
              className={inputClass}
              id="literature-status"
              onChange={(event) => updateDraft("status", event)}
              value={draft.status}
            >
              {literatureStatuses.map((status) => (
                <option key={status} value={status}>
                  {literatureStatusMeta[status].label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="literature-relevance" label="Relevance">
            <select
              className={inputClass}
              id="literature-relevance"
              onChange={(event) => updateDraft("relevance", event)}
              value={draft.relevance}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </FormField>
          <FormField id="literature-linked-idea" label="Linked idea" optional>
            <select
              className={inputClass}
              id="literature-linked-idea"
              onChange={(event) => updateDraft("ideaId", event)}
              value={draft.ideaId}
            >
              <option value="">No linked idea</option>
              {ideas.map((idea) => (
                <option key={idea.id} value={idea.id}>
                  {idea.title}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="literature-linked-field" label="Linked field" optional>
            <select
              className={inputClass}
              id="literature-linked-field"
              onChange={(event) => updateDraft("fieldId", event)}
              value={draft.fieldId}
            >
              <option value="">No linked field</option>
              {fields.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.title}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="literature-next-action" label="Next action" optional>
            <input
              className={inputClass}
              id="literature-next-action"
              onChange={(event) => updateDraft("nextAction", event)}
              value={draft.nextAction}
            />
          </FormField>
          <FormField id="literature-note" label="Note" optional>
            <textarea
              className={cn(inputClass, "min-h-24 py-3")}
              id="literature-note"
              onChange={(event) => updateDraft("note", event)}
              value={draft.note}
            />
          </FormField>
        </div>
        <DialogFooter error={saveError} onClose={onClose} submitLabel="Save locally" />
      </form>
    </EducationDialog>
  );
}

function CaptureResearchNoteDialog({
  context,
  fields,
  ideas,
  literature,
  open,
  onClose,
  onSave,
}: Readonly<{
  context: LinkContext;
  fields: readonly ResearchField[];
  ideas: readonly ResearchIdea[];
  literature: readonly LiteratureItem[];
  open: boolean;
  onClose: () => void;
  onSave: (draft: NoteDraft) => void;
}>) {
  const initialDraft = useMemo<NoteDraft>(
    () => ({
      title: "",
      type: "summary",
      ideaId: context.ideaId ?? "",
      literatureId: context.literatureId ?? "",
      fieldId: context.fieldId ?? "",
      snippet: "",
      tags: "",
      source: context.literatureId ? "literature" : "manual",
      reviewNeeded: true,
    }),
    [context.fieldId, context.ideaId, context.literatureId],
  );
  const [draft, setDraft] = useState<NoteDraft>(initialDraft);
  const [touched, setTouched] = useState<Partial<Record<keyof NoteDraft, boolean>>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  function updateDraft(
    key: keyof NoteDraft,
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const value =
      event.target instanceof HTMLInputElement && event.target.type === "checkbox"
        ? event.target.checked
        : event.target.value;

    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
    setSaveError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (fieldIsEmpty(draft.title) || fieldIsEmpty(draft.snippet)) {
      setTouched({ title: true, snippet: true });
      setSaveError("Research note could not be saved. Complete required fields first.");
      return;
    }

    onSave(draft);
  }

  return (
    <EducationDialog
      labelledBy="capture-research-note-heading"
      onClose={onClose}
      open={open}
    >
      <form className="flex max-h-[calc(100dvh-24px)] flex-col" onSubmit={handleSubmit}>
        <DialogHeader
          description="Capture a local evidence note. It is not summarized or processed automatically."
          eyebrow="Dialog · Research note"
          id="capture-research-note-heading"
          title="Capture research note"
        />
        <div className="grid gap-3 overflow-y-auto p-4 sm:grid-cols-2">
          <FormField
            error={Boolean(touched.title || saveError) && fieldIsEmpty(draft.title) ? "Title is required." : null}
            id="note-title"
            label="Title *"
          >
            <input
              className={inputClass}
              id="note-title"
              onBlur={() => setTouched((current) => ({ ...current, title: true }))}
              onChange={(event) => updateDraft("title", event)}
              value={draft.title}
            />
          </FormField>
          <FormField id="note-type" label="Type">
            <select
              className={inputClass}
              id="note-type"
              onChange={(event) => updateDraft("type", event)}
              value={draft.type}
            >
              {noteTypes.map((type) => (
                <option key={type} value={type}>
                  {noteTypeLabels[type]}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="note-linked-idea" label="Linked idea" optional>
            <select
              className={inputClass}
              id="note-linked-idea"
              onChange={(event) => updateDraft("ideaId", event)}
              value={draft.ideaId}
            >
              <option value="">No linked idea</option>
              {ideas.map((idea) => (
                <option key={idea.id} value={idea.id}>
                  {idea.title}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="note-linked-literature" label="Linked literature" optional>
            <select
              className={inputClass}
              id="note-linked-literature"
              onChange={(event) => updateDraft("literatureId", event)}
              value={draft.literatureId}
            >
              <option value="">No linked literature</option>
              {literature.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="note-linked-field" label="Linked field" optional>
            <select
              className={inputClass}
              id="note-linked-field"
              onChange={(event) => updateDraft("fieldId", event)}
              value={draft.fieldId}
            >
              <option value="">No linked field</option>
              {fields.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.title}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="note-tags" label="Tags" optional>
            <input
              className={inputClass}
              id="note-tags"
              onChange={(event) => updateDraft("tags", event)}
              placeholder="review, source, method"
              value={draft.tags}
            />
          </FormField>
          <div className="sm:col-span-2">
            <FormField
              error={Boolean(touched.snippet || saveError) && fieldIsEmpty(draft.snippet) ? "Note is required." : null}
              id="note-snippet"
              label="Note *"
            >
              <textarea
                className={cn(inputClass, "min-h-28 py-3")}
                id="note-snippet"
                onBlur={() => setTouched((current) => ({ ...current, snippet: true }))}
                onChange={(event) => updateDraft("snippet", event)}
                value={draft.snippet}
              />
            </FormField>
          </div>
          <label
            className="flex min-h-11 items-center gap-3 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.62)] px-3 text-[12px] text-[var(--text-secondary)]"
            htmlFor="note-review-needed"
          >
            <input
              checked={draft.reviewNeeded}
              className="size-4"
              id="note-review-needed"
              onChange={(event) => updateDraft("reviewNeeded", event)}
              type="checkbox"
            />
            Review needed
          </label>
        </div>
        <DialogFooter error={saveError} onClose={onClose} submitLabel="Save locally" />
      </form>
    </EducationDialog>
  );
}

function AddResearchQuestionDialog({
  context,
  fields,
  ideas,
  open,
  onClose,
  onSave,
}: Readonly<{
  context: LinkContext;
  fields: readonly ResearchField[];
  ideas: readonly ResearchIdea[];
  open: boolean;
  onClose: () => void;
  onSave: (draft: QuestionDraft) => void;
}>) {
  const initialDraft = useMemo<QuestionDraft>(
    () => ({
      question: "",
      ideaId: context.ideaId ?? "",
      fieldId: context.fieldId ?? "",
      importance: "medium",
      status: "open",
      nextAction: "",
    }),
    [context.fieldId, context.ideaId],
  );
  const [draft, setDraft] = useState<QuestionDraft>(initialDraft);
  const [touched, setTouched] = useState<Partial<Record<keyof QuestionDraft, boolean>>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  function updateDraft(
    key: keyof QuestionDraft,
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    setDraft((current) => ({
      ...current,
      [key]: event.target.value,
    }));
    setSaveError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (fieldIsEmpty(draft.question)) {
      setTouched({ question: true });
      setSaveError("Research question could not be saved. Question is required.");
      return;
    }

    onSave(draft);
  }

  return (
    <EducationDialog
      labelledBy="add-research-question-heading"
      onClose={onClose}
      open={open}
    >
      <form className="flex max-h-[calc(100dvh-24px)] flex-col" onSubmit={handleSubmit}>
        <DialogHeader
          description="Create a local research question with status and next action."
          eyebrow="Dialog · Research question"
          id="add-research-question-heading"
          title="Add question"
        />
        <div className="grid gap-3 overflow-y-auto p-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormField
              error={Boolean(touched.question || saveError) && fieldIsEmpty(draft.question) ? "Question is required." : null}
              id="question-text"
              label="Question *"
            >
              <textarea
                className={cn(inputClass, "min-h-24 py-3")}
                id="question-text"
                onBlur={() => setTouched((current) => ({ ...current, question: true }))}
                onChange={(event) => updateDraft("question", event)}
                value={draft.question}
              />
            </FormField>
          </div>
          <FormField id="question-linked-idea" label="Linked idea" optional>
            <select
              className={inputClass}
              id="question-linked-idea"
              onChange={(event) => updateDraft("ideaId", event)}
              value={draft.ideaId}
            >
              <option value="">No linked idea</option>
              {ideas.map((idea) => (
                <option key={idea.id} value={idea.id}>
                  {idea.title}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="question-linked-field" label="Linked field" optional>
            <select
              className={inputClass}
              id="question-linked-field"
              onChange={(event) => updateDraft("fieldId", event)}
              value={draft.fieldId}
            >
              <option value="">No linked field</option>
              {fields.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.title}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="question-importance" label="Importance">
            <select
              className={inputClass}
              id="question-importance"
              onChange={(event) => updateDraft("importance", event)}
              value={draft.importance}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </FormField>
          <FormField id="question-status" label="Status">
            <select
              className={inputClass}
              id="question-status"
              onChange={(event) => updateDraft("status", event)}
              value={draft.status}
            >
              {Object.entries(questionStatusMeta).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </select>
          </FormField>
          <div className="sm:col-span-2">
            <FormField id="question-next-action" label="Next action" optional>
              <input
                className={inputClass}
                id="question-next-action"
                onChange={(event) => updateDraft("nextAction", event)}
                value={draft.nextAction}
              />
            </FormField>
          </div>
        </div>
        <DialogFooter error={saveError} onClose={onClose} submitLabel="Save locally" />
      </form>
    </EducationDialog>
  );
}

function ResearchIdeaInspector({
  fields,
  idea,
  literature,
  notes,
  open,
  questions,
  onAddNote,
  onAddSource,
  onClose,
  onSetFocus,
}: Readonly<{
  fields: readonly ResearchField[];
  idea: ResearchIdea | null;
  literature: readonly LiteratureItem[];
  notes: readonly ResearchNote[];
  open: boolean;
  questions: readonly ResearchQuestion[];
  onAddNote: (idea: ResearchIdea) => void;
  onAddSource: (idea: ResearchIdea) => void;
  onClose: () => void;
  onSetFocus: (idea: ResearchIdea) => void;
}>) {
  return (
    <EducationDialog
      labelledBy="research-idea-inspector-heading"
      onClose={onClose}
      open={open}
      sheet
    >
      <div className="flex h-full max-h-dvh flex-col">
        <DialogHeader
          description="Idea inspector with local mock links and actions."
          eyebrow="Inspector · Research idea"
          id="research-idea-inspector-heading"
          title={idea?.title ?? "Research idea"}
        />
        {idea ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="flex flex-wrap gap-2">
              <EducationPill accent={ideaStatusMeta[idea.status].accent}>
                {ideaStatusMeta[idea.status].label}
              </EducationPill>
              <EducationPill accent={ideaAccent}>
                Thesis · {thesisPotentialLabels[idea.thesisPotential]}
              </EducationPill>
              <EducationPill quiet>{linkedFieldTitle(fields, idea.fieldId)}</EducationPill>
            </div>
            <div className="mt-4 space-y-4">
              <InspectorBlock title="Summary">{idea.summary}</InspectorBlock>
              <InspectorBlock title="Research Question">
                {idea.researchQuestion ?? "No research question set yet."}
              </InspectorBlock>
              <InspectorList title="Literature">
                {literature.length === 0 ? (
                  <EducationEmptyState
                    description="Add a source to link evidence to this idea."
                    title="No linked literature"
                  />
                ) : (
                  literature.map((item) => (
                    <MiniLinkedItem
                      key={item.id}
                      meta={literatureStatusMeta[item.status].label}
                      title={item.title}
                    />
                  ))
                )}
              </InspectorList>
              <InspectorList title="Notes">
                {notes.length === 0 ? (
                  <EducationEmptyState
                    description="Capture a note to preserve evidence or decisions."
                    title="No linked notes"
                  />
                ) : (
                  notes.map((note) => (
                    <MiniLinkedItem
                      key={note.id}
                      meta={noteTypeLabels[note.type]}
                      title={note.title}
                    />
                  ))
                )}
              </InspectorList>
              <InspectorList title="Open Questions">
                {questions.length === 0 ? (
                  <EducationEmptyState
                    description="No open question is linked to this idea."
                    title="No open questions"
                  />
                ) : (
                  questions.map((question) => (
                    <MiniLinkedItem
                      key={question.id}
                      meta={questionStatusMeta[question.status].label}
                      title={question.question}
                    />
                  ))
                )}
              </InspectorList>
              <InspectorBlock title="Next Action">{idea.nextAction}</InspectorBlock>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <EducationEmptyState
              description="Select a research idea to inspect it."
              title="No idea selected"
            />
          </div>
        )}
        <div className="border-t border-[var(--border-subtle)] bg-[rgba(7,11,18,.58)] p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              className={secondaryButtonClass}
              disabled={!idea}
              onClick={() => {
                if (idea) {
                  onAddSource(idea);
                }
              }}
              type="button"
            >
              Add source
            </button>
            <button
              className={secondaryButtonClass}
              disabled={!idea}
              onClick={() => {
                if (idea) {
                  onAddNote(idea);
                }
              }}
              type="button"
            >
              Add note
            </button>
            <button
              className={primaryButtonClass}
              disabled={!idea}
              onClick={() => {
                if (idea) {
                  onSetFocus(idea);
                }
              }}
              type="button"
            >
              Set as focus
            </button>
            <button className={secondaryButtonClass} onClick={onClose} type="button">
              Close
            </button>
          </div>
        </div>
      </div>
    </EducationDialog>
  );
}

function LiteratureInspector({
  fields,
  ideas,
  item,
  notes,
  open,
  onAddNote,
  onClose,
  onMarkReviewed,
}: Readonly<{
  fields: readonly ResearchField[];
  ideas: readonly ResearchIdea[];
  item: LiteratureItem | null;
  notes: readonly ResearchNote[];
  open: boolean;
  onAddNote: (item: LiteratureItem) => void;
  onClose: () => void;
  onMarkReviewed: (item: LiteratureItem) => void;
}>) {
  return (
    <EducationDialog
      labelledBy="literature-inspector-heading"
      onClose={onClose}
      open={open}
      sheet
    >
      <div className="flex h-full max-h-dvh flex-col">
        <DialogHeader
          description="Literature inspector for local status, links and notes."
          eyebrow="Inspector · Literature"
          id="literature-inspector-heading"
          title={item?.title ?? "Literature item"}
        />
        {item ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="flex flex-wrap gap-2">
              <EducationPill accent={literatureStatusMeta[item.status].accent}>
                {literatureStatusMeta[item.status].label}
              </EducationPill>
              <EducationPill accent={relevanceMeta[item.relevance].accent}>
                {relevanceMeta[item.relevance].label}
              </EducationPill>
              <EducationPill quiet>{literatureTypeLabels[item.type]}</EducationPill>
            </div>
            <div className="mt-4 space-y-4">
              <InspectorBlock title="Bibliographic info">
                {item.authors || "No authors yet"}
                {item.year ? ` · ${item.year}` : ""} · Mock source for UI
                structure only
              </InspectorBlock>
              <InspectorBlock title="Linked Idea / Field">
                {linkedIdeaTitle(ideas, item.ideaId)} ·{" "}
                {linkedFieldTitle(fields, item.fieldId)}
              </InspectorBlock>
              <InspectorList title="Notes">
                {notes.length === 0 ? (
                  <EducationEmptyState
                    description="Capture a note to connect source evidence to an idea."
                    title="No notes for this source"
                  />
                ) : (
                  notes.map((note) => (
                    <MiniLinkedItem
                      key={note.id}
                      meta={noteTypeLabels[note.type]}
                      title={note.title}
                    />
                  ))
                )}
              </InspectorList>
              <InspectorBlock title="Next Action">
                {item.nextAction || "No next action set"}
              </InspectorBlock>
              {item.note ? <InspectorBlock title="Note">{item.note}</InspectorBlock> : null}
            </div>
          </div>
        ) : (
          <div className="p-4">
            <EducationEmptyState
              description="Select a literature item to inspect it."
              title="No source selected"
            />
          </div>
        )}
        <div className="border-t border-[var(--border-subtle)] bg-[rgba(7,11,18,.58)] p-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <button
              className={primaryButtonClass}
              disabled={!item || item.status === "reviewed"}
              onClick={() => {
                if (item) {
                  onMarkReviewed(item);
                }
              }}
              type="button"
            >
              Mark reviewed
            </button>
            <button
              className={secondaryButtonClass}
              disabled={!item}
              onClick={() => {
                if (item) {
                  onAddNote(item);
                }
              }}
              type="button"
            >
              Add note
            </button>
            <button className={secondaryButtonClass} onClick={onClose} type="button">
              Close
            </button>
          </div>
        </div>
      </div>
    </EducationDialog>
  );
}

function QuestionInspector({
  fields,
  ideas,
  open,
  question,
  onAddNote,
  onClose,
  onMarkAnswered,
  onMarkInvestigating,
}: Readonly<{
  fields: readonly ResearchField[];
  ideas: readonly ResearchIdea[];
  open: boolean;
  question: ResearchQuestion | null;
  onAddNote: (question: ResearchQuestion) => void;
  onClose: () => void;
  onMarkAnswered: (question: ResearchQuestion) => void;
  onMarkInvestigating: (question: ResearchQuestion) => void;
}>) {
  return (
    <EducationDialog
      labelledBy="question-inspector-heading"
      onClose={onClose}
      open={open}
      sheet
    >
      <div className="flex h-full max-h-dvh flex-col">
        <DialogHeader
          description="Question inspector with local status actions."
          eyebrow="Inspector · Research question"
          id="question-inspector-heading"
          title="Research question"
        />
        {question ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <p className="text-[18px] font-semibold leading-7 text-[var(--text-primary)]">
              {question.question}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <EducationPill accent={questionStatusMeta[question.status].accent}>
                {questionStatusMeta[question.status].label}
              </EducationPill>
              <EducationPill accent={importanceMeta[question.importance].accent}>
                Importance · {importanceMeta[question.importance].label}
              </EducationPill>
            </div>
            <div className="mt-4 space-y-4">
              <InspectorBlock title="Linked Idea / Field">
                {linkedIdeaTitle(ideas, question.ideaId)} ·{" "}
                {linkedFieldTitle(fields, question.fieldId)}
              </InspectorBlock>
              <InspectorBlock title="Next Action">
                {question.nextAction || "No next action set"}
              </InspectorBlock>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <EducationEmptyState
              description="Select a research question to inspect it."
              title="No question selected"
            />
          </div>
        )}
        <div className="border-t border-[var(--border-subtle)] bg-[rgba(7,11,18,.58)] p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              className={secondaryButtonClass}
              disabled={!question || question.status === "investigating"}
              onClick={() => {
                if (question) {
                  onMarkInvestigating(question);
                }
              }}
              type="button"
            >
              Mark investigating
            </button>
            <button
              className={primaryButtonClass}
              disabled={!question || question.status === "answered"}
              onClick={() => {
                if (question) {
                  onMarkAnswered(question);
                }
              }}
              type="button"
            >
              Mark answered
            </button>
            <button
              className={secondaryButtonClass}
              disabled={!question}
              onClick={() => {
                if (question) {
                  onAddNote(question);
                }
              }}
              type="button"
            >
              Add note
            </button>
            <button className={secondaryButtonClass} onClick={onClose} type="button">
              Close
            </button>
          </div>
        </div>
      </div>
    </EducationDialog>
  );
}

function InspectorBlock({
  title,
  children,
}: Readonly<{
  title: string;
  children: ReactNode;
}>) {
  return (
    <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
        {title}
      </p>
      <div className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
        {children}
      </div>
    </div>
  );
}

function InspectorList({
  title,
  children,
}: Readonly<{
  title: string;
  children: ReactNode;
}>) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
        {title}
      </p>
      <div className="mt-2 grid gap-2">{children}</div>
    </div>
  );
}

function MiniLinkedItem({
  title,
  meta,
}: Readonly<{
  title: string;
  meta: string;
}>) {
  return (
    <div className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(7,11,18,.22)] p-3">
      <p className="text-[12px] font-semibold text-[var(--text-primary)]">
        {title}
      </p>
      <p className="mt-1 text-[10px] text-[var(--text-muted)]">{meta}</p>
    </div>
  );
}

function matchesIdeaSearch(idea: ResearchIdea, query: string) {
  if (!query) {
    return true;
  }

  const haystack = normalize(
    [
      idea.title,
      idea.fieldTitle,
      idea.summary,
      idea.researchQuestion ?? "",
      idea.nextAction,
    ].join(" "),
  );

  return haystack.includes(query);
}

function matchesLiteratureSearch(
  item: LiteratureItem,
  ideas: readonly ResearchIdea[],
  fields: readonly ResearchField[],
  query: string,
) {
  if (!query) {
    return true;
  }

  const haystack = normalize(
    [
      item.title,
      item.authors,
      item.year?.toString() ?? "",
      literatureTypeLabels[item.type],
      literatureStatusMeta[item.status].label,
      relevanceMeta[item.relevance].label,
      linkedIdeaTitle(ideas, item.ideaId),
      linkedFieldTitle(fields, item.fieldId),
      item.nextAction,
      item.note ?? "",
    ].join(" "),
  );

  return haystack.includes(query);
}

function matchesQuestionSearch(
  question: ResearchQuestion,
  ideas: readonly ResearchIdea[],
  fields: readonly ResearchField[],
  query: string,
) {
  if (!query) {
    return true;
  }

  const haystack = normalize(
    [
      question.question,
      questionStatusMeta[question.status].label,
      importanceMeta[question.importance].label,
      linkedIdeaTitle(ideas, question.ideaId),
      linkedFieldTitle(fields, question.fieldId),
      question.nextAction,
    ].join(" "),
  );

  return haystack.includes(query);
}

function matchesFieldSearch(field: ResearchField, query: string) {
  if (!query) {
    return true;
  }

  const haystack = normalize(
    [field.title, field.description, field.nextAction, field.status].join(" "),
  );

  return haystack.includes(query);
}

function matchesNoteSearch(
  note: ResearchNote,
  ideas: readonly ResearchIdea[],
  fields: readonly ResearchField[],
  query: string,
) {
  if (!query) {
    return true;
  }

  const haystack = normalize(
    [
      note.title,
      noteTypeLabels[note.type],
      note.snippet,
      note.tags.join(" "),
      linkedIdeaTitle(ideas, note.ideaId),
      linkedFieldTitle(fields, note.fieldId),
    ].join(" "),
  );

  return haystack.includes(query);
}

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}`;
}

function DemoEducationOverviewPage({
  viewModel,
}: Readonly<{
  viewModel: EducationOverviewViewModel;
}>) {
  const [ideas, setIdeas] = useState<ResearchIdea[]>(viewModel.ideas);
  const [fields] = useState<ResearchField[]>(viewModel.fields);
  const [literature, setLiterature] = useState<LiteratureItem[]>(
    viewModel.literature,
  );
  const [notes, setNotes] = useState<ResearchNote[]>(viewModel.notes);
  const [questions, setQuestions] = useState<ResearchQuestion[]>(
    viewModel.questions,
  );
  const [focusIdeaId, setFocusIdeaId] = useState<string | null>(
    viewModel.focus.idea?.id ?? viewModel.ideas[0]?.id ?? null,
  );
  const [activeSegment, setActiveSegment] =
    useState<EducationSegment>("overview");
  const [search, setSearch] = useState("");
  const [fieldFilter, setFieldFilter] = useState("all");
  const [ideaStatusFilter, setIdeaStatusFilter] = useState("all");
  const [literatureStatusFilter, setLiteratureStatusFilter] = useState("all");
  const [relevanceFilter, setRelevanceFilter] = useState("all");
  const [reviewNeededFilter, setReviewNeededFilter] = useState("all");
  const [thesisFilter, setThesisFilter] = useState("all");
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [dialogContext, setDialogContext] = useState<LinkContext>({});
  const [inspector, setInspector] = useState<InspectorState>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const query = normalize(search);
  const actionsEnabled = viewModel.actionsEnabled;
  const stateAttrs = (key: keyof EducationOverviewViewModel["contentStates"]) =>
    contentStateDataAttributes(viewModel.contentStates[key], viewModel.profileId);

  const focusIdea = useMemo(
    () => ideas.find((idea) => idea.id === focusIdeaId) ?? ideas[0] ?? null,
    [focusIdeaId, ideas],
  );
  const focusField = useMemo(
    () =>
      focusIdea
        ? fields.find((field) => field.id === focusIdea.fieldId) ?? null
        : null,
    [fields, focusIdea],
  );
  const focusLiterature = useMemo(
    () =>
      focusIdea ? literature.filter((item) => item.ideaId === focusIdea.id) : [],
    [focusIdea, literature],
  );
  const focusNotes = useMemo(
    () => (focusIdea ? notes.filter((note) => note.ideaId === focusIdea.id) : []),
    [focusIdea, notes],
  );
  const focusQuestions = useMemo(
    () =>
      focusIdea
        ? questions.filter(
            (question) =>
              question.ideaId === focusIdea.id &&
              ["open", "investigating"].includes(question.status),
          )
        : [],
    [focusIdea, questions],
  );

  const stats = useMemo<EducationOverviewStats>(
    () => ({
      activeIdeaCount: ideas.filter((idea) =>
        ["exploring", "promising", "active"].includes(idea.status),
      ).length,
      queuedLiteratureCount: literature.filter((item) =>
        ["to_read", "reading", "extracting"].includes(item.status),
      ).length,
      openQuestionCount: questions.filter((question) =>
        ["open", "investigating"].includes(question.status),
      ).length,
      reviewNeededNoteCount: notes.filter((note) => note.reviewNeeded).length,
    }),
    [ideas, literature, notes, questions],
  );

  const filteredIdeas = useMemo(
    () =>
      ideas.filter(
        (idea) =>
          (fieldFilter === "all" || idea.fieldId === fieldFilter) &&
          (ideaStatusFilter === "all" || idea.status === ideaStatusFilter) &&
          (thesisFilter === "all" || idea.thesisPotential === thesisFilter) &&
          matchesIdeaSearch(idea, query),
      ),
    [fieldFilter, ideaStatusFilter, ideas, query, thesisFilter],
  );

  const filteredLiterature = useMemo(
    () =>
      literature.filter(
        (item) =>
          (fieldFilter === "all" || item.fieldId === fieldFilter) &&
          (literatureStatusFilter === "all" ||
            item.status === literatureStatusFilter) &&
          (relevanceFilter === "all" || item.relevance === relevanceFilter) &&
          matchesLiteratureSearch(item, ideas, fields, query),
      ),
    [
      fieldFilter,
      fields,
      ideas,
      literature,
      literatureStatusFilter,
      query,
      relevanceFilter,
    ],
  );

  const filteredQuestions = useMemo(
    () =>
      questions.filter(
        (question) =>
          (fieldFilter === "all" || question.fieldId === fieldFilter) &&
          matchesQuestionSearch(question, ideas, fields, query),
      ),
    [fieldFilter, fields, ideas, query, questions],
  );

  const filteredFields = useMemo(
    () =>
      fields.filter(
        (field) =>
          (fieldFilter === "all" || field.id === fieldFilter) &&
          matchesFieldSearch(field, query),
      ),
    [fieldFilter, fields, query],
  );

  const filteredNotes = useMemo(
    () =>
      notes.filter(
        (note) =>
          (fieldFilter === "all" || note.fieldId === fieldFilter) &&
          (reviewNeededFilter === "all" ||
            (reviewNeededFilter === "needed" && note.reviewNeeded) ||
            (reviewNeededFilter === "clear" && !note.reviewNeeded)) &&
          matchesNoteSearch(note, ideas, fields, query),
      ),
    [fieldFilter, fields, ideas, notes, query, reviewNeededFilter],
  );

  const selectedIdea =
    inspector?.type === "idea"
      ? ideas.find((idea) => idea.id === inspector.id) ?? null
      : null;
  const selectedLiterature =
    inspector?.type === "literature"
      ? literature.find((item) => item.id === inspector.id) ?? null
      : null;
  const selectedQuestion =
    inspector?.type === "question"
      ? questions.find((question) => question.id === inspector.id) ?? null
      : null;

  const hasSearchResults =
    filteredIdeas.length > 0 ||
    filteredLiterature.length > 0 ||
    filteredQuestions.length > 0 ||
    filteredFields.length > 0 ||
    filteredNotes.length > 0;

  function closeDialog() {
    setActiveDialog(null);
    setDialogContext({});
  }

  function openIdeaDialog() {
    if (!actionsEnabled) return;
    setInspector(null);
    setDialogContext({});
    setActiveDialog("idea");
  }

  function openLiteratureDialog(context: LinkContext = {}) {
    if (!actionsEnabled) return;
    setInspector(null);
    setDialogContext(context);
    setActiveDialog("literature");
  }

  function openNoteDialog(context: LinkContext = {}) {
    if (!actionsEnabled) return;
    setInspector(null);
    setDialogContext(context);
    setActiveDialog("note");
  }

  function openQuestionDialog(context: LinkContext = {}) {
    if (!actionsEnabled) return;
    setInspector(null);
    setDialogContext(context);
    setActiveDialog("question");
  }

  function handleSaveIdea(draft: IdeaDraft) {
    const field = fields.find((item) => item.id === draft.fieldId);
    const idea: ResearchIdea = {
      id: createId("idea-local"),
      title: draft.title.trim(),
      status: draft.status,
      workType: "research_project",
      fieldId: draft.fieldId,
      fieldTitle: field?.title ?? "Research Field",
      thesisPotential: draft.thesisPotential,
      summary: draft.summary.trim() || "New local research idea without summary yet.",
      researchQuestion: draft.researchQuestion.trim() || undefined,
      nextAction: draft.nextAction.trim(),
      sourceCount: 0,
      noteCount: 0,
      openQuestionCount: 0,
      updatedAt: new Date().toISOString(),
    };

    setPageError(null);
    setIdeas((current) => [idea, ...current]);
    setFocusIdeaId(idea.id);
    closeDialog();
    setToast({
      title: "Research idea added locally",
      body: "The idea exists only in this mock page state.",
      tone: "success",
    });
  }

  function handleSaveLiterature(draft: LiteratureDraft) {
    const parsedYear = Number.parseInt(draft.year, 10);
    const item: LiteratureItem = {
      id: createId("literature-local"),
      title: draft.title.trim(),
      authors: draft.authors.trim(),
      year: Number.isNaN(parsedYear) ? undefined : parsedYear,
      type: draft.type,
      status: draft.status,
      relevance: draft.relevance,
      ideaId: draft.ideaId || undefined,
      fieldId: draft.fieldId || undefined,
      note: draft.note.trim() || undefined,
      nextAction: draft.nextAction.trim() || "Clarify reading purpose",
      updatedAt: new Date().toISOString(),
    };

    setPageError(null);
    setLiterature((current) => [item, ...current]);
    if (item.ideaId) {
      setIdeas((current) =>
        current.map((idea) =>
          idea.id === item.ideaId
            ? { ...idea, sourceCount: idea.sourceCount + 1 }
            : idea,
        ),
      );
    }
    closeDialog();
    setToast({
      title: "Literature item added locally",
      body: "No external literature API or citation lookup was used.",
      tone: "success",
    });
  }

  function handleSaveNote(draft: NoteDraft) {
    const tags = draft.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const note: ResearchNote = {
      id: createId("note-local"),
      title: draft.title.trim(),
      type: draft.type,
      ideaId: draft.ideaId || undefined,
      literatureId: draft.literatureId || undefined,
      fieldId: draft.fieldId || undefined,
      snippet: draft.snippet.trim(),
      body: draft.snippet.trim(),
      tags,
      source: draft.source,
      reviewNeeded: draft.reviewNeeded,
      updatedAt: new Date().toISOString(),
    };

    setPageError(null);
    setNotes((current) => [note, ...current]);
    if (note.ideaId) {
      setIdeas((current) =>
        current.map((idea) =>
          idea.id === note.ideaId
            ? { ...idea, noteCount: idea.noteCount + 1 }
            : idea,
        ),
      );
    }
    closeDialog();
    setToast({
      title: "Research note captured locally",
      body: "The note is stored only in local page state.",
      tone: "success",
    });
  }

  function handleSaveQuestion(draft: QuestionDraft) {
    const question: ResearchQuestion = {
      id: createId("question-local"),
      question: draft.question.trim(),
      ideaId: draft.ideaId || undefined,
      fieldId: draft.fieldId || undefined,
      importance: draft.importance,
      status: draft.status,
      nextAction: draft.nextAction.trim() || "Define next research step",
      updatedAt: new Date().toISOString(),
    };

    setPageError(null);
    setQuestions((current) => [question, ...current]);
    if (question.ideaId && ["open", "investigating"].includes(question.status)) {
      setIdeas((current) =>
        current.map((idea) =>
          idea.id === question.ideaId
            ? { ...idea, openQuestionCount: idea.openQuestionCount + 1 }
            : idea,
        ),
      );
    }
    closeDialog();
    setToast({
      title: "Research question added locally",
      body: "The question is available in the local mock overview.",
      tone: "success",
    });
  }

  function handleSetFocus(idea: ResearchIdea) {
    setFocusIdeaId(idea.id);
    setInspector(null);
    setToast({
      title: "Focus updated locally",
      body: `${idea.title} is now the current research focus.`,
      tone: "info",
    });
  }

  function handleMarkReviewed(item: LiteratureItem) {
    setLiterature((current) =>
      current.map((entry) =>
        entry.id === item.id
          ? { ...entry, status: "reviewed", updatedAt: new Date().toISOString() }
          : entry,
      ),
    );
    setToast({
      title: "Literature marked reviewed",
      body: "This status change is local to the mock overview.",
      tone: "success",
    });
  }

  function updateQuestionStatus(
    question: ResearchQuestion,
    status: ResearchQuestion["status"],
  ) {
    const wasOpen = ["open", "investigating"].includes(question.status);
    const willBeOpen = ["open", "investigating"].includes(status);

    setQuestions((current) =>
      current.map((entry) =>
        entry.id === question.id
          ? { ...entry, status, updatedAt: new Date().toISOString() }
          : entry,
      ),
    );

    if (question.ideaId && wasOpen !== willBeOpen) {
      setIdeas((current) =>
        current.map((idea) =>
          idea.id === question.ideaId
            ? {
                ...idea,
                openQuestionCount: Math.max(
                  0,
                  idea.openQuestionCount + (willBeOpen ? 1 : -1),
                ),
              }
            : idea,
        ),
      );
    }

    setToast({
      title: "Question status updated",
      body: `Status changed to ${questionStatusMeta[status].label} locally.`,
      tone: "success",
    });
  }

  return (
    <div
      className="mx-auto flex w-full max-w-[2208px] flex-col gap-4 pb-8"
      data-education-section="page"
      id="education-page"
      {...stateAttrs("page")}
    >
      <EducationPageHeader
        actionsEnabled={actionsEnabled}
        onAddIdea={openIdeaDialog}
        onAddLiterature={() => openLiteratureDialog()}
        onAddNote={() => openNoteDialog()}
        onAddQuestion={() => openQuestionDialog()}
        viewModel={viewModel}
      />

      {pageError ? (
        <EducationErrorState
          message={pageError}
          onDismiss={() => setPageError(null)}
        />
      ) : null}

      <StatsStrip stats={stats} stateAttributes={stateAttrs("summary")} />

      <EducationControls
        activeSegment={activeSegment}
        fieldFilter={fieldFilter}
        fields={fields}
        ideaStatusFilter={ideaStatusFilter}
        literatureStatusFilter={literatureStatusFilter}
        onActiveSegmentChange={setActiveSegment}
        onFieldFilterChange={setFieldFilter}
        onIdeaStatusFilterChange={setIdeaStatusFilter}
        onLiteratureStatusFilterChange={setLiteratureStatusFilter}
        onRelevanceFilterChange={setRelevanceFilter}
        onReviewNeededFilterChange={setReviewNeededFilter}
        onSearchChange={setSearch}
        onThesisFilterChange={setThesisFilter}
        relevanceFilter={relevanceFilter}
        reviewNeededFilter={reviewNeededFilter}
        search={search}
        stateAttributes={stateAttrs("filters")}
        thesisFilter={thesisFilter}
      />

      {search && !hasSearchResults ? (
        <EducationEmptyState
          description="No idea, source, question, field or note matches the current search and filters."
          title="No search results"
        />
      ) : null}

      {activeSegment === "overview" ? (
        <CurrentResearchFocusCard
          actionsEnabled={actionsEnabled}
          focusField={focusField}
          focusIdea={focusIdea}
          focusLiterature={focusLiterature}
          focusNotes={focusNotes}
          focusQuestions={focusQuestions}
          onAddSource={() =>
            openLiteratureDialog(
              focusIdea
                ? {
                    ideaId: focusIdea.id,
                    fieldId: focusIdea.fieldId,
                  }
                : {},
            )
          }
          onOpenFocus={() =>
            focusIdea
              ? setInspector({ type: "idea", id: focusIdea.id })
              : openIdeaDialog()
          }
          stateAttributes={stateAttrs("currentResearchFocus")}
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,.75fr)]">
        <div className="min-w-0 space-y-4">
          {activeSegment === "overview" || activeSegment === "ideas" ? (
            <ResearchIdeaPipeline
              ideas={filteredIdeas}
              onAddNote={(idea) =>
                openNoteDialog({ ideaId: idea.id, fieldId: idea.fieldId })
              }
              onOpenIdea={(idea) => setInspector({ type: "idea", id: idea.id })}
              selectedIdeaId={inspector?.type === "idea" ? inspector.id : null}
              stateAttributes={stateAttrs("researchIdeaPipeline")}
            />
          ) : null}

          {activeSegment === "overview" || activeSegment === "literature" ? (
            <LiteratureQueue
              fields={fields}
              ideas={ideas}
              literature={filteredLiterature}
              onAddNote={(item) =>
                openNoteDialog({
                  ideaId: item.ideaId,
                  literatureId: item.id,
                  fieldId: item.fieldId,
                })
              }
              onOpenLiterature={(item) =>
                setInspector({ type: "literature", id: item.id })
              }
              selectedLiteratureId={
                inspector?.type === "literature" ? inspector.id : null
              }
              stateAttributes={stateAttrs("literatureQueue")}
            />
          ) : null}

          {activeSegment === "overview" || activeSegment === "questions" ? (
            <OpenResearchQuestions
              fields={fields}
              ideas={ideas}
              onAddNote={(question) =>
                openNoteDialog({
                  ideaId: question.ideaId,
                  fieldId: question.fieldId,
                })
              }
              onOpenQuestion={(question) =>
                setInspector({ type: "question", id: question.id })
              }
              questions={filteredQuestions}
            />
          ) : null}
        </div>

        <div className="min-w-0 space-y-4">
          {activeSegment === "overview" || activeSegment === "fields" ? (
            <ResearchFieldsPanel
              fields={filteredFields}
              onSelectField={(fieldId) => setFieldFilter(fieldId)}
              selectedFieldId={fieldFilter}
              stateAttributes={stateAttrs("researchFields")}
            />
          ) : null}

          {activeSegment === "overview" ? (
            <>
              <RecentResearchNotes
                notes={filteredNotes}
                stateAttributes={stateAttrs("recentResearchNotes")}
              />
              <AcademicRhythm rhythm={viewModel.rhythm} />
            </>
          ) : null}
        </div>
      </div>

      <EducationMethodNotes methodNotes={viewModel.methodNotes} />

      {activeDialog === "idea" ? (
        <AddResearchIdeaDialog
          fields={fields}
          onClose={closeDialog}
          onSave={handleSaveIdea}
          open
        />
      ) : null}
      {activeDialog === "literature" ? (
        <AddLiteratureDialog
          context={dialogContext}
          fields={fields}
          ideas={ideas}
          onClose={closeDialog}
          onSave={handleSaveLiterature}
          open
        />
      ) : null}
      {activeDialog === "note" ? (
        <CaptureResearchNoteDialog
          context={dialogContext}
          fields={fields}
          ideas={ideas}
          literature={literature}
          onClose={closeDialog}
          onSave={handleSaveNote}
          open
        />
      ) : null}
      {activeDialog === "question" ? (
        <AddResearchQuestionDialog
          context={dialogContext}
          fields={fields}
          ideas={ideas}
          onClose={closeDialog}
          onSave={handleSaveQuestion}
          open
        />
      ) : null}

      <ResearchIdeaInspector
        fields={fields}
        idea={selectedIdea}
        literature={
          selectedIdea
            ? literature.filter((item) => item.ideaId === selectedIdea.id)
            : []
        }
        notes={
          selectedIdea
            ? notes.filter((note) => note.ideaId === selectedIdea.id)
            : []
        }
        onAddNote={(idea) =>
          openNoteDialog({ ideaId: idea.id, fieldId: idea.fieldId })
        }
        onAddSource={(idea) =>
          openLiteratureDialog({ ideaId: idea.id, fieldId: idea.fieldId })
        }
        onClose={() => setInspector(null)}
        onSetFocus={handleSetFocus}
        open={inspector?.type === "idea"}
        questions={
          selectedIdea
            ? questions.filter(
                (question) =>
                  question.ideaId === selectedIdea.id &&
                  ["open", "investigating"].includes(question.status),
              )
            : []
        }
      />

      <LiteratureInspector
        fields={fields}
        ideas={ideas}
        item={selectedLiterature}
        notes={
          selectedLiterature
            ? notes.filter((note) => note.literatureId === selectedLiterature.id)
            : []
        }
        onAddNote={(item) =>
          openNoteDialog({
            ideaId: item.ideaId,
            literatureId: item.id,
            fieldId: item.fieldId,
          })
        }
        onClose={() => setInspector(null)}
        onMarkReviewed={handleMarkReviewed}
        open={inspector?.type === "literature"}
      />

      <QuestionInspector
        fields={fields}
        ideas={ideas}
        onAddNote={(question) =>
          openNoteDialog({
            ideaId: question.ideaId,
            fieldId: question.fieldId,
          })
        }
        onClose={() => setInspector(null)}
        onMarkAnswered={(question) => updateQuestionStatus(question, "answered")}
        onMarkInvestigating={(question) =>
          updateQuestionStatus(question, "investigating")
        }
        open={inspector?.type === "question"}
        question={selectedQuestion}
      />

      <Toast onDismiss={dismissToast} toast={toast} />
    </div>
  );
}

export function EducationOverviewPage({ viewModel }: Readonly<{ viewModel: EducationOverviewViewModel }>) {
  return viewModel.manualWorkspace ? <EducationManualWorkspace viewModel={viewModel} /> : <DemoEducationOverviewPage viewModel={viewModel} />;
}
