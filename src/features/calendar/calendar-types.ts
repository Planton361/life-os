export type CalendarSourceEntityType =
  | "project"
  | "task"
  | "review"
  | "meal"
  | "workout"
  | "meeting"
  | "free_event";

export type CalendarBlockStatus =
  | "planned"
  | "active"
  | "done"
  | "moved"
  | "needs decision"
  | "review open"
  | "deadline";

export type CalendarBlockKind =
  | "Focus"
  | "Meeting"
  | "Health"
  | "Project"
  | "Meal"
  | "Review"
  | "Task"
  | "Free"
  | "Deadline"
  | "Project Milestone";

export type CalendarSourceEntity = {
  type: CalendarSourceEntityType;
  label: string;
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
  kind: CalendarBlockKind;
  status: CalendarBlockStatus;
  sourceEntity: CalendarSourceEntity;
  accent: string;
  meta?: string;
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

export type CalendarRightPanelViewModel = {
  selectedDay: string;
  badge: string;
  metrics: CalendarReviewMetricViewModel[];
  openLoops: CalendarContextListItemViewModel[];
  recentWins: CalendarContextListItemViewModel[];
  carryForward: CalendarContextListItemViewModel[];
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
