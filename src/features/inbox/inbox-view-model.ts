import {
  resolveContentStateMeta,
  type ContentStateMeta,
} from "@/features/content-state";

export type InboxStage = "raw" | "clarify" | "review" | "ready";

export type InboxProfileId = "demo" | "empty" | "manual";

export type InboxCaptureType =
  | "task"
  | "note"
  | "question"
  | "idea"
  | "resource"
  | "agent"
  | "decision";

export type InboxOutcomeRoute =
  | "add_to_existing"
  | "create_new"
  | "standalone_task"
  | "knowledge_resource";

export type InboxSignal = {
  label: string;
  value: string;
  sublabel: string;
  accent: string;
};

export type InboxQueueItem = {
  id: string;
  title: string;
  stage: InboxStage;
  type: InboxCaptureType;
  next: string;
  age: string;
  note: string;
  accent: string;
  active?: boolean;
};

export type InboxClarificationField = {
  label: string;
  value: string;
};

export type InboxPlanningSignal = {
  label: string;
  value: string;
  source: string;
  accent: string;
};

export type InboxOutcomeOption = {
  id: InboxOutcomeRoute;
  title: string;
  description: string;
  examples: string;
  accent: string;
};

export type InboxAISuggestion = {
  label: string;
  value: string;
  accent: string;
};

export type InboxChecklistItem = {
  label: string;
  state: "done" | "missing";
};

export type InboxRelatedContextItem = {
  typeArea: string;
  name: string;
  meta: string;
  score: string;
  accent: string;
};

export type InboxEmptyState = {
  title: string;
  description: string;
};

export type InboxQuickCaptureState = {
  enabled: boolean;
  title: string;
  description: string;
  disabledReason?: string;
};

export type InboxContentStates = {
  page: ContentStateMeta;
  header: ContentStateMeta;
  queue: ContentStateMeta;
  activeItem: ContentStateMeta;
  aiAssistant: ContentStateMeta;
  checklist: ContentStateMeta;
  relatedContext: ContentStateMeta;
};

export type InboxViewModel = {
  profileId: InboxProfileId;
  contentStates: InboxContentStates;
  title: "Inbox";
  kicker: string;
  purpose: string;
  modePills: string[];
  signals: InboxSignal[];
  filters: string[];
  queue: InboxQueueItem[];
  queueEmptyState: InboxEmptyState;
  quickCapture: InboxQuickCaptureState;
  activeItem: {
    hasSelection: boolean;
    title: string;
    stage: string;
    type: string;
    originalCapture: string;
    source: string;
    fields: InboxClarificationField[];
    planningSignals: InboxPlanningSignal[];
    actionsEnabled: boolean;
    emptyState: InboxEmptyState;
  };
  outcome: {
    title: "Outcome route";
    description: string;
    options: InboxOutcomeOption[];
    actionsEnabled: boolean;
  };
  aiAssistant: {
    title: string;
    mode: string;
    description: string;
    planning: InboxAISuggestion[];
    outcomes: string[];
    placeholder: string;
    canApply: boolean;
    emptyState: InboxEmptyState;
  };
  checklist: {
    title: string;
    progress: string;
    items: InboxChecklistItem[];
  };
  relatedContext: {
    title: string;
    mode: string;
    placeholder: string;
    items: InboxRelatedContextItem[];
    actionsEnabled: boolean;
    emptyState: InboxEmptyState;
  };
};

const stageLabels: Record<InboxStage, string> = {
  raw: "Raw",
  clarify: "Clarify",
  review: "Review",
  ready: "Ready",
};

const typeLabels: Record<InboxCaptureType, string> = {
  task: "Task",
  note: "Note",
  question: "Question",
  idea: "Idea",
  resource: "Resource",
  agent: "Agent",
  decision: "Decision",
};

export function getInboxStageLabel(stage: InboxStage) {
  return stageLabels[stage];
}

export function getInboxCaptureTypeLabel(type: InboxCaptureType) {
  return typeLabels[type];
}

const inboxStateCapacities = {
  activeItem: 1,
  aiAssistant: 4,
  checklist: 4,
  header: 4,
  queue: 8,
  relatedContext: 5,
} as const;

export function buildInboxContentStates({
  aiSuggestionCount,
  checklistDoneCount,
  hasActiveItem,
  queueCount,
  relatedContextCount,
}: Readonly<{
  aiSuggestionCount: number;
  checklistDoneCount: number;
  hasActiveItem: boolean;
  queueCount: number;
  relatedContextCount: number;
}>): InboxContentStates {
  return {
    activeItem: resolveContentStateMeta({
      capacity: inboxStateCapacities.activeItem,
      hasPrimaryValue: hasActiveItem,
      itemCount: hasActiveItem ? 1 : 0,
    }),
    aiAssistant: resolveContentStateMeta({
      capacity: inboxStateCapacities.aiAssistant,
      itemCount: aiSuggestionCount,
    }),
    checklist: resolveContentStateMeta({
      capacity: inboxStateCapacities.checklist,
      itemCount: checklistDoneCount,
    }),
    header: resolveContentStateMeta({
      capacity: inboxStateCapacities.header,
      itemCount: queueCount,
    }),
    page: resolveContentStateMeta({
      capacity: inboxStateCapacities.queue,
      itemCount: queueCount,
    }),
    queue: resolveContentStateMeta({
      capacity: inboxStateCapacities.queue,
      itemCount: queueCount,
    }),
    relatedContext: resolveContentStateMeta({
      capacity: inboxStateCapacities.relatedContext,
      itemCount: relatedContextCount,
    }),
  };
}

export function getInboxViewModel(): InboxViewModel {
  return {
    profileId: "demo",
    contentStates: buildInboxContentStates({
      aiSuggestionCount: 4,
      checklistDoneCount: 4,
      hasActiveItem: true,
      queueCount: 8,
      relatedContextCount: 5,
    }),
    title: "Inbox",
    kicker: "CAPTURE & CLARIFY",
    purpose:
      "Clarify captured thoughts until each item has enough context, a next action and one standalone outcome.",
    modePills: ["Queue + focused item", "Standalone outcomes"],
    signals: [
      {
        label: "Open",
        value: "5",
        sublabel: "waiting",
        accent: "var(--accent-blue)",
      },
      {
        label: "Clarify",
        value: "3",
        sublabel: "need info",
        accent: "var(--accent-orange)",
      },
      {
        label: "Ready",
        value: "2",
        sublabel: "exit clear",
        accent: "var(--accent-green)",
      },
      {
        label: "Review",
        value: "1",
        sublabel: "last step",
        accent: "var(--accent-red)",
      },
    ],
    filters: ["All", "Raw", "Clarify", "Review", "Ready"],
    queue: [
      {
        id: "data-access-setup-question",
        title: "Data access setup question",
        stage: "clarify",
        type: "question",
        next: "Choose one standalone outcome.",
        age: "Today",
        note: "Data access clarification continues.",
        accent: "var(--accent-orange)",
        active: true,
      },
      {
        id: "daily-review-template-cleanup",
        title: "Daily review template cleanup",
        stage: "ready",
        type: "task",
        next: "Convert or keep clarified.",
        age: "2d",
        note: "Convert or keep clarified.",
        accent: "var(--accent-green)",
      },
      {
        id: "article-on-calm-dashboards",
        title: "Article on calm dashboards",
        stage: "raw",
        type: "resource",
        next: "Review source value.",
        age: "Today",
        note: "Start type and area.",
        accent: "var(--accent-blue)",
      },
      {
        id: "agent-context-for-sidebar-qa",
        title: "Agent context for Sidebar QA",
        stage: "review",
        type: "agent",
        next: "Resolve safety note.",
        age: "1d",
        note: "Resolve safety note.",
        accent: "var(--accent-red)",
      },
      {
        id: "resource-page-candidate",
        title: "Resource page candidate",
        stage: "ready",
        type: "resource",
        next: "Convert or keep clarified.",
        age: "3d",
        note: "Ready to route.",
        accent: "var(--accent-green)",
      },
      {
        id: "idea-weekly-shutdown-ritual",
        title: "Idea: weekly shutdown ritual",
        stage: "clarify",
        type: "idea",
        next: "Ask missing context.",
        age: "4d",
        note: "Needs concrete outcome.",
        accent: "var(--accent-purple)",
      },
      {
        id: "research-note-from-lecture",
        title: "Research note from lecture",
        stage: "raw",
        type: "note",
        next: "Classify source.",
        age: "5d",
        note: "Needs source review.",
        accent: "var(--accent-blue)",
      },
      {
        id: "possible-purchase-idea",
        title: "Possible purchase idea",
        stage: "clarify",
        type: "decision",
        next: "Decide whether wishlist.",
        age: "1w",
        note: "Needs boundary.",
        accent: "var(--accent-yellow)",
      },
    ],
    queueEmptyState: {
      title: "Inbox ist leer",
      description: "Capture Gedanken, Aufgaben oder Fragen, wenn sie entstehen.",
    },
    quickCapture: {
      enabled: false,
      title: "Quick Capture",
      description: "Neue Eintraege werden im Manual-Profil lokal gespeichert.",
      disabledReason: "Im Demo-Profil ist Quick Capture nur als Referenz sichtbar.",
    },
    activeItem: {
      hasSelection: true,
      title: "Data access setup question",
      stage: "Clarify",
      type: "Question",
      originalCapture:
        "Need to decide how data access and agent context should work before I build the Inbox flow.",
      source: "Quick Capture",
      fields: [
        {
          label: "Clean Title",
          value: "Data access setup question",
        },
        {
          label: "Description / Context",
          value:
            "Clarify how inbox_items, AI context and conversion lineage should be handled before implementation starts.",
        },
        {
          label: "Next Action",
          value:
            "Define storage boundary and review rules before turning this into build work.",
        },
        {
          label: "Missing Info",
          value:
            "Which standalone outcome fits: add to existing, create new, task, or knowledge/resource?",
        },
      ],
      planningSignals: [
        {
          label: "Area",
          value: "Coding & Agents",
          source: "AI suggestion",
          accent: "var(--accent-blue)",
        },
        {
          label: "Priority",
          value: "P1",
          source: "AI suggestion",
          accent: "var(--accent-orange)",
        },
        {
          label: "Effort",
          value: "45 min",
          source: "AI suggestion",
          accent: "var(--accent-green)",
        },
        {
          label: "Energy",
          value: "High focus",
          source: "AI suggestion",
          accent: "var(--accent-blue)",
        },
      ],
      actionsEnabled: false,
      emptyState: {
        title: "Kein Eintrag ausgewählt",
        description:
          "Wähle links einen Eintrag aus oder erfasse einen neuen Gedanken.",
      },
    },
    outcome: {
      title: "Outcome route",
      description:
        "Choose what this item becomes next. Each option opens its own complete flow.",
      actionsEnabled: false,
      options: [
        {
          id: "add_to_existing",
          title: "Add to existing",
          description:
            "Attach this item to an existing object selected inside the route.",
          examples: "Project · Goal · Skill · Note",
          accent: "var(--accent-blue)",
        },
        {
          id: "create_new",
          title: "Create new",
          description: "Create a new object directly from this inbox item.",
          examples: "Project · Goal · Skill · Idea",
          accent: "var(--accent-green)",
        },
        {
          id: "standalone_task",
          title: "Standalone task",
          description:
            "Create one independent task without portfolio dependency.",
          examples: "Task only",
          accent: "var(--accent-orange)",
        },
        {
          id: "knowledge_resource",
          title: "Knowledge / resource",
          description:
            "Store as knowledge, note, idea or external reference.",
          examples: "Note · Resource · Idea",
          accent: "var(--accent-purple)",
        },
      ],
    },
    aiAssistant: {
      title: "AI Assistant",
      mode: "discuss item",
      description: "Suggestions update as content changes.",
      planning: [
        {
          label: "Area",
          value: "Coding",
          accent: "var(--accent-blue)",
        },
        {
          label: "Priority",
          value: "P1",
          accent: "var(--accent-orange)",
        },
        {
          label: "Effort",
          value: "45 min",
          accent: "var(--accent-green)",
        },
        {
          label: "Energy",
          value: "High",
          accent: "var(--accent-blue)",
        },
      ],
      outcomes: [
        "Add to existing: Life OS MVP",
        "Knowledge possible",
        "Task possible",
      ],
      placeholder:
        "Ask which outcome fits, what context is missing, or why a related item was suggested...",
      canApply: false,
      emptyState: {
        title: "Noch keine Empfehlung möglich",
        description: "Wähle einen echten Eintrag aus, bevor Vorschläge entstehen.",
      },
    },
    checklist: {
      title: "Decision Checklist",
      progress: "4 / 6 ready",
      items: [
        {
          label: "Description added",
          state: "done",
        },
        {
          label: "Planning signals checked",
          state: "done",
        },
        {
          label: "Next action set",
          state: "done",
        },
        {
          label: "Review resolved",
          state: "done",
        },
        {
          label: "Outcome route selected",
          state: "missing",
        },
      ],
    },
    relatedContext: {
      title: "Related Context",
      mode: "semantic search",
      placeholder: "Search projects, goals, skills, notes...",
      actionsEnabled: false,
      emptyState: {
        title: "Kein verwandter Kontext",
        description:
          "Sobald passende Projekte, Ziele oder Ressourcen existieren, erscheinen sie hier.",
      },
      items: [
        {
          typeArea: "Project · Coding",
          name: "Life OS MVP",
          meta: "active · daily flow",
          score: "92%",
          accent: "var(--accent-blue)",
        },
        {
          typeArea: "Goal · System",
          name: "Stable MVP daily flow",
          meta: "MVP · current phase",
          score: "86%",
          accent: "var(--accent-green)",
        },
        {
          typeArea: "Skill · Coding",
          name: "AI Agent Workflow",
          meta: "learning track · prompts",
          score: "78%",
          accent: "var(--accent-purple)",
        },
        {
          typeArea: "Note · System",
          name: "Data model notes",
          meta: "inbox_items · lineage",
          score: "72%",
          accent: "var(--accent-cyan)",
        },
        {
          typeArea: "Resource · Design",
          name: "Calm dashboard article",
          meta: "design reference",
          score: "68%",
          accent: "var(--accent-yellow)",
        },
      ],
    },
  };
}
