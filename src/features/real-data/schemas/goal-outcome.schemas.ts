import {
  goalCriterionDirections,
  goalCriterionTypes,
} from "../domain/goal-outcome";
import {
  localDateSchema,
  dateTimeStringSchema,
  optionalDateTimeStringSchema,
  requiredTrimmedStringSchema,
  z,
} from "./schema-contract";

const id = z.uuid();
const profileScope = z.object({ userId: id, profileId: id });
const optionalText = z.preprocess((value) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().min(1).optional());
const optionalDate = z.preprocess((value) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, localDateSchema.optional());
const optionalNullableId = z.preprocess((value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return value;
}, id.nullable().optional());
const optionalFiniteNumber = z.preprocess((value) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return Number(trimmed);
  }
  return value;
}, z.number().finite().optional());
const commandMetadata = {
  commandId: id.optional(),
  expectedUpdatedAt: dateTimeStringSchema.optional(),
};

export const goalMilestoneCreateInputSchema = profileScope.extend({
  goalId: id,
  title: requiredTrimmedStringSchema(1),
  description: optionalText,
  targetDate: optionalDate,
  status: z.literal("planned"),
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
  note: optionalText,
  ...commandMetadata,
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

export const goalOutcomeCriterionCreateInputSchema =
  goalOutcomeCriterionShape.superRefine((value, context) => {
    if (value.criterionType === "boolean") {
      if (
        value.unit !== undefined ||
        value.target !== undefined ||
        value.direction !== undefined
      ) {
        context.addIssue({
          code: "custom",
          path: ["criterionType"],
          message:
            "Boolean criteria cannot define a unit, target or direction.",
        });
      }
      return;
    }

    if (!value.unit) {
      context.addIssue({
        code: "custom",
        path: ["unit"],
        message: "Numeric criteria need a unit.",
      });
    }
    if (value.target === undefined) {
      context.addIssue({
        code: "custom",
        path: ["target"],
        message: "Numeric criteria need a finite target.",
      });
    }
    if (!value.direction) {
      context.addIssue({
        code: "custom",
        path: ["direction"],
        message: "Numeric criteria need a direction.",
      });
    }
  });

export const goalOutcomeCriterionArchiveInputSchema = profileScope.extend({
  goalId: id,
  criterionId: id,
});

export const goalCriterionEvaluationInputSchema = profileScope
  .extend({
    goalId: id,
    criterionId: id,
    criterionType: z.enum(goalCriterionTypes),
    evaluationState: z.enum(["value", "deferred"]).default("value"),
    booleanValue: z.boolean().optional(),
    numericValue: optionalFiniteNumber,
    unit: optionalText,
    note: optionalText,
    expectedLatestEvaluationId: optionalNullableId,
    correctionReason: optionalText,
    retrospective: z.boolean().optional(),
    ...commandMetadata,
  })
  .superRefine((value, context) => {
    if (value.evaluationState === "deferred") {
      if (
        value.booleanValue !== undefined ||
        value.numericValue !== undefined ||
        value.unit !== undefined
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
      if (
        value.booleanValue === undefined ||
        value.numericValue !== undefined ||
        value.unit !== undefined
      ) {
        context.addIssue({
          code: "custom",
          path: ["booleanValue"],
          message: "Boolean evaluation needs exactly one boolean value.",
        });
      }
      return;
    }

    if (value.numericValue === undefined || !value.unit) {
      context.addIssue({
        code: "custom",
        path: ["numericValue"],
        message: "Numeric evaluation needs a value and matching unit.",
      });
    }
    if (value.booleanValue !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["booleanValue"],
        message: "Numeric evaluation cannot define a boolean value.",
      });
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
  references: z
    .array(
      z.object({
        sourceType: z.enum([
          "project",
          "project_milestone",
          "task",
          "resource",
          "review_record",
        ]),
        sourceId: id,
        reason: optionalText,
      }),
    )
    .max(20)
    .optional(),
  ...commandMetadata,
});

export const goalReopenInputSchema = profileScope.extend({
  goalId: id,
  ...commandMetadata,
});

export const goalCriterionEvidenceInputSchema = profileScope
  .extend({
    goalId: id,
    evaluationId: id,
    action: z
      .enum(["attached", "replaced", "withdrawn", "supplemented"])
      .default("attached"),
    references: z
      .array(
        z.object({
          sourceType: z
            .enum([
              "task",
              "project",
              "project_milestone",
              "resource",
              "review_record",
            ])
            .optional(),
          sourceId: id.optional(),
          supersedesReferenceId: id.optional(),
          reason: optionalText,
        }),
      )
      .min(1)
      .max(20),
    retrospective: z.boolean().optional(),
    ...commandMetadata,
  })
  .superRefine((value, context) => {
    validateEvidenceReferences(
      value.action,
      value.references,
      value.retrospective ?? false,
      context,
    );
  });

export const goalMilestoneEvidenceInputSchema = profileScope
  .extend({
    goalId: id,
    milestoneId: id,
    achievementEventId: id.optional(),
    action: z
      .enum(["attached", "replaced", "withdrawn", "supplemented"])
      .default("attached"),
    references: z
      .array(
        z.object({
          sourceType: z
            .enum([
              "goal_criterion_evaluation",
              "project",
              "project_milestone",
              "task",
              "resource",
              "review_record",
            ])
            .optional(),
          sourceId: id.optional(),
          supersedesReferenceId: id.optional(),
          reason: optionalText,
        }),
      )
      .min(1)
      .max(20),
    retrospective: z.boolean().optional(),
    ...commandMetadata,
  })
  .superRefine((value, context) => {
    validateEvidenceReferences(
      value.action,
      value.references,
      value.retrospective ?? false,
      context,
    );
  });

export const goalAchievementEvidenceInputSchema = profileScope
  .extend({
    goalId: id,
    achievementEventId: id,
    action: z
      .enum(["attached", "replaced", "withdrawn", "supplemented"])
      .default("attached"),
    references: z
      .array(
        z.object({
          sourceType: z
            .enum([
              "project",
              "project_milestone",
              "task",
              "resource",
              "review_record",
            ])
            .optional(),
          sourceId: id.optional(),
          supersedesReferenceId: id.optional(),
          reason: optionalText,
        }),
      )
      .min(1)
      .max(20),
    retrospective: z.boolean().optional(),
    ...commandMetadata,
  })
  .superRefine((value, context) => {
    validateEvidenceReferences(
      value.action,
      value.references,
      value.retrospective ?? false,
      context,
    );
  });

function validateEvidenceReferences(
  action: "attached" | "replaced" | "withdrawn" | "supplemented",
  references: readonly {
    sourceType?: string;
    sourceId?: string;
    supersedesReferenceId?: string;
    reason?: string;
  }[],
  retrospective: boolean,
  context: z.RefinementCtx,
) {
  references.forEach((reference, index) => {
    const hasSource = Boolean(reference.sourceType && reference.sourceId);
    const hasSuperseded = Boolean(reference.supersedesReferenceId);
    if (action === "withdrawn") {
      if (!hasSuperseded) {
        context.addIssue({
          code: "custom",
          path: ["references", index, "supersedesReferenceId"],
          message: "Zum Zurücknehmen eine bestehende Belegreferenz auswählen.",
        });
      }
    } else if (!hasSource) {
      context.addIssue({
        code: "custom",
        path: ["references", index, "sourceReference"],
        message: "Eine aktive Belegquelle auswählen.",
      });
    }
    if (action === "replaced" && !hasSuperseded) {
      context.addIssue({
        code: "custom",
        path: ["references", index, "supersedesReferenceId"],
        message: "Für einen Ersatz die bisherige Referenz auswählen.",
      });
    }
    if ((action === "attached" || action === "supplemented") && hasSuperseded) {
      context.addIssue({
        code: "custom",
        path: ["references", index, "supersedesReferenceId"],
        message: "Eine neue Ergänzung ersetzt keine bestehende Referenz.",
      });
    }
    if (action !== "attached" && !reference.reason) {
      context.addIssue({
        code: "custom",
        path: ["references", index, "reason"],
        message:
          "Für Ersetzen, Zurücknehmen oder retrospektive Ergänzen einen Grund angeben.",
      });
    }
  });
  if ((action === "supplemented") !== retrospective) {
    context.addIssue({
      code: "custom",
      path: ["retrospective"],
      message:
        "Retrospektive Ergänzungen müssen ausdrücklich als solche markiert werden.",
    });
  }
}

export const goalMilestoneAmendInputSchema = profileScope.extend({
  goalId: id,
  milestoneId: id,
  eventId: id,
  occurredAt: optionalDateTimeStringSchema,
  note: optionalText,
  correctionReason: requiredTrimmedStringSchema(1),
  retrospective: z.boolean().optional(),
  ...commandMetadata,
});

export const goalAchievementAmendInputSchema = profileScope.extend({
  goalId: id,
  eventId: id,
  occurredAt: optionalDateTimeStringSchema,
  achievementNote: optionalText,
  correctionReason: requiredTrimmedStringSchema(1),
  retrospective: z.boolean().optional(),
  ...commandMetadata,
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
  "criterion.correct",
  "criterion.retract",
  "criterion.evidence",
  "milestone.amend",
  "support.project.add",
  "support.project.remove",
  "support.task.add",
  "support.task.remove",
  "achieve",
  "goal.amend",
  "goal.evidence",
  "reopen",
  "milestone.evidence",
]);

export type GoalMilestoneCreateInput = z.infer<
  typeof goalMilestoneCreateInputSchema
>;
export type GoalMilestoneUpdateInput = z.infer<
  typeof goalMilestoneUpdateInputSchema
>;
export type GoalMilestoneStatusInput = z.infer<
  typeof goalMilestoneStatusInputSchema
>;
export type GoalMilestoneArchiveInput = z.infer<
  typeof goalMilestoneArchiveInputSchema
>;
export type GoalMilestoneReorderInput = z.infer<
  typeof goalMilestoneReorderInputSchema
>;
export type GoalOutcomeCriterionCreateInput = z.infer<
  typeof goalOutcomeCriterionCreateInputSchema
>;
export type GoalOutcomeCriterionArchiveInput = z.infer<
  typeof goalOutcomeCriterionArchiveInputSchema
>;
export type GoalCriterionEvaluationInput = z.infer<
  typeof goalCriterionEvaluationInputSchema
>;
export type GoalCriterionEvidenceInput = z.infer<
  typeof goalCriterionEvidenceInputSchema
>;
export type GoalMilestoneEvidenceInput = z.infer<
  typeof goalMilestoneEvidenceInputSchema
>;
export type GoalAchievementEvidenceInput = z.infer<
  typeof goalAchievementEvidenceInputSchema
>;
export type GoalMilestoneAmendInput = z.infer<
  typeof goalMilestoneAmendInputSchema
>;
export type GoalAchievementAmendInput = z.infer<
  typeof goalAchievementAmendInputSchema
>;
export type GoalProjectSupportInput = z.infer<
  typeof goalProjectSupportInputSchema
>;
export type GoalTaskSupportInput = z.infer<typeof goalTaskSupportInputSchema>;
export type GoalSupportRemoveInput = z.infer<
  typeof goalSupportRemoveInputSchema
>;
export type GoalAchieveInput = z.infer<typeof goalAchieveInputSchema>;
export type GoalReopenInput = z.infer<typeof goalReopenInputSchema>;
