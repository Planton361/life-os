import type { Metadata } from "next";
import {
  EmptyState,
  PageHeader,
  Pill,
  RoutePage,
  SectionPanel,
  accentStyle,
} from "@/components/layout/route-page-primitives";
import { getTodayViewModel } from "@/features/today";

export const metadata: Metadata = {
  title: "Today | Life OS",
};

export default function TodayPage() {
  const viewModel = getTodayViewModel();

  return (
    <RoutePage>
      <PageHeader
        eyebrow={viewModel.eyebrow}
        summary={viewModel.summary}
        title={viewModel.title}
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
        <SectionPanel title={viewModel.agenda.title}>
          <div className="space-y-3">
            {viewModel.agenda.blocks.map((block) => (
              <article
                className="rounded-[13px] border border-[color-mix(in_srgb,var(--accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--accent)_7%,#101827)] p-4"
                key={`${block.time}-${block.title}`}
                style={accentStyle(block.accent)}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--text-muted)]">
                      {block.time} / {block.area}
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-[var(--text-primary)]">
                      {block.title}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Pill accent={block.accent}>{block.type}</Pill>
                    <Pill accent={block.accent}>{block.status}</Pill>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                  {block.note}
                </p>
              </article>
            ))}
            <EmptyState
              description={viewModel.agenda.emptyState.description}
              title={viewModel.agenda.emptyState.title}
            />
          </div>
        </SectionPanel>

        <div className="space-y-4">
          <SectionPanel title={viewModel.focus.label}>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                  {viewModel.focus.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {viewModel.focus.nextAction}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Pill>{viewModel.focus.area}</Pill>
                <Pill accent="var(--accent-orange)">
                  {viewModel.focus.priority}
                </Pill>
                <Pill accent="var(--accent-cyan)">{viewModel.focus.energy}</Pill>
              </div>
            </div>
          </SectionPanel>

          <SectionPanel title={viewModel.focusBlock.title}>
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-xs font-semibold text-[var(--text-muted)]">
                  Window
                </dt>
                <dd className="mt-1 text-[var(--text-secondary)]">
                  {viewModel.focusBlock.window}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-[var(--text-muted)]">
                  Constraint
                </dt>
                <dd className="mt-1 text-[var(--text-secondary)]">
                  {viewModel.focusBlock.constraint}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-[var(--text-muted)]">
                  Done
                </dt>
                <dd className="mt-1 text-[var(--text-secondary)]">
                  {viewModel.focusBlock.doneDefinition}
                </dd>
              </div>
            </dl>
          </SectionPanel>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,.55fr)]">
        <SectionPanel title={viewModel.inboxSignals.title}>
          <div className="grid gap-3 md:grid-cols-2">
            {viewModel.inboxSignals.items.map((item) => (
              <article
                className="rounded-[13px] border border-[color-mix(in_srgb,var(--accent)_24%,transparent)] bg-[color-mix(in_srgb,var(--accent)_6%,#101827)] p-4"
                key={item.title}
                style={accentStyle(item.accent)}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Pill accent={item.accent}>{item.type}</Pill>
                  <Pill accent={item.accent} quiet>
                    {item.area}
                  </Pill>
                </div>
                <h3 className="mt-3 text-base font-semibold text-[var(--text-primary)]">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  Source: {item.source}
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                  {item.nextStep}
                </p>
                <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                  {item.reviewHint}
                </p>
              </article>
            ))}
          </div>
          <div className="mt-3">
            <EmptyState
              description={viewModel.inboxSignals.emptyState.description}
              title={viewModel.inboxSignals.emptyState.title}
            />
          </div>
        </SectionPanel>

        <SectionPanel title={viewModel.nextSteps.title}>
          <div className="space-y-3">
            {viewModel.nextSteps.items.map((step) => (
              <article
                className="rounded-[13px] border border-[var(--border-subtle)] bg-[rgba(168,183,204,.05)] p-4"
                key={step.title}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    {step.title}
                  </h3>
                  <Pill quiet>
                    {step.priority} / {step.estimate}
                  </Pill>
                </div>
                <p className="mt-2 text-xs font-semibold text-[var(--text-muted)]">
                  {step.area}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {step.note}
                </p>
              </article>
            ))}
          </div>
        </SectionPanel>
      </section>
    </RoutePage>
  );
}
