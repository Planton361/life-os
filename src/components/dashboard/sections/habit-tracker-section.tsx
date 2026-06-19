import type { DashboardHabitTrackers } from "@/features/dashboard";
import { cn } from "@/lib/cn";
import { Panel } from "./section-primitives";

export function HabitTrackers({
  data,
}: Readonly<{
  data: DashboardHabitTrackers;
}>) {
  const windowSwitch = (
    <div className="flex min-w-0 items-center justify-end">
      <div className="flex w-[270px] max-w-full rounded-full border border-[var(--border-subtle)] bg-[#0c1422] p-0.5 text-center text-[10px] font-semibold text-[var(--text-primary)]">
        {data.windows.map((view) => (
          <span
            className={cn(
              "flex-1 rounded-full px-3 py-0.5",
              view === data.activeWindow &&
                "border border-[rgba(155,124,246,.26)] bg-[rgba(155,124,246,.12)] text-[var(--text-secondary)]",
            )}
            key={view}
          >
            {view}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <Panel
      className="border-[rgba(155,124,246,.16)] bg-[color-mix(in_srgb,var(--accent-purple)_5%,#101827)] 2xl:h-[260px]"
      headerAccessory={windowSwitch}
      title={data.title}
      titleHref={data.href}
    >
      <div className="p-4 2xl:px-[28px] 2xl:pb-1.5 2xl:pt-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 2xl:grid-cols-[130px_130px_130px_130px] 2xl:gap-x-[14px] 2xl:gap-y-5">
          {data.habits.map((habit) => (
            <article
              className="min-h-[68px] rounded-[14px] border border-[rgba(155,124,246,.16)] bg-[color-mix(in_srgb,var(--accent-purple)_5%,#101a2a)] p-2.5"
              key={habit.label}
            >
              <div className="flex items-start gap-2.5">
                <span className="grid size-6 shrink-0 place-items-center rounded-full border border-[rgba(155,124,246,.24)] bg-[rgba(155,124,246,.12)] text-[10px] font-semibold text-[var(--text-primary)]">
                  {habit.marker}
                </span>
                <div className="min-w-0">
                  <h3 className="text-[10px] font-semibold text-[var(--text-primary)]">
                    {habit.label}
                  </h3>
                  <p className="mt-0.5 text-[11px] font-semibold leading-tight text-[var(--text-primary)]">
                    {habit.value}
                  </p>
                </div>
              </div>
              <div
                className="mt-2 flex gap-1.5"
                aria-label={`${habit.done} of ${habit.total} completed`}
              >
                {Array.from({ length: habit.total }).map((_, index) => (
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      index < habit.done
                        ? "bg-[var(--accent-purple)] shadow-[0_0_10px_rgba(155,124,246,.36)]"
                        : "bg-[rgba(148,163,184,.20)]",
                    )}
                    key={`${habit.label}-${index}`}
                  />
                ))}
              </div>
            </article>
          ))}
          <article className="grid min-h-[68px] place-items-center rounded-[14px] border border-[rgba(155,124,246,.16)] bg-[color-mix(in_srgb,var(--accent-purple)_5%,#101a2a)] p-2.5 text-center">
            <div>
              <p className="text-lg font-semibold leading-none text-[var(--text-primary)]">+</p>
              <p className="mt-1.5 text-[10px] font-semibold text-[var(--text-primary)]">
                {data.addHabitLabel}
              </p>
            </div>
          </article>
        </div>
      </div>
    </Panel>
  );
}
