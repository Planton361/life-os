export type RepositoryProvider = "github" | "local" | "gitlab" | "other";

export type RepositoryStatus =
  | "active"
  | "attention"
  | "stale"
  | "archived"
  | "review_needed";

export type RepositorySignal =
  | "missing_next_action"
  | "failed_check"
  | "open_review"
  | "stale_branch"
  | "unlinked_tasks"
  | "missing_resources"
  | "healthy";

export type CodingRepository = {
  id: string;
  name: string;
  fullName: string;
  provider: RepositoryProvider;
  visibility: "private" | "public";
  defaultBranch: string;
  activeBranch?: string;
  language?: string;
  status: RepositoryStatus;
  signals: RepositorySignal[];
  description: string;
  linkedProjectId?: string;
  linkedProjectTitle?: string;
  nextAction?: string;
  lastActivityAt: string;
  openTaskCount: number;
  resourceCount: number;
  noteCount: number;
  agentSessionCount: number;
};

export type RepositoryLinkedTask = {
  id: string;
  title: string;
  status: "open" | "in_progress" | "blocked" | "done";
  priority: "low" | "medium" | "high";
  repositoryId: string;
  projectId?: string;
  dueLabel?: string;
};

export type RepositoryResource = {
  id: string;
  title: string;
  type: "doc" | "decision" | "snippet" | "note" | "prompt" | "link";
  repositoryId: string;
  updatedAt: string;
};

export type RepositoryAgentSession = {
  id: string;
  repositoryId: string;
  status: "active" | "completed" | "review_needed";
  outputSummary: string;
  reviewNeeded: boolean;
};

export type RepositoryActivity = {
  id: string;
  repositoryId: string;
  type: "note_saved" | "task_linked" | "agent_output_reviewed" | "branch_marked_stale";
  title: string;
  detail: string;
  happenedAt: string;
};

export type RepositoryWorkbenchFilter = {
  search: string;
  status: RepositoryStatus | "all";
  provider: RepositoryProvider | "all";
  project: string;
  attentionOnly: boolean;
  segment: "all" | "attention" | "active" | "archived";
};

export type RepositoryOption = {
  label: string;
  value: string;
};

export type RepositoryStatusMeta = {
  label: string;
  accent: string;
  description: string;
};

export type RepositorySignalMeta = {
  label: string;
  accent: string;
  description: string;
  attention: boolean;
};

export type RepositoryWorkbenchViewModel = {
  header: {
    eyebrow: string;
    title: string;
    contextLine: string;
    summary: string;
    primaryAction: string;
    secondaryActions: {
      sync: string;
      captureNote: string;
    };
    stats: Array<{
      label: string;
      value: string;
      detail: string;
      accent: string;
    }>;
  };
  pageContract: {
    pageType: string;
    primaryPurpose: string;
    writes: string;
    reads: string;
    canonicalSource: string;
    sensitiveData: string;
    primaryDecision: string;
    mainZone: string;
    emptyState: string;
    mobileOrder: string;
  };
  repositories: CodingRepository[];
  tasks: RepositoryLinkedTask[];
  resources: RepositoryResource[];
  agentSessions: RepositoryAgentSession[];
  activity: RepositoryActivity[];
  projectOptions: RepositoryOption[];
  providerOptions: RepositoryOption[];
  statusOptions: RepositoryOption[];
  statusMeta: Record<RepositoryStatus, RepositoryStatusMeta>;
  signalMeta: Record<RepositorySignal, RepositorySignalMeta>;
  emptyStates: {
    noRepositories: {
      title: string;
      description: string;
    };
    noSearchResults: {
      title: string;
      description: string;
    };
    noLinkedTasks: {
      title: string;
      description: string;
    };
  };
  githubSync: {
    configured: false;
    title: string;
    description: string;
    errorState: string;
  };
};
