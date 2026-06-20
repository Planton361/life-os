import {
  EmptyState,
  Pill,
  accentStyle,
} from "@/components/layout/route-page-primitives";
import { cn } from "@/lib/cn";
import {
  resourceAreaMeta,
  resourceReviewStateMeta,
  resourceStatusMeta,
  resourceTypeMeta,
} from "../resources-view-model";
import type {
  RecentLearning,
  ResourceItem,
  ResourceOption,
  ResourceReviewQueueItem,
  ResourceSummaryStat,
  ResourceType,
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
  stats,
}: Readonly<{
  stats: ResourceSummaryStat[];
}>) {
  return (
    <section
      aria-label="Resource summary"
      className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6"
    >
      {stats.map((stat) => (
        <article
          className="min-h-[58px] rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_20%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_6%,rgba(15,23,36,.68))] px-3 py-2 xl:min-h-[46px] xl:px-2.5 xl:py-1.5"
          key={stat.label}
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

function SaveResourceCard({
  captureTypes,
}: Readonly<{
  captureTypes: ResourceOption<ResourceType>[];
}>) {
  return (
    <section
      aria-label="Save Resource"
      className="min-w-0 overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.74)] xl:min-h-[96px]"
    >
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] px-3 py-3 xl:hidden">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-cyan)]">
              Quick Capture
            </p>
            <h2
              className="mt-1 text-[16px] font-semibold leading-5 text-[var(--text-primary)]"
            >
              Save Resource
            </h2>
          </div>
          <Pill accent="var(--accent-cyan)">Inbox separate</Pill>
        </div>
      </div>

      <div className="grid gap-3 p-3 xl:grid-cols-[190px_minmax(0,1.1fr)_minmax(170px,.55fr)_minmax(0,1fr)_auto] xl:items-end xl:gap-2 xl:p-2.5">
        <div className="hidden min-w-0 xl:block">
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-cyan)]">
            Quick Capture
          </p>
          <h2
            className="mt-0.5 text-[15px] font-semibold leading-4 text-[var(--text-primary)]"
          >
            Save Resource
          </h2>
          <p className="mt-1 text-[9px] leading-3 text-[var(--text-muted)]">
            Canonical resource, not Inbox.
          </p>
        </div>

        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(220px,280px)] xl:contents">
          <div className="min-w-0">
            <label
              className="text-[10px] font-semibold text-[var(--text-muted)]"
              htmlFor="resource-title"
            >
              Title or source
            </label>
            <input
              className="mt-1 min-h-10 w-full rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.62)] px-3 text-xs text-[var(--text-secondary)] outline-none placeholder:text-[var(--text-faint)] focus-visible:border-[var(--accent-cyan)] xl:min-h-8 xl:px-2.5 xl:text-[10px]"
              defaultValue="Capture a reusable thought, prompt or source"
              id="resource-title"
              readOnly
              type="text"
            />
          </div>
          <div className="min-w-0">
            <label
              className="text-[10px] font-semibold text-[var(--text-muted)]"
              htmlFor="resource-context"
            >
              Linked Context
            </label>
            <input
              className="mt-1 min-h-10 w-full rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.62)] px-3 text-xs text-[var(--text-secondary)] outline-none placeholder:text-[var(--text-faint)] focus-visible:border-[var(--accent-cyan)] xl:min-h-8 xl:px-2.5 xl:text-[10px]"
              defaultValue="Project, goal, skill or area"
              id="resource-context"
              readOnly
              type="text"
            />
          </div>
        </div>

        <div className="min-w-0">
          <label
            className="text-[10px] font-semibold text-[var(--text-muted)]"
            htmlFor="resource-summary"
          >
            Short Summary
          </label>
          <textarea
            className="mt-1 min-h-16 w-full resize-none rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.62)] px-3 py-2 text-xs leading-5 text-[var(--text-secondary)] outline-none placeholder:text-[var(--text-faint)] focus-visible:border-[var(--accent-cyan)] xl:min-h-8 xl:overflow-hidden xl:px-2.5 xl:py-1.5 xl:text-[10px] xl:leading-4"
            defaultValue="Static MVP preview. Save will later create a canonical resource, not an Inbox item."
            id="resource-summary"
            readOnly
            rows={1}
          />
        </div>

        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end xl:contents">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-[var(--text-muted)]">
              Resource Type
            </p>
            <div className="-mx-1 mt-1 overflow-x-auto px-1">
              <div className="flex w-max min-w-full gap-1.5 xl:gap-1">
                {captureTypes.map((type) => (
                  <button
                    aria-pressed={Boolean(type.active)}
                    className={controlClass(type.active)}
                    key={type.value}
                    style={accentStyle(type.accent ?? "var(--accent-cyan)")}
                    type="button"
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button
            className="min-h-9 rounded-full border border-[rgba(95,200,215,.32)] bg-[rgba(95,200,215,.12)] px-4 text-[10px] font-semibold text-[var(--text-primary)] transition hover:border-[rgba(95,200,215,.48)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] xl:min-h-8 xl:px-3"
            type="button"
          >
            Save Resource
          </button>
        </div>
      </div>
    </section>
  );
}

function ResourceControls({
  typeOptions,
  filterOptions,
}: Readonly<{
  typeOptions: ResourceOption<string>[];
  filterOptions: ResourceOption<string>[];
}>) {
  return (
    <section
      aria-label="Resource type and filter controls"
      className="min-w-0 rounded-[14px] border border-[rgba(148,163,184,.08)] bg-[rgba(11,17,28,.48)] px-3 py-2 xl:min-h-[56px]"
    >
      <div className="grid gap-2 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)_auto] xl:items-center">
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
  resources,
  selectedResource,
}: Readonly<{
  resources: ResourceItem[];
  selectedResource: ResourceItem;
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
      data-resource-library
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
                const selected = resource.id === selectedResource.id;
                const hiddenOnDesktop =
                  index >= WIDE_DESKTOP_LIBRARY_LIMIT;
                const wideDesktopOnly =
                  index >= DESKTOP_LIBRARY_LIMIT &&
                  index < WIDE_DESKTOP_LIBRARY_LIMIT;

                return (
                  <article
                    className={cn(
                      "rounded-[14px] border bg-[rgba(11,17,28,.46)] p-3 xl:min-h-[60px] xl:p-2 [@media(min-width:2200px)]:min-h-[72px] [@media(min-width:2200px)]:p-2.5",
                      selected
                        ? "border-[color-mix(in_srgb,var(--accent)_44%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,rgba(18,28,43,.78))]"
                        : "border-[var(--border-subtle)]",
                      wideDesktopOnly &&
                        "xl:hidden [@media(min-width:2200px)]:block",
                      hiddenOnDesktop && "xl:hidden",
                    )}
                    data-resource-row
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

                    <dl className="mt-3 grid gap-2 text-[10px] leading-4 text-[var(--text-secondary)] sm:grid-cols-4 xl:mt-1.5 xl:flex xl:min-w-0 xl:gap-3 xl:leading-3">
                      <div className="min-w-0">
                        <dt className="font-semibold text-[var(--text-muted)] xl:sr-only">
                          Source
                        </dt>
                        <dd className="mt-0.5 truncate">{resource.source}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="font-semibold text-[var(--text-muted)] xl:sr-only">
                          Linked Context
                        </dt>
                        <dd className="mt-0.5 truncate">
                          {resource.linkedContext}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="font-semibold text-[var(--text-muted)] xl:sr-only">
                          Review State
                        </dt>
                        <dd className="mt-0.5 truncate">{review.label}</dd>
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
                  </article>
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
            description="Future filters should keep the selected context available while showing why nothing matched."
            title="No resources match this filter"
          />
        )}
      </div>
    </section>
  );
}

function ResourceDetailPanel({
  resource,
}: Readonly<{
  resource: ResourceItem;
}>) {
  const type = resourceTypeMeta[resource.type];
  const area = resourceAreaMeta[resource.area];
  const status = resourceStatusMeta[resource.status];
  const review = resourceReviewStateMeta[resource.reviewState];

  return (
    <aside
      aria-labelledby="selected-resource-heading"
      className="flex min-w-0 flex-col overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.86)] shadow-[0_8px_22px_rgba(0,0,0,.12)] xl:h-full xl:min-h-0 xl:flex-1"
    >
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.50)] px-3 py-3 xl:px-2.5 xl:py-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-cyan)] xl:text-[9px]">
              Selected Resource
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

      <div className="grid gap-3 p-3 xl:flex xl:min-h-0 xl:flex-1 xl:flex-col xl:justify-between xl:gap-2 xl:p-2">
        <div className="grid gap-2 sm:grid-cols-3 xl:gap-1.5">
          <FieldCard accent={area.accent} label="Area" value={area.label} />
          <FieldCard
            accent={review.accent}
            label="Review"
            value={review.label}
          />
          <FieldCard
            accent={type.accent}
            label="Last touched"
            value={resource.lastTouched}
          />
        </div>

        <div className="grid gap-2 xl:grid-cols-2">
          <DetailBlock expanded label="Short Summary" value={resource.summary} />
          <DetailBlock
            expanded
            label="Key Learning"
            value={resource.keyLearning}
          />
        </div>
        <DetailBlock label="Next Use" value={resource.nextUse} />

        <section aria-labelledby="related-resources-heading">
          <h3
            className="text-[13px] font-semibold text-[var(--text-primary)] xl:text-[12px]"
            id="related-resources-heading"
          >
            Related Resources
          </h3>
          <div className="mt-2 grid gap-1.5 xl:mt-1.5 xl:gap-1">
            {resource.relatedResources.map((related) => (
              <div
                className="flex min-h-8 items-center justify-between gap-3 rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.40)] px-3 text-[11px] xl:min-h-7 xl:px-2 xl:text-[10px]"
                key={`${related.title}-${related.relation}`}
              >
                <span className="min-w-0 truncate text-[var(--text-secondary)]">
                  {related.title}
                </span>
                <span className="shrink-0 text-[var(--text-muted)]">
                  {related.relation}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="resource-actions-heading">
          <h3
            className="text-[13px] font-semibold text-[var(--text-primary)] xl:text-[12px]"
            id="resource-actions-heading"
          >
            Actions
          </h3>
          <div className="mt-2 grid gap-1.5 xl:mt-1.5 xl:grid-cols-2 xl:gap-1.5">
            {resource.actions.map((action) => (
              <button
                className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.42)] px-3 py-2 text-left transition hover:border-[var(--border-default)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] xl:px-2 xl:py-1.5"
                key={action.label}
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
          Boundary: Resources stores reusable knowledge. Inbox remains for raw
          capture, and Projects, Goals, Skills and Areas only link or filter
          these resources later.
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

function ReviewQueue({
  items,
}: Readonly<{
  items: ResourceReviewQueueItem[];
}>) {
  const visibleItems = items.slice(0, 4);

  return (
    <section
      aria-labelledby="review-queue-heading"
      className="flex min-w-0 flex-col overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.76)] xl:h-full xl:min-h-0"
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
        {visibleItems.map((item) => (
          <article
            className="rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_18%,transparent)] bg-[color-mix(in_srgb,var(--accent)_7%,rgba(11,17,28,.48))] px-3 py-2 xl:flex xl:min-h-0 xl:flex-col xl:justify-center xl:px-2 xl:py-1.5 [@media(min-width:2200px)]:px-2.5"
            key={`${item.title}-${item.action}`}
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
        ))}
      </div>
    </section>
  );
}

function RecentLearnings({
  items,
}: Readonly<{
  items: RecentLearning[];
}>) {
  const visibleItems = items.slice(0, WIDE_DESKTOP_RECENT_LEARNINGS_LIMIT);

  return (
    <section
      aria-labelledby="recent-learnings-heading"
      className="flex min-w-0 flex-col overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.76)] xl:h-full xl:min-h-0"
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
        {visibleItems.map((item, index) => (
          <article
            className={cn(
              "rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_16%,transparent)] bg-[rgba(11,17,28,.42)] px-3 py-2 xl:flex xl:min-h-0 xl:items-center xl:px-2 xl:py-1.5 [@media(min-width:2200px)]:px-2.5",
              index >= DESKTOP_RECENT_LEARNINGS_LIMIT &&
                "xl:hidden [@media(min-width:2200px)]:flex",
            )}
            key={item.title}
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
        ))}
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
  return (
    <div
      className="mx-auto flex min-h-screen w-full max-w-[2208px] flex-col gap-2 pb-8 xl:h-[calc(100dvh-1.25rem)] xl:min-h-0 xl:overflow-hidden xl:pb-0"
      id="resources-page"
    >
      <ResourcesPageHeader viewModel={viewModel} />
      <ResourceSummaryStrip stats={viewModel.summaryStats} />
      <SaveResourceCard captureTypes={viewModel.captureTypes} />
      <ResourceControls
        filterOptions={viewModel.filterOptions}
        typeOptions={viewModel.typeOptions}
      />

      <div
        className="grid min-w-0 items-start gap-2 xl:min-h-0 xl:flex-1 xl:items-stretch xl:grid-cols-[minmax(0,1fr)_minmax(360px,430px)] [@media(min-width:2200px)]:grid-cols-[minmax(0,1fr)_minmax(400px,500px)]"
        data-resources-workbench
      >
        <div className="grid min-w-0 gap-2 xl:h-full xl:min-h-0 xl:grid-rows-[minmax(0,1fr)_155px] [@media(min-width:2200px)]:grid-rows-[minmax(0,1fr)_180px]">
          <ResourceLibrary
            resources={viewModel.resources}
            selectedResource={viewModel.selectedResource}
          />
          <ReviewQueue items={viewModel.reviewQueue} />
        </div>
        <div className="grid min-w-0 gap-2 xl:h-full xl:min-h-0 xl:grid-rows-[minmax(0,13fr)_minmax(0,7fr)]">
          <ResourceDetailPanel resource={viewModel.selectedResource} />
          <RecentLearnings items={viewModel.recentLearnings} />
        </div>
      </div>

      <PageContractNote pageContract={viewModel.pageContract} />
    </div>
  );
}
