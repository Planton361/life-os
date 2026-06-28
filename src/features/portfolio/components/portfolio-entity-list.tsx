import {
  EmptyState,
  Pill,
  accentStyle,
} from "@/components/layout/route-page-primitives";
import Link from "next/link";
import { cn } from "@/lib/cn";
import type { ContentStateMeta } from "@/features/content-state";
import {
  getPortfolioGroup,
  getPortfolioPrimaryReason,
  portfolioAreaMeta,
  portfolioGroupMeta,
  portfolioGroupOrder,
  portfolioStatusMeta,
  portfolioTypeAccent,
  portfolioTypeLabels,
  portfolioVisibilityReasonMeta,
} from "../portfolio-style";
import type {
  PortfolioEntity,
  PortfolioGroup,
  PortfolioViewModel,
} from "../types";

function progressWidth(progress: number) {
  return `${Math.max(0, Math.min(100, progress))}%`;
}

function getTemporalLabel(entity: PortfolioEntity) {
  if (entity.type === "skill") {
    return `Last practice: ${entity.lastTouched}`;
  }

  return `Due: ${entity.dueLabel} / Touched: ${entity.lastTouched}`;
}

function getProgressLabel(entity: PortfolioEntity) {
  return entity.type === "skill" ? "Practice signal" : "Progress";
}

function groupEntities(entities: PortfolioEntity[]) {
  return portfolioGroupOrder
    .map((group) => ({
      group,
      entities: entities.filter(
        (entity) => getPortfolioGroup(entity) === group,
      ),
    }))
    .filter((group) => group.entities.length > 0);
}

function PortfolioRow({
  entity,
  selected,
  getEntityHref,
}: Readonly<{
  entity: PortfolioEntity;
  selected: boolean;
  getEntityHref: (entityId: string) => `/${string}`;
}>) {
  const typeAccent = portfolioTypeAccent[entity.type];
  const area = portfolioAreaMeta[entity.area];
  const status = portfolioStatusMeta[entity.status];
  const primaryReason = getPortfolioPrimaryReason(entity);
  const reason = portfolioVisibilityReasonMeta[primaryReason];
  const skillContext = entity.skillContext;

  return (
    <Link
      aria-current={selected ? "true" : undefined}
      className={cn(
        "block w-full rounded-[13px] border bg-[rgba(11,17,28,.44)] p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
        selected
          ? "border-[color-mix(in_srgb,var(--accent)_46%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,rgba(18,28,43,.78))]"
          : "border-[var(--border-subtle)] hover:border-[color-mix(in_srgb,var(--accent)_28%,transparent)] hover:bg-[rgba(18,28,43,.62)]",
      )}
      href={getEntityHref(entity.id)}
      style={accentStyle(typeAccent)}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full bg-[var(--accent)]"
            />
            <h4 className="truncate text-[13px] font-semibold leading-5 text-[var(--text-primary)]">
              {entity.title}
            </h4>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] font-semibold leading-4 text-[var(--text-muted)]">
            <span>{portfolioTypeLabels[entity.type]}</span>
            <span aria-hidden="true">/</span>
            <span
              className="text-[var(--accent)]"
              style={accentStyle(area.accent)}
            >
              {area.label}
            </span>
            <span aria-hidden="true">/</span>
            <span>{status.label}</span>
          </p>
        </div>

        <div className="shrink-0">
          <Pill accent={reason.accent}>{reason.label}</Pill>
        </div>
      </div>

      <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-[var(--text-secondary)]">
        <span className="font-semibold text-[var(--text-muted)]">Next:</span>{" "}
        {entity.nextAction}
      </p>

      {entity.type === "skill" ? (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] leading-4 text-[var(--text-muted)]">
          <span>Practice: {skillContext?.practiceStatus ?? status.label}</span>
          <span>Confidence: {skillContext?.confidence ?? "medium"}</span>
          <span>
            Next session: {skillContext?.nextSession ?? entity.nextAction}
          </span>
        </div>
      ) : (
        <p className="mt-2 text-[10px] leading-4 text-[var(--text-muted)]">
          {getTemporalLabel(entity)}
        </p>
      )}

      <div className="mt-2 grid gap-1.5">
        <div className="flex items-center justify-between gap-3 text-[10px] leading-4">
          <span className="font-semibold text-[var(--text-muted)]">
            {getProgressLabel(entity)}
          </span>
          <span className="font-semibold text-[var(--text-secondary)]">
            {entity.progress}%
          </span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-[rgba(148,163,184,.14)]">
          <div
            aria-hidden="true"
            className="h-full rounded-full bg-[var(--accent)]"
            style={{ width: progressWidth(entity.progress) }}
          />
        </div>
      </div>
    </Link>
  );
}

function PortfolioGroupSection({
  group,
  entities,
  selectedEntityId,
  getEntityHref,
}: Readonly<{
  group: PortfolioGroup;
  entities: PortfolioEntity[];
  selectedEntityId: string | null;
  getEntityHref: (entityId: string) => `/${string}`;
}>) {
  const groupMeta = portfolioGroupMeta[group];
  const headingId = `portfolio-group-${group}`;

  return (
    <section aria-labelledby={headingId} className="grid gap-1.5">
      <div className="flex flex-wrap items-end justify-between gap-2 px-1">
        <div className="min-w-0">
          <h3
            className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]"
            id={headingId}
          >
            {groupMeta.label}
          </h3>
          <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-muted)]">
            {groupMeta.description}
          </p>
        </div>
        <Pill accent={groupMeta.accent}>{entities.length}</Pill>
      </div>
      <div className="grid gap-1.5">
        {entities.map((entity) => (
          <PortfolioRow
            entity={entity}
            getEntityHref={getEntityHref}
            key={entity.id}
            selected={entity.id === selectedEntityId}
          />
        ))}
      </div>
    </section>
  );
}

function contentStateAttributes(
  meta: ContentStateMeta,
  profileId: PortfolioViewModel["profileId"],
) {
  return {
    "data-capacity": meta.capacity?.toString() ?? undefined,
    "data-content-state": meta.state,
    "data-item-count": meta.itemCount.toString(),
    "data-profile-id": profileId,
  };
}

function getPortfolioEmptyStateCopy(activeViewLabel: string) {
  const copy: Record<string, { title: string; description: string }> = {
    All: {
      title: "Noch keine Portfolio-Entities",
      description:
        "Tasks, Projekte und Ziele erscheinen hier, sobald sie im lokalen Profil existieren.",
    },
    Tasks: {
      title: "Noch keine Portfolio-Tasks",
      description:
        "Lokale Tasks erscheinen hier, sobald sie eine Portfolio-Relevanz haben.",
    },
    Projects: {
      title: "Noch keine Portfolio-Projekte",
      description:
        "Lokale Projekte erscheinen hier, sobald sie im Profil angelegt sind.",
    },
    Goals: {
      title: "Noch keine Portfolio-Ziele",
      description:
        "Lokale Ziele erscheinen hier, sobald sie im Profil angelegt sind.",
    },
    Skills: {
      title: "Noch keine Skills im Portfolio",
      description:
        "Manual Skills erscheinen hier, sobald sie im Manual-Profil angelegt sind.",
    },
  };

  return copy[activeViewLabel] ?? copy.All;
}

export function PortfolioEntityList({
  entities,
  selectedEntityId,
  activeViewLabel,
  contentState,
  getEntityHref,
  profileId,
}: Readonly<{
  entities: PortfolioEntity[];
  selectedEntityId: string | null;
  activeViewLabel: string;
  contentState: ContentStateMeta;
  getEntityHref: (entityId: string) => `/${string}`;
  profileId: PortfolioViewModel["profileId"];
}>) {
  const groups = groupEntities(entities);
  const emptyStateCopy = getPortfolioEmptyStateCopy(activeViewLabel);

  return (
    <section
      aria-labelledby="active-portfolio-heading"
      className="overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.82)] shadow-[0_8px_22px_rgba(0,0,0,.12)] xl:min-h-0"
      data-portfolio-section="entity-list"
      {...contentStateAttributes(contentState, profileId)}
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
              Grouped by attention, movement and week focus.
            </p>
          </div>
          <Pill accent="var(--accent-orange)">{activeViewLabel} view</Pill>
        </div>
      </div>

      <div className="grid gap-2 p-2.5 xl:max-h-[calc(100dvh-25rem)] xl:overflow-y-auto">
        {groups.length > 0 ? (
          groups.map((group) => (
            <PortfolioGroupSection
              entities={group.entities}
              getEntityHref={getEntityHref}
              group={group.group}
              key={group.group}
              selectedEntityId={selectedEntityId}
            />
          ))
        ) : (
          <EmptyState
            description={emptyStateCopy.description}
            title={emptyStateCopy.title}
          />
        )}
      </div>
    </section>
  );
}
