import { resolveContentStateMeta } from "@/features/content-state";
import type { HealthOverviewViewModel } from "./types";

const moodWeek = {
  calm: [true, true, false, true, false, false, false],
  focused: [false, true, true, false, false, false, false],
  tense: [false, false, true, false, false, false, false],
  low: [false, false, false, false, false, false, false],
  social: [true, false, false, false, true, false, false],
  tired: [false, true, false, false, false, true, false],
} as const;

const habitHeatmap = {
  morning: [
    2, 2, 1, 3, 2, 0, 1, 3, 2, 2, 1, 2, 3, 0, 1, 2, 2, 3, 1, 2, 2, 1, 3, 2,
    0, 1, 2, 3, 2, 1,
  ],
  midday: [
    1, 1, 0, 2, 2, 1, 0, 2, 3, 1, 1, 2, 2, 0, 1, 1, 3, 2, 1, 0, 2, 2, 1, 3,
    1, 0, 2, 2, 1, 1,
  ],
  evening: [
    3, 2, 2, 1, 3, 2, 0, 1, 2, 3, 2, 2, 1, 0, 1, 3, 2, 2, 1, 3, 2, 0, 1, 2,
    3, 2, 1, 2, 0, 1,
  ],
} as const;

export function getHealthOverviewViewModel(): HealthOverviewViewModel {
  return {
    profileId: "demo",
    contentStates: {
      habits: resolveContentStateMeta({ capacity: 3, itemCount: 3 }),
      mentalHealth: resolveContentStateMeta({ capacity: 3, itemCount: 3 }),
      page: resolveContentStateMeta({ capacity: 5, itemCount: 5 }),
      running: resolveContentStateMeta({ capacity: 3, itemCount: 3 }),
      schedule: resolveContentStateMeta({ capacity: 10, itemCount: 10 }),
      strength: resolveContentStateMeta({ capacity: 3, itemCount: 3 }),
    },
    header: {
      eyebrow: "Life OS / Health & Fitness",
      title: "Health & Fitness",
      summary: "Body, mind, habits and training signals in one place.",
      dateRange: "Week 24 · June 10 – June 16, 2026",
    },
    pageContract: {
      pageType: "Area Overview",
      primaryPurpose:
        "Context page for mental health, habits, running and strength signals.",
      writes: "none in Phase 2",
      reads:
        "Mock views for daily_records, habits, habit_logs, running_sessions, strength_sessions and workouts.",
      canonicalSource:
        "Future canonical health entities; this page only projects mock data.",
      sensitiveData: "health_sensitive",
      primaryDecision:
        "Choose the next calm health or fitness step without medical diagnosis language.",
      mainZone:
        "Today Health Schedule plus four quiet domain panels for current context.",
      emptyState:
        "Later, missing health data should explain which source record is needed.",
      mobileOrder:
        "Header, Today Health Schedule, Mental Health, Running Tracker, Habits, Strength Tracker.",
    },
    mentalHealth: {
      title: "Mental Health",
      subtitle: "Mood, sleep and reflection signals. Self-check only.",
      badge: "Self-check",
      moodTitle: "Mood check-ins · last 7 days",
      moodDirections: [
        {
          label: "Calm",
          mark: "●",
          daysLabel: "3 days",
          pattern: moodWeek.calm,
          accent: "var(--accent-green)",
        },
        {
          label: "Focused",
          mark: "◆",
          daysLabel: "2 days",
          pattern: moodWeek.focused,
          accent: "var(--accent-blue)",
        },
        {
          label: "Tense",
          mark: "▲",
          daysLabel: "1 day",
          pattern: moodWeek.tense,
          accent: "var(--accent-orange)",
        },
        {
          label: "Low",
          mark: "○",
          daysLabel: "0 days",
          pattern: moodWeek.low,
          accent: "var(--accent-purple)",
        },
        {
          label: "Social",
          mark: "●",
          daysLabel: "2 days",
          pattern: moodWeek.social,
          accent: "var(--accent-cyan)",
        },
        {
          label: "Tired",
          mark: "◆",
          daysLabel: "2 days",
          pattern: moodWeek.tired,
          accent: "var(--accent-yellow)",
        },
      ],
      sleep: {
        label: "Sleep (7d avg)",
        value: "7h 18m",
        detail: "Sleep debt visible",
        bars: [
          { day: "Mon", value: 0.78, label: "7h 42m" },
          { day: "Tue", value: 0.62, label: "6h 58m" },
          { day: "Wed", value: 0.66, label: "7h 05m" },
          { day: "Thu", value: 0.72, label: "7h 22m" },
          { day: "Fri", value: 0.58, label: "6h 44m" },
          { day: "Sat", value: 0.86, label: "8h 02m" },
          { day: "Sun", value: 0.7, label: "7h 15m" },
        ],
      },
      journal: {
        label: "Journal / Reflection",
        value: "4 / 7 days",
        pattern: [true, true, false, true, false, true, false],
        actionLabel: "Open Journal",
        href: "/life/journal",
      },
    },
    running: {
      title: "Running Tracker",
      subtitle: "Weekly distance, load status and next run.",
      loadStatus: "Moderate load",
      metrics: [
        {
          label: "Weekly distance",
          value: "18.4 km",
          detail: "↑12% vs last week",
          accent: "var(--accent-cyan)",
        },
        {
          label: "Avg pace",
          value: "5:42 / km",
          detail: "controlled effort",
          accent: "var(--accent-cyan)",
        },
        {
          label: "Last run",
          value: "6.2 km",
          detail: "Sun · 48:05",
          accent: "var(--accent-green)",
        },
      ],
      trends: [
        {
          title: "7-day trend",
          statement: "3 runs · load rising softly",
          values: [2.4, 0, 6.2, 0, 3.3, 0, 6.5],
          accent: "var(--accent-cyan)",
        },
        {
          title: "30-day trend",
          statement: "Last week is close to steady tempo",
          values: [11, 13, 12, 15, 14, 17, 18.4],
          accent: "var(--accent-orange)",
        },
      ],
      nextRun: {
        label: "Next run",
        title: "Thu · 6.5 km easy run",
        detail: "Recovery signal medium · keep intensity low.",
        actionLabel: "View Plan",
        href: "/health/running",
      },
    },
    habits: {
      title: "Habits",
      subtitle: "Routine consistency over time.",
      badge: "78%",
      metrics: [
        {
          label: "Consistency",
          value: "78%",
          detail: "↑11% vs last month",
          accent: "var(--accent-cyan)",
        },
        {
          label: "Active habits",
          value: "12",
          detail: "on track",
          accent: "var(--accent-green)",
        },
        {
          label: "Bad habits counter",
          value: "3",
          detail: "trending down",
          accent: "var(--accent-orange)",
        },
      ],
      heatmap: {
        title: "Monthly habit heatmap · June",
        rows: [
          { label: "Morning", values: habitHeatmap.morning },
          { label: "Midday", values: habitHeatmap.midday },
          { label: "Evening", values: habitHeatmap.evening },
        ],
        legend: {
          low: "Less",
          high: "More",
        },
      },
      nextFocus: {
        label: "Next Focus",
        title: "Evening shutdown · build consistency before adding more.",
        actionLabel: "Open Habits",
        href: "/health/habits",
      },
    },
    strength: {
      title: "Strength Tracker",
      subtitle: "Bodyweight / calisthenics · full body focus.",
      badge: "64% coverage",
      metrics: [
        {
          label: "Sessions",
          value: "3",
          detail: "this week",
          accent: "var(--accent-red)",
        },
        {
          label: "Coverage",
          value: "64%",
          detail: "full body",
          accent: "var(--accent-green)",
        },
        {
          label: "Last session",
          value: "Sun · Full body",
          detail: "45 min · RPE 7",
          accent: "var(--accent-orange)",
        },
      ],
      trainingPattern: {
        title: "Training pattern (last 2 weeks)",
        note: "Full body sessions with recovery spacing.",
        days: [
          {
            day: "Mon",
            label: "Full body",
            intensity: 0.78,
            accent: "var(--accent-orange)",
          },
          {
            day: "Tue",
            label: "Recovery",
            intensity: 0.28,
            accent: "var(--accent-green)",
          },
          {
            day: "Wed",
            label: "Skill work",
            intensity: 0.62,
            accent: "var(--accent-yellow)",
          },
          {
            day: "Thu",
            label: "Mobility",
            intensity: 0.38,
            accent: "var(--accent-cyan)",
          },
          {
            day: "Fri",
            label: "Full body",
            intensity: 0.82,
            accent: "var(--accent-red)",
          },
          {
            day: "Sat",
            label: "Recovery",
            intensity: 0.22,
            accent: "var(--accent-green)",
          },
          {
            day: "Sun",
            label: "Full body",
            intensity: 0.68,
            accent: "var(--accent-orange)",
          },
        ],
      },
      sessionBalance: {
        title: "Session type balance",
        items: [
          { label: "Pull", count: 2, accent: "var(--accent-cyan)" },
          { label: "Push", count: 2, accent: "var(--accent-red)" },
          { label: "Core", count: 2, accent: "var(--accent-yellow)" },
          { label: "Mobility", count: 1, accent: "var(--accent-green)" },
          { label: "Recovery", count: 2, accent: "var(--accent-green)" },
          { label: "Skill work", count: 1, accent: "var(--accent-purple)" },
        ],
      },
      nextSession: {
        label: "Next session",
        title: "Tue · Full body",
        detail: "Strength + skill · 40–50 min",
        actionLabel: "View Plan",
        href: "/health/strength",
      },
    },
    schedule: {
      title: "Today · Health Schedule",
      dateLabel: "Tuesday, June 10",
      items: [
        {
          time: "23:15 – 07:05",
          title: "Sleep",
          detail: "7h 50m · Sleep debt visible",
          statusLabel: "sleep window",
          status: "sleep",
          accent: "var(--accent-blue)",
        },
        {
          time: "07:15 – 08:00",
          title: "Morning Routine",
          detail: "Hydrate · Light mobility · Mindful start",
          statusLabel: "done",
          status: "done",
          accent: "var(--accent-green)",
        },
        {
          time: "08:00 – 08:30",
          title: "Habits Block",
          detail: "Breathwork · Journaling · Planning",
          statusLabel: "done",
          status: "done",
          accent: "var(--accent-cyan)",
        },
        {
          time: "09:30 – 10:00",
          title: "Focus Block",
          detail: "Deep work · Minimal distractions",
          statusLabel: "planned",
          status: "planned",
          accent: "var(--accent-cyan)",
        },
        {
          time: "12:00 – 12:30",
          title: "Midday Reset",
          detail: "Walk · Mobility · Hydration",
          statusLabel: "done",
          status: "done",
          accent: "var(--accent-green)",
        },
        {
          time: "13:00 – 13:30",
          title: "Lunch & Break",
          detail: "Nourish · Unwind",
          statusLabel: "done",
          status: "done",
          accent: "var(--accent-green)",
        },
        {
          time: "16:45 – 17:30",
          title: "Easy Run",
          detail: "6–7 km · Easy pace",
          statusLabel: "planned",
          status: "planned",
          accent: "var(--accent-orange)",
        },
        {
          time: "18:30 – 19:30",
          title: "Training Session",
          detail: "Full body · Strength + skill",
          statusLabel: "planned",
          status: "planned",
          accent: "var(--accent-red)",
        },
        {
          time: "21:00 – 21:30",
          title: "Evening Routine",
          detail: "Stretching · Reflection · Unwind",
          statusLabel: "done",
          status: "done",
          accent: "var(--accent-cyan)",
        },
        {
          time: "22:30 – 23:00",
          title: "Reading / Wind Down",
          detail: "No screens · Prepare for sleep",
          statusLabel: "planned",
          status: "planned",
          accent: "var(--accent-purple)",
        },
      ],
      footerLabel: "View all details and history",
      actionLabel: "Open Calendar",
      href: "/calendar",
    },
  };
}
