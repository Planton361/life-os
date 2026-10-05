import { CommandCenter } from "@/components/layout/command-center";
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
import {
  getDashboardViewModel,
  getCalendarViewModel,
} from "@/features/profile-data";
import { ManualDbAuthNotice } from "@/features/real-data/manual-db-auth-notice";

export async function DashboardGrid() {
  const [dashboard, calendar] = await Promise.all([
    getDashboardViewModel(),
    getCalendarViewModel(),
  ]);
  const { profileId } = dashboard;

  return (
    <section
      aria-label="Dashboard-Zonen"
      className="dashboard-surface composition-flow min-w-0 gap-[var(--grid-gap)]"
    >
      <DashboardFeedbackBridge />
      <ManualDbAuthNotice />
      <div className="dashboard-composition composition-frame">
        <CommandCenter
          data={dashboard.commandCenter}
          agenda={
            <TodayAgenda
              key="dashboard-agenda"
              calendar={calendar}
              data={dashboard.todayAgenda}
              profileId={profileId}
            />
          }
        />
        <div className="dashboard-main-grid">
          <div className="dashboard-side-stack dashboard-priority min-w-0">
            <HabitTrackers
              data={dashboard.habitTrackers}
              profileId={profileId}
            />
            <ActivePortfolio
              data={dashboard.activePortfolio}
              profileId={profileId}
            />
          </div>
          <div className="dashboard-side-stack dashboard-supporting min-w-0">
            <div className="dashboard-health">
              <div className="dashboard-health-grid grid gap-[var(--grid-gap)]">
                <WeightLossGoal
                  data={dashboard.healthNutrition.weightLossGoal}
                  profileId={profileId}
                />
                <NutrientBalance
                  data={dashboard.healthNutrition.nutrientBalance}
                  profileId={profileId}
                />
              </div>
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
        </div>
      </div>
    </section>
  );
}
