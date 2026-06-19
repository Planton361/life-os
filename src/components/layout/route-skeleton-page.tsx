import type { Metadata } from "next";
import {
  EmptyState,
  PageHeader,
  Pill,
  RoutePage,
  SectionPanel,
  accentStyle,
} from "@/components/layout/route-page-primitives";

export type RouteSkeletonConfig = {
  title: string;
  eyebrow: string;
  summary: string;
  dataSource: string;
  emptyTitle: string;
  emptyDescription: string;
  status?: string;
  accent?: string;
};

export function createRouteSkeletonMetadata({
  title,
}: RouteSkeletonConfig): Metadata {
  return {
    title: `${title} | Life OS`,
  };
}

export function RouteSkeletonPage({
  config,
}: Readonly<{
  config: RouteSkeletonConfig;
}>) {
  const accent = config.accent ?? "var(--accent-cyan)";
  const status = config.status ?? "Skeleton";

  return (
    <RoutePage>
      <PageHeader
        eyebrow={config.eyebrow}
        summary={config.summary}
        title={config.title}
      />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <SectionPanel
          subtitle="Static route coverage for the current navigation map."
          title="Skeleton status"
        >
          <div
            className="rounded-[13px] border border-[color-mix(in_srgb,var(--accent)_24%,transparent)] bg-[color-mix(in_srgb,var(--accent)_6%,#101827)] p-4"
            style={accentStyle(accent)}
          >
            <Pill accent={accent}>{status}</Pill>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              This page is a static placeholder. It defines the route and future
              page purpose without forms, persistence, mutations, or live data.
            </p>
          </div>
        </SectionPanel>

        <div className="space-y-4">
          <SectionPanel title="Planned source">
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-xs font-semibold text-[var(--text-muted)]">
                  Later data source
                </dt>
                <dd className="mt-1 text-[var(--text-secondary)]">
                  {config.dataSource}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-[var(--text-muted)]">
                  Current state
                </dt>
                <dd className="mt-1 text-[var(--text-secondary)]">
                  Static skeleton only.
                </dd>
              </div>
            </dl>
          </SectionPanel>

          <SectionPanel title="Empty state">
            <EmptyState
              description={config.emptyDescription}
              title={config.emptyTitle}
            />
          </SectionPanel>
        </div>
      </section>
    </RoutePage>
  );
}
