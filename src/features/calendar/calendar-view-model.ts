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
  timedBlocks,
  weekStats,
} from "./calendar-mock-data";
import type {
  CalendarBlockLayout,
  CalendarTimedBlockDensity,
  CalendarTimedBlockViewModel,
  CalendarViewModel,
} from "./calendar-types";

type RawTimedBlock = Omit<
  CalendarTimedBlockViewModel,
  "compact" | "density" | "durationMinutes" | "layout"
>;

type WorkingLayoutBlock = {
  block: RawTimedBlock;
  lane: number;
};

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

function buildTimedBlocks(): CalendarTimedBlockViewModel[] {
  const layoutsById = new Map<string, CalendarBlockLayout>();

  calendarDays.forEach((day) => {
    getEventLayout(timedBlocks.filter((block) => block.dayId === day.id)).forEach(
      (layout, id) => {
        layoutsById.set(id, layout);
      },
    );
  });

  return timedBlocks.map((block) => {
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
  const selectedBlock =
    allDayBlocks.find((block) => block.id === "life-os-routing-milestone") ??
    allDayBlocks[0];

  return {
    header: {
      eyebrow: "TEMPORAL VIEW",
      title: "Calendar",
      summary: "Plan and inspect time across events, tasks, deadlines and reviews.",
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
    timedBlocks: buildTimedBlocks(),
    selectedBlock,
    currentTime: {
      label: "15:42",
      top: minutesToTopPercent(15 * 60 + 42),
    },
    rightPanel: {
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
      recentWins: [
        {
          title: "Figma practice block placed",
          meta: "Skill - active",
          accent: "var(--accent-cyan)",
        },
        {
          title: "Standup completed",
          meta: "Work - done",
          accent: "var(--accent-green)",
        },
      ],
      carryForward: [
        {
          title: "Finalize calendar route decision",
          meta: "Project - tomorrow candidate",
          accent: "var(--accent-orange)",
        },
        {
          title: "Prepare weekly review",
          meta: "Review - open",
          accent: "var(--accent-cyan)",
        },
      ],
      weeklyReview: {
        title: "Weekly Review",
        status: "draft open",
        description:
          "No review written yet. Capture what changed, what moved and what carries forward.",
        placeholder: "Write weekly review note...",
        actionLabel: "open full review",
      },
    },
    pageContract: {
      pageType: "Temporal Projection / Planning Surface",
      primaryPurpose:
        "Inspect the week across dated work, free events, deadlines and review readiness.",
      writes: "V1 writes nothing. Later only free calendar events and time blocks are calendar-owned.",
      reads:
        "Tasks, projects, reviews, meals, workouts, meetings and free calendar events.",
      canonicalSource:
        "Calendar projects source entities and does not duplicate task, project, meal, workout or review records.",
      sensitiveData:
        "Work and health-adjacent time blocks are visible but mocked without private content.",
      primaryDecision:
        "What needs time, movement, review or carry-forward attention this week?",
      mainZone: "Outlook-style week calendar surface.",
      emptyState:
        "When empty, explain that dated source entities and free events will appear here.",
      mobileOrder:
        "Header, filters, stats, calendar surface with horizontal scroll, review context panel.",
    },
  };
}
