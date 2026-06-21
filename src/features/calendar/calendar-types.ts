export type CalendarSourceEntityType =
  | "project"
  | "task"
  | "goal"
  | "review"
  | "meal"
  | "workout"
  | "meeting"
  | "free_event";

export type CalendarBlockType =
  | "event"
  | "task_block"
  | "focus_block"
  | "batch_block"
  | "routine"
  | "deadline"
  | "reminder"
  | "review"
  | "meal"
  | "workout";

export type CalendarCreateBlockType =
  | "event"
  | "task_block"
  | "focus_block"
  | "batch_block"
  | "routine"
  | "deadline"
  | "reminder";

export type CalendarBlockStatus =
  | "planned"
  | "active"
  | "done"
  | "moved"
  | "cancelled"
  | "missed"
  | "needs_decision"
  | "draft";

export type CalendarBlockSource =
  | "manual"
  | "task"
  | "project"
  | "goal"
  | "inbox"
  | "routine"
  | "meal_planner"
  | "health"
  | "review"
  | "agent_suggestion";

export const calendarBlockTypeLabels = {
  event: "Event",
  task_block: "Task Block",
  focus_block: "Focus Block",
  batch_block: "Batch Block",
  routine: "Routine",
  deadline: "Deadline",
  reminder: "Reminder",
  review: "Review",
  meal: "Meal",
  workout: "Workout",
} satisfies Record<CalendarBlockType, string>;

export const calendarBlockStatusLabels = {
  planned: "planned",
  active: "active",
  done: "done",
  moved: "moved",
  cancelled: "cancelled",
  missed: "missed",
  needs_decision: "needs decision",
  draft: "draft",
} satisfies Record<CalendarBlockStatus, string>;

export const calendarBlockSourceLabels = {
  manual: "manual",
  task: "task",
  project: "project",
  goal: "goal",
  inbox: "inbox",
  routine: "routine",
  meal_planner: "meal planner",
  health: "health",
  review: "review",
  agent_suggestion: "agent suggestion",
} satisfies Record<CalendarBlockSource, string>;

export type CalendarSourceEntity = {
  type: CalendarSourceEntityType;
  label: string;
  href?: string;
};

export type CalendarDayViewModel = {
  id: string;
  weekday: string;
  dayNumber: string;
  fullLabel: string;
  isToday?: boolean;
};

export type CalendarFilterViewModel = {
  label: string;
  active?: boolean;
};

export type CalendarProjectRailItemViewModel = {
  label: string;
  count: number;
  accent: string;
};

export type CalendarWeekStatViewModel = {
  label: string;
  value: string;
  detail: string;
  accent: string;
};

export type CalendarBlockLayout = {
  lane: number;
  laneCount: number;
  top: number;
  height: number;
  left: number;
  width: number;
};

export type CalendarTimedBlockDensity = "regular" | "compact" | "micro";

export type CalendarBlockBase = {
  id: string;
  dayId: string;
  title: string;
  type: CalendarBlockType;
  status: CalendarBlockStatus;
  source: CalendarBlockSource;
  area: string;
  sourceEntity: CalendarSourceEntity;
  accent: string;
  meta?: string;
  linkedEntity?: string;
  plannedOutcome?: string;
  timeLabel?: string;
};

export type CalendarTimedBlockViewModel = CalendarBlockBase & {
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  compact: boolean;
  density: CalendarTimedBlockDensity;
  layout: CalendarBlockLayout;
};

export type CalendarAllDayBlockViewModel = CalendarBlockBase;

export type CalendarReviewMetricViewModel = {
  label: string;
  value: string;
  detail: string;
  accent: string;
};

export type CalendarContextListItemViewModel = {
  title: string;
  meta: string;
  accent: string;
};

export type CalendarSelectedTimeSlotViewModel = {
  label: string;
  dayLabel: string;
  date: string;
  startTime: string;
  endTime: string;
};

export type CalendarPlanningAssistantSuggestionViewModel = {
  title: string;
  meta: string;
  source: CalendarBlockSource;
  status: CalendarBlockStatus;
  accent: string;
};

export type CalendarRightPanelViewModel = {
  selectedDay: string;
  badge: string;
  metrics: CalendarReviewMetricViewModel[];
  openLoops: CalendarContextListItemViewModel[];
  unscheduledTasks: CalendarContextListItemViewModel[];
  reviewsOpen: CalendarContextListItemViewModel[];
  suggestedPlanningActions: CalendarContextListItemViewModel[];
  selectedTimeSlot: CalendarSelectedTimeSlotViewModel;
  planningAssistant: {
    title: "Planning Assistant";
    status: "suggestions only";
    suggestions: CalendarPlanningAssistantSuggestionViewModel[];
  };
  weeklyReview: {
    title: string;
    status: string;
    description: string;
    placeholder: string;
    actionLabel: string;
  };
};

export type CalendarPageContractViewModel = {
  pageType: "Temporal Projection / Planning Surface";
  primaryPurpose: string;
  writes: string;
  reads: string;
  canonicalSource: string;
  sensitiveData: string;
  primaryDecision: string;
  mainZone: string;
  emptyState: string;
  mobileOrder: string;
};

export type CalendarViewModel = {
  header: {
    eyebrow: "TEMPORAL VIEW";
    title: "Calendar";
    summary: string;
    dateRange: string;
    controls: {
      currentAction: "Today";
      views: CalendarFilterViewModel[];
    };
  };
  filters: CalendarFilterViewModel[];
  projectsThisWeek: CalendarProjectRailItemViewModel[];
  weekStats: {
    title: "Week View";
    summary: string;
    stats: CalendarWeekStatViewModel[];
  };
  days: CalendarDayViewModel[];
  hours: string[];
  allDayBlocks: CalendarAllDayBlockViewModel[];
  timedBlocks: CalendarTimedBlockViewModel[];
  selectedBlock: CalendarAllDayBlockViewModel | CalendarTimedBlockViewModel;
  rightPanel: CalendarRightPanelViewModel;
  currentTime: {
    label: "15:42";
    top: number;
  };
  pageContract: CalendarPageContractViewModel;
};
