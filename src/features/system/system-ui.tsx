"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

export type SystemStyle = CSSProperties & {
  "--accent"?: string;
  "--progress-width"?: string;
};

export type ToastState = {
  title: string;
  body: string;
  tone: "success" | "info" | "error";
};

type DataAttributes = Record<`data-${string}`, string | undefined>;

export function accentStyle(accent: string): SystemStyle {
  return { "--accent": accent };
}

export function progressStyle(value: number, accent: string): SystemStyle {
  return {
    "--accent": accent,
    "--progress-width": `${Math.max(0, Math.min(100, value))}%`,
  };
}

export function createLocalId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export function normalize(value: string) {
  return value.toLowerCase().trim();
}

export function matchesQuery(values: readonly string[], query: string) {
  if (!query.trim()) {
    return true;
  }

  return normalize(values.join(" ")).includes(normalize(query));
}

export function optionLabel(value: string) {
  return value
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export const buttonBaseClass =
  "inline-flex min-h-11 items-center justify-center rounded-[12px] border px-4 text-[11px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50";

export const primaryButtonClass = cn(
  buttonBaseClass,
  "border-[color-mix(in_srgb,var(--accent)_36%,transparent)] bg-[color-mix(in_srgb,var(--accent)_88%,var(--text-primary))] text-[var(--bg-app)] hover:bg-[color-mix(in_srgb,var(--accent)_100%,var(--text-primary))]",
);

export const secondaryButtonClass = cn(
  buttonBaseClass,
  "border-[var(--border-subtle)] bg-[rgba(18,28,43,.82)] text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]",
);

export const quietButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.58)] px-3 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50";

export const chipButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-full border px-3 text-[10px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]";

export const inputClass =
  "mt-1 min-h-11 w-full rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.66)] px-3 text-[12px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--focus-ring)] disabled:opacity-60";

export const textareaClass = cn(inputClass, "min-h-[104px] py-3");

export function SystemPageShell({
  accent,
  children,
  dataAttributes,
  id,
}: Readonly<{
  accent: string;
  children: ReactNode;
  dataAttributes?: DataAttributes;
  id?: string;
}>) {
  return (
    <div
      id={id}
      className="mx-auto flex w-full max-w-[2208px] flex-col gap-3 pb-8"
      style={accentStyle(accent)}
      {...dataAttributes}
    >
      {children}
    </div>
  );
}

export function SystemPageHeader({
  eyebrow,
  title,
  summary,
  primaryAction,
  secondaryActions,
}: Readonly<{
  eyebrow: string;
  title: string;
  summary: string;
  primaryAction: ReactNode;
  secondaryActions?: ReactNode;
}>) {
  return (
    <header className="overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.78)] shadow-[0_8px_22px_rgba(0,0,0,.12)]">
      <div className="grid gap-4 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--accent)_8%,transparent),transparent_48%)] px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
            {eyebrow}
          </p>
          <h1 className="mt-1 text-[30px] font-semibold leading-none text-[var(--text-primary)]">
            {title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            {summary}
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

export function SystemPanel({
  title,
  subtitle,
  badge,
  children,
  className,
  bodyClassName,
  dataAttributes,
}: Readonly<{
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  dataAttributes?: DataAttributes;
}>) {
  const id = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-section`;

  return (
    <section
      aria-labelledby={id}
      className={cn(
        "min-w-0 overflow-hidden rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[var(--surface-1)] shadow-[0_8px_22px_rgba(0,0,0,.12)]",
        className,
      )}
      {...dataAttributes}
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
      <div className={cn("min-w-0 p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function Pill({
  children,
  accent = "var(--accent)",
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

export function StatusPill({
  children,
  accent,
}: Readonly<{ children: ReactNode; accent: string }>) {
  return <Pill accent={accent}>{children}</Pill>;
}

export function CurrencyPill({ amount }: Readonly<{ amount: number }>) {
  return <Pill accent="var(--accent-yellow)">{amount} LC</Pill>;
}

export function FieldLabel({
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

export function EmptyState({
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

export function ProgressBar({
  value,
  label,
  accent = "var(--accent)",
}: Readonly<{
  value: number;
  label: string;
  accent?: string;
}>) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-[10px] text-[var(--text-muted)]">
        <span>{label}</span>
        <span>{Math.round(value)}%</span>
      </div>
      <div
        aria-label={label}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={Math.min(100, Math.max(0, value))}
        className="h-1.5 overflow-hidden rounded-full bg-[rgba(23,34,53,.92)]"
        role="meter"
        style={progressStyle(value, accent)}
      >
        <span
          aria-hidden="true"
          className="block h-full w-[var(--progress-width)] rounded-full bg-[var(--accent)]"
        />
      </div>
    </div>
  );
}

function dialogBackdropClose(
  event: MouseEvent<HTMLDialogElement>,
  onClose: () => void,
) {
  if (event.target === event.currentTarget) {
    onClose();
  }
}

export function DialogShell({
  children,
  labelledBy,
  onClose,
  open,
}: Readonly<{
  children: ReactNode;
  labelledBy: string;
  onClose: () => void;
  open: boolean;
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

    return () => {
      if (dialog.open) {
        dialog.close();
      }
    };
  }, [open]);

  return (
    <dialog
      aria-labelledby={labelledBy}
      className="w-[min(720px,calc(100vw-24px))] rounded-[18px] border border-[var(--border-default)] bg-[var(--surface-1)] p-0 text-[var(--text-primary)] shadow-[0_24px_80px_rgba(0,0,0,.52)] backdrop:bg-[rgba(3,7,18,.72)]"
      onCancel={onClose}
      onMouseDown={(event) => dialogBackdropClose(event, onClose)}
      ref={dialogRef}
    >
      {children}
    </dialog>
  );
}

export function Toast({ toast }: Readonly<{ toast: ToastState | null }>) {
  if (!toast) {
    return null;
  }

  const accent =
    toast.tone === "success"
      ? "var(--accent-green)"
      : toast.tone === "error"
        ? "var(--accent-red)"
        : "var(--accent-cyan)";

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 max-w-sm rounded-[14px] border border-[color-mix(in_srgb,var(--accent)_28%,var(--border-subtle))] bg-[rgba(15,23,36,.96)] p-4 shadow-[0_18px_48px_rgba(0,0,0,.42)]"
      style={accentStyle(accent)}
    >
      <p className="text-sm font-semibold text-[var(--text-primary)]">
        {toast.title}
      </p>
      <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
        {toast.body}
      </p>
    </div>
  );
}

export function LocalMockNotice({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <p className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(168,183,204,.045)] px-3 py-2 text-[10px] leading-4 text-[var(--text-muted)]">
      {children}
    </p>
  );
}
