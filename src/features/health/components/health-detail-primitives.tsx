import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/route-page-primitives";

export const healthPage =
  "mx-auto grid w-full max-w-[2800px] min-w-0 gap-4 pb-6";
export const healthCard =
  "min-w-0 rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4 sm:p-5";
export const healthInput =
  "min-h-10 min-w-0 w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]";
export const healthButton =
  "inline-flex min-h-10 w-fit items-center justify-center gap-2 justify-self-start rounded-lg border border-[var(--border-default)] bg-[var(--surface-2)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:opacity-50";
export const healthPrimary = `${healthButton} border-[color-mix(in_srgb,var(--accent-cyan)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent-cyan)_12%,var(--surface-1))]`;
export const healthLabel =
  "grid min-w-0 gap-1 text-xs font-semibold text-[var(--text-secondary)]";
export const healthMuted = "text-sm leading-6 text-[var(--text-muted)]";
export function HealthHeader({
  title,
  summary,
  domain,
}: {
  title: string;
  summary: string;
  domain: string;
}) {
  return (
    <>
      <PageHeader
        eyebrow={`Health & Fitness · ${domain}`}
        title={title}
        summary={summary}
      />
      <nav aria-label="Health Navigation" className="flex flex-wrap gap-2">
        <Link className={healthButton} href="/health">
          Health Übersicht
        </Link>
        <Link className={healthButton} href="/dashboard">
          Dashboard
        </Link>
        <Link className={healthButton} href="/calendar">
          Kalender
        </Link>
      </nav>
    </>
  );
}
export function HealthSection({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-label={title} className={`${healthCard} ${className}`}>
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
export function HealthSummary({
  items,
}: {
  items: { label: string; value: ReactNode; detail?: string }[];
}) {
  return (
    <section
      aria-label="Zusammenfassung"
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      {items.map((item) => (
        <article className={healthCard} key={item.label}>
          <p className="text-xs text-[var(--text-muted)]">{item.label}</p>
          <p className="mt-2 text-2xl font-semibold">{item.value}</p>
          {item.detail && (
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {item.detail}
            </p>
          )}
        </article>
      ))}
    </section>
  );
}
