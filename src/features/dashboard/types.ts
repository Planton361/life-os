import type { ContentStateMeta } from "@/features/content-state";

export type DashboardPriority = "P0" | "P1" | "P2" | "P3";

export type DashboardProfileId = "demo" | "empty" | "manual";

export type DashboardArea =
  | "education"
  | "work"
  | "coding"
  | "health"
  | "nutrition"
  | "review"
  | "personal"
  | "system";

export type DashboardAccent =
  | "var(--accent-blue)"
  | "var(--accent-green)"
  | "var(--accent-orange)"
  | "var(--accent-red)"
  | "var(--accent-purple)"
  | "var(--accent-cyan)"
  | "var(--accent-yellow)"
  | "var(--text-muted)";

export type DashboardHref = `/${string}`;

export type DashboardMetric = {
  label: string;
  value: string;
  detail: string;
  progress: number;
  accent: DashboardAccent;
  area: DashboardArea;
  contentState?: ContentStateMeta;
  href?: DashboardHref;
};

export type DashboardTimeProgressRow = {
  label: string;
  value: string;
  progress: number;
};

export type DashboardWeatherState = {
  temperatureLabel: string;
  periodLabel: string;
  conditionLabel: string;
};

export type DashboardMoodCheck = {
  title: string;
  eyebrow: string;
  prompt: string;
  moodLabel: string;
  detail: string;
  progressLabel: string;
  scoreLabel: string;
  progress: number;
  accent: DashboardAccent;
  href?: DashboardHref;
  options: readonly string[];
  activeOption: string;
};

export type DashboardCommandCenterMeta = {
  priority: Extract<DashboardPriority, "P1">;
  greeting: string;
  dateLabel: string;
  dayTypeLabel: string;
  contentState: ContentStateMeta;
  metrics: readonly DashboardMetric[];
  timeProgress: readonly DashboardTimeProgressRow[];
  timeProgressHref?: DashboardHref;
  weather: DashboardWeatherState;
  moodCheck: DashboardMoodCheck;
};

export type QuickCaptureKind = "Note" | "Question" | "Loop" | "Agent";

export type DashboardQuickCapture = {
  priority: Extract<DashboardPriority, "P1">;
  title: string;
  destinationLabel: string;
  placeholder: string;
  helperText: string;
  captureLabel: string;
  contentState: ContentStateMeta;
  kinds: readonly QuickCaptureKind[];
  activeKind: QuickCaptureKind;
};

export type DashboardCurrentTask = {
  id: string;
  sectionLabel: string;
  timeRemainingLabel: string;
  statusLabel: string;
  title: string;
  contextLabel: string;
  actionLabel: string;
  progress: number;
  accent: DashboardAccent;
  area: DashboardArea;
  href?: DashboardHref;
};

export type DashboardQueueItem = {
  id: string;
  title: string;
  meta: string;
  tag: string;
  area: DashboardArea;
  href?: DashboardHref;
};

export type DashboardDailyControlFocus = {
  label: string;
  title: string;
  detail: string;
  blockLabel: string;
  block: string;
};

export type DashboardDailyControlNextStep = {
  label: string;
  title: string;
  detail: string;
};

export type DashboardDailyControlSignalKind = "energy" | "inbox" | "review";

export type DashboardDailyControlSignal = {
  kind: DashboardDailyControlSignalKind;
  label: string;
  value: string;
  detail: string;
  accent: DashboardAccent;
};

export type DashboardDailyControl = {
  priority: Extract<DashboardPriority, "P0">;
  title: string;
  subtitle: string;
  contentState: ContentStateMeta;
  focus: DashboardDailyControlFocus;
  nextStep: DashboardDailyControlNextStep;
  currentTask: DashboardCurrentTask;
  signals: readonly DashboardDailyControlSignal[];
  queueTitle: string;
  queueSubtitle: string;
  queueSummary: string;
  queue: readonly DashboardQueueItem[];
};

export type TodayAgendaView = "Day" | "Week" | "Month";

export type TodayAgendaEnergy = "low" | "medium" | "high";

export type TodayAgendaEventType =
  | "focus"
  | "meeting"
  | "task"
  | "routine"
  | "review"
  | "deadline"
  | "break"
  | "meal"
  | "training";

export type TodayAgendaEventStatus =
  | "done"
  | "active"
  | "next"
  | "planned"
  | "blocked";

export type DashboardAgendaEvent = {
  id: string;
  title: string;
  time: string;
  note: string;
  areaLabel: string;
  type: TodayAgendaEventType;
  typeLabel: string;
  status: TodayAgendaEventStatus;
  statusLabel: string;
  relevanceLabel: string;
  nextAction?: string;
  attentionLabel?: string;
  tags?: readonly string[];
  accent: DashboardAccent;
  area: DashboardArea;
  energy: TodayAgendaEnergy;
  priority: DashboardPriority;
  active?: boolean;
  strong?: boolean;
  tall?: boolean;
  href?: DashboardHref;
};

export type DashboardTodayAgenda = {
  priority: Extract<DashboardPriority, "P0">;
  title: string;
  href?: DashboardHref;
  contentState: ContentStateMeta;
  views: readonly TodayAgendaView[];
  activeView: TodayAgendaView;
  preparedViewsLabel: string;
  currentTimeLabel: string;
  currentTimePositionPercent: number;
  hours: readonly string[];
  events: readonly DashboardAgendaEvent[];
};

export type InboxSignalType =
  | "task"
  | "note"
  | "question"
  | "agent_context"
  | "loop";

export type InboxSignalStatus = "raw" | "clarified" | "converted" | "archived";

export type DashboardInboxSignal = {
  title: string;
  type: InboxSignalType;
  area: DashboardArea;
  status: InboxSignalStatus;
  reviewNeeded: boolean;
  meta: string;
};

export type DashboardInboxSignals = {
  priority: Extract<DashboardPriority, "P1">;
  title: string;
  summary: string;
  openCount: number;
  reviewCount: number;
  items: readonly DashboardInboxSignal[];
};

export type HabitTrackerWindow = "Morning" | "Midday" | "Evening";

export type DashboardHabit = {
  id: string;
  marker: string;
  label: string;
  currentValue: number;
  targetValue: number;
  unit?: string;
  stepValue: number;
  total: number;
  area: DashboardArea;
};

export type DashboardHabitTrackers = {
  priority: Extract<DashboardPriority, "P1">;
  title: string;
  href?: DashboardHref;
  contentState: ContentStateMeta;
  windows: readonly HabitTrackerWindow[];
  activeWindow: HabitTrackerWindow;
  totalSlotsLabel: string;
  addHabitLabel: string;
  addHabitMeta: string;
  habitsByWindow: Record<HabitTrackerWindow, readonly DashboardHabit[]>;
};

export type PortfolioView = "Project View" | "Goal View" | "Skill View";

export type PortfolioItemKind = "project" | "goal" | "skill";

export type DashboardPortfolioViewLink = {
  label: PortfolioView;
  href?: DashboardHref;
};

export type DashboardPortfolioItem = {
  id: string;
  title: string;
  label: string;
  next: string;
  meta: string;
  progress: number;
  accent: DashboardAccent;
  area: DashboardArea;
  kind: PortfolioItemKind;
  href?: DashboardHref;
};

export type DashboardActivePortfolio = {
  priority: Extract<DashboardPriority, "P1">;
  title: string;
  subtitle: string;
  contentState: ContentStateMeta;
  viewTitle: string;
  viewSubtitle: string;
  href?: DashboardHref;
  views: readonly DashboardPortfolioViewLink[];
  activeView: PortfolioView;
  items: readonly DashboardPortfolioItem[];
};

export type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack";

export type DashboardMealRecipeType = "breakfast" | "lunch" | "dinner";

export type DashboardMealRecipeOption = {
  id: string;
  title: string;
  mealTypes: readonly DashboardMealRecipeType[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type DashboardMeal = {
  recipeId: string;
  mealId: string;
  type: MealType;
  state?: DashboardMealSlotState;
  name: string;
  time: string;
  kcal: string;
  macros: readonly string[];
  ctaLabel?: string;
  area: Extract<DashboardArea, "nutrition">;
  href?: DashboardHref;
};

export type DashboardMealSlotState =
  | "unplanned"
  | "planned"
  | "logged"
  | "skipped";

export type DashboardMeals = {
  priority: Extract<DashboardPriority, "P2">;
  title: string;
  href?: DashboardHref;
  contentState: ContentStateMeta;
  currentTimeLabel: string;
  items: readonly DashboardMeal[];
  recipeOptions: readonly DashboardMealRecipeOption[];
};

export type DashboardWeightLossGoal = {
  priority: Extract<DashboardPriority, "P2">;
  title: string;
  href?: DashboardHref;
  contentState: ContentStateMeta;
  currentWeight: string;
  targetLabel: string;
  remainingLabel: string;
  weeklyStatusLabel: string;
  weeklyStatusAccent: DashboardAccent;
  progress: number;
  accent: DashboardAccent;
};

export type DashboardNutrientStatus = "Under" | "On target" | "Over";

export type DashboardNutrientBalanceItem = {
  label: string;
  value: string;
  status: DashboardNutrientStatus;
  progress: number;
  accent: DashboardAccent;
  statusAccent: DashboardAccent;
};

export type DashboardNutrientBalance = {
  priority: Extract<DashboardPriority, "P2">;
  title: string;
  href?: DashboardHref;
  contentState: ContentStateMeta;
  lastUpdatedLabel: string;
  items: readonly DashboardNutrientBalanceItem[];
};

export type RunningRecoveryMode = "Running" | "Muscle";

export type DashboardRunStat = {
  label: string;
  value: string;
  delta: string;
};

export type DashboardRunningRhythm = {
  title: string;
  detail: string;
  progress: number;
  statusLabel: string;
  accent: DashboardAccent;
};

export type DashboardMuscleWorkout = {
  workoutId: string;
  title: string;
  detail: string;
  focusGroups: readonly string[];
  nextStep: string;
  statusLabel: "Planned" | "Done" | "Missed";
  href?: DashboardHref;
};

export type DashboardRunningRecovery = {
  priority: Extract<DashboardPriority, "P2">;
  title: string;
  subtitle: string;
  href?: DashboardHref;
  contentState: ContentStateMeta;
  modes: readonly RunningRecoveryMode[];
  activeMode: RunningRecoveryMode;
  stats: readonly DashboardRunStat[];
  rhythm: DashboardRunningRhythm;
  todayGoalLabel: string;
  lastSyncLabel: string;
  muscle: DashboardMuscleWorkout;
};

export type AntiRotEffort = "Easy" | "Medium" | "Hard";

export type DashboardAntiRotAction = {
  id: string;
  title: string;
  type: string;
  bad: string;
  effort: AntiRotEffort;
  time: string;
  accent: DashboardAccent;
  area: DashboardArea;
};

export type DashboardAntiRotActions = {
  priority: Extract<DashboardPriority, "P3">;
  title: string;
  href?: DashboardHref;
  contentState: ContentStateMeta;
  donePrompt: string;
  actions: readonly DashboardAntiRotAction[];
};

export type DashboardChallengeCadence = "Daily" | "Weekly" | "Monthly";

export type DashboardChallengeTracking = "auto" | "manual";

export type DashboardChallenge = {
  id: string;
  title: string;
  cadence: DashboardChallengeCadence;
  tracking: DashboardChallengeTracking;
  sourceLabel: string;
  type: string;
  status: string;
  footer: string;
  progress: number;
  completed: boolean;
  area: DashboardArea;
};

export type DashboardChallengesRewardFocus = {
  priority: Extract<DashboardPriority, "P3">;
  title: string;
  href?: DashboardHref;
  contentState: ContentStateMeta;
  summary: string;
  measurementLabel: string;
  rewardFocus: string;
  items: readonly DashboardChallenge[];
};

export type DashboardMockData = {
  commandCenter: DashboardCommandCenterMeta;
  quickCapture: DashboardQuickCapture;
  dailyControl: DashboardDailyControl;
  todayAgenda: DashboardTodayAgenda;
  inboxSignals: DashboardInboxSignals;
  habitTrackers: DashboardHabitTrackers;
  activePortfolio: DashboardActivePortfolio;
  weightLossGoal: DashboardWeightLossGoal;
  nutrientBalance: DashboardNutrientBalance;
  meals: DashboardMeals;
  runningRecovery: DashboardRunningRecovery;
  antiRotActions: DashboardAntiRotActions;
  challengesRewardFocus: DashboardChallengesRewardFocus;
};
