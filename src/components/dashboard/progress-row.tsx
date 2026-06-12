import { Badge } from "@/components/ui/badge";
import { MiniProgress } from "@/components/visualization/mini-progress";
import type { ProgressItem } from "@/features/dashboard/types";

interface ProgressRowProps {
  item: ProgressItem;
}

export function ProgressRow({ item }: ProgressRowProps) {
  return (
    <div className="rounded-xl border border-border/70 bg-[var(--life-surface-subtle)] p-3">
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <p className="text-sm font-medium leading-5 text-foreground">
          {item.title}
        </p>
        {item.status ? (
          <Badge variant="outline" className="bg-background">
            {item.status}
          </Badge>
        ) : null}
      </div>
      {typeof item.progress === "number" ? (
        <MiniProgress value={item.progress} label="Fortschritt" />
      ) : (
        <p className="text-xs leading-5 text-muted-foreground">
          Noch ohne Prozentwert. Nächster Schritt wird später gesetzt.
        </p>
      )}
    </div>
  );
}
