import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { QuickAction } from "@/features/dashboard/types";

interface QuickActionsProps {
  actions: QuickAction[];
}

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <section
      className="rounded-xl border border-border/80 bg-card p-3 shadow-[var(--shadow-card)]"
      aria-labelledby="quick-actions-title"
    >
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2
            id="quick-actions-title"
            className="text-sm font-semibold leading-5 text-foreground"
          >
            Quick Actions
          </h2>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            Schnell erfassen, ohne den Fokus zu verlieren.
          </p>
        </div>
        <span className="rounded-full border border-border bg-muted px-2 py-1 text-[0.68rem] font-medium text-muted-foreground">
          6
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-3">
        {actions.slice(0, 6).map((action) => (
          <Button
            key={action.label}
            type="button"
            variant="outline"
            className="min-h-12 justify-start gap-2 rounded-lg border-border bg-[var(--life-surface-subtle)] px-2 py-2 text-left hover:bg-background"
            aria-label={`${action.label} erfassen`}
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-foreground text-background">
              <Plus className="size-3.5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold leading-4">
                {action.label}
              </span>
              <span className="block text-[0.68rem] leading-4 text-muted-foreground">
                {action.description}
              </span>
            </span>
          </Button>
        ))}
      </div>
    </section>
  );
}
