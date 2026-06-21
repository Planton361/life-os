export type HabitAccent =
  | "var(--accent-blue)"
  | "var(--accent-green)"
  | "var(--accent-orange)"
  | "var(--accent-red)"
  | "var(--accent-purple)"
  | "var(--accent-cyan)"
  | "var(--accent-yellow)";

export type HabitDayIntensity = 0 | 1 | 2 | 3 | 4;

export type HabitDaySignal = {
  date: string;
  dayOfMonth: number;
  intensity: HabitDayIntensity;
  label: string;
};

export type HabitSummaryMetricViewModel = {
  label: string;
  value: string;
  detail: string;
  accent: HabitAccent;
};

export type HabitHeatmapRowViewModel = {
  id: string;
  label: "Morning" | "Health" | "Learning" | "Evening";
  completionRate: number;
  accent: HabitAccent;
  signals: readonly HabitDaySignal[];
};

export type HabitPatternReadMetricViewModel = {
  label: "Morning" | "Evening";
  value: string;
  accent: HabitAccent;
};

export type HabitPatternReadViewModel = {
  title: "Pattern read";
  copy: string;
  metrics: readonly HabitPatternReadMetricViewModel[];
};

export type HabitPatternStatus =
  | "Stable"
  | "Good"
  | "Useful"
  | "Uneven"
  | "Fragile"
  | "Repair";

export type HabitPatternRowViewModel = {
  habit: string;
  group: "Morning" | "Health" | "Learning" | "Review" | "Evening";
  target: string;
  status: HabitPatternStatus;
  nextAction: string;
  sevenDayDots: readonly boolean[];
  thirtyDayProgress: number;
  accent: HabitAccent;
};

export type RepairLoopViewModel = {
  title: string;
  reset: string;
  triggers: string;
  repaired: string;
  accent: HabitAccent;
};

export type InterpretationFooterViewModel = {
  title: "Interpretation, not judgement";
  copy: string;
  pill: "repair beats perfection";
};

export type TodayHabitScheduleItemViewModel = {
  time: string;
  title: string;
  status: "Done" | "Open" | "Skipped" | "Planned" | "Next";
  detail: string;
  accent: HabitAccent;
};

export type HabitDetailFocusViewModel = {
  title: "Habit Detail Focus";
  subtitle: "Selected habit: Evening shutdown";
  habit: "Evening shutdown";
  target: string;
  frictionNote: string;
  sevenDayStatus: string;
  thirtyDayTrend: string;
  actionLabel: "Start next repair";
  progress: number;
  accent: HabitAccent;
};

export type WeeklyRhythmInsightViewModel = {
  title: string;
  detail: string;
  status: "stable" | "repair" | "better" | "context";
  accent: HabitAccent;
};

export type HabitBoundaryCardViewModel = {
  title: "No shame / no diagnosis / no automation";
  bullets: readonly string[];
};

export type HabitsAnalyticsPageViewModel = {
  header: {
    breadcrumb: readonly ["Life OS", "Health & Fitness", "Habits"];
    title: "Habits";
    subtitle: string;
    meta: "June 2026 · analytics detail";
    pills: readonly HabitSummaryMetricViewModel[];
    todaySignal: HabitSummaryMetricViewModel & {
      progress: number;
      progressLabel: string;
    };
  };
  pageContract: {
    pageType: "Habits - V1 · Analytics Detail";
    primaryPurpose: string;
    writes: "none in Phase 2";
    reads: string;
    canonicalSource: string;
    sensitiveData: "health_sensitive";
    primaryDecision: string;
    mainZone: string;
    emptyState: string;
    mobileOrder: string;
  };
  summary: readonly HabitSummaryMetricViewModel[];
  heatmap: {
    title: "Monthly Consistency Heatmap · June";
    statement: string;
    rows: readonly HabitHeatmapRowViewModel[];
    legend: {
      low: "less";
      high: "more";
    };
    patternRead: HabitPatternReadViewModel;
  };
  patternTable: {
    title: "Habit Pattern Table · not a spreadsheet wall";
    statement: string;
    rows: readonly HabitPatternRowViewModel[];
  };
  repairLoops: {
    title: "Repair Loops";
    items: readonly RepairLoopViewModel[];
  };
  interpretation: InterpretationFooterViewModel;
  todaySchedule: {
    title: "Today Habit Schedule";
    subtitle: "Habit actions in today's flow, not another task wall.";
    items: readonly TodayHabitScheduleItemViewModel[];
  };
  detailFocus: HabitDetailFocusViewModel;
  weeklyRhythmInsights: {
    title: "Weekly Rhythm Insights";
    rows: readonly WeeklyRhythmInsightViewModel[];
  };
  boundary: HabitBoundaryCardViewModel;
  isEmpty: boolean;
};
