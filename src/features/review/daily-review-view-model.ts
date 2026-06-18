export type DailyReviewLoop = {
  title: string;
  area: string;
  nextStep: string;
  accent: string;
};

export type DailyReviewViewModel = {
  title: "Daily Review";
  eyebrow: string;
  summary: string;
  status: {
    label: string;
    title: string;
    description: string;
  };
  outcome: {
    title: string;
    signal: string;
    note: string;
  };
  wins: {
    title: string;
    items: string[];
    emptyState: {
      title: string;
      description: string;
    };
  };
  openLoops: {
    title: string;
    items: DailyReviewLoop[];
    emptyState: {
      title: string;
      description: string;
    };
  };
  recap: {
    title: string;
    inbox: string;
    tasks: string;
    note: string;
  };
  tomorrowHint: {
    title: string;
    focus: string;
    firstStep: string;
  };
};

export function getDailyReviewViewModel(): DailyReviewViewModel {
  return {
    title: "Daily Review",
    eyebrow: "Close the loop",
    summary:
      "A static end-of-day skeleton for outcome, wins, open loops, and tomorrow's first move.",
    status: {
      label: "Review status",
      title: "Review still open",
      description:
        "Nothing is saved here yet. Use this preview to decide what belongs in the final review.",
    },
    outcome: {
      title: "Day outcome",
      signal: "Partially complete",
      note: "Static placeholder for the final day signal once daily logs exist.",
    },
    wins: {
      title: "Wins",
      items: [
        "Daily flow pages are scoped before stored data work.",
        "Dashboard V5 remains separate from the route skeleton work.",
      ],
      emptyState: {
        title: "No wins logged yet",
        description:
          "At review time, add one concrete completed step before planning tomorrow.",
      },
    },
    openLoops: {
      title: "Open loops",
      items: [
        {
          title: "Data binding for daily routes",
          area: "Later data binding",
          nextStep: "Define stored review data after the static flow is accepted.",
          accent: "var(--accent-green)",
        },
        {
          title: "Review form persistence",
          area: "Review / System",
          nextStep: "Keep input handling for the later save workflow.",
          accent: "var(--text-muted)",
        },
      ],
      emptyState: {
        title: "No open loops",
        description:
          "Close the day by protecting tomorrow's first step instead of creating extra work.",
      },
    },
    recap: {
      title: "Inbox / Task recap",
      inbox: "2 signals still need later processing.",
      tasks: "1 active task remains for validation.",
      note: "This is a static recap. No items are moved, archived, or saved.",
    },
    tomorrowHint: {
      title: "Tomorrow Hint",
      focus: "Start with validation output and any failed check follow-up.",
      firstStep: "Open Tasks, pick the first P1 validation item, then clear one Inbox signal.",
    },
  };
}
