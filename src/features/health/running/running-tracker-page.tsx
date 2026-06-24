import { contentStateDataAttributes } from "@/features/content-state";
import type { RunningTrackerPageViewModel } from "./running-tracker-types";
import {
  BeginnerPlannerSection,
  BottomAnalyticsStrip,
  BoundariesStrip,
  ContextSection,
  DesktopRightColumn,
  DistanceTrendSection,
  LoadRecoverySection,
  RecentRunReviewSection,
  RecentRunsSection,
  RunningHeader,
  SummaryStrip,
  TodayRunPlanSection,
  WeeklyRhythmSection,
} from "./components/running-tracker-sections";

export function RunningTrackerPage({
  viewModel,
}: Readonly<{
  viewModel: RunningTrackerPageViewModel;
}>) {
  return (
    <div
      className="mx-auto flex w-full max-w-[2208px] flex-col gap-3 pb-6 xl:grid xl:h-[calc(100dvh-1.25rem)] xl:grid-rows-[auto_auto_minmax(0,1fr)_auto] xl:gap-2 xl:overflow-hidden xl:pb-0"
      data-running-section="page"
      {...contentStateDataAttributes(
        viewModel.contentStates.page,
        viewModel.profileId,
      )}
    >
      <RunningHeader
        header={viewModel.header}
        profileId={viewModel.profileId}
        state={viewModel.contentStates.header}
      />
      <SummaryStrip
        metrics={viewModel.summary}
        profileId={viewModel.profileId}
        state={viewModel.contentStates.summary}
      />

      <div className="grid min-w-0 gap-3 xl:hidden">
        <BeginnerPlannerSection
          className="order-1"
          planner={viewModel.planner}
          profileId={viewModel.profileId}
          state={viewModel.contentStates.planner}
        />
        <TodayRunPlanSection
          className="order-2"
          profileId={viewModel.profileId}
          state={viewModel.contentStates.todayPlan}
          todayPlan={viewModel.todayPlan}
        />
        <RecentRunReviewSection
          className="order-3"
          profileId={viewModel.profileId}
          review={viewModel.review}
          state={viewModel.contentStates.review}
        />
        <WeeklyRhythmSection
          className="order-4"
          profileId={viewModel.profileId}
          rhythm={viewModel.rhythm}
          state={viewModel.contentStates.rhythm}
        />
        <LoadRecoverySection
          className="order-5"
          loadRecovery={viewModel.loadRecovery}
          profileId={viewModel.profileId}
          state={viewModel.contentStates.loadRecovery}
        />
        <ContextSection
          className="order-6"
          context={viewModel.context}
          profileId={viewModel.profileId}
          state={viewModel.contentStates.context}
        />
        <DistanceTrendSection
          className="order-7"
          distanceTrend={viewModel.distanceTrend}
          profileId={viewModel.profileId}
          state={viewModel.contentStates.distanceTrend}
        />
        <RecentRunsSection
          className="order-8"
          profileId={viewModel.profileId}
          recentRuns={viewModel.recentRuns}
          state={viewModel.contentStates.recentRuns}
        />
      </div>

      <div className="hidden min-h-0 grid-cols-[minmax(0,1.28fr)_minmax(420px,.72fr)] gap-2 overflow-hidden xl:grid">
        <BeginnerPlannerSection
          className="min-h-0"
          planner={viewModel.planner}
          profileId={viewModel.profileId}
          state={viewModel.contentStates.planner}
        />
        <DesktopRightColumn
          className="min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden"
          contentStates={viewModel.contentStates}
          loadRecovery={viewModel.loadRecovery}
          profileId={viewModel.profileId}
          review={viewModel.review}
          rhythm={viewModel.rhythm}
          todayPlan={viewModel.todayPlan}
        />
      </div>

      <BottomAnalyticsStrip
        boundaries={viewModel.boundaries}
        className="min-h-0"
        contentStates={viewModel.contentStates}
        context={viewModel.context}
        distanceTrend={viewModel.distanceTrend}
        profileId={viewModel.profileId}
        recentRuns={viewModel.recentRuns}
      />

      <div className="xl:hidden">
        <BoundariesStrip boundaries={viewModel.boundaries} />
      </div>
    </div>
  );
}
