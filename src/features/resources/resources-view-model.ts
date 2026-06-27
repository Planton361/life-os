import { resolveContentStateMeta } from "@/features/content-state";
import type {
  RecentLearning,
  ResourceProfileId,
  ResourceAiSuggestion,
  ResourceArea,
  ResourceAreaMeta,
  ResourceCluster,
  ResourceItem,
  ResourceOption,
  ResourceRelation,
  ResourceReviewQueueItem,
  ResourceReviewState,
  ResourceReviewStateMeta,
  ResourceStatus,
  ResourceStatusMeta,
  ResourceSummaryStat,
  ResourceType,
  ResourceTypeMeta,
  ResourceViewMode,
  ResourcesViewModel,
} from "./types";

export const resourceTypeMeta: Record<ResourceType, ResourceTypeMeta> = {
  note: {
    label: "Note",
    shortLabel: "Note",
    accent: "var(--accent-purple)",
  },
  learning: {
    label: "Learning",
    shortLabel: "Learning",
    accent: "var(--accent-blue)",
  },
  prompt: {
    label: "Prompt Pattern",
    shortLabel: "Prompt",
    accent: "var(--accent-orange)",
  },
  research: {
    label: "Research Note",
    shortLabel: "Research",
    accent: "var(--accent-blue)",
  },
  link: {
    label: "Source Link",
    shortLabel: "Link",
    accent: "var(--accent-cyan)",
  },
  source: {
    label: "Source",
    shortLabel: "Source",
    accent: "var(--accent-cyan)",
  },
  snippet: {
    label: "Snippet",
    shortLabel: "Snippet",
    accent: "var(--accent-green)",
  },
  decision: {
    label: "Decision Note",
    shortLabel: "Decision",
    accent: "var(--accent-yellow)",
  },
};

export const resourceStatusMeta: Record<ResourceStatus, ResourceStatusMeta> = {
  raw: {
    label: "Raw",
    accent: "var(--text-muted)",
  },
  review_needed: {
    label: "Review Needed",
    accent: "var(--accent-orange)",
  },
  processed: {
    label: "Processed",
    accent: "var(--accent-cyan)",
  },
  reusable: {
    label: "Reusable",
    accent: "var(--accent-green)",
  },
  linked: {
    label: "Linked",
    accent: "var(--accent-blue)",
  },
  archived: {
    label: "Archived",
    accent: "var(--text-faint)",
  },
};

export const resourceAreaMeta: Record<ResourceArea, ResourceAreaMeta> = {
  education: {
    label: "Education",
    accent: "var(--accent-blue)",
  },
  work: {
    label: "Work",
    accent: "var(--accent-green)",
  },
  coding: {
    label: "Coding & Agents",
    accent: "var(--accent-orange)",
  },
  health: {
    label: "Health",
    accent: "var(--accent-red)",
  },
  nutrition: {
    label: "Nutrition",
    accent: "var(--accent-yellow)",
  },
  personal: {
    label: "Personal",
    accent: "var(--accent-purple)",
  },
  review: {
    label: "Review",
    accent: "var(--accent-cyan)",
  },
  system: {
    label: "System",
    accent: "var(--text-muted)",
  },
};

export const resourceReviewStateMeta: Record<
  ResourceReviewState,
  ResourceReviewStateMeta
> = {
  needs_extraction: {
    label: "Needs extraction",
    accent: "var(--accent-orange)",
  },
  needs_linking: {
    label: "Needs linking",
    accent: "var(--accent-cyan)",
  },
  ready_to_reuse: {
    label: "Ready to reuse",
    accent: "var(--accent-green)",
  },
  source_checked: {
    label: "Source checked",
    accent: "var(--accent-blue)",
  },
  pattern_candidate: {
    label: "Pattern candidate",
    accent: "var(--accent-orange)",
  },
  archived_reference: {
    label: "Archived reference",
    accent: "var(--text-muted)",
  },
};

const resources: ResourceItem[] = [
  {
    id: "literature-review-search-strategy",
    title: "Literature Review Search Strategy",
    type: "research",
    area: "education",
    status: "review_needed",
    source: "Scientific Work / Literature",
    linkedContext: "Masterarbeit / Literature chapter",
    linkedContexts: [
      {
        id: "scientific-work-masterarbeit",
        title: "Masterarbeit",
        kind: "scientific_work",
        detail: "Scientific Work",
        accent: "var(--accent-blue)",
      },
      {
        id: "project-literature-chapter",
        title: "Literature chapter",
        kind: "project",
        detail: "Project context",
        accent: "var(--accent-blue)",
      },
      {
        id: "skill-research-methodology",
        title: "Research Methodology",
        kind: "skill",
        detail: "Skill evidence",
        accent: "var(--accent-cyan)",
      },
    ],
    topic: "Literature review provenance",
    clusterId: "masterarbeit-literature",
    lastTouched: "Today 10:20",
    reviewState: "needs_extraction",
    summary:
      "Search strings, inclusion rules and source channels for narrowing the thesis literature review.",
    keyLearning:
      "Search strategy is reusable only when each result bucket has a reason to keep, reject or revisit it.",
    nextUse: "Extract key claims for the literature chapter outline.",
    relatedResources: [
      {
        title: "Masterarbeit Argumentation Notes",
        relation: "feeds claims",
      },
      {
        title: "Figma Layout Rules for Life OS Pages",
        relation: "same review pattern",
      },
    ],
    actions: [
      {
        label: "Extract claims",
        detail: "Turn raw search notes into source-backed claim bullets.",
      },
      {
        label: "Link sources",
        detail: "Connect the usable papers to Scientific Work.",
      },
    ],
  },
  {
    id: "codex-prompt-pattern-design-to-implementation",
    title: "Codex Prompt Pattern: Design to Implementation",
    type: "prompt",
    area: "coding",
    status: "reusable",
    source: "Codex session note",
    linkedContext: "Life OS / Agent Workflow",
    linkedContexts: [
      {
        id: "project-life-os-app",
        title: "Life OS App",
        kind: "project",
        detail: "Implementation context",
        accent: "var(--accent-blue)",
      },
      {
        id: "skill-codex-agent-workflow",
        title: "Codex Agent Workflow",
        kind: "skill",
        detail: "Reusable prompt skill",
        accent: "var(--accent-orange)",
      },
      {
        id: "area-coding-agents",
        title: "Coding / Agents",
        kind: "area",
        detail: "Area view",
        accent: "var(--accent-orange)",
      },
    ],
    topic: "Agent prompt patterns",
    clusterId: "ai-agent-workflow",
    lastTouched: "Yesterday 18:40",
    reviewState: "pattern_candidate",
    summary:
      "Prompt structure for moving from accepted Figma frames into scoped code tasks with validation.",
    keyLearning:
      "A design-to-code prompt needs source files, non-goals, route ownership and validation before visual polish.",
    nextUse: "Reuse as a Prompt Vault template for future accepted page frames.",
    relatedResources: [
      {
        title: "AI Agent Workflow Learnings",
        relation: "expands workflow",
      },
      {
        title: "Figma Layout Rules for Life OS Pages",
        relation: "shares constraints",
      },
    ],
    actions: [
      {
        label: "Save pattern",
        detail: "Promote into Prompt Vault with variables and checklist.",
      },
      {
        label: "Add example",
        detail: "Attach the Resources page implementation prompt.",
      },
    ],
  },
  {
    id: "figma-layout-rules-life-os-pages",
    title: "Figma Layout Rules for Life OS Pages",
    type: "learning",
    area: "system",
    status: "linked",
    source: "Design docs / Figma handoff",
    linkedContext: "Design System / Page Rules",
    linkedContexts: [
      {
        id: "project-life-os-page-design",
        title: "Life OS Page Design",
        kind: "project",
        detail: "Page workbench rules",
        accent: "var(--accent-cyan)",
      },
      {
        id: "note-design-tokens",
        title: "Design Tokens",
        kind: "note",
        detail: "V5 source note",
        accent: "var(--accent-cyan)",
      },
      {
        id: "skill-ui-implementation",
        title: "UI Implementation",
        kind: "skill",
        detail: "Design-to-code guardrail",
        accent: "var(--accent-blue)",
      },
    ],
    topic: "Life OS page design",
    clusterId: "life-os-design-system",
    lastTouched: "Yesterday 16:05",
    reviewState: "ready_to_reuse",
    summary:
      "Page rules for carrying V5 into new workbench and area pages without copying the dashboard grid.",
    keyLearning:
      "A new page should inherit V5 posture, not duplicate Today Agenda, Command Center or dashboard widgets.",
    nextUse: "Use as a review checklist for Portfolio, Resources and Area pages.",
    relatedResources: [
      {
        title: "Codex Prompt Pattern: Design to Implementation",
        relation: "prompts implementation",
      },
      {
        title: "React Query Decision Note",
        relation: "future phase boundary",
      },
    ],
    actions: [
      {
        label: "Convert to rule",
        detail: "Keep the reusable part in design documentation.",
      },
    ],
  },
  {
    id: "masterarbeit-argumentation-notes",
    title: "Masterarbeit Argumentation Notes",
    type: "note",
    area: "education",
    status: "review_needed",
    source: "Education / Scientific Work",
    linkedContext: "Masterarbeit / Argumentation",
    linkedContexts: [
      {
        id: "scientific-work-masterarbeit",
        title: "Masterarbeit",
        kind: "scientific_work",
        detail: "Scientific Work",
        accent: "var(--accent-blue)",
      },
      {
        id: "project-argumentation-outline",
        title: "Argumentation outline",
        kind: "project",
        detail: "Thesis section planning",
        accent: "var(--accent-blue)",
      },
      {
        id: "note-claim-map",
        title: "Claim map",
        kind: "note",
        detail: "Evidence and limitation notes",
        accent: "var(--accent-purple)",
      },
    ],
    topic: "Thesis claim structure",
    clusterId: "masterarbeit-literature",
    lastTouched: "Mon 21:15",
    reviewState: "needs_extraction",
    summary:
      "Working notes for thesis claims, counterpoints and section ordering.",
    keyLearning:
      "Argument notes become useful when each claim names evidence, limitation and placement.",
    nextUse: "Extract the strongest claims and attach paper references.",
    relatedResources: [
      {
        title: "Literature Review Search Strategy",
        relation: "source evidence",
      },
    ],
    actions: [
      {
        label: "Extract key claims",
        detail: "Move reusable claims into the thesis outline.",
      },
      {
        label: "Mark unresolved",
        detail: "Flag claims that need evidence before writing.",
      },
    ],
  },
  {
    id: "fi-work-notes-meeting-patterns",
    title: "FI Work Notes: Meeting Patterns",
    type: "note",
    area: "work",
    status: "processed",
    source: "Work Log / Meetings",
    linkedContext: "Work / Meeting follow-ups",
    linkedContexts: [
      {
        id: "wiki-fi-meetings",
        title: "FI Meeting Wiki",
        kind: "wiki",
        detail: "Work-specific knowledge",
        accent: "var(--accent-green)",
      },
      {
        id: "task-meeting-follow-ups",
        title: "Meeting follow-ups",
        kind: "task",
        detail: "Promises and blockers",
        accent: "var(--accent-green)",
      },
      {
        id: "project-fi-work-context",
        title: "FI Work Context",
        kind: "project",
        detail: "Work project context",
        accent: "var(--accent-green)",
      },
    ],
    topic: "Meeting decision loops",
    clusterId: "work-meeting-knowledge",
    lastTouched: "Mon 14:35",
    reviewState: "needs_linking",
    summary:
      "Observed meeting patterns, recurring follow-ups and decision loops from FI work notes.",
    keyLearning:
      "Meeting notes should preserve promises, blockers and context separately so follow-ups can become tasks.",
    nextUse: "Link recurring patterns to Work Log and future meeting templates.",
    relatedResources: [
      {
        title: "Weekly Review Reflection: Focus Drift",
        relation: "reveals drift",
      },
    ],
    actions: [
      {
        label: "Link to Work Log",
        detail: "Connect processed notes to the work timeline.",
      },
    ],
  },
  {
    id: "react-query-decision-note",
    title: "React Query Decision Note",
    type: "decision",
    area: "coding",
    status: "processed",
    source: "Architecture note",
    linkedContext: "Life OS / Data fetching later",
    linkedContexts: [
      {
        id: "project-life-os-app",
        title: "Life OS App",
        kind: "project",
        detail: "Future data fetching",
        accent: "var(--accent-blue)",
      },
      {
        id: "repository-life-os",
        title: "life-os-app",
        kind: "repository",
        detail: "Next.js repository",
        accent: "var(--accent-orange)",
      },
      {
        id: "skill-nextjs-architecture",
        title: "Next.js Architecture",
        kind: "skill",
        detail: "Phase 3 decision guard",
        accent: "var(--accent-blue)",
      },
    ],
    topic: "Phase 3 data fetching",
    clusterId: "life-os-design-system",
    lastTouched: "Sun 11:10",
    reviewState: "source_checked",
    summary:
      "Decision note for when a client data fetching library becomes justified after static MVP work.",
    keyLearning:
      "A new library is justified by repeated async cache needs, not by static page skeletons.",
    nextUse: "Revisit in Phase 3 when Supabase-backed resources need caching.",
    relatedResources: [
      {
        title: "AI Agent Workflow Learnings",
        relation: "guards scope",
      },
    ],
    actions: [
      {
        label: "Keep decision",
        detail: "Reference when future CRUD work proposes client cache tooling.",
      },
    ],
  },
  {
    id: "ai-agent-workflow-learnings",
    title: "AI Agent Workflow Learnings",
    type: "learning",
    area: "coding",
    status: "reusable",
    source: "AI Workflow / Codex sessions",
    linkedContext: "Coding / Agents",
    linkedContexts: [
      {
        id: "skill-codex-agent-workflow",
        title: "Codex Agent Workflow",
        kind: "skill",
        detail: "Agent operating rules",
        accent: "var(--accent-orange)",
      },
      {
        id: "note-ai-workflow",
        title: "AI Workflow docs",
        kind: "note",
        detail: "Source-of-truth reading",
        accent: "var(--accent-cyan)",
      },
      {
        id: "area-coding-agents",
        title: "Coding / Agents",
        kind: "area",
        detail: "Area view",
        accent: "var(--accent-orange)",
      },
    ],
    topic: "Agent work quality",
    clusterId: "ai-agent-workflow",
    lastTouched: "Fri 19:30",
    reviewState: "ready_to_reuse",
    summary:
      "Operational lessons for reading source-of-truth docs, scoping changes and validating generated code.",
    keyLearning:
      "Agent work improves when each turn separates source reading, allowed files, non-goals and validation.",
    nextUse: "Fold into Codex prompt patterns and review workflow notes.",
    relatedResources: [
      {
        title: "Codex Prompt Pattern: Design to Implementation",
        relation: "prompt variant",
      },
    ],
    actions: [
      {
        label: "Turn into prompt",
        detail: "Create a reusable checklist for future agent work.",
      },
    ],
  },
  {
    id: "nutrition-habit-insight",
    title: "Nutrition Habit Insight",
    type: "learning",
    area: "nutrition",
    status: "linked",
    source: "Nutrition / Habit note",
    linkedContext: "Health & Nutrition",
    linkedContexts: [
      {
        id: "area-nutrition",
        title: "Nutrition",
        kind: "area",
        detail: "Meal planning context",
        accent: "var(--accent-yellow)",
      },
      {
        id: "goal-evening-energy",
        title: "Evening energy",
        kind: "goal",
        detail: "Calm habit adjustment",
        accent: "var(--accent-orange)",
      },
      {
        id: "note-meal-prep-friction",
        title: "Meal prep friction",
        kind: "note",
        detail: "Habit observation",
        accent: "var(--accent-purple)",
      },
    ],
    topic: "Meal prep friction",
    clusterId: "nutrition-habit-learnings",
    lastTouched: "Thu 08:50",
    reviewState: "ready_to_reuse",
    summary:
      "Small observation about meal prep friction and how it affects evening energy.",
    keyLearning:
      "Nutrition notes should become calm habit adjustments, not pressure or diagnosis.",
    nextUse: "Link to Meal Planner once nutrition flows move beyond skeletons.",
    relatedResources: [
      {
        title: "Weekly Review Reflection: Focus Drift",
        relation: "weekly pattern",
      },
    ],
    actions: [
      {
        label: "Keep as insight",
        detail: "Use as a future nutrition planning hint.",
      },
    ],
  },
  {
    id: "weekly-review-reflection-focus-drift",
    title: "Weekly Review Reflection: Focus Drift",
    type: "note",
    area: "review",
    status: "raw",
    source: "Weekly Review",
    linkedContext: "Review / Open loops",
    linkedContexts: [
      {
        id: "note-weekly-review",
        title: "Weekly Review",
        kind: "note",
        detail: "Review record source",
        accent: "var(--accent-cyan)",
      },
      {
        id: "goal-focus-stability",
        title: "Focus stability",
        kind: "goal",
        detail: "Open-loop reduction",
        accent: "var(--accent-purple)",
      },
      {
        id: "task-close-work-loops",
        title: "Close work loops",
        kind: "task",
        detail: "Review follow-up",
        accent: "var(--accent-green)",
      },
    ],
    topic: "Review open loops",
    clusterId: "work-meeting-knowledge",
    lastTouched: "Wed 22:00",
    reviewState: "needs_extraction",
    summary:
      "Reflection about focus drifting when unprocessed notes and open work loops stay disconnected.",
    keyLearning:
      "Review notes need conversion into next uses, resource links or archive decisions.",
    nextUse: "Extract review queue items and link recurring causes to Portfolio.",
    relatedResources: [
      {
        title: "FI Work Notes: Meeting Patterns",
        relation: "work loop source",
      },
      {
        title: "AI Agent Workflow Learnings",
        relation: "process pattern",
      },
    ],
    actions: [
      {
        label: "Extract open loops",
        detail: "Convert repeated focus drift signals into review prompts.",
      },
    ],
  },
];

const summaryStats: ResourceSummaryStat[] = [
  {
    label: "Resources",
    value: "128",
    detail: "canonical knowledge items",
    accent: "var(--accent-cyan)",
  },
  {
    label: "Review Needed",
    value: "12",
    detail: "needs processing",
    accent: "var(--accent-orange)",
  },
  {
    label: "Reusable Notes",
    value: "34",
    detail: "ready for next use",
    accent: "var(--accent-green)",
  },
  {
    label: "Prompt Vault",
    value: "9",
    detail: "prompt patterns",
    accent: "var(--accent-orange)",
  },
  {
    label: "Research Notes",
    value: "21",
    detail: "source-backed",
    accent: "var(--accent-blue)",
  },
  {
    label: "Linked",
    value: "46",
    detail: "context attached",
    accent: "var(--accent-purple)",
  },
];

const viewOptions: ResourceOption<ResourceViewMode>[] = [
  {
    value: "library",
    label: "Library",
    detail: "Search, capture, filter and reuse",
    accent: "var(--accent-cyan)",
    active: true,
  },
  {
    value: "map",
    label: "Map",
    detail: "Selected resource neighborhood",
    accent: "var(--accent-blue)",
  },
  {
    value: "review",
    label: "Review",
    detail: "Process, link and convert",
    accent: "var(--accent-orange)",
  },
];

const typeOptions: ResourceOption<ResourceType | "all">[] = [
  {
    value: "all",
    label: "All",
    detail: "Full library",
    count: 128,
    accent: "var(--accent-cyan)",
    active: true,
  },
  {
    value: "note",
    label: "Notes",
    detail: "Reusable thoughts",
    count: 31,
    accent: resourceTypeMeta.note.accent,
  },
  {
    value: "learning",
    label: "Learnings",
    detail: "Learning Memory",
    count: 18,
    accent: resourceTypeMeta.learning.accent,
  },
  {
    value: "prompt",
    label: "Prompts",
    detail: "Prompt Vault",
    count: 9,
    accent: resourceTypeMeta.prompt.accent,
  },
  {
    value: "research",
    label: "Research",
    detail: "Research Notes",
    count: 21,
    accent: resourceTypeMeta.research.accent,
  },
  {
    value: "source",
    label: "Sources",
    detail: "Source chain",
    count: 14,
    accent: resourceTypeMeta.source.accent,
  },
  {
    value: "snippet",
    label: "Snippets",
    detail: "Reusable code",
    count: 7,
    accent: resourceTypeMeta.snippet.accent,
  },
  {
    value: "decision",
    label: "Decisions",
    detail: "Decision notes",
    count: 10,
    accent: resourceTypeMeta.decision.accent,
  },
];

const mapScopes: ResourceOption<string>[] = [
  {
    value: "neighborhood",
    label: "Selected neighborhood",
    count: 7,
    accent: "var(--accent-cyan)",
    active: true,
  },
  {
    value: "cluster",
    label: "Current cluster",
    count: 5,
    accent: "var(--accent-blue)",
  },
  {
    value: "area",
    label: "Area",
    count: 4,
    accent: "var(--accent-green)",
  },
  {
    value: "project",
    label: "Project",
    count: 3,
    accent: "var(--accent-orange)",
  },
  {
    value: "goal",
    label: "Goal",
    count: 2,
    accent: "var(--accent-purple)",
  },
  {
    value: "skill",
    label: "Skill",
    count: 4,
    accent: "var(--accent-cyan)",
  },
  {
    value: "topic",
    label: "Topic",
    count: 5,
    accent: "var(--accent-yellow)",
  },
  {
    value: "review_needed",
    label: "Review needed only",
    count: 12,
    accent: "var(--accent-orange)",
  },
  {
    value: "reusable",
    label: "Reusable only",
    count: 34,
    accent: "var(--accent-green)",
  },
];

const filterOptions: ResourceOption<string>[] = [
  {
    value: "review_needed",
    label: "Review Needed",
    count: 12,
    accent: "var(--accent-orange)",
    active: true,
  },
  {
    value: "reusable",
    label: "Reusable Knowledge",
    count: 34,
    accent: "var(--accent-green)",
  },
  {
    value: "linked",
    label: "Linked Context",
    count: 46,
    accent: "var(--accent-blue)",
  },
  {
    value: "prompt_vault",
    label: "Prompt Vault",
    count: 9,
    accent: "var(--accent-orange)",
  },
  {
    value: "research_notes",
    label: "Research Notes",
    count: 21,
    accent: "var(--accent-cyan)",
  },
  {
    value: "raw",
    label: "Raw Notes",
    count: 14,
    accent: "var(--text-muted)",
  },
];

const captureTypes: ResourceOption<ResourceType>[] = [
  {
    value: "note",
    label: "Note",
    accent: resourceTypeMeta.note.accent,
    active: true,
  },
  {
    value: "learning",
    label: "Learning",
    accent: resourceTypeMeta.learning.accent,
  },
  {
    value: "prompt",
    label: "Prompt",
    accent: resourceTypeMeta.prompt.accent,
  },
  {
    value: "research",
    label: "Research",
    accent: resourceTypeMeta.research.accent,
  },
  {
    value: "link",
    label: "Link",
    accent: resourceTypeMeta.link.accent,
  },
  {
    value: "source",
    label: "Source",
    accent: resourceTypeMeta.source.accent,
  },
];

const relations: ResourceRelation[] = [
  {
    id: "literature-supports-argumentation",
    fromResourceId: "literature-review-search-strategy",
    toResourceId: "masterarbeit-argumentation-notes",
    type: "supports",
    label: "supports thesis claims",
  },
  {
    id: "argumentation-references-literature",
    fromResourceId: "masterarbeit-argumentation-notes",
    toResourceId: "literature-review-search-strategy",
    type: "references",
    label: "references search evidence",
  },
  {
    id: "codex-derived-from-agent-workflow",
    fromResourceId: "codex-prompt-pattern-design-to-implementation",
    toResourceId: "ai-agent-workflow-learnings",
    type: "derived_from",
    label: "derived from workflow learning",
  },
  {
    id: "agent-workflow-source-for-codex",
    fromResourceId: "ai-agent-workflow-learnings",
    toResourceId: "codex-prompt-pattern-design-to-implementation",
    type: "source_for",
    label: "source for prompt pattern",
  },
  {
    id: "figma-used-in-codex-prompt",
    fromResourceId: "figma-layout-rules-life-os-pages",
    toResourceId: "codex-prompt-pattern-design-to-implementation",
    type: "used_in",
    label: "used in design-to-code prompt",
  },
  {
    id: "figma-related-react-query",
    fromResourceId: "figma-layout-rules-life-os-pages",
    toResourceId: "react-query-decision-note",
    type: "related_to",
    label: "same Life OS phase boundary",
  },
  {
    id: "react-query-related-life-os-agent-scope",
    fromResourceId: "react-query-decision-note",
    toResourceId: "ai-agent-workflow-learnings",
    type: "related_to",
    label: "guards library scope",
  },
  {
    id: "fi-feeds-weekly-review",
    fromResourceId: "fi-work-notes-meeting-patterns",
    toResourceId: "weekly-review-reflection-focus-drift",
    type: "feeds_into",
    label: "feeds review open-loop pattern",
  },
  {
    id: "weekly-follow-up-fi",
    fromResourceId: "weekly-review-reflection-focus-drift",
    toResourceId: "fi-work-notes-meeting-patterns",
    type: "follow_up_of",
    label: "follow-up of work meeting loops",
  },
  {
    id: "nutrition-same-topic-weekly-review",
    fromResourceId: "nutrition-habit-insight",
    toResourceId: "weekly-review-reflection-focus-drift",
    type: "same_topic",
    label: "same weekly habit signal",
  },
  {
    id: "weekly-related-agent-workflow",
    fromResourceId: "weekly-review-reflection-focus-drift",
    toResourceId: "ai-agent-workflow-learnings",
    type: "related_to",
    label: "process quality pattern",
  },
];

const clusters: ResourceCluster[] = [
  {
    id: "masterarbeit-literature",
    title: "Masterarbeit / Literature",
    area: "education",
    topic: "Research provenance and claim structure",
    summary: "Search strategy, source evidence and thesis argumentation notes.",
    resourceIds: [
      "literature-review-search-strategy",
      "masterarbeit-argumentation-notes",
    ],
    accent: "var(--accent-blue)",
  },
  {
    id: "life-os-design-system",
    title: "Life OS Design System",
    area: "system",
    topic: "V5 page rules and phase boundaries",
    summary: "Design rules, page implementation constraints and later data decisions.",
    resourceIds: [
      "figma-layout-rules-life-os-pages",
      "react-query-decision-note",
      "codex-prompt-pattern-design-to-implementation",
    ],
    accent: "var(--accent-cyan)",
  },
  {
    id: "ai-agent-workflow",
    title: "AI Agent Workflow",
    area: "coding",
    topic: "Prompt patterns and agent operating rules",
    summary: "Codex prompts, workflow learnings and review handoffs.",
    resourceIds: [
      "codex-prompt-pattern-design-to-implementation",
      "ai-agent-workflow-learnings",
      "weekly-review-reflection-focus-drift",
    ],
    accent: "var(--accent-orange)",
  },
  {
    id: "nutrition-habit-learnings",
    title: "Nutrition / Habit Learnings",
    area: "nutrition",
    topic: "Meal prep friction and energy patterns",
    summary: "Small reusable habit insights without pressure or diagnosis.",
    resourceIds: ["nutrition-habit-insight"],
    accent: "var(--accent-yellow)",
  },
  {
    id: "work-meeting-knowledge",
    title: "Work Meeting Knowledge",
    area: "work",
    topic: "Meeting patterns, promises and open loops",
    summary: "Work notes and weekly review signals that create follow-ups.",
    resourceIds: [
      "fi-work-notes-meeting-patterns",
      "weekly-review-reflection-focus-drift",
    ],
    accent: "var(--accent-green)",
  },
];

const reviewQueue: ResourceReviewQueueItem[] = [
  {
    resourceId: "masterarbeit-argumentation-notes",
    title: "Masterarbeit Notes",
    sourceType: "Raw Note",
    action: "extract key claims",
    targetType: "Learning / Decision",
    linkedContext: "Education / Scientific Work",
    status: "needs extraction",
    suggestedActions: ["Extract learning", "Link resources", "Attach to project"],
    accent: "var(--accent-blue)",
  },
  {
    resourceId: "ai-agent-workflow-learnings",
    title: "Codex Session Learnings",
    sourceType: "Learning",
    action: "turn into prompt pattern",
    targetType: "Prompt Pattern",
    linkedContext: "Coding / Agents",
    status: "pattern candidate",
    suggestedActions: ["Convert to prompt pattern", "Attach to skill"],
    accent: "var(--accent-orange)",
  },
  {
    resourceId: "fi-work-notes-meeting-patterns",
    title: "FI Meeting Notes",
    sourceType: "Processed Note",
    action: "link to Work Log",
    targetType: "Work Wiki / Task",
    linkedContext: "Work / Meetings",
    status: "needs linking",
    suggestedActions: ["Link resources", "Attach to project", "Archive / dismiss"],
    accent: "var(--accent-green)",
  },
  {
    resourceId: "figma-layout-rules-life-os-pages",
    title: "Figma Resources",
    sourceType: "Learning",
    action: "convert to design rules",
    targetType: "Reusable Rule",
    linkedContext: "Design System",
    status: "ready to reuse",
    suggestedActions: ["Mark reusable", "Attach to skill"],
    accent: "var(--accent-cyan)",
  },
];

const aiSuggestions: ResourceAiSuggestion[] = [
  {
    title: "Possible related resource",
    detail:
      "Figma Layout Rules may support the Codex prompt pattern because both enforce design-to-implementation boundaries.",
    confidence: "medium",
    accent: "var(--accent-cyan)",
  },
  {
    title: "Possible reusable learning",
    detail:
      "Weekly Review Reflection contains an open-loop pattern that could become a review prompt after manual cleanup.",
    confidence: "medium",
    accent: "var(--accent-orange)",
  },
  {
    title: "Possible isolated note",
    detail:
      "Nutrition Habit Insight has fewer resource-to-resource edges; keep it scoped to Nutrition until more habit notes exist.",
    confidence: "low",
    accent: "var(--accent-yellow)",
  },
];

const recentLearnings: RecentLearning[] = [
  {
    title: "Figma pages inherit V5 posture, not dashboard layout.",
    insight:
      "New workbench pages should feel calm, dense and matte without cloning Today Agenda.",
    source: "Design docs / Page Rules",
    accent: "var(--accent-cyan)",
  },
  {
    title: "Prompt patterns need non-goals.",
    insight:
      "The reusable part of a Codex prompt is often the boundary list and validation contract.",
    source: "Codex Prompt Pattern",
    accent: "var(--accent-orange)",
  },
  {
    title: "Research notes need provenance before reuse.",
    insight:
      "A claim is not reusable until it carries source, context and next-use intent.",
    source: "Literature Review",
    accent: "var(--accent-blue)",
  },
  {
    title: "Work meeting notes should split promises from context.",
    insight:
      "Follow-ups become easier when decisions, blockers and commitments are separate.",
    source: "FI Work Notes",
    accent: "var(--accent-green)",
  },
];

const RESOURCES_CONTENT_CAPACITY = {
  knowledgeMap: 6,
  library: 8,
  page: 8,
  recentLearnings: 4,
  relationInspector: 1,
  reviewQueue: 4,
  reviewWorkbench: 4,
  summary: 6,
} as const;

export function buildResourcesContentStates({
  aiSuggestionCount,
  clusterCount,
  recentLearningCount,
  relationCount,
  resourceCount,
  reviewQueueCount,
}: Readonly<{
  aiSuggestionCount: number;
  clusterCount: number;
  recentLearningCount: number;
  relationCount: number;
  resourceCount: number;
  reviewQueueCount: number;
}>): ResourcesViewModel["contentStates"] {
  return {
    page: resolveContentStateMeta({
      capacity: RESOURCES_CONTENT_CAPACITY.page,
      itemCount: resourceCount,
    }),
    summary: resolveContentStateMeta({
      capacity: RESOURCES_CONTENT_CAPACITY.summary,
      itemCount: resourceCount,
    }),
    library: resolveContentStateMeta({
      capacity: RESOURCES_CONTENT_CAPACITY.library,
      itemCount: resourceCount,
    }),
    relationInspector: resolveContentStateMeta({
      capacity: RESOURCES_CONTENT_CAPACITY.relationInspector,
      itemCount: resourceCount > 0 ? 1 : 0,
    }),
    reviewQueue: resolveContentStateMeta({
      capacity: RESOURCES_CONTENT_CAPACITY.reviewQueue,
      itemCount: reviewQueueCount,
      hasHistory: resourceCount > 0,
    }),
    reviewWorkbench: resolveContentStateMeta({
      capacity: RESOURCES_CONTENT_CAPACITY.reviewWorkbench,
      itemCount: reviewQueueCount + aiSuggestionCount,
      hasHistory: resourceCount > 0,
    }),
    recentLearnings: resolveContentStateMeta({
      capacity: RESOURCES_CONTENT_CAPACITY.recentLearnings,
      itemCount: recentLearningCount,
      hasHistory: resourceCount > 0,
    }),
    knowledgeMap: resolveContentStateMeta({
      capacity: RESOURCES_CONTENT_CAPACITY.knowledgeMap,
      itemCount: relationCount + clusterCount,
      hasHistory: resourceCount > 0,
    }),
  };
}

export function getResourcesViewModel(
  profileId: ResourceProfileId = "demo",
): ResourcesViewModel {
  return {
    profileId,
    header: {
      eyebrow: "Knowledge Library",
      title: "Resources",
      summary:
        "Reusable knowledge, sources, prompts, notes and learnings stay organized by next use and linked context.",
      dateRange: "Static MVP / June 2026",
    },
    pageContract: {
      pageType: "Resources / Entity Workbench",
      primaryPurpose:
        "Clarify reusable knowledge and decide what should be reviewed, linked or used next.",
      writes:
        "Later: canonical resource records, review state, linked context and provenance.",
      reads:
        "Later: resources, related projects, goals, skills, areas and review records.",
      canonicalSource:
        "Resources is the canonical source for reusable notes, prompts, research and references.",
      sensitiveData:
        "May include personal, work and research notes; mock data avoids secrets and private details.",
      primaryDecision: "What should be reused, reviewed, linked or archived?",
      mainZone:
        "View switcher between Library, scoped Knowledge Map and Review queue with selected resource context.",
      emptyState:
        "A future empty state should guide capture from Inbox or direct Save Resource.",
      mobileOrder:
        "Header, KPIs, view switcher, Quick Capture, current view content, selected resource inspector, review queue.",
    },
    summaryStats,
    viewOptions,
    relationTargets: [],
    typeOptions,
    filterOptions,
    mapScopes,
    captureTypes,
    resources,
    relations,
    clusters,
    selectedResource: resources[0] ?? null,
    reviewQueue,
    aiSuggestions,
    recentLearnings,
    contentStates: buildResourcesContentStates({
      aiSuggestionCount: aiSuggestions.length,
      clusterCount: clusters.length,
      recentLearningCount: recentLearnings.length,
      relationCount: relations.length,
      resourceCount: resources.length,
      reviewQueueCount: reviewQueue.length,
    }),
  };
}
