import type { StrengthTrackerPageViewModel } from "./strength-tracker-types";
import {
  BeginnerStrengthBoundariesSection,
  ExerciseProgressionContextSection,
  RecentSessionReviewSection,
  RecentSetsSection,
  StrengthHeader,
  StrengthSessionPlannerSection,
  StrengthTrendSection,
  SummaryStrip,
  TodayStrengthPlanSection,
  TrainingLoadRecoverySection,
  WeeklyStrengthRhythmSection,
} from "./components/strength-tracker-sections";

export function StrengthTrackerPage({
  viewModel,
}: Readonly<{
  viewModel: StrengthTrackerPageViewModel;
}>) {
  return (
    <div className="mx-auto flex w-full max-w-[2208px] flex-col gap-3 pb-6 xl:gap-2">
      <StrengthHeader header={viewModel.header} />
      <SummaryStrip metrics={viewModel.summary} />

      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.32fr)_minmax(360px,.68fr)] xl:gap-2">
        <StrengthSessionPlannerSection
          className="order-1"
          planner={viewModel.planner}
        />
        <div className="order-2 grid min-w-0 gap-3 xl:gap-2">
          <TodayStrengthPlanSection todayPlan={viewModel.todayPlan} />
          <RecentSessionReviewSection review={viewModel.review} />
        </div>
      </div>

      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)] xl:gap-2">
        <WeeklyStrengthRhythmSection
          rhythmBalance={viewModel.rhythmBalance}
        />
        <TrainingLoadRecoverySection loadRecovery={viewModel.loadRecovery} />
      </div>

      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,.95fr)_minmax(0,.8fr)_minmax(0,.8fr)] xl:gap-2">
        <ExerciseProgressionContextSection
          progression={viewModel.progression}
        />
        <StrengthTrendSection trend={viewModel.trend} />
        <RecentSetsSection recentSets={viewModel.recentSets} />
      </div>

      <BeginnerStrengthBoundariesSection boundaries={viewModel.boundaries} />
    </div>
  );
}
