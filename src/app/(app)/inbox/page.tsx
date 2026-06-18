import type { Metadata } from "next";
import {
  EmptyState,
  PageHeader,
  Pill,
  RoutePage,
  SectionPanel,
  accentStyle,
} from "@/components/layout/route-page-primitives";
import { getInboxViewModel } from "@/features/inbox";

export const metadata: Metadata = {
  title: "Inbox | Life OS",
};

export default function InboxPage() {
  const viewModel = getInboxViewModel();

  return (
    <RoutePage>
      <PageHeader
        eyebrow={viewModel.eyebrow}
        summary={viewModel.summary}
        title={viewModel.title}
      />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          {viewModel.groups.map((group) => (
            <SectionPanel
              key={group.title}
              subtitle={group.description}
              title={group.title}
            >
              {group.items.length > 0 ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {group.items.map((item) => (
                    <article
                      className="rounded-[13px] border border-[color-mix(in_srgb,var(--accent)_24%,transparent)] bg-[color-mix(in_srgb,var(--accent)_6%,#101827)] p-4"
                      key={item.title}
                      style={accentStyle(item.accent)}
                    >
                      <div className="flex flex-wrap gap-2">
                        <Pill accent={item.accent}>{item.type}</Pill>
                        <Pill accent={item.accent} quiet>
                          {item.area}
                        </Pill>
                      </div>
                      <h3 className="mt-3 text-base font-semibold text-[var(--text-primary)]">
                        {item.title}
                      </h3>
                      <dl className="mt-3 grid gap-3 text-sm">
                        <div>
                          <dt className="text-xs font-semibold text-[var(--text-muted)]">
                            Source
                          </dt>
                          <dd className="mt-1 text-[var(--text-secondary)]">
                            {item.source}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold text-[var(--text-muted)]">
                            Next step
                          </dt>
                          <dd className="mt-1 text-[var(--text-secondary)]">
                            {item.nextStep}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold text-[var(--text-muted)]">
                            Review hint
                          </dt>
                          <dd className="mt-1 text-[var(--text-secondary)]">
                            {item.reviewHint}
                          </dd>
                        </div>
                      </dl>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  description={group.emptyState.description}
                  title={group.emptyState.title}
                />
              )}
            </SectionPanel>
          ))}
        </div>

        <div className="space-y-4">
          <SectionPanel title={viewModel.processingNote.title}>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              {viewModel.processingNote.description}
            </p>
          </SectionPanel>
          <SectionPanel title="Inbox empty state">
            <EmptyState
              description={viewModel.emptyState.description}
              title={viewModel.emptyState.title}
            />
          </SectionPanel>
        </div>
      </section>
    </RoutePage>
  );
}
