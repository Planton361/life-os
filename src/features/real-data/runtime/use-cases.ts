import "server-only";
import type * as goal from "../supabase/repositories/supabase-goal-outcome-repository";
import type * as task_dependency_repository from "../supabase/repositories/task-dependency-repository";
import type * as task_step_repository from "../supabase/repositories/task-step-repository";
import type * as project_artifact_repository from "../supabase/repositories/project-artifact-repository";
import type * as project_milestone_repository from "../supabase/repositories/project-milestone-repository";
import type * as project_depth_repository from "../supabase/repositories/project-depth-repository";

type Bound<F> = F extends (client: never, ...args: infer A) => infer R
  ? (...args: A) => R
  : never;
export type ApplicationUseCases = Readonly<{
  triageInbox: import("../repositories").TriageInboxItemToTaskTransaction;
  resourceFromInbox: import("../repositories").CreateResourceFromInboxTransaction;
  applyNutritionPlan(
    operations: unknown,
  ): Promise<{ error: { message: string } | null }>;
  skillDevelopmentCommand(
    input: NonNullable<
      ReturnType<
        typeof import("../schemas/skill-development.schema").parseSkillCommand
      >["data"]
    >,
  ): Promise<{ data: unknown; error: { message: string } | null }>;
  createGoalContextProject: Bound<typeof goal.createGoalContextProject>;
  createGoalContextTask: Bound<typeof goal.createGoalContextTask>;
  getGoalOutcome: Bound<typeof goal.getGoalOutcome>;
  getGoalOutcomeSummaries: Bound<typeof goal.getGoalOutcomeSummaries>;
  createGoalMilestone: Bound<typeof goal.createGoalMilestone>;
  updateGoalMilestone: Bound<typeof goal.updateGoalMilestone>;
  setGoalMilestoneStatus: Bound<typeof goal.setGoalMilestoneStatus>;
  archiveGoalMilestone: Bound<typeof goal.archiveGoalMilestone>;
  reorderGoalMilestone: Bound<typeof goal.reorderGoalMilestone>;
  createGoalCriterion: Bound<typeof goal.createGoalCriterion>;
  archiveGoalCriterion: Bound<typeof goal.archiveGoalCriterion>;
  appendGoalCriterionEvaluation: Bound<
    typeof goal.appendGoalCriterionEvaluation
  >;
  appendGoalCriterionRevision: Bound<typeof goal.appendGoalCriterionRevision>;
  addGoalCriterionEvidence: Bound<typeof goal.addGoalCriterionEvidence>;
  addGoalMilestoneEvidence: Bound<typeof goal.addGoalMilestoneEvidence>;
  addGoalAchievementEvidence: Bound<typeof goal.addGoalAchievementEvidence>;
  amendGoalMilestoneAchievementEvent: Bound<
    typeof goal.amendGoalMilestoneAchievementEvent
  >;
  amendGoalAchievementEvent: Bound<typeof goal.amendGoalAchievementEvent>;
  addGoalProjectSupport: Bound<typeof goal.addGoalProjectSupport>;
  removeGoalProjectSupport: Bound<typeof goal.removeGoalProjectSupport>;
  addGoalTaskSupport: Bound<typeof goal.addGoalTaskSupport>;
  removeGoalTaskSupport: Bound<typeof goal.removeGoalTaskSupport>;
  achieveGoal: Bound<typeof goal.achieveGoal>;
  reopenGoal: Bound<typeof goal.reopenGoal>;
  readProjectDepth: Bound<typeof project_depth_repository.readProjectDepth>;
  writeProjectDepth: Bound<typeof project_depth_repository.writeProjectDepth>;
  writeProjectMilestone: Bound<
    typeof project_milestone_repository.writeProjectMilestone
  >;
  setProjectResourceRole: Bound<
    typeof project_artifact_repository.setProjectResourceRole
  >;
  readTaskDependencyGraph: Bound<
    typeof task_dependency_repository.readTaskDependencyGraph
  >;
  writeTaskDependency: Bound<
    typeof task_dependency_repository.writeTaskDependency
  >;
  writeTaskStep: Bound<typeof task_step_repository.writeTaskStep>;
}>;
