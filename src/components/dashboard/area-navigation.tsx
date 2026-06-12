import Link from "next/link";

import type { AreaNavigationItem } from "@/features/dashboard/types";
import { cn } from "@/lib/utils";

interface AreaNavigationProps {
  items: AreaNavigationItem[];
  className?: string;
}

const accentClass: Record<string, string> = {
  education: "bg-education",
  work: "bg-work",
  coding: "bg-coding",
  health: "bg-health",
  nutrition: "bg-nutrition",
  personal: "bg-personal",
  agent: "bg-agent",
  system: "bg-system",
  review: "bg-system",
};

export function AreaNavigation({ items, className }: AreaNavigationProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border/80 bg-card p-3 shadow-[var(--shadow-card)]",
        className
      )}
      aria-labelledby="area-navigation-title"
    >
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2
            id="area-navigation-title"
            className="text-sm font-semibold leading-5 text-foreground"
          >
            Bereiche
          </h2>
          <p className="text-xs leading-5 text-muted-foreground">
            Schnelle Bereichswechsel.
          </p>
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {items.length} Bereiche
        </span>
      </div>
      <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-lg border border-border/70 bg-[var(--life-surface-subtle)] p-2.5 transition hover:border-[var(--life-border-strong)] hover:bg-background focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="flex items-start gap-3">
              <span
                className={cn("mt-1 size-2 rounded-full", accentClass[item.area])}
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium leading-5 text-foreground">
                  {item.title}
                </span>
                <span className="mt-0.5 block truncate text-xs leading-4 text-muted-foreground">
                  {item.summary}
                </span>
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
