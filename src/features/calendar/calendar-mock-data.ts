import type {
  CalendarAllDayBlockViewModel,
  CalendarDayViewModel,
  CalendarFilterViewModel,
  CalendarProjectRailItemViewModel,
  CalendarReviewMetricViewModel,
  CalendarTimedBlockViewModel,
  CalendarWeekStatViewModel,
} from "./calendar-types";

export const CALENDAR_DAY_START_MINUTES = 6 * 60;
export const CALENDAR_DAY_END_MINUTES = 22 * 60 + 30;

export const calendarDays = [
  {
    id: "mon-09",
    weekday: "Mon",
    dayNumber: "09",
    fullLabel: "Monday 09 June",
  },
  {
    id: "tue-10",
    weekday: "Tue",
    dayNumber: "10",
    fullLabel: "Tuesday 10 June",
  },
  {
    id: "wed-11",
    weekday: "Wed",
    dayNumber: "11",
    fullLabel: "Wednesday 11 June",
  },
  {
    id: "thu-12",
    weekday: "Thu",
    dayNumber: "12",
    fullLabel: "Thursday 12 June",
    isToday: true,
  },
  {
    id: "fri-13",
    weekday: "Fri",
    dayNumber: "13",
    fullLabel: "Friday 13 June",
  },
  {
    id: "sat-14",
    weekday: "Sat",
    dayNumber: "14",
    fullLabel: "Saturday 14 June",
  },
  {
    id: "sun-15",
    weekday: "Sun",
    dayNumber: "15",
    fullLabel: "Sunday 15 June",
  },
] satisfies CalendarDayViewModel[];

export const calendarHours = [
  "06:00",
  "08:00",
  "10:00",
  "12:00",
  "14:00",
  "16:00",
  "18:00",
  "20:00",
  "22:00",
];

export const calendarFilters = [
  { label: "All", active: true },
  { label: "Events" },
  { label: "Tasks" },
  { label: "Projects" },
  { label: "Meals" },
  { label: "Health" },
  { label: "Reviews" },
  { label: "Deadlines" },
] satisfies CalendarFilterViewModel[];

export const calendarViewSwitches = [
  { label: "Day" },
  { label: "Week", active: true },
  { label: "Month" },
  { label: "Year" },
] satisfies CalendarFilterViewModel[];

export const projectsThisWeek = [
  {
    label: "Masterarbeit",
    count: 6,
    accent: "var(--accent-blue)",
  },
  {
    label: "Life OS",
    count: 9,
    accent: "var(--accent-cyan)",
  },
  {
    label: "Java",
    count: 4,
    accent: "var(--accent-purple)",
  },
  {
    label: "FI",
    count: 3,
    accent: "var(--accent-green)",
  },
] satisfies CalendarProjectRailItemViewModel[];

export const weekStats = [
  {
    label: "Tasks",
    value: "34",
    detail: "this week",
    accent: "var(--accent-blue)",
  },
  {
    label: "Projects",
    value: "4",
    detail: "touched",
    accent: "var(--accent-cyan)",
  },
  {
    label: "Focus",
    value: "7",
    detail: "blocks",
    accent: "var(--accent-purple)",
  },
  {
    label: "Deadlines",
    value: "3",
    detail: "visible",
    accent: "var(--accent-red)",
  },
  {
    label: "Reviews",
    value: "2",
    detail: "open",
    accent: "var(--accent-orange)",
  },
] satisfies CalendarWeekStatViewModel[];

export const allDayBlocks = [
  {
    id: "literature-source-deadline",
    dayId: "wed-11",
    title: "Literature source deadline",
    kind: "Deadline",
    status: "deadline",
    sourceEntity: {
      type: "task",
      label: "Task / Masterarbeit",
    },
    accent: "var(--accent-red)",
  },
  {
    id: "life-os-routing-milestone",
    dayId: "thu-12",
    title: "Life OS App routing milestone",
    kind: "Project Milestone",
    status: "needs decision",
    sourceEntity: {
      type: "project",
      label: "Project / Life OS App",
    },
    accent: "var(--accent-orange)",
  },
  {
    id: "weekly-review-prep",
    dayId: "sat-14",
    title: "Weekly review prep",
    kind: "Review",
    status: "review open",
    sourceEntity: {
      type: "review",
      label: "Review / Weekly",
    },
    accent: "var(--accent-cyan)",
  },
] satisfies CalendarAllDayBlockViewModel[];

export const timedBlocks = [
  {
    id: "deep-work-masterarbeit",
    dayId: "mon-09",
    title: "Deep Work: Masterarbeit",
    kind: "Focus",
    status: "planned",
    sourceEntity: {
      type: "project",
      label: "Project / Masterarbeit",
    },
    accent: "var(--accent-blue)",
    meta: "Literature and thesis structure",
    startTime: "08:00",
    endTime: "10:00",
    startMinutes: 8 * 60,
    endMinutes: 10 * 60,
  },
  {
    id: "team-standup",
    dayId: "tue-10",
    title: "Team Standup",
    kind: "Meeting",
    status: "done",
    sourceEntity: {
      type: "meeting",
      label: "Work",
    },
    accent: "var(--accent-green)",
    meta: "Remote sync",
    startTime: "10:15",
    endTime: "10:35",
    startMinutes: 10 * 60 + 15,
    endMinutes: 10 * 60 + 35,
  },
  {
    id: "work-meeting",
    dayId: "tue-10",
    title: "Work meeting",
    kind: "Meeting",
    status: "moved",
    sourceEntity: {
      type: "meeting",
      label: "Work",
    },
    accent: "var(--accent-green)",
    meta: "Follow-up moved",
    startTime: "14:00",
    endTime: "15:00",
    startMinutes: 14 * 60,
    endMinutes: 15 * 60,
  },
  {
    id: "lunch-walk",
    dayId: "wed-11",
    title: "Lunch & Walk",
    kind: "Health",
    status: "planned",
    sourceEntity: {
      type: "free_event",
      label: "Health",
    },
    accent: "var(--accent-red)",
    meta: "Recovery window",
    startTime: "12:00",
    endTime: "13:00",
    startMinutes: 12 * 60,
    endMinutes: 13 * 60,
  },
  {
    id: "skill-practice-figma",
    dayId: "thu-12",
    title: "Skill Practice: Figma",
    kind: "Project",
    status: "active",
    sourceEntity: {
      type: "project",
      label: "Project / Life OS App",
    },
    accent: "var(--accent-cyan)",
    meta: "Calendar V1 polish",
    startTime: "15:30",
    endTime: "16:30",
    startMinutes: 15 * 60 + 30,
    endMinutes: 16 * 60 + 30,
  },
  {
    id: "dinner-protein-bowl",
    dayId: "thu-12",
    title: "Dinner: Protein Bowl",
    kind: "Meal",
    status: "planned",
    sourceEntity: {
      type: "meal",
      label: "Meal / Nutrition",
    },
    accent: "var(--accent-yellow)",
    meta: "Protein target",
    startTime: "19:00",
    endTime: "19:30",
    startMinutes: 19 * 60,
    endMinutes: 19 * 60 + 30,
  },
  {
    id: "journal-plan-tomorrow",
    dayId: "thu-12",
    title: "Journal & Plan Tomorrow",
    kind: "Review",
    status: "review open",
    sourceEntity: {
      type: "review",
      label: "Review / Daily",
    },
    accent: "var(--accent-cyan)",
    meta: "Open loops",
    startTime: "21:15",
    endTime: "21:45",
    startMinutes: 21 * 60 + 15,
    endMinutes: 21 * 60 + 45,
  },
  {
    id: "daily-review",
    dayId: "thu-12",
    title: "Daily Review",
    kind: "Review",
    status: "review open",
    sourceEntity: {
      type: "review",
      label: "Review / Daily",
    },
    accent: "var(--accent-cyan)",
    meta: "Close day",
    startTime: "21:45",
    endTime: "22:05",
    startMinutes: 21 * 60 + 45,
    endMinutes: 22 * 60 + 5,
  },
  {
    id: "workout-run",
    dayId: "fri-13",
    title: "Workout / Run",
    kind: "Health",
    status: "planned",
    sourceEntity: {
      type: "workout",
      label: "Workout",
    },
    accent: "var(--accent-red)",
    meta: "Base run",
    startTime: "17:30",
    endTime: "18:30",
    startMinutes: 17 * 60 + 30,
    endMinutes: 18 * 60 + 30,
  },
  {
    id: "hyperskill-lesson",
    dayId: "sat-14",
    title: "Hyperskill lesson block",
    kind: "Task",
    status: "planned",
    sourceEntity: {
      type: "task",
      label: "Task / Education",
    },
    accent: "var(--accent-blue)",
    meta: "Java path",
    startTime: "09:30",
    endTime: "10:30",
    startMinutes: 9 * 60 + 30,
    endMinutes: 10 * 60 + 30,
  },
  {
    id: "free-time",
    dayId: "sun-15",
    title: "Free Time",
    kind: "Free",
    status: "planned",
    sourceEntity: {
      type: "free_event",
      label: "Free Calendar Event",
    },
    accent: "var(--text-faint)",
    meta: "Protected open space",
    startTime: "15:00",
    endTime: "15:30",
    startMinutes: 15 * 60,
    endMinutes: 15 * 60 + 30,
  },
] satisfies Omit<
  CalendarTimedBlockViewModel,
  "compact" | "density" | "durationMinutes" | "layout"
>[];

export const reviewMetrics = [
  {
    label: "Daily Review",
    value: "open",
    detail: "ready tonight",
    accent: "var(--accent-cyan)",
  },
  {
    label: "Weekly Review",
    value: "draft open",
    detail: "write below",
    accent: "var(--text-muted)",
  },
  {
    label: "Open loops",
    value: "5",
    detail: "needs closure",
    accent: "var(--accent-red)",
  },
  {
    label: "Recent wins",
    value: "3",
    detail: "captured today",
    accent: "var(--accent-green)",
  },
  {
    label: "Carry forward",
    value: "2",
    detail: "tomorrow candidates",
    accent: "var(--accent-orange)",
  },
] satisfies CalendarReviewMetricViewModel[];
