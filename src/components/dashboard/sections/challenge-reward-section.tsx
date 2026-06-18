import type { DashboardChallengesRewardFocus } from "@/features/dashboard";
import { Pill, ProgressBar } from "./section-primitives";

export function Challenges({
  data,
}: Readonly<{
  data: DashboardChallengesRewardFocus;
}>) {
  return (
    <section
      aria-labelledby="challenges-title"
      className="overflow-hidden rounded-[var(--panel-radius)] border border-[rgba(216,180,90,.16)] bg-[color-mix(in_srgb,var(--accent-yellow)_3%,#0c1320)] shadow-[0_8px_22px_rgba(0,0,0,.12)] 2xl:h-[205px]"
    >
      <div className="p-4 2xl:px-[31px] 2xl:py-[10px]">
        <h2
          className="text-lg font-semibold text-[var(--text-primary)]"
          id="challenges-title"
        >
          {data.title}
        </h2>
        <div className="mb-3 mt-3 flex min-h-8 items-center justify-between gap-3 rounded-full border border-[rgba(216,180,90,.20)] bg-[rgba(216,180,90,.08)] px-4 2xl:mb-2 2xl:mt-2 2xl:h-[27px]">
          <p className="text-xs font-semibold text-[var(--text-secondary)]">
            {data.summary}
          </p>
          <p className="text-[8px] font-medium text-[var(--text-muted)]">
            {data.measurementLabel}
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3 2xl:grid-cols-[240px_240px_240px] 2xl:gap-[12px]">
          {data.items.map((challenge) => (
            <article
              className="flex flex-col justify-between rounded-[13px] border border-[rgba(216,180,90,.16)] bg-[color-mix(in_srgb,var(--accent-yellow)_4%,#0f1724)] p-3 2xl:h-[108px] 2xl:p-2.5"
              key={challenge.title}
            >
              <div className="flex items-start gap-3">
                <span className="mt-1 size-2 rounded-full bg-[var(--accent-yellow)] shadow-[0_0_8px_rgba(216,180,90,.24)]" />
                <h3 className="text-[10px] font-semibold text-[var(--text-secondary)]">
                  {challenge.title}
                </h3>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 2xl:mt-2">
                <Pill accent="var(--accent-yellow)">{challenge.type}</Pill>
                <span className="text-[8px] font-medium text-[var(--text-muted)]">
                  {challenge.status}
                </span>
              </div>
              {challenge.progress > 0 ? (
                <div className="mt-3 2xl:mt-2">
                  <ProgressBar
                    accent="var(--accent-yellow)"
                    progress={challenge.progress}
                  />
                </div>
              ) : null}
              <p className="mt-3 text-[8px] font-medium text-[var(--text-muted)] 2xl:mt-2">
                {challenge.footer}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
