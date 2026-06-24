import type { ContentStateMeta } from "@/features/content-state";

export type RunningProfileId = "demo" | "empty" | "manual";

export type RunningAccent =
  | "var(--accent-blue)"
  | "var(--accent-green)"
  | "var(--accent-orange)"
  | "var(--accent-red)"
  | "var(--accent-cyan)"
  | "var(--accent-yellow)";

export type RunType =
  | "easy"
  | "run-walk"
  | "tempo"
  | "rest"
  | "mobility"
  | "long";

export type EffortTarget =
  | "very-easy"
  | "conversational"
  | "moderate"
  | "hard";

export type RunStatus = "done" | "planned" | "rest" | "mobility";

export type PlannerMode =
  | "time"
  | "distance"
  | "run-walk"
  | "pace"
  | "heart-rate"
  | "recovery";

export type DayRhythmState =
  | "rest"
  | "easy-run"
  | "mobility"
  | "tempo"
  | "planned-long-run";

export type RunningPillViewModel = {
  label: string;
  accent: RunningAccent;
};

export type RunningSummaryMetricViewModel = {
  label: string;
  value: string;
  detail: string;
  accent: RunningAccent;
};

export type RunningChipViewModel<TValue extends string = string> = {
  label: string;
  value: TValue;
  active?: boolean;
  accent?: RunningAccent;
};

export type RunningInputViewModel = {
  label: string;
  value: string;
  helper: string;
  accent: RunningAccent;
};

export type RunningPlanStepViewModel = {
  label: string;
  detail: string;
  accent: RunningAccent;
};

export type RunningActionViewModel = {
  label: string;
  variant: "primary" | "secondary" | "quiet";
  disabled?: boolean;
};

export type TodayRunChecklistItemViewModel = {
  label: string;
  done: boolean;
};

export type RecentRunSignalViewModel = {
  label: string;
  value: string;
  detail: string;
  accent: RunningAccent;
};

export type WeeklyRhythmDayViewModel = {
  day: string;
  label: string;
  state: DayRhythmState;
  status: RunStatus;
  accent: RunningAccent;
  active: boolean;
};

export type IntensitySplitViewModel = {
  label: string;
  value: number;
  detail: string;
  accent: RunningAccent;
};

export type RunningContextItemViewModel = {
  rank: string;
  label: string;
  detail: string;
  accent: RunningAccent;
};

export type DistanceTrendBarViewModel = {
  label: string;
  value: number;
  display: string;
  accent: RunningAccent;
};

export type RecentRunLogItemViewModel = {
  date: string;
  title: string;
  distance: string;
  duration: string;
  effort: string;
  status: string;
  accent: RunningAccent;
};

export type RunningBoundaryViewModel = {
  label: string;
  detail: string;
  accent: RunningAccent;
};

export type RunningTrackerPageViewModel = {
  profileId: RunningProfileId;
  contentStates: {
    page: ContentStateMeta;
    header: ContentStateMeta;
    summary: ContentStateMeta;
    planner: ContentStateMeta;
    todayPlan: ContentStateMeta;
    review: ContentStateMeta;
    rhythm: ContentStateMeta;
    loadRecovery: ContentStateMeta;
    context: ContentStateMeta;
    distanceTrend: ContentStateMeta;
    recentRuns: ContentStateMeta;
    boundaries: ContentStateMeta;
  };
  header: {
    breadcrumb: readonly string[];
    title: "Running Tracker";
    description: string;
    pills: readonly RunningPillViewModel[];
    decision: {
      label: "Next run decision";
      title: string;
      duration: string;
      effort: string;
      readiness: string;
      progress: number;
      detail: string;
      accent: RunningAccent;
    };
  };
  summary: readonly RunningSummaryMetricViewModel[];
  planner: {
    title: "Beginner Run Planner";
    subtitle: string;
    goalTypes: readonly RunningChipViewModel<PlannerMode>[];
    beginnerGoals: readonly RunningChipViewModel[];
    availableTimes: readonly RunningChipViewModel[];
    effortTargets: readonly RunningChipViewModel<EffortTarget>[];
    optionalInputs: readonly RunningInputViewModel[];
    suggestedPlan: {
      title: string;
      detail: string;
      steps: readonly RunningPlanStepViewModel[];
    };
    primaryActions: readonly RunningActionViewModel[];
    secondaryActions: readonly RunningActionViewModel[];
  };
  todayPlan: {
    title: "Today Run Plan";
    plan: string;
    details: readonly RunningSummaryMetricViewModel[];
    checklist: readonly TodayRunChecklistItemViewModel[];
    actions: readonly RunningActionViewModel[];
  };
  review: {
    title: "Recent Run Review";
    lastRun: string;
    metrics: readonly RunningSummaryMetricViewModel[];
    signals: readonly RecentRunSignalViewModel[];
    learnings: readonly string[];
    nextAdjustment: string;
    action: RunningActionViewModel;
  };
  rhythm: {
    title: "Weekly Running Rhythm";
    subtitle: string;
    days: readonly WeeklyRhythmDayViewModel[];
  };
  loadRecovery: {
    title: "Training Load & Recovery";
    weeklyLoad: {
      label: "Weekly load";
      value: string;
      progress: number;
      detail: string;
      accent: RunningAccent;
    };
    recoverySignal: {
      label: "Recovery signal";
      value: string;
      progress: number;
      detail: string;
      accent: RunningAccent;
    };
    intensitySplit: readonly IntensitySplitViewModel[];
    guardrail: string;
  };
  context: {
    title: "Pace / Heart Rate / Distance Context";
    subtitle: string;
    items: readonly RunningContextItemViewModel[];
  };
  distanceTrend: {
    title: "30-Day Distance Trend";
    statement: string;
    bars: readonly DistanceTrendBarViewModel[];
  };
  recentRuns: {
    title: "Recent Runs";
    subtitle: string;
    items: readonly RecentRunLogItemViewModel[];
  };
  boundaries: readonly RunningBoundaryViewModel[];
};
