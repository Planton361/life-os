import { Pill, accentStyle } from "@/components/layout/route-page-primitives";
import type {
  CalendarAllDayBlockViewModel,
  CalendarContextListItemViewModel,
  CalendarReviewMetricViewModel,
  CalendarRightPanelViewModel,
  CalendarTimedBlockViewModel,
} from "../calendar-types";

function ReviewMetricCard({
  metric,
}: Readonly<{
  metric: CalendarReviewMetricViewModel;
}>) {
  return (
    <article
      className="min-h-[42px] rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.72)] px-2 py-1.5"
      style={accentStyle(metric.accent)}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          aria-hidden="true"
          className="h-6 w-1 shrink-0 rounded-full bg-[var(--accent)]"
        />
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold text-[var(--text-muted)]">
            {metric.label}
          </p>
          <p className="truncate text-[12px] font-semibold leading-4 text-[var(--text-primary)]">
            {metric.value}
          </p>
          <p className="truncate text-[10px] leading-4 text-[var(--text-secondary)]">
            {metric.detail}
          </p>
        </div>
      </div>
    </article>
  );
}

function ContextList({
  title,
  countLabel,
  items,
  accent,
}: Readonly<{
  title: string;
  countLabel?: string;
  items: CalendarContextListItemViewModel[];
  accent: string;
}>) {
  return (
    <section
      aria-labelledby={`${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-heading`}
      className="rounded-[12px] border border-[rgba(148,163,184,.10)] bg-[rgba(11,17,28,.38)] p-2.5"
      style={accentStyle(accent)}
    >
      <div className="flex items-center justify-between gap-3">
        <h3
          className="text-[12px] font-semibold text-[var(--text-primary)]"
          id={`${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-heading`}
        >
          {title}
        </h3>
        {countLabel ? <Pill accent={accent}>{countLabel}</Pill> : null}
      </div>
      <div className="mt-2 grid gap-1.5">
        {items.map((item) => (
          <article
            className="grid min-h-7 grid-cols-[8px_minmax(0,1fr)] gap-2"
            key={item.title}
            style={accentStyle(item.accent)}
          >
            <span
              aria-hidden="true"
              className="mt-1.5 size-1.5 rounded-full bg-[var(--accent)]"
            />
            <div className="min-w-0">
              <p className="truncate text-[11px] font-medium text-[var(--text-secondary)]">
                {item.title}
              </p>
              <p className="truncate text-[10px] leading-4 text-[var(--text-muted)]">
                {item.meta}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SelectedBlockDetails({
  block,
}: Readonly<{
  block: CalendarAllDayBlockViewModel | CalendarTimedBlockViewModel;
}>) {
  return (
    <section
      aria-labelledby="selected-block-heading"
      className="rounded-[14px] border border-[color-mix(in_srgb,var(--accent)_26%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,rgba(18,28,43,.68))] p-3"
      style={accentStyle(block.accent)}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
        Selected Block
      </p>
      <h3
        className="mt-1.5 text-[15px] font-semibold leading-5 text-[var(--text-primary)]"
        id="selected-block-heading"
      >
        {block.title}
      </h3>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Pill accent={block.accent}>{block.kind}</Pill>
        <Pill accent={block.accent}>{block.status}</Pill>
      </div>
      <dl className="mt-2.5 grid gap-1 text-[11px] leading-4 text-[var(--text-secondary)]">
        <div>
          <dt className="inline text-[var(--text-muted)]">Type: </dt>
          <dd className="inline">{block.kind}</dd>
        </div>
        <div>
          <dt className="inline text-[var(--text-muted)]">Status: </dt>
          <dd className="inline">{block.status}</dd>
        </div>
        <div>
          <dt className="inline text-[var(--text-muted)]">Source: </dt>
          <dd className="inline">{block.sourceEntity.label}</dd>
        </div>
      </dl>
      <p className="mt-2 text-[10px] leading-4 text-[var(--text-muted)]">
        Calendar stores the time projection, not a duplicate project record.
      </p>
    </section>
  );
}

export function CalendarRightPanel({
  panel,
  selectedBlock,
}: Readonly<{
  panel: CalendarRightPanelViewModel;
  selectedBlock: CalendarAllDayBlockViewModel | CalendarTimedBlockViewModel;
}>) {
  return (
    <aside
      aria-labelledby="calendar-right-panel-heading"
      className="overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.86)] shadow-[0_8px_22px_rgba(0,0,0,.12)] xl:flex xl:min-h-0 xl:flex-col"
    >
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.54)] px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-cyan)]">
              Selected Day
            </p>
            <h2
              className="mt-0.5 text-[18px] font-semibold leading-6 text-[var(--text-primary)]"
              id="calendar-right-panel-heading"
            >
              {panel.selectedDay}
            </h2>
          </div>
          <Pill accent="var(--accent-cyan)">{panel.badge}</Pill>
        </div>
      </div>

      <div className="grid gap-2 p-2.5 xl:min-h-0 xl:flex-1 xl:content-start">
        <div className="grid gap-1.5 sm:grid-cols-3 xl:grid-cols-5">
          {panel.metrics.map((metric) => (
            <ReviewMetricCard key={metric.label} metric={metric} />
          ))}
        </div>

        <div className="grid gap-2 xl:grid-cols-3">
          <ContextList
            accent="var(--accent-red)"
            countLabel="5 open"
            items={panel.openLoops}
            title="Open Loops"
          />
          <ContextList
            accent="var(--accent-green)"
            countLabel="3 wins"
            items={panel.recentWins}
            title="Recent Wins"
          />
          <ContextList
            accent="var(--accent-orange)"
            items={panel.carryForward}
            title="Carry Forward"
          />
        </div>

        <div className="grid gap-2 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,.92fr)]">
          <SelectedBlockDetails block={selectedBlock} />

          <section
            aria-labelledby="weekly-review-heading"
            className="rounded-[12px] border border-[rgba(95,200,215,.14)] bg-[rgba(11,17,28,.46)] p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3
                  className="text-[13px] font-semibold text-[var(--text-primary)]"
                  id="weekly-review-heading"
                >
                  {panel.weeklyReview.title}
                </h3>
                <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-muted)]">
                  {panel.weeklyReview.description}
                </p>
              </div>
              <Pill accent="var(--accent-cyan)">{panel.weeklyReview.status}</Pill>
            </div>

            <div className="mt-2 flex min-w-0 items-center gap-2 rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.74)] px-2.5 py-1.5">
              <label className="sr-only" htmlFor="weekly-review-note">
                Write weekly review note
              </label>
              <textarea
                className="min-h-6 flex-1 resize-none border-0 bg-transparent text-[10px] leading-4 text-[var(--text-secondary)] outline-none placeholder:text-[var(--text-faint)]"
                id="weekly-review-note"
                placeholder={panel.weeklyReview.placeholder}
                rows={1}
              />
              <button
                className="shrink-0 rounded-full border border-[rgba(95,200,215,.16)] bg-[rgba(18,28,43,.76)] px-2.5 py-1 text-[9px] font-semibold text-[var(--accent-cyan)] transition hover:border-[rgba(95,200,215,.32)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                type="button"
              >
                {panel.weeklyReview.actionLabel}
              </button>
            </div>
          </section>
        </div>
      </div>
    </aside>
  );
}
