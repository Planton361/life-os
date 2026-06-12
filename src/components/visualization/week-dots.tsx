import type { WeekDot } from "@/features/dashboard/types";
import { cn } from "@/lib/utils";

interface WeekDotsProps {
  days: WeekDot[];
  summary: string;
  className?: string;
}

const statusClass: Record<WeekDot["status"], string> = {
  done: "bg-work text-white",
  planned: "bg-health text-white",
  open: "border border-border bg-background text-muted-foreground",
};

export function WeekDots({ days, summary, className }: WeekDotsProps) {
  return (
    <div
      className={cn(
        "space-y-2 rounded-xl border border-border/70 bg-[var(--life-surface-subtle)] p-3",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2" aria-label={summary}>
        {days.map((day) => (
          <div key={day.label} className="flex flex-col items-center gap-1">
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-[0.66rem] font-medium",
                statusClass[day.status]
              )}
              aria-hidden="true"
            >
              {day.label}
            </span>
            <span className="sr-only">
              {day.label}: {day.status}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs leading-5 text-muted-foreground">{summary}</p>
    </div>
  );
}
