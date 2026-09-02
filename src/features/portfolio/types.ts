import type { ContentStateMeta } from "@/features/content-state";
import type { SemanticConnectedContext } from "@/features/semantic-relations/read-model";
import type {
  GoalHorizon,
  GoalStatus,
  ProjectStatus,
} from "@/features/entities/types";

export type PortfolioProfileId = "demo" | "empty" | "manual";

export type PortfolioEntityType = "task" | "project" | "goal" | "skill";

export type PortfolioView = "all" | "tasks" | "projects" | "goals" | "skills";

export type PortfolioVisibilityReason =
  | "blocked"
  | "needs_decision"
  | "needs_review"
  | "high_focus"
  | "due_this_week"
  | "recently_touched"
  | "stale"
  | "in_motion";

export type PortfolioGroup = "attention" | "in_motion" | "later_this_week";

export type PortfolioArea =
  | "education"
  | "work"
  | "coding"
  | "health"
  | "nutrition"
  | "personal"
  | "review"
  | "system";

export type PortfolioStatus =
  | "planned"
  | "active"
  | "in_progress"
  | "practicing"
  | "blocked"
  | "needs_decision"
  | "review_open"
  | "done";

export type PortfolioPriority = "P1" | "P2" | "P3" | "none";

export type PortfolioFocusLevel = "high" | "medium" | "low";

export type PortfolioScopeFilter =
  | "all"
  | "due_this_week"
  | "in_progress"
  | "blocked"
  | "needs_decision"
  | "review_open"
  | "high_focus"
  | "area_education"
  | "area_work"
  | "area_coding"
  | "area_health";

export type PortfolioSortMode = "priority" | "deadline" | "recent";

export type PortfolioRelation = {
  label: string;
  value: string;
};

export type PortfolioLinkedResource = {
  id: string;
  relationId?: string;
  title: string;
  type: string;
  source?: string | null;
  relationType: string;
  createdAt: string;
};

export type PortfolioResourceLinkOption = {
  id: string;
  title: string;
  type: string;
  source?: string | null;
};

export type PortfolioDecision = {
  title: string;
  detail: string;
  state: "decide" | "ready" | "blocked" | "watch";
};

export type PortfolioSourceLink = {
  label: string;
  href: `/${string}`;
};

export type PortfolioTaskLifecycle = {
  status:
    | "inbox"
    | "planned"
    | "active"
    | "waiting"
    | "done"
    | "canceled"
    | "someday";
  plannedDate?: string;
  scheduledTime?: string;
  durationMinutes: number;
};

export type PortfolioTaskEditValues = {
  areaId?: string;
  description?: string;
  dueAt?: string;
  durationMinutes?: number;
  energy?: "low" | "medium" | "high";
  goalId?: string;
  nextAction?: string;
  plannedDate?: string;
  priority: "P0" | "P1" | "P2" | "P3" | "none";
  projectId?: string;
  status: PortfolioTaskLifecycle["status"];
  title: string;
};

export type PortfolioSkillEvidence = {
  detail?: string;
  evidenceDate?: string;
  href?: `/${string}`;
  id?: string;
  note?: string;
  skillId?: string;
  skillTitle?: string;
  sourceType?: "goal" | "manual_note" | "project" | "resource" | "task";
  sourceLabel: string;
  title: string;
  weight?: number | null;
};

export type PortfolioSkillSourceTarget = {
  id: string;
  label: string;
  meta?: string;
  sourceType: "goal" | "project" | "resource" | "task";
};

export type PortfolioTaskSkillLink = {
  createdAt: string;
  relationId: string;
  skillId: string;
  skillTitle: string;
  taskId: string;
  taskTitle: string;
};

export type PortfolioSkillEditValues = {
  category?: string;
  level?: string;
  name: string;
  status: "active" | "paused";
  summary?: string;
};

export type PortfolioSkillContext = {
  practiceStatus: string;
  confidence: "low" | "medium" | "high";
  nextSession: string;
  evidence: string;
  editValues?: PortfolioSkillEditValues;
  evidenceRows?: readonly PortfolioSkillEvidence[];
  linkedTasks?: readonly PortfolioTaskSkillLink[];
  sourceTargets?: readonly PortfolioSkillSourceTarget[];
};

export type PortfolioProjectEditValues = {
  description?: string;
  goalId?: string;
  nextStep?: string;
  status: ProjectStatus;
  title: string;
};

export type PortfolioGoalEditValues = {
  description?: string;
  horizon: GoalHorizon;
  status: GoalStatus;
  title: string;
};

export type PortfolioTaskEntity = PortfolioEntity & {
  type: "task";
  taskLifecycle: PortfolioTaskLifecycle;
};

export type PortfolioProjectEntity = PortfolioEntity & {
  type: "project";
};

export type ProjectWorkbenchViewModel = {
  project: {
    id: string;
    title: string;
    summary?: string;
    status?: string;
    progress?: number;
    areaLabel?: string;
  };
  linkedTasks: PortfolioTaskEntity[];
  nextTasks: PortfolioTaskEntity[];
  completedTasks: PortfolioTaskEntity[];
  metrics: {
    totalTasks: number;
    openTasks: number;
    completedTasks: number;
    scheduledTasks: number;
  };
  sections: {
    milestones: "connected" | "prepared";
    resources: "connected" | "prepared";
    logs: "connected" | "prepared";
  };
};

export type GoalWorkbenchViewModel = {
  goal: {
    id: string;
    title: string;
    summary?: string;
    status?: string;
    progress?: number;
    areaLabel?: string;
  };
  linkedProjects: PortfolioProjectEntity[];
  linkedTasks: PortfolioTaskEntity[];
  nextTasks: PortfolioTaskEntity[];
  completedTasks: PortfolioTaskEntity[];
  metrics: {
    totalProjects: number;
    activeProjects: number;
    totalTasks: number;
    openTasks: number;
    completedTasks: number;
    scheduledTasks: number;
  };
  sections: {
    milestones: "connected" | "prepared";
    reviewCadence: "connected" | "prepared";
    resources: "connected" | "prepared";
    logs: "connected" | "prepared";
  };
};

export type PortfolioEntity = {
  id: string;
  type: PortfolioEntityType;
  title: string;
  description: string;
  area: PortfolioArea;
  status: PortfolioStatus;
  priority: PortfolioPriority;
  focusLevel: PortfolioFocusLevel;
  nextAction: string;
  dueLabel: string;
  dueRank: number;
  energy?: string;
  progress: number;
  countLabel: string;
  lastTouched: string;
  recentRank: number;
  reviewNeeded: boolean;
  blocked: boolean;
  connectedContext?: SemanticConnectedContext;
  relations: PortfolioRelation[];
  decisions: PortfolioDecision[];
  sourceLinks: PortfolioSourceLink[];
  noteSnippet: string;
  goalId?: string;
  goalEditValues?: PortfolioGoalEditValues;
  projectId?: string;
  linkedEvidence?: readonly PortfolioSkillEvidence[];
  linkedSkills?: readonly PortfolioTaskSkillLink[];
  linkedResources?: readonly PortfolioLinkedResource[];
  projectEditValues?: PortfolioProjectEditValues;
  taskLifecycle?: PortfolioTaskLifecycle;
  taskEditValues?: PortfolioTaskEditValues;
  skillContext?: PortfolioSkillContext;
};

export type PortfolioOption<TValue extends string> = {
  value: TValue;
  label: string;
  description?: string;
};

export type PortfolioStat = {
  label: string;
  value: string;
  detail: string;
  accent: string;
};

export type PortfolioViewModel = {
  profileId: PortfolioProfileId;
  header: {
    eyebrow: string;
    title: "Portfolio";
    summary: string;
    dateRange: string;
  };
  pageContract: {
    pageType: string;
    canonicalSource: string;
  };
  views: PortfolioOption<PortfolioView>[];
  filters: PortfolioOption<PortfolioScopeFilter>[];
  sorts: PortfolioOption<PortfolioSortMode>[];
  stats: PortfolioStat[];
  entities: PortfolioEntity[];
  resourceLinkOptions: readonly PortfolioResourceLinkOption[];
  contentStates: {
    page: ContentStateMeta;
    summary: ContentStateMeta;
    entityList: ContentStateMeta;
    contextPanel: ContentStateMeta;
  };
};
