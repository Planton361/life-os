import {
  resolveContentStateMeta,
  type ContentStateMeta,
} from "@/features/content-state";

export type TodayProfileId = "demo" | "empty" | "manual";

export type TodayEmptyState = {
  title: string;
  description: string;
};

export type TodayContentStates = {
  page: ContentStateMeta;
  header: ContentStateMeta;
  activityStream: ContentStateMeta;
  openingReview: ContentStateMeta;
  deltaSummary: ContentStateMeta;
  decisionsArtifacts: ContentStateMeta;
  closingReview: ContentStateMeta;
  carryForward: ContentStateMeta;
};

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

export type TodayActivityStatus =
  | "planned"
  | "current"
  | "completed"
  | "logged"
  | "shifted"
  | "needs_review";

export type TodayActivityEventType =
  | "task"
  | "ritual"
  | "capture"
  | "decision"
  | "artifact"
  | "resource"
  | "health"
  | "review"
  | "project";

export type TodayLinkedEntityType =
  | "task"
  | "inbox_item"
  | "project"
  | "note"
  | "resource"
  | "review";

export type TodayActivityEventViewModel = {
  id: string;
  timeLabel: string;
  dateTime?: string;
  status: TodayActivityStatus;
  statusLabel: string;
  eventType: TodayActivityEventType;
  eventTypeLabel: string;
  title: string;
  description: string;
  sourceLabel: string;
  areaLabel?: string;
  linkedEntityType?: TodayLinkedEntityType;
  linkedEntityId?: string;
  sourceHref?: string;
  sourceActionLabel: string;
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
  profileId: TodayProfileId;
  contentStates: TodayContentStates;
  firstRunNotice?: TodayEmptyState;
  header: TodayHeaderViewModel;
  activityStream: {
    title: "Activity Stream";
    subtitle: string;
    events: TodayActivityEventViewModel[];
    emptyState: TodayEmptyState;
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
    emptyState: TodayEmptyState;
  };
  carryForward: {
    title: "Carry Forward";
    subtitle: string;
    items: TodayCarryForwardItemViewModel[];
    firstMove: string;
    emptyState: TodayEmptyState;
  };
  closingReview: {
    title: "Closing Review / Day Closeout";
    subtitle: string;
    signals: TodayReviewSignalViewModel[];
    emptyState: TodayEmptyState;
  };
  evidenceArtifacts: {
    title: "Evidence & Artifacts";
    subtitle: string;
    artifacts: TodayArtifactViewModel[];
    emptyState: TodayEmptyState;
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

function activitySortValue(event: TodayActivityEventViewModel) {
  return event.dateTime ?? event.timeLabel;
}

const todayStateCapacities = {
  activityStream: 9,
  carryForward: 4,
  closingReview: 4,
  decisionsArtifacts: 6,
  deltaSummary: 6,
  header: 1,
  openingReview: 6,
  page: 9,
} as const;

export function buildTodayContentStates({
  activityEventCount,
  carryForwardCount,
  closingReviewCount,
  decisionsArtifactsCount,
  deltaValueCount,
  openingReviewCount,
}: Readonly<{
  activityEventCount: number;
  carryForwardCount: number;
  closingReviewCount: number;
  decisionsArtifactsCount: number;
  deltaValueCount: number;
  openingReviewCount: number;
}>): TodayContentStates {
  const pageItemCount =
    activityEventCount +
    carryForwardCount +
    closingReviewCount +
    decisionsArtifactsCount +
    deltaValueCount +
    openingReviewCount;

  return {
    activityStream: resolveContentStateMeta({
      capacity: todayStateCapacities.activityStream,
      itemCount: activityEventCount,
    }),
    carryForward: resolveContentStateMeta({
      capacity: todayStateCapacities.carryForward,
      itemCount: carryForwardCount,
    }),
    closingReview: resolveContentStateMeta({
      capacity: todayStateCapacities.closingReview,
      itemCount: closingReviewCount,
    }),
    decisionsArtifacts: resolveContentStateMeta({
      capacity: todayStateCapacities.decisionsArtifacts,
      itemCount: decisionsArtifactsCount,
    }),
    deltaSummary: resolveContentStateMeta({
      capacity: todayStateCapacities.deltaSummary,
      itemCount: deltaValueCount,
    }),
    header: resolveContentStateMeta({
      capacity: todayStateCapacities.header,
      itemCount: pageItemCount > 0 ? 1 : 0,
    }),
    openingReview: resolveContentStateMeta({
      capacity: todayStateCapacities.openingReview,
      itemCount: openingReviewCount,
    }),
    page: resolveContentStateMeta({
      capacity: todayStateCapacities.page,
      itemCount: pageItemCount,
    }),
  };
}

export function getTodayViewModel(): TodayViewModel {
  const activityEvents: TodayActivityEventViewModel[] = [
    {
      id: "morning-baseline-completed",
      timeLabel: "08:14",
      dateTime: "08:14",
      status: "completed",
      statusLabel: "completed",
      eventType: "task",
      eventTypeLabel: "Task completed",
      title: "Morning baseline checked",
      description: "Personal startup task finished and recorded as actual work.",
      sourceLabel: "Tasks",
      areaLabel: "Personal",
      linkedEntityType: "task",
      linkedEntityId: "task-morning-baseline",
      sourceHref: "/tasks/task-morning-baseline",
      sourceActionLabel: "Open source",
      accent: "var(--accent-green)",
    },
    {
      id: "literature-focus-block",
      timeLabel: "09:00",
      dateTime: "09:00",
      status: "current",
      statusLabel: "now",
      eventType: "task",
      eventTypeLabel: "Focus block",
      title: "Revise literature structure",
      description: "Turn open source notes into the next thesis outline pass.",
      sourceLabel: "Tasks",
      areaLabel: "Education",
      linkedEntityType: "task",
      linkedEntityId: "task-literature-structure",
      sourceHref: "/tasks/task-literature-structure",
      sourceActionLabel: "Open source",
      accent: "var(--accent-blue)",
    },
    {
      id: "supabase-question-captured",
      timeLabel: "09:32",
      dateTime: "09:32",
      status: "needs_review",
      statusLabel: "needs review",
      eventType: "capture",
      eventTypeLabel: "Quick Thought captured",
      title: "Supabase RLS setup question",
      description: "Captured to Inbox as a coding question, not a completed task.",
      sourceLabel: "Inbox",
      areaLabel: "Coding",
      linkedEntityType: "inbox_item",
      linkedEntityId: "inbox-supabase-rls",
      sourceHref: "/inbox",
      sourceActionLabel: "Open source",
      accent: "var(--accent-orange)",
    },
    {
      id: "command-center-decision",
      timeLabel: "11:04",
      dateTime: "11:04",
      status: "logged",
      statusLabel: "logged",
      eventType: "decision",
      eventTypeLabel: "Decision made",
      title: "Command Center stays dashboard-only",
      description: "IA boundary recorded so Today remains the day archive.",
      sourceLabel: "Design",
      areaLabel: "IA",
      linkedEntityType: "note",
      linkedEntityId: "note-command-center-boundary",
      sourceActionLabel: "Source link prepared",
      accent: "var(--accent-orange)",
    },
    {
      id: "life-os-project-movement",
      timeLabel: "15:12",
      dateTime: "15:12",
      status: "logged",
      statusLabel: "logged",
      eventType: "project",
      eventTypeLabel: "Project movement",
      title: "Life OS moved from routing to page design",
      description: "Project state changed after the page contract pass.",
      sourceLabel: "Portfolio",
      areaLabel: "Coding",
      linkedEntityType: "project",
      linkedEntityId: "project-life-os",
      sourceHref: "/projects/project-life-os",
      sourceActionLabel: "Open source",
      accent: "var(--accent-blue)",
    },
    {
      id: "run-after-work",
      timeLabel: "17:30",
      dateTime: "17:30",
      status: "planned",
      statusLabel: "planned",
      eventType: "health",
      eventTypeLabel: "Training plan",
      title: "Easy run after work block",
      description:
        "Keep the health signal visible without turning Today into analytics.",
      sourceLabel: "Running Tracker",
      areaLabel: "Health",
      linkedEntityType: "task",
      linkedEntityId: "task-easy-run",
      sourceHref: "/health/running",
      sourceActionLabel: "Open source",
      accent: "var(--accent-red)",
    },
    {
      id: "weekly-route-check",
      timeLabel: "18:45",
      dateTime: "18:45",
      status: "shifted",
      statusLabel: "shifted",
      eventType: "task",
      eventTypeLabel: "Task shifted",
      title: "Check Calendar review panel copy",
      description: "Moved to tomorrow so the Activity Stream can stay focused.",
      sourceLabel: "Tasks",
      areaLabel: "Review",
      linkedEntityType: "task",
      linkedEntityId: "task-calendar-review-copy",
      sourceHref: "/tasks/task-calendar-review-copy",
      sourceActionLabel: "Open source",
      accent: "var(--accent-orange)",
    },
    {
      id: "dashboard-route-artifact",
      timeLabel: "19:10",
      dateTime: "19:10",
      status: "logged",
      statusLabel: "logged",
      eventType: "artifact",
      eventTypeLabel: "Artifact saved",
      title: "Dashboard route link pass",
      description: "Screenshot evidence saved for later review.",
      sourceLabel: "Evidence",
      areaLabel: "Artifact",
      linkedEntityType: "resource",
      linkedEntityId: "artifact-dashboard-route-link",
      sourceHref: "/resources",
      sourceActionLabel: "Open source",
      accent: "var(--accent-cyan)",
    },
    {
      id: "daily-review-opened",
      timeLabel: "21:30",
      dateTime: "21:30",
      status: "logged",
      statusLabel: "open",
      eventType: "review",
      eventTypeLabel: "Review started",
      title: "Daily Review panel opened",
      description: "Review is started, with carry-forward handled below the stream.",
      sourceLabel: "Review",
      areaLabel: "Today",
      linkedEntityType: "review",
      linkedEntityId: "review-daily-2026-06-09",
      sourceHref: "/review/daily",
      sourceActionLabel: "Open source",
      accent: "var(--accent-purple)",
    },
  ];

  activityEvents.sort((a, b) =>
    activitySortValue(a).localeCompare(activitySortValue(b)),
  );

  return {
    profileId: "demo",
    contentStates: buildTodayContentStates({
      activityEventCount: activityEvents.length,
      carryForwardCount: 3,
      closingReviewCount: 4,
      decisionsArtifactsCount: 10,
      deltaValueCount: 6,
      openingReviewCount: 6,
    }),
    header: {
      eyebrow: "DAY MEMORY LOG",
      title: "Today",
      summary:
        "Daily record of captures, decisions, artifacts, state changes and carry-forward.",
      dateLabel: "Tuesday, 09 June · Work / Study Day",
      statusPills: [
        {
          label: "9 events",
          accent: "var(--accent-cyan)",
        },
        {
          label: "1 planned",
          accent: "var(--accent-blue)",
        },
        {
          label: "1 current",
          accent: "var(--accent-purple)",
        },
        {
          label: "5 logged",
          accent: "var(--accent-green)",
        },
        {
          label: "1 shifted",
          accent: "var(--accent-orange)",
        },
      ],
    },
    activityStream: {
      title: "Activity Stream",
      subtitle:
        "Timeline of planned, current and logged activity.",
      events: activityEvents,
      emptyState: {
        title: "Noch keine Tagesereignisse",
        description:
          "Geplante Aufgaben, aktuelle Blöcke und geloggte Entscheidungen erscheinen hier.",
      },
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
          value: "1",
          detail: "From task events",
          accent: "var(--accent-green)",
        },
        {
          label: "Tasks still planned",
          value: "3",
          detail: "Open today",
          accent: "var(--accent-blue)",
        },
        {
          label: "Shifted tasks",
          value: "1",
          detail: "Moved forward",
          accent: "var(--accent-orange)",
        },
        {
          label: "Inbox captures",
          value: "1",
          detail: "Needs review",
          accent: "var(--accent-cyan)",
        },
        {
          label: "Artifacts logged",
          value: "1",
          detail: "Evidence linked",
          accent: "var(--accent-yellow)",
        },
        {
          label: "Review opened",
          value: "1",
          detail: "Carry-forward pending",
          accent: "var(--accent-purple)",
        },
      ],
    },
    decisionsLedger: {
      title: "Decisions Ledger",
      subtitle: "Explicit choices made today.",
      emptyState: {
        title: "Noch keine Entscheidungen oder Artefakte",
        description:
          "Gespeicherte Entscheidungen, Screenshots, Notizen oder Links erscheinen hier.",
      },
      decisions: [
        {
          label: "Decision 1",
          title: "Today mode",
          description: "Day Memory Log, not a second cockpit.",
          accent: "var(--accent-orange)",
        },
        {
          label: "Decision 2",
          title: "Route boundary",
          description: "Calendar owns time; Today owns day evidence.",
          accent: "var(--accent-cyan)",
        },
        {
          label: "Decision 3",
          title: "Sleep IA",
          description: "Sleep stays a signal, not a sidebar page.",
          accent: "var(--accent-green)",
        },
        {
          label: "Decision 4",
          title: "Implementation gate",
          description: "Implementation waits for accepted design.",
          accent: "var(--accent-purple)",
        },
      ],
    },
    carryForward: {
      title: "Carry Forward",
      subtitle: "Open loops and tomorrow candidates.",
      emptyState: {
        title: "Kein Carry Forward",
        description:
          "Offene Aufgaben und nächste Bewegungen erscheinen hier nach echter Tagesarbeit.",
      },
      items: [
        {
          label: "Open loop",
          description: "Validate Today V2 fit.",
          accent: "var(--accent-green)",
        },
        {
          label: "Tomorrow candidate",
          description: "Prepare next Codex prompt after review.",
          accent: "var(--accent-blue)",
        },
        {
          label: "Needs review",
          description: "Confirm Today vs Calendar Day Detail.",
          accent: "var(--accent-orange)",
        },
      ],
      firstMove: "Compare Today V1/V2 and decide keep/remove.",
    },
    closingReview: {
      title: "Closing Review / Day Closeout",
      subtitle: "Final state, open loops and tomorrow handoff.",
      emptyState: {
        title: "Closing Review nicht gestartet",
        description:
          "Der Tagesabschluss bleibt sichtbar, bis ein Review gespeichert wird.",
      },
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
      emptyState: {
        title: "Noch keine Artefakte",
        description:
          "Gespeicherte Screenshots, Notizen, Links oder Projektbewegungen erscheinen hier.",
      },
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
      text: "Today links activity events, decisions, artifacts and day signals. It does not replace Dashboard, Calendar or domain pages.",
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
