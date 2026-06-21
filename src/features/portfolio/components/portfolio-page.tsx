"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  createPortfolioHref,
  normalizePortfolioScopeFilter,
  normalizePortfolioSortMode,
  normalizePortfolioView,
} from "../portfolio-routing";
import { portfolioPriorityRank, portfolioStatusMeta } from "../portfolio-style";
import type {
  PortfolioEntity,
  PortfolioEntityType,
  PortfolioScopeFilter,
  PortfolioSortMode,
  PortfolioView,
  PortfolioViewModel,
} from "../types";
import { PortfolioContextPanel } from "./portfolio-context-panel";
import { PortfolioEntityList } from "./portfolio-entity-list";
import { PortfolioFilterBar } from "./portfolio-filter-bar";
import { PortfolioPageHeader } from "./portfolio-page-header";
import { PortfolioSummaryStrip } from "./portfolio-summary-strip";

const viewTypeMap: Record<PortfolioView, PortfolioEntityType | "all"> = {
  all: "all",
  tasks: "task",
  projects: "project",
  goals: "goal",
  skills: "skill",
};

function matchesView(entity: PortfolioEntity, view: PortfolioView) {
  const entityType = viewTypeMap[view];

  return entityType === "all" || entity.type === entityType;
}

function matchesFilter(entity: PortfolioEntity, filter: PortfolioScopeFilter) {
  if (filter === "all") {
    return true;
  }

  if (filter === "due_this_week") {
    return entity.dueRank === 1;
  }

  if (filter === "in_progress") {
    return ["active", "in_progress", "practicing"].includes(entity.status);
  }

  if (filter === "blocked") {
    return entity.blocked || entity.status === "blocked";
  }

  if (filter === "needs_decision") {
    return entity.status === "needs_decision";
  }

  if (filter === "review_open") {
    return entity.reviewNeeded || entity.status === "review_open";
  }

  if (filter === "high_focus") {
    return entity.focusLevel === "high" || entity.priority === "P1";
  }

  if (filter === "area_education") {
    return entity.area === "education";
  }

  if (filter === "area_work") {
    return entity.area === "work";
  }

  if (filter === "area_coding") {
    return entity.area === "coding";
  }

  if (filter === "area_health") {
    return entity.area === "health";
  }

  return true;
}

function matchesStatusQuery(entity: PortfolioEntity, status: string | null) {
  if (!status) {
    return true;
  }

  if (status === "active") {
    return !["planned", "done"].includes(entity.status);
  }

  return entity.status === status;
}

function matchesAreaQuery(entity: PortfolioEntity, area: string | null) {
  return !area || entity.area === area;
}

function matchesPriorityQuery(
  entity: PortfolioEntity,
  priority: string | null,
) {
  return !priority || entity.priority.toLowerCase() === priority.toLowerCase();
}

function matchesReviewQuery(entity: PortfolioEntity, review: string | null) {
  if (!review) {
    return true;
  }

  if (["1", "true", "open", "needed"].includes(review)) {
    return entity.reviewNeeded;
  }

  if (["0", "false", "none"].includes(review)) {
    return !entity.reviewNeeded;
  }

  return true;
}

function priorityScore(entity: PortfolioEntity) {
  const decisionWeight =
    entity.blocked || entity.status === "blocked"
      ? -3
      : entity.status === "needs_decision"
        ? -2
        : entity.reviewNeeded
          ? -1
          : 0;

  return portfolioPriorityRank[entity.priority] * 10 + decisionWeight;
}

function sortEntities(
  entities: PortfolioEntity[],
  sortMode: PortfolioSortMode,
) {
  return [...entities].sort((left, right) => {
    if (sortMode === "deadline") {
      return (
        left.dueRank - right.dueRank ||
        priorityScore(left) - priorityScore(right) ||
        left.title.localeCompare(right.title)
      );
    }

    if (sortMode === "recent") {
      return (
        left.recentRank - right.recentRank ||
        priorityScore(left) - priorityScore(right) ||
        left.title.localeCompare(right.title)
      );
    }

    return (
      priorityScore(left) - priorityScore(right) ||
      left.dueRank - right.dueRank ||
      left.title.localeCompare(right.title)
    );
  });
}

function getViewLabel(viewModel: PortfolioViewModel, view: PortfolioView) {
  return (
    viewModel.views.find((viewOption) => viewOption.value === view)?.label ??
    "All"
  );
}

export function PortfolioPage({
  viewModel,
}: Readonly<{
  viewModel: PortfolioViewModel;
}>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeView = normalizePortfolioView(
    searchParams.get("type") ?? searchParams.get("view"),
  );
  const activeFilter = normalizePortfolioScopeFilter(searchParams.get("scope"));
  const sortMode = normalizePortfolioSortMode(searchParams.get("sort"));
  const selectedEntityId = searchParams.get("selected");
  const statusFilter = searchParams.get("status");
  const areaFilter = searchParams.get("area");
  const priorityFilter = searchParams.get("priority");
  const reviewFilter = searchParams.get("review");

  const baseEntities = useMemo(
    () =>
      viewModel.entities.filter(
        (entity) =>
          matchesStatusQuery(entity, statusFilter) &&
          matchesAreaQuery(entity, areaFilter) &&
          matchesPriorityQuery(entity, priorityFilter) &&
          matchesReviewQuery(entity, reviewFilter),
      ),
    [
      areaFilter,
      priorityFilter,
      reviewFilter,
      statusFilter,
      viewModel.entities,
    ],
  );

  const visibleEntities = useMemo(() => {
    return sortEntities(
      baseEntities.filter(
        (entity) =>
          matchesView(entity, activeView) &&
          matchesFilter(entity, activeFilter),
      ),
      sortMode,
    );
  }, [activeFilter, activeView, baseEntities, sortMode]);

  const selectedEntity =
    visibleEntities.find((entity) => entity.id === selectedEntityId) ??
    visibleEntities[0] ??
    null;

  const selectedStatusLabel = selectedEntity
    ? portfolioStatusMeta[selectedEntity.status].label
    : "none";

  return (
    <div
      className="mx-auto flex w-full max-w-[2208px] flex-col gap-2 pb-6 xl:h-[calc(100dvh-1.25rem)] xl:min-h-0 xl:pb-0"
      id="portfolio-page"
    >
      <PortfolioPageHeader
        header={viewModel.header}
        pageContract={viewModel.pageContract}
      />
      <PortfolioSummaryStrip stats={viewModel.stats} />
      <PortfolioFilterBar
        activeFilter={activeFilter}
        activeView={activeView}
        filters={viewModel.filters}
        getFilterHref={(filter) =>
          createPortfolioHref(
            {
              scope: filter === "all" ? null : filter,
              selected: null,
            },
            searchParams,
            pathname,
          )
        }
        getSortHref={(sort) =>
          createPortfolioHref(
            {
              sort: sort === "priority" ? null : sort,
            },
            searchParams,
            pathname,
          )
        }
        getViewHref={(view) =>
          createPortfolioHref(
            {
              type: view === "all" ? null : view,
              view: null,
              selected: null,
            },
            searchParams,
            pathname,
          )
        }
        sortMode={sortMode}
        sorts={viewModel.sorts}
        totalCount={baseEntities.length}
        views={viewModel.views}
        visibleCount={visibleEntities.length}
      />

      <div className="grid min-w-0 gap-2 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_minmax(360px,430px)] 2xl:grid-cols-[minmax(0,1fr)_minmax(420px,520px)]">
        <PortfolioEntityList
          activeViewLabel={getViewLabel(viewModel, activeView)}
          entities={visibleEntities}
          getEntityHref={(entityId) =>
            createPortfolioHref(
              {
                selected: entityId,
              },
              searchParams,
              pathname,
            )
          }
          selectedEntityId={selectedEntity?.id ?? null}
        />
        <div className="grid min-w-0 gap-2 xl:min-h-0">
          <PortfolioContextPanel entity={selectedEntity} />
          <section
            aria-label="Selected entity state"
            className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.36)] px-3 py-2"
          >
            <p className="text-[10px] leading-4 text-[var(--text-muted)]">
              Selected state is URL-driven and UI-only:{" "}
              <span className="font-semibold text-[var(--text-secondary)]">
                {selectedEntity?.title ?? "none"}
              </span>{" "}
              / {selectedStatusLabel}. No persistence or data mutation runs in
              this MVP.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
