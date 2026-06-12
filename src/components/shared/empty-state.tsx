import { CircleDashed } from "lucide-react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  className?: string;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-border bg-[var(--life-surface-subtle)] p-5 text-sm",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-lg border border-border bg-background p-2 text-muted-foreground">
          <CircleDashed className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-6 text-foreground">
            {title}
          </h2>
          <p className="mt-1 leading-6 text-muted-foreground">{description}</p>
          {actionLabel ? (
            <p className="mt-3 font-medium text-foreground">{actionLabel}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
