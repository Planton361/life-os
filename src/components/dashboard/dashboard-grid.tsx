import {
  ActivePortfolio,
  AntiRotActions,
  Challenges,
  HabitTrackers,
  MealsToday,
  NutrientBalance,
  RunningTracker,
  TodayAgenda,
  WeightLossGoal,
} from "@/components/dashboard/dashboard-sections";

export function DashboardGrid() {
  return (
    <section
      aria-label="Dashboard-Zonen"
      className="min-w-0 space-y-[var(--grid-gap)]"
    >
      <div className="grid min-w-0 grid-cols-1 gap-[var(--grid-gap)] xl:grid-cols-[minmax(270px,520px)_minmax(480px,1fr)_minmax(300px,540px)] xl:items-start 2xl:grid-cols-[590px_1010px_609px] 2xl:gap-x-[9px]">
        <div className="min-w-0 space-y-[var(--grid-gap)]">
          <div className="grid gap-[var(--grid-gap)] sm:grid-cols-[minmax(172px,210px)_minmax(0,1fr)] 2xl:grid-cols-[224px_359px] 2xl:gap-[7px] 2xl:pl-0">
            <WeightLossGoal />
            <NutrientBalance />
          </div>
          <MealsToday />
          <RunningTracker />
        </div>

        <TodayAgenda />

        <div className="min-w-0 space-y-[var(--grid-gap)]">
          <HabitTrackers />
          <ActivePortfolio />
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-[var(--grid-gap)] xl:grid-cols-[minmax(0,1fr)_minmax(300px,540px)] xl:items-start 2xl:grid-cols-[1415px_minmax(0,1fr)] 2xl:gap-x-[7px]">
        <AntiRotActions />
        <Challenges />
      </div>
    </section>
  );
}
