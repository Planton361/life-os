import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

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

export function Panel({
  title,
  subtitle,
  children,
  className,
  headerAccessory,
  titleClassName,
}: Readonly<{
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  headerAccessory?: ReactNode;
  titleClassName?: string;
}>) {
  return (
    <section
      aria-labelledby={`${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-title`}
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
              id={`${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-title`}
            >
              {title}
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
