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
