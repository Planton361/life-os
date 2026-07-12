import {
  AntiRotActions,
  Challenges,
  HabitTrackers,
  MealsToday,
  NutrientBalance,
  RunningTracker,
  TodayAgenda,
  WeightLossGoal,
} from "@/components/dashboard/dashboard-sections";
import { ActivePortfolio } from "@/components/dashboard/sections/active-portfolio-section";
import { getDashboardViewModel } from "@/features/profile-data";
import { ManualDbAuthNotice } from "@/features/real-data/manual-db-auth-notice";

export async function DashboardGrid({ habitFeedback }: Readonly<{ habitFeedback?: string }>) {
  const dashboard = await getDashboardViewModel();
  const { profileId } = dashboard;

  return (
    <section
      aria-label="Dashboard-Zonen"
      className="min-w-0 space-y-[var(--grid-gap)]"
    >
      <ManualDbAuthNotice />
      <div className="grid min-w-0 grid-cols-1 gap-[var(--grid-gap)] xl:grid-cols-[minmax(270px,520px)_minmax(480px,1fr)_minmax(300px,540px)] xl:items-start 2xl:grid-cols-[590px_1010px_609px] 2xl:gap-x-[9px]">
        <div className="min-w-0 space-y-[var(--grid-gap)]">
          <div className="grid gap-[var(--grid-gap)] sm:grid-cols-[minmax(172px,210px)_minmax(0,1fr)] 2xl:grid-cols-[224px_359px] 2xl:gap-[7px] 2xl:pl-0">
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

        <TodayAgenda data={dashboard.todayAgenda} profileId={profileId} />

        <div className="min-w-0 space-y-[var(--grid-gap)]">
          <HabitTrackers data={dashboard.habitTrackers} feedback={habitFeedback} profileId={profileId} />
          <ActivePortfolio
            data={dashboard.activePortfolio}
            profileId={profileId}
          />
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-[var(--grid-gap)] xl:grid-cols-[minmax(0,1fr)_minmax(300px,540px)] xl:items-start 2xl:grid-cols-[1415px_minmax(0,1fr)] 2xl:gap-x-[7px]">
        <AntiRotActions data={dashboard.antiRotActions} profileId={profileId} />
        <Challenges
          data={dashboard.challengesRewardFocus}
          profileId={profileId}
        />
      </div>
    </section>
  );
}
