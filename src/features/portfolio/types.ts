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

export type PortfolioDecision = {
  title: string;
  detail: string;
  state: "decide" | "ready" | "blocked" | "watch";
};

export type PortfolioSourceLink = {
  label: string;
  href: `/${string}`;
};

export type PortfolioSkillContext = {
  practiceStatus: string;
  confidence: "low" | "medium" | "high";
  nextSession: string;
  evidence: string;
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
  progress: number;
  countLabel: string;
  lastTouched: string;
  recentRank: number;
  reviewNeeded: boolean;
  blocked: boolean;
  relations: PortfolioRelation[];
  decisions: PortfolioDecision[];
  sourceLinks: PortfolioSourceLink[];
  noteSnippet: string;
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
};
