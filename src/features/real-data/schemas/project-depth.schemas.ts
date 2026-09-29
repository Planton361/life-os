import { z } from "zod";

const uuid = z.uuid();
const text = (limit: number) => z.string().trim().min(1).max(limit);
const token = z.number().int().nonnegative().safe();
const common = z.object({
  projectId: uuid,
  commandId: uuid,
  expectedRevision: token,
  expectedCycle: token,
});
const criterionId = z.object({ criterion_id: uuid });
const reviewPayload = z.object({
  fingerprint: z.string().regex(/^[a-f0-9]{32}$/),
  decision: z.enum(["completed", "continue"]),
  result_accepted: z.boolean(),
  rationale: text(4000),
  criteria: z.array(z.object({
    id: uuid,
    assessment: z.enum(["satisfied", "not_satisfied", "not_assessed"]),
    note: z.string().trim().max(2000).optional(),
  })).max(1000),
  archived_ids: z.array(uuid).max(1000),
  resource_ids: z.array(uuid).max(200),
  open_work_acknowledged: z.boolean(),
  open_work_disposition: z.string().trim().max(2000).optional(),
});

export const projectDepthCommandSchema = z.discriminatedUnion("operation", [
  common.extend({ operation: z.literal("result.set"), payload: z.object({ desired_result: z.string().trim().max(4000).nullable() }) }),
  common.extend({ operation: z.literal("criterion.create"), payload: z.object({ text: text(1000), sort_order: token }) }),
  common.extend({ operation: z.literal("criterion.edit"), payload: criterionId.extend({ text: text(1000) }) }),
  common.extend({ operation: z.literal("criterion.reorder"), payload: criterionId.extend({ sort_order: token }) }),
  common.extend({ operation: z.literal("criterion.archive"), payload: criterionId.extend({ reason: text(2000) }) }),
  common.extend({ operation: z.literal("review.submit"), payload: reviewPayload }),
  common.extend({ operation: z.literal("review.amend"), payload: z.object({ review_id: uuid, note: text(2000) }) }),
  common.extend({ operation: z.literal("project.reopen"), payload: z.object({}) }),
  common.extend({ operation: z.literal("project.archive"), payload: z.object({}) }),
  common.extend({ operation: z.literal("project.status"), payload: z.object({ status: z.enum(["idea", "active", "paused", "blocked"]) }) }),
]);

export type ProjectDepthCommand = z.infer<typeof projectDepthCommandSchema>;
