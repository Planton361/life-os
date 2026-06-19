import {
  EmptyState,
  Pill,
  accentStyle,
} from "@/components/layout/route-page-primitives";
import { cn } from "@/lib/cn";
import {
  portfolioAreaMeta,
  portfolioFocusLabels,
  portfolioStatusMeta,
  portfolioTypeAccent,
  portfolioTypeLabels,
} from "../portfolio-style";
import type { PortfolioEntity } from "../types";

function progressWidth(progress: number) {
  return `${Math.max(0, Math.min(100, progress))}%`;
}

export function PortfolioEntityList({
  entities,
  selectedEntityId,
  activeViewLabel,
  onSelectEntity,
}: Readonly<{
  entities: PortfolioEntity[];
  selectedEntityId: string | null;
  activeViewLabel: string;
  onSelectEntity: (entityId: string) => void;
}>) {
  return (
    <section
      aria-labelledby="active-portfolio-heading"
      className="overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.82)] shadow-[0_8px_22px_rgba(0,0,0,.12)] xl:min-h-0"
    >
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] px-3 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2
              className="text-[16px] font-semibold leading-5 text-[var(--text-primary)]"
              id="active-portfolio-heading"
            >
              Active Portfolio
            </h2>
            <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-muted)]">
              Projects stay grouped by next action and risk.
            </p>
          </div>
          <Pill accent="var(--accent-orange)">{activeViewLabel} view</Pill>
        </div>
      </div>

      <div className="grid gap-2 p-2.5 xl:max-h-[calc(100dvh-25rem)] xl:overflow-y-auto">
        {entities.length > 0 ? (
          entities.map((entity) => {
            const typeAccent = portfolioTypeAccent[entity.type];
            const area = portfolioAreaMeta[entity.area];
            const status = portfolioStatusMeta[entity.status];
            const selected = entity.id === selectedEntityId;

            return (
              <button
                aria-pressed={selected}
                className={cn(
                  "w-full rounded-[14px] border bg-[rgba(11,17,28,.46)] p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
                  selected
                    ? "border-[color-mix(in_srgb,var(--accent)_44%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,rgba(18,28,43,.78))]"
                    : "border-[var(--border-subtle)] hover:border-[color-mix(in_srgb,var(--accent)_28%,transparent)] hover:bg-[rgba(18,28,43,.62)]",
                )}
                key={entity.id}
                onClick={() => onSelectEntity(entity.id)}
                style={accentStyle(typeAccent)}
                type="button"
              >
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="size-2 shrink-0 rounded-full bg-[var(--accent)]"
                      />
                      <h3 className="truncate text-[14px] font-semibold leading-5 text-[var(--text-primary)]">
                        {entity.title}
                      </h3>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[var(--text-secondary)]">
                      {entity.description}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                    {selected ? (
                      <Pill accent={typeAccent}>selected</Pill>
                    ) : null}
                    <Pill accent={typeAccent}>
                      {portfolioTypeLabels[entity.type]}
                    </Pill>
                    <Pill accent={area.accent}>{area.label}</Pill>
                    <Pill accent={status.accent}>{status.label}</Pill>
                  </div>
                </div>

                <dl className="mt-3 grid gap-2 text-[10px] leading-4 text-[var(--text-secondary)] sm:grid-cols-4">
                  <div className="min-w-0">
                    <dt className="font-semibold text-[var(--text-muted)]">
                      Next Action
                    </dt>
                    <dd className="mt-0.5 truncate">{entity.nextAction}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="font-semibold text-[var(--text-muted)]">
                      Open / Count
                    </dt>
                    <dd className="mt-0.5 truncate">{entity.countLabel}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="font-semibold text-[var(--text-muted)]">
                      Due
                    </dt>
                    <dd className="mt-0.5 truncate">{entity.dueLabel}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="font-semibold text-[var(--text-muted)]">
                      Last touched
                    </dt>
                    <dd className="mt-0.5 truncate">{entity.lastTouched}</dd>
                  </div>
                </dl>

                <div className="mt-3 grid gap-1.5">
                  <div className="flex items-center justify-between gap-3 text-[10px] leading-4">
                    <span className="font-semibold text-[var(--text-muted)]">
                      {entity.priority} / {portfolioFocusLabels[entity.focusLevel]}
                    </span>
                    <span className="font-semibold text-[var(--text-secondary)]">
                      {entity.progress}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(148,163,184,.14)]">
                    <div
                      aria-hidden="true"
                      className="h-full rounded-full bg-[var(--accent)]"
                      style={{ width: progressWidth(entity.progress) }}
                    />
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <EmptyState
            description="Adjust the entity type or scope filter. Portfolio keeps the context panel available when the list is empty."
            title="No entities match this scope"
          />
        )}
      </div>
    </section>
  );
}
