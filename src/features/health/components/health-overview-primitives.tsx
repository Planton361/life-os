import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { Pill, accentStyle } from "@/components/layout/route-page-primitives";
import { cn } from "@/lib/cn";
import type { HealthAccent, HealthMetricViewModel } from "../types";

type HealthStyle = CSSProperties & {
  "--bar-height"?: string;
};

function titleId(title: string) {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-heading`;
}

export function HealthPanel({
  title,
  subtitle,
  badge,
  accent,
  children,
  className,
}: Readonly<{
  title: string;
  subtitle: string;
  badge?: string;
  accent: HealthAccent;
  children: ReactNode;
  className?: string;
}>) {
  const id = titleId(title);

  return (
    <section
      aria-labelledby={id}
      className={cn(
        "min-w-0 overflow-hidden rounded-[18px] border border-[color-mix(in_srgb,var(--accent)_24%,var(--border-subtle))] bg-[rgba(15,23,36,.76)] shadow-[0_8px_22px_rgba(0,0,0,.12)] xl:flex xl:min-h-0 xl:flex-col min-[1900px]:h-full",
        className,
      )}
      style={accentStyle(accent)}
    >
      <div className="border-b border-[var(--border-subtle)] bg-[linear-gradient(90deg,color-mix(in_srgb,var(--accent)_9%,rgba(18,28,43,.76)),rgba(18,28,43,.50)_62%)] px-4 py-3">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              className="truncate text-[17px] font-semibold leading-5 text-[var(--text-primary)]"
              id={id}
            >
              {title}
            </h2>
            <p className="mt-1 text-[10px] leading-4 text-[var(--text-secondary)]">
              {subtitle}
            </p>
          </div>
          {badge ? (
            <Pill accent={accent}>{badge}</Pill>
          ) : null}
        </div>
      </div>
      <div className="min-w-0 p-3 xl:flex xl:min-h-0 xl:flex-1 xl:flex-col min-[1900px]:p-4">
        {children}
      </div>
    </section>
  );
}

export function HealthMetricCard({
  metric,
}: Readonly<{
  metric: HealthMetricViewModel;
}>) {
  return (
    <article
      className="min-w-0 rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_20%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_6%,rgba(11,17,28,.46))] px-3 py-2"
      style={accentStyle(metric.accent)}
    >
      <p className="truncate text-[10px] font-semibold text-[var(--text-muted)]">
        {metric.label}
      </p>
      <p className="mt-1 truncate text-[18px] font-semibold leading-5 text-[var(--text-primary)] xl:text-[16px]">
        {metric.value}
      </p>
      <p className="mt-0.5 truncate text-[10px] leading-4 text-[var(--text-secondary)]">
        {metric.detail}
      </p>
    </article>
  );
}

export function SectionEmptyState({
  title = "Noch keine Eintraege",
  description = "Erfasse den ersten Eintrag, sobald du diesen Bereich nutzt.",
  className,
}: Readonly<{
  title?: string;
  description?: string;
  className?: string;
}>) {
  return (
    <div
      className={cn(
        "rounded-[13px] border border-dashed border-[var(--border-subtle)] bg-[rgba(11,17,28,.34)] px-3 py-3",
        className,
      )}
    >
      <p className="text-[12px] font-semibold text-[var(--text-primary)]">
        {title}
      </p>
      <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
        {description}
      </p>
    </div>
  );
}

export function ActionLink({
  href,
  children,
  accent = "var(--accent-cyan)",
}: Readonly<{
  href: `/${string}`;
  children: ReactNode;
  accent?: HealthAccent;
}>) {
  return (
    <Link
      className="inline-flex min-h-8 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--accent)_9%,rgba(18,28,43,.78))] px-3 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[color-mix(in_srgb,var(--accent)_42%,transparent)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
      href={href}
      style={accentStyle(accent)}
    >
      {children}
    </Link>
  );
}

export function DotRhythm({
  label,
  pattern,
  accent,
  dense = false,
}: Readonly<{
  label: string;
  pattern: readonly boolean[];
  accent: HealthAccent;
  dense?: boolean;
}>) {
  return (
    <div
      aria-label={label}
      className={cn("flex items-center gap-1", dense && "gap-0.5")}
      role="img"
      style={accentStyle(accent)}
    >
      {pattern.map((active, index) => (
        <span
          aria-hidden="true"
          className={cn(
            "rounded-full",
            dense ? "size-1.5" : "size-2",
            active
              ? "bg-[var(--accent)] opacity-90"
              : "bg-[rgba(82,97,120,.56)] opacity-70",
          )}
          key={`${label}-${index}`}
        />
      ))}
    </div>
  );
}

function sparklinePoints(values: readonly number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x =
        values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
      const y = 36 - ((value - min) / range) * 28;

      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function Sparkline({
  title,
  values,
  accent,
}: Readonly<{
  title: string;
  values: readonly number[];
  accent: HealthAccent;
}>) {
  const points = sparklinePoints(values);

  return (
    <svg
      aria-label={`${title}: ${values.join(", ")}`}
      className="h-16 w-full overflow-visible min-[1900px]:h-24"
      role="img"
      style={accentStyle(accent)}
      viewBox="0 0 100 42"
    >
      <polyline
        aria-hidden="true"
        fill="none"
        points="0,36 100,36"
        stroke="rgba(148,163,184,.14)"
        strokeWidth="1"
      />
      <polyline
        aria-hidden="true"
        fill="none"
        points={points}
        stroke="var(--accent)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
      />
      {values.map((value, index) => {
        const point = points.split(" ")[index];
        const [cx, cy] = point.split(",");

        return (
          <circle
            aria-hidden="true"
            cx={cx}
            cy={cy}
            fill="var(--accent)"
            key={`${title}-${value}-${index}`}
            r="1.8"
          />
        );
      })}
    </svg>
  );
}

export function barHeightStyle(value: number): HealthStyle {
  return {
    "--bar-height": `${Math.max(12, Math.min(100, value * 100))}%`,
  };
}
