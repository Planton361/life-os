export type EntityKind = "task" | "project" | "goal" | "skill";

export type EntityPriority = "P0" | "P1" | "P2" | "P3" | "none";

export type EntityArea =
  | "coding"
  | "education"
  | "work"
  | "health"
  | "nutrition"
  | "review"
  | "system"
  | "personal";

export type TaskStatus =
  | "inbox"
  | "planned"
  | "active"
  | "waiting"
  | "done"
  | "canceled"
  | "someday";

export type TaskType =
  | "task"
  | "routine"
  | "review-trigger"
  | "admin"
  | "deep-work";

export type ProjectStatus =
  | "idea"
  | "active"
  | "paused"
  | "blocked"
  | "completed"
  | "archived";

export type GoalStatus =
  | "draft"
  | "active"
  | "paused"
  | "achieved"
  | "archived";

export type SkillStatus =
  | "interested"
  | "learning"
  | "practicing"
  | "applied"
  | "demonstrated"
  | "maintaining"
  | "paused";

export type MilestoneStatus = "planned" | "active" | "done" | "blocked";

export type EntityLink = {
  label: string;
  href: `/${string}`;
};

export type EntityActivity = {
  label: string;
  detail: string;
  dateLabel: string;
};

export type EntityEvidence = {
  title: string;
  detail: string;
  sourceLabel: string;
  href?: `/${string}`;
};

export type EntityMilestone = {
  id: string;
  title: string;
  status: MilestoneStatus;
  dueDate?: string;
  progress: number;
  linkedTaskIds?: readonly string[];
  linkedProjectId?: string;
  linkedGoalId?: string;
  linkedSkillId?: string;
};

export type LifeTask = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: EntityPriority;
  createdAt?: string;
  updatedAt?: string;
  date?: string;
  startTime?: string;
  durationMinutes?: number;
  energy?: "low" | "medium" | "high";
  areaId: EntityArea;
  projectId?: string;
  goalId?: string;
  skillId?: string;
  generatedFromTemplateId?: string;
  instanceDate?: string;
  isGenerated?: boolean;
  type: TaskType;
  nextStep: string;
  resultNote?: string;
  reviewNeeded: boolean;
  source?: string;
  timeline: readonly EntityActivity[];
  evidence: readonly EntityEvidence[];
  calendarBlockIds?: readonly string[];
  inboxItemIds?: readonly string[];
  scheduleSource?: { id: string; type: "meal" | "review" | "running_plan_item" | "strength_plan" };
};

export type LifeProject = {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  areaId: EntityArea;
  goalId?: string;
  skillIds?: readonly string[];
  nextStep: string;
  progress: number;
  deadline?: string;
  focusThisWeek: boolean;
  risk?: string;
  blocker?: string;
  priority: EntityPriority;
  phase: string;
  taskIds: readonly string[];
  milestoneIds: readonly string[];
  notes: readonly EntityEvidence[];
  activity: readonly EntityActivity[];
};

export type GoalHorizon = "week" | "month" | "quarter" | "year" | "someday";

export type LifeGoal = {
  id: string;
  title: string;
  description: string;
  status: GoalStatus;
  horizon: GoalHorizon;
  why: string;
  measure: string;
  currentValue: string;
  targetValue: string;
  remaining: string;
  progress: number;
  nextStep: string;
  areaId: EntityArea;
  linkedProjectIds: readonly string[];
  linkedTaskIds: readonly string[];
  milestoneIds: readonly string[];
  reviewNotes: readonly EntityEvidence[];
};

export type SkillPathStage = {
  title: string;
  status: MilestoneStatus;
  detail: string;
};

export type LifeSkill = {
  id: string;
  title: string;
  description: string;
  areaId: EntityArea;
  status: SkillStatus;
  currentLevel: string;
  targetLevel: string;
  progress: number;
  nextPractice: string;
  lastPracticedAt: string;
  practiceFrequency: string;
  linkedTaskIds: readonly string[];
  linkedProjectIds: readonly string[];
  linkedGoalIds: readonly string[];
  milestoneIds: readonly string[];
  learningPath: readonly SkillPathStage[];
  evidence: readonly EntityEvidence[];
};

export type EntityCollection = {
  tasks: readonly LifeTask[];
  projects: readonly LifeProject[];
  goals: readonly LifeGoal[];
  skills: readonly LifeSkill[];
  milestones: readonly EntityMilestone[];
};

export type WorkbenchSearchParams = Record<
  string,
  string | string[] | undefined
>;
