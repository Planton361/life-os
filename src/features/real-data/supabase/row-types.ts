import type { TableInsert, TableRow, TableUpdate } from "./database.types";

export type InboxItemRow = TableRow<"inbox_items">;
export type InboxItemInsert = TableInsert<"inbox_items">;
export type InboxItemUpdate = TableUpdate<"inbox_items">;

export type MealRow = TableRow<"meals">;
export type MealInsert = TableInsert<"meals">;
export type MealUpdate = TableUpdate<"meals">;

export type RecipeRow = TableRow<"recipes">;
export type RecipeInsert = TableInsert<"recipes">;
export type RecipeUpdate = TableUpdate<"recipes">;

export type RecipeIngredientRow = TableRow<"recipe_ingredients">;
export type RecipeIngredientInsert = TableInsert<"recipe_ingredients">;
export type RecipeIngredientUpdate = TableUpdate<"recipe_ingredients">;

export type GoalRow = TableRow<"goals">;
export type GoalInsert = TableInsert<"goals">;
export type GoalUpdate = TableUpdate<"goals">;

export type GoalMilestoneRow = TableRow<"goal_milestones">;
export type GoalMilestoneInsert = TableInsert<"goal_milestones">;
export type GoalMilestoneUpdate = TableUpdate<"goal_milestones">;

export type GoalOutcomeCriterionRow = TableRow<"goal_outcome_criteria">;
export type GoalOutcomeCriterionInsert = TableInsert<"goal_outcome_criteria">;
export type GoalOutcomeCriterionUpdate = TableUpdate<"goal_outcome_criteria">;

export type GoalCriterionEvaluationRow = TableRow<"goal_criterion_evaluations">;
export type GoalCriterionEvaluationInsert = TableInsert<"goal_criterion_evaluations">;
export type GoalCommandReceiptRow = TableRow<"goal_command_receipts">;
export type GoalMilestoneAchievementEventRow = TableRow<"goal_milestone_achievement_events">;
export type GoalAchievementEventRow = TableRow<"goal_achievement_events">;
export type GoalAchievementCriterionBasisRow = TableRow<"goal_achievement_criterion_basis">;
export type GoalAchievementMilestoneBasisRow = TableRow<"goal_achievement_milestone_basis">;
export type GoalCriterionEvaluationEvidenceRow = TableRow<"goal_criterion_evaluation_evidence">;
export type GoalMilestoneAchievementEvidenceRow = TableRow<"goal_milestone_achievement_evidence">;
export type GoalAchievementEvidenceRow = TableRow<"goal_achievement_evidence">;

export type GoalMilestoneProjectSupportRow = TableRow<"goal_milestone_project_support">;
export type GoalMilestoneTaskSupportRow = TableRow<"goal_milestone_task_support">;

export type ProjectRow = TableRow<"projects">;
export type ProjectInsert = TableInsert<"projects">;
export type ProjectUpdate = TableUpdate<"projects">;

export type ResourceRow = TableRow<"resources">;
export type ResourceInsert = TableInsert<"resources">;
export type ResourceUpdate = TableUpdate<"resources">;

export type ResourceRelationRow = TableRow<"resource_relations">;
export type ResourceRelationInsert = TableInsert<"resource_relations">;
export type ResourceRelationUpdate = TableUpdate<"resource_relations">;

export type RecurringTaskTemplateRow = TableRow<"recurring_task_templates">;
export type RecurringTaskTemplateInsert =
  TableInsert<"recurring_task_templates">;
export type RecurringTaskTemplateUpdate =
  TableUpdate<"recurring_task_templates">;

export type SkillRow = TableRow<"skills">;
export type SkillInsert = TableInsert<"skills">;
export type SkillUpdate = TableUpdate<"skills">;

export type SkillEvidenceRow = TableRow<"skill_evidence">;
export type SkillEvidenceInsert = TableInsert<"skill_evidence">;
export type SkillEvidenceUpdate = TableUpdate<"skill_evidence">;

export type TaskSkillLinkRow = TableRow<"task_skill_links">;
export type TaskSkillLinkInsert = TableInsert<"task_skill_links">;

export type TaskRow = TableRow<"tasks">;
export type TaskInsert = TableInsert<"tasks">;
export type TaskUpdate = TableUpdate<"tasks">;

export type ReviewRecordRow = TableRow<"review_records">;
export type ReviewTaskDecisionRow = TableRow<"review_task_decisions">;
