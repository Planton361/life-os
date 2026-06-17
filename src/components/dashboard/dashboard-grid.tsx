import {
  ActivePortfolio,
  AntiRotActions,
  Challenges,
  HabitTrackers,
  MealsToday,
  RunningTracker,
  TodayAgenda,
} from "@/components/dashboard/dashboard-sections";

export function DashboardGrid() {
  return (
    <section
      aria-label="Dashboard-Zonen"
      className="grid min-w-0 grid-cols-1 gap-[var(--grid-gap)] xl:grid-cols-[minmax(270px,520px)_minmax(480px,1fr)_minmax(300px,540px)] xl:items-start"
    >
      <div className="min-w-0 space-y-[var(--grid-gap)]">
        <MealsToday />
        <RunningTracker />
      </div>

      <TodayAgenda />

      <div className="min-w-0 space-y-[var(--grid-gap)]">
        <HabitTrackers />
        <ActivePortfolio />
      </div>

      <div className="min-w-0 xl:col-span-2">
        <AntiRotActions />
      </div>
      <Challenges />
    </section>
  );
}
