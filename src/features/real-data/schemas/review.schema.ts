import { reviewKinds, reviewRecordStatuses } from "../domain";
import {
  localDateSchema,
  optionalEnumSchema,
  optionalTrimmedStringSchema,
  requiredTrimmedStringSchema,
  z,
} from "./schema-contract";

const reviewItemsSchema = z.array(z.string().trim().min(1).max(500)).max(12);

export const saveReviewInputSchema = z
  .object({
    blockers: reviewItemsSchema,
    carryTaskIds: z.array(requiredTrimmedStringSchema()).max(50),
    kind: z.enum(reviewKinds),
    nextPeriodFocus: optionalTrimmedStringSchema,
    openLoops: reviewItemsSchema,
    outcome: optionalTrimmedStringSchema,
    periodEnd: localDateSchema,
    periodStart: localDateSchema,
    planningNote: optionalTrimmedStringSchema,
    status: optionalEnumSchema(reviewRecordStatuses),
    timezone: requiredTrimmedStringSchema(),
    wins: reviewItemsSchema,
  })
  .superRefine((value, context) => {
    if (value.periodEnd < value.periodStart) {
      context.addIssue({
        code: "custom",
        message: "Review period end must not precede its start.",
        path: ["periodEnd"],
      });
    }

    if (value.kind === "daily" && value.periodEnd !== value.periodStart) {
      context.addIssue({
        code: "custom",
        message: "Daily reviews must cover exactly one local day.",
        path: ["periodEnd"],
      });
    }

    if (value.kind === "weekly" && value.carryTaskIds.length > 0) {
      context.addIssue({
        code: "custom",
        message: "Weekly reviews cannot carry tasks directly.",
        path: ["carryTaskIds"],
      });
    }
  });

export type SaveReviewInput = z.infer<typeof saveReviewInputSchema>;

export type SaveReviewRepositoryInput = SaveReviewInput & {
  profileId: string;
  userId: string;
};
