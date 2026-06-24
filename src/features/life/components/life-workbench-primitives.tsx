"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { EmptyState, Pill } from "@/components/layout/route-page-primitives";
import { cn } from "@/lib/cn";
import type {
  BudgetFit,
  EntertainmentStatus,
  EntertainmentType,
  InventoryCategory,
  InventoryStatus,
  JournalMood,
  LifeItemPrivacy,
  LifeNoteType,
  LifePriority,
  LifeSource,
  LifeSubpageHeader as LifeSubpageHeaderModel,
  LifeTone,
} from "../types";

export type ToastState = {
  title: string;
  body: string;
  tone: "success" | "info" | "error";
};

export type LifeWorkbenchStyle = CSSProperties & {
  "--accent"?: string;
};

export const toneAccents: Record<LifeTone, string> = {
  purple: "var(--accent-purple)",
  cyan: "var(--accent-cyan)",
  blue: "var(--accent-blue)",
  orange: "var(--accent-orange)",
  green: "var(--accent-green)",
  red: "var(--accent-red)",
  gray: "var(--text-muted)",
};

export const moodLabels: Record<JournalMood, string> = {
  calm: "Calm",
  stable: "Stable",
  tired: "Tired",
  stressed: "Stressed",
  overloaded: "Overloaded",
  unclear: "Unclear",
};

export const moodAccents: Record<JournalMood, string> = {
  calm: "var(--accent-cyan)",
  stable: "var(--accent-purple)",
  tired: "var(--text-muted)",
  stressed: "var(--accent-orange)",
  overloaded: "var(--accent-red)",
  unclear: "var(--text-muted)",
};

export const privacyLabels: Record<LifeItemPrivacy, string> = {
  private: "Private",
  sensitive: "Sensitive",
  normal: "Normal",
};

export const noteTypeLabels: Record<LifeNoteType, string> = {
  thought: "Thought",
  memory: "Memory",
  idea: "Idea",
  reflection: "Reflection",
  quote: "Quote",
  question: "Question",
  misc: "Misc",
};

export const noteSourceLabels: Record<LifeSource, string> = {
  quick_capture: "Quick capture",
  manual: "Manual",
  journal: "Journal",
  import: "Import",
  system: "System",
};

export const mediaTypeLabels: Record<EntertainmentType, string> = {
  movie: "Movie",
  series: "Series",
  book: "Book",
  game: "Game",
  video: "Video",
  music: "Music",
  podcast: "Podcast",
  other: "Other",
};

export const mediaStatusLabels: Record<EntertainmentStatus, string> = {
  wishlist: "Wishlist",
  watching: "Watching",
  reading: "Reading",
  playing: "Playing",
  paused: "Paused",
  finished: "Finished",
  archived: "Archived",
};

export const inventoryCategoryLabels: Record<InventoryCategory, string> = {
  tech: "Tech",
  desk: "Desk",
  clothing: "Clothing",
  fitness: "Fitness",
  home: "Home",
  study: "Learning",
  software: "Software",
  other: "Other",
};

export const inventoryStatusLabels: Record<InventoryStatus, string> = {
  owned: "Owned",
  needs_replacement: "Needs replacement",
  wishlist: "Wishlist",
  planned_purchase: "Planned purchase",
  not_needed: "Not needed",
  archived: "Archived",
};

export const budgetFitLabels: Record<BudgetFit, string> = {
  fits: "Fits",
  wait: "Wait",
  too_expensive: "Too expensive",
  unknown: "Unknown",
};

export const priorityLabels: Record<LifePriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const buttonBaseClass =
  "inline-flex min-h-11 items-center justify-center rounded-[12px] border px-4 text-[11px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50";

export const primaryButtonClass = cn(
  buttonBaseClass,
  "border-[rgba(155,124,246,.34)] bg-[rgba(155,124,246,.92)] text-[var(--bg-app)] hover:bg-[rgba(155,124,246,1)]",
);

export const secondaryButtonClass = cn(
  buttonBaseClass,
  "border-[var(--border-subtle)] bg-[rgba(18,28,43,.82)] text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]",
);

export const quietButtonClass =
  "inline-flex min-h-9 items-center justify-center rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.58)] px-3 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50";

export const chipButtonClass =
  "inline-flex min-h-9 items-center justify-center rounded-[999px] border px-3 text-[10px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]";

export const inputClass =
  "mt-1 min-h-11 w-full rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.62)] px-3 text-[12px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--focus-ring)] disabled:opacity-60";

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export function formatMoney(value?: number) {
  if (typeof value !== "number") {
    return "not set";
  }

  return new Intl.NumberFormat("en-US", {
    currency: "EUR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

export function compactText(value: string, limit = 150) {
  if (value.length <= limit) {
    return value;
  }

  return `${value.slice(0, limit - 1).trim()}...`;
}

export function localId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}`;
}

export function normalizeTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function priorityRank(priority: LifePriority) {
  return priority === "high" ? 0 : priority === "medium" ? 1 : 2;
}

export function LifePageShell({
  accent = "var(--accent-purple)",
  children,
}: Readonly<{
  accent?: string;
  children: ReactNode;
}>) {
  return (
    <div
      className="mx-auto flex w-full max-w-[2208px] flex-col gap-2 pb-6"
      style={{ "--accent": accent } as LifeWorkbenchStyle}
    >
      {children}
    </div>
  );
}

export function LifeSubpageHeader({
  header,
  primaryAction,
  secondaryActions,
}: Readonly<{
  header: LifeSubpageHeaderModel;
  primaryAction: ReactNode;
  secondaryActions?: ReactNode;
}>) {
  return (
    <header className="overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.78)] shadow-[0_8px_22px_rgba(0,0,0,.12)]">
      <div className="grid gap-4 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--accent)_8%,transparent),transparent_48%)] px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
            {header.eyebrow}
          </p>
          <h1 className="mt-2 text-[30px] font-semibold leading-none text-[var(--text-primary)] sm:text-[34px]">
            {header.title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            {header.summary}
          </p>
          <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
            {header.context}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          {primaryAction}
          {secondaryActions}
        </div>
      </div>
    </header>
  );
}

export function Panel({
  title,
  subtitle,
  action,
  children,
  className,
}: Readonly<{
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}>) {
  const headingId = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-heading`;

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "min-w-0 overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-1)] shadow-[0_8px_22px_rgba(0,0,0,.12)]",
        className,
      )}
    >
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] px-4 py-3">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-[18px] font-semibold leading-6 text-[var(--text-primary)]" id={headingId}>
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--text-secondary)]">
                {subtitle}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function LifeEmptyState({
  title,
  description,
}: Readonly<{
  title: string;
  description: string;
}>) {
  return <EmptyState description={description} title={title} />;
}

export function FieldLabel({
  children,
  optional = false,
}: Readonly<{
  children: string;
  optional?: boolean;
}>) {
  return (
    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
      {children}
      {optional ? (
        <span className="ml-1 font-medium normal-case tracking-normal text-[var(--text-faint)]">
          optional
        </span>
      ) : null}
    </span>
  );
}

export function StatusPill({
  children,
  tone = "purple",
  quiet = false,
}: Readonly<{
  children: ReactNode;
  tone?: LifeTone;
  quiet?: boolean;
}>) {
  return (
    <Pill accent={toneAccents[tone]} quiet={quiet}>
      {children}
    </Pill>
  );
}

export function PrivacyPill({
  privacy,
}: Readonly<{
  privacy: LifeItemPrivacy;
}>) {
  return (
    <StatusPill tone={privacy === "sensitive" ? "purple" : "gray"} quiet>
      {privacyLabels[privacy]}
    </StatusPill>
  );
}

export function TagList({
  tags,
}: Readonly<{
  tags: string[];
}>) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          className="rounded-full border border-[var(--border-subtle)] bg-[rgba(168,183,204,.04)] px-2 py-1 text-[10px] text-[var(--text-muted)]"
          key={tag}
        >
          #{tag}
        </span>
      ))}
    </div>
  );
}

export function SegmentButton<TValue extends string>({
  active,
  children,
  onSelect,
  value,
}: Readonly<{
  active: boolean;
  children: ReactNode;
  onSelect: (value: TValue) => void;
  value: TValue;
}>) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        chipButtonClass,
        active
          ? "border-[color-mix(in_srgb,var(--accent)_42%,transparent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-[var(--text-primary)]"
          : "border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] text-[var(--text-muted)] hover:border-[var(--border-default)] hover:text-[var(--text-secondary)]",
      )}
      onClick={() => onSelect(value)}
      type="button"
    >
      {children}
    </button>
  );
}

export function FilterSelect<TValue extends string>({
  label,
  onChange,
  options,
  value,
}: Readonly<{
  label: string;
  onChange: (value: TValue) => void;
  options: readonly { value: TValue; label: string }[];
  value: TValue;
}>) {
  return (
    <label className="min-w-[150px] flex-1">
      <FieldLabel>{label}</FieldLabel>
      <select
        className={cn(inputClass, "min-h-10")}
        onChange={(event) => onChange(event.target.value as TValue)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function DialogError({ error }: Readonly<{ error: string | null }>) {
  if (!error) {
    return null;
  }

  return (
    <p
      className="rounded-[12px] border border-[rgba(221,107,95,.28)] bg-[rgba(221,107,95,.08)] px-3 py-2 text-xs leading-5 text-[var(--text-secondary)]"
      role="alert"
    >
      {error}
    </p>
  );
}

export function DialogFrame({
  children,
  description,
  onClose,
  title,
}: Readonly<{
  children: ReactNode;
  description: string;
  onClose: () => void;
  title: string;
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-dialog-title`;

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog.open) {
        dialog.close();
      }
    };
  }, []);

  return (
    <dialog
      aria-labelledby={titleId}
      className="max-h-[calc(100dvh-32px)] w-[calc(100vw-24px)] max-w-[720px] overflow-y-auto rounded-[18px] border border-[var(--border-default)] bg-[var(--surface-1)] p-0 text-left text-[var(--text-primary)] shadow-[0_22px_70px_rgba(0,0,0,.38)] backdrop:bg-[rgba(0,0,0,.54)]"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      ref={dialogRef}
    >
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.72)] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]" id={titleId}>
              {title}
            </h2>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
              {description}
            </p>
          </div>
          <button className={quietButtonClass} onClick={onClose} type="button">
            Close
          </button>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </dialog>
  );
}

export function DialogFooter({
  onCancel,
  submitLabel,
}: Readonly<{
  onCancel: () => void;
  submitLabel: string;
}>) {
  return (
    <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
      <button className={secondaryButtonClass} onClick={onCancel} type="button">
        Cancel
      </button>
      <button className={primaryButtonClass} type="submit">
        {submitLabel}
      </button>
    </div>
  );
}

export function Toast({
  onDismiss,
  toast,
}: Readonly<{
  onDismiss: () => void;
  toast: ToastState | null;
}>) {
  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(onDismiss, 3200);

    return () => window.clearTimeout(timeout);
  }, [onDismiss, toast]);

  if (!toast) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 max-w-sm rounded-[14px] border bg-[color-mix(in_srgb,var(--surface-2)_92%,#070b13)] px-4 py-3 shadow-[0_14px_34px_rgba(0,0,0,.26)]",
        toast.tone === "success" && "border-[rgba(66,184,131,.34)]",
        toast.tone === "info" && "border-[rgba(95,200,215,.34)]",
        toast.tone === "error" && "border-[rgba(221,107,95,.34)]",
      )}
      role="status"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={cn(
            "mt-1 size-2 rounded-full",
            toast.tone === "success" && "bg-[var(--accent-green)]",
            toast.tone === "info" && "bg-[var(--accent-cyan)]",
            toast.tone === "error" && "bg-[var(--accent-red)]",
          )}
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {toast.title}
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
            {toast.body}
          </p>
        </div>
      </div>
    </div>
  );
}

export function SaveErrorState({
  message,
}: Readonly<{
  message: string | null;
}>) {
  if (!message) {
    return null;
  }

  return (
    <section
      aria-label="Local save error"
      className="rounded-[16px] border border-[rgba(221,107,95,.34)] bg-[rgba(221,107,95,.08)] px-4 py-3"
      role="alert"
    >
      <p className="text-sm font-semibold text-[var(--text-primary)]">
        Local save error
      </p>
      <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
        {message}
      </p>
    </section>
  );
}

export function DetailRow({
  label,
  value,
}: Readonly<{
  label: string;
  value: ReactNode;
}>) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
        {label}
      </dt>
      <dd className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
        {value}
      </dd>
    </div>
  );
}
