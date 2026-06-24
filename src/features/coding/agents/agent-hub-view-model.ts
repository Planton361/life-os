import type {
  AgentHubViewModel,
  AgentOutput,
  AgentSession,
  AgentTask,
  AgentWorker,
  ContextBundle,
  PromptTemplate,
} from "./types";

const workers: AgentWorker[] = [
  {
    id: "worker-codex-builder",
    name: "Codex Builder",
    role: "Implementation worker for scoped Next.js tasks",
    provider: "codex",
    status: "busy",
    capabilities: ["coding", "debugging", "refactor", "testing"],
    currentTaskId: "task-coding-repositories",
    lastSessionAt: "2026-06-21T17:40:00+02:00",
    reliabilityNote:
      "Stark bei dateigenauen Codex-Aufgaben, braucht klare Nicht-Ziele und lokale Validierung.",
    constraints: [
      "Keine Secrets lesen",
      "Keine externen APIs ohne Freigabe",
      "Diff immer reviewen",
    ],
  },
  {
    id: "worker-claude-reviewer",
    name: "Claude Reviewer",
    role: "UX, copy and architecture reviewer",
    provider: "claude",
    status: "available",
    capabilities: ["review", "planning", "documentation", "prompting"],
    lastSessionAt: "2026-06-20T20:10:00+02:00",
    reliabilityNote:
      "Gut fuer second-pass Reviews, sollte keine produktiven Aenderungen direkt ausfuehren.",
    constraints: [
      "Review-only im MVP",
      "Keine autonome Merge-Entscheidung",
      "Risiken textlich markieren",
    ],
  },
  {
    id: "worker-prompt-librarian",
    name: "Prompt Librarian",
    role: "Prompt taxonomy and reusable task writer",
    provider: "manual",
    status: "limited",
    capabilities: ["prompting", "documentation", "planning"],
    lastSessionAt: "2026-06-19T22:30:00+02:00",
    reliabilityNote:
      "Hilft beim Zuschneiden von Codex-Auftraegen, bleibt bewusst manuell bestaetigt.",
    constraints: [
      "Keine Prompts mit Tokens",
      "Kontext klein halten",
      "Sicherheitsgrenzen sichtbar nennen",
    ],
  },
  {
    id: "worker-research-scout",
    name: "Research Scout",
    role: "Research and documentation context collector",
    provider: "other",
    status: "needs_setup",
    capabilities: ["research", "documentation", "planning"],
    reliabilityNote:
      "Noch nicht verbunden; nur als Rollenprofil und spaeterer Workflow-Platzhalter.",
    constraints: [
      "Keine Browser-Automation im MVP",
      "Quellen spaeter separat bestaetigen",
      "Keine Account-Sessions",
    ],
  },
  {
    id: "worker-manual-review",
    name: "Manual Review",
    role: "Anton review gate for critical agent output",
    provider: "manual",
    status: "available",
    capabilities: ["review", "testing", "planning"],
    lastSessionAt: "2026-06-21T16:15:00+02:00",
    reliabilityNote:
      "Finale Entscheidung bleibt manuell, besonders bei Code, RLS, Auth und Datenmodell.",
    constraints: [
      "Kritische Outputs immer pruefen",
      "Destruktive Aktionen separat bestaetigen",
      "Security-Kontext nicht ueberspringen",
    ],
  },
];

const tasks: AgentTask[] = [
  {
    id: "task-coding-repositories",
    title: "Implement /coding repositories page",
    goal: "Repository Workbench als ruhige Coding-Unterseite mit Mockdaten und Review-Grenzen fertigstellen.",
    status: "review_needed",
    priority: "high",
    assignedWorkerId: "worker-codex-builder",
    linkedProjectId: "project-life-os",
    linkedProjectTitle: "Life OS App",
    repositoryId: "repo-life-os-app",
    repositoryName: "anton/life-os-app",
    promptTemplateId: "prompt-area-subpage",
    contextBundleIds: ["context-life-os-repo", "context-product-rules"],
    expectedOutput: "code",
    reviewRequired: true,
    createdAt: "2026-06-21T11:45:00+02:00",
    dueLabel: "Today",
    nextAction: "Review generated diff and decide whether follow-up tasks are needed.",
  },
  {
    id: "task-agent-hub-ux",
    title: "Review Agent Hub UX",
    goal: "Pruefen, ob Review Queue und Assignment Queue die erste Ansicht dominieren.",
    status: "queued",
    priority: "high",
    assignedWorkerId: "worker-claude-reviewer",
    linkedProjectId: "project-ai-agent-workflow",
    linkedProjectTitle: "AI Agent Workflow",
    repositoryId: "repo-life-os-app",
    repositoryName: "anton/life-os-app",
    promptTemplateId: "prompt-v5-review",
    contextBundleIds: ["context-design-v5", "context-product-rules"],
    expectedOutput: "review",
    reviewRequired: true,
    createdAt: "2026-06-21T14:30:00+02:00",
    dueLabel: "Next review",
    nextAction: "Run V5 review against first-screen hierarchy and mobile order.",
  },
  {
    id: "task-repository-data-model",
    title: "Extract repository data model",
    goal: "Repository, Resource und Agent Session Felder fuer spaetere Phase-3-Datenbindung schneiden.",
    status: "blocked",
    priority: "medium",
    assignedWorkerId: "worker-prompt-librarian",
    linkedProjectId: "project-supabase-foundation",
    linkedProjectTitle: "Supabase Foundation",
    repositoryId: "repo-supabase-sandbox",
    repositoryName: "anton/supabase-sandbox",
    promptTemplateId: "prompt-data-model",
    contextBundleIds: [],
    expectedOutput: "plan",
    reviewRequired: true,
    createdAt: "2026-06-20T19:10:00+02:00",
    nextAction: "Attach Security / RLS context before any schema prompt is queued.",
  },
  {
    id: "task-codex-rls-prompt",
    title: "Write Codex prompt for Supabase RLS",
    goal: "Sicheren Codex-Auftrag fuer RLS-Policy-Review formulieren, ohne Migration zu starten.",
    status: "draft",
    priority: "medium",
    assignedWorkerId: "worker-manual-review",
    linkedProjectId: "project-supabase-foundation",
    linkedProjectTitle: "Supabase Foundation",
    repositoryId: "repo-supabase-sandbox",
    repositoryName: "anton/supabase-sandbox",
    promptTemplateId: "prompt-security-review",
    contextBundleIds: ["context-security-rls"],
    expectedOutput: "note",
    reviewRequired: true,
    createdAt: "2026-06-19T21:20:00+02:00",
    nextAction: "Convert draft into small reviewed Codex task after data model scope is clear.",
  },
  {
    id: "task-agent-prompts-cleanup",
    title: "Clean agent prompt backlog",
    goal: "Unreviewte Prompts in agent-prompts nach Coding, Review, Research und Planning sortieren.",
    status: "running",
    priority: "low",
    assignedWorkerId: "worker-prompt-librarian",
    linkedProjectId: "project-ai-agent-workflow",
    linkedProjectTitle: "AI Agent Workflow",
    repositoryId: "repo-agent-prompts",
    repositoryName: "anton/agent-prompts",
    promptTemplateId: "prompt-library-grooming",
    contextBundleIds: ["context-prompt-pack"],
    expectedOutput: "summary",
    reviewRequired: false,
    createdAt: "2026-06-21T09:20:00+02:00",
    nextAction: "Summarize prompt categories and mark risky snippets for manual review.",
  },
];

const sessions: AgentSession[] = [
  {
    id: "session-repositories-build",
    taskId: "task-coding-repositories",
    workerId: "worker-codex-builder",
    status: "review_needed",
    startedAt: "2026-06-21T11:55:00+02:00",
    endedAt: "2026-06-21T15:20:00+02:00",
    promptRef: "Area Subpage implementation prompt",
    outputSummary:
      "Repository Workbench erstellt, lokale Dialoge verdrahtet, GitHub-Sync nur als serverseitige Grenze beschrieben.",
    followUp: "Review mobile order and Suspense build issue separately.",
    reviewNeeded: true,
    linkedProjectId: "project-life-os",
    repositoryId: "repo-life-os-app",
  },
  {
    id: "session-agent-hub-review",
    taskId: "task-agent-hub-ux",
    workerId: "worker-claude-reviewer",
    status: "queued",
    promptRef: "V5 design review prompt",
    outputSummary:
      "Queued review for Agent Hub first-screen hierarchy and orange review signals.",
    followUp: "No output yet.",
    reviewNeeded: false,
    linkedProjectId: "project-ai-agent-workflow",
    repositoryId: "repo-life-os-app",
  },
  {
    id: "session-prompt-cleanup",
    taskId: "task-agent-prompts-cleanup",
    workerId: "worker-prompt-librarian",
    status: "running",
    startedAt: "2026-06-21T09:25:00+02:00",
    promptRef: "Prompt library grooming",
    outputSummary:
      "Prompt categories are being grouped into reusable Coding, Review and Planning templates.",
    followUp: "Create review-needed list for prompts with security implications.",
    reviewNeeded: false,
    linkedProjectId: "project-ai-agent-workflow",
    repositoryId: "repo-agent-prompts",
  },
  {
    id: "session-rls-draft",
    taskId: "task-codex-rls-prompt",
    workerId: "worker-manual-review",
    status: "blocked",
    startedAt: "2026-06-19T21:25:00+02:00",
    promptRef: "Security prompt draft",
    outputSummary:
      "RLS prompt needs narrower table scope before Codex should touch policy text.",
    followUp: "Attach Security / RLS context bundle.",
    reviewNeeded: true,
    linkedProjectId: "project-supabase-foundation",
    repositoryId: "repo-supabase-sandbox",
  },
];

const outputs: AgentOutput[] = [
  {
    id: "output-repositories-diff",
    sessionId: "session-repositories-build",
    type: "diff",
    title: "Repository Workbench implementation diff",
    summary:
      "Generated feature files, local dialogs and loading state. Needs manual code and accessibility review before merge.",
    riskLevel: "medium",
    reviewStatus: "pending",
    createdAt: "2026-06-21T15:20:00+02:00",
  },
  {
    id: "output-repositories-summary",
    sessionId: "session-repositories-build",
    type: "summary",
    title: "Repository UX summary",
    summary:
      "Documents attention queue, repository inspector and no-token GitHub boundary for future integration planning.",
    riskLevel: "low",
    reviewStatus: "pending",
    createdAt: "2026-06-21T15:22:00+02:00",
  },
  {
    id: "output-rls-prompt-draft",
    sessionId: "session-rls-draft",
    type: "prompt",
    title: "Supabase RLS Codex prompt draft",
    summary:
      "Prompt draft is intentionally blocked until table scope, user ownership and migration boundary are explicit.",
    riskLevel: "high",
    reviewStatus: "pending",
    createdAt: "2026-06-19T22:00:00+02:00",
  },
];

const promptTemplates: PromptTemplate[] = [
  {
    id: "prompt-area-subpage",
    title: "Area subpage implementation",
    purpose:
      "Build a static, route-specific Life OS subpage with typed mock data and local UI state.",
    category: "coding",
    lastUsedAt: "Today",
  },
  {
    id: "prompt-v5-review",
    title: "V5 design review",
    purpose:
      "Check Life OS UI against Linear Calm Dark Command Center and anti-AI-slop rules.",
    category: "review",
    lastUsedAt: "Yesterday",
  },
  {
    id: "prompt-security-review",
    title: "Security / RLS review",
    purpose:
      "Review auth, RLS and data ownership boundaries without changing production policy.",
    category: "review",
    lastUsedAt: "Jun 19",
  },
  {
    id: "prompt-data-model",
    title: "Data model extraction",
    purpose:
      "Turn UI mock fields into canonical entity candidates and explicit non-goals.",
    category: "planning",
    lastUsedAt: "Jun 20",
  },
  {
    id: "prompt-library-grooming",
    title: "Prompt library grooming",
    purpose:
      "Sort reusable prompts by task type, review risk and required context bundle.",
    category: "documentation",
  },
];

const contextBundles: ContextBundle[] = [
  {
    id: "context-life-os-repo",
    title: "Repo Context · life-os-app",
    sourceType: "repository",
    linkedItems: 8,
    updatedAt: "Today",
    linkedProjectId: "project-life-os",
    linkedProjectTitle: "Life OS App",
    repositoryId: "repo-life-os-app",
    repositoryName: "anton/life-os-app",
  },
  {
    id: "context-design-v5",
    title: "Design Context · V5",
    sourceType: "design",
    linkedItems: 6,
    updatedAt: "Today",
    linkedProjectId: "project-life-os",
    linkedProjectTitle: "Life OS App",
    repositoryId: "repo-life-os-app",
    repositoryName: "anton/life-os-app",
  },
  {
    id: "context-product-rules",
    title: "Product Rules",
    sourceType: "docs",
    linkedItems: 9,
    updatedAt: "Today",
    linkedProjectId: "project-life-os",
    linkedProjectTitle: "Life OS App",
  },
  {
    id: "context-security-rls",
    title: "Security / RLS Context",
    sourceType: "docs",
    linkedItems: 4,
    updatedAt: "Jun 20",
    linkedProjectId: "project-supabase-foundation",
    linkedProjectTitle: "Supabase Foundation",
    repositoryId: "repo-supabase-sandbox",
    repositoryName: "anton/supabase-sandbox",
  },
  {
    id: "context-prompt-pack",
    title: "Prompt Pack",
    sourceType: "prompt",
    linkedItems: 12,
    updatedAt: "Jun 21",
    linkedProjectId: "project-ai-agent-workflow",
    linkedProjectTitle: "AI Agent Workflow",
    repositoryId: "repo-agent-prompts",
    repositoryName: "anton/agent-prompts",
  },
];

export function getAgentHubViewModel(): AgentHubViewModel {
  return {
    profileId: "demo",
    generatedAt: "2026-06-21T18:00:00+02:00",
    pageContract: {
      pageType: "Area Subpage / Agent Control Hub",
      primaryPurpose:
        "Plan, assign, monitor and review agent work across Coding projects.",
      writes: "Local UI state only: queued tasks, prompt drafts, context drafts and review decisions.",
      reads:
        "Mock workers, mock agent tasks, mock sessions, mock outputs, mock prompts and mock context bundles.",
      canonicalSource:
        "Future agent_profiles, agent_sessions, repositories, resources, tasks and projects.",
      sensitiveData:
        "System-restricted and work-restricted contexts are represented only as labels; no secrets or tokens.",
      primaryDecision:
        "Which agent output needs review now, and which task should be queued next?",
      mainZone: "Agent Mission Control",
      emptyState:
        "Explain that tasks are queued locally and no autonomous agent run starts.",
      mobileOrder:
        "Header, Mission Control, Review Needed, Assignment Queue, Worker Pool, Composer shortcut, Sessions, Prompts, Context Bundles, Guardrails.",
    },
    workers,
    tasks,
    sessions,
    outputs,
    promptTemplates,
    contextBundles,
    projects: [
      { id: "project-life-os", title: "Life OS App" },
      { id: "project-ai-agent-workflow", title: "AI Agent Workflow" },
      { id: "project-supabase-foundation", title: "Supabase Foundation" },
    ],
    repositories: [
      {
        id: "repo-life-os-app",
        name: "life-os-app",
        fullName: "anton/life-os-app",
      },
      {
        id: "repo-agent-prompts",
        name: "agent-prompts",
        fullName: "anton/agent-prompts",
      },
      {
        id: "repo-supabase-sandbox",
        name: "supabase-sandbox",
        fullName: "anton/supabase-sandbox",
      },
    ],
    emptyStates: {
      noTasks: {
        title: "No agent tasks queued",
        description:
          "Create a local draft workflow to plan an agent task. No real worker starts from this MVP.",
      },
      noWorkers: {
        title: "No worker profiles configured",
        description:
          "Worker cards are role profiles. Future setup can connect providers server-side after review.",
      },
      noReviewItems: {
        title: "No outputs waiting for review",
        description:
          "When an agent output is generated, it will stay pending here until Anton accepts, edits, rejects or saves it as a note.",
      },
      noPrompts: {
        title: "No prompt templates yet",
        description:
          "Create a local prompt draft with title, purpose and body before reuse.",
      },
    },
    statusMeta: {
      draft: {
        label: "Draft",
        accent: "var(--text-muted)",
        description: "Prepared locally but not queued.",
      },
      queued: {
        label: "Queued",
        accent: "var(--accent-blue)",
        description: "Ready for a manual worker handoff.",
      },
      running: {
        label: "Running",
        accent: "var(--accent-orange)",
        description: "Simulated active work. No background job is running.",
      },
      blocked: {
        label: "Blocked",
        accent: "var(--accent-red)",
        description: "Needs context, scope or manual decision.",
      },
      review_needed: {
        label: "Review Needed",
        accent: "var(--accent-orange)",
        description: "Output must be reviewed before use.",
      },
      completed: {
        label: "Completed",
        accent: "var(--accent-green)",
        description: "Reviewed or closed.",
      },
      rejected: {
        label: "Rejected",
        accent: "var(--accent-red)",
        description: "Rejected after review.",
      },
      archived: {
        label: "Archived",
        accent: "var(--text-faint)",
        description: "Hidden from active flow.",
      },
    },
    workerStatusMeta: {
      available: {
        label: "Available",
        accent: "var(--accent-green)",
        description: "Can receive a planned task.",
      },
      busy: {
        label: "Busy",
        accent: "var(--accent-orange)",
        description: "Already assigned in this mock queue.",
      },
      offline: {
        label: "Offline",
        accent: "var(--text-muted)",
        description: "Unavailable.",
      },
      limited: {
        label: "Limited",
        accent: "var(--accent-cyan)",
        description: "Useful for narrow manual workflows.",
      },
      needs_setup: {
        label: "Needs Setup",
        accent: "var(--accent-red)",
        description: "Profile exists, integration does not.",
      },
    },
    priorityMeta: {
      low: {
        label: "Low",
        accent: "var(--text-muted)",
        description: "Can wait.",
      },
      medium: {
        label: "Medium",
        accent: "var(--accent-yellow)",
        description: "Should be planned.",
      },
      high: {
        label: "High",
        accent: "var(--accent-orange)",
        description: "Needs active attention.",
      },
    },
    guardrails: [
      "No autonomous apply",
      "Review required for critical output",
      "Do not paste secrets into agent prompts",
      "Server-side integrations only",
      "Manual confirmation before destructive actions",
    ],
    futureErrorState: {
      title: "Future agent run failed",
      description:
        "Prepared error state only. No real agent execution, background job or provider API is connected in this MVP.",
    },
  };
}
