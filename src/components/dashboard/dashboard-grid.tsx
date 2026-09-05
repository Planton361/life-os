import {
  HabitTrackers,
  MealsToday,
  NutrientBalance,
  RunningTracker,
  TodayAgenda,
  WeightLossGoal,
} from "@/components/dashboard/dashboard-sections";
import { ActivePortfolio } from "@/components/dashboard/sections/active-portfolio-section";
import { DashboardFeedbackBridge } from "@/components/dashboard/dashboard-feedback-bridge";
import { getDashboardViewModel, getCalendarViewModel } from "@/features/profile-data";
import { ManualDbAuthNotice } from "@/features/real-data/manual-db-auth-notice";

export async function DashboardGrid() {
  const [dashboard, calendar] = await Promise.all([getDashboardViewModel(), getCalendarViewModel()]);
  const { profileId } = dashboard;

  return (
    <section
      aria-label="Dashboard-Zonen"
      className="min-w-0 space-y-[var(--grid-gap)]"
    >
      <DashboardFeedbackBridge />
      <ManualDbAuthNotice />
      <div className="dashboard-main-grid grid min-w-0 grid-cols-1 gap-[var(--grid-gap)] xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1.15fr)]">
        <div className="dashboard-side-stack min-w-0 space-y-[var(--grid-gap)]">
          <div className="grid gap-[var(--grid-gap)] sm:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
            <WeightLossGoal
              data={dashboard.healthNutrition.weightLossGoal}
              profileId={profileId}
            />
            <NutrientBalance
              data={dashboard.healthNutrition.nutrientBalance}
              profileId={profileId}
            />
          </div>
          <MealsToday
            data={dashboard.healthNutrition.meals}
            profileId={profileId}
          />
          <RunningTracker
            data={dashboard.healthNutrition.runningRecovery}
            profileId={profileId}
          />
        </div>

        <TodayAgenda calendar={calendar} data={dashboard.todayAgenda} profileId={profileId} />

        <div className="dashboard-side-stack min-w-0 space-y-[var(--grid-gap)]">
          <HabitTrackers data={dashboard.habitTrackers} profileId={profileId} />
          <ActivePortfolio
            data={dashboard.activePortfolio}
            profileId={profileId}
          />
        </div>
      </div>

    </section>
  );
}
