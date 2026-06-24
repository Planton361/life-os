import { resolveContentStateMeta } from "@/features/content-state";
import { habitsAnalyticsMockData } from "./habits-mock-data";
import type {
  HabitDayIntensity,
  HabitDaySignal,
  HabitSummaryMetricViewModel,
  HabitsAnalyticsPageViewModel,
} from "./habits-types";

function intensityLabel(intensity: HabitDayIntensity) {
  if (intensity === 4) {
    return "strong";
  }

  if (intensity === 3) {
    return "steady";
  }

  if (intensity === 2) {
    return "partial";
  }

  if (intensity === 1) {
    return "light";
  }

  return "missed signal";
}

function getJuneDate(dayOfMonth: number) {
  return `2026-06-${String(dayOfMonth).padStart(2, "0")}`;
}

function createHeatmapSignals(
  intensities: readonly HabitDayIntensity[],
  label: string,
): readonly HabitDaySignal[] {
  return intensities.map((intensity, index) => {
    const dayOfMonth = index + 1;

    return {
      date: getJuneDate(dayOfMonth),
      dayOfMonth,
      intensity,
      label: `${label}, June ${dayOfMonth}: ${intensityLabel(intensity)}`,
    };
  });
}

function createMetric(
  label: string,
  value: string,
  detail: string,
  accent: HabitSummaryMetricViewModel["accent"],
): HabitSummaryMetricViewModel {
  return {
    label,
    value,
    detail,
    accent,
  };
}

export function getHabitsAnalyticsViewModel(): HabitsAnalyticsPageViewModel {
  const data = habitsAnalyticsMockData;

  return {
    profileId: "demo",
    contentStates: {
      detailFocus: resolveContentStateMeta({ capacity: 1, itemCount: 1 }),
      header: resolveContentStateMeta({ capacity: 1, itemCount: 1 }),
      heatmap: resolveContentStateMeta({
        capacity: data.heatmapGroups.length,
        itemCount: data.heatmapGroups.length,
      }),
      page: resolveContentStateMeta({ capacity: 7, itemCount: 7 }),
      patternTable: resolveContentStateMeta({ capacity: 6, itemCount: 6 }),
      repairLoops: resolveContentStateMeta({ capacity: 3, itemCount: 3 }),
      summary: resolveContentStateMeta({ capacity: 6, itemCount: 6 }),
      todaySchedule: resolveContentStateMeta({ capacity: 6, itemCount: 6 }),
      weeklyRhythmInsights: resolveContentStateMeta({
        capacity: 4,
        itemCount: 4,
      }),
    },
    header: {
      breadcrumb: ["Life OS", "Health & Fitness", "Habits"],
      title: "Habits",
      subtitle:
        "Rhythm, consistency and repair patterns — without shame mechanics.",
      meta: "June 2026 · analytics detail",
      pills: [
        createMetric(
          "Mode",
          "Analytics Detail",
          "compact V1",
          "var(--accent-red)",
        ),
        createMetric(
          "Boundary",
          "No shame mechanics",
          "signals only",
          "var(--accent-green)",
        ),
        createMetric(
          "Rule",
          "Repair first",
          "smallest useful next step",
          "var(--accent-cyan)",
        ),
        createMetric(
          "Month",
          "June 2026",
          "analytics detail",
          "var(--accent-orange)",
        ),
      ],
      todaySignal: {
        label: "TODAY HABIT SIGNAL",
        value: "Evening fragile",
        detail: "Next useful repair: low-friction shutdown at 21:30",
        accent: "var(--accent-red)",
        progress: 58,
        progressLabel: "58% evening signal",
      },
    },
    pageContract: {
      pageType: "Habits - V1 · Analytics Detail",
      primaryPurpose:
        "Match the Figma Habits V1 analytics detail layout for rhythm, consistency and repair patterns.",
      writes: "none in Phase 2",
      reads:
        "Mock views for future habits and habit_logs, projected as analytics.",
      canonicalSource:
        "Future canonical habits and habit_logs; this page only projects typed mock data.",
      sensitiveData: "health_sensitive",
      primaryDecision: "Choose the next smallest repair in today's habit flow.",
      mainZone:
        "Compact monthly consistency heatmap, pattern table and right-column daily schedule.",
      emptyState:
        "When no habit signals exist, explain that analytics appears after routine logs are available.",
      mobileOrder:
        "Header, summary, Today Habit Schedule, Habit Detail Focus, heatmap, pattern table, repair loops, weekly insights, boundary card, interpretation footer.",
    },
    summary: [
      createMetric(
        "Consistency",
        "78%",
        "+6 pp vs last week",
        "var(--accent-cyan)",
      ),
      createMetric(
        "Completion",
        "54 / 69",
        "planned habit checks",
        "var(--accent-green)",
      ),
      createMetric(
        "Strongest rhythm",
        "Morning",
        "86% completed",
        "var(--accent-green)",
      ),
      createMetric(
        "Weakest rhythm",
        "Evening",
        "58% completed",
        "var(--accent-red)",
      ),
      createMetric(
        "Bad habit counter",
        "4 triggers",
        "2 repaired same day",
        "var(--accent-orange)",
      ),
      createMetric(
        "Next repair",
        "Evening routine",
        "21:30 low-friction",
        "var(--accent-purple)",
      ),
    ],
    heatmap: {
      title: "Monthly Consistency Heatmap · June",
      statement:
        "30 days × 4 habit groups. Color intensity is always labelled and never the only signal.",
      rows: data.heatmapGroups.map((row) => ({
        id: row.id,
        label: row.label,
        completionRate: row.completionRate,
        accent: row.accent,
        signals: createHeatmapSignals(row.intensities, row.label),
      })),
      legend: {
        low: "less",
        high: "more",
      },
      patternRead: {
        title: "Pattern read",
        copy: "Morning is stable enough to anchor harder tasks. Evening is the smallest repair target; treat misses as signal, not failure.",
        metrics: [
          {
            label: "Morning",
            value: "86%",
            accent: "var(--accent-green)",
          },
          {
            label: "Evening",
            value: "58%",
            accent: "var(--accent-red)",
          },
        ],
      },
    },
    patternTable: {
      title: "Habit Pattern Table · not a spreadsheet wall",
      statement:
        "Compact list-table hybrid: each row has a decision signal and one next action.",
      rows: [
        {
          habit: "Morning routine",
          group: "Morning",
          target: "1 / day",
          status: "Stable",
          nextAction: "Keep same trigger",
          sevenDayDots: [true, true, true, true, true, false, true],
          thirtyDayProgress: 86,
          accent: "var(--accent-green)",
        },
        {
          habit: "Water target",
          group: "Health",
          target: "2200 ml",
          status: "Good",
          nextAction: "Refill bottle at desk",
          sevenDayDots: [true, true, false, true, true, true, true],
          thirtyDayProgress: 82,
          accent: "var(--accent-cyan)",
        },
        {
          habit: "Study block",
          group: "Learning",
          target: "90 min",
          status: "Useful",
          nextAction: "Attach to 10:00 block",
          sevenDayDots: [true, false, true, true, true, true, false],
          thirtyDayProgress: 79,
          accent: "var(--accent-blue)",
        },
        {
          habit: "Workout mobility",
          group: "Health",
          target: "10 min",
          status: "Uneven",
          nextAction: "Use post-run slot",
          sevenDayDots: [false, true, false, true, true, false, true],
          thirtyDayProgress: 67,
          accent: "var(--accent-orange)",
        },
        {
          habit: "Journal",
          group: "Review",
          target: "5 min",
          status: "Fragile",
          nextAction: "Short prompt only",
          sevenDayDots: [true, false, true, false, false, true, false],
          thirtyDayProgress: 61,
          accent: "var(--accent-purple)",
        },
        {
          habit: "Evening shutdown",
          group: "Evening",
          target: "21:30",
          status: "Repair",
          nextAction: "Lower friction tonight",
          sevenDayDots: [false, true, false, false, true, false, false],
          thirtyDayProgress: 58,
          accent: "var(--accent-red)",
        },
      ],
    },
    repairLoops: {
      title: "Repair Loops",
      items: [
        {
          title: "Phone refresh loop",
          reset: "10-min walk",
          triggers: "3 triggers",
          repaired: "2 repaired",
          accent: "var(--accent-cyan)",
        },
        {
          title: "Late snack loop",
          reset: "tea + brush teeth",
          triggers: "1 trigger",
          repaired: "1 repaired",
          accent: "var(--accent-green)",
        },
        {
          title: "Desk chaos loop",
          reset: "5-min clean",
          triggers: "2 triggers",
          repaired: "1 repaired",
          accent: "var(--accent-orange)",
        },
      ],
    },
    interpretation: {
      title: "Interpretation, not judgement",
      copy: "Missed checks mark pattern data, not failure. The page suggests the next smallest repair.",
      pill: "repair beats perfection",
    },
    todaySchedule: {
      title: "Today Habit Schedule",
      subtitle: "Habit actions in today's flow, not another task wall.",
      items: [
        {
          time: "07:00",
          title: "Morning routine",
          status: "Done",
          detail: "Keep trigger stable",
          accent: "var(--accent-green)",
        },
        {
          time: "08:00",
          title: "Water baseline",
          status: "Open",
          detail: "Fill bottle before focus",
          accent: "var(--accent-cyan)",
        },
        {
          time: "10:00",
          title: "Study block",
          status: "Done",
          detail: "Keep paired with desk start",
          accent: "var(--accent-blue)",
        },
        {
          time: "13:00",
          title: "Mobility reset",
          status: "Skipped",
          detail: "Treat as data, not failure",
          accent: "var(--accent-orange)",
        },
        {
          time: "17:30",
          title: "Workout mobility",
          status: "Planned",
          detail: "Use post-run slot",
          accent: "var(--accent-orange)",
        },
        {
          time: "21:30",
          title: "Evening shutdown",
          status: "Next",
          detail: "Low-friction repair",
          accent: "var(--accent-red)",
        },
      ],
    },
    detailFocus: {
      title: "Habit Detail Focus",
      subtitle: "Selected habit: Evening shutdown",
      habit: "Evening shutdown",
      target: "Target: 21:30 · phone away · desk reset · tomorrow cue",
      frictionNote:
        "Friction note: late screen loop after open-ended work blocks.",
      sevenDayStatus: "7d status",
      thirtyDayTrend: "30d trend",
      actionLabel: "Start next repair",
      progress: 58,
      accent: "var(--accent-red)",
    },
    weeklyRhythmInsights: {
      title: "Weekly Rhythm Insights",
      rows: [
        {
          title: "Morning stable",
          detail: "Morning completion is high enough to anchor planned work.",
          status: "stable",
          accent: "var(--accent-green)",
        },
        {
          title: "Evening fragile",
          detail: "Late tasks increase missed shutdown checks.",
          status: "repair",
          accent: "var(--accent-red)",
        },
        {
          title: "Phone loop improved",
          detail: "Two of three refresh triggers were repaired same day.",
          status: "better",
          accent: "var(--accent-cyan)",
        },
        {
          title: "Study block correlation",
          detail: "Study completion aligned with better self-reported mood.",
          status: "context",
          accent: "var(--accent-blue)",
        },
      ],
    },
    boundary: {
      title: "No shame / no diagnosis / no automation",
      bullets: [
        "Missed habit checks are pattern data, not failure language.",
        "Mental or health signals are self-check context, never diagnosis.",
        "Automation stays manual/reviewed until the daily flow is stable.",
      ],
    },
    isEmpty: data.heatmapGroups.length === 0,
  };
}
