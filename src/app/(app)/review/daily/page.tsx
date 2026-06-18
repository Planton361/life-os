import type { Metadata } from "next";
import {
  EmptyState,
  PageHeader,
  Pill,
  RoutePage,
  SectionPanel,
  accentStyle,
} from "@/components/layout/route-page-primitives";
import { getDailyReviewViewModel } from "@/features/review";

export const metadata: Metadata = {
  title: "Daily Review | Life OS",
};

export default function DailyReviewPage() {
  const viewModel = getDailyReviewViewModel();

  return (
    <RoutePage>
      <PageHeader
        eyebrow={viewModel.eyebrow}
        summary={viewModel.summary}
        title={viewModel.title}
      />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <SectionPanel title={viewModel.status.label}>
            <div className="rounded-[13px] border border-[var(--border-default)] bg-[rgba(168,183,204,.05)] p-4">
              <Pill accent="var(--text-muted)">Static preview</Pill>
              <h3 className="mt-3 text-xl font-semibold text-[var(--text-primary)]">
                {viewModel.status.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {viewModel.status.description}
              </p>
            </div>
          </SectionPanel>

          <SectionPanel title={viewModel.outcome.title}>
            <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
              <div className="rounded-[13px] border border-[rgba(95,200,215,.24)] bg-[rgba(95,200,215,.07)] p-4">
                <p className="text-xs font-semibold text-[var(--text-muted)]">
                  Result signal
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                  {viewModel.outcome.signal}
                </p>
              </div>
              <p className="text-sm leading-6 text-[var(--text-secondary)]">
                {viewModel.outcome.note}
              </p>
            </div>
          </SectionPanel>

          <SectionPanel title={viewModel.wins.title}>
            {viewModel.wins.items.length > 0 ? (
              <ul className="space-y-3">
                {viewModel.wins.items.map((win) => (
                  <li
                    className="rounded-[13px] border border-[var(--border-subtle)] bg-[rgba(168,183,204,.05)] p-4 text-sm leading-6 text-[var(--text-secondary)]"
                    key={win}
                  >
                    {win}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                description={viewModel.wins.emptyState.description}
                title={viewModel.wins.emptyState.title}
              />
            )}
          </SectionPanel>

          <SectionPanel title={viewModel.openLoops.title}>
            {viewModel.openLoops.items.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {viewModel.openLoops.items.map((loop) => (
                  <article
                    className="rounded-[13px] border border-[color-mix(in_srgb,var(--accent)_24%,transparent)] bg-[color-mix(in_srgb,var(--accent)_6%,#101827)] p-4"
                    key={loop.title}
                    style={accentStyle(loop.accent)}
                  >
                    <Pill accent={loop.accent}>{loop.area}</Pill>
                    <h3 className="mt-3 text-base font-semibold text-[var(--text-primary)]">
                      {loop.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {loop.nextStep}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                description={viewModel.openLoops.emptyState.description}
                title={viewModel.openLoops.emptyState.title}
              />
            )}
          </SectionPanel>
        </div>

        <div className="space-y-4">
          <SectionPanel title={viewModel.recap.title}>
            <dl className="grid gap-4 text-sm">
              <div>
                <dt className="text-xs font-semibold text-[var(--text-muted)]">
                  Inbox
                </dt>
                <dd className="mt-1 text-[var(--text-secondary)]">
                  {viewModel.recap.inbox}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-[var(--text-muted)]">
                  Tasks
                </dt>
                <dd className="mt-1 text-[var(--text-secondary)]">
                  {viewModel.recap.tasks}
                </dd>
              </div>
              <p className="text-xs leading-5 text-[var(--text-muted)]">
                {viewModel.recap.note}
              </p>
            </dl>
          </SectionPanel>

          <SectionPanel title={viewModel.tomorrowHint.title}>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-[var(--text-muted)]">
                  Focus
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                  {viewModel.tomorrowHint.focus}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--text-muted)]">
                  First step
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                  {viewModel.tomorrowHint.firstStep}
                </p>
              </div>
            </div>
          </SectionPanel>

          <SectionPanel title="Review empty state">
            <EmptyState
              description={viewModel.status.description}
              title={viewModel.status.title}
            />
          </SectionPanel>
        </div>
      </section>
    </RoutePage>
  );
}
