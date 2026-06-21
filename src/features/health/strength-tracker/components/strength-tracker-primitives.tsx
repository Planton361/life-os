import type { CSSProperties, ReactNode } from "react";
import { Pill, accentStyle } from "@/components/layout/route-page-primitives";
import { cn } from "@/lib/cn";
import type {
  StrengthAccent,
  StrengthActionViewModel,
  StrengthChipViewModel,
  StrengthSummaryMetricViewModel,
} from "../strength-tracker-types";

type StrengthStyle = CSSProperties & {
  "--progress-width"?: string;
  "--bar-height"?: string;
};

function titleId(title: string) {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-section`;
}

export function progressStyle(value: number): StrengthStyle {
  return {
    "--progress-width": `${Math.max(0, Math.min(100, value))}%`,
  };
}

export function barHeightStyle(value: number): StrengthStyle {
  return {
    "--bar-height": `${Math.max(10, Math.min(100, value))}%`,
  };
}

export function StrengthPanel({
  title,
  subtitle,
  badge,
  accent = "var(--accent-orange)",
  children,
  className,
  bodyClassName,
  p0 = false,
}: Readonly<{
  title: string;
  subtitle?: string;
  badge?: string;
  accent?: StrengthAccent;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  p0?: boolean;
}>) {
  const id = titleId(title);

  return (
    <section
      aria-labelledby={id}
      className={cn(
        "min-w-0 overflow-hidden rounded-[18px] border bg-[rgba(15,23,36,.82)] shadow-[0_8px_22px_rgba(0,0,0,.12)]",
        p0
          ? "border-[color-mix(in_srgb,var(--accent)_34%,var(--border-subtle))]"
          : "border-[color-mix(in_srgb,var(--accent)_18%,var(--border-subtle))]",
        className,
      )}
      style={accentStyle(accent)}
    >
      <div
        className={cn(
          "border-b border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--accent)_7%,rgba(18,28,43,.74))] px-4 py-3 xl:px-3 xl:py-2",
          p0 &&
            "bg-[color-mix(in_srgb,var(--accent)_10%,rgba(18,28,43,.82))]",
        )}
      >
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              className={cn(
                "font-semibold text-[var(--text-primary)]",
                p0
                  ? "text-xl leading-6 xl:text-[17px] xl:leading-5"
                  : "text-[15px] leading-5 xl:text-[13px] xl:leading-4",
              )}
              id={id}
            >
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 max-w-3xl text-[11px] leading-4 text-[var(--text-secondary)] xl:text-[10px] xl:leading-3">
                {subtitle}
              </p>
            ) : null}
          </div>
          {badge ? <Pill accent={accent}>{badge}</Pill> : null}
        </div>
      </div>
      <div
        className={cn(
          p0 ? "p-4 sm:p-5 xl:p-3" : "p-3 xl:p-2.5",
          bodyClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}

export function StrengthMetricCard({
  metric,
  compact = false,
}: Readonly<{
  metric: StrengthSummaryMetricViewModel;
  compact?: boolean;
}>) {
  return (
    <article
      className={cn(
        "min-w-0 rounded-[13px] border border-[color-mix(in_srgb,var(--accent)_20%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_6%,rgba(11,17,28,.54))]",
        compact ? "px-2.5 py-2 xl:py-1.5" : "px-3 py-2.5 xl:py-2",
      )}
      style={accentStyle(metric.accent)}
    >
      <p className="truncate text-[10px] font-semibold text-[var(--text-muted)]">
        {metric.label}
      </p>
      <p
        className={cn(
          "mt-1 truncate font-semibold leading-5 text-[var(--text-primary)] xl:mt-0.5",
          compact ? "text-[15px] xl:text-[13px]" : "text-[18px] xl:text-[16px]",
        )}
      >
        {metric.value}
      </p>
      <p className="mt-0.5 truncate text-[10px] leading-4 text-[var(--text-secondary)] xl:leading-3">
        {metric.detail}
      </p>
    </article>
  );
}

export function StrengthChip({
  chip,
}: Readonly<{
  chip: StrengthChipViewModel;
}>) {
  const accent = chip.accent ?? "var(--accent-orange)";

  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center rounded-full border px-3 text-[11px] font-semibold xl:min-h-6 xl:px-2.5 xl:text-[10px]",
        chip.active
          ? "border-[color-mix(in_srgb,var(--accent)_42%,transparent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--text-primary)]"
          : "border-[var(--border-subtle)] bg-[rgba(168,183,204,.045)] text-[var(--text-secondary)]",
      )}
      style={accentStyle(accent)}
    >
      {chip.label}
    </span>
  );
}

export function StrengthProgressBar({
  value,
  label,
  accent = "var(--accent-orange)",
}: Readonly<{
  value: number;
  label: string;
  accent?: StrengthAccent;
}>) {
  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={value}
      className="h-1.5 overflow-hidden rounded-full bg-[rgba(82,97,120,.38)]"
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

export function StrengthActionButton({
  action,
}: Readonly<{
  action: StrengthActionViewModel;
}>) {
  return (
    <button
      className={cn(
        "inline-flex min-h-9 items-center justify-center rounded-full border px-4 text-[11px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] xl:min-h-7 xl:px-3 xl:text-[10px]",
        action.variant === "primary" &&
          "border-[rgba(217,146,79,.42)] bg-[rgba(217,146,79,.16)] text-[var(--text-primary)] hover:border-[rgba(217,146,79,.58)]",
        action.variant === "secondary" &&
          "border-[rgba(148,163,184,.18)] bg-[rgba(168,183,204,.06)] text-[var(--text-secondary)] hover:border-[rgba(217,146,79,.32)] hover:text-[var(--text-primary)]",
        action.variant === "quiet" &&
          "border-transparent bg-transparent text-[var(--text-muted)] hover:border-[rgba(148,163,184,.16)] hover:bg-[rgba(168,183,204,.04)] hover:text-[var(--text-secondary)]",
      )}
      type="button"
    >
      {action.label}
    </button>
  );
}

export function Dot({
  accent,
  active = true,
}: Readonly<{
  accent: StrengthAccent;
  active?: boolean;
}>) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-2 rounded-full bg-[var(--accent)]",
        active ? "opacity-90" : "opacity-[.32]",
      )}
      style={accentStyle(accent)}
    />
  );
}
