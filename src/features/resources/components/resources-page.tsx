"use client";

import type { ContentStateMeta } from "@/features/content-state";
import {
  EmptyState,
  Pill,
  accentStyle,
} from "@/components/layout/route-page-primitives";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { archiveResourceFormAction, createResourceFormAction, linkResourceToTargetAction, restoreResourceFormAction, unlinkResourceFromTargetAction, updateResourceFormAction } from "@/features/real-data/actions/resource.actions";
import {
  resourceAreaMeta,
  resourceReviewStateMeta,
  resourceStatusMeta,
  resourceTypeMeta,
} from "../resources-view-model";
import type {
  RecentLearning,
  ResourceAiSuggestion,
  ResourceCluster,
  ResourceItem,
  ResourceLinkedContextKind,
  ResourceOption,
  ResourceRelation,
  ResourceDataRelationType,
  ResourceRelationCreateTarget,
  ResourceRelationTargetType,
  ResourceRelationViewModel,
  ResourceRelationType,
  ResourceReviewQueueItem,
  ResourceSummaryStat,
  ResourceType,
  ResourceViewMode,
  ResourcesViewModel,
} from "../types";

function controlClass(active = false) {
  return cn(
    "inline-flex min-h-8 shrink-0 items-center justify-center rounded-full border px-3 text-[10px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] xl:min-h-6 xl:px-2.5 xl:text-[9px]",
    active
      ? "border-[color-mix(in_srgb,var(--accent)_34%,transparent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--text-primary)]"
      : "border-[var(--border-subtle)] bg-[rgba(18,28,43,.56)] text-[var(--text-secondary)] hover:border-[var(--border-default)]",
  );
}

const DESKTOP_LIBRARY_LIMIT = 5;
const WIDE_DESKTOP_LIBRARY_LIMIT = 8;
const DESKTOP_RECENT_LEARNINGS_LIMIT = 3;
const WIDE_DESKTOP_RECENT_LEARNINGS_LIMIT = 4;

const graphRelationTypeLabels: Record<ResourceRelationType, string> = {
  related_to: "related to",
  derived_from: "derived from",
  supports: "supports",
  contradicts: "contradicts",
  used_in: "used in",
  feeds_into: "feeds into",
  references: "references",
  source_for: "source for",
  follow_up_of: "follow-up of",
  same_topic: "same topic",
};

const dataRelationTypeLabels: Record<ResourceDataRelationType, string> = {
  context: "Context",
  decision: "Decision",
  evidence: "Evidence",
  related: "Related",
  source: "Source",
  supports: "Supports",
};

const relationTargetTypeLabels: Record<ResourceRelationTargetType, string> = {
  goal: "Goal",
  project: "Project",
  resource: "Resource",
  task: "Task",
};

const relationCreateMessages: Record<string, string> = {
  blocked: "Melde dich im Manual-Profil an, um Beziehungen zu speichern.",
  existing: "Beziehung besteht bereits.",
  invalid: "Beziehung konnte nicht gespeichert werden.",
  missing_resource: "Die Resource konnte nicht bestätigt werden.",
  missing_target: "Das Ziel konnte nicht bestätigt werden.",
  saved: "Beziehung gespeichert.",
  unsupported: "Dieser Zieltyp ist für Resource Relations nicht freigegeben.",
};

const resourceStateMessages: Record<string, string> = {
  archived: "Resource archiviert.",
  blocked: "Resource-Aktion ist ohne Manual-Anmeldung blockiert.",
  created: "Resource erstellt.",
  error: "Resource-Aktion konnte nicht gespeichert werden.",
  invalid: "Prüfe die Resource-Felder.",
  restored: "Resource wiederhergestellt.",
  unlinked: "Resource-Verknüpfung gelöst.",
  updated: "Resource aktualisiert.",
};

const contextKindLabels: Record<ResourceLinkedContextKind, string> = {
  project: "Projects",
  goal: "Goals",
  skill: "Skills",
  task: "Tasks",
  note: "Notes",
  area: "Areas",
  scientific_work: "Scientific Work",
  wiki: "Wiki",
  repository: "Repositories",
};

const mapNodeSlots = [
  { x: 28, y: 14 },
  { x: 72, y: 14 },
  { x: 24, y: 50 },
  { x: 76, y: 50 },
  { x: 30, y: 84 },
  { x: 70, y: 84 },
];

type ResourceHrefUpdates = {
  view?: ResourceViewMode;
  selected?: string | null;
};

type ResourceConnection = {
  relation: ResourceRelation;
  resource: ResourceItem;
  direction: "incoming" | "outgoing";
};

function normalizeResourceView(view: string | null): ResourceViewMode {
  if (view === "map" || view === "review") {
    return view;
  }

  return "library";
}

function createResourceHref(
  pathname: string,
  searchParams: { toString(): string },
  updates: ResourceHrefUpdates,
) {
  const params = new URLSearchParams(searchParams.toString());

  if (updates.view) {
    if (updates.view === "library") {
      params.delete("view");
    } else {
      params.set("view", updates.view);
    }
  }

  if (updates.selected === null) {
    params.delete("selected");
  } else if (updates.selected) {
    params.set("selected", updates.selected);
  }

  const query = params.toString();

  return query ? `${pathname}?${query}` : pathname;
}

function contentStateAttributes(
  meta: ContentStateMeta,
  profileId: ResourcesViewModel["profileId"],
) {
  return {
    "data-capacity": meta.capacity?.toString() ?? undefined,
    "data-content-state": meta.state,
    "data-item-count": meta.itemCount.toString(),
    "data-profile-id": profileId,
  };
}

function getResourceById(resources: ResourceItem[], id: string) {
  return resources.find((resource) => resource.id === id);
}

function getResourceConnections(
  resource: ResourceItem,
  resources: ResourceItem[],
  relations: ResourceRelation[],
) {
  return relations.reduce<ResourceConnection[]>((connections, relation) => {
    if (relation.fromResourceId === resource.id) {
      const target = getResourceById(resources, relation.toResourceId);

      if (target) {
        connections.push({
          relation,
          resource: target,
          direction: "outgoing",
        });
      }
    }

    if (relation.toResourceId === resource.id) {
      const source = getResourceById(resources, relation.fromResourceId);

      if (source) {
        connections.push({
          relation,
          resource: source,
          direction: "incoming",
        });
      }
    }

    return connections;
  }, []);
}

function connectionLabel(connection: ResourceConnection) {
  const label =
    connection.relation.label ??
    graphRelationTypeLabels[connection.relation.type];

  return connection.direction === "outgoing" ? label : `incoming ${label}`;
}

function ResourcesPageHeader({
  viewModel,
}: Readonly<{
  viewModel: ResourcesViewModel;
}>) {
  return (
    <header className="min-w-0 overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.76)] shadow-[0_8px_22px_rgba(0,0,0,.12)]">
      <div className="grid gap-3 bg-[linear-gradient(90deg,rgba(95,200,215,.055),transparent_48%)] px-4 py-3 xl:min-h-[72px] xl:grid-cols-[minmax(0,1fr)_minmax(340px,auto)] xl:items-center xl:px-3 xl:py-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-cyan)] xl:text-[9px]">
            {viewModel.header.eyebrow}
          </p>
          <h1 className="mt-0.5 text-[28px] font-semibold leading-none text-[var(--text-primary)] sm:text-[30px] xl:text-[24px]">
            {viewModel.header.title}
          </h1>
          <p className="mt-1.5 max-w-3xl text-xs leading-4 text-[var(--text-secondary)] xl:mt-1 xl:truncate xl:text-[11px]">
            {viewModel.header.summary}
          </p>
          <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)] xl:hidden">
            {viewModel.header.dateRange}
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-1.5 xl:items-end xl:gap-1">
          <div className="flex flex-wrap gap-1.5 xl:justify-end">
            <Pill accent="var(--accent-cyan)">Knowledge Library</Pill>
            <Pill quiet>{viewModel.pageContract.pageType}</Pill>
          </div>
          <p className="max-w-xl text-left text-[10px] leading-4 text-[var(--text-muted)] xl:line-clamp-2 xl:text-right xl:leading-3">
            {viewModel.pageContract.canonicalSource}
          </p>
        </div>
      </div>
    </header>
  );
}

function ResourceSummaryStrip({
  contentState,
  profileId,
  stats,
}: Readonly<{
  contentState: ContentStateMeta;
  profileId: ResourcesViewModel["profileId"];
  stats: ResourceSummaryStat[];
}>) {
  return (
    <section
      aria-label="Resource summary"
      className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6"
      data-resources-section="summary"
      {...contentStateAttributes(contentState, profileId)}
    >
      {stats.map((stat, index) => (
        <article
          className="min-h-[58px] rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_20%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_6%,rgba(15,23,36,.68))] px-3 py-2 xl:min-h-[46px] xl:px-2.5 xl:py-1.5"
          key={`resource-summary-stat-${index}`}
          style={accentStyle(stat.accent)}
        >
          <div className="flex min-w-0 items-start gap-2 xl:items-center">
            <span
              aria-hidden="true"
              className="mt-1 size-1.5 shrink-0 rounded-full bg-[var(--accent)] xl:mt-0"
            />
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold text-[var(--text-muted)] xl:text-[9px]">
                {stat.label}
              </p>
              <p className="mt-0.5 truncate text-[18px] font-semibold leading-5 text-[var(--text-primary)] xl:text-[15px] xl:leading-4">
                {stat.value}
              </p>
              <p className="mt-0.5 truncate text-[10px] leading-4 text-[var(--text-secondary)] xl:text-[9px] xl:leading-3">
                {stat.detail}
              </p>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

function ResourceViewSwitcher({
  activeView,
  makeHref,
  viewOptions,
}: Readonly<{
  activeView: ResourceViewMode;
  makeHref: (updates: ResourceHrefUpdates) => string;
  viewOptions: ResourceOption<ResourceViewMode>[];
}>) {
  return (
    <nav
      aria-label="Resources views"
      className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.56)] p-1"
    >
      <div className="grid grid-cols-3 gap-1">
        {viewOptions.map((view) => {
          const active = view.value === activeView;

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={cn(
                "min-h-10 rounded-[11px] border px-3 py-2 text-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] xl:min-h-8 xl:py-1.5",
                active
                  ? "border-[color-mix(in_srgb,var(--accent)_38%,transparent)] bg-[color-mix(in_srgb,var(--accent)_14%,rgba(18,28,43,.74))] text-[var(--text-primary)]"
                  : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border-subtle)] hover:bg-[rgba(18,28,43,.44)]",
              )}
              href={makeHref({ view: view.value })}
              key={view.value}
              style={accentStyle(view.accent ?? "var(--accent-cyan)")}
            >
              <span className="block text-[12px] font-semibold leading-4 xl:text-[10px]">
                {view.label}
              </span>
              <span className="mt-0.5 hidden text-[9px] leading-3 text-[var(--text-muted)] sm:block">
                {view.detail}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function SaveResourceCard({
  captureTypes,
  profileId,
}: Readonly<{
  captureTypes: ResourceOption<ResourceType>[];
  profileId: ResourcesViewModel["profileId"];
}>) {
  const disabled = profileId !== "manual";
  return (
    <section aria-label="Save Resource" className="min-w-0 overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.74)] p-3">
      <form action={createResourceFormAction} aria-label="Resource erstellen" className="grid gap-2 xl:grid-cols-[minmax(180px,1fr)_minmax(220px,1.4fr)_minmax(180px,1fr)_140px_auto] xl:items-end">
        <label className="grid gap-1 text-[10px] font-semibold text-[var(--text-muted)]">Titel<input className="min-h-8 rounded-[9px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.62)] px-2 text-[11px] text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]" disabled={disabled} name="title" required /></label>
        <label className="grid gap-1 text-[10px] font-semibold text-[var(--text-muted)]">Beschreibung / Notiz<input className="min-h-8 rounded-[9px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.62)] px-2 text-[11px] text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]" disabled={disabled} name="body" /></label>
        <label className="grid gap-1 text-[10px] font-semibold text-[var(--text-muted)]">URL<input className="min-h-8 rounded-[9px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.62)] px-2 text-[11px] text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]" disabled={disabled} name="url" type="url" /></label>
        <label className="grid gap-1 text-[10px] font-semibold text-[var(--text-muted)]">Typ<select className="min-h-8 rounded-[9px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.62)] px-2 text-[11px] text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]" disabled={disabled} name="type">{captureTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
        <button className="min-h-8 rounded-full border border-[rgba(95,200,215,.32)] bg-[rgba(95,200,215,.12)] px-4 text-[10px] font-semibold text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] disabled:opacity-50" disabled={disabled} type="submit">Resource speichern</button>
      </form>
    </section>
  );
}

function ResourceControls({
  typeOptions,
  filterOptions,
  query,
}: Readonly<{
  typeOptions: ResourceOption<string>[];
  filterOptions: ResourceOption<string>[];
  query: string;
}>) {
  return (
    <section
      aria-label="Resource type and filter controls"
      className="min-w-0 rounded-[14px] border border-[rgba(148,163,184,.08)] bg-[rgba(11,17,28,.48)] px-3 py-2 xl:min-h-[56px]"
    >
      <div className="grid gap-2 xl:grid-cols-[minmax(180px,.42fr)_minmax(0,1.05fr)_minmax(0,.95fr)_auto] xl:items-center">
        <form className="flex min-w-0 gap-1" method="get">
          <label
            className="sr-only"
            htmlFor="resource-search"
          >
            Search resources
          </label>
          <input
            className="min-h-9 w-full rounded-full border border-[var(--border-subtle)] bg-[rgba(11,17,28,.62)] px-3 text-[11px] text-[var(--text-secondary)] outline-none placeholder:text-[var(--text-faint)] focus-visible:border-[var(--accent-cyan)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] xl:min-h-7 xl:px-2.5 xl:text-[10px]"
            defaultValue={query}
            id="resource-search"
            name="q"
            placeholder="Search resources"
            type="search"
          />
          <button className={controlClass()} type="submit">Suchen</button>
        </form>

        <div className="min-w-0">
          <div className="-mx-1 overflow-x-auto px-1">
            <div className="flex w-max min-w-full rounded-full border border-[var(--border-subtle)] bg-[rgba(11,17,28,.72)] p-1 xl:gap-0.5">
              {typeOptions.map((type) => (
                <button
                  aria-pressed={Boolean(type.active)}
                  className={controlClass(type.active)}
                  key={type.value}
                  style={accentStyle(type.accent ?? "var(--accent-cyan)")}
                  title={type.detail}
                  type="button"
                >
                  {type.label}
                  {typeof type.count === "number" ? (
                    <span className="ml-1 text-[var(--text-muted)]">
                      {type.count}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="-mx-1 overflow-x-auto px-1">
          <div className="flex w-max min-w-full items-center gap-1.5 xl:gap-1">
            <p className="mr-1 shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
              Filter
            </p>
            {filterOptions.map((filter) => (
              <button
                aria-pressed={Boolean(filter.active)}
                className={controlClass(filter.active)}
                key={filter.value}
                style={accentStyle(filter.accent ?? "var(--accent-cyan)")}
                type="button"
              >
                {filter.label}
                {typeof filter.count === "number" ? (
                  <span className="ml-1 text-[var(--text-muted)]">
                    {filter.count}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)] xl:text-right xl:text-[9px]">
          Preview
        </p>
      </div>
    </section>
  );
}

function ResourceLibrary({
  contentState,
  makeHref,
  profileId,
  resources,
  selectedResource,
}: Readonly<{
  contentState: ContentStateMeta;
  makeHref: (updates: ResourceHrefUpdates) => string;
  profileId: ResourcesViewModel["profileId"];
  resources: ResourceItem[];
  selectedResource: ResourceItem | null;
}>) {
  const hiddenResourceCount = Math.max(
    0,
    resources.length - DESKTOP_LIBRARY_LIMIT,
  );
  const hiddenWideResourceCount = Math.max(
    0,
    resources.length - WIDE_DESKTOP_LIBRARY_LIMIT,
  );

  return (
    <section
      aria-labelledby="resources-library-heading"
      className="flex min-w-0 flex-col overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.82)] shadow-[0_8px_22px_rgba(0,0,0,.12)] xl:h-full xl:min-h-0 xl:flex-1"
      {...contentStateAttributes(contentState, profileId)}
      data-resource-library
      data-resources-section="library"
    >
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] px-3 py-3 xl:px-2.5 xl:py-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2
              className="text-[16px] font-semibold leading-5 text-[var(--text-primary)] xl:text-[14px] xl:leading-4"
              id="resources-library-heading"
            >
              Main Resources Library
            </h2>
            <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-muted)] xl:truncate xl:leading-3">
              Knowledge is grouped by source, review state and next use.
            </p>
          </div>
          <Pill accent="var(--accent-cyan)">Knowledge Workbench</Pill>
        </div>
      </div>

      <div className="grid gap-2 p-2.5 xl:min-h-0 xl:flex-1 xl:grid-rows-[1fr_auto] xl:gap-2 xl:p-2">
        {resources.length > 0 ? (
          <>
            <div className="grid content-start gap-2 xl:min-h-0 xl:gap-1.5 [@media(min-width:2200px)]:gap-2">
              {resources.map((resource, index) => {
                const type = resourceTypeMeta[resource.type];
                const area = resourceAreaMeta[resource.area];
                const status = resourceStatusMeta[resource.status];
                const review = resourceReviewStateMeta[resource.reviewState];
                const selected = resource.id === selectedResource?.id;
                const hiddenOnDesktop =
                  index >= WIDE_DESKTOP_LIBRARY_LIMIT;
                const wideDesktopOnly =
                  index >= DESKTOP_LIBRARY_LIMIT &&
                  index < WIDE_DESKTOP_LIBRARY_LIMIT;

                return (
                  <Link
                    aria-label={`Select resource ${resource.title}`}
                    className={cn(
                      "block rounded-[14px] border bg-[rgba(11,17,28,.46)] p-3 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] xl:min-h-[60px] xl:p-2 [@media(min-width:2200px)]:min-h-[72px] [@media(min-width:2200px)]:p-2.5",
                      selected
                        ? "border-[color-mix(in_srgb,var(--accent)_44%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,rgba(18,28,43,.78))]"
                        : "border-[var(--border-subtle)] hover:border-[color-mix(in_srgb,var(--accent)_28%,transparent)]",
                      wideDesktopOnly &&
                        "xl:hidden [@media(min-width:2200px)]:block",
                      hiddenOnDesktop && "xl:hidden",
                    )}
                    data-resource-row
                    href={makeHref({ selected: resource.id })}
                    key={resource.id}
                    style={accentStyle(type.accent)}
                  >
                    <div className="grid min-w-0 gap-2 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            aria-hidden="true"
                            className="size-2 shrink-0 rounded-full bg-[var(--accent)]"
                          />
                          <h3 className="truncate text-[14px] font-semibold leading-5 text-[var(--text-primary)] xl:text-[12px] xl:leading-4 [@media(min-width:2200px)]:text-[13px]">
                            {resource.title}
                          </h3>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[var(--text-secondary)] xl:line-clamp-1 xl:text-[10px] xl:leading-3 [@media(min-width:2200px)]:text-[11px] [@media(min-width:2200px)]:leading-4">
                          {resource.summary}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap justify-start gap-1.5 xl:justify-end xl:gap-1">
                        {selected ? (
                          <Pill accent={type.accent}>selected</Pill>
                        ) : null}
                        <Pill accent={type.accent}>{type.shortLabel}</Pill>
                        <Pill accent={area.accent}>{area.label}</Pill>
                        <Pill accent={status.accent}>{status.label}</Pill>
                      </div>
                    </div>

                    <dl className="mt-3 grid gap-2 text-[10px] leading-4 text-[var(--text-secondary)] sm:grid-cols-5 xl:mt-1.5 xl:flex xl:min-w-0 xl:gap-3 xl:leading-3">
                      <div className="min-w-0">
                        <dt className="font-semibold text-[var(--text-muted)] xl:sr-only">
                          Source
                        </dt>
                        <dd className="mt-0.5 truncate">{resource.source}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="font-semibold text-[var(--text-muted)] xl:sr-only">
                          Linked Context Count
                        </dt>
                        <dd className="mt-0.5 truncate">
                          {resource.linkedContexts.length} linked contexts
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="font-semibold text-[var(--text-muted)] xl:sr-only">
                          Review State
                        </dt>
                        <dd className="mt-0.5 truncate">{review.label}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="font-semibold text-[var(--text-muted)] xl:sr-only">
                          Topic
                        </dt>
                        <dd className="mt-0.5 truncate">{resource.topic}</dd>
                      </div>
                      <div className="hidden min-w-0 [@media(min-width:2200px)]:block">
                        <dt className="sr-only">
                          Last touched
                        </dt>
                        <dd className="mt-0.5 truncate">
                          {resource.lastTouched}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-3 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.36)] px-3 py-2 xl:hidden">
                      <p className="text-[10px] font-semibold text-[var(--text-muted)]">
                        Next Use
                      </p>
                      <p className="mt-0.5 text-[11px] leading-4 text-[var(--text-secondary)]">
                        {resource.nextUse}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>

            {hiddenResourceCount > 0 ? (
              <div className="hidden min-h-[34px] items-center justify-between self-end rounded-[12px] border border-dashed border-[var(--border-subtle)] bg-[rgba(11,17,28,.34)] px-3 text-[10px] text-[var(--text-muted)] xl:flex xl:w-full [@media(min-width:2200px)]:min-h-[38px]">
                <span className="[@media(min-width:2200px)]:hidden">
                  +{hiddenResourceCount} more resources in library
                </span>
                <span className="hidden [@media(min-width:2200px)]:inline">
                  +{hiddenWideResourceCount} more resources in library
                </span>
                <span className="font-semibold text-[var(--text-secondary)]">
                  View all resources
                </span>
              </div>
            ) : null}
          </>
        ) : (
          <EmptyState
            description="Speichere die erste Ressource, sobald du diesen Bereich nutzt."
            title="Noch keine Ressourcen"
          />
        )}
      </div>
    </section>
  );
}

function ResourceRelationEmptyInspector({
  contentState,
  profileId,
}: Readonly<{
  contentState: ContentStateMeta;
  profileId: ResourcesViewModel["profileId"];
}>) {
  return (
    <aside
      aria-labelledby="selected-resource-heading"
      className="flex min-w-0 flex-col overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.86)] shadow-[0_8px_22px_rgba(0,0,0,.12)] xl:h-full xl:min-h-0 xl:flex-1"
      data-resources-section="relation-inspector"
      {...contentStateAttributes(contentState, profileId)}
    >
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.50)] px-3 py-3 xl:px-2.5 xl:py-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-cyan)] xl:text-[9px]">
            Relation Inspector
          </p>
          <h2
            className="mt-1 text-[20px] font-semibold leading-6 text-[var(--text-primary)] xl:text-[16px] xl:leading-5"
            id="selected-resource-heading"
          >
            Keine Ressource ausgewählt
          </h2>
        </div>
      </div>
      <div className="grid gap-3 p-3 xl:min-h-0 xl:flex-1 xl:p-2">
        <EmptyState
          description="Sobald eine Ressource existiert, erscheinen Details, Kontext und Beziehungen in diesem Inspector."
          title="Noch keine Ressource im Inspector"
        />
      </div>
    </aside>
  );
}

function ConnectionLink({
  connection,
  makeHref,
}: Readonly<{
  connection: ResourceConnection;
  makeHref: (updates: ResourceHrefUpdates) => string;
}>) {
  const type = resourceTypeMeta[connection.resource.type];

  return (
    <Link
      className="flex min-h-8 items-center justify-between gap-3 rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.40)] px-3 text-[11px] transition hover:border-[color-mix(in_srgb,var(--accent)_28%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] xl:min-h-7 xl:px-2 xl:text-[10px]"
      href={makeHref({ selected: connection.resource.id })}
      style={accentStyle(type.accent)}
    >
      <span className="min-w-0 truncate text-[var(--text-secondary)]">
        {connection.resource.title}
      </span>
      <span className="shrink-0 text-[var(--text-muted)]">
        {connectionLabel(connection)}
      </span>
    </Link>
  );
}

function ConnectionList({
  connections,
  emptyText,
  makeHref,
  title,
}: Readonly<{
  connections: ResourceConnection[];
  emptyText: string;
  makeHref: (updates: ResourceHrefUpdates) => string;
  title: string;
}>) {
  return (
    <section aria-label={title}>
      <h3 className="text-[13px] font-semibold text-[var(--text-primary)] xl:text-[12px]">
        {title}
      </h3>
      {connections.length > 0 ? (
        <div className="mt-2 grid gap-1.5 xl:mt-1.5 xl:gap-1">
          {connections.slice(0, 4).map((connection) => (
            <ConnectionLink
              connection={connection}
              key={connection.relation.id}
              makeHref={makeHref}
            />
          ))}
        </div>
      ) : (
        <p className="mt-2 rounded-[10px] border border-dashed border-[var(--border-subtle)] bg-[rgba(11,17,28,.30)] px-3 py-2 text-[10px] leading-4 text-[var(--text-muted)]">
          {emptyText}
        </p>
      )}
    </section>
  );
}

function resourceRelationMeta(relation: ResourceRelationViewModel) {
  return [
    relationTargetTypeLabels[relation.targetType],
    relation.targetStatus,
    relation.targetProgress !== null && relation.targetProgress !== undefined
      ? `${relation.targetProgress}%`
      : null,
    dataRelationTypeLabels[relation.relationType],
  ].filter(Boolean);
}

function ResourceTargetRelationList({
  emptyText,
  profileId,
  relations,
  resourceId,
  title,
}: Readonly<{
  emptyText: string;
  profileId: ResourcesViewModel["profileId"];
  relations: readonly ResourceRelationViewModel[];
  resourceId: string;
  title: string;
}>) {
  return (
    <section aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-[var(--text-primary)] xl:text-[12px]">
          {title}
        </h3>
        <Pill quiet>{relations.length} total</Pill>
      </div>
      <div className="mt-2 grid gap-1.5 xl:mt-1.5 xl:gap-1">
        {relations.length > 0 ? (
          relations.map((relation) => (
            <article
              className="rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.40)] px-3 py-2 xl:px-2 xl:py-1.5"
              data-resource-relation-card
              key={relation.id}
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold leading-4 text-[var(--text-primary)] xl:text-[11px] xl:leading-3">
                    {relation.targetTitle}
                  </p>
                  <p className="mt-1 truncate text-[10px] leading-3 text-[var(--text-muted)]">
                    {resourceRelationMeta(relation).join(" · ")}
                  </p>
                </div>
                {relation.targetMissing ? (
                  <Pill accent="var(--accent-red)">Nicht mehr verfügbar</Pill>
                ) : null}
              </div>
              {!relation.targetMissing ? <Link className="mt-1 inline-flex text-[10px] text-[var(--accent-cyan)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]" href={relation.targetType === "resource" ? `/resources?selected=${relation.targetId}` : `/portfolio?view=${relation.targetType}s&selected=${relation.targetId}`}>Kontext öffnen</Link> : null}
              {profileId === "manual" ? <form action={unlinkResourceFromTargetAction} className="mt-1"><input name="relationId" type="hidden" value={relation.id} /><input name="resourceId" type="hidden" value={resourceId} /><button className="text-[10px] font-semibold text-[var(--accent-red)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]" type="submit">Verknüpfung lösen</button></form> : null}
            </article>
          ))
        ) : (
          <p className="rounded-[10px] border border-dashed border-[var(--border-subtle)] bg-[rgba(11,17,28,.30)] px-3 py-2 text-[10px] leading-4 text-[var(--text-muted)]">
            {emptyText}
          </p>
        )}
      </div>
    </section>
  );
}

function ResourceManagementForm({ resource }: Readonly<{ resource: ResourceItem }>) {
  const archived = Boolean(resource.archivedAt);
  return (
    <section aria-labelledby="resource-management-heading" className="grid gap-2">
      <h3 className="text-[13px] font-semibold text-[var(--text-primary)]" id="resource-management-heading">Resource bearbeiten</h3>
      {!archived ? <form action={updateResourceFormAction} aria-label="Resource bearbeiten" className="grid gap-2 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.40)] p-2">
        <input name="resourceId" type="hidden" value={resource.id} />
        <label className="grid gap-1 text-[10px] font-semibold text-[var(--text-muted)]">Titel<input className="min-h-8 rounded-[9px] border border-[var(--border-subtle)] bg-[rgba(7,11,18,.78)] px-2 text-[11px] text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]" defaultValue={resource.title} name="title" required /></label>
        <label className="grid gap-1 text-[10px] font-semibold text-[var(--text-muted)]">Beschreibung / Notiz<textarea className="min-h-16 rounded-[9px] border border-[var(--border-subtle)] bg-[rgba(7,11,18,.78)] px-2 py-1 text-[11px] text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]" defaultValue={resource.summary} name="body" /></label>
        <label className="grid gap-1 text-[10px] font-semibold text-[var(--text-muted)]">URL<input className="min-h-8 rounded-[9px] border border-[var(--border-subtle)] bg-[rgba(7,11,18,.78)] px-2 text-[11px] text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]" defaultValue={resource.url} name="url" type="url" /></label>
        <label className="grid gap-1 text-[10px] font-semibold text-[var(--text-muted)]">Typ<select className="min-h-8 rounded-[9px] border border-[var(--border-subtle)] bg-[rgba(7,11,18,.78)] px-2 text-[11px] text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]" defaultValue={resource.type} name="type">{Object.entries(resourceTypeMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</select></label>
        <button className="min-h-8 rounded-full border border-[rgba(95,200,215,.34)] bg-[rgba(95,200,215,.12)] text-[10px] font-semibold text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]" type="submit">Änderungen speichern</button>
      </form> : null}
      <form action={archived ? restoreResourceFormAction : archiveResourceFormAction} aria-label={archived ? "Resource wiederherstellen" : "Resource archivieren"}><input name="resourceId" type="hidden" value={resource.id} /><button className="min-h-8 rounded-full border border-[var(--border-subtle)] px-3 text-[10px] font-semibold text-[var(--text-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]" type="submit">{archived ? "Resource wiederherstellen" : "Resource archivieren"}</button></form>
    </section>
  );
}

function relationTargetTypesWithCounts(
  targets: readonly ResourceRelationCreateTarget[],
  currentResourceId: string,
) {
  const entries = (Object.keys(relationTargetTypeLabels) as ResourceRelationTargetType[])
    .map((type) => {
      const count = targets.filter(
        (target) =>
          target.type === type &&
          !(target.type === "resource" && target.id === currentResourceId),
      ).length;

      return { count, type };
    });

  return entries;
}

function ResourceRelationCreateForm({
  createState,
  relationTargets,
  resource,
}: Readonly<{
  createState: string | null;
  relationTargets: readonly ResourceRelationCreateTarget[];
  resource: ResourceItem;
}>) {
  const [targetType, setTargetType] =
    useState<ResourceRelationTargetType>("project");
  const typeCounts = relationTargetTypesWithCounts(relationTargets, resource.id);
  const fallbackType = typeCounts.find((entry) => entry.count > 0)?.type;
  const selectedTargetType =
    typeCounts.some((entry) => entry.type === targetType && entry.count > 0)
      ? targetType
      : (fallbackType ?? targetType);
  const targets = relationTargets.filter(
    (target) =>
      target.type === selectedTargetType &&
      !(target.type === "resource" && target.id === resource.id),
  );
  const disabled = targets.length === 0;
  const message = createState ? relationCreateMessages[createState] : null;

  return (
    <section aria-labelledby="resource-relation-create-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3
          className="text-[13px] font-semibold text-[var(--text-primary)] xl:text-[12px]"
          id="resource-relation-create-heading"
        >
          Beziehung hinzufügen
        </h3>
        <Pill accent="var(--accent-cyan)">Manual</Pill>
      </div>
      <form
        action={linkResourceToTargetAction}
        aria-label="Resource Beziehung hinzufügen"
        className="mt-2 grid gap-2 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.40)] p-3 xl:p-2"
      >
        <input name="resourceId" type="hidden" value={resource.id} />
        <label
          className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]"
          htmlFor="resource-relation-target-type"
        >
          Zieltyp
          <select
            aria-label="Zieltyp"
            className="min-h-8 rounded-[9px] border border-[var(--border-subtle)] bg-[rgba(7,11,18,.78)] px-2 text-[11px] normal-case text-[var(--text-primary)] outline-none focus:border-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-55"
            id="resource-relation-target-type"
            name="targetType"
            onChange={(event) =>
              setTargetType(event.currentTarget.value as ResourceRelationTargetType)
            }
            value={selectedTargetType}
          >
            {typeCounts.map((entry) => (
              <option
                disabled={entry.count === 0}
                key={entry.type}
                value={entry.type}
              >
                {relationTargetTypeLabels[entry.type]} ({entry.count})
              </option>
            ))}
          </select>
        </label>
        <label
          className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]"
          htmlFor="resource-relation-target"
        >
          Ziel
          <select
            aria-label="Ziel"
            className="min-h-8 rounded-[9px] border border-[var(--border-subtle)] bg-[rgba(7,11,18,.78)] px-2 text-[11px] normal-case text-[var(--text-primary)] outline-none focus:border-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-55"
            disabled={disabled}
            id="resource-relation-target"
            name="targetId"
            required
          >
            {targets.map((target) => (
              <option key={`${target.type}-${target.id}`} value={target.id}>
                {target.title} · {target.meta}
              </option>
            ))}
          </select>
        </label>
        <label
          className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]"
          htmlFor="resource-relation-type"
        >
          Relation
          <select
            aria-label="Relation"
            className="min-h-8 rounded-[9px] border border-[var(--border-subtle)] bg-[rgba(7,11,18,.78)] px-2 text-[11px] normal-case text-[var(--text-primary)] outline-none focus:border-[var(--focus-ring)]"
            defaultValue="related"
            id="resource-relation-type"
            name="relationType"
          >
            {Object.entries(dataRelationTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="min-h-8 rounded-full border border-[rgba(95,200,215,.34)] bg-[rgba(95,200,215,.14)] px-3 text-[10px] font-semibold text-[var(--text-primary)] transition hover:border-[rgba(95,200,215,.48)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:border-[var(--border-subtle)] disabled:bg-[rgba(18,28,43,.34)] disabled:text-[var(--text-muted)]"
          disabled={disabled}
          type="submit"
        >
          Speichern
        </button>
        {disabled ? (
          <p className="text-[10px] leading-4 text-[var(--text-muted)]">
            Keine Ziele verfügbar.
          </p>
        ) : null}
        {message ? (
          <p
            className="text-[10px] leading-4 text-[var(--text-secondary)]"
            role="status"
          >
            {message}
          </p>
        ) : null}
      </form>
    </section>
  );
}

function ResourceRelationInspector({
  clusters,
  contentState,
  createState,
  makeHref,
  profileId,
  relationTargets,
  resource,
  resources,
  relations,
}: Readonly<{
  clusters: ResourceCluster[];
  contentState: ContentStateMeta;
  createState: string | null;
  makeHref: (updates: ResourceHrefUpdates) => string;
  profileId: ResourcesViewModel["profileId"];
  relationTargets: readonly ResourceRelationCreateTarget[];
  resource: ResourceItem;
  resources: ResourceItem[];
  relations: ResourceRelation[];
}>) {
  const type = resourceTypeMeta[resource.type];
  const area = resourceAreaMeta[resource.area];
  const status = resourceStatusMeta[resource.status];
  const review = resourceReviewStateMeta[resource.reviewState];
  const cluster = clusters.find((item) => item.id === resource.clusterId);
  const connections = getResourceConnections(resource, resources, relations);
  const sourceChainConnections = connections.filter((connection) =>
    [
      "derived_from",
      "source_for",
      "feeds_into",
      "references",
      "follow_up_of",
    ].includes(connection.relation.type),
  );
  const relatedConnections = connections.filter(
    (connection) => !sourceChainConnections.includes(connection),
  );
  const relatedDecisions = connections.filter(
    (connection) => connection.resource.type === "decision",
  );
  const derivedResources = connections.filter(
    (connection) =>
      connection.direction === "outgoing" &&
      ["source_for", "feeds_into", "used_in"].includes(connection.relation.type),
  );
  const linkedContextGroups = (
    Object.keys(contextKindLabels) as ResourceLinkedContextKind[]
  )
    .map((kind) => ({
      kind,
      label: contextKindLabels[kind],
      items: resource.linkedContexts.filter((context) => context.kind === kind),
    }))
    .filter((group) => group.items.length > 0);
  const relatedProjects = resource.relatedProjects ?? [];
  const relatedGoals = resource.relatedGoals ?? [];
  const relatedTasks = resource.relatedTasks ?? [];
  const relatedResourceRelations = resource.relatedResourceRelations ?? [];

  return (
    <aside
      aria-labelledby="selected-resource-heading"
      className="flex min-w-0 flex-col overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.86)] shadow-[0_8px_22px_rgba(0,0,0,.12)] xl:h-full xl:min-h-0 xl:flex-1"
      data-resources-section="relation-inspector"
      {...contentStateAttributes(contentState, profileId)}
    >
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.50)] px-3 py-3 xl:px-2.5 xl:py-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-cyan)] xl:text-[9px]">
              Relation Inspector
            </p>
            <h2
              className="mt-1 text-[20px] font-semibold leading-6 text-[var(--text-primary)] xl:truncate xl:text-[16px] xl:leading-5"
              id="selected-resource-heading"
            >
              {resource.title}
            </h2>
          </div>
          <div className="flex flex-wrap justify-end gap-1.5 xl:gap-1">
            <Pill accent={type.accent}>{type.label}</Pill>
            <Pill accent={status.accent}>{status.label}</Pill>
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-3 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:p-2">
        {profileId === "manual" ? <ResourceManagementForm resource={resource} /> : null}
        <section aria-labelledby="resource-overview-heading">
          <h3
            className="text-[13px] font-semibold text-[var(--text-primary)] xl:text-[12px]"
            id="resource-overview-heading"
          >
            Resource Overview
          </h3>
          <div className="mt-2 grid gap-2 sm:grid-cols-4 xl:gap-1.5">
            <FieldCard accent={type.accent} label="Type" value={type.label} />
            <FieldCard accent={area.accent} label="Area" value={area.label} />
            <FieldCard
              accent={review.accent}
              label="Review"
              value={review.label}
            />
            <FieldCard
              accent={status.accent}
              label="Reusable"
              value={status.label}
            />
          </div>
        </section>

        <div className="grid gap-2 xl:grid-cols-2">
          <DetailBlock expanded label="Short Summary" value={resource.summary} />
          <DetailBlock
            expanded
            label="Key Learning"
            value={resource.keyLearning}
          />
        </div>
        <DetailBlock label="Next Use" value={resource.nextUse} />

        <section aria-labelledby="linked-context-heading">
          <h3
            className="text-[13px] font-semibold text-[var(--text-primary)] xl:text-[12px]"
            id="linked-context-heading"
          >
            Linked Context
          </h3>
          <div className="mt-2 grid gap-1.5 xl:mt-1.5 xl:grid-cols-2 xl:gap-1">
            {linkedContextGroups.map((group) => (
              <div
                className="rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.40)] px-3 py-2 xl:px-2 xl:py-1.5"
                key={group.kind}
              >
                <p className="text-[10px] font-semibold text-[var(--text-muted)]">
                  {group.label}
                </p>
                {group.items.map((context) => (
                  <p
                    className="mt-1 truncate text-[11px] leading-4 text-[var(--text-secondary)] xl:text-[10px] xl:leading-3"
                    key={context.id}
                  >
                    {context.title}
                    <span className="text-[var(--text-muted)]">
                      {" "}
                      / {context.detail}
                    </span>
                  </p>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="resource-relations-heading">
          <h3
            className="text-[13px] font-semibold text-[var(--text-primary)] xl:text-[12px]"
            id="resource-relations-heading"
          >
            Beziehungen
          </h3>
          <div className="mt-2 grid gap-2">
            <ResourceTargetRelationList
              emptyText="Keine verknüpften Projects."
              profileId={profileId}
              relations={relatedProjects}
              resourceId={resource.id}
              title="Verknüpfte Projects"
            />
            <ResourceTargetRelationList
              emptyText="Keine verknüpften Goals."
              profileId={profileId}
              relations={relatedGoals}
              resourceId={resource.id}
              title="Verknüpfte Goals"
            />
            <ResourceTargetRelationList
              emptyText="Keine verknüpften Tasks."
              profileId={profileId}
              relations={relatedTasks}
              resourceId={resource.id}
              title="Verknüpfte Tasks"
            />
            <ResourceTargetRelationList
              emptyText="Keine verknüpften Resources."
              profileId={profileId}
              relations={relatedResourceRelations}
              resourceId={resource.id}
              title="Verknüpfte Resources"
            />
          </div>
        </section>

        {profileId === "manual" && !resource.archivedAt ? (
          <ResourceRelationCreateForm
            createState={createState}
            relationTargets={relationTargets}
            resource={resource}
          />
        ) : null}

        {profileId === "demo" ? (
          <>
            <ConnectionList
              connections={relatedConnections}
              emptyText="No direct related-resource edge is in the current mock neighborhood."
              makeHref={makeHref}
              title="Related Resources"
            />
            <ConnectionList
              connections={sourceChainConnections}
              emptyText="No source chain edge has been modeled for this resource yet."
              makeHref={makeHref}
              title="Source Chain"
            />
            <ConnectionList
              connections={relatedDecisions}
              emptyText="No related decision note is connected to this resource."
              makeHref={makeHref}
              title="Related Decisions"
            />
            <ConnectionList
              connections={derivedResources}
              emptyText="No derived prompt, learning or decision is connected yet."
              makeHref={makeHref}
              title="Derived Resources"
            />
          </>
        ) : null}

        <section aria-labelledby="resource-actions-heading">
          <h3
            className="text-[13px] font-semibold text-[var(--text-primary)] xl:text-[12px]"
            id="resource-actions-heading"
          >
            Actions
          </h3>
          <div className="mt-2 grid gap-1.5 xl:mt-1.5 xl:grid-cols-2 xl:gap-1.5">
            {resource.actions.map((action, index) => (
              <button
                className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.42)] px-3 py-2 text-left transition hover:border-[var(--border-default)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] xl:px-2 xl:py-1.5"
                key={`resource-action-${index}`}
                type="button"
              >
                <span className="block text-[12px] font-semibold leading-4 text-[var(--text-primary)] xl:text-[11px] xl:leading-3">
                  {action.label}
                </span>
                <span className="mt-0.5 block text-[10px] leading-4 text-[var(--text-muted)] xl:line-clamp-1 xl:leading-3">
                  {action.detail}
                </span>
              </button>
            ))}
          </div>
        </section>

        <p className="rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.32)] px-3 py-2 text-[10px] leading-4 text-[var(--text-muted)] xl:hidden">
          Cluster: {cluster?.title ?? "Unclustered"} / Last touched:{" "}
          {resource.lastTouched}. Resources stores reusable knowledge. Inbox
          remains for raw capture, and Projects, Goals, Skills and Areas only
          link or filter these resources later.
        </p>
      </div>
    </aside>
  );
}

function FieldCard({
  label,
  value,
  accent,
}: Readonly<{
  label: string;
  value: string;
  accent: string;
}>) {
  return (
    <div
      className="rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_16%,transparent)] bg-[rgba(11,17,28,.42)] px-3 py-2 xl:px-2 xl:py-1.5"
      style={accentStyle(accent)}
    >
      <p className="text-[10px] font-semibold text-[var(--text-muted)] xl:text-[9px]">
        {label}
      </p>
      <p className="mt-1 text-[12px] leading-4 text-[var(--text-secondary)] xl:mt-0.5 xl:truncate xl:text-[10px] xl:leading-3">
        {value}
      </p>
    </div>
  );
}

function DetailBlock({
  expanded = false,
  label,
  value,
}: Readonly<{
  expanded?: boolean;
  label: string;
  value: string;
}>) {
  return (
    <section>
      <h3 className="text-[13px] font-semibold text-[var(--text-primary)] xl:text-[12px]">
        {label}
      </h3>
      <p
        className={cn(
          "mt-2 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.42)] px-3 py-2 text-[11px] leading-5 text-[var(--text-secondary)] xl:mt-1.5 xl:px-2 xl:py-1.5 xl:text-[10px] xl:leading-4",
          expanded
            ? "xl:min-h-[68px] xl:overflow-visible [@media(min-width:2200px)]:min-h-[76px]"
            : "xl:line-clamp-2",
        )}
      >
        {value}
      </p>
    </section>
  );
}

function ResourceKnowledgeMap({
  clusters,
  contentState,
  makeHref,
  mapScopes,
  profileId,
  relations,
  resources,
  selectedResource,
}: Readonly<{
  clusters: ResourceCluster[];
  contentState: ContentStateMeta;
  makeHref: (updates: ResourceHrefUpdates) => string;
  mapScopes: ResourceOption<string>[];
  profileId: ResourcesViewModel["profileId"];
  relations: ResourceRelation[];
  resources: ResourceItem[];
  selectedResource: ResourceItem | null;
}>) {
  if (!selectedResource) {
    return (
      <section
        aria-labelledby="resources-map-heading"
        className="flex min-w-0 flex-col overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.82)] shadow-[0_8px_22px_rgba(0,0,0,.12)] xl:h-full xl:min-h-0"
        data-resources-section="knowledge-map"
        {...contentStateAttributes(contentState, profileId)}
      >
        <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] px-3 py-3 xl:px-2.5 xl:py-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2
                className="text-[16px] font-semibold leading-5 text-[var(--text-primary)] xl:text-[14px] xl:leading-4"
                id="resources-map-heading"
              >
                Knowledge Map
              </h2>
              <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-muted)] xl:line-clamp-1 xl:leading-3">
                Scoped to selected resource neighborhood, not all resources.
              </p>
            </div>
            <Pill accent="var(--accent-blue)">Map</Pill>
          </div>
        </div>
        <div className="grid gap-2 p-2.5 xl:min-h-0 xl:flex-1 xl:p-2">
          <div className="-mx-1 overflow-x-auto px-1">
            <div className="flex w-max min-w-full gap-1.5 xl:gap-1">
              {mapScopes.map((scope) => (
                <button
                  aria-pressed={Boolean(scope.active)}
                  className={controlClass(scope.active)}
                  key={scope.value}
                  style={accentStyle(scope.accent ?? "var(--accent-cyan)")}
                  type="button"
                >
                  {scope.label}
                </button>
              ))}
            </div>
          </div>
          <EmptyState
            description="Speichere eine Ressource, damit Beziehungen im Knowledge Map View sichtbar werden."
            title="Noch keine Map-Daten"
          />
        </div>
      </section>
    );
  }

  const selectedType = resourceTypeMeta[selectedResource.type];
  const selectedCluster = clusters.find(
    (cluster) => cluster.id === selectedResource.clusterId,
  );
  const connections = getResourceConnections(
    selectedResource,
    resources,
    relations,
  );
  const visibleConnections = connections.slice(0, mapNodeSlots.length);

  return (
    <section
      aria-labelledby="resources-map-heading"
      className="flex min-w-0 flex-col overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.82)] shadow-[0_8px_22px_rgba(0,0,0,.12)] xl:h-full xl:min-h-0"
      data-resources-section="knowledge-map"
      {...contentStateAttributes(contentState, profileId)}
    >
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] px-3 py-3 xl:px-2.5 xl:py-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2
              className="text-[16px] font-semibold leading-5 text-[var(--text-primary)] xl:text-[14px] xl:leading-4"
              id="resources-map-heading"
            >
              Knowledge Map
            </h2>
            <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-muted)] xl:line-clamp-1 xl:leading-3">
              Scoped to selected resource neighborhood, not all resources.
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-1.5 xl:gap-1">
            <Pill accent="var(--accent-blue)">Map</Pill>
            <Pill accent={selectedCluster?.accent ?? selectedType.accent}>
              {selectedCluster?.title ?? "Unclustered"}
            </Pill>
          </div>
        </div>
      </div>

      <div className="grid gap-2 p-2.5 xl:min-h-0 xl:flex-1 xl:grid-rows-[auto_minmax(0,1fr)_auto] xl:p-2">
        <div className="-mx-1 overflow-x-auto px-1">
          <div className="flex w-max min-w-full gap-1.5 xl:gap-1">
            {mapScopes.map((scope) => (
              <button
                aria-pressed={Boolean(scope.active)}
                className={controlClass(scope.active)}
                key={scope.value}
                style={accentStyle(scope.accent ?? "var(--accent-cyan)")}
                type="button"
              >
                {scope.label}
              </button>
            ))}
          </div>
        </div>

        <div
          aria-label={`Knowledge map around ${selectedResource.title}`}
          className="relative min-h-[500px] overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[radial-gradient(circle_at_center,rgba(95,200,215,.08),rgba(11,17,28,.34)_34%,rgba(11,17,28,.58))] xl:min-h-0"
        >
          <svg
            aria-hidden="true"
            className="absolute inset-0 h-full w-full"
            focusable="false"
          >
            {visibleConnections.map((connection, index) => {
              const slot = mapNodeSlots[index];

              return (
                <line
                  key={connection.relation.id}
                  stroke="var(--border-strong)"
                  strokeWidth="1"
                  x1="50%"
                  x2={`${slot.x}%`}
                  y1="50%"
                  y2={`${slot.y}%`}
                />
              );
            })}
          </svg>

          <div
            className="absolute left-1/2 top-1/2 w-[168px] -translate-x-1/2 -translate-y-1/2 rounded-[16px] border border-[color-mix(in_srgb,var(--accent)_38%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,rgba(18,28,43,.92))] p-3 text-center shadow-[0_8px_22px_rgba(0,0,0,.16)] xl:w-[190px]"
            style={accentStyle(selectedType.accent)}
          >
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
              Selected
            </p>
            <h3 className="mt-1 line-clamp-2 text-[12px] font-semibold leading-4 text-[var(--text-primary)]">
              {selectedResource.title}
            </h3>
            <p className="mt-1 text-[10px] leading-3 text-[var(--text-muted)]">
              {selectedResource.topic}
            </p>
          </div>

          {visibleConnections.map((connection, index) => {
            const slot = mapNodeSlots[index];
            const type = resourceTypeMeta[connection.resource.type];

            return (
              <Link
                className="absolute w-[138px] -translate-x-1/2 -translate-y-1/2 rounded-[14px] border border-[color-mix(in_srgb,var(--accent)_24%,transparent)] bg-[rgba(11,17,28,.86)] p-2 transition hover:border-[color-mix(in_srgb,var(--accent)_42%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] sm:w-[164px] xl:w-[180px]"
                href={makeHref({ selected: connection.resource.id })}
                key={connection.relation.id}
                style={{
                  ...accentStyle(type.accent),
                  left: `${slot.x}%`,
                  top: `${slot.y}%`,
                }}
              >
                <p className="line-clamp-2 text-[11px] font-semibold leading-4 text-[var(--text-primary)] xl:text-[10px] xl:leading-3">
                  {connection.resource.title}
                </p>
                <p className="mt-1 truncate text-[9px] leading-3 text-[var(--text-muted)]">
                  {connectionLabel(connection)}
                </p>
                <p className="mt-1 truncate text-[9px] leading-3 text-[var(--accent)]">
                  {type.shortLabel}
                </p>
              </Link>
            );
          })}
        </div>

        <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(260px,.45fr)]">
          <div className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.34)] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
              Visible Connections
            </p>
            <div className="mt-2 grid gap-1.5">
              {visibleConnections.length > 0 ? (
                visibleConnections.map((connection) => (
                  <ConnectionLink
                    connection={connection}
                    key={`map-${connection.relation.id}`}
                    makeHref={makeHref}
                  />
                ))
              ) : (
                <p className="text-[10px] leading-4 text-[var(--text-muted)]">
                  No direct neighborhood edges are modeled yet.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.34)] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
              Cluster Signal
            </p>
            <p className="mt-2 text-[11px] font-semibold leading-4 text-[var(--text-primary)]">
              {selectedCluster?.title ?? "Unclustered"}
            </p>
            <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
              {selectedCluster?.summary ??
                "This resource has no cluster in the current mock map."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ResourceReviewWorkbench({
  aiSuggestions,
  contentState,
  items,
  makeHref,
  profileId,
  resources,
}: Readonly<{
  aiSuggestions: ResourceAiSuggestion[];
  contentState: ContentStateMeta;
  items: ResourceReviewQueueItem[];
  makeHref: (updates: ResourceHrefUpdates) => string;
  profileId: ResourcesViewModel["profileId"];
  resources: ResourceItem[];
}>) {
  return (
    <section
      aria-labelledby="resources-review-heading"
      className="flex min-w-0 flex-col overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.82)] shadow-[0_8px_22px_rgba(0,0,0,.12)] xl:h-full xl:min-h-0"
      data-resources-section="review-workbench"
      {...contentStateAttributes(contentState, profileId)}
    >
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] px-3 py-3 xl:px-2.5 xl:py-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2
              className="text-[16px] font-semibold leading-5 text-[var(--text-primary)] xl:text-[14px] xl:leading-4"
              id="resources-review-heading"
            >
              Review Workbench
            </h2>
            <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-muted)] xl:line-clamp-1 xl:leading-3">
              Process raw resources into reusable knowledge, links or prompt patterns.
            </p>
          </div>
          <Pill accent="var(--accent-orange)">manual approval</Pill>
        </div>
      </div>

      <div className="grid gap-2 p-2.5 xl:min-h-0 xl:flex-1 xl:grid-rows-[minmax(0,1fr)_auto] xl:p-2">
        <div className="grid content-start gap-2 xl:min-h-0 xl:grid-cols-2 xl:overflow-y-auto">
          {items.length > 0 ? (
            items.map((item) => {
              const resource = getResourceById(resources, item.resourceId);

              return (
                <article
                  className="rounded-[14px] border border-[color-mix(in_srgb,var(--accent)_20%,transparent)] bg-[color-mix(in_srgb,var(--accent)_7%,rgba(11,17,28,.54))] p-3 xl:p-2.5"
                  key={item.resourceId}
                  style={accentStyle(item.accent)}
                >
                  <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
                        {item.sourceType} {"->"} {item.targetType}
                      </p>
                      <h3 className="mt-1 text-[13px] font-semibold leading-5 text-[var(--text-primary)] xl:text-[12px] xl:leading-4">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
                        {item.linkedContext} / {item.status}
                      </p>
                    </div>
                    {resource ? (
                      <Link
                        className="inline-flex min-h-7 items-center rounded-full border border-[color-mix(in_srgb,var(--accent)_28%,transparent)] bg-[rgba(11,17,28,.40)] px-2.5 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[color-mix(in_srgb,var(--accent)_46%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                        href={makeHref({ selected: resource.id })}
                        style={accentStyle(item.accent)}
                      >
                        Inspect
                      </Link>
                    ) : null}
                  </div>

                  <div className="mt-3 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.34)] px-3 py-2">
                    <p className="text-[10px] font-semibold text-[var(--text-muted)]">
                      Suggested next action
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-[var(--text-secondary)]">
                      {item.action}
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {item.suggestedActions.map((action, index) => (
                      <button
                        className="min-h-7 rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.58)] px-2.5 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                        key={`resource-review-action-${index}`}
                        type="button"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="xl:col-span-2">
              <EmptyState
                description="Neue Ressourcen erscheinen hier, sobald sie in der Workbench geprueft werden muessen."
                title="Keine Ressourcen zur Prüfung"
              />
            </div>
          )}
        </div>

        <div className="grid gap-2 xl:grid-cols-3">
          {aiSuggestions.length > 0 ? (
            aiSuggestions.map((suggestion, index) => (
              <article
                className="rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_18%,transparent)] bg-[rgba(11,17,28,.36)] px-3 py-2"
                key={`resource-inspector-suggestion-${index}`}
                style={accentStyle(suggestion.accent)}
              >
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <h3 className="truncate text-[11px] font-semibold text-[var(--text-primary)]">
                    {suggestion.title}
                  </h3>
                  <Pill accent={suggestion.accent}>
                    {suggestion.confidence}
                  </Pill>
                </div>
                <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
                  {suggestion.detail}
                </p>
              </article>
            ))
          ) : (
            <div className="xl:col-span-3">
              <EmptyState
                description="Review-Hinweise erscheinen erst, wenn lokale Ressourcen vorhanden sind."
                title="Keine Review-Hinweise"
              />
            </div>
          )}
        </div>

        <p className="rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.32)] px-3 py-2 text-[10px] leading-4 text-[var(--text-muted)]">
          AI suggestions require review before they change the knowledge graph.
        </p>
      </div>
    </section>
  );
}

function AISuggestionsPanel({
  items,
}: Readonly<{
  items: ResourceAiSuggestion[];
}>) {
  return (
    <section
      aria-labelledby="resource-ai-suggestions-heading"
      className="flex min-w-0 flex-col overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.76)] xl:h-full xl:min-h-0"
    >
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.44)] px-3 py-3 xl:px-2.5 xl:py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-cyan)] xl:text-[9px]">
              Suggestions
            </p>
            <h2
              className="mt-1 text-[16px] font-semibold leading-5 text-[var(--text-primary)] xl:text-[13px] xl:leading-4"
              id="resource-ai-suggestions-heading"
            >
              AI Review Hints
            </h2>
          </div>
          <Pill accent="var(--accent-cyan)">not final</Pill>
        </div>
      </div>
      <div className="grid gap-1.5 p-3 xl:min-h-0 xl:flex-1 xl:gap-1.5 xl:p-2">
        {items.length > 0 ? (
          items.map((item, index) => (
            <article
              className="rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_16%,transparent)] bg-[rgba(11,17,28,.42)] px-3 py-2 xl:px-2 xl:py-1.5"
              key={`resource-ai-suggestion-${index}`}
              style={accentStyle(item.accent)}
            >
              <div className="flex min-w-0 items-center justify-between gap-2">
                <h3 className="truncate text-[11px] font-semibold text-[var(--text-primary)]">
                  {item.title}
                </h3>
                <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  {item.confidence}
                </span>
              </div>
              <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)] xl:line-clamp-2">
                {item.detail}
              </p>
            </article>
          ))
        ) : (
          <EmptyState
            description="Hinweise erscheinen hier, sobald lokale Ressourcen Review-Kontext liefern."
            title="Keine Review-Hinweise"
          />
        )}
        <p className="rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.32)] px-3 py-2 text-[10px] leading-4 text-[var(--text-muted)]">
          AI suggestions require review before they change the knowledge graph.
        </p>
      </div>
    </section>
  );
}

function ReviewQueue({
  contentState,
  items,
  profileId,
}: Readonly<{
  contentState: ContentStateMeta;
  items: ResourceReviewQueueItem[];
  profileId: ResourcesViewModel["profileId"];
}>) {
  const visibleItems = items.slice(0, 4);

  return (
    <section
      aria-labelledby="review-queue-heading"
      className="flex min-w-0 flex-col overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.76)] xl:h-full xl:min-h-0"
      data-resources-section="review-queue"
      {...contentStateAttributes(contentState, profileId)}
    >
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.44)] px-3 py-3 xl:px-2.5 xl:py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-orange)] xl:text-[9px]">
              Review Needed
            </p>
            <h2
              className="mt-1 text-[16px] font-semibold leading-5 text-[var(--text-primary)] xl:text-[13px] xl:leading-4"
              id="review-queue-heading"
            >
              Review Queue
            </h2>
          </div>
          <Pill accent="var(--accent-orange)">{items.length} open</Pill>
        </div>
      </div>
      <div className="grid gap-1.5 p-3 xl:min-h-0 xl:flex-1 xl:grid-cols-2 xl:auto-rows-fr xl:gap-1.5 xl:p-2">
        {visibleItems.length > 0 ? (
          visibleItems.map((item, index) => (
            <article
              className="rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_18%,transparent)] bg-[color-mix(in_srgb,var(--accent)_7%,rgba(11,17,28,.48))] px-3 py-2 xl:flex xl:min-h-0 xl:flex-col xl:justify-center xl:px-2 xl:py-1.5 [@media(min-width:2200px)]:px-2.5"
              key={`resource-review-queue-${index}`}
              style={accentStyle(item.accent)}
            >
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-[12px] font-semibold leading-4 text-[var(--text-primary)] xl:text-[10px] xl:leading-3">
                    {item.title}
                  </h3>
                  <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-muted)] xl:truncate xl:text-[9px] xl:leading-3">
                    {item.linkedContext}
                  </p>
                </div>
                <Pill accent={item.accent}>{item.action}</Pill>
              </div>
            </article>
          ))
        ) : (
          <EmptyState
            description="Neue Ressourcen erscheinen hier, sobald sie Review brauchen."
            title="Keine Review-Punkte offen"
          />
        )}
      </div>
    </section>
  );
}

function RecentLearnings({
  contentState,
  items,
  profileId,
}: Readonly<{
  contentState: ContentStateMeta;
  items: RecentLearning[];
  profileId: ResourcesViewModel["profileId"];
}>) {
  const visibleItems = items.slice(0, WIDE_DESKTOP_RECENT_LEARNINGS_LIMIT);

  return (
    <section
      aria-labelledby="recent-learnings-heading"
      className="flex min-w-0 flex-col overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.76)] xl:h-full xl:min-h-0"
      data-resources-section="recent-learnings"
      {...contentStateAttributes(contentState, profileId)}
    >
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.44)] px-3 py-3 xl:px-2.5 xl:py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-green)] xl:text-[9px]">
              Learning Memory
            </p>
            <h2
              className="mt-1 text-[16px] font-semibold leading-5 text-[var(--text-primary)] xl:text-[13px] xl:leading-4"
              id="recent-learnings-heading"
            >
              Recent Learnings
            </h2>
          </div>
          <Pill accent="var(--accent-green)">Reusable Notes</Pill>
        </div>
      </div>
      <div className="grid gap-1.5 p-3 xl:min-h-0 xl:flex-1 xl:auto-rows-fr xl:gap-1.5 xl:p-2">
        {visibleItems.length > 0 ? (
          visibleItems.map((item, index) => (
            <article
              className={cn(
                "rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_16%,transparent)] bg-[rgba(11,17,28,.42)] px-3 py-2 xl:flex xl:min-h-0 xl:items-center xl:px-2 xl:py-1.5 [@media(min-width:2200px)]:px-2.5",
                index >= DESKTOP_RECENT_LEARNINGS_LIMIT &&
                  "xl:hidden [@media(min-width:2200px)]:flex",
              )}
              key={`resource-recent-learning-${index}`}
              style={accentStyle(item.accent)}
            >
              <div className="flex min-w-0 items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--accent)]"
                />
                <div className="min-w-0">
                  <h3 className="line-clamp-1 text-[12px] font-semibold leading-4 text-[var(--text-primary)] xl:text-[10px] xl:leading-3">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-[10px] leading-4 text-[var(--text-secondary)] xl:line-clamp-1 xl:text-[9px] xl:leading-3">
                    {item.insight}
                  </p>
                  <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)] xl:hidden [@media(min-width:2200px)]:block">
                    Source: {item.source}
                  </p>
                </div>
              </div>
            </article>
          ))
        ) : (
          <EmptyState
            description="Gespeicherte Learnings erscheinen hier, sobald lokale Ressourcen vorhanden sind."
            title="Noch keine Learnings"
          />
        )}
      </div>
    </section>
  );
}

function PageContractNote({
  pageContract,
}: Readonly<{
  pageContract: ResourcesViewModel["pageContract"];
}>) {
  return (
    <section
      aria-label="Resources page contract"
      className="min-w-0 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.36)] px-3 py-2 xl:hidden"
    >
      <div className="grid gap-1 text-[10px] leading-4 text-[var(--text-muted)] xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <p>
          <span className="font-semibold text-[var(--text-secondary)]">
            Page Type:
          </span>{" "}
          {pageContract.pageType}
        </p>
        <p>
          <span className="font-semibold text-[var(--text-secondary)]">
            Primary Decision:
          </span>{" "}
          {pageContract.primaryDecision}
        </p>
        <p>{pageContract.primaryPurpose}</p>
        <p>{pageContract.sensitiveData}</p>
      </div>
    </section>
  );
}

export function ResourcesPage({
  viewModel,
}: Readonly<{
  viewModel: ResourcesViewModel;
}>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeView = normalizeResourceView(searchParams.get("view"));
  const selectedResourceId = searchParams.get("selected");
  const resourceState = searchParams.get("resourceState");
  const query = (searchParams.get("q") ?? "").trim().toLocaleLowerCase();
  const relationCreateState = searchParams.get("relationCreate");
  const filteredResources = useMemo(() => {
    if (!query) return viewModel.resources;
    return viewModel.resources.filter((resource) =>
      [resource.title, resource.summary, resource.url, resource.type, resourceTypeMeta[resource.type].label]
        .filter(Boolean)
        .some((value) => value?.toLocaleLowerCase().includes(query)),
    );
  }, [query, viewModel.resources]);
  const selectedResource = useMemo(
    () =>
      filteredResources.find((resource) => resource.id === selectedResourceId) ??
      filteredResources[0] ??
      null,
    [filteredResources, selectedResourceId],
  );
  const viewOptions = useMemo(
    () =>
      viewModel.viewOptions.map((view) => ({
        ...view,
        active: view.value === activeView,
      })),
    [activeView, viewModel.viewOptions],
  );
  const makeHref = (updates: ResourceHrefUpdates) =>
    createResourceHref(pathname, searchParams, updates);

  return (
    <div
      className="mx-auto flex min-h-screen w-full max-w-[2208px] flex-col gap-2 pb-8 xl:h-[calc(100dvh-1.25rem)] xl:min-h-0 xl:overflow-hidden xl:pb-0"
      data-resources-section="page"
      {...contentStateAttributes(viewModel.contentStates.page, viewModel.profileId)}
      id="resources-page"
    >
      <ResourcesPageHeader viewModel={viewModel} />
      {resourceState && resourceStateMessages[resourceState] ? <p className="rounded-[10px] border border-[var(--border-subtle)] px-3 py-2 text-[11px] text-[var(--text-secondary)]" role="status">{resourceStateMessages[resourceState]}</p> : null}
      <ResourceSummaryStrip
        contentState={viewModel.contentStates.summary}
        profileId={viewModel.profileId}
        stats={viewModel.summaryStats}
      />
      <ResourceViewSwitcher
        activeView={activeView}
        makeHref={makeHref}
        viewOptions={viewOptions}
      />
      <SaveResourceCard captureTypes={viewModel.captureTypes} profileId={viewModel.profileId} />
      {activeView === "library" ? (
        <ResourceControls
          filterOptions={viewModel.filterOptions}
          query={query}
          typeOptions={viewModel.typeOptions}
        />
      ) : null}

      <div
        className="grid min-w-0 items-start gap-2 xl:min-h-0 xl:flex-1 xl:items-stretch xl:grid-cols-[minmax(0,1fr)_minmax(360px,430px)] [@media(min-width:2200px)]:grid-cols-[minmax(0,1fr)_minmax(400px,500px)]"
        data-resources-workbench
      >
        <div
          className={cn(
            "grid min-w-0 gap-2 xl:h-full xl:min-h-0",
            activeView === "library"
              ? "xl:grid-rows-[minmax(0,1fr)_155px] [@media(min-width:2200px)]:grid-rows-[minmax(0,1fr)_180px]"
              : "xl:grid-rows-[minmax(0,1fr)]",
          )}
        >
          {activeView === "library" ? (
            <>
              <ResourceLibrary
                contentState={viewModel.contentStates.library}
                makeHref={makeHref}
                profileId={viewModel.profileId}
                resources={filteredResources}
                selectedResource={selectedResource}
              />
              <div className="hidden xl:block xl:min-h-0">
                <ReviewQueue
                  contentState={viewModel.contentStates.reviewQueue}
                  items={viewModel.reviewQueue}
                  profileId={viewModel.profileId}
                />
              </div>
            </>
          ) : null}
          {activeView === "map" ? (
            <ResourceKnowledgeMap
              clusters={viewModel.clusters}
              contentState={viewModel.contentStates.knowledgeMap}
              makeHref={makeHref}
              mapScopes={viewModel.mapScopes}
              profileId={viewModel.profileId}
              relations={viewModel.relations}
              resources={viewModel.resources}
              selectedResource={selectedResource}
            />
          ) : null}
          {activeView === "review" ? (
            <ResourceReviewWorkbench
              aiSuggestions={viewModel.aiSuggestions}
              contentState={viewModel.contentStates.reviewWorkbench}
              items={viewModel.reviewQueue}
              makeHref={makeHref}
              profileId={viewModel.profileId}
              resources={viewModel.resources}
            />
          ) : null}
        </div>
        <div className="grid min-w-0 gap-2 xl:h-full xl:min-h-0 xl:grid-rows-[minmax(0,13fr)_minmax(0,7fr)]">
          {selectedResource ? (
            <ResourceRelationInspector
              clusters={viewModel.clusters}
              contentState={viewModel.contentStates.relationInspector}
              createState={relationCreateState}
              makeHref={makeHref}
              profileId={viewModel.profileId}
              relationTargets={viewModel.relationTargets}
              relations={viewModel.relations}
              resource={selectedResource}
              resources={viewModel.resources}
            />
          ) : (
            <ResourceRelationEmptyInspector
              contentState={viewModel.contentStates.relationInspector}
              profileId={viewModel.profileId}
            />
          )}
          {activeView === "library" ? (
            <RecentLearnings
              contentState={viewModel.contentStates.recentLearnings}
              items={viewModel.recentLearnings}
              profileId={viewModel.profileId}
            />
          ) : (
            <AISuggestionsPanel items={viewModel.aiSuggestions} />
          )}
        </div>
        {activeView !== "review" ? (
          <div className="xl:hidden">
            <ReviewQueue
              contentState={viewModel.contentStates.reviewQueue}
              items={viewModel.reviewQueue}
              profileId={viewModel.profileId}
            />
          </div>
        ) : null}
      </div>

      <PageContractNote pageContract={viewModel.pageContract} />
    </div>
  );
}
