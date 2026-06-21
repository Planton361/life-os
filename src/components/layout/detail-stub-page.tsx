import {
  PageHeader,
  Pill,
  RoutePage,
  SectionPanel,
  accentStyle,
} from "./route-page-primitives";

export type DetailStubPageProps = {
  accent: string;
  dataSource: string;
  entityId: string;
  entityLabel: string;
  summary: string;
  title: string;
};

export function DetailStubPage({
  accent,
  dataSource,
  entityId,
  entityLabel,
  summary,
  title,
}: Readonly<DetailStubPageProps>) {
  return (
    <RoutePage>
      <PageHeader eyebrow="Detail stub" summary={summary} title={title} />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <SectionPanel
          subtitle="Prototype route target for dashboard deep links."
          title={`${entityLabel} identity`}
        >
          <div
            className="rounded-[13px] border border-[color-mix(in_srgb,var(--accent)_24%,transparent)] bg-[color-mix(in_srgb,var(--accent)_6%,#101827)] p-4"
            style={accentStyle(accent)}
          >
            <Pill accent={accent}>{entityLabel}</Pill>
            <dl className="mt-4 grid gap-3 text-sm">
              <div>
                <dt className="text-xs font-semibold text-[var(--text-muted)]">
                  ID
                </dt>
                <dd className="mt-1 break-all text-[var(--text-secondary)]">
                  {entityId}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-[var(--text-muted)]">
                  Current state
                </dt>
                <dd className="mt-1 text-[var(--text-secondary)]">
                  Static placeholder. No persistence, mutations, or sync.
                </dd>
              </div>
            </dl>
          </div>
        </SectionPanel>

        <SectionPanel title="Planned source">
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            {dataSource}
          </p>
        </SectionPanel>
      </section>
    </RoutePage>
  );
}
