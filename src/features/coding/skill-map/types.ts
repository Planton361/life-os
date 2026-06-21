export type CodingSkillCategory =
  | "frontend"
  | "backend"
  | "database"
  | "devops"
  | "testing"
  | "architecture"
  | "ai_agents"
  | "language"
  | "tooling"
  | "design_system";

export type CodingSkillStatus =
  | "strong"
  | "usable"
  | "learning"
  | "weak"
  | "missing";

export type CodingSkillLevel =
  | "none"
  | "basic"
  | "working"
  | "solid"
  | "advanced";

export type CodingSkill = {
  id: string;
  title: string;
  category: CodingSkillCategory;
  status: CodingSkillStatus;
  level: CodingSkillLevel;
  confidence: number;
  summary: string;
  evidenceCount: number;
  lastUsedAt?: string;
  nextPractice?: string;
  x: number;
  y: number;
};

export type SkillConnectionType =
  | "prerequisite"
  | "related"
  | "supports"
  | "used_with"
  | "extends";

export type SkillConnection = {
  id: string;
  sourceSkillId: string;
  targetSkillId: string;
  type: SkillConnectionType;
  strength: "weak" | "medium" | "strong";
};

export type SkillCluster = {
  id: string;
  title: string;
  category: CodingSkillCategory;
  description: string;
  colorToken: "blue" | "cyan" | "orange" | "green" | "purple" | "gray";
  skillIds: string[];
};

export type SkillEvidence = {
  id: string;
  skillId: string;
  title: string;
  type: "project" | "repo" | "task" | "note" | "session" | "course";
  sourceTitle: string;
  createdAt: string;
};

export type FutureCodingProject = {
  id: string;
  title: string;
  description: string;
  status: "idea" | "planned" | "active" | "later";
  priority: "low" | "medium" | "high";
  requiredSkillIds: string[];
  optionalSkillIds: string[];
  nextAction: string;
};

export type ProjectSkillRequirement = {
  projectId: string;
  skillId: string;
  importance: "required" | "recommended" | "optional";
  currentFit: "ready" | "partial" | "gap";
  note: string;
};

export type LearningRecommendation = {
  id: string;
  skillId: string;
  title: string;
  reason: string;
  linkedProjectId?: string;
  estimatedEffort: "small" | "medium" | "large";
  nextAction: string;
};

export type SkillMapFilter = {
  search: string;
  segment: "map" | "gaps" | "projects" | "evidence";
  category: "all" | CodingSkillCategory;
  status: "all" | CodingSkillStatus;
  level: "all" | CodingSkillLevel;
  projectId: "all" | string;
  hasGap: boolean;
  hasEvidence: boolean;
};

export type SkillMapPageContract = {
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

export type SkillMapViewModel = {
  generatedAt: string;
  pageContract: SkillMapPageContract;
  skills: CodingSkill[];
  connections: SkillConnection[];
  clusters: SkillCluster[];
  evidence: SkillEvidence[];
  projects: FutureCodingProject[];
  requirements: ProjectSkillRequirement[];
  recommendations: LearningRecommendation[];
  rules: string[];
  insight: string;
  emptyStates: {
    noSkills: { title: string; description: string };
    noRequirements: { title: string; description: string };
    noEvidence: { title: string; description: string };
    noSearchResults: { title: string; description: string };
  };
  futureErrorState: {
    title: string;
    description: string;
  };
};
