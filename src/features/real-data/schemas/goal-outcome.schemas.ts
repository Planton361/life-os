import {
  goalCriterionDirections,
  goalCriterionTypes,
} from "../domain/goal-outcome";
import {
  localDateSchema,
  requiredTrimmedStringSchema,
  z,
} from "./schema-contract";

const id = z.uuid();
const profileScope = z.object({ userId: id, profileId: id });
const optionalText = z.preprocess(
  (value) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z.string().min(1).optional(),
);
const optionalDate = z.preprocess(
  (value) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  localDateSchema.optional(),
);
const optionalNullableId = z.preprocess(
  (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    return value;
  },
  id.nullable().optional(),
);
const optionalFiniteNumber = z.preprocess(
  (value) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      return Number(trimmed);
    }
    return value;
  },
  z.number().finite().optional(),
);

export const goalMilestoneCreateInputSchema = profileScope.extend({
  goalId: id,
  title: requiredTrimmedStringSchema(1),
  description: optionalText,
  targetDate: optionalDate,
  status: z.enum(["planned", "active"]),
  sortOrder: z.coerce.number().int().nonnegative().default(0),
});

export const goalMilestoneUpdateInputSchema = profileScope.extend({
  goalId: id,
  milestoneId: id,
  title: requiredTrimmedStringSchema(1),
  description: optionalText,
  targetDate: optionalDate,
});

export const goalMilestoneStatusInputSchema = profileScope.extend({
  goalId: id,
  milestoneId: id,
  status: z.enum(["planned", "active", "achieved"]),
});

export const goalMilestoneArchiveInputSchema = profileScope.extend({
  goalId: id,
  milestoneId: id,
});

export const goalMilestoneReorderInputSchema = profileScope.extend({
  goalId: id,
  milestoneId: id,
  direction: z.enum(["up", "down"]),
});

const goalOutcomeCriterionShape = profileScope.extend({
  goalId: id,
  goalMilestoneId: optionalNullableId,
  title: requiredTrimmedStringSchema(1),
  criterionType: z.enum(goalCriterionTypes),
  unit: optionalText,
  target: optionalFiniteNumber,
  direction: z.enum(goalCriterionDirections).optional(),
});

export const goalOutcomeCriterionCreateInputSchema = goalOutcomeCriterionShape.superRefine(
  (value, context) => {
    if (value.criterionType === "boolean") {
      if (value.unit !== undefined || value.target !== undefined || value.direction !== undefined) {
        context.addIssue({
          code: "custom",
          path: ["criterionType"],
          message: "Boolean criteria cannot define a unit, target or direction.",
        });
      }
      return;
    }

    if (!value.unit) {
      context.addIssue({ code: "custom", path: ["unit"], message: "Numeric criteria need a unit." });
    }
    if (value.target === undefined) {
      context.addIssue({ code: "custom", path: ["target"], message: "Numeric criteria need a finite target." });
    }
    if (!value.direction) {
      context.addIssue({ code: "custom", path: ["direction"], message: "Numeric criteria need a direction." });
    }
  },
);

export const goalOutcomeCriterionArchiveInputSchema = profileScope.extend({
  goalId: id,
  criterionId: id,
});

export const goalCriterionEvaluationInputSchema = profileScope.extend({
  goalId: id,
  criterionId: id,
  criterionType: z.enum(goalCriterionTypes),
  evaluationState: z.enum(["value", "deferred"]).default("value"),
  booleanValue: z.boolean().optional(),
  numericValue: optionalFiniteNumber,
  unit: optionalText,
  note: optionalText,
}).superRefine((value, context) => {
  if (value.evaluationState === "deferred") {
    if (
      value.booleanValue !== undefined
      || value.numericValue !== undefined
      || value.unit !== undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["evaluationState"],
        message: "Deferred evaluations cannot define a value or unit.",
      });
    }
    return;
  }

  if (value.criterionType === "boolean") {
    if (value.booleanValue === undefined || value.numericValue !== undefined || value.unit !== undefined) {
      context.addIssue({ code: "custom", path: ["booleanValue"], message: "Boolean evaluation needs exactly one boolean value." });
    }
    return;
  }

  if (value.numericValue === undefined || !value.unit) {
    context.addIssue({ code: "custom", path: ["numericValue"], message: "Numeric evaluation needs a value and matching unit." });
  }
  if (value.booleanValue !== undefined) {
    context.addIssue({ code: "custom", path: ["booleanValue"], message: "Numeric evaluation cannot define a boolean value." });
  }
});

export const goalProjectSupportInputSchema = profileScope.extend({
  goalId: id,
  goalMilestoneId: id,
  projectId: id,
});

export const goalTaskSupportInputSchema = profileScope.extend({
  goalId: id,
  goalMilestoneId: id,
  taskId: id,
});

export const goalSupportRemoveInputSchema = profileScope.extend({
  goalId: id,
  supportId: id,
});

export const goalAchieveInputSchema = profileScope.extend({
  goalId: id,
  note: optionalText,
});

export const goalReopenInputSchema = profileScope.extend({
  goalId: id,
});

export const goalOutcomeOperationSchema = z.enum([
  "milestone.create",
  "milestone.update",
  "milestone.status",
  "milestone.archive",
  "milestone.reorder",
  "criterion.create",
  "criterion.archive",
  "criterion.evaluate",
  "support.project.add",
  "support.project.remove",
  "support.task.add",
  "support.task.remove",
  "achieve",
  "reopen",
]);

export type GoalMilestoneCreateInput = z.infer<typeof goalMilestoneCreateInputSchema>;
export type GoalMilestoneUpdateInput = z.infer<typeof goalMilestoneUpdateInputSchema>;
export type GoalMilestoneStatusInput = z.infer<typeof goalMilestoneStatusInputSchema>;
export type GoalMilestoneArchiveInput = z.infer<typeof goalMilestoneArchiveInputSchema>;
export type GoalMilestoneReorderInput = z.infer<typeof goalMilestoneReorderInputSchema>;
export type GoalOutcomeCriterionCreateInput = z.infer<typeof goalOutcomeCriterionCreateInputSchema>;
export type GoalOutcomeCriterionArchiveInput = z.infer<typeof goalOutcomeCriterionArchiveInputSchema>;
export type GoalCriterionEvaluationInput = z.infer<typeof goalCriterionEvaluationInputSchema>;
export type GoalProjectSupportInput = z.infer<typeof goalProjectSupportInputSchema>;
export type GoalTaskSupportInput = z.infer<typeof goalTaskSupportInputSchema>;
export type GoalSupportRemoveInput = z.infer<typeof goalSupportRemoveInputSchema>;
export type GoalAchieveInput = z.infer<typeof goalAchieveInputSchema>;
export type GoalReopenInput = z.infer<typeof goalReopenInputSchema>;
