import { cn } from "@/lib/cn";

type DashboardCardPlaceholderProps = {
  title: string;
  priority: string;
  accent: string;
  className?: string;
  dominant?: boolean;
  quiet?: boolean;
};

export function DashboardCardPlaceholder({
  title,
  priority,
  accent,
  className,
  dominant = false,
  quiet = false,
}: Readonly<DashboardCardPlaceholderProps>) {
  return (
    <article
      className={cn(
        "flex min-h-[154px] flex-col justify-between rounded-[var(--card-radius)] border bg-[var(--surface-1)] p-4",
        dominant
          ? "border-[var(--border-strong)] bg-[var(--surface-2)]"
          : "border-[var(--border-default)]",
        quiet && "bg-[var(--bg-shell)] text-[var(--text-secondary)]",
        className,
      )}
    >
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {priority}
          </p>
          <span
            className="rounded-full border border-[var(--border-default)] px-2 py-1 text-[11px] font-medium text-[var(--text-secondary)]"
            style={{ borderColor: accent }}
          >
            Reserved
          </span>
        </div>
        <h2
          className={cn(
            "mt-4 font-semibold tracking-normal text-[var(--text-primary)]",
            dominant ? "text-2xl" : "text-lg",
          )}
        >
          {title}
        </h2>
      </div>
      <div aria-hidden="true" className="mt-6 space-y-2">
        <div
          className={cn(
            "h-px rounded-full",
            quiet ? "bg-[var(--border-subtle)]" : "bg-[var(--border-default)]",
          )}
        />
        <div
          className={cn(
            "h-px rounded-full",
            dominant ? "w-2/3" : "w-1/2",
            quiet ? "bg-[var(--border-subtle)]" : "bg-[var(--border-default)]",
          )}
        />
      </div>
    </article>
  );
}
