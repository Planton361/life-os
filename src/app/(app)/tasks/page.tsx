import type { Metadata } from "next";
import {
  EmptyState,
  PageHeader,
  Pill,
  RoutePage,
  SectionPanel,
  accentStyle,
} from "@/components/layout/route-page-primitives";
import { getTasksViewModel } from "@/features/tasks";

export const metadata: Metadata = {
  title: "Tasks | Life OS",
};

export default function TasksPage() {
  const viewModel = getTasksViewModel();

  return (
    <RoutePage>
      <PageHeader
        eyebrow={viewModel.eyebrow}
        summary={viewModel.summary}
        title={viewModel.title}
      />

      <section className="grid gap-4 xl:grid-cols-2">
        {viewModel.groups.map((group) => (
          <SectionPanel
            key={group.title}
            subtitle={group.description}
            title={group.title}
          >
            {group.items.length > 0 ? (
              <div className="space-y-3">
                {group.items.map((task) => (
                  <article
                    className="rounded-[13px] border border-[color-mix(in_srgb,var(--accent)_24%,transparent)] bg-[color-mix(in_srgb,var(--accent)_6%,#101827)] p-4"
                    key={task.title}
                    style={accentStyle(task.accent)}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-[var(--text-primary)]">
                          {task.title}
                        </h3>
                        <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">
                          {task.area} / {task.project}
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-start gap-2 sm:justify-end">
                        <Pill accent={task.accent}>{task.priority}</Pill>
                        <Pill accent={task.accent}>{task.status}</Pill>
                      </div>
                    </div>
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="text-xs font-semibold text-[var(--text-muted)]">
                          Estimate
                        </dt>
                        <dd className="mt-1 text-[var(--text-secondary)]">
                          {task.estimatedDuration}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold text-[var(--text-muted)]">
                          Status
                        </dt>
                        <dd className="mt-1 text-[var(--text-secondary)]">
                          {task.status}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold text-[var(--text-muted)]">
                          Energy
                        </dt>
                        <dd className="mt-1 text-[var(--text-secondary)]">
                          {task.energyLevel ?? "Any"}
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
      </section>
    </RoutePage>
  );
}
