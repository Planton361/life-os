export type AgentWorkerStatus =
  | "available"
  | "busy"
  | "offline"
  | "limited"
  | "needs_setup";

export type AgentWorkerCapability =
  | "coding"
  | "review"
  | "research"
  | "documentation"
  | "debugging"
  | "planning"
  | "refactor"
  | "testing"
  | "prompting";

export type AgentWorker = {
  id: string;
  name: string;
  role: string;
  provider: "codex" | "claude" | "cursor" | "copilot" | "manual" | "other";
  status: AgentWorkerStatus;
  capabilities: AgentWorkerCapability[];
  currentTaskId?: string;
  lastSessionAt?: string;
  reliabilityNote: string;
  constraints: string[];
};

export type AgentTaskStatus =
  | "draft"
  | "queued"
  | "running"
  | "blocked"
  | "review_needed"
  | "completed"
  | "rejected"
  | "archived";

export type AgentTaskPriority = "low" | "medium" | "high";

export type AgentTask = {
  id: string;
  title: string;
  goal: string;
  status: AgentTaskStatus;
  priority: AgentTaskPriority;
  assignedWorkerId?: string;
  linkedProjectId?: string;
  linkedProjectTitle?: string;
  repositoryId?: string;
  repositoryName?: string;
  promptTemplateId?: string;
  contextBundleIds: string[];
  expectedOutput: "plan" | "code" | "review" | "summary" | "note" | "research";
  reviewRequired: boolean;
  createdAt: string;
  dueLabel?: string;
  nextAction: string;
};

export type AgentSession = {
  id: string;
  taskId: string;
  workerId: string;
  status: AgentTaskStatus;
  startedAt?: string;
  endedAt?: string;
  promptRef: string;
  outputSummary: string;
  followUp?: string;
  reviewNeeded: boolean;
  linkedProjectId?: string;
  repositoryId?: string;
};

export type AgentOutput = {
  id: string;
  sessionId: string;
  type: "diff" | "plan" | "summary" | "note" | "research" | "prompt";
  title: string;
  summary: string;
  riskLevel: "low" | "medium" | "high";
  reviewStatus: "pending" | "accepted" | "edited" | "rejected" | "saved_as_note";
  createdAt: string;
};

export type PromptTemplate = {
  id: string;
  title: string;
  purpose: string;
  category: "coding" | "review" | "research" | "planning" | "documentation";
  lastUsedAt?: string;
};

export type ContextBundle = {
  id: string;
  title: string;
  sourceType: "repository" | "project" | "design" | "docs" | "prompt" | "mixed";
  linkedItems: number;
  updatedAt: string;
  linkedProjectId?: string;
  linkedProjectTitle?: string;
  repositoryId?: string;
  repositoryName?: string;
};

export type AgentProjectOption = {
  id: string;
  title: string;
};

export type AgentRepositoryOption = {
  id: string;
  name: string;
  fullName: string;
};

export type AgentHubFilter = {
  search: string;
  segment: "all" | "queued" | "running" | "review" | "blocked" | "completed";
  workerId: "all" | string;
  repositoryId: "all" | string;
  projectId: "all" | string;
  riskLevel: "all" | AgentOutput["riskLevel"];
  outputType: "all" | AgentOutput["type"];
};

export type AgentStatusMeta = {
  label: string;
  accent: string;
  description: string;
};

export type AgentHubEmptyStates = {
  noTasks: {
    title: string;
    description: string;
  };
  noWorkers: {
    title: string;
    description: string;
  };
  noReviewItems: {
    title: string;
    description: string;
  };
  noPrompts: {
    title: string;
    description: string;
  };
};

export type AgentHubPageContract = {
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

export type AgentHubViewModel = {
  profileId: "demo" | "empty" | "manual";
  generatedAt: string;
  pageContract: AgentHubPageContract;
  workers: AgentWorker[];
  tasks: AgentTask[];
  sessions: AgentSession[];
  outputs: AgentOutput[];
  promptTemplates: PromptTemplate[];
  contextBundles: ContextBundle[];
  projects: AgentProjectOption[];
  repositories: AgentRepositoryOption[];
  emptyStates: AgentHubEmptyStates;
  statusMeta: Record<AgentTaskStatus, AgentStatusMeta>;
  workerStatusMeta: Record<AgentWorkerStatus, AgentStatusMeta>;
  priorityMeta: Record<AgentTaskPriority, AgentStatusMeta>;
  guardrails: string[];
  futureErrorState: {
    title: string;
    description: string;
  };
};
