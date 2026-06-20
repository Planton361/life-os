import type {
  RecentLearning,
  ResourceArea,
  ResourceAreaMeta,
  ResourceItem,
  ResourceOption,
  ResourceReviewQueueItem,
  ResourceReviewState,
  ResourceReviewStateMeta,
  ResourceStatus,
  ResourceStatusMeta,
  ResourceSummaryStat,
  ResourceType,
  ResourceTypeMeta,
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
    area: "health",
    status: "linked",
    source: "Nutrition / Habit note",
    linkedContext: "Health & Nutrition",
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
];

const reviewQueue: ResourceReviewQueueItem[] = [
  {
    title: "Masterarbeit Notes",
    action: "extract key claims",
    linkedContext: "Education / Scientific Work",
    accent: "var(--accent-blue)",
  },
  {
    title: "Codex Session Learnings",
    action: "turn into prompt pattern",
    linkedContext: "Coding / Agents",
    accent: "var(--accent-orange)",
  },
  {
    title: "FI Meeting Notes",
    action: "link to Work Log",
    linkedContext: "Work / Meetings",
    accent: "var(--accent-green)",
  },
  {
    title: "Figma Resources",
    action: "convert to design rules",
    linkedContext: "Design System",
    accent: "var(--accent-cyan)",
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

export function getResourcesViewModel(): ResourcesViewModel {
  return {
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
      mainZone: "Main Resources Library with selected resource context.",
      emptyState:
        "A future empty state should guide capture from Inbox or direct Save Resource.",
      mobileOrder:
        "Header, summary, Save Resource, type switch, filters, library, selected context, review queue, recent learnings.",
    },
    summaryStats,
    typeOptions,
    filterOptions,
    captureTypes,
    resources,
    selectedResource: resources[0],
    reviewQueue,
    recentLearnings,
  };
}
