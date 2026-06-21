import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type CodingStyle = CSSProperties & {
  "--accent"?: string;
  "--bar-height"?: string;
  "--progress-width"?: string;
};

export function codingStyle(values: CodingStyle): CodingStyle {
  return values;
}

export function accentStyle(accent: string): CodingStyle {
  return {
    "--accent": accent,
  };
}

export const buttonBaseClass =
  "inline-flex min-h-11 items-center justify-center rounded-[12px] border px-4 text-[12px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50";

export const primaryButtonClass = cn(
  buttonBaseClass,
  "border-[rgba(91,124,250,.55)] bg-[rgba(91,124,250,.92)] text-white hover:border-[rgba(91,124,250,.72)] hover:bg-[rgba(91,124,250,1)]",
);

export const secondaryButtonClass = cn(
  buttonBaseClass,
  "border-[var(--border-subtle)] bg-[rgba(18,28,43,.82)] text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]",
);

export const quietButtonClass = cn(
  buttonBaseClass,
  "min-h-9 border-[var(--border-subtle)] bg-[rgba(15,23,36,.42)] px-3 text-[11px] text-[var(--text-muted)] hover:border-[var(--border-default)] hover:text-[var(--text-secondary)]",
);

export const inputClass =
  "mt-1 min-h-11 w-full rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.72)] px-3 text-[12px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--focus-ring)] disabled:opacity-60";

function headingId(title: string) {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-heading`;
}

export function CodingPanel({
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
  const id = headingId(title);

  return (
    <section
      aria-labelledby={id}
      className={cn(
        "min-w-0 overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.84)] shadow-[0_8px_22px_rgba(0,0,0,.12)]",
        className,
      )}
    >
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] px-4 py-3">
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
      <div className="min-w-0 p-4">{children}</div>
    </section>
  );
}

export function CodingPill({
  children,
  accent = "var(--accent-blue)",
  quiet = false,
  className,
}: Readonly<{
  children: ReactNode;
  accent?: string;
  quiet?: boolean;
  className?: string;
}>) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold leading-none text-[var(--text-secondary)]",
        quiet
          ? "border-[var(--border-subtle)] bg-[rgba(148,163,184,.06)]"
          : "border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent)_13%,transparent)] text-[var(--text-primary)]",
        className,
      )}
      style={accentStyle(accent)}
    >
      {children}
    </span>
  );
}

export function StatusDot({
  accent = "var(--accent-blue)",
}: Readonly<{
  accent?: string;
}>) {
  return (
    <span
      aria-hidden="true"
      className="mt-1 size-2 shrink-0 rounded-full bg-[var(--accent)] shadow-[0_0_8px_color-mix(in_srgb,var(--accent)_22%,transparent)]"
      style={accentStyle(accent)}
    />
  );
}

export function FieldLabel({
  children,
  optional,
}: Readonly<{
  children: ReactNode;
  optional?: boolean;
}>) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
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

export function EmptyStateCard({
  title,
  description,
  action,
}: Readonly<{
  title: string;
  description: string;
  action?: ReactNode;
}>) {
  return (
    <div className="rounded-[16px] border border-dashed border-[var(--border-default)] bg-[rgba(18,28,43,.52)] p-4">
      <p className="text-[16px] font-semibold text-[var(--text-primary)]">
        {title}
      </p>
      <p className="mt-2 max-w-xl text-[12px] leading-5 text-[var(--text-muted)]">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
