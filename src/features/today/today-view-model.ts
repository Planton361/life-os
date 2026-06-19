export type TodayStatusPillViewModel = {
  label: string;
  accent: string;
};

export type TodayHeaderViewModel = {
  eyebrow: "DAY MEMORY LOG";
  title: "Today";
  summary: string;
  dateLabel: string;
  statusPills: TodayStatusPillViewModel[];
};

export type TodayActivityEventViewModel = {
  time: string;
  type: string;
  title: string;
  source: string;
  status: string;
  accent: string;
};

export type TodayDeltaMetricViewModel = {
  label: string;
  value: string;
  detail: string;
  accent: string;
};

export type TodayReviewSignalViewModel = {
  label: string;
  value: string;
  detail: string;
  accent: string;
};

export type TodayDecisionViewModel = {
  label: string;
  title: string;
  description: string;
  accent: string;
};

export type TodayCarryForwardItemViewModel = {
  label: string;
  description: string;
  accent: string;
};

export type TodayArtifactViewModel = {
  type: string;
  title: string;
  detail: string;
  accent: string;
};

export type TodayContractViewModel = {
  text: string;
  pills: TodayStatusPillViewModel[];
};

export type TodayViewModel = {
  header: TodayHeaderViewModel;
  activityStream: {
    title: "Activity Stream";
    subtitle: string;
    events: TodayActivityEventViewModel[];
  };
  openingReview: {
    title: "Opening Review / Morning Context";
    subtitle: string;
    items: TodayReviewSignalViewModel[];
  };
  deltaSummary: {
    title: "Delta Summary";
    subtitle: string;
    metrics: TodayDeltaMetricViewModel[];
  };
  decisionsLedger: {
    title: "Decisions Ledger";
    subtitle: string;
    decisions: TodayDecisionViewModel[];
  };
  carryForward: {
    title: "Carry Forward";
    subtitle: string;
    items: TodayCarryForwardItemViewModel[];
    firstMove: string;
  };
  closingReview: {
    title: "Closing Review / Day Closeout";
    subtitle: string;
    signals: TodayReviewSignalViewModel[];
  };
  evidenceArtifacts: {
    title: "Evidence & Artifacts";
    subtitle: string;
    artifacts: TodayArtifactViewModel[];
  };
  contract: TodayContractViewModel;
  pageContract: {
    pageType: "Daily Record / Activity Memory Log";
    primaryPurpose: string;
    canonicalSource: string;
    sensitiveData: string;
    mainZone: string;
  };
};

export function getTodayViewModel(): TodayViewModel {
  return {
    header: {
      eyebrow: "DAY MEMORY LOG",
      title: "Today",
      summary:
        "Daily record of captures, decisions, artifacts, state changes and carry-forward.",
      dateLabel: "Tuesday, 09 June · Work / Study Day",
      statusPills: [
        {
          label: "12 events",
          accent: "var(--accent-cyan)",
        },
        {
          label: "5 captures",
          accent: "var(--accent-blue)",
        },
        {
          label: "3 completed",
          accent: "var(--accent-green)",
        },
        {
          label: "2 decisions",
          accent: "var(--accent-orange)",
        },
        {
          label: "review open",
          accent: "var(--accent-purple)",
        },
      ],
    },
    activityStream: {
      title: "Activity Stream",
      subtitle: "Chronological system events from the day.",
      events: [
        {
          time: "08:14",
          type: "Task completed",
          title: "Morning baseline checked",
          source: "Tasks · Personal",
          status: "completed",
          accent: "var(--accent-green)",
        },
        {
          time: "09:32",
          type: "Quick Thought captured",
          title: "Supabase RLS setup question",
          source: "Inbox · Coding",
          status: "needs review",
          accent: "var(--accent-cyan)",
        },
        {
          time: "10:18",
          type: "Resource added",
          title: "Literature chapter source",
          source: "Resources · Education",
          status: "linked",
          accent: "var(--accent-yellow)",
        },
        {
          time: "11:04",
          type: "Decision made",
          title: "Command Center stays dashboard-only",
          source: "Design · IA",
          status: "decision",
          accent: "var(--accent-orange)",
        },
        {
          time: "13:40",
          type: "Meal logged",
          title: "Steak salad recorded with macros",
          source: "Nutrition",
          status: "added",
          accent: "var(--accent-yellow)",
        },
        {
          time: "15:12",
          type: "Project movement",
          title: "Life OS moved from routing to page design",
          source: "Portfolio · Coding",
          status: "progress",
          accent: "var(--accent-blue)",
        },
        {
          time: "16:20",
          type: "Mood changed",
          title: "Content · focus stable, stress visible",
          source: "Mental Health",
          status: "signal",
          accent: "var(--accent-green)",
        },
        {
          time: "17:08",
          type: "Note created",
          title: "Today concept correction",
          source: "Notes · Product",
          status: "captured",
          accent: "var(--accent-purple)",
        },
        {
          time: "18:05",
          type: "Run recorded",
          title: "6.2 km · above 7-day rhythm",
          source: "Health · Running",
          status: "activity",
          accent: "var(--accent-red)",
        },
        {
          time: "19:10",
          type: "Artifact saved",
          title: "Dashboard route link pass",
          source: "Screenshot · Evidence",
          status: "evidence",
          accent: "var(--accent-cyan)",
        },
        {
          time: "20:24",
          type: "Habit checked",
          title: "Evening anti-rot action completed",
          source: "Habits",
          status: "completed",
          accent: "var(--accent-green)",
        },
        {
          time: "21:30",
          type: "Review started",
          title: "Daily Review panel opened",
          source: "Review · Today",
          status: "open",
          accent: "var(--accent-purple)",
        },
      ],
    },
    openingReview: {
      title: "Opening Review / Morning Context",
      subtitle: "How the day started before the work log filled in.",
      items: [
        {
          label: "Sleep",
          value: "6h 12m",
          detail: "stable",
          accent: "var(--accent-blue)",
        },
        {
          label: "Morning Mood",
          value: "Content",
          detail: "calm start",
          accent: "var(--accent-green)",
        },
        {
          label: "Morning Energy",
          value: "7.6 / 10",
          detail: "usable focus",
          accent: "var(--accent-cyan)",
        },
        {
          label: "Today Focus",
          value: "Master thesis / routing / review",
          detail: "protect boundaries",
          accent: "var(--accent-purple)",
        },
        {
          label: "Today Intent",
          value: "Clarify structure",
          detail: "keep dashboard separate",
          accent: "var(--accent-orange)",
        },
        {
          label: "Planned",
          value: "Review + layout pass",
          detail: "no calendar rebuild",
          accent: "var(--accent-yellow)",
        },
      ],
    },
    deltaSummary: {
      title: "Delta Summary",
      subtitle: "What changed in the system today.",
      metrics: [
        {
          label: "Tasks completed",
          value: "3",
          detail: "From task events",
          accent: "var(--accent-green)",
        },
        {
          label: "Inbox created",
          value: "5",
          detail: "Needs clarification",
          accent: "var(--accent-cyan)",
        },
        {
          label: "Resources added",
          value: "2",
          detail: "Linked to coding",
          accent: "var(--accent-yellow)",
        },
        {
          label: "Project movement",
          value: "1",
          detail: "Routing to design",
          accent: "var(--accent-blue)",
        },
        {
          label: "Habits checked",
          value: "5 / 7",
          detail: "2 still open",
          accent: "var(--accent-green)",
        },
        {
          label: "Note created",
          value: "1",
          detail: "Today concept note",
          accent: "var(--accent-purple)",
        },
      ],
    },
    decisionsLedger: {
      title: "Decisions Ledger",
      subtitle: "Explicit choices made today.",
      decisions: [
        {
          label: "Decision 1",
          title: "Today mode",
          description:
            "Day Memory Log, not a second cockpit.",
          accent: "var(--accent-orange)",
        },
        {
          label: "Decision 2",
          title: "Route boundary",
          description:
            "Calendar owns time; Today owns day evidence.",
          accent: "var(--accent-cyan)",
        },
        {
          label: "Decision 3",
          title: "Sleep IA",
          description:
            "Sleep stays a signal, not a sidebar page.",
          accent: "var(--accent-green)",
        },
        {
          label: "Decision 4",
          title: "Implementation gate",
          description:
            "Implementation waits for accepted design.",
          accent: "var(--accent-purple)",
        },
      ],
    },
    carryForward: {
      title: "Carry Forward",
      subtitle: "Open loops and tomorrow candidates.",
      items: [
        {
          label: "Open loop",
          description: "Validate Today V2 fit.",
          accent: "var(--accent-green)",
        },
        {
          label: "Tomorrow candidate",
          description:
            "Prepare next Codex prompt after review.",
          accent: "var(--accent-blue)",
        },
        {
          label: "Needs review",
          description:
            "Confirm Today vs Calendar Day Detail.",
          accent: "var(--accent-orange)",
        },
      ],
      firstMove:
        "Compare Today V1/V2 and decide keep/remove.",
    },
    closingReview: {
      title: "Closing Review / Day Closeout",
      subtitle: "Final state, open loops and tomorrow handoff.",
      signals: [
        {
          label: "Evening Mood",
          value: "Content",
          detail: "stress visible, stable",
          accent: "var(--accent-green)",
        },
        {
          label: "Energy today",
          value: "7.6 / 10",
          detail: "usable, not depleted",
          accent: "var(--accent-cyan)",
        },
        {
          label: "Went well",
          value: "Structure clarified",
          detail: "Today stays separate",
          accent: "var(--accent-purple)",
        },
        {
          label: "Stays open",
          value: "Review decision",
          detail: "compare V1/V2",
          accent: "var(--accent-orange)",
        },
      ],
    },
    evidenceArtifacts: {
      title: "Evidence & Artifacts",
      subtitle: "Objects produced or changed today.",
      artifacts: [
        {
          type: "Figma frame",
          title: "Today Page V2 · Day Memory Log",
          detail: "Design artifact",
          accent: "var(--accent-purple)",
        },
        {
          type: "Commit",
          title: "docs: add page design rules",
          detail: "Repo event",
          accent: "var(--accent-cyan)",
        },
        {
          type: "Resource",
          title: "Dashboard V5 design direction",
          detail: "Source",
          accent: "var(--accent-purple)",
        },
        {
          type: "Note",
          title: "Today concept correction",
          detail: "Product note",
          accent: "var(--accent-cyan)",
        },
        {
          type: "Screenshot",
          title: "Dashboard route link pass",
          detail: "Evidence",
          accent: "var(--accent-purple)",
        },
        {
          type: "Journal link",
          title: "Mental note: avoid dashboard duplication",
          detail: "Private",
          accent: "var(--accent-cyan)",
        },
      ],
    },
    contract: {
      text:
        "Today links activity events, decisions, artifacts and day signals. It does not replace Dashboard, Calendar or domain pages.",
      pills: [
        {
          label: "Day Memory",
          accent: "var(--accent-purple)",
        },
        {
          label: "Activity Events",
          accent: "var(--accent-cyan)",
        },
        {
          label: "No duplicate data",
          accent: "var(--accent-green)",
        },
      ],
    },
    pageContract: {
      pageType: "Daily Record / Activity Memory Log",
      primaryPurpose:
        "Reconstruct what the day left behind through events, decisions, artifacts, state changes, and carry-forward.",
      canonicalSource:
        "daily_records for day-level decisions and carry-forward; canonical entities remain in tasks, inbox_items, resources, projects, habits, workouts, meals, mood, sleep, and review_records.",
      sensitiveData:
        "Health, mood, sleep, journal, and work data are compact signals only; no diagnosis or private detail expansion.",
      mainZone: "Activity Stream",
    },
  };
}
