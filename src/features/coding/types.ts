export type CodingProject = {
  id: string;
  title: string;
  status: string;
  nextAction: string;
  area: string;
};

export type Repository = {
  id: string;
  name: string;
  provider: string;
  defaultBranch: string;
  status: string;
  lastActivityAt: string;
  nextAction: string;
};

export type CodingSession = {
  id: string;
  projectId: string;
  repositoryId: string;
  goal: string;
  startedAt: string;
  endedAt?: string;
  outcome: string;
};

export type AgentSession = {
  id: string;
  status: "active" | "completed" | "review_needed";
  promptRef: string;
  outputSummary: string;
  reviewNeeded: boolean;
};

export type RepositorySignal =
  | "stale_branch"
  | "failed_check"
  | "missing_next_action"
  | "open_review";

export type KnowledgeUpdateType = "Note" | "Decision" | "Snippet" | "Question";

export type CodingPageContract = {
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

export type CodingHeaderViewModel = {
  eyebrow: string;
  title: string;
  summary: string;
  contextLine: string;
  primaryAction: string;
  secondaryActions: string[];
  stats: Array<{
    label: string;
    accent: string;
  }>;
};

export type CurrentCodingFocusViewModel = {
  projectId: string;
  repositoryId: string;
  projectTitle: string;
  repositoryName: string;
  branchContext: string;
  nextAction: string;
  plannedDuration: string;
  expectedOutput: string;
  contextLabel: string;
};

export type ActiveWorkItemViewModel = {
  id: string;
  projectId: string;
  repositoryId: string;
  title: string;
  repositoryName: string;
  status: string;
  nextAction: string;
  area: string;
  accent: string;
};

export type AgentSessionViewModel = AgentSession & {
  statusLabel: string;
  statusAccent: string;
  helperText: string;
};

export type RepositoryAttentionViewModel = {
  repositoryId: string;
  name: string;
  provider: string;
  defaultBranch: string;
  status: string;
  lastActivityAt: string;
  lastActivityLabel: string;
  nextAction: string;
  summary: string;
  signals: RepositorySignal[];
  primarySignalLabel: string;
  primarySignalAccent: string;
  checksSummary: string;
  reviewSummary: string;
};

export type RecentCodingSessionViewModel = CodingSession & {
  projectTitle: string;
  repositoryName: string;
  durationLabel: string;
  timeLabel: string;
  outcomeLabel: string;
};

export type SkillFocusViewModel = {
  title: string;
  summary: string;
  evidenceStatus: string;
  progress: number;
  evidenceDetail: string;
  primaryAction: string;
  secondaryAction: string;
};

export type KnowledgeUpdateViewModel = {
  id: string;
  type: KnowledgeUpdateType;
  title: string;
  summary: string;
  updatedAt: string;
  accent: string;
};

export type CodingRhythmDayViewModel = {
  day: string;
  sessions: number;
  minutes: number;
  label: string;
};

export type CodingRhythmViewModel = {
  title: string;
  period: string;
  statement: string;
  days: CodingRhythmDayViewModel[];
  insight: string;
};

export type CodingOverviewViewModel = {
  profileId: "demo" | "empty" | "manual";
  header: CodingHeaderViewModel;
  pageContract: CodingPageContract;
  projects: CodingProject[];
  repositories: Repository[];
  currentFocus: CurrentCodingFocusViewModel | null;
  activeWork: ActiveWorkItemViewModel[];
  agentQueue: AgentSessionViewModel[];
  repositoriesAttention: RepositoryAttentionViewModel[];
  recentSessions: RecentCodingSessionViewModel[];
  skillFocus: SkillFocusViewModel | null;
  knowledgeUpdates: KnowledgeUpdateViewModel[];
  codingRhythm: CodingRhythmViewModel;
  emptyStates: {
    noRepositories: {
      title: string;
      description: string;
    };
    noFocus: {
      title: string;
      description: string;
    };
  };
};
