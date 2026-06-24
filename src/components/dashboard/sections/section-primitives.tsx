import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

const DASHBOARD_LINK_FOCUS_CLASSES =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-cyan)]";

export type AccentStyle = CSSProperties & {
  "--accent"?: string;
  "--progress"?: string;
};

export function styleFor(accent: string, progress?: number): AccentStyle {
  return {
    "--accent": accent,
    "--progress": `${progress ?? 0}%`,
  };
}

export function ProgressBar({
  progress,
  accent,
  quiet = false,
}: Readonly<{
  progress: number;
  accent: string;
  quiet?: boolean;
}>) {
  return (
    <div className="h-1.5 rounded-full bg-[rgba(168,183,204,.18)]">
      <div
        aria-hidden="true"
        className={cn(
          "h-full w-[var(--progress)] rounded-full",
          quiet
            ? "bg-[color-mix(in_srgb,var(--accent)_56%,transparent)]"
            : "bg-[color-mix(in_srgb,var(--accent)_76%,transparent)]",
        )}
        style={styleFor(accent, progress)}
      />
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
        "rounded-full border px-3 py-1 text-[10px] font-medium",
        quiet
          ? "border-[var(--border-subtle)] bg-[rgba(168,183,204,.07)] text-[var(--text-muted)]"
          : "border-[color-mix(in_srgb,var(--accent)_34%,transparent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--text-secondary)]",
      )}
      style={styleFor(accent)}
    >
      {children}
    </span>
  );
}

export function DashboardEmptyState({
  title,
  description,
  className,
}: Readonly<{
  title: string;
  description: string;
  className?: string;
}>) {
  return (
    <div
      className={cn(
        "rounded-[13px] border border-dashed border-[var(--border-default)] bg-[rgba(168,183,204,.05)] p-3",
        className,
      )}
    >
      <p className="text-[11px] font-semibold text-[var(--text-secondary)]">
        {title}
      </p>
      <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
        {description}
      </p>
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  children,
  className,
  headerAccessory,
  titleClassName,
  titleHref,
}: Readonly<{
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  headerAccessory?: ReactNode;
  titleClassName?: string;
  titleHref?: string;
}>) {
  const titleId = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-title`;
  const titleContent = titleHref ? (
    <Link
      className={cn("rounded-sm", DASHBOARD_LINK_FOCUS_CLASSES)}
      href={titleHref}
    >
      {title}
    </Link>
  ) : (
    title
  );

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "overflow-hidden rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[var(--surface-1)] shadow-[0_8px_22px_rgba(0,0,0,.12)]",
        className,
      )}
    >
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(14,23,38,.80)] px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              className={cn(
                "font-semibold text-[var(--text-primary)]",
                titleClassName ?? "text-lg",
              )}
              id={titleId}
            >
              {titleContent}
            </h2>
            {subtitle ? (
              <p className="mt-1 text-[10px] font-semibold text-[var(--text-secondary)]">
                {subtitle}
              </p>
            ) : null}
          </div>
          {headerAccessory ? <div className="min-w-0">{headerAccessory}</div> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
