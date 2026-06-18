import type {
  DashboardMeals,
  DashboardNutrientBalance,
  DashboardRunningRecovery,
  DashboardWeightLossGoal,
} from "@/features/dashboard";
import { cn } from "@/lib/cn";
import { Panel, Pill, ProgressBar } from "./section-primitives";

function runningRhythmAccent(statusLabel: string) {
  const normalizedStatus = statusLabel.toLowerCase();

  if (normalizedStatus.includes("better")) {
    return "var(--accent-green)";
  }

  if (
    normalizedStatus.includes("below") ||
    normalizedStatus.includes("weak") ||
    normalizedStatus.includes("slow")
  ) {
    return "var(--accent-orange)";
  }

  return "var(--accent-cyan)";
}

export function WeightLossGoal({
  data,
}: Readonly<{
  data: DashboardWeightLossGoal;
}>) {
  return (
    <section
      aria-labelledby="weight-loss-goal-title"
      className="h-[188px] overflow-hidden rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[#0f1724] p-5 shadow-[0_8px_22px_rgba(0,0,0,.12)] 2xl:h-[184px] 2xl:px-[28px] 2xl:py-[22px]"
    >
      <h2
        className="text-lg font-semibold text-[var(--text-primary)]"
        id="weight-loss-goal-title"
      >
        {data.title}
      </h2>
      <p className="mt-4 text-[31px] font-semibold leading-none text-[var(--text-primary)]">
        {data.currentWeight}
      </p>
      <p className="mt-2 text-[9px] font-semibold leading-tight text-[var(--text-muted)]">
        {data.targetLabel}
      </p>
      <p className="mt-3 text-[10px] font-semibold text-[var(--text-muted)]">
        {data.progressLabel}
      </p>
      <div className="mt-2">
        <ProgressBar
          accent="rgba(224, 29, 175, 0.62)"
          progress={data.progress}
          quiet
        />
      </div>
    </section>
  );
}

export function NutrientBalance({
  data,
}: Readonly<{
  data: DashboardNutrientBalance;
}>) {
  return (
    <section
      aria-labelledby="nutrient-balance-title"
      className="h-[188px] overflow-hidden rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[#0f1724] p-5 shadow-[0_8px_22px_rgba(0,0,0,.12)] 2xl:h-[184px] 2xl:p-[18px]"
    >
      <h2
        className="text-lg font-semibold text-[var(--text-primary)]"
        id="nutrient-balance-title"
      >
        {data.title}
      </h2>
      <div className="mt-3 space-y-2.5">
        {data.items.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold text-[var(--text-muted)]">
                {item.label}
              </p>
              <p className="text-[10px] font-semibold text-[var(--text-secondary)]">
                {item.value}
              </p>
            </div>
            <div className="mt-2">
              <ProgressBar
                accent={item.accent}
                progress={item.progress}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function MealsToday({
  data,
}: Readonly<{
  data: DashboardMeals;
}>) {
  return (
    <Panel
      className="border-[rgba(217,146,79,.22)] bg-[color-mix(in_srgb,var(--accent-orange)_5%,#0f1724)] 2xl:h-[384px]"
      title={data.title}
    >
      <div className="space-y-3 p-4 2xl:space-y-2 2xl:p-3">
        {data.items.map((meal) => (
          <article
            className="grid min-h-[84px] grid-cols-[64px_minmax(0,1fr)] gap-4 rounded-[14px] border border-[rgba(217,146,79,.18)] bg-[color-mix(in_srgb,var(--accent-orange)_7%,#101a2a)] p-3 2xl:min-h-[92px] 2xl:grid-cols-[72px_minmax(0,1fr)]"
            key={meal.type}
          >
            <div className="rounded-[14px] border border-[rgba(217,146,79,.20)] bg-[rgba(217,146,79,.14)] 2xl:h-[68px] 2xl:w-[72px]" />
            <div className="min-w-0 py-0.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <Pill accent="var(--accent-yellow)">{meal.type}</Pill>
                <h3 className="text-xs font-semibold text-[var(--text-secondary)]">
                  {meal.name}
                </h3>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-[10px] font-medium text-[var(--text-secondary)]">
                <span>{meal.kcal}</span>
                {meal.macros.map((macro) => (
                  <span key={macro}>{macro}</span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}

export function RunningTracker({
  data,
}: Readonly<{
  data: DashboardRunningRecovery;
}>) {
  const rhythmAccent = runningRhythmAccent(data.rhythm.statusLabel);
  const modeSwitch = (
    <div className="flex w-[294px] max-w-full rounded-full border border-[var(--border-subtle)] bg-[#0b1422] p-0.5 text-center text-[10px] font-semibold text-[var(--text-primary)]">
      {data.modes.map((view) => (
        <span
          className={cn(
            "flex-1 rounded-full px-3 py-0.5",
            view === data.activeMode &&
              "border border-[var(--border-subtle)] bg-[rgba(168,183,204,.06)] text-[var(--text-secondary)]",
          )}
          key={view}
        >
          {view}
        </span>
      ))}
    </div>
  );

  return (
    <Panel
      className="border-[var(--border-subtle)] bg-[#0f1724] 2xl:h-[226px]"
      headerAccessory={modeSwitch}
      subtitle={data.subtitle}
      title={data.title}
    >
      <div className="p-3 2xl:flex 2xl:h-[152px] 2xl:flex-col 2xl:justify-between 2xl:p-2.5">
        <div className="grid gap-3 sm:grid-cols-3 2xl:gap-2">
          {data.stats.map((stat) => (
            <article
              className="rounded-[14px] border border-[var(--border-subtle)] bg-[#101a2a] p-2.5 2xl:min-h-[52px] 2xl:p-2"
              key={stat.label}
            >
              <p className="text-[10px] font-medium text-[var(--text-muted)]">
                {stat.label}
              </p>
              <div className="mt-1.5 flex items-baseline justify-between gap-3">
                <p className="text-base font-semibold text-[var(--text-primary)]">
                  {stat.value}
                </p>
                <p className="text-[10px] font-medium text-[var(--text-secondary)]">
                  {stat.delta}
                </p>
              </div>
            </article>
          ))}
        </div>
        <article className="mt-2 grid gap-3 rounded-[14px] border border-[var(--border-subtle)] bg-[#101a2a] p-2.5 sm:grid-cols-[minmax(0,1fr)_150px_56px] sm:items-center 2xl:mt-0 2xl:min-h-[62px] 2xl:gap-2 2xl:p-2">
          <div>
            <p className="text-[10px] font-semibold text-[var(--text-primary)]">
              {data.rhythm.title}
            </p>
            <p className="mt-1 text-[10px] font-semibold text-[var(--text-primary)]">
              {data.rhythm.detail}
            </p>
          </div>
          <ProgressBar
            accent={rhythmAccent}
            progress={data.rhythm.progress}
            quiet
          />
          <Pill accent={rhythmAccent}>
            {data.rhythm.statusLabel}
          </Pill>
        </article>
      </div>
    </Panel>
  );
}
