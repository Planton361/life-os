import { Badge } from "@/components/ui/badge";
import type { CompactListItem } from "@/features/dashboard/types";
import { cn } from "@/lib/utils";

interface CompactListProps {
  items: CompactListItem[];
  variant?: "default" | "today";
  className?: string;
}

const accentClass: Record<string, string> = {
  education: "border-education/20 bg-education/10 text-education",
  work: "border-work/20 bg-work/10 text-work",
  coding: "border-coding/20 bg-coding/10 text-coding",
  agent: "border-agent/20 bg-agent/10 text-agent",
  health: "border-health/20 bg-health/10 text-health",
  nutrition: "border-nutrition/20 bg-nutrition/10 text-nutrition",
  personal: "border-personal/20 bg-personal/10 text-personal",
  review: "border-system/20 bg-system/10 text-system",
  system: "border-system/20 bg-system/10 text-system",
};

const accentDotClass: Record<string, string> = {
  education: "bg-education",
  work: "bg-work",
  coding: "bg-coding",
  agent: "bg-agent",
  health: "bg-health",
  nutrition: "bg-nutrition",
  personal: "bg-personal",
  review: "bg-system",
  system: "bg-system",
};

export function CompactList({
  items,
  variant = "default",
  className,
}: CompactListProps) {
  return (
    <ul className={cn(variant === "today" ? "space-y-2" : "space-y-3", className)}>
      {items.map((item) => (
        <li
          key={`${item.title}-${item.label ?? item.priority ?? "item"}`}
          className={cn(
            "relative overflow-hidden rounded-xl border border-border/70 bg-[var(--life-surface-subtle)] p-3",
            variant === "today" && "border-border bg-background pl-4"
          )}
        >
          {variant === "today" && item.area ? (
            <span
              className={cn(
                "absolute inset-y-3 left-0 w-1 rounded-r-full",
                accentDotClass[item.area]
              )}
              aria-hidden="true"
            />
          ) : null}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className={cn(
                  "text-sm font-medium leading-5 text-foreground",
                  variant === "today" && "font-semibold"
                )}
              >
                {item.title}
              </p>
              {item.meta?.length ? (
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {item.meta.join(" · ")}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
              {item.priority && item.priority !== "none" ? (
                <Badge variant="outline" className="bg-background">
                  {item.priority}
                </Badge>
              ) : null}
              {item.label ? (
                <Badge
                  variant="outline"
                  className={cn(item.area ? accentClass[item.area] : "")}
                >
                  {item.label}
                </Badge>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
