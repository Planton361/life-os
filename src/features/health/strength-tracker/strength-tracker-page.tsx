import { contentStateDataAttributes } from "@/features/content-state";
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
    <div
      className="mx-auto flex w-full max-w-[2208px] flex-col gap-3 pb-6 xl:gap-2"
      data-strength-section="page"
      {...contentStateDataAttributes(
        viewModel.contentStates.page,
        viewModel.profileId,
      )}
    >
      <StrengthHeader
        header={viewModel.header}
        profileId={viewModel.profileId}
        state={viewModel.contentStates.header}
      />
      <SummaryStrip
        metrics={viewModel.summary}
        profileId={viewModel.profileId}
        state={viewModel.contentStates.summary}
      />

      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.32fr)_minmax(360px,.68fr)] xl:gap-2">
        <StrengthSessionPlannerSection
          className="order-1"
          planner={viewModel.planner}
          profileId={viewModel.profileId}
          state={viewModel.contentStates.planner}
        />
        <div className="order-2 grid min-w-0 gap-3 xl:gap-2">
          <TodayStrengthPlanSection
            profileId={viewModel.profileId}
            state={viewModel.contentStates.todayPlan}
            todayPlan={viewModel.todayPlan}
          />
          <RecentSessionReviewSection
            profileId={viewModel.profileId}
            review={viewModel.review}
            state={viewModel.contentStates.review}
          />
        </div>
      </div>

      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)] xl:gap-2">
        <WeeklyStrengthRhythmSection
          profileId={viewModel.profileId}
          rhythmBalance={viewModel.rhythmBalance}
          state={viewModel.contentStates.rhythmBalance}
        />
        <TrainingLoadRecoverySection
          loadRecovery={viewModel.loadRecovery}
          profileId={viewModel.profileId}
          state={viewModel.contentStates.loadRecovery}
        />
      </div>

      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,.95fr)_minmax(0,.8fr)_minmax(0,.8fr)] xl:gap-2">
        <ExerciseProgressionContextSection
          profileId={viewModel.profileId}
          progression={viewModel.progression}
          state={viewModel.contentStates.progression}
        />
        <StrengthTrendSection
          profileId={viewModel.profileId}
          state={viewModel.contentStates.trend}
          trend={viewModel.trend}
        />
        <RecentSetsSection
          profileId={viewModel.profileId}
          recentSets={viewModel.recentSets}
          state={viewModel.contentStates.recentSets}
        />
      </div>

      <BeginnerStrengthBoundariesSection boundaries={viewModel.boundaries} />
    </div>
  );
}
