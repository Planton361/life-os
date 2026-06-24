import type { ContentStateMeta } from "@/features/content-state";

export type MentalHealthProfileId = "demo" | "empty" | "manual";

export type MentalHealthAccent =
  | "var(--accent-blue)"
  | "var(--accent-green)"
  | "var(--accent-orange)"
  | "var(--accent-red)"
  | "var(--accent-purple)"
  | "var(--accent-cyan)"
  | "var(--accent-yellow)";

export type MentalHealthStatusPillViewModel = {
  label: string;
  accent: MentalHealthAccent;
};

export type MentalHealthMetricViewModel = {
  label: string;
  value: string;
  detail: string;
  accent: MentalHealthAccent;
  progress?: number;
  progressLabel?: string;
};

export type MentalHealthCheckItemViewModel = {
  label: string;
  value: string;
  detail: string;
  accent: MentalHealthAccent;
};

export type MentalHealthMoodViewModel = {
  label: string;
  value: string;
  detail: string;
  pattern: readonly boolean[];
  accent: MentalHealthAccent;
};

export type MentalHealthSleepBarViewModel = {
  day: string;
  value: number;
  label: string;
};

export type MentalHealthRoutineViewModel = {
  title: string;
  detail: string;
  readiness: number;
  readinessLabel: string;
  accent: MentalHealthAccent;
};

export type MentalHealthActionViewModel = {
  time: string;
  title: string;
  detail: string;
  status: string;
  accent: MentalHealthAccent;
};

export type MentalHealthBoundaryViewModel = {
  title: string;
  detail: string;
  accent: MentalHealthAccent;
};

export type MentalHealthPageViewModel = {
  profileId: MentalHealthProfileId;
  contentStates: {
    page: ContentStateMeta;
    header: ContentStateMeta;
    checkIn: ContentStateMeta;
    moodPattern: ContentStateMeta;
    currentSignal: ContentStateMeta;
    sleepRecovery: ContentStateMeta;
    journalRhythm: ContentStateMeta;
    repairRoutines: ContentStateMeta;
    actions: ContentStateMeta;
    safety: ContentStateMeta;
  };
  header: {
    breadcrumb: readonly string[];
    title: "Mental Health";
    subtitle: string;
    pills: readonly MentalHealthStatusPillViewModel[];
    signal: MentalHealthMetricViewModel;
  };
  checkIn: {
    title: "Today Check-In";
    subtitle: string;
    badge: "Primary action";
    messageTitle: string;
    message: string;
    items: readonly MentalHealthCheckItemViewModel[];
    nextRepair: {
      label: "Next repair";
      value: string;
    };
    actionLabel: "Open check-in";
    actionDisabled?: boolean;
  };
  moodPattern: {
    title: string;
    subtitle: string;
    rangeLabel: "7 days";
    moods: readonly MentalHealthMoodViewModel[];
    interpretation: string;
  };
  currentSignal: {
    title: "Current Signal";
    subtitle: string;
    metrics: readonly MentalHealthMetricViewModel[];
    interpretation: {
      label: "Signal interpretation";
      value: string;
      detail: string;
    };
    nextStep: {
      label: "Next step";
      value: string;
      detail: string;
    };
  };
  sleepRecovery: {
    title: "Sleep & Recovery";
    subtitle: string;
    metrics: readonly MentalHealthMetricViewModel[];
    bars: readonly MentalHealthSleepBarViewModel[];
    tonightCue: {
      label: "Tonight cue";
      value: string;
      detail: string;
    };
  };
  journalRhythm: {
    title: "Journal / Reflection Rhythm";
    subtitle: string;
    value: string;
    pattern: readonly boolean[];
    focus: {
      label: "Reflection focus";
      value: string;
    };
    lastReflection: {
      label: "Last reflection";
      value: string;
      detail: string;
    };
    prompt: {
      label: "Daily prompt";
      value: string;
      detail: string;
    };
    actionLabel: "Open Journal";
    href: "/life/journal";
  };
  repairRoutines: {
    title: string;
    subtitle: string;
    routines: readonly MentalHealthRoutineViewModel[];
    recommendedToday: {
      label: "Recommended today";
      value: string;
      detail: string;
    };
  };
  actions: {
    title: "Mental Health Actions";
    subtitle: string;
    badge: "Today";
    items: readonly MentalHealthActionViewModel[];
    decisionRule: {
      label: "Decision rule";
      value: string;
      detail: string;
      progress: number;
      progressLabel: string;
    };
    todayHref: "/today";
    todayLabel: "Open Today";
    journalHref: "/life/journal";
    journalLabel: "Open Journal";
  };
  safety: {
    title: "Safety & Boundaries";
    subtitle: string;
    items: readonly MentalHealthBoundaryViewModel[];
  };
};

export function getMentalHealthViewModel(): MentalHealthPageViewModel {
  return {
    profileId: "demo",
    contentStates: {
      actions: {
        capacity: 7,
        hasPrimaryValue: true,
        itemCount: 7,
        state: "filled",
      },
      checkIn: {
        capacity: 5,
        hasPrimaryValue: true,
        itemCount: 5,
        state: "filled",
      },
      currentSignal: {
        capacity: 3,
        hasPrimaryValue: true,
        itemCount: 3,
        state: "filled",
      },
      header: {
        capacity: 1,
        hasPrimaryValue: true,
        itemCount: 1,
        state: "filled",
      },
      journalRhythm: {
        capacity: 7,
        hasPrimaryValue: true,
        itemCount: 4,
        state: "partial",
      },
      moodPattern: {
        capacity: 6,
        hasPrimaryValue: true,
        itemCount: 6,
        state: "filled",
      },
      page: {
        capacity: 8,
        hasPrimaryValue: true,
        itemCount: 7,
        state: "partial",
      },
      repairRoutines: {
        capacity: 3,
        hasPrimaryValue: true,
        itemCount: 3,
        state: "filled",
      },
      safety: {
        capacity: 4,
        hasPrimaryValue: true,
        itemCount: 4,
        state: "filled",
      },
      sleepRecovery: {
        capacity: 7,
        hasPrimaryValue: true,
        itemCount: 7,
        state: "filled",
      },
    },
    header: {
      breadcrumb: ["Life OS", "Health & Fitness", "Mental Health"],
      title: "Mental Health",
      subtitle:
        "Self-checks, mood patterns and routines without labels or pressure.",
      pills: [
        { label: "Self-check only", accent: "var(--accent-purple)" },
        { label: "No condition labels", accent: "var(--accent-cyan)" },
        { label: "Review today", accent: "var(--accent-green)" },
      ],
      signal: {
        label: "Today signal",
        value: "Steady",
        detail: "stress watch",
        accent: "var(--accent-purple)",
        progress: 64,
        progressLabel: "64% steady range",
      },
    },
    checkIn: {
      title: "Today Check-In",
      subtitle: "Capture the signal, then choose the smallest useful repair.",
      badge: "Primary action",
      messageTitle: "5-minute self-check",
      message: "No score. No pressure. Mark what is true enough and move on.",
      items: [
        {
          label: "Mood",
          value: "Calm",
          detail: "present",
          accent: "var(--accent-purple)",
        },
        {
          label: "Stress",
          value: "Watch",
          detail: "soft rise",
          accent: "var(--accent-orange)",
        },
        {
          label: "Energy",
          value: "Steady",
          detail: "usable",
          accent: "var(--accent-blue)",
        },
        {
          label: "Sleep",
          value: "Recovery",
          detail: "needs cue",
          accent: "var(--accent-cyan)",
        },
        {
          label: "Journal",
          value: "Next",
          detail: "one line",
          accent: "var(--accent-green)",
        },
      ],
      nextRepair: {
        label: "Next repair",
        value: "10-minute walk after deep work",
      },
      actionLabel: "Open check-in",
    },
    moodPattern: {
      title: "Mood Pattern",
      subtitle:
        "Show your tendency in text. Color is always paired with label.",
      rangeLabel: "7 days",
      moods: [
        {
          label: "Calm",
          value: "3 days",
          detail: "steady",
          pattern: [true, true, false, true, false, false, false],
          accent: "var(--accent-green)",
        },
        {
          label: "Focused",
          value: "2 days",
          detail: "deep work",
          pattern: [false, true, true, false, false, false, false],
          accent: "var(--accent-blue)",
        },
        {
          label: "Tense",
          value: "1 day",
          detail: "watch",
          pattern: [false, false, true, false, false, false, false],
          accent: "var(--accent-orange)",
        },
        {
          label: "Low",
          value: "0 days",
          detail: "none logged",
          pattern: [false, false, false, false, false, false, false],
          accent: "var(--accent-purple)",
        },
        {
          label: "Social",
          value: "2 days",
          detail: "support",
          pattern: [true, false, false, false, true, false, false],
          accent: "var(--accent-cyan)",
        },
        {
          label: "Tired",
          value: "2 days",
          detail: "sleep cue",
          pattern: [false, true, false, false, false, true, false],
          accent: "var(--accent-yellow)",
        },
      ],
      interpretation:
        "Calm and social signals are visible. Tension appears after long focus blocks; repair through short movement before widening context.",
    },
    currentSignal: {
      title: "Current Signal",
      subtitle: "What needs review, without turning the page into analytics.",
      metrics: [
        {
          label: "Stress watch",
          value: "Medium",
          detail: "after focus blocks",
          accent: "var(--accent-orange)",
          progress: 58,
          progressLabel: "medium attention",
        },
        {
          label: "Energy",
          value: "6 / 10",
          detail: "usable capacity",
          accent: "var(--accent-blue)",
          progress: 60,
          progressLabel: "steady capacity",
        },
        {
          label: "Repair",
          value: "Walk",
          detail: "smallest action",
          accent: "var(--accent-green)",
          progress: 72,
          progressLabel: "ready action",
        },
      ],
      interpretation: {
        label: "Signal interpretation",
        value:
          "Usable capacity is available. Keep the next action physical and short.",
        detail: "Best fit now: walk reset before another context switch.",
      },
      nextStep: {
        label: "Next step",
        value: "Walk reset after deep work.",
        detail: "Ten minutes outside, then return to one Today item.",
      },
    },
    sleepRecovery: {
      title: "Sleep & Recovery",
      subtitle: "Sleep rhythm as context for mood and focus.",
      metrics: [
        {
          label: "7d avg",
          value: "7h 18m",
          detail: "steady rest window",
          accent: "var(--accent-blue)",
        },
        {
          label: "Sleep debt",
          value: "2 nights",
          detail: "below baseline",
          accent: "var(--accent-orange)",
        },
        {
          label: "Wind-down",
          value: "21:45",
          detail: "target start",
          accent: "var(--accent-cyan)",
        },
      ],
      bars: [
        { day: "Mon", value: 0.78, label: "7h 42m" },
        { day: "Tue", value: 0.62, label: "6h 58m" },
        { day: "Wed", value: 0.66, label: "7h 05m" },
        { day: "Thu", value: 0.72, label: "7h 22m" },
        { day: "Fri", value: 0.58, label: "6h 44m" },
        { day: "Sat", value: 0.86, label: "8h 02m" },
        { day: "Sun", value: 0.7, label: "7h 15m" },
      ],
      tonightCue: {
        label: "Tonight cue",
        value: "Lower inputs before 22:00",
        detail: "Screen cutoff, light reading, keep it routine.",
      },
    },
    journalRhythm: {
      title: "Journal / Reflection Rhythm",
      subtitle: "Small reflection loops, not a second inbox.",
      value: "4 / 7 days",
      pattern: [true, true, false, true, false, true, false],
      focus: {
        label: "Reflection focus",
        value: "Notice ignored signals before they become planning debt.",
      },
      lastReflection: {
        label: "Last reflection",
        value:
          "Tension rose after long focus blocks. Walking helped before context switch.",
        detail: "Pattern note: movement works before adding tools.",
      },
      prompt: {
        label: "Daily prompt",
        value:
          "What signal did I ignore today, and what is the smallest repair?",
        detail: "One sentence is enough.",
      },
      actionLabel: "Open Journal",
      href: "/life/journal",
    },
    repairRoutines: {
      title: "Repair Routines",
      subtitle: "Predefined actions to avoid overthinking when signals rise.",
      routines: [
        {
          title: "Morning reset",
          detail: "Hydrate -> 2-min breath -> choose one focus",
          readiness: 82,
          readinessLabel: "ready",
          accent: "var(--accent-green)",
        },
        {
          title: "Midday repair",
          detail: "Walk -> daylight -> return for 10 minutes",
          readiness: 68,
          readinessLabel: "available",
          accent: "var(--accent-cyan)",
        },
        {
          title: "Evening shutdown",
          detail: "Close loops -> stretch -> prepare sleep cue",
          readiness: 58,
          readinessLabel: "needs cue",
          accent: "var(--accent-purple)",
        },
      ],
      recommendedToday: {
        label: "Recommended today",
        value: "Midday repair before the next deep-work block.",
        detail: "Keep it small: daylight, movement, return to Today.",
      },
    },
    actions: {
      title: "Mental Health Actions",
      subtitle: "Tuesday - choose the smallest viable repair.",
      badge: "Today",
      items: [
        {
          time: "07:15",
          title: "Check-in",
          detail: "Mood - stress - energy",
          status: "complete",
          accent: "var(--accent-purple)",
        },
        {
          time: "09:30",
          title: "Focus boundary",
          detail: "90 min block - break planned",
          status: "planned",
          accent: "var(--accent-blue)",
        },
        {
          time: "12:00",
          title: "Walk reset",
          detail: "10 minutes outside",
          status: "planned",
          accent: "var(--accent-green)",
        },
        {
          time: "15:30",
          title: "Social boundary",
          detail: "Low notification block",
          status: "planned",
          accent: "var(--accent-purple)",
        },
        {
          time: "18:00",
          title: "Journal capture",
          detail: "One paragraph - no backlog",
          status: "planned",
          accent: "var(--accent-purple)",
        },
        {
          time: "21:00",
          title: "Wind-down",
          detail: "Stretching - screen cutoff",
          status: "planned",
          accent: "var(--accent-cyan)",
        },
        {
          time: "22:30",
          title: "Sleep prep",
          detail: "Lights low - prepare tomorrow",
          status: "planned",
          accent: "var(--accent-blue)",
        },
      ],
      decisionRule: {
        label: "Decision rule",
        value: "If stress rises, reduce scope before adding tools.",
        detail:
          "Repair sequence: pause, movement, one-sentence journal, return to Today.",
        progress: 66,
        progressLabel: "repair readiness",
      },
      todayHref: "/today",
      todayLabel: "Open Today",
      journalHref: "/life/journal",
      journalLabel: "Open Journal",
    },
    safety: {
      title: "Safety & Boundaries",
      subtitle:
        "This page surfaces patterns and small actions. It does not rank your mind or turn signals into care claims.",
      items: [
        {
          title: "Self-check only",
          detail: "Personal signal capture, not assessment.",
          accent: "var(--accent-purple)",
        },
        {
          title: "No condition labels",
          detail: "No severity claims or identity framing.",
          accent: "var(--accent-cyan)",
        },
        {
          title: "No shame mechanics",
          detail: "Missed routines are context, not failure.",
          accent: "var(--accent-green)",
        },
        {
          title: "Trend-aware routines",
          detail: "Patterns lead to small repair actions.",
          accent: "var(--accent-orange)",
        },
      ],
    },
  };
}
