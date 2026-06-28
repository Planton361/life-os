"use client";

import type { ContentStateMeta } from "@/features/content-state";
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
import { createPortfolioTaskFormAction } from "@/features/real-data/actions/task.actions";
import {
  createGoalFormAction,
  createProjectFormAction,
} from "@/features/real-data/actions/portfolio.actions";
import { createSkillFormAction } from "@/features/real-data/actions/skill.actions";
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

const createModeByView: Record<
  PortfolioView,
  "goal" | "project" | "select" | "skill" | "task"
> = {
  all: "select",
  goals: "goal",
  projects: "project",
  skills: "skill",
  tasks: "task",
};

const inputClassName =
  "min-h-9 rounded-[9px] border border-[var(--border-subtle)] bg-[rgba(7,11,18,.78)] px-2 text-[12px] normal-case text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-faint)] focus:border-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-55";

const buttonClassName =
  "min-h-9 rounded-[9px] border px-3 text-[11px] font-semibold text-[var(--text-primary)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:border-[var(--border-subtle)] disabled:bg-[rgba(18,28,43,.34)] disabled:text-[var(--text-muted)]";

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

function targetCreateMessage(value: string | null) {
  if (value === "task_created") return "Task erstellt.";
  if (value === "task_archived") return "Task archiviert.";
  if (value === "project_created") return "Project erstellt.";
  if (value === "goal_created") return "Goal erstellt.";
  if (value === "skill_created") return "Skill erstellt.";
  if (value === "skill_updated") return "Skill aktualisiert.";
  if (value === "skill_archived") return "Skill archiviert.";
  if (value === "skill_evidence_created") return "Skill Evidence erstellt.";
  if (value === "skill_evidence_deleted") return "Skill Evidence gelöscht.";
  if (value === "blocked") return "Melde dich an, um Portfolio-Items zu erstellen.";
  if (value === "error") return "Portfolio-Item konnte nicht gespeichert werden.";

  return null;
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

function CreateStatusPill({
  statusMessage,
}: Readonly<{
  statusMessage: string | null;
}>) {
  if (!statusMessage) return null;

  return (
    <p className="rounded-full border border-[rgba(66,184,131,.26)] bg-[rgba(66,184,131,.10)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-secondary)]">
      {statusMessage}
    </p>
  );
}

function TaskCreateForm({
  disabled,
  returnView,
}: Readonly<{
  disabled: boolean;
  returnView: PortfolioView;
}>) {
  return (
    <form
      action={createPortfolioTaskFormAction}
      aria-label="Task erstellen"
      className="grid gap-2 rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] p-2"
    >
      <input name="returnView" type="hidden" value={returnView} />
      <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
        Task-Titel
        <input
          className={inputClassName}
          disabled={disabled}
          name="title"
          placeholder="Neuer Task"
          required
        />
      </label>
      <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
        Next Action
        <input
          className={inputClassName}
          disabled={disabled}
          name="nextAction"
          placeholder="Nächster konkreter Schritt"
        />
      </label>
      <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
        Kontext
        <input
          className={inputClassName}
          disabled={disabled}
          name="description"
          placeholder="Optionaler Kontext"
        />
      </label>
      <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
        <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
          Priorität
          <select className={inputClassName} disabled={disabled} name="priority">
            <option value="none">None</option>
            <option value="P0">P0</option>
            <option value="P1">P1</option>
            <option value="P2">P2</option>
            <option value="P3">P3</option>
          </select>
        </label>
        <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
          Energie
          <select className={inputClassName} disabled={disabled} name="energy">
            <option value="">-</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
          Minuten
          <input
            className={inputClassName}
            disabled={disabled}
            min="1"
            name="durationMinutes"
            placeholder="30"
            type="number"
          />
        </label>
      </div>
      <label className="flex min-h-9 items-center gap-2 rounded-[9px] border border-[var(--border-subtle)] bg-[rgba(7,11,18,.58)] px-2 text-[11px] font-semibold text-[var(--text-secondary)]">
        <input
          className="size-4 accent-[rgb(91,124,250)]"
          disabled={disabled}
          name="todayCandidate"
          type="checkbox"
        />
        Heute planen
      </label>
      <button
        className={`${buttonClassName} border-[rgba(91,124,250,.34)] bg-[rgba(91,124,250,.14)] hover:border-[rgba(91,124,250,.52)]`}
        disabled={disabled}
        type="submit"
      >
        Task erstellen
      </button>
    </form>
  );
}

function ProjectCreateForm({
  disabled,
  returnView,
}: Readonly<{
  disabled: boolean;
  returnView: PortfolioView;
}>) {
  return (
    <form
      action={createProjectFormAction}
      aria-label="Project erstellen"
      className="grid gap-2 rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] p-2"
    >
      <input name="returnView" type="hidden" value={returnView} />
      <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
        Project-Titel
        <input
          className={inputClassName}
          disabled={disabled}
          name="title"
          placeholder="Neues Project"
          required
        />
      </label>
      <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
        Beschreibung
        <input
          className={inputClassName}
          disabled={disabled}
          name="description"
          placeholder="Optionaler Kontext"
        />
      </label>
      <button
        className={`${buttonClassName} border-[rgba(91,124,250,.34)] bg-[rgba(91,124,250,.14)] hover:border-[rgba(91,124,250,.52)]`}
        disabled={disabled}
        type="submit"
      >
        Project erstellen
      </button>
    </form>
  );
}

function GoalCreateForm({
  disabled,
  returnView,
}: Readonly<{
  disabled: boolean;
  returnView: PortfolioView;
}>) {
  return (
    <form
      action={createGoalFormAction}
      aria-label="Goal erstellen"
      className="grid gap-2 rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] p-2"
    >
      <input name="returnView" type="hidden" value={returnView} />
      <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
        Goal-Titel
        <input
          className={inputClassName}
          disabled={disabled}
          name="title"
          placeholder="Neues Goal"
          required
        />
      </label>
      <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
        Beschreibung
        <input
          className={inputClassName}
          disabled={disabled}
          name="description"
          placeholder="Optionaler Kontext"
        />
      </label>
      <button
        className={`${buttonClassName} border-[rgba(66,184,131,.34)] bg-[rgba(66,184,131,.14)] hover:border-[rgba(66,184,131,.52)]`}
        disabled={disabled}
        type="submit"
      >
        Goal erstellen
      </button>
    </form>
  );
}

function SkillCreateForm({
  disabled,
}: Readonly<{
  disabled: boolean;
}>) {
  return (
    <form
      action={createSkillFormAction}
      aria-label="Skill erstellen"
      className="grid gap-2 rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] p-2"
    >
      <input name="status" type="hidden" value="active" />
      <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
        Skill-Name
        <input
          className={inputClassName}
          disabled={disabled}
          name="name"
          placeholder="Neuer Skill"
          required
        />
      </label>
      <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
        Summary
        <input
          className={inputClassName}
          disabled={disabled}
          name="summary"
          placeholder="Optionaler Kontext"
        />
      </label>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
          Kategorie
          <input
            className={inputClassName}
            disabled={disabled}
            name="category"
            placeholder="Learning, Coding..."
          />
        </label>
        <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
          Level
          <input
            className={inputClassName}
            disabled={disabled}
            name="level"
            placeholder="Beginner, Applied..."
          />
        </label>
      </div>
      <button
        className={`${buttonClassName} border-[rgba(95,200,215,.34)] bg-[rgba(95,200,215,.14)] hover:border-[rgba(95,200,215,.52)]`}
        disabled={disabled}
        type="submit"
      >
        Skill erstellen
      </button>
    </form>
  );
}

function PortfolioContextualCreatePanel({
  activeView,
  profileId,
  statusMessage,
}: Readonly<{
  activeView: PortfolioView;
  profileId: PortfolioViewModel["profileId"];
  statusMessage: string | null;
}>) {
  const createMode = createModeByView[activeView];
  const disabled = profileId !== "manual";
  const heading =
    createMode === "task"
      ? "Task erstellen"
      : createMode === "project"
        ? "Project erstellen"
        : createMode === "goal"
          ? "Goal erstellen"
          : createMode === "skill"
            ? "Skill erstellen"
            : "Typ wählen";
  const description =
    createMode === "select"
      ? "Task, Project oder Goal bewusst auswählen."
      : disabled
        ? "Wechsle ins Manual-Profil, um echte Items zu erstellen."
        : "Speichert im Manual-Profil über Supabase.";

  return (
    <section
      aria-labelledby="portfolio-contextual-create-heading"
      className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.36)] px-3 py-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2
            className="text-[13px] font-semibold text-[var(--text-primary)]"
            id="portfolio-contextual-create-heading"
          >
            {heading}
          </h2>
          <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
            {description}
          </p>
        </div>
        <CreateStatusPill statusMessage={statusMessage} />
      </div>

      <div className="mt-3 grid gap-2">
        {createMode === "task" ? (
          <TaskCreateForm disabled={disabled} returnView={activeView} />
        ) : null}
        {createMode === "project" ? (
          <ProjectCreateForm disabled={disabled} returnView={activeView} />
        ) : null}
        {createMode === "goal" ? (
          <GoalCreateForm disabled={disabled} returnView={activeView} />
        ) : null}
        {createMode === "skill" ? <SkillCreateForm disabled={disabled} /> : null}
        {createMode === "select" ? (
          <>
            <TaskCreateForm disabled={disabled} returnView={activeView} />
            <ProjectCreateForm disabled={disabled} returnView={activeView} />
            <GoalCreateForm disabled={disabled} returnView={activeView} />
            <SkillCreateForm disabled={disabled} />
          </>
        ) : null}
      </div>
    </section>
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
  const statusMessage = targetCreateMessage(searchParams.get("targetCreate"));

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
    : "keine Auswahl";

  return (
    <div
      className="mx-auto flex w-full max-w-[2208px] flex-col gap-2 pb-6 xl:h-[calc(100dvh-1.25rem)] xl:min-h-0 xl:pb-0"
      data-portfolio-section="page"
      {...contentStateAttributes(viewModel.contentStates.page, viewModel.profileId)}
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
              type: null,
              view: view === "all" ? null : view,
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
          contentState={viewModel.contentStates.entityList}
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
          profileId={viewModel.profileId}
          selectedEntityId={selectedEntity?.id ?? null}
        />
        <div className="grid min-w-0 gap-2 xl:min-h-0 xl:overflow-y-auto xl:pr-1">
          <PortfolioContextualCreatePanel
            activeView={activeView}
            profileId={viewModel.profileId}
            statusMessage={statusMessage}
          />
          <PortfolioContextPanel
            allEntities={viewModel.entities}
            contentState={viewModel.contentStates.contextPanel}
            entity={selectedEntity}
            profileId={viewModel.profileId}
          />
          <section
            aria-label="Selected entity state"
            className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.36)] px-3 py-2"
          >
            <p className="text-[10px] leading-4 text-[var(--text-muted)]">
              Auswahlstatus:{" "}
              <span className="font-semibold text-[var(--text-secondary)]">
                {selectedEntity?.title ?? "Keine Entity ausgewählt"}
              </span>{" "}
              / {selectedStatusLabel}.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
