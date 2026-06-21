import type { StrengthTrackerPageViewModel } from "./strength-tracker-types";

export function getStrengthTrackerViewModel(): StrengthTrackerPageViewModel {
  return {
    header: {
      breadcrumb: ["Life OS", "Health & Fitness", "Strength Tracker"],
      title: "Strength Tracker",
      description:
        "Plan the next useful strength session from focus, muscle balance, effort and recovery context.",
      meta: "June 2026 · beginner plan detail",
      pills: [
        { label: "Beginner Mode", accent: "var(--accent-orange)" },
        { label: "Next Session Planner", accent: "var(--accent-red)" },
        { label: "Technique first", accent: "var(--accent-green)" },
        { label: "Self-tracked context", accent: "var(--accent-cyan)" },
      ],
      decision: {
        label: "Next strength decision",
        title: "Full body · technique focus",
        duration: "45 min",
        effort: "RPE 6–7 · keep reps clean",
        readiness: "76%",
        progress: 76,
        detail: "Progress only where form stayed stable.",
        accent: "var(--accent-orange)",
      },
    },
    summary: [
      {
        label: "Sessions this week",
        value: "2 / 3",
        detail: "one useful session open",
        accent: "var(--accent-orange)",
      },
      {
        label: "Training load",
        value: "Moderate",
        detail: "keep volume repeatable",
        accent: "var(--accent-yellow)",
      },
      {
        label: "Muscle balance",
        value: "Back + legs due",
        detail: "bias next session",
        accent: "var(--accent-red)",
      },
      {
        label: "Progression",
        value: "3 lifts stable",
        detail: "form stayed clean",
        accent: "var(--accent-green)",
      },
      {
        label: "Recovery signal",
        value: "76%",
        detail: "self-check",
        accent: "var(--accent-cyan)",
      },
      {
        label: "Next session",
        value: "Full body · 45 min",
        detail: "technique focus",
        accent: "var(--accent-orange)",
      },
    ],
    planner: {
      title: "Strength Session Planner",
      subtitle:
        "Select the smallest useful session from movement focus, available time, effort and equipment.",
      sessionTypes: [
        { label: "Full Body", value: "full-body", active: true },
        { label: "Upper", value: "upper" },
        { label: "Lower", value: "lower" },
        { label: "Push", value: "push" },
        { label: "Pull", value: "pull" },
        { label: "Legs", value: "legs" },
        { label: "Mobility", value: "mobility" },
      ],
      trainingFocus: [
        { label: "Technique", value: "technique", active: true },
        { label: "Build consistency", value: "build-consistency" },
        { label: "Progress slowly", value: "progress-slowly" },
        { label: "Balanced volume", value: "balanced-volume" },
        { label: "Core stability", value: "core-stability" },
        { label: "Recovery lift", value: "recovery-lift" },
      ],
      availableTimes: [
        { label: "45 min", value: "45", active: true },
        { label: "30 min", value: "30" },
        { label: "60 min", value: "60" },
        { label: "75 min", value: "75" },
      ],
      effortTargets: [
        { label: "RPE 6–7", value: "rpe-6-7", active: true },
        { label: "Very easy", value: "very-easy" },
        { label: "Moderate", value: "moderate" },
        { label: "Hard", value: "hard" },
      ],
      equipment: [
        { label: "Gym", value: "gym", active: true },
        { label: "Bodyweight", value: "bodyweight" },
        { label: "Dumbbells", value: "dumbbells" },
        { label: "Bands", value: "bands" },
        { label: "Barbell", value: "barbell" },
      ],
      movementInputs: [
        {
          label: "Primary lift",
          value: "Goblet squat / leg press context",
          helper: "Use a pattern that keeps depth and bracing stable.",
          accent: "var(--accent-orange)",
        },
        {
          label: "Pull movement",
          value: "Cable row · stable reps",
          helper: "Balance push volume before adding load.",
          accent: "var(--accent-cyan)",
        },
        {
          label: "Push movement",
          value: "DB bench · repeat weight",
          helper: "Repeat the load until all reps stay clean.",
          accent: "var(--accent-red)",
        },
        {
          label: "Core",
          value: "Plank / anti-rotation",
          helper: "Keep this short and technically quiet.",
          accent: "var(--accent-green)",
        },
      ],
      suggestedSession: {
        title: "Suggested Beginner Session",
        detail: "Full body · 45 min",
        target: "RPE 6–7 · stop before form breaks",
        steps: [
          {
            label: "5 min warm-up",
            detail: "Light movement, bracing and range check.",
            accent: "var(--accent-green)",
          },
          {
            label: "3 × 8 squat pattern",
            detail: "Goblet squat or leg press at clean depth.",
            accent: "var(--accent-orange)",
          },
          {
            label: "3 × 10 horizontal pull",
            detail: "Controlled cable row before push progression.",
            accent: "var(--accent-cyan)",
          },
          {
            label: "2 × 10 push movement",
            detail: "Repeat dumbbell bench weight from last session.",
            accent: "var(--accent-red)",
          },
          {
            label: "2 × core finisher",
            detail: "Plank or anti-rotation with stable breathing.",
            accent: "var(--accent-green)",
          },
        ],
      },
      primaryActions: [
        { label: "Use this session", variant: "primary" },
        { label: "Adjust focus", variant: "secondary" },
        { label: "Save as template", variant: "quiet" },
      ],
      secondaryActions: [
        { label: "Schedule for 18:00", variant: "secondary" },
        { label: "Start later", variant: "quiet" },
      ],
    },
    todayPlan: {
      title: "Today Strength Plan",
      plan: "Full body · 45 min",
      details: [
        {
          label: "Goal",
          value: "technique + consistency",
          detail: "repeatable first",
          accent: "var(--accent-orange)",
        },
        {
          label: "Effort",
          value: "RPE 6–7",
          detail: "leave room",
          accent: "var(--accent-green)",
        },
        {
          label: "Equipment",
          value: "gym",
          detail: "standard setup",
          accent: "var(--accent-cyan)",
        },
        {
          label: "Focus",
          value: "clean reps",
          detail: "no grind",
          accent: "var(--accent-yellow)",
        },
      ],
      checklist: [
        { label: "Warm-up", done: true },
        { label: "Start light", done: false },
        { label: "Keep reps clean", done: false },
        { label: "Leave 2 reps in reserve", done: false },
        { label: "Log working sets", done: false },
        { label: "Cooldown", done: false },
      ],
      actions: [
        { label: "Use this session", variant: "primary" },
        { label: "Adjust focus", variant: "secondary" },
        { label: "Start later", variant: "quiet" },
      ],
    },
    review: {
      title: "Recent Session Review",
      lastSession: "Last session · upper body · 42 min",
      metrics: [
        {
          label: "Working sets",
          value: "14",
          detail: "upper body",
          accent: "var(--accent-orange)",
        },
        {
          label: "Top set",
          value: "DB bench 22.5 kg × 8",
          detail: "repeat weight",
          accent: "var(--accent-red)",
        },
        {
          label: "Energy",
          value: "okay",
          detail: "session completed",
          accent: "var(--accent-cyan)",
        },
      ],
      signals: [
        {
          label: "Effort",
          value: "moderate",
          detail: "RPE stayed below grind",
          accent: "var(--accent-yellow)",
        },
        {
          label: "Technique",
          value: "stable",
          detail: "no visible form breakdown",
          accent: "var(--accent-green)",
        },
        {
          label: "Pull volume",
          value: "slightly low",
          detail: "balance before push progression",
          accent: "var(--accent-red)",
        },
        {
          label: "Energy",
          value: "okay",
          detail: "repeatable, not maximal",
          accent: "var(--accent-cyan)",
        },
      ],
      learning:
        "Learned: Upper push was stable, but pulling volume should be balanced next session.",
      adjustment:
        "Next adjustment: Add one controlled row set before pushing progression.",
      action: { label: "Apply adjustment", variant: "secondary" },
    },
    rhythmBalance: {
      title: "Weekly Strength Rhythm / Muscle Balance",
      subtitle:
        "Seven-day rhythm and movement balance. Labels carry meaning; color only supports scanning.",
      days: [
        {
          day: "Mon",
          label: "Rest",
          status: "rest",
          accent: "var(--accent-green)",
          active: true,
        },
        {
          day: "Tue",
          label: "Full body",
          status: "done",
          accent: "var(--accent-orange)",
          active: true,
        },
        {
          day: "Wed",
          label: "Mobility",
          status: "mobility",
          accent: "var(--accent-cyan)",
          active: true,
        },
        {
          day: "Thu",
          label: "Upper",
          status: "done",
          accent: "var(--accent-red)",
          active: true,
        },
        {
          day: "Fri",
          label: "Rest",
          status: "rest",
          accent: "var(--accent-green)",
          active: true,
        },
        {
          day: "Sat",
          label: "Planned full body",
          status: "planned",
          accent: "var(--accent-orange)",
          active: false,
        },
        {
          day: "Sun",
          label: "Walk / recovery",
          status: "recovery",
          accent: "var(--accent-cyan)",
          active: false,
        },
      ],
      balance: [
        {
          label: "Legs",
          value: "due",
          detail: "bias today",
          accent: "var(--accent-orange)",
        },
        {
          label: "Back",
          value: "due",
          detail: "add row volume",
          accent: "var(--accent-cyan)",
        },
        {
          label: "Push",
          value: "covered",
          detail: "keep stable",
          accent: "var(--accent-green)",
        },
        {
          label: "Core",
          value: "light",
          detail: "short finisher",
          accent: "var(--accent-yellow)",
        },
        {
          label: "Mobility",
          value: "open",
          detail: "optional",
          accent: "var(--accent-blue)",
        },
      ],
      statement:
        "Balance today toward legs and back. Keep push volume stable.",
    },
    loadRecovery: {
      title: "Training Load & Recovery",
      weeklyLoad: {
        label: "Weekly load",
        value: "Moderate · 68%",
        progress: 68,
        detail: "repeatable beginner volume",
        accent: "var(--accent-yellow)",
      },
      recoverySignal: {
        label: "Recovery signal",
        value: "76%",
        progress: 76,
        detail: "self-check supports a normal session",
        accent: "var(--accent-green)",
      },
      volumeSplit: [
        {
          label: "Legs",
          value: 28,
          detail: "28%",
          accent: "var(--accent-orange)",
        },
        {
          label: "Back",
          value: 22,
          detail: "22%",
          accent: "var(--accent-cyan)",
        },
        {
          label: "Push",
          value: 34,
          detail: "34%",
          accent: "var(--accent-red)",
        },
        {
          label: "Core",
          value: 16,
          detail: "16%",
          accent: "var(--accent-green)",
        },
      ],
      guardrail: "Increase only one variable: weight, reps or sets.",
    },
    progression: {
      title: "Exercise Progression Context",
      subtitle: "Compact rules keep progression contextual, not pressuring.",
      rules: [
        {
          rank: "01",
          label: "Form",
          detail: "clean reps before load",
          accent: "var(--accent-green)",
        },
        {
          rank: "02",
          label: "Reps",
          detail: "add reps before weight",
          accent: "var(--accent-cyan)",
        },
        {
          rank: "03",
          label: "Weight",
          detail: "increase only if stable",
          accent: "var(--accent-orange)",
        },
        {
          rank: "04",
          label: "Sets",
          detail: "small volume steps",
          accent: "var(--accent-yellow)",
        },
        {
          rank: "05",
          label: "Tempo",
          detail: "control movement",
          accent: "var(--accent-blue)",
        },
        {
          rank: "06",
          label: "Rest",
          detail: "repeatable session pace",
          accent: "var(--accent-red)",
        },
      ],
      footer: "Progression is context, not pressure.",
    },
    trend: {
      title: "30-Day Strength Trend",
      statement:
        "Consistency is building. Keep progression small and repeatable.",
      weeks: [
        {
          label: "Week 1",
          sessions: "2 sessions",
          sets: "24 sets",
          stableLifts: "2 stable lifts",
          value: 48,
          accent: "var(--accent-cyan)",
        },
        {
          label: "Week 2",
          sessions: "2 sessions",
          sets: "28 sets",
          stableLifts: "3 stable lifts",
          value: 56,
          accent: "var(--accent-orange)",
        },
        {
          label: "Week 3",
          sessions: "2 sessions",
          sets: "31 sets",
          stableLifts: "3 stable lifts",
          value: 62,
          accent: "var(--accent-green)",
        },
        {
          label: "Week 4 target",
          sessions: "3 sessions",
          sets: "target open",
          stableLifts: "repeat first",
          value: 74,
          accent: "var(--accent-yellow)",
        },
      ],
    },
    recentSets: {
      title: "Recent Sets compact log",
      subtitle: "Latest working-set context, capped to four entries.",
      note: "Rows stay compact. Detail view can carry exercise history later.",
      items: [
        {
          date: "Jun 18",
          exercise: "DB bench",
          load: "22.5 kg × 8",
          result: "stable",
          status: "logged",
          accent: "var(--accent-red)",
        },
        {
          date: "Jun 18",
          exercise: "Cable row",
          load: "35 kg × 10",
          result: "controlled",
          status: "logged",
          accent: "var(--accent-cyan)",
        },
        {
          date: "Jun 15",
          exercise: "Leg press",
          load: "90 kg × 10",
          result: "repeatable",
          status: "logged",
          accent: "var(--accent-orange)",
        },
        {
          date: "Jun 15",
          exercise: "Plank",
          load: "45 sec",
          result: "stable",
          status: "logged",
          accent: "var(--accent-green)",
        },
      ],
    },
    boundaries: {
      title: "Beginner Strength Boundaries",
      footer: "Self-check only · planning context, not medical advice.",
      items: [
        {
          label: "Form first",
          detail: "Clean reps beat heavier weight.",
          accent: "var(--accent-green)",
        },
        {
          label: "Leave reps in reserve",
          detail: "Stop before technique breaks.",
          accent: "var(--accent-orange)",
        },
        {
          label: "Progress slowly",
          detail: "Change one variable at a time.",
          accent: "var(--accent-yellow)",
        },
        {
          label: "Recovery counts",
          detail: "A repeatable week beats one hard session.",
          accent: "var(--accent-cyan)",
        },
        {
          label: "Self-check only",
          detail: "Planning context, not medical advice.",
          accent: "var(--accent-red)",
        },
      ],
    },
  };
}
