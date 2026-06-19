"use client";

import { useMemo, useState } from "react";
import {
  portfolioPriorityRank,
  portfolioStatusMeta,
} from "../portfolio-style";
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
  const [activeView, setActiveView] = useState<PortfolioView>("all");
  const [activeFilter, setActiveFilter] =
    useState<PortfolioScopeFilter>("all");
  const [sortMode, setSortMode] = useState<PortfolioSortMode>("priority");
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(
    viewModel.entities[0]?.id ?? null,
  );

  const visibleEntities = useMemo(() => {
    return sortEntities(
      viewModel.entities.filter(
        (entity) =>
          matchesView(entity, activeView) && matchesFilter(entity, activeFilter),
      ),
      sortMode,
    );
  }, [activeFilter, activeView, sortMode, viewModel.entities]);

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
        onFilterChange={setActiveFilter}
        onSortChange={setSortMode}
        onViewChange={setActiveView}
        sortMode={sortMode}
        sorts={viewModel.sorts}
        totalCount={viewModel.entities.length}
        views={viewModel.views}
        visibleCount={visibleEntities.length}
      />

      <div className="grid min-w-0 gap-2 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_minmax(360px,430px)] 2xl:grid-cols-[minmax(0,1fr)_minmax(420px,520px)]">
        <PortfolioEntityList
          activeViewLabel={getViewLabel(viewModel, activeView)}
          entities={visibleEntities}
          onSelectEntity={setSelectedEntityId}
          selectedEntityId={selectedEntity?.id ?? null}
        />
        <div className="grid min-w-0 gap-2 xl:min-h-0">
          <PortfolioContextPanel entity={selectedEntity} />
          <section
            aria-label="Selected entity state"
            className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.36)] px-3 py-2"
          >
            <p className="text-[10px] leading-4 text-[var(--text-muted)]">
              Selected state is local UI only:{" "}
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
