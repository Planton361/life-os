export type HealthAccent =
  | "var(--accent-blue)"
  | "var(--accent-green)"
  | "var(--accent-orange)"
  | "var(--accent-red)"
  | "var(--accent-purple)"
  | "var(--accent-cyan)"
  | "var(--accent-yellow)";

export type HealthMetricViewModel = {
  label: string;
  value: string;
  detail: string;
  accent: HealthAccent;
};

export type MoodDirectionViewModel = {
  label: string;
  mark: string;
  daysLabel: string;
  pattern: readonly boolean[];
  accent: HealthAccent;
};

export type SleepBarViewModel = {
  day: string;
  value: number;
  label: string;
};

export type MentalHealthViewModel = {
  title: "Mental Health";
  subtitle: "Mood, sleep and reflection signals. Self-check only.";
  badge: "Self-check";
  moodTitle: "Mood check-ins · last 7 days";
  moodDirections: readonly MoodDirectionViewModel[];
  sleep: {
    label: "Sleep (7d avg)";
    value: "7h 18m";
    detail: "Sleep debt visible";
    bars: readonly SleepBarViewModel[];
  };
  journal: {
    label: "Journal / Reflection";
    value: "4 / 7 days";
    pattern: readonly boolean[];
    actionLabel: "Open Journal";
    href: "/life/journal";
  };
};

export type RunningTrendViewModel = {
  title: "7-day trend" | "30-day trend";
  statement: string;
  values: readonly number[];
  accent: HealthAccent;
};

export type RunningViewModel = {
  title: "Running Tracker";
  subtitle: "Weekly distance, load status and next run.";
  loadStatus: "Moderate load";
  metrics: readonly HealthMetricViewModel[];
  trends: readonly RunningTrendViewModel[];
  nextRun: {
    label: "Next run";
    title: "Thu · 6.5 km easy run";
    detail: "Recovery signal medium · keep intensity low.";
    actionLabel: "View Plan";
    href: "/health/running";
  };
};

export type HabitHeatmapRowViewModel = {
  label: "Morning" | "Midday" | "Evening";
  values: readonly number[];
};

export type HabitsViewModel = {
  title: "Habits";
  subtitle: "Routine consistency over time.";
  badge: "78%";
  metrics: readonly HealthMetricViewModel[];
  heatmap: {
    title: "Monthly habit heatmap · June";
    rows: readonly HabitHeatmapRowViewModel[];
    legend: {
      low: "Less";
      high: "More";
    };
  };
  nextFocus: {
    label: "Next Focus";
    title: "Evening shutdown · build consistency before adding more.";
    actionLabel: "Open Habits";
    href: "/health/habits";
  };
};

export type StrengthPatternViewModel = {
  day: string;
  label: string;
  intensity: number;
  accent: HealthAccent;
};

export type StrengthBalanceViewModel = {
  label: "Pull" | "Push" | "Core" | "Mobility" | "Recovery" | "Skill work";
  count: number;
  accent: HealthAccent;
};

export type StrengthViewModel = {
  title: "Strength Tracker";
  subtitle: "Bodyweight / calisthenics · full body focus.";
  badge: "64% coverage";
  metrics: readonly HealthMetricViewModel[];
  trainingPattern: {
    title: "Training pattern (last 2 weeks)";
    note: "Full body sessions with recovery spacing.";
    days: readonly StrengthPatternViewModel[];
  };
  sessionBalance: {
    title: "Session type balance";
    items: readonly StrengthBalanceViewModel[];
  };
  nextSession: {
    label: "Next session";
    title: "Tue · Full body";
    detail: "Strength + skill · 40–50 min";
    actionLabel: "View Plan";
    href: "/health/strength";
  };
};

export type HealthScheduleStatus = "done" | "planned" | "sleep";

export type HealthScheduleItemViewModel = {
  time: string;
  title: string;
  detail: string;
  statusLabel: string;
  status: HealthScheduleStatus;
  accent: HealthAccent;
};

export type HealthScheduleViewModel = {
  title: "Today · Health Schedule";
  dateLabel: "Tuesday, June 10";
  items: readonly HealthScheduleItemViewModel[];
  footerLabel: "View all details and history";
  actionLabel: "Open Calendar";
  href: "/calendar";
};

export type HealthOverviewViewModel = {
  header: {
    eyebrow: "Life OS / Health & Fitness";
    title: "Health & Fitness";
    summary: "Body, mind, habits and training signals in one place.";
    dateRange: "Week 24 · June 10 – June 16, 2026";
  };
  pageContract: {
    pageType: "Area Overview";
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
  mentalHealth: MentalHealthViewModel;
  running: RunningViewModel;
  habits: HabitsViewModel;
  strength: StrengthViewModel;
  schedule: HealthScheduleViewModel;
};
