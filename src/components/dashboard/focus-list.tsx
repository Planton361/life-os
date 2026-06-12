import { Badge } from "@/components/ui/badge";
import type { FocusItem } from "@/features/dashboard/types";

interface FocusListProps {
  items: FocusItem[];
}

export function FocusList({ items }: FocusListProps) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.title}
          className="rounded-xl border border-border/70 bg-[var(--life-surface-subtle)] p-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium leading-5 text-foreground">
                {item.title}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {item.mode} · {item.duration}
              </p>
            </div>
            <Badge variant="outline" className="bg-background">
              {item.mode}
            </Badge>
          </div>
        </li>
      ))}
    </ul>
  );
}
