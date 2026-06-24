import { accentStyle } from "@/components/layout/route-page-primitives";
import { cn } from "@/lib/cn";
import type {
  CalendarFilterViewModel,
  CalendarProjectRailItemViewModel,
  CalendarScope,
} from "../calendar-types";

export function CalendarScopeRow({
  filters,
  onScopeChange,
  projects,
}: Readonly<{
  filters: CalendarFilterViewModel[];
  onScopeChange: (scope: CalendarScope) => void;
  projects: CalendarProjectRailItemViewModel[];
}>) {
  return (
    <section
      aria-label="Calendar scope and projects this week"
      className="rounded-[14px] border border-[rgba(148,163,184,.08)] bg-[rgba(11,17,28,.46)] px-3 py-1.5"
    >
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <p className="mr-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
            Scope
          </p>
          {filters.map((filter, index) => (
            <button
              aria-pressed={filter.active ? "true" : "false"}
              className={cn(
                "min-h-5 rounded-full border px-2.5 text-[10px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
                filter.active
                  ? "border-[rgba(95,200,215,.34)] bg-[rgba(95,200,215,.18)] text-[var(--text-primary)]"
                  : "border-[var(--border-subtle)] bg-[rgba(18,28,43,.7)] text-[var(--text-secondary)] hover:border-[var(--border-default)]",
              )}
              key={`calendar-scope-filter-${index}`}
              onClick={() => onScopeChange(filter.label as CalendarScope)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2 xl:justify-end">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
            Projects this week
          </p>
          {projects.map((project, index) => (
            <span
              className="inline-flex min-h-5 items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--accent)_26%,transparent)] bg-[color-mix(in_srgb,var(--accent)_9%,rgba(18,28,43,.72))] px-2 text-[10px] font-semibold text-[var(--text-secondary)]"
              key={`calendar-scope-project-${index}`}
              style={accentStyle(project.accent)}
            >
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-[var(--accent)]"
              />
              {project.label} · {project.count}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
