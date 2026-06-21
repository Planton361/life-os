export type StrengthAccent =
  | "var(--accent-blue)"
  | "var(--accent-green)"
  | "var(--accent-orange)"
  | "var(--accent-red)"
  | "var(--accent-cyan)"
  | "var(--accent-yellow)";

export type SessionType =
  | "full-body"
  | "upper"
  | "lower"
  | "push"
  | "pull"
  | "legs"
  | "mobility";

export type TrainingFocus =
  | "technique"
  | "build-consistency"
  | "progress-slowly"
  | "balanced-volume"
  | "core-stability"
  | "recovery-lift";

export type EffortTarget = "very-easy" | "rpe-6-7" | "moderate" | "hard";

export type EquipmentType =
  | "gym"
  | "bodyweight"
  | "dumbbells"
  | "bands"
  | "barbell";

export type StrengthActionViewModel = {
  label: string;
  variant: "primary" | "secondary" | "quiet";
};

export type StrengthPillViewModel = {
  label: string;
  accent: StrengthAccent;
};

export type StrengthSummaryMetricViewModel = {
  label: string;
  value: string;
  detail: string;
  accent: StrengthAccent;
};

export type StrengthChipViewModel<TValue extends string = string> = {
  label: string;
  value: TValue;
  active?: boolean;
  accent?: StrengthAccent;
};

export type StrengthInputViewModel = {
  label: string;
  value: string;
  helper: string;
  accent: StrengthAccent;
};

export type StrengthPlanStepViewModel = {
  label: string;
  detail: string;
  accent: StrengthAccent;
};

export type StrengthChecklistItemViewModel = {
  label: string;
  done: boolean;
};

export type StrengthSignalViewModel = {
  label: string;
  value: string;
  detail: string;
  accent: StrengthAccent;
};

export type StrengthRhythmDayViewModel = {
  day: string;
  label: string;
  status: string;
  accent: StrengthAccent;
  active: boolean;
};

export type MuscleBalanceItemViewModel = {
  label: string;
  value: string;
  detail: string;
  accent: StrengthAccent;
};

export type StrengthSplitViewModel = {
  label: string;
  value: number;
  detail: string;
  accent: StrengthAccent;
};

export type ProgressionRuleViewModel = {
  rank: string;
  label: string;
  detail: string;
  accent: StrengthAccent;
};

export type StrengthTrendWeekViewModel = {
  label: string;
  sessions: string;
  sets: string;
  stableLifts: string;
  value: number;
  accent: StrengthAccent;
};

export type RecentSetLogItemViewModel = {
  date: string;
  exercise: string;
  load: string;
  result: string;
  status: string;
  accent: StrengthAccent;
};

export type StrengthBoundaryViewModel = {
  label: string;
  detail: string;
  accent: StrengthAccent;
};

export type StrengthTrackerPageViewModel = {
  header: {
    breadcrumb: readonly string[];
    title: string;
    description: string;
    meta: string;
    pills: readonly StrengthPillViewModel[];
    decision: {
      label: string;
      title: string;
      duration: string;
      effort: string;
      readiness: string;
      progress: number;
      detail: string;
      accent: StrengthAccent;
    };
  };
  summary: readonly StrengthSummaryMetricViewModel[];
  planner: {
    title: string;
    subtitle: string;
    sessionTypes: readonly StrengthChipViewModel<SessionType>[];
    trainingFocus: readonly StrengthChipViewModel<TrainingFocus>[];
    availableTimes: readonly StrengthChipViewModel[];
    effortTargets: readonly StrengthChipViewModel<EffortTarget>[];
    equipment: readonly StrengthChipViewModel<EquipmentType>[];
    movementInputs: readonly StrengthInputViewModel[];
    suggestedSession: {
      title: string;
      detail: string;
      target: string;
      steps: readonly StrengthPlanStepViewModel[];
    };
    primaryActions: readonly StrengthActionViewModel[];
    secondaryActions: readonly StrengthActionViewModel[];
  };
  todayPlan: {
    title: string;
    plan: string;
    details: readonly StrengthSummaryMetricViewModel[];
    checklist: readonly StrengthChecklistItemViewModel[];
    actions: readonly StrengthActionViewModel[];
  };
  review: {
    title: string;
    lastSession: string;
    metrics: readonly StrengthSummaryMetricViewModel[];
    signals: readonly StrengthSignalViewModel[];
    learning: string;
    adjustment: string;
    action: StrengthActionViewModel;
  };
  rhythmBalance: {
    title: string;
    subtitle: string;
    days: readonly StrengthRhythmDayViewModel[];
    balance: readonly MuscleBalanceItemViewModel[];
    statement: string;
  };
  loadRecovery: {
    title: string;
    weeklyLoad: {
      label: string;
      value: string;
      progress: number;
      detail: string;
      accent: StrengthAccent;
    };
    recoverySignal: {
      label: string;
      value: string;
      progress: number;
      detail: string;
      accent: StrengthAccent;
    };
    volumeSplit: readonly StrengthSplitViewModel[];
    guardrail: string;
  };
  progression: {
    title: string;
    subtitle: string;
    rules: readonly ProgressionRuleViewModel[];
    footer: string;
  };
  trend: {
    title: string;
    statement: string;
    weeks: readonly StrengthTrendWeekViewModel[];
  };
  recentSets: {
    title: string;
    subtitle: string;
    note: string;
    items: readonly RecentSetLogItemViewModel[];
  };
  boundaries: {
    title: string;
    footer: string;
    items: readonly StrengthBoundaryViewModel[];
  };
};
