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
  AcademicWorkType,
  EducationSubpageKind,
  EducationWorkspaceViewModel,
  LiteratureItem,
  LiteratureStatus,
  MasterThesisMilestone,
  MasterThesisState,
  ResearchField,
  ResearchFieldStatus,
  ResearchIdea,
  ResearchIdeaStatus,
  ResearchNote,
  ResearchNoteType,
  ResearchQuestion,
  ThesisPotential,
} from "./types";

type EducationStyle = CSSProperties & {
  "--accent"?: string;
  "--progress-width"?: string;
};

type DialogKind =
  | "idea"
  | "literature"
  | "field"
  | "note"
  | "question"
  | "thesis-action"
  | "milestone"
  | null;

type InspectorState =
  | { type: "idea"; id: string }
  | { type: "literature"; id: string }
  | { type: "field"; id: string }
  | { type: "note"; id: string }
  | { type: "question"; id: string }
  | { type: "thesis" }
  | null;

type ToastState = {
  title: string;
  body: string;
  tone: "success" | "info" | "error";
};

type LinkContext = {
  ideaId?: string;
  fieldId?: string;
  literatureId?: string;
};

type IdeaDraft = {
  title: string;
  workType: AcademicWorkType;
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
  citationKey: string;
  nextAction: string;
  note: string;
};

type FieldDraft = {
  title: string;
  description: string;
  status: ResearchFieldStatus;
  nextAction: string;
};

type NoteDraft = {
  title: string;
  type: ResearchNoteType;
  ideaId: string;
  literatureId: string;
  fieldId: string;
  body: string;
  tags: string;
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

type ThesisActionDraft = {
  nextAction: string;
  phase: MasterThesisState["currentPhase"];
  riskNote: string;
};

type MilestoneDraft = {
  title: string;
  status: MasterThesisMilestone["status"];
  dueLabel: string;
  progress: string;
  nextAction: string;
};

const educationAccent = "var(--accent-blue)";
const literatureAccent = "var(--accent-cyan)";
const ideaAccent = "var(--accent-purple)";
const questionAccent = "var(--accent-orange)";
const successAccent = "var(--accent-green)";
const riskAccent = "var(--accent-red)";

const pages: Record<
  EducationSubpageKind,
  {
    title: string;
    eyebrow: string;
    summary: string;
    primaryAction: string;
    secondaryActions: string[];
  }
> = {
  "scientific-work": {
    title: "Scientific Work",
    eyebrow: "Education · Scientific Work",
    summary:
      "Research ideas, questions, fields, academic work, notes and thesis focus in one workspace",
    primaryAction: "Add research idea",
    secondaryActions: ["Capture question", "Add source", "Capture research note"],
  },
  "research-ideas": {
    title: "Research Ideas",
    eyebrow: "Education · Ideas",
    summary: "Academic ideas, thesis potential and next research steps",
    primaryAction: "Add research idea",
    secondaryActions: ["Capture question", "Add source"],
  },
  literature: {
    title: "Literature",
    eyebrow: "Education · Literature",
    summary: "Sources, reading status and extraction queue",
    primaryAction: "Add literature",
    secondaryActions: ["Capture source note", "Review queue"],
  },
  "research-fields": {
    title: "Research Fields",
    eyebrow: "Education · Fields",
    summary: "Academic fields, clusters and topic context",
    primaryAction: "Add field",
    secondaryActions: ["Add idea", "Add literature"],
  },
  "research-notes": {
    title: "Research Notes",
    eyebrow: "Education · Notes",
    summary: "Academic notes, questions and source-linked thinking",
    primaryAction: "Capture research note",
    secondaryActions: ["Add question", "Review notes"],
  },
  "master-thesis": {
    title: "Master Thesis",
    eyebrow: "Education · Thesis",
    summary: "Research focus, milestones and thesis evidence",
    primaryAction: "Update next action",
    secondaryActions: ["Add milestone", "Add source", "Capture thesis note"],
  },
};

const subpageLinks: readonly { href: string; label: string }[] = [
  { href: "/education", label: "Overview" },
  { href: "/education/scientific-work", label: "Scientific Work" },
  { href: "/education/literature", label: "Literature" },
  { href: "/education/learning-log", label: "Learning Log" },
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

const fieldStatuses: readonly ResearchFieldStatus[] = [
  "active",
  "watching",
  "paused",
  "archived",
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

const workTypes: readonly AcademicWorkType[] = [
  "hausarbeit",
  "seminararbeit",
  "master_thesis",
  "paper",
  "presentation",
  "research_project",
  "other",
];

const thesisPhases: readonly MasterThesisState["currentPhase"][] = [
  "orientation",
  "topic_selection",
  "proposal",
  "literature",
  "method",
  "writing",
  "revision",
];

const ideaStatusMeta: Record<ResearchIdeaStatus, { label: string; accent: string }> = {
  idea: { label: "Idea", accent: educationAccent },
  exploring: { label: "Exploring", accent: educationAccent },
  promising: { label: "Promising", accent: ideaAccent },
  active: { label: "Active", accent: successAccent },
  paused: { label: "Paused", accent: "var(--text-muted)" },
  rejected: { label: "Rejected", accent: riskAccent },
  archived: { label: "Archived", accent: "var(--text-muted)" },
};

const literatureStatusMeta: Record<
  LiteratureStatus,
  { label: string; accent: string }
> = {
  to_read: { label: "To read", accent: literatureAccent },
  reading: { label: "Reading", accent: educationAccent },
  extracting: { label: "Extracting", accent: ideaAccent },
  reviewed: { label: "Reviewed", accent: successAccent },
  used: { label: "Used", accent: successAccent },
  discarded: { label: "Discarded", accent: riskAccent },
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

const literatureTypeLabels: Record<LiteratureItem["type"], string> = {
  paper: "Paper",
  book: "Book",
  article: "Article",
  thesis: "Thesis",
  report: "Report",
  website: "Website",
  other: "Other",
};

const workTypeLabels: Record<AcademicWorkType, string> = {
  hausarbeit: "Hausarbeit",
  seminararbeit: "Seminararbeit",
  master_thesis: "Master thesis",
  paper: "Paper",
  presentation: "Presentation",
  research_project: "Research project",
  other: "Other",
};

const thesisPotentialLabels: Record<ThesisPotential, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  unknown: "Unknown",
};

const questionStatusMeta: Record<
  ResearchQuestion["status"],
  { label: string; accent: string }
> = {
  open: { label: "Open", accent: questionAccent },
  investigating: { label: "Investigating", accent: educationAccent },
  answered: { label: "Answered", accent: successAccent },
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

const relevanceMeta: Record<LiteratureItem["relevance"], { label: string; accent: string }> = {
  low: { label: "Low relevance", accent: "var(--text-muted)" },
  medium: { label: "Medium relevance", accent: educationAccent },
  high: { label: "High relevance", accent: literatureAccent },
};

const milestoneStatusMeta: Record<
  MasterThesisMilestone["status"],
  { label: string; accent: string }
> = {
  planned: { label: "Planned", accent: educationAccent },
  active: { label: "Active", accent: successAccent },
  blocked: { label: "Blocked", accent: riskAccent },
  done: { label: "Done", accent: successAccent },
  paused: { label: "Paused", accent: "var(--text-muted)" },
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
  return { "--accent": accent };
}

function progressStyle(progress: number): EducationStyle {
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

function formatDate(value: string) {
  return value.split("T")[0] ?? value;
}

function optionLabel(value: string) {
  return value
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function dialogBackdropClose(
  event: MouseEvent<HTMLDialogElement>,
  onClose: () => void,
) {
  if (event.target === event.currentTarget) {
    onClose();
  }
}

function findIdea(ideas: readonly ResearchIdea[], id?: string) {
  return ideas.find((idea) => idea.id === id) ?? null;
}

function findField(fields: readonly ResearchField[], id?: string) {
  return fields.find((field) => field.id === id) ?? null;
}

function findLiterature(literature: readonly LiteratureItem[], id?: string) {
  return literature.find((item) => item.id === id) ?? null;
}

function linkedIdeaTitle(ideas: readonly ResearchIdea[], ideaId?: string) {
  return findIdea(ideas, ideaId)?.title ?? "No linked idea";
}

function linkedFieldTitle(fields: readonly ResearchField[], fieldId?: string) {
  return findField(fields, fieldId)?.title ?? "No linked field";
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

function DialogHeader({
  id,
  eyebrow,
  title,
  description,
}: Readonly<{
  id: string;
  eyebrow: string;
  title: string;
  description: string;
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

function LinkedMiniItem({
  title,
  meta,
}: Readonly<{ title: string; meta: string }>) {
  return (
    <div className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(7,11,18,.22)] p-3">
      <p className="text-[12px] font-semibold text-[var(--text-primary)]">
        {title}
      </p>
      <p className="mt-1 text-[10px] text-[var(--text-muted)]">{meta}</p>
    </div>
  );
}

function EducationSubpageHeader({
  config,
  pageKind,
  onPrimaryAction,
  onSecondaryAction,
}: Readonly<{
  config: (typeof pages)[EducationSubpageKind];
  pageKind: EducationSubpageKind;
  onPrimaryAction: () => void;
  onSecondaryAction: (label: string) => void;
}>) {
  return (
    <header className="rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[var(--surface-1)] px-4 py-5 shadow-[0_8px_22px_rgba(0,0,0,.12)] sm:px-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-blue)]">
            {config.eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight text-[var(--text-primary)]">
            {config.title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            {config.summary}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:flex xl:justify-end">
          <button className={primaryButtonClass} onClick={onPrimaryAction} type="button">
            {config.primaryAction}
          </button>
          {config.secondaryActions.map((action, index) => (
            <button
              className={secondaryButtonClass}
              key={`education-secondary-action-${index}`}
              onClick={() => onSecondaryAction(action)}
              type="button"
            >
              {action}
            </button>
          ))}
        </div>
      </div>
      <nav aria-label="Education section pages" className="mt-4 flex flex-wrap gap-2">
        {subpageLinks.map((link) => (
          <Link
            aria-current={link.href.endsWith(pageKind) ? "page" : undefined}
            className={cn(
              quietButtonClass,
              link.href.endsWith(pageKind) &&
                "border-[rgba(91,124,250,.42)] bg-[rgba(91,124,250,.14)] text-[var(--text-primary)]",
            )}
            href={link.href}
            key={link.href}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

function SearchAndFilters({
  pageKind,
  search,
  fieldFilter,
  statusFilter,
  thesisFilter,
  workTypeFilter,
  relevanceFilter,
  typeFilter,
  reviewFilter,
  gapFilter,
  fields,
  ideas,
  onSearch,
  onField,
  onStatus,
  onThesis,
  onWorkType,
  onRelevance,
  onType,
  onReview,
  onGap,
}: Readonly<{
  pageKind: EducationSubpageKind;
  search: string;
  fieldFilter: string;
  statusFilter: string;
  thesisFilter: string;
  workTypeFilter: string;
  relevanceFilter: string;
  typeFilter: string;
  reviewFilter: string;
  gapFilter: string;
  fields: readonly ResearchField[];
  ideas: readonly ResearchIdea[];
  onSearch: (value: string) => void;
  onField: (value: string) => void;
  onStatus: (value: string) => void;
  onThesis: (value: string) => void;
  onWorkType: (value: string) => void;
  onRelevance: (value: string) => void;
  onType: (value: string) => void;
  onReview: (value: string) => void;
  onGap: (value: string) => void;
}>) {
  return (
    <section
      aria-label="Education filters"
      className="rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-3"
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(240px,360px)_1fr]">
        <label htmlFor={`${pageKind}-search`}>
          <FieldLabel>Search</FieldLabel>
          <input
            className={inputClass}
            id={`${pageKind}-search`}
            onChange={(event) => onSearch(event.target.value)}
            placeholder={
              pageKind === "literature"
                ? "Search literature"
                : pageKind === "scientific-work"
                  ? "Search scientific work"
                : pageKind === "research-fields"
                  ? "Search fields"
                  : pageKind === "research-notes"
                    ? "Search notes"
                    : "Search ideas"
            }
            type="search"
            value={search}
          />
        </label>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <label htmlFor={`${pageKind}-field-filter`}>
            <FieldLabel>Field</FieldLabel>
            <select
              className={inputClass}
              id={`${pageKind}-field-filter`}
              onChange={(event) => onField(event.target.value)}
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

          {pageKind === "research-ideas" ? (
            <>
              <label htmlFor="idea-status-filter">
                <FieldLabel>Status</FieldLabel>
                <select
                  className={inputClass}
                  id="idea-status-filter"
                  onChange={(event) => onStatus(event.target.value)}
                  value={statusFilter}
                >
                  <option value="all">All statuses</option>
                  {ideaStatuses.map((status) => (
                    <option key={status} value={status}>
                      {ideaStatusMeta[status].label}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="idea-thesis-filter">
                <FieldLabel>Thesis Potential</FieldLabel>
                <select
                  className={inputClass}
                  id="idea-thesis-filter"
                  onChange={(event) => onThesis(event.target.value)}
                  value={thesisFilter}
                >
                  <option value="all">All potential</option>
                  {(["high", "medium", "low", "unknown"] as const).map((value) => (
                    <option key={value} value={value}>
                      {thesisPotentialLabels[value]}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="idea-work-type-filter">
                <FieldLabel>Work Type</FieldLabel>
                <select
                  className={inputClass}
                  id="idea-work-type-filter"
                  onChange={(event) => onWorkType(event.target.value)}
                  value={workTypeFilter}
                >
                  <option value="all">All work types</option>
                  {workTypes.map((value) => (
                    <option key={value} value={value}>
                      {workTypeLabels[value]}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}

          {pageKind === "literature" ? (
            <>
              <label htmlFor="literature-status-filter">
                <FieldLabel>Status</FieldLabel>
                <select
                  className={inputClass}
                  id="literature-status-filter"
                  onChange={(event) => onStatus(event.target.value)}
                  value={statusFilter}
                >
                  <option value="all">All statuses</option>
                  {literatureStatuses.map((status) => (
                    <option key={status} value={status}>
                      {literatureStatusMeta[status].label}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="literature-relevance-filter">
                <FieldLabel>Relevance</FieldLabel>
                <select
                  className={inputClass}
                  id="literature-relevance-filter"
                  onChange={(event) => onRelevance(event.target.value)}
                  value={relevanceFilter}
                >
                  <option value="all">All relevance</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>
              <label htmlFor="literature-type-filter">
                <FieldLabel>Type</FieldLabel>
                <select
                  className={inputClass}
                  id="literature-type-filter"
                  onChange={(event) => onType(event.target.value)}
                  value={typeFilter}
                >
                  <option value="all">All types</option>
                  {Object.entries(literatureTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}

          {pageKind === "research-fields" ? (
            <>
              <label htmlFor="field-status-filter">
                <FieldLabel>Status</FieldLabel>
                <select
                  className={inputClass}
                  id="field-status-filter"
                  onChange={(event) => onStatus(event.target.value)}
                  value={statusFilter}
                >
                  <option value="all">All statuses</option>
                  {fieldStatuses.map((status) => (
                    <option key={status} value={status}>
                      {optionLabel(status)}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="field-gap-filter">
                <FieldLabel>Has gaps</FieldLabel>
                <select
                  className={inputClass}
                  id="field-gap-filter"
                  onChange={(event) => onGap(event.target.value)}
                  value={gapFilter}
                >
                  <option value="all">All fields</option>
                  <option value="gaps">Has gaps</option>
                  <option value="active">Has active ideas</option>
                </select>
              </label>
            </>
          ) : null}

          {pageKind === "research-notes" ? (
            <>
              <label htmlFor="note-type-filter">
                <FieldLabel>Note Type</FieldLabel>
                <select
                  className={inputClass}
                  id="note-type-filter"
                  onChange={(event) => onType(event.target.value)}
                  value={typeFilter}
                >
                  <option value="all">All note types</option>
                  {noteTypes.map((type) => (
                    <option key={type} value={type}>
                      {noteTypeLabels[type]}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="note-review-filter">
                <FieldLabel>Review Needed</FieldLabel>
                <select
                  className={inputClass}
                  id="note-review-filter"
                  onChange={(event) => onReview(event.target.value)}
                  value={reviewFilter}
                >
                  <option value="all">All notes</option>
                  <option value="needed">Needs review</option>
                  <option value="clear">No review flag</option>
                </select>
              </label>
            </>
          ) : null}

          {pageKind === "master-thesis" ? (
            <label htmlFor="thesis-linked-idea-filter">
              <FieldLabel>Linked Idea</FieldLabel>
              <select
                className={inputClass}
                id="thesis-linked-idea-filter"
                onChange={(event) => onType(event.target.value)}
                value={typeFilter}
              >
                <option value="all">All thesis links</option>
                {ideas.map((idea) => (
                  <option key={idea.id} value={idea.id}>
                    {idea.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function matchesSearch(values: readonly string[], query: string) {
  if (!query) {
    return true;
  }

  return normalize(values.join(" ")).includes(query);
}

function IdeaCard({
  idea,
  onOpen,
}: Readonly<{ idea: ResearchIdea; onOpen: (idea: ResearchIdea) => void }>) {
  return (
    <article className="rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-4 transition hover:border-[var(--border-default)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <button
            className="text-left text-[15px] font-semibold leading-5 text-[var(--text-primary)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
            onClick={() => onOpen(idea)}
            type="button"
          >
            {idea.title}
          </button>
          <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
            {idea.summary}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Pill accent={ideaStatusMeta[idea.status].accent}>
            {ideaStatusMeta[idea.status].label}
          </Pill>
          <Pill accent={ideaAccent}>
            Thesis · {thesisPotentialLabels[idea.thesisPotential]}
          </Pill>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <Metric label="Work Type" value={workTypeLabels[idea.workType]} />
        <Metric label="Sources" value={idea.sourceCount} accent={literatureAccent} />
        <Metric label="Notes" value={idea.noteCount} />
        <Metric label="Questions" value={idea.openQuestionCount} accent={questionAccent} />
      </div>
      <div className="mt-3 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(7,11,18,.22)] p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
          Research Question
        </p>
        <p className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)]">
          {idea.researchQuestion ?? "No research question set yet."}
        </p>
      </div>
      <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-[12px] leading-5 text-[var(--text-secondary)]">
          <span className="font-semibold text-[var(--text-primary)]">Next:</span>{" "}
          {idea.nextAction}
        </p>
        <button className={quietButtonClass} onClick={() => onOpen(idea)} type="button">
          Open idea
        </button>
      </div>
    </article>
  );
}

function LiteratureRow({
  item,
  ideas,
  fields,
  onOpen,
}: Readonly<{
  item: LiteratureItem;
  ideas: readonly ResearchIdea[];
  fields: readonly ResearchField[];
  onOpen: (item: LiteratureItem) => void;
}>) {
  return (
    <article className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-3 transition hover:border-[var(--border-default)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <button
            className="text-left text-[14px] font-semibold leading-5 text-[var(--text-primary)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
            onClick={() => onOpen(item)}
            type="button"
          >
            {item.title}
          </button>
          <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
            {item.authors || "No authors yet"}
            {item.year ? ` · ${item.year}` : ""} · {literatureTypeLabels[item.type]}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Pill accent={literatureStatusMeta[item.status].accent}>
            {literatureStatusMeta[item.status].label}
          </Pill>
          <Pill accent={relevanceMeta[item.relevance].accent}>
            {relevanceMeta[item.relevance].label}
          </Pill>
        </div>
      </div>
      <div className="mt-3 grid gap-2 lg:grid-cols-2">
        <p className="text-[11px] leading-4 text-[var(--text-secondary)]">
          <span className="font-semibold text-[var(--text-primary)]">Linked:</span>{" "}
          {item.ideaTitle ?? linkedIdeaTitle(ideas, item.ideaId)} ·{" "}
          {item.fieldTitle ?? linkedFieldTitle(fields, item.fieldId)}
        </p>
        <p className="text-[11px] leading-4 text-[var(--text-secondary)]">
          <span className="font-semibold text-[var(--text-primary)]">Next:</span>{" "}
          {item.nextAction}
        </p>
      </div>
    </article>
  );
}

function QuestionRow({
  question,
  onOpen,
}: Readonly<{
  question: ResearchQuestion;
  onOpen: (question: ResearchQuestion) => void;
}>) {
  return (
    <article className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-4">
      <button
        className="text-left text-[14px] font-semibold leading-5 text-[var(--text-primary)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        onClick={() => onOpen(question)}
        type="button"
      >
        {question.question}
      </button>
      <div className="mt-3 flex flex-wrap gap-2">
        <Pill accent={questionStatusMeta[question.status].accent}>
          Status · {questionStatusMeta[question.status].label}
        </Pill>
        <Pill accent={importanceMeta[question.importance].accent}>
          Importance · {importanceMeta[question.importance].label}
        </Pill>
        <Pill quiet>{question.ideaTitle ?? "No linked idea"}</Pill>
        <Pill quiet>{question.fieldTitle ?? "No linked field"}</Pill>
      </div>
      <p className="mt-3 text-[12px] leading-5 text-[var(--text-secondary)]">
        <span className="font-semibold text-[var(--text-primary)]">Next:</span>{" "}
        {question.nextAction}
      </p>
    </article>
  );
}

function NoteRow({
  note,
  onOpen,
}: Readonly<{ note: ResearchNote; onOpen: (note: ResearchNote) => void }>) {
  return (
    <article className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <button
            className="text-left text-[14px] font-semibold leading-5 text-[var(--text-primary)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
            onClick={() => onOpen(note)}
            type="button"
          >
            {note.title}
          </button>
          <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
            {noteTypeLabels[note.type]} · {formatDate(note.updatedAt)}
          </p>
        </div>
        {note.reviewNeeded ? (
          <Pill accent={questionAccent}>Review needed</Pill>
        ) : (
          <Pill accent={successAccent}>Reviewed</Pill>
        )}
      </div>
      <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
        {note.snippet}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Pill quiet>{note.ideaTitle ?? "No linked idea"}</Pill>
        <Pill quiet>{note.literatureTitle ?? "No linked literature"}</Pill>
        <Pill quiet>{note.fieldTitle ?? "No linked field"}</Pill>
        {note.tags.map((tag) => (
          <Pill key={tag} quiet>
            #{tag}
          </Pill>
        ))}
      </div>
    </article>
  );
}

function FieldCard({
  field,
  onOpen,
}: Readonly<{ field: ResearchField; onOpen: (field: ResearchField) => void }>) {
  const hasGap =
    field.literatureCount < 2 ||
    field.openQuestionCount > 1 ||
    empty(field.nextAction);

  return (
    <article className="rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-4 transition hover:border-[var(--border-default)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">
            {field.title}
          </h3>
          <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
            {field.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Pill accent={educationAccent}>{optionLabel(field.status)}</Pill>
          {hasGap ? <Pill accent={questionAccent}>Gap visible</Pill> : null}
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Metric label="Ideas" value={field.ideaCount} />
        <Metric label="Literature" value={field.literatureCount} accent={literatureAccent} />
        <Metric label="Questions" value={field.openQuestionCount} accent={questionAccent} />
      </div>
      <p className="mt-3 text-[12px] leading-5 text-[var(--text-secondary)]">
        <span className="font-semibold text-[var(--text-primary)]">Next:</span>{" "}
        {field.nextAction}
      </p>
      <button className={cn(quietButtonClass, "mt-3")} onClick={() => onOpen(field)} type="button">
        Open field
      </button>
    </article>
  );
}

export function EducationWorkspacePage({
  pageKind,
  viewModel,
}: Readonly<{
  pageKind: EducationSubpageKind;
  viewModel: EducationWorkspaceViewModel;
}>) {
  const [ideas, setIdeas] = useState<ResearchIdea[]>(viewModel.ideas);
  const [fields, setFields] = useState<ResearchField[]>(viewModel.fields);
  const [literature, setLiterature] = useState<LiteratureItem[]>(
    viewModel.literature,
  );
  const [notes, setNotes] = useState<ResearchNote[]>(viewModel.notes);
  const [questions, setQuestions] = useState<ResearchQuestion[]>(
    viewModel.questions,
  );
  const [masterThesis, setMasterThesis] = useState<MasterThesisState>(
    viewModel.masterThesis,
  );
  const [milestones, setMilestones] = useState<MasterThesisMilestone[]>(
    viewModel.masterThesisMilestones,
  );
  const [search, setSearch] = useState("");
  const [fieldFilter, setFieldFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [thesisFilter, setThesisFilter] = useState("all");
  const [workTypeFilter, setWorkTypeFilter] = useState("all");
  const [relevanceFilter, setRelevanceFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [reviewFilter, setReviewFilter] = useState("all");
  const [gapFilter, setGapFilter] = useState("all");
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [inspector, setInspector] = useState<InspectorState>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [ideaDraft, setIdeaDraft] = useState<IdeaDraft>(() => initialIdeaDraft(viewModel.fields));
  const [literatureDraft, setLiteratureDraft] = useState<LiteratureDraft>(() =>
    initialLiteratureDraft(),
  );
  const [fieldDraft, setFieldDraft] = useState<FieldDraft>(initialFieldDraft);
  const [noteDraft, setNoteDraft] = useState<NoteDraft>(() => initialNoteDraft());
  const [questionDraft, setQuestionDraft] =
    useState<QuestionDraft>(initialQuestionDraft);
  const [thesisDraft, setThesisDraft] = useState<ThesisActionDraft>(() =>
    initialThesisDraft(viewModel.masterThesis),
  );
  const [milestoneDraft, setMilestoneDraft] =
    useState<MilestoneDraft>(initialMilestoneDraft);

  const dismissToast = useCallback(() => setToast(null), []);
  const query = normalize(search);
  const config = pages[pageKind];

  const filteredIdeas = useMemo(
    () =>
      ideas.filter(
        (idea) =>
          (fieldFilter === "all" || idea.fieldId === fieldFilter) &&
          (statusFilter === "all" || idea.status === statusFilter) &&
          (thesisFilter === "all" || idea.thesisPotential === thesisFilter) &&
          (workTypeFilter === "all" || idea.workType === workTypeFilter) &&
          matchesSearch(
            [
              idea.title,
              idea.fieldTitle,
              idea.summary,
              idea.researchQuestion ?? "",
              idea.nextAction,
              workTypeLabels[idea.workType],
            ],
            query,
          ),
      ),
    [fieldFilter, ideas, query, statusFilter, thesisFilter, workTypeFilter],
  );

  const filteredLiterature = useMemo(
    () =>
      literature.filter(
        (item) =>
          (fieldFilter === "all" || item.fieldId === fieldFilter) &&
          (statusFilter === "all" || item.status === statusFilter) &&
          (relevanceFilter === "all" || item.relevance === relevanceFilter) &&
          (typeFilter === "all" ||
            item.type === typeFilter ||
            item.ideaId === typeFilter) &&
          matchesSearch(
            [
              item.title,
              item.authors,
              item.fieldTitle ?? linkedFieldTitle(fields, item.fieldId),
              item.ideaTitle ?? linkedIdeaTitle(ideas, item.ideaId),
              item.nextAction,
              item.note ?? "",
            ],
            query,
          ),
      ),
    [
      fieldFilter,
      fields,
      ideas,
      literature,
      query,
      relevanceFilter,
      statusFilter,
      typeFilter,
    ],
  );

  const filteredQuestions = useMemo(
    () =>
      questions.filter(
        (question) =>
          (fieldFilter === "all" || question.fieldId === fieldFilter) &&
          matchesSearch(
            [
              question.question,
              question.ideaTitle ?? "",
              question.fieldTitle ?? "",
              question.nextAction,
              question.status,
              question.importance,
            ],
            query,
          ),
      ),
    [fieldFilter, query, questions],
  );

  const filteredNotes = useMemo(
    () =>
      notes.filter(
        (note) =>
          (fieldFilter === "all" || note.fieldId === fieldFilter) &&
          (typeFilter === "all" || note.type === typeFilter) &&
          (reviewFilter === "all" ||
            (reviewFilter === "needed" && note.reviewNeeded) ||
            (reviewFilter === "clear" && !note.reviewNeeded)) &&
          matchesSearch(
            [
              note.title,
              note.snippet,
              note.body,
              note.ideaTitle ?? "",
              note.literatureTitle ?? "",
              note.fieldTitle ?? "",
              note.tags.join(" "),
            ],
            query,
          ),
      ),
    [fieldFilter, notes, query, reviewFilter, typeFilter],
  );

  const filteredFields = useMemo(
    () =>
      fields.filter((field) => {
        const hasGap =
          field.literatureCount < 2 ||
          field.openQuestionCount > 1 ||
          empty(field.nextAction);
        const hasActiveIdeas = ideas.some(
          (idea) =>
            idea.fieldId === field.id &&
            ["exploring", "promising", "active"].includes(idea.status),
        );

        return (
          (fieldFilter === "all" || field.id === fieldFilter) &&
          (statusFilter === "all" || field.status === statusFilter) &&
          (gapFilter === "all" ||
            (gapFilter === "gaps" && hasGap) ||
            (gapFilter === "active" && hasActiveIdeas)) &&
          matchesSearch([field.title, field.description, field.nextAction], query)
        );
      }),
    [fieldFilter, fields, gapFilter, ideas, query, statusFilter],
  );

  const promisingIdeas = filteredIdeas
    .filter(
      (idea) =>
        idea.thesisPotential === "high" ||
        ["promising", "active"].includes(idea.status),
    )
    .slice(0, 5);
  const openIdeaQuestions = filteredQuestions.filter((question) =>
    ["open", "investigating"].includes(question.status),
  );
  const ideaEvidence = [
    ...filteredLiterature.slice(0, 4).map((item) => ({
      id: item.id,
      title: item.title,
      meta: `${literatureStatusMeta[item.status].label} · ${item.ideaTitle ?? linkedIdeaTitle(ideas, item.ideaId)}`,
    })),
    ...filteredNotes.slice(0, 3).map((note) => ({
      id: note.id,
      title: note.title,
      meta: `${noteTypeLabels[note.type]} · ${note.ideaTitle ?? "No linked idea"}`,
    })),
  ];
  const extractionFocus = literature.filter((item) => item.status === "extracting");
  const highRelevanceSources = filteredLiterature.filter(
    (item) => item.relevance === "high",
  );
  const activeFields = filteredFields.filter((field) =>
    ["active", "watching"].includes(field.status),
  );
  const fieldGaps = filteredFields.filter(
    (field) =>
      field.literatureCount < 2 ||
      field.openQuestionCount > 1 ||
      empty(field.nextAction),
  );
  const reviewNeededNotes = filteredNotes.filter((note) => note.reviewNeeded);
  const noteTypeCounts = noteTypes.map((type) => ({
    type,
    count: notes.filter((note) => note.type === type).length,
  }));
  const scientificWorkItems = filteredIdeas
    .filter((idea) => idea.workType !== "other")
    .slice(0, 6);
  const recentResearchNotes = filteredNotes
    .slice()
    .sort(
      (first, second) =>
        new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime(),
    )
    .slice(0, 5);
  const thesisLiterature = literature.filter(
    (item) => item.ideaId === masterThesis.linkedIdeaId,
  );
  const thesisNotes = notes.filter((note) => note.ideaId === masterThesis.linkedIdeaId);
  const selectedIdea = inspector?.type === "idea" ? findIdea(ideas, inspector.id) : null;
  const selectedLiterature =
    inspector?.type === "literature" ? findLiterature(literature, inspector.id) : null;
  const selectedField =
    inspector?.type === "field" ? findField(fields, inspector.id) : null;
  const selectedNote =
    inspector?.type === "note" ? notes.find((note) => note.id === inspector.id) ?? null : null;
  const selectedQuestion =
    inspector?.type === "question"
      ? questions.find((question) => question.id === inspector.id) ?? null
      : null;

  function openDialog(kind: DialogKind, context: LinkContext = {}) {
    setInspector(null);
    setDialogError(null);

    if (kind === "idea") {
      setIdeaDraft(initialIdeaDraft(fields, context.fieldId));
    }

    if (kind === "literature") {
      setLiteratureDraft(initialLiteratureDraft(context));
    }

    if (kind === "field") {
      setFieldDraft(initialFieldDraft());
    }

    if (kind === "note") {
      setNoteDraft(initialNoteDraft(context));
    }

    if (kind === "question") {
      setQuestionDraft(initialQuestionDraft(context));
    }

    if (kind === "thesis-action") {
      setThesisDraft(initialThesisDraft(masterThesis));
    }

    if (kind === "milestone") {
      setMilestoneDraft(initialMilestoneDraft());
    }

    setDialog(kind);
  }

  function closeDialog() {
    setDialog(null);
    setDialogError(null);
  }

  function runPrimaryAction() {
    if (pageKind === "scientific-work" || pageKind === "research-ideas") {
      openDialog("idea");
    } else if (pageKind === "literature") {
      openDialog("literature");
    } else if (pageKind === "research-fields") {
      openDialog("field");
    } else if (pageKind === "research-notes") {
      openDialog("note");
    } else {
      openDialog("thesis-action");
    }
  }

  function runSecondaryAction(label: string) {
    if (label.includes("question")) {
      openDialog("question");
    } else if (label.includes("note")) {
      openDialog("note", {
        ideaId: pageKind === "master-thesis" ? masterThesis.linkedIdeaId : undefined,
        fieldId: pageKind === "master-thesis" ? masterThesis.linkedFieldId : undefined,
      });
    } else if (label.includes("source") || label.includes("literature")) {
      openDialog("literature", {
        ideaId: pageKind === "master-thesis" ? masterThesis.linkedIdeaId : undefined,
        fieldId: pageKind === "master-thesis" ? masterThesis.linkedFieldId : undefined,
      });
    } else if (label.includes("milestone")) {
      openDialog("milestone");
    } else if (label.includes("idea")) {
      openDialog("idea");
    } else {
      setToast({
        title: `${label} is local`,
        body: "This action is prepared as a local MVP control.",
        tone: "info",
      });
    }
  }

  function submitIdea() {
    if (empty(ideaDraft.title) || empty(ideaDraft.fieldId) || empty(ideaDraft.nextAction)) {
      setDialogError("Complete Title, Field and Next Action before saving.");
      return;
    }

    const field = findField(fields, ideaDraft.fieldId);
    const idea: ResearchIdea = {
      id: createId("idea-local"),
      title: ideaDraft.title.trim(),
      status: ideaDraft.status,
      workType: ideaDraft.workType,
      fieldId: ideaDraft.fieldId,
      fieldTitle: field?.title ?? "Research Field",
      thesisPotential: ideaDraft.thesisPotential,
      summary: ideaDraft.summary.trim() || "New local academic idea without summary yet.",
      researchQuestion: ideaDraft.researchQuestion.trim() || undefined,
      nextAction: ideaDraft.nextAction.trim(),
      sourceCount: 0,
      noteCount: 0,
      openQuestionCount: 0,
      updatedAt: new Date().toISOString(),
    };

    setIdeas((current) => [idea, ...current]);
    setToast({
      title: "Research idea added locally",
      body: "The idea exists only in this page state.",
      tone: "success",
    });
    closeDialog();
  }

  function submitLiterature() {
    if (empty(literatureDraft.title)) {
      setDialogError("Title is required before saving literature.");
      return;
    }

    const idea = findIdea(ideas, literatureDraft.ideaId);
    const field = findField(fields, literatureDraft.fieldId);
    const parsedYear = Number.parseInt(literatureDraft.year, 10);
    const item: LiteratureItem = {
      id: createId("literature-local"),
      title: literatureDraft.title.trim(),
      authors: literatureDraft.authors.trim(),
      year: Number.isNaN(parsedYear) ? undefined : parsedYear,
      type: literatureDraft.type,
      status: literatureDraft.status,
      fieldId: literatureDraft.fieldId || undefined,
      fieldTitle: field?.title,
      ideaId: literatureDraft.ideaId || undefined,
      ideaTitle: idea?.title,
      relevance: literatureDraft.relevance,
      citationKey: literatureDraft.citationKey.trim() || undefined,
      note: literatureDraft.note.trim() || undefined,
      nextAction: literatureDraft.nextAction.trim() || "Clarify reading purpose",
      updatedAt: new Date().toISOString(),
    };

    setLiterature((current) => [item, ...current]);
    setToast({
      title: "Literature item added locally",
      body: "No external literature lookup or citation API was used.",
      tone: "success",
    });
    closeDialog();
  }

  function submitField() {
    if (empty(fieldDraft.title) || empty(fieldDraft.description)) {
      setDialogError("Title and Description are required before saving a field.");
      return;
    }

    const field: ResearchField = {
      id: createId("field-local"),
      title: fieldDraft.title.trim(),
      description: fieldDraft.description.trim(),
      status: fieldDraft.status,
      ideaCount: 0,
      literatureCount: 0,
      openQuestionCount: 0,
      nextAction: fieldDraft.nextAction.trim() || "Define next field step",
    };

    setFields((current) => [field, ...current]);
    setToast({
      title: "Research field added locally",
      body: "The field is available only in local page state.",
      tone: "success",
    });
    closeDialog();
  }

  function submitNote() {
    if (empty(noteDraft.title) || empty(noteDraft.body)) {
      setDialogError("Title and Note are required before saving.");
      return;
    }

    const idea = findIdea(ideas, noteDraft.ideaId);
    const field = findField(fields, noteDraft.fieldId);
    const source = findLiterature(literature, noteDraft.literatureId);
    const tags = noteDraft.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const note: ResearchNote = {
      id: createId("note-local"),
      title: noteDraft.title.trim(),
      type: noteDraft.type,
      ideaId: noteDraft.ideaId || undefined,
      ideaTitle: idea?.title,
      literatureId: noteDraft.literatureId || undefined,
      literatureTitle: source?.title,
      fieldId: noteDraft.fieldId || undefined,
      fieldTitle: field?.title,
      snippet: noteDraft.body.trim().slice(0, 160),
      body: noteDraft.body.trim(),
      tags,
      source: source ? "literature" : "manual",
      reviewNeeded: noteDraft.reviewNeeded,
      updatedAt: new Date().toISOString(),
    };

    setNotes((current) => [note, ...current]);
    setToast({
      title: "Research note captured locally",
      body: "No AI summary or external processing was used.",
      tone: "success",
    });
    closeDialog();
  }

  function submitQuestion() {
    if (empty(questionDraft.question)) {
      setDialogError("Question is required before saving.");
      return;
    }

    const idea = findIdea(ideas, questionDraft.ideaId);
    const field = findField(fields, questionDraft.fieldId);
    const question: ResearchQuestion = {
      id: createId("question-local"),
      question: questionDraft.question.trim(),
      ideaId: questionDraft.ideaId || undefined,
      ideaTitle: idea?.title,
      fieldId: questionDraft.fieldId || undefined,
      fieldTitle: field?.title,
      status: questionDraft.status,
      importance: questionDraft.importance,
      nextAction: questionDraft.nextAction.trim() || "Define next research step",
      updatedAt: new Date().toISOString(),
    };

    setQuestions((current) => [question, ...current]);
    setToast({
      title: "Research question added locally",
      body: "The question is linked only in local page state.",
      tone: "success",
    });
    closeDialog();
  }

  function submitThesisAction() {
    if (empty(thesisDraft.nextAction)) {
      setDialogError("Next Action is required before updating thesis control.");
      return;
    }

    setMasterThesis((current) => ({
      ...current,
      currentPhase: thesisDraft.phase,
      nextAction: thesisDraft.nextAction.trim(),
      openRisk: thesisDraft.riskNote.trim() || undefined,
    }));
    setToast({
      title: "Thesis next action updated locally",
      body: "The thesis control state is not persisted.",
      tone: "success",
    });
    closeDialog();
  }

  function submitMilestone() {
    if (empty(milestoneDraft.title) || empty(milestoneDraft.nextAction)) {
      setDialogError("Title and Next Action are required before saving a milestone.");
      return;
    }

    const milestone: MasterThesisMilestone = {
      id: createId("thesis-milestone-local"),
      title: milestoneDraft.title.trim(),
      status: milestoneDraft.status,
      dueLabel: milestoneDraft.dueLabel.trim() || undefined,
      progress: Math.max(0, Math.min(100, Number.parseInt(milestoneDraft.progress, 10) || 0)),
      nextAction: milestoneDraft.nextAction.trim(),
    };

    setMilestones((current) => [milestone, ...current]);
    setMasterThesis((current) => ({
      ...current,
      milestoneCount: current.milestoneCount + 1,
    }));
    setToast({
      title: "Milestone added locally",
      body: "The milestone exists only in this mock state.",
      tone: "success",
    });
    closeDialog();
  }

  function markLiteratureReviewed(item: LiteratureItem) {
    setLiterature((current) =>
      current.map((entry) =>
        entry.id === item.id
          ? { ...entry, status: "reviewed", updatedAt: new Date().toISOString() }
          : entry,
      ),
    );
    setToast({
      title: "Literature marked reviewed",
      body: "The status change is local to this page.",
      tone: "success",
    });
  }

  function markNoteReviewed(note: ResearchNote) {
    setNotes((current) =>
      current.map((entry) =>
        entry.id === note.id
          ? { ...entry, reviewNeeded: false, updatedAt: new Date().toISOString() }
          : entry,
      ),
    );
    setToast({
      title: "Research note marked reviewed",
      body: "No automatic quality judgement was made.",
      tone: "success",
    });
  }

  function updateQuestionStatus(
    question: ResearchQuestion,
    status: ResearchQuestion["status"],
  ) {
    setQuestions((current) =>
      current.map((entry) =>
        entry.id === question.id
          ? { ...entry, status, updatedAt: new Date().toISOString() }
          : entry,
      ),
    );
    setToast({
      title: "Question status updated",
      body: `Status changed to ${questionStatusMeta[status].label} locally.`,
      tone: "success",
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-[2208px] flex-col gap-4 pb-8">
      <EducationSubpageHeader
        config={config}
        onPrimaryAction={runPrimaryAction}
        onSecondaryAction={runSecondaryAction}
        pageKind={pageKind}
      />

      <SearchAndFilters
        fieldFilter={fieldFilter}
        fields={fields}
        gapFilter={gapFilter}
        ideas={ideas}
        onField={setFieldFilter}
        onGap={setGapFilter}
        onRelevance={setRelevanceFilter}
        onReview={setReviewFilter}
        onSearch={setSearch}
        onStatus={setStatusFilter}
        onThesis={setThesisFilter}
        onType={setTypeFilter}
        onWorkType={setWorkTypeFilter}
        pageKind={pageKind}
        relevanceFilter={relevanceFilter}
        reviewFilter={reviewFilter}
        search={search}
        statusFilter={statusFilter}
        thesisFilter={thesisFilter}
        typeFilter={typeFilter}
        workTypeFilter={workTypeFilter}
      />

      {pageKind === "scientific-work" ? (
        <>
          <Panel
            badge={<Pill accent={ideaAccent}>{optionLabel(masterThesis.currentPhase)}</Pill>}
            className="border-[rgba(91,124,250,.30)]"
            subtitle="Thesis direction, evidence and next action stay inside the academic workbench."
            title="Master Thesis Focus"
          >
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="min-w-0 space-y-4">
                <div>
                  <h3 className="text-[22px] font-semibold leading-7 text-[var(--text-primary)]">
                    {masterThesis.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {masterThesis.researchQuestion ?? "Research question is not set yet."}
                  </p>
                </div>
                <div className="rounded-[16px] border border-[rgba(217,146,79,.26)] bg-[rgba(217,146,79,.07)] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-orange)]">
                    Next Action
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">
                    {masterThesis.nextAction}
                  </p>
                </div>
                {masterThesis.openRisk ? (
                  <div className="rounded-[16px] border border-[rgba(221,107,95,.28)] bg-[rgba(221,107,95,.07)] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-red)]">
                      Open Risk
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">
                      {masterThesis.openRisk}
                    </p>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <button
                    className={primaryButtonClass}
                    onClick={() => openDialog("thesis-action")}
                    type="button"
                  >
                    Update next action
                  </button>
                  <button
                    className={secondaryButtonClass}
                    onClick={() =>
                      openDialog("note", {
                        ideaId: masterThesis.linkedIdeaId,
                        fieldId: masterThesis.linkedFieldId,
                      })
                    }
                    type="button"
                  >
                    Capture thesis note
                  </button>
                  <button
                    className={secondaryButtonClass}
                    onClick={() => setInspector({ type: "thesis" })}
                    type="button"
                  >
                    Open focus
                  </button>
                </div>
              </div>
              <div className="rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    Progress
                  </p>
                  <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                    {masterThesis.progress}%
                  </span>
                </div>
                <div className="mt-3">
                  <ProgressBar value={masterThesis.progress} />
                </div>
                <div className="mt-4 grid gap-2">
                  <Metric
                    accent={literatureAccent}
                    label="Sources"
                    value={masterThesis.sourceCount}
                  />
                  <Metric label="Notes" value={masterThesis.noteCount} />
                  <Metric
                    accent={ideaAccent}
                    label="Milestones"
                    value={milestones.length}
                  />
                </div>
              </div>
            </div>
          </Panel>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel
              badge={<Pill accent={ideaAccent}>{promisingIdeas.length}</Pill>}
              subtitle="Promising and active academic ideas with thesis potential."
              title="Research Ideas"
            >
              {promisingIdeas.length === 0 ? (
                <EmptyState
                  actionLabel="Add research idea"
                  description="No high-potential idea matches the current filters."
                  onAction={() => openDialog("idea")}
                  title="No promising ideas visible"
                />
              ) : (
                <div className="grid gap-3">
                  {promisingIdeas.slice(0, 4).map((idea) => (
                    <IdeaCard
                      idea={idea}
                      key={idea.id}
                      onOpen={(item) => setInspector({ type: "idea", id: item.id })}
                    />
                  ))}
                </div>
              )}
            </Panel>
            <Panel
              badge={<Pill accent={questionAccent}>{openIdeaQuestions.length}</Pill>}
              subtitle="Open questions that shape the next scientific work decision."
              title="Research Questions"
            >
              {openIdeaQuestions.length === 0 ? (
                <EmptyState
                  actionLabel="Capture question"
                  description="No open question matches the current filters."
                  onAction={() => openDialog("question")}
                  title="No open questions"
                />
              ) : (
                <div className="grid gap-3">
                  {openIdeaQuestions.slice(0, 5).map((question) => (
                    <QuestionRow
                      key={question.id}
                      onOpen={(item) =>
                        setInspector({ type: "question", id: item.id })
                      }
                      question={question}
                    />
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel
              badge={<Pill>{activeFields.length} active</Pill>}
              subtitle="Fields and topic clusters that hold the academic work context."
              title="Research Fields"
            >
              {activeFields.length === 0 ? (
                <EmptyState
                  actionLabel="Add field"
                  description="No active field matches the current filters."
                  onAction={() => openDialog("field")}
                  title="No active fields found"
                />
              ) : (
                <div className="grid gap-3">
                  {activeFields.slice(0, 4).map((field) => (
                    <FieldCard
                      field={field}
                      key={field.id}
                      onOpen={(item) => setInspector({ type: "field", id: item.id })}
                    />
                  ))}
                </div>
              )}
            </Panel>
            <Panel
              badge={<Pill accent={literatureAccent}>{scientificWorkItems.length}</Pill>}
              subtitle="Hausarbeiten, papers, presentations and research projects in progress."
              title="Scientific Work / Papers"
            >
              {scientificWorkItems.length === 0 ? (
                <EmptyState
                  actionLabel="Add research idea"
                  description="No academic work item matches the current filters."
                  onAction={() => openDialog("idea")}
                  title="No scientific work items"
                />
              ) : (
                <div className="grid gap-2">
                  {scientificWorkItems.map((idea) => (
                    <LinkedMiniItem
                      key={idea.id}
                      meta={`${workTypeLabels[idea.workType]} · ${idea.fieldTitle} · ${idea.nextAction}`}
                      title={idea.title}
                    />
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <Panel
            badge={<Pill>{recentResearchNotes.length} recent</Pill>}
            subtitle="Recent notes and thinking traces without making notes a separate sidebar page."
            title="Recent Research Notes"
          >
            {recentResearchNotes.length === 0 ? (
              <EmptyState
                actionLabel="Capture research note"
                description="No research note matches the current filters."
                onAction={() => openDialog("note")}
                title="No recent research notes"
              />
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {recentResearchNotes.map((note) => (
                  <NoteRow
                    key={note.id}
                    note={note}
                    onOpen={(item) => setInspector({ type: "note", id: item.id })}
                  />
                ))}
              </div>
            )}
          </Panel>
        </>
      ) : null}

      {pageKind === "research-ideas" ? (
        <>
          <Panel
            badge={<Pill accent={ideaAccent}>{promisingIdeas.length} ideas</Pill>}
            subtitle="High-potential ideas that need a concrete academic decision."
            title="Promising Ideas"
          >
            {promisingIdeas.length === 0 ? (
              <EmptyState
                actionLabel="Add research idea"
                description="Create a local idea with thesis potential to start this decision surface."
                onAction={() => openDialog("idea")}
                title="No promising ideas match the filters"
              />
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {promisingIdeas.map((idea) => (
                  <IdeaCard
                    idea={idea}
                    key={idea.id}
                    onOpen={(item) => setInspector({ type: "idea", id: item.id })}
                  />
                ))}
              </div>
            )}
          </Panel>
          <Panel
            badge={<Pill>{filteredIdeas.length} total</Pill>}
            subtitle="Pipeline by status, work type, field, potential, evidence and next action."
            title="Idea Pipeline"
          >
            {filteredIdeas.length === 0 ? (
              <EmptyState
                actionLabel="Add research idea"
                description="No idea matches the current filters. Add one locally or broaden the filters."
                onAction={() => openDialog("idea")}
                title="No research ideas found"
              />
            ) : (
              <div className="grid gap-3">
                {filteredIdeas.map((idea) => (
                  <IdeaCard
                    idea={idea}
                    key={idea.id}
                    onOpen={(item) => setInspector({ type: "idea", id: item.id })}
                  />
                ))}
              </div>
            )}
          </Panel>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
            <Panel
              badge={<Pill accent={questionAccent}>{openIdeaQuestions.length}</Pill>}
              subtitle="Open questions that sharpen or block ideas."
              title="Open Idea Questions"
            >
              {openIdeaQuestions.length === 0 ? (
                <EmptyState
                  actionLabel="Capture question"
                  description="No open idea question matches the filters."
                  onAction={() => openDialog("question")}
                  title="No open idea questions"
                />
              ) : (
                <div className="grid gap-3">
                  {openIdeaQuestions.map((question) => (
                    <QuestionRow
                      key={question.id}
                      onOpen={(item) =>
                        setInspector({ type: "question", id: item.id })
                      }
                      question={question}
                    />
                  ))}
                </div>
              )}
            </Panel>
            <Panel subtitle="Linked sources and notes without duplicating the literature database." title="Idea Evidence">
              {ideaEvidence.length === 0 ? (
                <EmptyState
                  description="Add sources or notes to create an evidence trail for ideas."
                  title="No idea evidence visible"
                />
              ) : (
                <div className="grid gap-2">
                  {ideaEvidence.map((item) => (
                    <LinkedMiniItem key={item.id} meta={item.meta} title={item.title} />
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </>
      ) : null}

      {pageKind === "literature" ? (
        <>
          <Panel
            badge={<Pill accent={literatureAccent}>{filteredLiterature.length} sources</Pill>}
            subtitle="Reading status and extraction queue. Mock sources are UI examples, not verified citations."
            title="Literature Queue"
          >
            {filteredLiterature.length === 0 ? (
              <EmptyState
                actionLabel="Add literature"
                description="No source matches the current filters. Add one locally or broaden the filters."
                onAction={() => openDialog("literature")}
                title="No literature found"
              />
            ) : (
              <div className="space-y-4">
                {literatureStatuses.map((status) => {
                  const items = filteredLiterature.filter((item) => item.status === status);

                  if (items.length === 0) {
                    return null;
                  }

                  return (
                    <div key={status}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                          {literatureStatusMeta[status].label}
                        </h3>
                        <Pill accent={literatureStatusMeta[status].accent} quiet>
                          {items.length}
                        </Pill>
                      </div>
                      <div className="grid gap-2">
                        {items.map((item) => (
                          <LiteratureRow
                            fields={fields}
                            ideas={ideas}
                            item={item}
                            key={item.id}
                            onOpen={(source) =>
                              setInspector({ type: "literature", id: source.id })
                            }
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
          <div className="grid gap-4 xl:grid-cols-3">
            <Panel
              badge={<Pill accent={ideaAccent}>{extractionFocus.length}</Pill>}
              subtitle="Sources where evidence extraction is currently the next work."
              title="Extraction Focus"
            >
              {extractionFocus.length === 0 ? (
                <EmptyState
                  description="Move a source to Extracting when notes or arguments need to be pulled out."
                  title="No source is extracting"
                />
              ) : (
                <div className="grid gap-2">
                  {extractionFocus.map((item) => (
                    <LinkedMiniItem
                      key={item.id}
                      meta={`${item.ideaTitle ?? linkedIdeaTitle(ideas, item.ideaId)} · ${item.nextAction}`}
                      title={item.title}
                    />
                  ))}
                </div>
              )}
            </Panel>
            <Panel
              badge={<Pill accent={literatureAccent}>{highRelevanceSources.length}</Pill>}
              subtitle="High relevance sources for reading and review priority."
              title="High Relevance Sources"
            >
              <div className="grid gap-2">
                {highRelevanceSources.slice(0, 5).map((item) => (
                  <LinkedMiniItem
                    key={item.id}
                    meta={`${literatureStatusMeta[item.status].label} · ${item.nextAction}`}
                    title={item.title}
                  />
                ))}
              </div>
            </Panel>
            <Panel subtitle="Small reading-state signals, not analytics." title="Literature Status Summary">
              <div className="grid gap-2">
                {literatureStatuses.map((status) => (
                  <Metric
                    accent={literatureStatusMeta[status].accent}
                    key={status}
                    label={literatureStatusMeta[status].label}
                    value={literature.filter((item) => item.status === status).length}
                  />
                ))}
              </div>
            </Panel>
          </div>
        </>
      ) : null}

      {pageKind === "research-fields" ? (
        <>
          <Panel
            badge={<Pill>{activeFields.length} active</Pill>}
            subtitle="Fields with current academic relevance."
            title="Active Fields"
          >
            {activeFields.length === 0 ? (
              <EmptyState
                actionLabel="Add field"
                description="No active field matches the current filters."
                onAction={() => openDialog("field")}
                title="No active fields found"
              />
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {activeFields.map((field) => (
                  <FieldCard
                    field={field}
                    key={field.id}
                    onOpen={(item) => setInspector({ type: "field", id: item.id })}
                  />
                ))}
              </div>
            )}
          </Panel>
          <Panel
            badge={<Pill>{filteredFields.length} fields</Pill>}
            subtitle="Deterministic cluster cards. No D3, canvas or graph map."
            title="Field Map"
          >
            {filteredFields.length === 0 ? (
              <EmptyState
                actionLabel="Add field"
                description="No field matches the current filters."
                onAction={() => openDialog("field")}
                title="No research fields found"
              />
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {filteredFields.map((field) => (
                  <FieldCard
                    field={field}
                    key={field.id}
                    onOpen={(item) => setInspector({ type: "field", id: item.id })}
                  />
                ))}
              </div>
            )}
          </Panel>
          <Panel
            badge={<Pill accent={questionAccent}>{fieldGaps.length} gaps</Pill>}
            subtitle="Fields with too little evidence, many open questions, or unclear next action."
            title="Field Gaps"
          >
            {fieldGaps.length === 0 ? (
              <EmptyState
                description="No obvious field gaps are visible in the current mock state."
                title="No field gaps"
              />
            ) : (
              <div className="grid gap-2">
                {fieldGaps.map((field) => (
                  <LinkedMiniItem
                    key={field.id}
                    meta={`${field.literatureCount} sources · ${field.openQuestionCount} open questions · ${field.nextAction}`}
                    title={field.title}
                  />
                ))}
              </div>
            )}
          </Panel>
        </>
      ) : null}

      {pageKind === "research-notes" ? (
        <>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
            <Panel
              badge={<Pill accent={questionAccent}>{openIdeaQuestions.length}</Pill>}
              subtitle="Open and investigating research questions with next actions."
              title="Open Questions"
            >
              {openIdeaQuestions.length === 0 ? (
                <EmptyState
                  actionLabel="Add question"
                  description="No open question matches the current filters."
                  onAction={() => openDialog("question")}
                  title="No open questions"
                />
              ) : (
                <div className="grid gap-3">
                  {openIdeaQuestions.map((question) => (
                    <QuestionRow
                      key={question.id}
                      onOpen={(item) =>
                        setInspector({ type: "question", id: item.id })
                      }
                      question={question}
                    />
                  ))}
                </div>
              )}
            </Panel>
            <Panel
              badge={<Pill accent={questionAccent}>{reviewNeededNotes.length}</Pill>}
              subtitle="Notes that need manual review before they become evidence."
              title="Review Needed"
            >
              {reviewNeededNotes.length === 0 ? (
                <EmptyState
                  description="No note currently needs review."
                  title="Review queue clear"
                />
              ) : (
                <div className="grid gap-2">
                  {reviewNeededNotes.map((note) => (
                    <LinkedMiniItem
                      key={note.id}
                      meta={`${noteTypeLabels[note.type]} · ${note.ideaTitle ?? "No linked idea"}`}
                      title={note.title}
                    />
                  ))}
                </div>
              )}
            </Panel>
          </div>
          <Panel
            badge={<Pill>{filteredNotes.length} notes</Pill>}
            subtitle="Recent academic notes, questions and source-linked thinking."
            title="Research Note Stream"
          >
            {filteredNotes.length === 0 ? (
              <EmptyState
                actionLabel="Capture research note"
                description="No research note matches the current filters."
                onAction={() => openDialog("note")}
                title="No research notes found"
              />
            ) : (
              <div className="grid gap-3">
                {filteredNotes.map((note) => (
                  <NoteRow
                    key={note.id}
                    note={note}
                    onOpen={(item) => setInspector({ type: "note", id: item.id })}
                  />
                ))}
              </div>
            )}
          </Panel>
          <Panel subtitle="Count by note type. This is a light inventory, not analytics." title="Note Types">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {noteTypeCounts.map((item) => (
                <Metric
                  key={item.type}
                  label={noteTypeLabels[item.type]}
                  value={item.count}
                />
              ))}
            </div>
          </Panel>
        </>
      ) : null}

      {pageKind === "master-thesis" ? (
        <>
          <Panel
            badge={<Pill accent={ideaAccent}>{optionLabel(masterThesis.currentPhase)}</Pill>}
            className="border-[rgba(91,124,250,.30)]"
            subtitle="Primary thesis control surface for question, phase, evidence and next step."
            title="Thesis Control"
          >
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="min-w-0 space-y-4">
                <div>
                  <h3 className="text-[22px] font-semibold leading-7 text-[var(--text-primary)]">
                    {masterThesis.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {masterThesis.researchQuestion ?? "Research question is not set yet."}
                  </p>
                </div>
                <div className="rounded-[16px] border border-[rgba(217,146,79,.26)] bg-[rgba(217,146,79,.07)] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-orange)]">
                    Next Action
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">
                    {masterThesis.nextAction}
                  </p>
                </div>
                {masterThesis.openRisk ? (
                  <div className="rounded-[16px] border border-[rgba(221,107,95,.28)] bg-[rgba(221,107,95,.07)] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-red)]">
                      Open Risk
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">
                      {masterThesis.openRisk}
                    </p>
                  </div>
                ) : null}
              </div>
              <div className="rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    Progress
                  </p>
                  <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                    {masterThesis.progress}%
                  </span>
                </div>
                <div className="mt-3">
                  <ProgressBar value={masterThesis.progress} />
                </div>
                <div className="mt-4 grid gap-2">
                  <Metric label="Sources" value={masterThesis.sourceCount} accent={literatureAccent} />
                  <Metric label="Notes" value={masterThesis.noteCount} />
                  <Metric label="Milestones" value={milestones.length} accent={ideaAccent} />
                </div>
                <div className="mt-4 grid gap-2">
                  <button className={primaryButtonClass} onClick={() => setInspector({ type: "thesis" })} type="button">
                    Open focus
                  </button>
                  <button
                    className={secondaryButtonClass}
                    onClick={() =>
                      openDialog("note", {
                        ideaId: masterThesis.linkedIdeaId,
                        fieldId: masterThesis.linkedFieldId,
                      })
                    }
                    type="button"
                  >
                    Capture thesis note
                  </button>
                </div>
              </div>
            </div>
          </Panel>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
            <Panel badge={<Pill>{milestones.length}</Pill>} subtitle="Compact timeline without Gantt complexity." title="Milestones">
              <div className="grid gap-3">
                {milestones.map((milestone) => (
                  <article
                    className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-4"
                    key={milestone.id}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">
                          {milestone.title}
                        </h3>
                        <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                          {milestone.dueLabel ?? "No due label"}
                        </p>
                      </div>
                      <Pill accent={milestoneStatusMeta[milestone.status].accent}>
                        {milestoneStatusMeta[milestone.status].label}
                      </Pill>
                    </div>
                    <div className="mt-3">
                      <ProgressBar value={milestone.progress} />
                    </div>
                    <p className="mt-3 text-[12px] leading-5 text-[var(--text-secondary)]">
                      <span className="font-semibold text-[var(--text-primary)]">Next:</span>{" "}
                      {milestone.nextAction}
                    </p>
                  </article>
                ))}
              </div>
            </Panel>
            <Panel subtitle="Open risks and decisions without shame language." title="Risks & Decisions">
              <div className="grid gap-2">
                <LinkedMiniItem
                  meta="Risk · Next action needed"
                  title={masterThesis.openRisk ?? "No current risk"}
                />
                <LinkedMiniItem
                  meta="Decision · Scope"
                  title="Thema auf Review-Pflicht und persönliche Produktivitätssysteme eingrenzen"
                />
                <LinkedMiniItem
                  meta="Decision · Evidence"
                  title="Mock-Literatur bleibt UI-Beispiel bis echte Sources angelegt werden"
                />
              </div>
            </Panel>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <Panel
              badge={<Pill accent={literatureAccent}>{thesisLiterature.length}</Pill>}
              subtitle="Only thesis-relevant sources with status and next action."
              title="Thesis Literature"
            >
              <div className="grid gap-2">
                {thesisLiterature.map((item) => (
                  <LiteratureRow
                    fields={fields}
                    ideas={ideas}
                    item={item}
                    key={item.id}
                    onOpen={(source) =>
                      setInspector({ type: "literature", id: source.id })
                    }
                  />
                ))}
              </div>
            </Panel>
            <Panel
              badge={<Pill>{thesisNotes.length}</Pill>}
              subtitle="Thesis notes as evidence and thinking traces."
              title="Thesis Notes"
            >
              <div className="grid gap-3">
                {thesisNotes.map((note) => (
                  <NoteRow
                    key={note.id}
                    note={note}
                    onOpen={(item) => setInspector({ type: "note", id: item.id })}
                  />
                ))}
              </div>
            </Panel>
          </div>
        </>
      ) : null}

      {dialog ? (
        <DialogShell
          labelledBy="education-dialog-heading"
          onClose={closeDialog}
          open
        >
          <EducationFormDialog
            dialog={dialog}
            dialogError={dialogError}
            fieldDraft={fieldDraft}
            fields={fields}
            ideaDraft={ideaDraft}
            ideas={ideas}
            literature={literature}
            literatureDraft={literatureDraft}
            milestoneDraft={milestoneDraft}
            noteDraft={noteDraft}
            onClose={closeDialog}
            onFieldDraft={setFieldDraft}
            onIdeaDraft={setIdeaDraft}
            onLiteratureDraft={setLiteratureDraft}
            onMilestoneDraft={setMilestoneDraft}
            onNoteDraft={setNoteDraft}
            onQuestionDraft={setQuestionDraft}
            onSubmitField={submitField}
            onSubmitIdea={submitIdea}
            onSubmitLiterature={submitLiterature}
            onSubmitMilestone={submitMilestone}
            onSubmitNote={submitNote}
            onSubmitQuestion={submitQuestion}
            onSubmitThesisAction={submitThesisAction}
            onThesisDraft={setThesisDraft}
            questionDraft={questionDraft}
            thesisDraft={thesisDraft}
          />
        </DialogShell>
      ) : null}

      <EducationInspector
        fields={fields}
        ideas={ideas}
        inspector={inspector}
        literature={literature}
        markLiteratureReviewed={markLiteratureReviewed}
        markNoteReviewed={markNoteReviewed}
        masterThesis={masterThesis}
        notes={notes}
        onAddNote={(context) => openDialog("note", context)}
        onAddQuestion={(context) => openDialog("question", context)}
        onAddSource={(context) => openDialog("literature", context)}
        onClose={() => setInspector(null)}
        onSetThesisFocus={(idea) => {
          setMasterThesis((current) => ({
            ...current,
            linkedIdeaId: idea.id,
            linkedFieldId: idea.fieldId,
          }));
          setToast({
            title: "Thesis focus updated locally",
            body: `${idea.title} is now linked to thesis control.`,
            tone: "info",
          });
          setInspector(null);
        }}
        questions={questions}
        selectedField={selectedField}
        selectedIdea={selectedIdea}
        selectedLiterature={selectedLiterature}
        selectedNote={selectedNote}
        selectedQuestion={selectedQuestion}
        updateQuestionStatus={updateQuestionStatus}
      />
      <Toast onDismiss={dismissToast} toast={toast} />
    </div>
  );
}

function initialIdeaDraft(
  fields: readonly ResearchField[],
  fieldId?: string,
): IdeaDraft {
  return {
    title: "",
    workType: "research_project",
    fieldId: fieldId ?? fields[0]?.id ?? "",
    status: "idea",
    thesisPotential: "unknown",
    summary: "",
    researchQuestion: "",
    nextAction: "",
  };
}

function initialLiteratureDraft(context: LinkContext = {}): LiteratureDraft {
  return {
    title: "",
    authors: "",
    year: "",
    type: "paper",
    status: "to_read",
    relevance: "medium",
    ideaId: context.ideaId ?? "",
    fieldId: context.fieldId ?? "",
    citationKey: "",
    nextAction: "",
    note: "",
  };
}

function initialFieldDraft(): FieldDraft {
  return {
    title: "",
    description: "",
    status: "watching",
    nextAction: "",
  };
}

function initialNoteDraft(context: LinkContext = {}): NoteDraft {
  return {
    title: "",
    type: "summary",
    ideaId: context.ideaId ?? "",
    literatureId: context.literatureId ?? "",
    fieldId: context.fieldId ?? "",
    body: "",
    tags: "",
    reviewNeeded: true,
  };
}

function initialQuestionDraft(context: LinkContext = {}): QuestionDraft {
  return {
    question: "",
    ideaId: context.ideaId ?? "",
    fieldId: context.fieldId ?? "",
    importance: "medium",
    status: "open",
    nextAction: "",
  };
}

function initialThesisDraft(thesis: MasterThesisState): ThesisActionDraft {
  return {
    nextAction: thesis.nextAction,
    phase: thesis.currentPhase,
    riskNote: thesis.openRisk ?? "",
  };
}

function initialMilestoneDraft(): MilestoneDraft {
  return {
    title: "",
    status: "planned",
    dueLabel: "",
    progress: "0",
    nextAction: "",
  };
}

function EducationFormDialog({
  dialog,
  dialogError,
  fieldDraft,
  fields,
  ideaDraft,
  ideas,
  literature,
  literatureDraft,
  milestoneDraft,
  noteDraft,
  onClose,
  onFieldDraft,
  onIdeaDraft,
  onLiteratureDraft,
  onMilestoneDraft,
  onNoteDraft,
  onQuestionDraft,
  onSubmitField,
  onSubmitIdea,
  onSubmitLiterature,
  onSubmitMilestone,
  onSubmitNote,
  onSubmitQuestion,
  onSubmitThesisAction,
  onThesisDraft,
  questionDraft,
  thesisDraft,
}: Readonly<{
  dialog: Exclude<DialogKind, null>;
  dialogError: string | null;
  fieldDraft: FieldDraft;
  fields: readonly ResearchField[];
  ideaDraft: IdeaDraft;
  ideas: readonly ResearchIdea[];
  literature: readonly LiteratureItem[];
  literatureDraft: LiteratureDraft;
  milestoneDraft: MilestoneDraft;
  noteDraft: NoteDraft;
  onClose: () => void;
  onFieldDraft: (draft: FieldDraft) => void;
  onIdeaDraft: (draft: IdeaDraft) => void;
  onLiteratureDraft: (draft: LiteratureDraft) => void;
  onMilestoneDraft: (draft: MilestoneDraft) => void;
  onNoteDraft: (draft: NoteDraft) => void;
  onQuestionDraft: (draft: QuestionDraft) => void;
  onSubmitField: () => void;
  onSubmitIdea: () => void;
  onSubmitLiterature: () => void;
  onSubmitMilestone: () => void;
  onSubmitNote: () => void;
  onSubmitQuestion: () => void;
  onSubmitThesisAction: () => void;
  onThesisDraft: (draft: ThesisActionDraft) => void;
  questionDraft: QuestionDraft;
  thesisDraft: ThesisActionDraft;
}>) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (dialog === "idea") {
      onSubmitIdea();
    } else if (dialog === "literature") {
      onSubmitLiterature();
    } else if (dialog === "field") {
      onSubmitField();
    } else if (dialog === "note") {
      onSubmitNote();
    } else if (dialog === "question") {
      onSubmitQuestion();
    } else if (dialog === "thesis-action") {
      onSubmitThesisAction();
    } else {
      onSubmitMilestone();
    }
  }

  const title =
    dialog === "idea"
      ? "Add research idea"
      : dialog === "literature"
        ? "Add literature"
        : dialog === "field"
          ? "Add field"
          : dialog === "note"
            ? "Capture research note"
            : dialog === "question"
              ? "Add question"
              : dialog === "thesis-action"
                ? "Update next action"
                : "Add milestone";

  return (
    <form className="flex max-h-[calc(100dvh-24px)] flex-col" onSubmit={handleSubmit}>
      <DialogHeader
        description="All changes are local mock state. Nothing is persisted or sent to an external service."
        eyebrow="Dialog · Education"
        id="education-dialog-heading"
        title={title}
      />
      <div className="grid gap-3 overflow-y-auto p-4 sm:grid-cols-2">
        {dialog === "idea" ? (
          <>
            <label htmlFor="idea-title">
              <FieldLabel>Title *</FieldLabel>
              <input
                className={inputClass}
                id="idea-title"
                onChange={(event) =>
                  onIdeaDraft({ ...ideaDraft, title: event.target.value })
                }
                value={ideaDraft.title}
              />
            </label>
            <label htmlFor="idea-work-type">
              <FieldLabel>Work Type</FieldLabel>
              <select
                className={inputClass}
                id="idea-work-type"
                onChange={(event) =>
                  onIdeaDraft({
                    ...ideaDraft,
                    workType: event.target.value as AcademicWorkType,
                  })
                }
                value={ideaDraft.workType}
              >
                {workTypes.map((type) => (
                  <option key={type} value={type}>
                    {workTypeLabels[type]}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="idea-field">
              <FieldLabel>Field *</FieldLabel>
              <select
                className={inputClass}
                id="idea-field"
                onChange={(event) =>
                  onIdeaDraft({ ...ideaDraft, fieldId: event.target.value })
                }
                value={ideaDraft.fieldId}
              >
                {fields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.title}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="idea-status">
              <FieldLabel>Status</FieldLabel>
              <select
                className={inputClass}
                id="idea-status"
                onChange={(event) =>
                  onIdeaDraft({
                    ...ideaDraft,
                    status: event.target.value as ResearchIdeaStatus,
                  })
                }
                value={ideaDraft.status}
              >
                {ideaStatuses.map((status) => (
                  <option key={status} value={status}>
                    {ideaStatusMeta[status].label}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="idea-thesis">
              <FieldLabel>Thesis Potential</FieldLabel>
              <select
                className={inputClass}
                id="idea-thesis"
                onChange={(event) =>
                  onIdeaDraft({
                    ...ideaDraft,
                    thesisPotential: event.target.value as ThesisPotential,
                  })
                }
                value={ideaDraft.thesisPotential}
              >
                {(["unknown", "low", "medium", "high"] as const).map((value) => (
                  <option key={value} value={value}>
                    {thesisPotentialLabels[value]}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="idea-next">
              <FieldLabel>Next Action *</FieldLabel>
              <input
                className={inputClass}
                id="idea-next"
                onChange={(event) =>
                  onIdeaDraft({ ...ideaDraft, nextAction: event.target.value })
                }
                value={ideaDraft.nextAction}
              />
            </label>
            <label className="sm:col-span-2" htmlFor="idea-summary">
              <FieldLabel optional>Summary</FieldLabel>
              <textarea
                className={cn(inputClass, "min-h-24 py-3")}
                id="idea-summary"
                onChange={(event) =>
                  onIdeaDraft({ ...ideaDraft, summary: event.target.value })
                }
                value={ideaDraft.summary}
              />
            </label>
            <label className="sm:col-span-2" htmlFor="idea-question">
              <FieldLabel optional>Research Question</FieldLabel>
              <textarea
                className={cn(inputClass, "min-h-24 py-3")}
                id="idea-question"
                onChange={(event) =>
                  onIdeaDraft({
                    ...ideaDraft,
                    researchQuestion: event.target.value,
                  })
                }
                value={ideaDraft.researchQuestion}
              />
            </label>
          </>
        ) : null}

        {dialog === "literature" ? (
          <>
            <label htmlFor="literature-title">
              <FieldLabel>Title *</FieldLabel>
              <input
                className={inputClass}
                id="literature-title"
                onChange={(event) =>
                  onLiteratureDraft({
                    ...literatureDraft,
                    title: event.target.value,
                  })
                }
                value={literatureDraft.title}
              />
            </label>
            <label htmlFor="literature-authors">
              <FieldLabel optional>Authors</FieldLabel>
              <input
                className={inputClass}
                id="literature-authors"
                onChange={(event) =>
                  onLiteratureDraft({
                    ...literatureDraft,
                    authors: event.target.value,
                  })
                }
                value={literatureDraft.authors}
              />
            </label>
            <label htmlFor="literature-year">
              <FieldLabel optional>Year</FieldLabel>
              <input
                className={inputClass}
                id="literature-year"
                inputMode="numeric"
                onChange={(event) =>
                  onLiteratureDraft({ ...literatureDraft, year: event.target.value })
                }
                value={literatureDraft.year}
              />
            </label>
            <label htmlFor="literature-type">
              <FieldLabel>Type</FieldLabel>
              <select
                className={inputClass}
                id="literature-type"
                onChange={(event) =>
                  onLiteratureDraft({
                    ...literatureDraft,
                    type: event.target.value as LiteratureItem["type"],
                  })
                }
                value={literatureDraft.type}
              >
                {Object.entries(literatureTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="literature-status">
              <FieldLabel>Status</FieldLabel>
              <select
                className={inputClass}
                id="literature-status"
                onChange={(event) =>
                  onLiteratureDraft({
                    ...literatureDraft,
                    status: event.target.value as LiteratureStatus,
                  })
                }
                value={literatureDraft.status}
              >
                {literatureStatuses.map((status) => (
                  <option key={status} value={status}>
                    {literatureStatusMeta[status].label}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="literature-relevance">
              <FieldLabel>Relevance</FieldLabel>
              <select
                className={inputClass}
                id="literature-relevance"
                onChange={(event) =>
                  onLiteratureDraft({
                    ...literatureDraft,
                    relevance: event.target.value as LiteratureItem["relevance"],
                  })
                }
                value={literatureDraft.relevance}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label htmlFor="literature-idea">
              <FieldLabel optional>Linked Idea</FieldLabel>
              <select
                className={inputClass}
                id="literature-idea"
                onChange={(event) =>
                  onLiteratureDraft({ ...literatureDraft, ideaId: event.target.value })
                }
                value={literatureDraft.ideaId}
              >
                <option value="">No linked idea</option>
                {ideas.map((idea) => (
                  <option key={idea.id} value={idea.id}>
                    {idea.title}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="literature-field">
              <FieldLabel optional>Linked Field</FieldLabel>
              <select
                className={inputClass}
                id="literature-field"
                onChange={(event) =>
                  onLiteratureDraft({ ...literatureDraft, fieldId: event.target.value })
                }
                value={literatureDraft.fieldId}
              >
                <option value="">No linked field</option>
                {fields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.title}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="literature-citation">
              <FieldLabel optional>Citation Key</FieldLabel>
              <input
                className={inputClass}
                id="literature-citation"
                onChange={(event) =>
                  onLiteratureDraft({
                    ...literatureDraft,
                    citationKey: event.target.value,
                  })
                }
                value={literatureDraft.citationKey}
              />
            </label>
            <label htmlFor="literature-next">
              <FieldLabel optional>Next Action</FieldLabel>
              <input
                className={inputClass}
                id="literature-next"
                onChange={(event) =>
                  onLiteratureDraft({
                    ...literatureDraft,
                    nextAction: event.target.value,
                  })
                }
                value={literatureDraft.nextAction}
              />
            </label>
            <label className="sm:col-span-2" htmlFor="literature-note">
              <FieldLabel optional>Note</FieldLabel>
              <textarea
                className={cn(inputClass, "min-h-24 py-3")}
                id="literature-note"
                onChange={(event) =>
                  onLiteratureDraft({ ...literatureDraft, note: event.target.value })
                }
                value={literatureDraft.note}
              />
            </label>
          </>
        ) : null}

        {dialog === "field" ? (
          <>
            <label htmlFor="field-title">
              <FieldLabel>Title *</FieldLabel>
              <input
                className={inputClass}
                id="field-title"
                onChange={(event) =>
                  onFieldDraft({ ...fieldDraft, title: event.target.value })
                }
                value={fieldDraft.title}
              />
            </label>
            <label htmlFor="field-status">
              <FieldLabel>Status</FieldLabel>
              <select
                className={inputClass}
                id="field-status"
                onChange={(event) =>
                  onFieldDraft({
                    ...fieldDraft,
                    status: event.target.value as ResearchFieldStatus,
                  })
                }
                value={fieldDraft.status}
              >
                {fieldStatuses.map((status) => (
                  <option key={status} value={status}>
                    {optionLabel(status)}
                  </option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-2" htmlFor="field-description">
              <FieldLabel>Description *</FieldLabel>
              <textarea
                className={cn(inputClass, "min-h-24 py-3")}
                id="field-description"
                onChange={(event) =>
                  onFieldDraft({
                    ...fieldDraft,
                    description: event.target.value,
                  })
                }
                value={fieldDraft.description}
              />
            </label>
            <label className="sm:col-span-2" htmlFor="field-next">
              <FieldLabel optional>Next Action</FieldLabel>
              <input
                className={inputClass}
                id="field-next"
                onChange={(event) =>
                  onFieldDraft({ ...fieldDraft, nextAction: event.target.value })
                }
                value={fieldDraft.nextAction}
              />
            </label>
          </>
        ) : null}

        {dialog === "note" ? (
          <>
            <label htmlFor="note-title">
              <FieldLabel>Title *</FieldLabel>
              <input
                className={inputClass}
                id="note-title"
                onChange={(event) =>
                  onNoteDraft({ ...noteDraft, title: event.target.value })
                }
                value={noteDraft.title}
              />
            </label>
            <label htmlFor="note-type">
              <FieldLabel>Type</FieldLabel>
              <select
                className={inputClass}
                id="note-type"
                onChange={(event) =>
                  onNoteDraft({
                    ...noteDraft,
                    type: event.target.value as ResearchNoteType,
                  })
                }
                value={noteDraft.type}
              >
                {noteTypes.map((type) => (
                  <option key={type} value={type}>
                    {noteTypeLabels[type]}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="note-idea">
              <FieldLabel optional>Linked Idea</FieldLabel>
              <select
                className={inputClass}
                id="note-idea"
                onChange={(event) =>
                  onNoteDraft({ ...noteDraft, ideaId: event.target.value })
                }
                value={noteDraft.ideaId}
              >
                <option value="">No linked idea</option>
                {ideas.map((idea) => (
                  <option key={idea.id} value={idea.id}>
                    {idea.title}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="note-literature">
              <FieldLabel optional>Linked Literature</FieldLabel>
              <select
                className={inputClass}
                id="note-literature"
                onChange={(event) =>
                  onNoteDraft({ ...noteDraft, literatureId: event.target.value })
                }
                value={noteDraft.literatureId}
              >
                <option value="">No linked literature</option>
                {literature.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="note-field">
              <FieldLabel optional>Linked Field</FieldLabel>
              <select
                className={inputClass}
                id="note-field"
                onChange={(event) =>
                  onNoteDraft({ ...noteDraft, fieldId: event.target.value })
                }
                value={noteDraft.fieldId}
              >
                <option value="">No linked field</option>
                {fields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.title}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="note-tags">
              <FieldLabel optional>Tags</FieldLabel>
              <input
                className={inputClass}
                id="note-tags"
                onChange={(event) =>
                  onNoteDraft({ ...noteDraft, tags: event.target.value })
                }
                placeholder="review, source, method"
                value={noteDraft.tags}
              />
            </label>
            <label className="sm:col-span-2" htmlFor="note-body">
              <FieldLabel>Note *</FieldLabel>
              <textarea
                className={cn(inputClass, "min-h-28 py-3")}
                id="note-body"
                onChange={(event) =>
                  onNoteDraft({ ...noteDraft, body: event.target.value })
                }
                value={noteDraft.body}
              />
            </label>
            <label
              className="flex min-h-11 items-center gap-3 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.62)] px-3 text-[12px] text-[var(--text-secondary)]"
              htmlFor="note-review"
            >
              <input
                checked={noteDraft.reviewNeeded}
                className="size-4"
                id="note-review"
                onChange={(event) =>
                  onNoteDraft({
                    ...noteDraft,
                    reviewNeeded: event.target.checked,
                  })
                }
                type="checkbox"
              />
              Review needed
            </label>
          </>
        ) : null}

        {dialog === "question" ? (
          <>
            <label className="sm:col-span-2" htmlFor="question-text">
              <FieldLabel>Question *</FieldLabel>
              <textarea
                className={cn(inputClass, "min-h-24 py-3")}
                id="question-text"
                onChange={(event) =>
                  onQuestionDraft({
                    ...questionDraft,
                    question: event.target.value,
                  })
                }
                value={questionDraft.question}
              />
            </label>
            <label htmlFor="question-idea">
              <FieldLabel optional>Linked Idea</FieldLabel>
              <select
                className={inputClass}
                id="question-idea"
                onChange={(event) =>
                  onQuestionDraft({
                    ...questionDraft,
                    ideaId: event.target.value,
                  })
                }
                value={questionDraft.ideaId}
              >
                <option value="">No linked idea</option>
                {ideas.map((idea) => (
                  <option key={idea.id} value={idea.id}>
                    {idea.title}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="question-field">
              <FieldLabel optional>Linked Field</FieldLabel>
              <select
                className={inputClass}
                id="question-field"
                onChange={(event) =>
                  onQuestionDraft({
                    ...questionDraft,
                    fieldId: event.target.value,
                  })
                }
                value={questionDraft.fieldId}
              >
                <option value="">No linked field</option>
                {fields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.title}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="question-importance">
              <FieldLabel>Importance</FieldLabel>
              <select
                className={inputClass}
                id="question-importance"
                onChange={(event) =>
                  onQuestionDraft({
                    ...questionDraft,
                    importance: event.target.value as ResearchQuestion["importance"],
                  })
                }
                value={questionDraft.importance}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label htmlFor="question-status">
              <FieldLabel>Status</FieldLabel>
              <select
                className={inputClass}
                id="question-status"
                onChange={(event) =>
                  onQuestionDraft({
                    ...questionDraft,
                    status: event.target.value as ResearchQuestion["status"],
                  })
                }
                value={questionDraft.status}
              >
                {Object.entries(questionStatusMeta).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-2" htmlFor="question-next">
              <FieldLabel optional>Next Action</FieldLabel>
              <input
                className={inputClass}
                id="question-next"
                onChange={(event) =>
                  onQuestionDraft({
                    ...questionDraft,
                    nextAction: event.target.value,
                  })
                }
                value={questionDraft.nextAction}
              />
            </label>
          </>
        ) : null}

        {dialog === "thesis-action" ? (
          <>
            <label className="sm:col-span-2" htmlFor="thesis-next">
              <FieldLabel>Next Action *</FieldLabel>
              <input
                className={inputClass}
                id="thesis-next"
                onChange={(event) =>
                  onThesisDraft({ ...thesisDraft, nextAction: event.target.value })
                }
                value={thesisDraft.nextAction}
              />
            </label>
            <label htmlFor="thesis-phase">
              <FieldLabel>Phase</FieldLabel>
              <select
                className={inputClass}
                id="thesis-phase"
                onChange={(event) =>
                  onThesisDraft({
                    ...thesisDraft,
                    phase: event.target.value as MasterThesisState["currentPhase"],
                  })
                }
                value={thesisDraft.phase}
              >
                {thesisPhases.map((phase) => (
                  <option key={phase} value={phase}>
                    {optionLabel(phase)}
                  </option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-2" htmlFor="thesis-risk">
              <FieldLabel optional>Risk Note</FieldLabel>
              <textarea
                className={cn(inputClass, "min-h-24 py-3")}
                id="thesis-risk"
                onChange={(event) =>
                  onThesisDraft({ ...thesisDraft, riskNote: event.target.value })
                }
                value={thesisDraft.riskNote}
              />
            </label>
          </>
        ) : null}

        {dialog === "milestone" ? (
          <>
            <label htmlFor="milestone-title">
              <FieldLabel>Title *</FieldLabel>
              <input
                className={inputClass}
                id="milestone-title"
                onChange={(event) =>
                  onMilestoneDraft({
                    ...milestoneDraft,
                    title: event.target.value,
                  })
                }
                value={milestoneDraft.title}
              />
            </label>
            <label htmlFor="milestone-status">
              <FieldLabel>Status</FieldLabel>
              <select
                className={inputClass}
                id="milestone-status"
                onChange={(event) =>
                  onMilestoneDraft({
                    ...milestoneDraft,
                    status: event.target.value as MasterThesisMilestone["status"],
                  })
                }
                value={milestoneDraft.status}
              >
                {Object.entries(milestoneStatusMeta).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="milestone-due">
              <FieldLabel optional>Due Label</FieldLabel>
              <input
                className={inputClass}
                id="milestone-due"
                onChange={(event) =>
                  onMilestoneDraft({
                    ...milestoneDraft,
                    dueLabel: event.target.value,
                  })
                }
                value={milestoneDraft.dueLabel}
              />
            </label>
            <label htmlFor="milestone-progress">
              <FieldLabel>Progress</FieldLabel>
              <input
                className={inputClass}
                id="milestone-progress"
                inputMode="numeric"
                onChange={(event) =>
                  onMilestoneDraft({
                    ...milestoneDraft,
                    progress: event.target.value,
                  })
                }
                value={milestoneDraft.progress}
              />
            </label>
            <label className="sm:col-span-2" htmlFor="milestone-next">
              <FieldLabel>Next Action *</FieldLabel>
              <input
                className={inputClass}
                id="milestone-next"
                onChange={(event) =>
                  onMilestoneDraft({
                    ...milestoneDraft,
                    nextAction: event.target.value,
                  })
                }
                value={milestoneDraft.nextAction}
              />
            </label>
          </>
        ) : null}
      </div>
      <div className="border-t border-[var(--border-subtle)] bg-[rgba(7,11,18,.58)] px-4 py-3">
        {dialogError ? (
          <p className="mb-3 text-[11px] leading-4 text-[var(--accent-red)]">
            {dialogError}
          </p>
        ) : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button className={secondaryButtonClass} onClick={onClose} type="button">
            Cancel
          </button>
          <button className={primaryButtonClass} type="submit">
            Save locally
          </button>
        </div>
      </div>
    </form>
  );
}

function EducationInspector({
  fields,
  ideas,
  inspector,
  literature,
  markLiteratureReviewed,
  markNoteReviewed,
  masterThesis,
  notes,
  onAddNote,
  onAddQuestion,
  onAddSource,
  onClose,
  onSetThesisFocus,
  questions,
  selectedField,
  selectedIdea,
  selectedLiterature,
  selectedNote,
  selectedQuestion,
  updateQuestionStatus,
}: Readonly<{
  fields: readonly ResearchField[];
  ideas: readonly ResearchIdea[];
  inspector: InspectorState;
  literature: readonly LiteratureItem[];
  markLiteratureReviewed: (item: LiteratureItem) => void;
  markNoteReviewed: (note: ResearchNote) => void;
  masterThesis: MasterThesisState;
  notes: readonly ResearchNote[];
  onAddNote: (context: LinkContext) => void;
  onAddQuestion: (context: LinkContext) => void;
  onAddSource: (context: LinkContext) => void;
  onClose: () => void;
  onSetThesisFocus: (idea: ResearchIdea) => void;
  questions: readonly ResearchQuestion[];
  selectedField: ResearchField | null;
  selectedIdea: ResearchIdea | null;
  selectedLiterature: LiteratureItem | null;
  selectedNote: ResearchNote | null;
  selectedQuestion: ResearchQuestion | null;
  updateQuestionStatus: (
    question: ResearchQuestion,
    status: ResearchQuestion["status"],
  ) => void;
}>) {
  const open = Boolean(inspector);
  const title =
    selectedIdea?.title ??
    selectedLiterature?.title ??
    selectedField?.title ??
    selectedNote?.title ??
    selectedQuestion?.question ??
    (inspector?.type === "thesis" ? masterThesis.title : "Education inspector");

  return (
    <DialogShell
      labelledBy="education-inspector-heading"
      onClose={onClose}
      open={open}
      sheet
    >
      <div className="flex h-full max-h-dvh flex-col">
        <DialogHeader
          description="Inspector details are local and mock-based."
          eyebrow="Inspector · Education"
          id="education-inspector-heading"
          title={title}
        />
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {selectedIdea ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Pill accent={ideaStatusMeta[selectedIdea.status].accent}>
                  {ideaStatusMeta[selectedIdea.status].label}
                </Pill>
                <Pill accent={ideaAccent}>
                  Thesis · {thesisPotentialLabels[selectedIdea.thesisPotential]}
                </Pill>
                <Pill quiet>{workTypeLabels[selectedIdea.workType]}</Pill>
              </div>
              <InspectorBlock title="Summary">{selectedIdea.summary}</InspectorBlock>
              <InspectorBlock title="Research Question">
                {selectedIdea.researchQuestion ?? "No research question set yet."}
              </InspectorBlock>
              <InspectorList title="Literature">
                {literature
                  .filter((item) => item.ideaId === selectedIdea.id)
                  .map((item) => (
                    <LinkedMiniItem
                      key={item.id}
                      meta={literatureStatusMeta[item.status].label}
                      title={item.title}
                    />
                  ))}
              </InspectorList>
              <InspectorList title="Notes">
                {notes
                  .filter((note) => note.ideaId === selectedIdea.id)
                  .map((note) => (
                    <LinkedMiniItem
                      key={note.id}
                      meta={noteTypeLabels[note.type]}
                      title={note.title}
                    />
                  ))}
              </InspectorList>
              <InspectorList title="Questions">
                {questions
                  .filter((question) => question.ideaId === selectedIdea.id)
                  .map((question) => (
                    <LinkedMiniItem
                      key={question.id}
                      meta={questionStatusMeta[question.status].label}
                      title={question.question}
                    />
                  ))}
              </InspectorList>
              <InspectorBlock title="Next Action">{selectedIdea.nextAction}</InspectorBlock>
            </div>
          ) : null}

          {selectedLiterature ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Pill accent={literatureStatusMeta[selectedLiterature.status].accent}>
                  {literatureStatusMeta[selectedLiterature.status].label}
                </Pill>
                <Pill accent={relevanceMeta[selectedLiterature.relevance].accent}>
                  {relevanceMeta[selectedLiterature.relevance].label}
                </Pill>
                <Pill quiet>{literatureTypeLabels[selectedLiterature.type]}</Pill>
              </div>
              <InspectorBlock title="Bibliographic info">
                {selectedLiterature.authors || "No authors yet"}
                {selectedLiterature.year ? ` · ${selectedLiterature.year}` : ""} · Mock
                source for UI structure only.
              </InspectorBlock>
              <InspectorBlock title="Linked Idea / Field">
                {selectedLiterature.ideaTitle ??
                  linkedIdeaTitle(ideas, selectedLiterature.ideaId)}{" "}
                ·{" "}
                {selectedLiterature.fieldTitle ??
                  linkedFieldTitle(fields, selectedLiterature.fieldId)}
              </InspectorBlock>
              <InspectorList title="Notes">
                {notes
                  .filter((note) => note.literatureId === selectedLiterature.id)
                  .map((note) => (
                    <LinkedMiniItem
                      key={note.id}
                      meta={noteTypeLabels[note.type]}
                      title={note.title}
                    />
                  ))}
              </InspectorList>
              <InspectorBlock title="Next Action">
                {selectedLiterature.nextAction}
              </InspectorBlock>
            </div>
          ) : null}

          {selectedField ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Pill>{optionLabel(selectedField.status)}</Pill>
              </div>
              <InspectorBlock title="Description">
                {selectedField.description}
              </InspectorBlock>
              <InspectorList title="Ideas">
                {ideas
                  .filter((idea) => idea.fieldId === selectedField.id)
                  .map((idea) => (
                    <LinkedMiniItem
                      key={idea.id}
                      meta={`${ideaStatusMeta[idea.status].label} · ${thesisPotentialLabels[idea.thesisPotential]}`}
                      title={idea.title}
                    />
                  ))}
              </InspectorList>
              <InspectorList title="Literature">
                {literature
                  .filter((item) => item.fieldId === selectedField.id)
                  .map((item) => (
                    <LinkedMiniItem
                      key={item.id}
                      meta={literatureStatusMeta[item.status].label}
                      title={item.title}
                    />
                  ))}
              </InspectorList>
              <InspectorList title="Questions">
                {questions
                  .filter((question) => question.fieldId === selectedField.id)
                  .map((question) => (
                    <LinkedMiniItem
                      key={question.id}
                      meta={questionStatusMeta[question.status].label}
                      title={question.question}
                    />
                  ))}
              </InspectorList>
              <InspectorBlock title="Next Action">{selectedField.nextAction}</InspectorBlock>
            </div>
          ) : null}

          {selectedNote ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Pill>{noteTypeLabels[selectedNote.type]}</Pill>
                {selectedNote.reviewNeeded ? (
                  <Pill accent={questionAccent}>Review needed</Pill>
                ) : (
                  <Pill accent={successAccent}>Reviewed</Pill>
                )}
              </div>
              <InspectorBlock title="Note">{selectedNote.body}</InspectorBlock>
              <InspectorBlock title="Links">
                {selectedNote.ideaTitle ?? "No linked idea"} ·{" "}
                {selectedNote.literatureTitle ?? "No linked literature"} ·{" "}
                {selectedNote.fieldTitle ?? "No linked field"}
              </InspectorBlock>
            </div>
          ) : null}

          {selectedQuestion ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Pill accent={questionStatusMeta[selectedQuestion.status].accent}>
                  {questionStatusMeta[selectedQuestion.status].label}
                </Pill>
                <Pill accent={importanceMeta[selectedQuestion.importance].accent}>
                  Importance · {importanceMeta[selectedQuestion.importance].label}
                </Pill>
              </div>
              <InspectorBlock title="Linked Idea / Field">
                {selectedQuestion.ideaTitle ?? "No linked idea"} ·{" "}
                {selectedQuestion.fieldTitle ?? "No linked field"}
              </InspectorBlock>
              <InspectorBlock title="Next Action">
                {selectedQuestion.nextAction}
              </InspectorBlock>
            </div>
          ) : null}

          {inspector?.type === "thesis" ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Pill>{optionLabel(masterThesis.currentPhase)}</Pill>
                <Pill accent={literatureAccent}>{masterThesis.sourceCount} sources</Pill>
                <Pill>{masterThesis.noteCount} notes</Pill>
              </div>
              <InspectorBlock title="Research Question">
                {masterThesis.researchQuestion ?? "No research question set yet."}
              </InspectorBlock>
              <InspectorBlock title="Next Action">
                {masterThesis.nextAction}
              </InspectorBlock>
              <InspectorBlock title="Open Risk">
                {masterThesis.openRisk ?? "No open risk noted."}
              </InspectorBlock>
            </div>
          ) : null}
        </div>
        <div className="border-t border-[var(--border-subtle)] bg-[rgba(7,11,18,.58)] p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {selectedIdea ? (
              <>
                <button className={primaryButtonClass} onClick={() => onSetThesisFocus(selectedIdea)} type="button">
                  Set as focus
                </button>
                <button
                  className={secondaryButtonClass}
                  onClick={() =>
                    onAddSource({
                      ideaId: selectedIdea.id,
                      fieldId: selectedIdea.fieldId,
                    })
                  }
                  type="button"
                >
                  Add source
                </button>
                <button
                  className={secondaryButtonClass}
                  onClick={() =>
                    onAddNote({
                      ideaId: selectedIdea.id,
                      fieldId: selectedIdea.fieldId,
                    })
                  }
                  type="button"
                >
                  Add note
                </button>
              </>
            ) : null}
            {selectedLiterature ? (
              <>
                <button
                  className={primaryButtonClass}
                  disabled={selectedLiterature.status === "reviewed"}
                  onClick={() => markLiteratureReviewed(selectedLiterature)}
                  type="button"
                >
                  Mark reviewed
                </button>
                <button
                  className={secondaryButtonClass}
                  onClick={() =>
                    onAddNote({
                      literatureId: selectedLiterature.id,
                      ideaId: selectedLiterature.ideaId,
                      fieldId: selectedLiterature.fieldId,
                    })
                  }
                  type="button"
                >
                  Add note
                </button>
              </>
            ) : null}
            {selectedField ? (
              <>
                <button className={secondaryButtonClass} onClick={() => onAddNote({ fieldId: selectedField.id })} type="button">
                  Add note
                </button>
                <button className={secondaryButtonClass} onClick={() => onAddSource({ fieldId: selectedField.id })} type="button">
                  Add source
                </button>
                <button className={secondaryButtonClass} onClick={() => onAddQuestion({ fieldId: selectedField.id })} type="button">
                  Add question
                </button>
              </>
            ) : null}
            {selectedNote ? (
              <>
                <button
                  className={primaryButtonClass}
                  disabled={!selectedNote.reviewNeeded}
                  onClick={() => markNoteReviewed(selectedNote)}
                  type="button"
                >
                  Mark reviewed
                </button>
                <button
                  className={secondaryButtonClass}
                  onClick={() =>
                    onAddNote({
                      ideaId: selectedNote.ideaId,
                      fieldId: selectedNote.fieldId,
                      literatureId: selectedNote.literatureId,
                    })
                  }
                  type="button"
                >
                  Edit draft
                </button>
              </>
            ) : null}
            {selectedQuestion ? (
              <>
                <button
                  className={secondaryButtonClass}
                  disabled={selectedQuestion.status === "investigating"}
                  onClick={() => updateQuestionStatus(selectedQuestion, "investigating")}
                  type="button"
                >
                  Mark investigating
                </button>
                <button
                  className={primaryButtonClass}
                  disabled={selectedQuestion.status === "answered"}
                  onClick={() => updateQuestionStatus(selectedQuestion, "answered")}
                  type="button"
                >
                  Mark answered
                </button>
                <button
                  className={secondaryButtonClass}
                  onClick={() =>
                    onAddNote({
                      ideaId: selectedQuestion.ideaId,
                      fieldId: selectedQuestion.fieldId,
                    })
                  }
                  type="button"
                >
                  Add note
                </button>
              </>
            ) : null}
            <button className={secondaryButtonClass} onClick={onClose} type="button">
              Close
            </button>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}

function InspectorBlock({
  title,
  children,
}: Readonly<{ title: string; children: ReactNode }>) {
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
}: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
        {title}
      </p>
      <div className="mt-2 grid gap-2">{children}</div>
    </div>
  );
}
