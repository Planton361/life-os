import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type RouteAccentStyle = CSSProperties & {
  "--accent"?: string;
};

export function accentStyle(accent: string): RouteAccentStyle {
  return {
    "--accent": accent,
  };
}

function titleId(title: string) {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-section`;
}

export function RoutePage({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 pb-8 lg:gap-5">
      {children}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  summary,
}: Readonly<{
  eyebrow: string;
  title: string;
  summary: string;
}>) {
  return (
    <header className="rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[var(--surface-1)] px-5 py-5 shadow-[0_8px_22px_rgba(0,0,0,.12)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
        {eyebrow}
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">
        {title}
      </h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
        {summary}
      </p>
    </header>
  );
}

export function SectionPanel({
  title,
  subtitle,
  children,
  className,
}: Readonly<{
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}>) {
  const id = titleId(title);

  return (
    <section
      aria-labelledby={id}
      className={cn(
        "overflow-hidden rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[var(--surface-1)] shadow-[0_8px_22px_rgba(0,0,0,.12)]",
        className,
      )}
    >
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(14,23,38,.80)] px-5 py-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]" id={id}>
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function EmptyState({
  title,
  description,
}: Readonly<{
  title: string;
  description: string;
}>) {
  return (
    <div className="rounded-[13px] border border-dashed border-[var(--border-default)] bg-[rgba(168,183,204,.05)] p-4">
      <p className="text-sm font-semibold text-[var(--text-secondary)]">{title}</p>
      <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
        {description}
      </p>
    </div>
  );
}

export function Pill({
  children,
  accent = "var(--accent-blue)",
  quiet = false,
}: Readonly<{
  children: ReactNode;
  accent?: string;
  quiet?: boolean;
}>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold text-[var(--text-secondary)]",
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
