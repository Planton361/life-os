import { Pill, accentStyle } from "@/components/layout/route-page-primitives";
import { cn } from "@/lib/cn";
import type {
  HealthScheduleItemViewModel,
  HealthScheduleViewModel,
} from "../types";
import { ActionLink, SectionEmptyState } from "./health-overview-primitives";

function statusTone(status: HealthScheduleItemViewModel["status"]) {
  if (status === "done") {
    return "Done";
  }

  if (status === "sleep") {
    return "Sleep";
  }

  return "Planned";
}

export function HealthDaySchedule({
  data,
  className,
}: Readonly<{
  data: HealthScheduleViewModel;
  className?: string;
}>) {
  return (
    <aside
      aria-labelledby="today-health-schedule-heading"
      className={cn(
        "min-w-0 overflow-hidden rounded-[18px] border border-[rgba(221,107,95,.20)] bg-[rgba(15,23,36,.82)] shadow-[0_8px_22px_rgba(0,0,0,.12)] xl:flex xl:min-h-0 xl:flex-col",
        className,
      )}
    >
      <div className="border-b border-[var(--border-subtle)] bg-[linear-gradient(90deg,rgba(221,107,95,.08),rgba(18,28,43,.54)_64%)] px-4 py-3">
        <h2
          className="text-[17px] font-semibold leading-5 text-[var(--text-primary)]"
          id="today-health-schedule-heading"
        >
          {data.title}
        </h2>
        <p className="mt-1 text-[10px] leading-4 text-[var(--text-secondary)]">
          {data.dateLabel}
        </p>
      </div>

      <div className="min-h-0 p-3 xl:flex xl:flex-1 xl:flex-col min-[1900px]:p-4">
        <div className="relative grid gap-2 xl:min-h-0 xl:flex-1 xl:content-start min-[1900px]:grid-rows-[repeat(10,minmax(0,1fr))] min-[1900px]:gap-3">
          <span
            aria-hidden="true"
            className="absolute bottom-3 left-[64px] top-3 hidden w-px bg-[rgba(148,163,184,.16)] sm:block"
          />
          {data.items.length > 0 ? (
            data.items.map((item) => (
            <article
              className="relative grid min-w-0 gap-2 sm:grid-cols-[74px_minmax(0,1fr)] sm:gap-3 min-[1900px]:min-h-0"
              key={`${item.time}-${item.title}`}
              style={accentStyle(item.accent)}
            >
              <time className="pt-3 text-[10px] font-semibold leading-4 text-[var(--text-muted)] sm:text-right min-[1900px]:pt-4">
                {item.time}
              </time>
              <div className="min-w-0 rounded-[13px] border border-[color-mix(in_srgb,var(--accent)_24%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,rgba(11,17,28,.58))] px-3 py-2.5 min-[1900px]:flex min-[1900px]:h-full min-[1900px]:flex-col min-[1900px]:justify-center min-[1900px]:px-4 min-[1900px]:py-3">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-[13px] font-semibold leading-5 text-[var(--text-primary)]">
                      {item.title}
                    </h3>
                    <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-secondary)]">
                      {item.detail}
                    </p>
                  </div>
                  <Pill accent={item.accent} quiet>
                    {statusTone(item.status)}
                  </Pill>
                </div>
                <p className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
                  {item.statusLabel}
                </p>
              </div>
            </article>
            ))
          ) : (
            <SectionEmptyState
              className="relative sm:ml-[86px]"
              description="Termine erscheinen hier, sobald du Health-Zeitbloecke planst."
              title="Noch kein Health-Zeitplan"
            />
          )}
        </div>

        <div className="mt-3 flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-3 sm:flex-row sm:items-center sm:justify-between xl:mt-auto">
          <p className="text-[10px] leading-4 text-[var(--text-secondary)]">
            {data.footerLabel}
          </p>
          <ActionLink accent="var(--accent-red)" href={data.href}>
            {data.actionLabel}
          </ActionLink>
        </div>
      </div>
    </aside>
  );
}
