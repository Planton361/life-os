import { EmptyState } from "@/components/shared/empty-state";

interface PlaceholderPageProps {
  title: string;
  description: string;
  future: string;
}

export function PlaceholderPage({
  title,
  description,
  future,
}: PlaceholderPageProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-2">
      <div>
        <p className="mb-3 text-sm font-medium text-muted-foreground">
          Life OS Bereich
        </p>
        <h1 className="text-3xl font-semibold leading-10 text-foreground">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
          {description}
        </p>
      </div>
      <EmptyState
        title="Noch keine operative Ansicht"
        description={future}
        actionLabel="Diese Seite bleibt in Phase 2 bewusst statisch."
      />
    </div>
  );
}
