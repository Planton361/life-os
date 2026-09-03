import type { ContentStateMeta } from "@/features/content-state";

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

export type CalendarView = "day" | "week" | "month" | "year";

export type CalendarProfileId = "demo" | "empty" | "manual";

export type CalendarScope =
  | "All"
  | "Events"
  | "Tasks"
  | "Focus"
  | "Routines"
  | "Projects"
  | "Meals"
  | "Health"
  | "Reviews"
  | "Deadlines";

export type CalendarCreateBlockType =
  | "event"
  | "task_block"
  | "focus_block"
  | "batch_block"
  | "routine"
  | "deadline"
  | "reminder"
  | "review"
  | "meal";

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
  date: string;
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
  date?: string;
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
  priority?: "P0" | "P1" | "P2" | "P3" | "none";
  project?: string;
  taskId?: string;
  goalId?: string;
  isFlexible?: boolean;
  isLocked?: boolean;
  isOverdue?: boolean;
  markerKind?:
    | "planned_task"
    | "task_deadline"
    | "project_deadline"
    | "goal_target";
  markerLabel?: string;
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
  href?: string;
};

export type CalendarSelectedTimeSlotViewModel = {
  label: string;
  dayId?: string;
  dayLabel: string;
  date: string;
  startTime: string;
  endTime: string;
};

export type SchedulableTaskStatus = "open" | "planned" | "in-progress" | "done";

export type PlannerQueueRankGroup =
  | "overdue"
  | "due_this_week"
  | "recurring_due"
  | "project_next_work"
  | "goal_context_work"
  | "backlog";

export type PlannerQueueGoalContext = {
  alignment: "direct" | "via_project" | "redundant" | "conflict" | "none";
  id: string;
  title: string;
};

export type PlannerQueueSkillContext = {
  id: string;
  title: string;
};

export type PlannerQueueItem = {
  accent?: string;
  area: string;
  createdAt?: string;
  dueDate?: string;
  durationMinutes: number;
  goal?: PlannerQueueGoalContext;
  id: string;
  isRecurringOccurrence: boolean;
  plannedDate?: string;
  title: string;
  priority: "P0" | "P1" | "P2" | "P3" | "none";
  project?: { id: string; title: string };
  rankingGroup: PlannerQueueRankGroup;
  rankingReason: string;
  scheduleSourceType?: "meal" | "review" | "running_plan_item" | "strength_plan";
  skills: readonly PlannerQueueSkillContext[];
};

export type SchedulableTaskViewModel = PlannerQueueItem;

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
  profileId: CalendarProfileId;
  contentStates: {
    page: ContentStateMeta;
    header: ContentStateMeta;
    scopeRow: ContentStateMeta;
    viewSwitcher: ContentStateMeta;
    weekOverview: ContentStateMeta;
    grid: ContentStateMeta;
    dayColumns: ContentStateMeta;
    timeBlocks: ContentStateMeta;
    rightPanel: ContentStateMeta;
    planningQueue: ContentStateMeta;
    legend: ContentStateMeta;
  };
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
  scheduledTasks: CalendarTimedBlockViewModel[];
  plannerQueueTasks: SchedulableTaskViewModel[];
  selectedBlock?: CalendarAllDayBlockViewModel | CalendarTimedBlockViewModel;
  schedulableTasks: SchedulableTaskViewModel[];
  rightPanel: CalendarRightPanelViewModel;
  currentTime: {
    label: "15:42";
    top: number;
  };
  pageContract: CalendarPageContractViewModel;
};
