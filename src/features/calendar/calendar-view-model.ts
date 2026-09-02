import {
  CALENDAR_DAY_END_MINUTES,
  CALENDAR_DAY_START_MINUTES,
  allDayBlocks,
  calendarDays,
  calendarFilters,
  calendarHours,
  calendarViewSwitches,
  projectsThisWeek,
  reviewMetrics,
  schedulableTasks,
  timedBlocks,
  weekStats,
} from "./calendar-mock-data";
import type {
  CalendarBlockLayout,
  CalendarTimedBlockDensity,
  CalendarTimedBlockViewModel,
  CalendarViewModel,
  CalendarDayViewModel,
} from "./calendar-types";
import { resolveContentStateMeta } from "@/features/content-state";

type RawTimedBlock = Omit<
  CalendarTimedBlockViewModel,
  "compact" | "density" | "durationMinutes" | "layout"
>;
export type CalendarRawTimedBlock = RawTimedBlock;

type WorkingLayoutBlock = {
  block: RawTimedBlock;
  lane: number;
};

const CALENDAR_PAGE_CONTENT_CAPACITY = {
  dayColumns: 7,
  grid: 16,
  header: 1,
  legend: 9,
  page: 16,
  planningQueue: 4,
  rightPanel: 8,
  scopeRow: 10,
  timeBlocks: 16,
  viewSwitcher: 4,
  weekOverview: 5,
} as const;

const CALENDAR_LEGEND_ITEMS = 9;
const DEFAULT_SCOPE_ROW_ITEM_COUNT = 10;
const DEFAULT_VIEW_SWITCHER_ITEM_COUNT = 4;

export function resolveCalendarContentStates({
  allDayBlockCount,
  daysWithContent,
  dayColumnItemCount,
  headerItemCount,
  planningQueueCount,
  rightPanelItemCount,
  scopeRowItemCount = DEFAULT_SCOPE_ROW_ITEM_COUNT,
  viewSwitcherItemCount = DEFAULT_VIEW_SWITCHER_ITEM_COUNT,
  timedBlockCount,
  legendItemCount,
  weekStatItemCount,
}: {
  allDayBlockCount: number;
  daysWithContent: number;
  dayColumnItemCount: number;
  headerItemCount: number;
  planningQueueCount: number;
  rightPanelItemCount: number;
  scopeRowItemCount?: number;
  viewSwitcherItemCount?: number;
  timedBlockCount: number;
  legendItemCount?: number;
  weekStatItemCount: number;
}): CalendarViewModel["contentStates"] {
  const hasHistoryContent =
    daysWithContent > 0 || allDayBlockCount > 0 || timedBlockCount > 0;

  const gridItemCount = timedBlockCount + allDayBlockCount;
  const pageItemCount =
    gridItemCount +
    rightPanelItemCount +
    planningQueueCount +
    headerItemCount;

  return {
    page: resolveContentStateMeta({
      capacity: CALENDAR_PAGE_CONTENT_CAPACITY.page,
      itemCount: pageItemCount,
    }),
    header: resolveContentStateMeta({
      capacity: CALENDAR_PAGE_CONTENT_CAPACITY.header,
      itemCount: headerItemCount,
      hasHistory: pageItemCount > 0,
    }),
    scopeRow: resolveContentStateMeta({
      capacity: CALENDAR_PAGE_CONTENT_CAPACITY.scopeRow,
      itemCount: scopeRowItemCount,
      hasHistory: hasHistoryContent,
    }),
    viewSwitcher: resolveContentStateMeta({
      capacity: CALENDAR_PAGE_CONTENT_CAPACITY.viewSwitcher,
      itemCount: viewSwitcherItemCount,
      hasHistory: hasHistoryContent,
    }),
    weekOverview: resolveContentStateMeta({
      capacity: CALENDAR_PAGE_CONTENT_CAPACITY.weekOverview,
      itemCount: Math.min(
        Math.max(0, weekStatItemCount),
        CALENDAR_PAGE_CONTENT_CAPACITY.weekOverview,
      ),
      hasHistory: gridItemCount > 0,
    }),
    grid: resolveContentStateMeta({
      capacity: CALENDAR_PAGE_CONTENT_CAPACITY.grid,
      itemCount: gridItemCount,
    }),
    dayColumns: resolveContentStateMeta({
      capacity: CALENDAR_PAGE_CONTENT_CAPACITY.dayColumns,
      itemCount: dayColumnItemCount,
      hasHistory: hasHistoryContent,
    }),
    timeBlocks: resolveContentStateMeta({
      capacity: CALENDAR_PAGE_CONTENT_CAPACITY.timeBlocks,
      itemCount: timedBlockCount,
      hasHistory: hasHistoryContent,
    }),
    rightPanel: resolveContentStateMeta({
      capacity: CALENDAR_PAGE_CONTENT_CAPACITY.rightPanel,
      itemCount: rightPanelItemCount,
    }),
    planningQueue: resolveContentStateMeta({
      capacity: CALENDAR_PAGE_CONTENT_CAPACITY.planningQueue,
      itemCount: planningQueueCount,
      hasHistory: rightPanelItemCount > 0,
    }),
    legend: resolveContentStateMeta({
      capacity: CALENDAR_PAGE_CONTENT_CAPACITY.legend,
      itemCount: legendItemCount ?? CALENDAR_LEGEND_ITEMS,
      hasHistory: hasHistoryContent,
    }),
  };
}

const COMPACT_DURATION_MINUTES = 72;
const MICRO_DURATION_MINUTES = 35;
const MICRO_VISUAL_DURATION_MINUTES = 76;
const COMPACT_VISUAL_DURATION_MINUTES = 100;
const LANE_GAP_PERCENT = 3;

function minutesToTopPercent(minutes: number) {
  const range = CALENDAR_DAY_END_MINUTES - CALENDAR_DAY_START_MINUTES;
  const offset = minutes - CALENDAR_DAY_START_MINUTES;

  return Math.max(0, Math.min(100, (offset / range) * 100));
}

function minutesToHeightPercent(startMinutes: number, endMinutes: number) {
  const range = CALENDAR_DAY_END_MINUTES - CALENDAR_DAY_START_MINUTES;
  const duration = Math.max(0, endMinutes - startMinutes);

  return Math.max(4.6, (duration / range) * 100);
}

function visualDurationMinutes(block: RawTimedBlock) {
  const durationMinutes = block.endMinutes - block.startMinutes;

  if (durationMinutes <= MICRO_DURATION_MINUTES) {
    return MICRO_VISUAL_DURATION_MINUTES;
  }

  if (durationMinutes <= COMPACT_DURATION_MINUTES) {
    return COMPACT_VISUAL_DURATION_MINUTES;
  }

  return durationMinutes;
}

function laneLayout(lane: number, laneCount: number) {
  if (laneCount <= 1) {
    return {
      left: 0,
      width: 100,
    };
  }

  const width = (100 - LANE_GAP_PERCENT * (laneCount - 1)) / laneCount;

  return {
    left: lane * (width + LANE_GAP_PERCENT),
    width,
  };
}

export function getEventLayout(
  eventsForDay: RawTimedBlock[],
): Map<string, CalendarBlockLayout> {
  const sortedEvents = [...eventsForDay].sort(
    (a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes,
  );
  const layouts = new Map<string, CalendarBlockLayout>();
  let cluster: WorkingLayoutBlock[] = [];
  let laneVisualEnds: number[] = [];
  let clusterVisualEnd = -Infinity;

  function commitCluster() {
    if (cluster.length === 0) {
      return;
    }

    const laneCount = Math.max(...cluster.map((item) => item.lane)) + 1;

    cluster.forEach(({ block, lane }) => {
      const horizontal = laneLayout(lane, laneCount);
      const visualEndMinutes =
        block.startMinutes + visualDurationMinutes(block);
      const height = minutesToHeightPercent(
        block.startMinutes,
        visualEndMinutes,
      );
      const top = Math.max(
        0,
        Math.min(minutesToTopPercent(block.startMinutes), 100 - height),
      );

      layouts.set(block.id, {
        lane,
        laneCount,
        top,
        height,
        ...horizontal,
      });
    });

    cluster = [];
    laneVisualEnds = [];
    clusterVisualEnd = -Infinity;
  }

  sortedEvents.forEach((block) => {
    if (block.startMinutes >= clusterVisualEnd) {
      commitCluster();
    }

    const visualEnd = block.startMinutes + visualDurationMinutes(block);
    const availableLane = laneVisualEnds.findIndex(
      (laneEnd) => laneEnd <= block.startMinutes,
    );
    const lane = availableLane >= 0 ? availableLane : laneVisualEnds.length;

    laneVisualEnds[lane] = visualEnd;
    clusterVisualEnd = Math.max(clusterVisualEnd, visualEnd);
    cluster.push({ block, lane });
  });

  commitCluster();

  return layouts;
}

export function buildCalendarTimedBlocks(
  blocks: RawTimedBlock[] = timedBlocks,
  days: readonly Pick<CalendarDayViewModel, "id">[] = calendarDays,
): CalendarTimedBlockViewModel[] {
  const layoutsById = new Map<string, CalendarBlockLayout>();

  days.forEach((day) => {
    getEventLayout(blocks.filter((block) => block.dayId === day.id)).forEach(
      (layout, id) => {
        layoutsById.set(id, layout);
      },
    );
  });

  return blocks.map((block) => {
    const durationMinutes = block.endMinutes - block.startMinutes;
    const density: CalendarTimedBlockDensity =
      durationMinutes <= MICRO_DURATION_MINUTES
        ? "micro"
        : durationMinutes <= COMPACT_DURATION_MINUTES
          ? "compact"
          : "regular";

    return {
      ...block,
      durationMinutes,
      compact: density !== "regular",
      density,
      layout:
        layoutsById.get(block.id) ??
        ({
          lane: 0,
          laneCount: 1,
          top: minutesToTopPercent(block.startMinutes),
          height: minutesToHeightPercent(block.startMinutes, block.endMinutes),
          left: 0,
          width: 100,
        } satisfies CalendarBlockLayout),
    };
  });
}

export function getCalendarViewModel(): CalendarViewModel {
  const timedBlockViewModels = buildCalendarTimedBlocks();
  const allDayBlockCount = allDayBlocks.length;
  const timedBlockCount = timedBlockViewModels.length;
  const headerItemCount = timedBlockCount > 0 || allDayBlockCount > 0 ? 1 : 0;
  const scopeRowItemCount = calendarFilters.length + projectsThisWeek.length;
  const viewSwitcherItemCount = calendarViewSwitches.length;
  const daysWithContent = calendarDays.filter(
    (day) =>
      timedBlockViewModels.some((block) => block.dayId === day.id) ||
      allDayBlocks.some((block) => block.dayId === day.id),
  ).length;
  const weekStatItemCount = weekStats.length;
  const selectedBlock =
    timedBlockViewModels.find(
      (block) => block.id === "task-block-literature-structure",
    ) ??
    allDayBlocks[0];
  const rightPanel = {
    selectedDay: "Thu 12 June",
    badge: "Week active",
    metrics: reviewMetrics,
    openLoops: [
      {
        title: "Routing decision for Life OS App",
        meta: "Project - needs decision",
        accent: "var(--accent-orange)",
      },
      {
        title: "Literature source deadline",
        meta: "Education - deadline",
        accent: "var(--accent-red)",
      },
      {
        title: "Daily review still open",
        meta: "Review - tonight",
        accent: "var(--accent-cyan)",
      },
    ],
    unscheduledTasks: [
      {
        title: "Run lint and TypeScript checks",
        meta: "P1 task - no time block yet",
        accent: "var(--accent-blue)",
      },
      {
        title: "Prepare static review route copy",
        meta: "P2 task - week candidate",
        accent: "var(--accent-purple)",
      },
    ],
    reviewsOpen: [
      {
        title: "Daily Review",
        meta: "draft - tonight",
        accent: "var(--accent-cyan)",
      },
      {
        title: "Weekly Review",
        meta: "planned - Saturday",
        accent: "var(--accent-cyan)",
      },
    ],
    suggestedPlanningActions: [
      {
        title: "Place one P1 task block",
        meta: "Suggested slot - Thu 15:30",
        accent: "var(--accent-blue)",
      },
      {
        title: "Batch admin before work closes",
        meta: "Batch candidate - Tue 14:00",
        accent: "var(--accent-green)",
      },
    ],
    selectedTimeSlot: {
      label: "Selected time slot",
      dayLabel: "Thu 12 June",
      date: "2026-06-12",
      startTime: "15:30",
      endTime: "17:00",
    },
    planningAssistant: {
      title: "Planning Assistant",
      status: "suggestions only",
      suggestions: [
        {
          title: "3 unscheduled P1 tasks",
          meta: "Review before creating calendar blocks",
          source: "agent_suggestion",
          status: "draft",
          accent: "var(--accent-blue)",
        },
        {
          title: "Suggested focus slot: Thu 15:30-17:00",
          meta: "Draft recommendation from current workload",
          source: "agent_suggestion",
          status: "draft",
          accent: "var(--accent-cyan)",
        },
        {
          title: "Weekly Review still open",
          meta: "Review source remains manual",
          source: "review",
          status: "planned",
          accent: "var(--accent-orange)",
        },
      ],
    },
    weeklyReview: {
      title: "Weekly Review",
      status: "draft open",
      description:
        "No review written yet. Capture what changed, what moved and what carries forward.",
      placeholder: "Write weekly review note...",
      actionLabel: "open full review",
    },
  } satisfies CalendarViewModel["rightPanel"];
  const planningQueueCount =
    rightPanel.unscheduledTasks.length +
    rightPanel.openLoops.length +
    rightPanel.reviewsOpen.length;
  const rightPanelItemCount =
    rightPanel.metrics.length +
    rightPanel.openLoops.length +
    rightPanel.unscheduledTasks.length +
    rightPanel.reviewsOpen.length +
    rightPanel.suggestedPlanningActions.length;

  return {
    contentStates: resolveCalendarContentStates({
      allDayBlockCount,
      daysWithContent,
      headerItemCount,
      scopeRowItemCount,
      weekStatItemCount,
      planningQueueCount,
      rightPanelItemCount,
      timedBlockCount,
      dayColumnItemCount: daysWithContent,
      viewSwitcherItemCount,
      legendItemCount: CALENDAR_LEGEND_ITEMS,
    }),
    profileId: "demo",
    header: {
      eyebrow: "TEMPORAL VIEW",
      title: "Calendar",
      summary:
        "Plan task time blocks and inspect prepared calendar context across events, deadlines and reviews.",
      dateRange: "09-15 June 2026",
      controls: {
        currentAction: "Today",
        views: calendarViewSwitches,
      },
    },
    filters: calendarFilters,
    projectsThisWeek,
    weekStats: {
      title: "Week View",
      summary:
        "Week view combines temporal blocks with weekly workload, project movement and review readiness.",
      stats: weekStats,
    },
    days: calendarDays,
    hours: calendarHours,
    allDayBlocks,
    timedBlocks: timedBlockViewModels,
    scheduledTasks: timedBlockViewModels.filter((block) => block.source === "task"),
    plannerQueueTasks: schedulableTasks,
    selectedBlock,
    schedulableTasks,
    currentTime: {
      label: "15:42",
      top: minutesToTopPercent(15 * 60 + 42),
    },
    rightPanel,
    pageContract: {
      pageType: "Temporal Projection / Planning Surface",
      primaryPurpose:
        "Inspect task time blocks, prepared free-event context, deadlines and review readiness.",
      writes:
        "Manual task scheduling writes task time fields through existing Task actions. Calendar Create only prepares a local UI preview; free calendar event persistence follows later.",
      reads:
        "Tasks, projects, reviews, meals, workouts, meetings and free calendar events.",
      canonicalSource:
        "Calendar projects source entities, writes only Manual task time fields through Task actions, and does not own free calendar events yet.",
      sensitiveData:
        "Work and health-adjacent time blocks are visible but mocked without private content.",
      primaryDecision:
        "What needs time, creation, movement, review or carry-forward attention this week?",
      mainZone: "Outlook-style week calendar surface.",
      emptyState:
        "When empty, explain that dated source entities and free events will appear here.",
      mobileOrder:
        "Header and create, filters, selected day summary, week blocks, selected block details.",
    },
  };
}
