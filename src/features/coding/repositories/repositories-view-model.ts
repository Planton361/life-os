import type {
  CodingRepository,
  RepositoryActivity,
  RepositoryAgentSession,
  RepositoryLinkedTask,
  RepositoryResource,
  RepositorySignal,
  RepositoryStatus,
  RepositoryWorkbenchViewModel,
} from "./types";

const repositories: CodingRepository[] = [
  {
    id: "repo-life-os-app",
    name: "life-os-app",
    fullName: "anton/life-os-app",
    provider: "github",
    visibility: "private",
    defaultBranch: "main",
    activeBranch: "feature/coding-repositories",
    language: "TypeScript",
    status: "review_needed",
    signals: ["open_review", "missing_next_action"],
    description:
      "Next.js Life OS app with dashboard, area pages and local Phase 2 mock workflows.",
    linkedProjectId: "project-life-os",
    linkedProjectTitle: "Life OS App",
    nextAction:
      "Repository Workbench gegen V5 pruefen und GitHub-Sync-Grenze dokumentieren.",
    lastActivityAt: "2026-06-21T15:10:00+02:00",
    openTaskCount: 4,
    resourceCount: 6,
    noteCount: 5,
    agentSessionCount: 2,
  },
  {
    id: "repo-agent-prompts",
    name: "agent-prompts",
    fullName: "anton/agent-prompts",
    provider: "local",
    visibility: "private",
    defaultBranch: "main",
    language: "Markdown",
    status: "attention",
    signals: ["open_review", "missing_resources"],
    description:
      "Lokale Prompt-Bibliothek fuer Codex, Review-Regeln und wiederholbare Agent-Aufgaben.",
    linkedProjectId: "project-ai-workflow",
    linkedProjectTitle: "AI Workflow",
    nextAction:
      "Vier unreviewte Prompt-Snippets klassifizieren und Review-Status setzen.",
    lastActivityAt: "2026-06-20T21:45:00+02:00",
    openTaskCount: 2,
    resourceCount: 3,
    noteCount: 4,
    agentSessionCount: 3,
  },
  {
    id: "repo-java-training",
    name: "java-training",
    fullName: "anton/java-training",
    provider: "github",
    visibility: "private",
    defaultBranch: "main",
    activeBranch: "collections-practice",
    language: "Java",
    status: "stale",
    signals: ["stale_branch"],
    description:
      "Lernrepository fuer Java-Grundlagen, Collections und kleine Hyperskill-Uebungen.",
    linkedProjectId: "project-java-learning",
    linkedProjectTitle: "Java / Hyperskill",
    nextAction:
      "Naechste Collections-Uebung klein schneiden oder Branch bewusst parken.",
    lastActivityAt: "2026-06-09T16:00:00+02:00",
    openTaskCount: 1,
    resourceCount: 2,
    noteCount: 1,
    agentSessionCount: 0,
  },
  {
    id: "repo-supabase-sandbox",
    name: "supabase-sandbox",
    fullName: "anton/supabase-sandbox",
    provider: "github",
    visibility: "private",
    defaultBranch: "main",
    activeBranch: "rls-policy-notes",
    language: "TypeScript",
    status: "attention",
    signals: ["failed_check", "unlinked_tasks"],
    description:
      "Sicherer Sandbox-Kontext fuer RLS-Pattern, Policies und spaetere Supabase-Datenbindung.",
    linkedProjectId: "project-life-os-data",
    linkedProjectTitle: "Life OS Data Model",
    nextAction:
      "Failed type draft isolieren und nur gepruefte RLS-Notiz in Resources uebernehmen.",
    lastActivityAt: "2026-06-19T18:10:00+02:00",
    openTaskCount: 3,
    resourceCount: 4,
    noteCount: 2,
    agentSessionCount: 1,
  },
  {
    id: "repo-master-thesis-tools",
    name: "master-thesis-tools",
    fullName: "anton/master-thesis-tools",
    provider: "github",
    visibility: "private",
    defaultBranch: "main",
    language: "Python",
    status: "active",
    signals: ["healthy"],
    description:
      "Kleine Skripte fuer Literatur-Exports, Zitationsbereinigung und Scientific-Work-Kontext.",
    linkedProjectId: "project-master-thesis",
    linkedProjectTitle: "Scientific Work",
    nextAction:
      "Export-Script mit aktueller Literature-Route abgleichen und Decision notieren.",
    lastActivityAt: "2026-06-18T11:30:00+02:00",
    openTaskCount: 2,
    resourceCount: 5,
    noteCount: 3,
    agentSessionCount: 0,
  },
];

const tasks: RepositoryLinkedTask[] = [
  {
    id: "task-repo-v5-review",
    title: "Repositories Workbench gegen V5 und Mobile-Reihenfolge pruefen",
    status: "in_progress",
    priority: "high",
    repositoryId: "repo-life-os-app",
    projectId: "project-life-os",
    dueLabel: "Today",
  },
  {
    id: "task-github-boundary",
    title: "GitHub-Sync-Grenze ohne Client Token dokumentieren",
    status: "open",
    priority: "high",
    repositoryId: "repo-life-os-app",
    projectId: "project-life-os",
    dueLabel: "Today",
  },
  {
    id: "task-repo-inspector",
    title: "Repository Inspector: Tasks, Resources, Agent Sessions trennen",
    status: "open",
    priority: "medium",
    repositoryId: "repo-life-os-app",
    projectId: "project-life-os",
  },
  {
    id: "task-prompt-review",
    title: "Prompt Library: Review-needed Snippets markieren",
    status: "blocked",
    priority: "high",
    repositoryId: "repo-agent-prompts",
    projectId: "project-ai-workflow",
    dueLabel: "Next review",
  },
  {
    id: "task-java-collections",
    title: "Collections-Uebung als 45-Minuten-Session planen",
    status: "open",
    priority: "medium",
    repositoryId: "repo-java-training",
    projectId: "project-java-learning",
  },
  {
    id: "task-rls-type-draft",
    title: "RLS type draft aus Sandbox-Experiment bereinigen",
    status: "blocked",
    priority: "high",
    repositoryId: "repo-supabase-sandbox",
    projectId: "project-life-os-data",
  },
  {
    id: "task-literature-export",
    title: "Literature Export Script mit Scientific Work abstimmen",
    status: "open",
    priority: "medium",
    repositoryId: "repo-master-thesis-tools",
    projectId: "project-master-thesis",
  },
];

const resources: RepositoryResource[] = [
  {
    id: "resource-v5-repo-workbench",
    title: "Repository Workbench Page Contract",
    type: "decision",
    repositoryId: "repo-life-os-app",
    updatedAt: "Today",
  },
  {
    id: "resource-agent-review-checklist",
    title: "Agent output review checklist",
    type: "note",
    repositoryId: "repo-life-os-app",
    updatedAt: "Yesterday",
  },
  {
    id: "resource-github-sync-boundary",
    title: "GitHub sync server-side boundary",
    type: "doc",
    repositoryId: "repo-life-os-app",
    updatedAt: "Today",
  },
  {
    id: "resource-prompt-taxonomy",
    title: "Prompt taxonomy and review states",
    type: "prompt",
    repositoryId: "repo-agent-prompts",
    updatedAt: "Jun 20",
  },
  {
    id: "resource-java-collections",
    title: "Java Collections cheat note",
    type: "snippet",
    repositoryId: "repo-java-training",
    updatedAt: "Jun 12",
  },
  {
    id: "resource-rls-policy-pattern",
    title: "RLS policy pattern for user-owned rows",
    type: "decision",
    repositoryId: "repo-supabase-sandbox",
    updatedAt: "Jun 20",
  },
  {
    id: "resource-literature-export",
    title: "BibTeX cleanup command notes",
    type: "note",
    repositoryId: "repo-master-thesis-tools",
    updatedAt: "Jun 18",
  },
];

const agentSessions: RepositoryAgentSession[] = [
  {
    id: "agent-coding-page-review",
    repositoryId: "repo-life-os-app",
    status: "review_needed",
    outputSummary:
      "Generated repository workbench sections need manual component and accessibility review.",
    reviewNeeded: true,
  },
  {
    id: "agent-repo-filter-check",
    repositoryId: "repo-life-os-app",
    status: "completed",
    outputSummary:
      "Filter state and empty-state expectations summarized; no code applied automatically.",
    reviewNeeded: false,
  },
  {
    id: "agent-prompt-classifier",
    repositoryId: "repo-agent-prompts",
    status: "review_needed",
    outputSummary:
      "Prompt snippets classified as task, note, question and agent context. Human review open.",
    reviewNeeded: true,
  },
  {
    id: "agent-rls-summary",
    repositoryId: "repo-supabase-sandbox",
    status: "completed",
    outputSummary:
      "RLS policy summary generated from sandbox notes; accepted as context only.",
    reviewNeeded: false,
  },
];

const activity: RepositoryActivity[] = [
  {
    id: "activity-note-workbench",
    repositoryId: "repo-life-os-app",
    type: "note_saved",
    title: "Note saved",
    detail: "Repository Workbench acceptance criteria captured locally.",
    happenedAt: "Today 15:20",
  },
  {
    id: "activity-task-link",
    repositoryId: "repo-life-os-app",
    type: "task_linked",
    title: "Task linked",
    detail: "GitHub boundary task linked to Life OS App project.",
    happenedAt: "Today 15:05",
  },
  {
    id: "activity-agent-reviewed",
    repositoryId: "repo-agent-prompts",
    type: "agent_output_reviewed",
    title: "Agent output reviewed",
    detail: "Prompt taxonomy output kept as suggestion, not applied automatically.",
    happenedAt: "Yesterday",
  },
  {
    id: "activity-stale-branch",
    repositoryId: "repo-java-training",
    type: "branch_marked_stale",
    title: "Branch marked stale",
    detail: "collections-practice needs a small next exercise or deliberate pause.",
    happenedAt: "Jun 19",
  },
];

export const repositoryStatusMeta: Record<RepositoryStatus, {
  label: string;
  accent: string;
  description: string;
}> = {
  active: {
    label: "Active",
    accent: "var(--accent-blue)",
    description: "Repository has a clear current use.",
  },
  attention: {
    label: "Attention",
    accent: "var(--accent-orange)",
    description: "Repository needs a concrete human next step.",
  },
  stale: {
    label: "Stale",
    accent: "var(--accent-cyan)",
    description: "Branch or repo context has cooled down.",
  },
  archived: {
    label: "Archived",
    accent: "var(--text-muted)",
    description: "Repository is kept for reference.",
  },
  review_needed: {
    label: "Review needed",
    accent: "var(--accent-orange)",
    description: "Generated or linked context needs review.",
  },
};

export const repositorySignalMeta: Record<RepositorySignal, {
  label: string;
  accent: string;
  description: string;
  attention: boolean;
}> = {
  missing_next_action: {
    label: "Missing next action",
    accent: "var(--accent-blue)",
    description: "Next action needs to be made explicit.",
    attention: true,
  },
  failed_check: {
    label: "Failed check",
    accent: "var(--accent-red)",
    description: "A mocked technical check is failing.",
    attention: true,
  },
  open_review: {
    label: "Open review",
    accent: "var(--accent-orange)",
    description: "Generated or linked output needs review.",
    attention: true,
  },
  stale_branch: {
    label: "Stale branch",
    accent: "var(--accent-cyan)",
    description: "Branch has not moved recently.",
    attention: true,
  },
  unlinked_tasks: {
    label: "Unlinked tasks",
    accent: "var(--accent-orange)",
    description: "Tasks exist but the repository context is incomplete.",
    attention: true,
  },
  missing_resources: {
    label: "Missing resources",
    accent: "var(--accent-cyan)",
    description: "Useful documentation or notes are not linked yet.",
    attention: true,
  },
  healthy: {
    label: "Healthy",
    accent: "var(--accent-green)",
    description: "Current context is clear.",
    attention: false,
  },
};

function uniqueProjectOptions(): Array<{ label: string; value: string }> {
  const projectMap = new Map<string, string>();

  repositories.forEach((repository) => {
    if (repository.linkedProjectId && repository.linkedProjectTitle) {
      projectMap.set(repository.linkedProjectId, repository.linkedProjectTitle);
    }
  });

  return Array.from(projectMap.entries()).map(([value, label]) => ({
    label,
    value,
  }));
}

export function getRepositoriesViewModel(): RepositoryWorkbenchViewModel {
  const attentionCount = repositories.filter((repository) =>
    repository.signals.some((signal) => repositorySignalMeta[signal].attention),
  ).length;
  const reviewCount = agentSessions.filter((session) => session.reviewNeeded).length;

  return {
    profileId: "demo",
    header: {
      eyebrow: "Life OS / Coding",
      title: "Repositories",
      contextLine: "Coding repositories linked to projects, tasks and knowledge",
      summary:
        "Ruhige Repository Workbench fuer Wiederfinden, Priorisieren und Verknuepfen. Keine GitHub-Analytics-Kopie.",
      primaryAction: "Add repository",
      secondaryActions: {
        sync: "Sync GitHub",
        captureNote: "Capture code note",
      },
      stats: [
        {
          label: "Repositories",
          value: String(repositories.length),
          detail: "static mock records",
          accent: "var(--accent-blue)",
        },
        {
          label: "Attention",
          value: String(attentionCount),
          detail: "manual signals",
          accent: "var(--accent-orange)",
        },
        {
          label: "Reviews",
          value: String(reviewCount),
          detail: "agent outputs",
          accent: "var(--accent-orange)",
        },
      ],
    },
    pageContract: {
      pageType: "Area Subpage / Repository Workbench",
      primaryPurpose:
        "Repositories wiederfinden, priorisieren und mit Projekten, Tasks, Resources und Agent Sessions verknuepfen.",
      writes:
        "Phase 2 local UI state only: repository draft, note draft, selected repository and prepared sync notice.",
      reads:
        "Mock repositories, tasks, resources, agent sessions and manual repository activity.",
      canonicalSource:
        "Future repositories entity plus canonical tasks, projects, resources and agent_sessions.",
      sensitiveData: "standard_private / work_restricted depending on repository content",
      primaryDecision:
        "Which repository needs attention and what is the next concrete step?",
      mainZone: "Repository List with linked context and attention labels.",
      emptyState:
        "No repositories, no search results and no linked tasks explain the next manual action.",
      mobileOrder:
        "Header, Search/Filter, Attention Queue, Repository List, Selected Summary, Linked Tasks, Resources, Recent Activity.",
    },
    repositories,
    tasks,
    resources,
    agentSessions,
    activity,
    projectOptions: uniqueProjectOptions(),
    providerOptions: [
      { label: "GitHub", value: "github" },
      { label: "Local", value: "local" },
      { label: "GitLab", value: "gitlab" },
      { label: "Other", value: "other" },
    ],
    statusOptions: [
      { label: "Active", value: "active" },
      { label: "Attention", value: "attention" },
      { label: "Stale", value: "stale" },
      { label: "Archived", value: "archived" },
      { label: "Review needed", value: "review_needed" },
    ],
    statusMeta: repositoryStatusMeta,
    signalMeta: repositorySignalMeta,
    emptyStates: {
      noRepositories: {
        title: "No repositories yet",
        description:
          "Add a repository to connect coding work with projects, tasks, resources and notes. No GitHub sync is assumed.",
      },
      noSearchResults: {
        title: "No repositories match this filter",
        description:
          "Loosen search or filters. Repository records are static mock data in this phase.",
      },
      noLinkedTasks: {
        title: "No linked tasks",
        description:
          "Link one concrete task before treating a repository as ready for focused work.",
      },
    },
    githubSync: {
      configured: false,
      title: "GitHub sync not configured",
      description:
        "Sync requires a server-side GitHub token or OAuth flow. This UI prepares the boundary but does not call GitHub.",
      errorState:
        "Future sync failed: keep the draft local, show the error, and never expose tokens to the client.",
    },
  };
}
