"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

export type WorkStyle = CSSProperties & {
  "--accent"?: string;
};

export type ToastState = {
  title: string;
  body: string;
  tone: "success" | "info" | "error";
};

export type PanelSectionProps = {
  [key: `data-${string}`]: string | undefined;
};

export const workAccent = "var(--accent-green)";
export const referenceAccent = "var(--accent-cyan)";
export const warningAccent = "var(--accent-orange)";
export const riskAccent = "var(--accent-red)";
export const mutedAccent = "var(--text-muted)";

export const buttonBaseClass =
  "inline-flex min-h-11 items-center justify-center rounded-[12px] border px-4 text-[11px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50";

export const primaryButtonClass = cn(
  buttonBaseClass,
  "border-[rgba(66,184,131,.36)] bg-[rgba(66,184,131,.92)] text-[var(--bg-app)] hover:bg-[rgba(66,184,131,1)]",
);

export const secondaryButtonClass = cn(
  buttonBaseClass,
  "border-[var(--border-subtle)] bg-[rgba(18,28,43,.82)] text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]",
);

export const quietButtonClass =
  "inline-flex min-h-9 items-center justify-center rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.58)] px-3 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50";

export const inputClass =
  "mt-1 min-h-11 w-full rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.62)] px-3 text-[12px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--focus-ring)] disabled:opacity-60";

export const textareaClass = cn(inputClass, "min-h-[104px] py-3");

export function accentStyle(accent: string): WorkStyle {
  return { "--accent": accent };
}

export function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}`;
}

export function empty(value: string) {
  return value.trim().length === 0;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function matchesSearch(values: readonly string[], query: string) {
  if (!query) {
    return true;
  }

  return normalize(values.join(" ")).includes(query);
}

export function normalize(value: string) {
  return value.toLowerCase().trim();
}

export function optionLabel(value: string) {
  return value
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function splitLines(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
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

export function Pill({
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

export function Panel({
  title,
  subtitle,
  badge,
  children,
  className,
  sectionProps,
}: Readonly<{
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
  sectionProps?: PanelSectionProps;
}>) {
  const id = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-section`;

  return (
    <section
      {...sectionProps}
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

export function Metric({
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

export function TagList({
  tags,
  accent = referenceAccent,
}: Readonly<{ tags: readonly string[]; accent?: string }>) {
  if (tags.length === 0) {
    return <Pill quiet>No tags</Pill>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Pill accent={accent} key={tag}>
          {tag}
        </Pill>
      ))}
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

export function Toast({
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
