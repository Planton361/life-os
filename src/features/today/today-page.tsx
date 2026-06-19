import type { ReactNode } from "react";
import { Pill, accentStyle } from "@/components/layout/route-page-primitives";
import { cn } from "@/lib/cn";
import type {
  TodayActivityEventViewModel,
  TodayArtifactViewModel,
  TodayCarryForwardItemViewModel,
  TodayDecisionViewModel,
  TodayDeltaMetricViewModel,
  TodayReviewSignalViewModel,
  TodayViewModel,
} from "./today-view-model";

function titleId(title: string) {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-section`;
}

function MemoryPanel({
  title,
  subtitle,
  accent,
  className,
  contentClassName,
  children,
}: Readonly<{
  title: string;
  subtitle: string;
  accent: string;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}>) {
  const id = titleId(title);

  return (
    <section
      aria-labelledby={id}
      className={cn(
        "overflow-hidden rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-1)] shadow-[0_6px_16px_rgba(0,0,0,.10)]",
        className,
      )}
      style={accentStyle(accent)}
    >
      <div className="border-b border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--accent)_5%,rgba(14,23,38,.84))] px-4 py-3">
        <h2
          className="text-[15px] font-semibold leading-5 text-[var(--text-primary)]"
          id={id}
        >
          {title}
        </h2>
        <p className="mt-0.5 text-[10px] font-medium leading-4 text-[var(--text-muted)]">
          {subtitle}
        </p>
      </div>
      <div className={cn("p-3", contentClassName)}>{children}</div>
    </section>
  );
}

function TodayHeader({
  viewModel,
}: Readonly<{
  viewModel: TodayViewModel;
}>) {
  const { header } = viewModel;

  return (
    <header className="rounded-[16px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--accent-purple)_5%,var(--surface-1))] px-4 py-3 shadow-[0_6px_16px_rgba(0,0,0,.10)] sm:px-5">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(330px,auto)] xl:items-center">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {header.eyebrow}
          </p>
          <h1 className="mt-1 text-[28px] font-semibold leading-none text-[var(--text-primary)] sm:text-[30px]">
            {header.title}
          </h1>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-[var(--text-secondary)]">
            {header.summary}
          </p>
          <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
            Today records day evidence; Dashboard stays the cockpit.
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--text-secondary)]">
            {header.dateLabel}
          </p>
          <div
            aria-label="Today memory log status"
            className="mt-2 flex flex-wrap gap-1.5"
          >
            {header.statusPills.map((pill) => (
              <Pill accent={pill.accent} key={pill.label}>
                {pill.label}
              </Pill>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

function ActivityStream({
  events,
}: Readonly<{
  events: TodayActivityEventViewModel[];
}>) {
  return (
    <div className="flex h-full flex-col">
      <ol className="grid gap-2.5 2xl:flex-1 2xl:auto-rows-fr">
        {events.map((event) => (
          <li className="min-h-0" key={`${event.time}-${event.type}-${event.title}`}>
            <article
              className="relative flex h-full min-h-[58px] items-center rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.78)] px-3.5 py-3"
              style={accentStyle(event.accent)}
            >
              <div className="flex w-full flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <time
                    className="shrink-0 rounded-full border border-[color-mix(in_srgb,var(--accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--accent)_9%,transparent)] px-2 py-1 text-[10px] font-semibold leading-none text-[var(--text-secondary)]"
                    dateTime={event.time}
                  >
                    {event.time}
                  </time>
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-baseline gap-2">
                      <p className="shrink-0 text-[10px] font-semibold text-[var(--text-primary)]">
                        {event.type}
                      </p>
                      <h3 className="truncate text-[13px] font-semibold leading-4 text-[var(--text-primary)]">
                        {event.title}
                      </h3>
                    </div>
                    <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-muted)]">
                      {event.source}
                    </p>
                  </div>
                </div>
                <span className="shrink-0">
                  <Pill accent={event.accent}>{event.status}</Pill>
                </span>
              </div>
            </article>
          </li>
        ))}
      </ol>

      <div className="mt-auto rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.62)] px-3 py-2">
        <p className="text-[10px] font-semibold text-[var(--text-secondary)]">
          End of day record
        </p>
        <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-muted)]">
          Review open; carry-forward stays in the right column.
        </p>
      </div>
    </div>
  );
}

function DeltaSummary({
  metrics,
}: Readonly<{
  metrics: TodayDeltaMetricViewModel[];
}>) {
  return (
    <div className="flex h-full flex-col gap-2">
      {metrics.map((metric) => (
        <article
          className="grid min-h-10 grid-cols-[48px_minmax(0,1fr)] items-center gap-x-3 rounded-[8px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.28)] px-2.5 py-1.5 sm:grid-cols-[52px_minmax(0,1fr)_minmax(112px,max-content)]"
          key={metric.label}
          style={accentStyle(metric.accent)}
        >
          <div className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              className="size-1.5 shrink-0 rounded-full bg-[var(--accent)]"
            />
            <p className="truncate text-[14px] font-semibold leading-4 text-[var(--text-primary)]">
              {metric.value}
            </p>
          </div>
          <h3 className="truncate text-[11px] font-semibold leading-4 text-[var(--text-secondary)]">
            {metric.label}
          </h3>
          <p className="col-start-2 truncate text-[10px] leading-4 text-[var(--text-muted)] sm:col-start-auto sm:text-right">
            {metric.detail}
          </p>
        </article>
      ))}
      <p className="mt-auto rounded-[8px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.46)] px-2.5 py-2 text-[10px] leading-4 text-[var(--text-muted)]">
        Change ledger only. Domain data stays canonical.
      </p>
    </div>
  );
}

function DecisionRows({
  decisions,
}: Readonly<{
  decisions: TodayDecisionViewModel[];
}>) {
  return (
    <div className="space-y-1.5">
      {decisions.map((decision) => (
        <article
          className="grid min-h-[46px] grid-cols-[3px_minmax(0,1fr)] gap-2.5 rounded-[8px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.38)] px-2.5 py-2"
          key={decision.label}
          style={accentStyle(decision.accent)}
        >
          <span
            aria-hidden="true"
            className="h-full min-h-8 rounded-full bg-[var(--accent)]"
          />
          <div className="min-w-0">
            <div className="flex min-w-0 items-baseline gap-2">
              <p className="shrink-0 text-[10px] font-semibold text-[var(--text-primary)]">
                {decision.label}
              </p>
              <h3 className="truncate text-[11px] font-medium text-[var(--text-secondary)]">
                {decision.title}
              </h3>
            </div>
            <p className="mt-0.5 truncate text-[10px] leading-4 text-[var(--text-muted)]">
              {decision.description}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}

function HandoffRows({
  items,
}: Readonly<{
  items: TodayCarryForwardItemViewModel[];
}>) {
  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <article
          className="grid min-h-[46px] grid-cols-[8px_minmax(0,1fr)] gap-2.5 rounded-[8px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.38)] px-2.5 py-2"
          key={item.label}
          style={accentStyle(item.accent)}
        >
          <span
            aria-hidden="true"
            className="mt-1.5 size-2 rounded-full bg-[var(--accent)]"
          />
          <div className="min-w-0">
            <h3 className="text-[11px] font-semibold text-[var(--text-primary)]">
              {item.label}
            </h3>
            <p className="mt-0.5 truncate text-[10px] leading-4 text-[var(--text-muted)]">
              {item.description}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}

function ReviewSignalGrid({
  items,
  className,
}: Readonly<{
  items: TodayReviewSignalViewModel[];
  className?: string;
}>) {
  return (
    <div className={cn("grid content-start gap-2 sm:grid-cols-2", className)}>
      {items.map((item) => (
        <article
          className="min-h-[52px] rounded-[8px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.34)] px-3 py-2"
          key={item.label}
          style={accentStyle(item.accent)}
        >
          <div className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              className="size-1.5 shrink-0 rounded-full bg-[var(--accent)]"
            />
            <p className="truncate text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
              {item.label}
            </p>
          </div>
          <p className="mt-1 truncate text-[12px] font-semibold leading-4 text-[var(--text-primary)]">
            {item.value}
          </p>
          <p className="truncate text-[10px] leading-4 text-[var(--text-muted)]">
            {item.detail}
          </p>
        </article>
      ))}
    </div>
  );
}

function ArtifactRows({
  artifacts,
}: Readonly<{
  artifacts: TodayArtifactViewModel[];
}>) {
  return (
    <div className="space-y-1.5">
      {artifacts.map((artifact) => (
        <article
          className="grid min-h-10 grid-cols-[8px_76px_minmax(0,1fr)] items-center gap-2 rounded-[8px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.38)] px-2.5 py-1.5"
          key={`${artifact.type}-${artifact.title}`}
          style={accentStyle(artifact.accent)}
        >
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-[var(--accent)]"
          />
          <p className="truncate text-[10px] font-semibold leading-4 text-[var(--text-muted)]">
            {artifact.type}
          </p>
          <div className="min-w-0">
            <h3 className="truncate text-[11px] font-semibold leading-4 text-[var(--text-primary)]">
              {artifact.title}
            </h3>
            <p className="truncate text-[10px] leading-4 text-[var(--text-muted)]">
              {artifact.detail}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}

function DecisionsArtifacts({
  decisions,
  artifacts,
}: Readonly<{
  decisions: TodayDecisionViewModel[];
  artifacts: TodayArtifactViewModel[];
}>) {
  return (
    <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,.92fr)_minmax(0,1.08fr)]">
      <section aria-labelledby="decisions-heading" className="min-w-0">
        <div className="flex items-center justify-between gap-3">
          <h3
            className="text-[11px] font-semibold text-[var(--text-secondary)]"
            id="decisions-heading"
          >
            Decisions
          </h3>
          <Pill quiet>{decisions.length} decisions</Pill>
        </div>
        <div className="mt-2">
          <DecisionRows decisions={decisions} />
        </div>
      </section>

      <section aria-labelledby="artifacts-heading" className="min-w-0">
        <div className="flex items-center justify-between gap-3">
          <h3
            className="text-[11px] font-semibold text-[var(--text-secondary)]"
            id="artifacts-heading"
          >
            Artifacts
          </h3>
          <Pill quiet>{artifacts.length} artifacts</Pill>
        </div>
        <div className="mt-2">
          <ArtifactRows artifacts={artifacts} />
        </div>
      </section>
    </div>
  );
}

function ClosingReview({
  signals,
  handoffItems,
  firstMove,
}: Readonly<{
  signals: TodayReviewSignalViewModel[];
  handoffItems: TodayCarryForwardItemViewModel[];
  firstMove: string;
}>) {
  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
      <ReviewSignalGrid items={signals} className="xl:grid-cols-2" />

      <div className="flex min-h-0 min-w-0 flex-col">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[11px] font-semibold text-[var(--text-secondary)]">
            Carry Forward
          </h3>
          <Pill quiet>{handoffItems.length} items</Pill>
        </div>
        <div className="mt-2">
          <HandoffRows items={handoffItems} />
        </div>
        <div className="mt-auto rounded-[9px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.72)] px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            First Move
          </p>
          <p className="mt-0.5 text-[10px] font-medium leading-4 text-[var(--text-secondary)]">
            {firstMove}
          </p>
        </div>
      </div>
    </div>
  );
}

export function TodayMemoryLogPage({
  viewModel,
}: Readonly<{
  viewModel: TodayViewModel;
}>) {
  return (
    <div className="mx-auto flex w-full max-w-[2208px] flex-col gap-3 pb-0 2xl:h-[calc(100dvh-1.25rem)] 2xl:min-h-0">
      <TodayHeader viewModel={viewModel} />

      <div className="grid gap-3 2xl:min-h-0 2xl:flex-1 2xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1.5fr)]">
        <MemoryPanel
          accent="var(--accent-cyan)"
          className="2xl:flex 2xl:min-h-0 2xl:flex-col"
          contentClassName="2xl:flex 2xl:min-h-0 2xl:flex-1 2xl:flex-col"
          subtitle={viewModel.activityStream.subtitle}
          title={viewModel.activityStream.title}
        >
          <ActivityStream events={viewModel.activityStream.events} />
        </MemoryPanel>

        <div className="grid gap-3 2xl:min-h-0 2xl:grid-rows-[auto_minmax(0,.56fr)_minmax(0,.44fr)]">
          <MemoryPanel
            accent="var(--accent-green)"
            subtitle={viewModel.openingReview.subtitle}
            title={viewModel.openingReview.title}
          >
            <ReviewSignalGrid
              className="2xl:grid-cols-3"
              items={viewModel.openingReview.items}
            />
          </MemoryPanel>

          <div className="grid gap-3 2xl:min-h-0 2xl:grid-cols-[minmax(0,.72fr)_minmax(0,1fr)]">
            <MemoryPanel
              accent="var(--accent-blue)"
              className="2xl:flex 2xl:min-h-0 2xl:flex-col"
              contentClassName="2xl:flex 2xl:min-h-0 2xl:flex-1 2xl:flex-col"
              subtitle={viewModel.deltaSummary.subtitle}
              title={viewModel.deltaSummary.title}
            >
              <DeltaSummary metrics={viewModel.deltaSummary.metrics} />
            </MemoryPanel>

            <MemoryPanel
              accent="var(--accent-purple)"
              className="2xl:flex 2xl:min-h-0 2xl:flex-col"
              contentClassName="2xl:min-h-0 2xl:flex-1"
              subtitle="Decisions made today and the evidence they produced."
              title="Decisions & Artifacts"
            >
              <DecisionsArtifacts
                artifacts={viewModel.evidenceArtifacts.artifacts}
                decisions={viewModel.decisionsLedger.decisions}
              />
            </MemoryPanel>
          </div>

          <MemoryPanel
            accent="var(--accent-orange)"
            className="2xl:flex 2xl:min-h-0 2xl:flex-col"
            contentClassName="2xl:flex 2xl:min-h-0 2xl:flex-1 2xl:flex-col"
            subtitle={viewModel.closingReview.subtitle}
            title={viewModel.closingReview.title}
          >
            <ClosingReview
              firstMove={viewModel.carryForward.firstMove}
              handoffItems={viewModel.carryForward.items}
              signals={viewModel.closingReview.signals}
            />
          </MemoryPanel>
        </div>
      </div>
    </div>
  );
}
