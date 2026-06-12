import { cn } from "@/lib/utils";

interface MiniProgressProps {
  value: number;
  label: string;
  className?: string;
}

export function MiniProgress({ value, label, className }: MiniProgressProps) {
  const safeValue = Math.max(0, Math.min(value, 100));

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="font-medium text-foreground">{safeValue}%</span>
      </div>
      <div
        className="h-2 rounded-full bg-muted"
        role="progressbar"
        aria-label={`${label}: ${safeValue}%`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeValue}
      >
        <div
          className="h-full rounded-full bg-foreground"
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}
