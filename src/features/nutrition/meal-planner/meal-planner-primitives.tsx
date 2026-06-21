import type { CSSProperties, ReactNode } from "react";
import { accentStyle } from "@/components/layout/route-page-primitives";
import { cn } from "@/lib/cn";
import type { NutritionAccent } from "./meal-planner-types";

type PlannerStyle = CSSProperties & {
  "--progress-width"?: string;
};

export function progressStyle(value: number): PlannerStyle {
  return {
    "--progress-width": `${Math.max(0, Math.min(100, value))}%`,
  };
}

export const buttonBaseClass =
  "inline-flex min-h-11 items-center justify-center rounded-[12px] border px-4 text-[11px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50";

export const primaryButtonClass = cn(
  buttonBaseClass,
  "border-[rgba(216,180,90,.30)] bg-[rgba(217,146,79,.92)] text-[var(--bg-app)] hover:bg-[rgba(217,146,79,1)]",
);

export const secondaryButtonClass = cn(
  buttonBaseClass,
  "border-[var(--border-subtle)] bg-[rgba(18,28,43,.82)] text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]",
);

export const quietButtonClass = cn(
  buttonBaseClass,
  "border-transparent bg-transparent text-[var(--text-muted)] hover:border-[var(--border-subtle)] hover:bg-[rgba(168,183,204,.04)] hover:text-[var(--text-secondary)]",
);

export const chipButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-full border px-3 text-[11px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]";

export const inputClass =
  "min-h-11 w-full rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.72)] px-3 text-[12px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--focus-ring)]";

export function PlannerPanel({
  title,
  subtitle,
  children,
  badge,
  className,
  bodyClassName,
}: Readonly<{
  title: string;
  subtitle?: string;
  children: ReactNode;
  badge?: ReactNode;
  className?: string;
  bodyClassName?: string;
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
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.44)] px-4 py-3">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              className="truncate text-[17px] font-semibold leading-6 text-[var(--text-primary)]"
              id={headingId}
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
      <div className={cn("min-w-0 p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function PlannerPill({
  children,
  accent = "var(--accent-yellow)",
  quiet = false,
}: Readonly<{
  children: ReactNode;
  accent?: NutritionAccent;
  quiet?: boolean;
}>) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full border px-2.5 text-[10px] font-semibold text-[var(--text-secondary)]",
        quiet
          ? "border-[var(--border-subtle)] bg-[rgba(168,183,204,.05)]"
          : "border-[color-mix(in_srgb,var(--accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]",
      )}
      style={accentStyle(accent)}
    >
      {children}
    </span>
  );
}

export function ProgressBar({
  value,
  label,
  accent = "var(--accent-yellow)",
}: Readonly<{
  value: number;
  label: string;
  accent?: NutritionAccent;
}>) {
  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.min(100, Math.max(0, value))}
      className="h-1.5 overflow-hidden rounded-full bg-[rgba(23,34,53,.92)]"
      role="meter"
      style={{ ...accentStyle(accent), ...progressStyle(value) }}
    >
      <span
        aria-hidden="true"
        className="block h-full w-[var(--progress-width)] rounded-full bg-[var(--accent)]"
      />
    </div>
  );
}
