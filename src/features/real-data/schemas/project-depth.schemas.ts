import { z } from "zod";

const uuid = z.uuid();
const boundedText = (limit: number) => z.string().trim().refine((value) => [...value].length <= limit, `Maximal ${limit} Zeichen.`);
const text = (limit: number) => boundedText(limit).refine((value) => [...value].length >= 1, "Text erforderlich.");
const order = z.number().int().nonnegative().safe();
const token = z.union([z.string().max(19).regex(/^(0|[1-9][0-9]*)$/), order]).transform(String).refine((value) => BigInt(value) <= BigInt("9223372036854775807"));
const common = z.object({
  projectId: uuid,
  commandId: uuid,
  expectedRevision: token,
  expectedCycle: token,
});
const criterionId = z.object({ criterion_id: uuid });
const reviewPayload = z.object({
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  decision: z.enum(["completed", "continue"]),
  result_accepted: z.boolean(),
  rationale: text(2000),
  criteria: z.array(z.object({
    id: uuid,
    assessment: z.enum(["satisfied", "not_satisfied", "not_assessed"]),
    note: boundedText(2000).nullable().optional(),
  })).max(1000),
  archived_ids: z.array(uuid).max(1000),
  archived_notes: z.array(z.object({ id: uuid, note: boundedText(2000).nullable().optional() })).max(1000).optional(),
  archived_criteria_acknowledged: z.boolean(),
  evidence: z.array(z.object({ relation_id: uuid, criterion_id: uuid.nullable(), token: z.string().regex(/^[a-f0-9]{64}$/), note: boundedText(2000).nullable().optional() })).max(200),
  open_work_acknowledged: z.boolean(),
  open_work_disposition: boundedText(2000).nullable().optional(),
}).superRefine((p, ctx) => {
  if (p.decision === "completed" && (!p.result_accepted || p.criteria.length === 0 || p.criteria.some((c) => c.assessment !== "satisfied"))) ctx.addIssue({ code: "custom", message: "Ergebnis und alle aktiven Kriterien bestätigen." });
  if (p.decision === "continue" && (p.result_accepted || p.open_work_acknowledged || p.open_work_disposition?.trim())) ctx.addIssue({ code: "custom", message: "Weiterführen enthält keine Abschlussbestätigung." });
  if (p.archived_criteria_acknowledged !== (p.archived_ids.length > 0)) ctx.addIssue({ code: "custom", message: "Archivierten Scope bestätigen." });
  for (const c of p.criteria) if (c.assessment === "not_satisfied" && !c.note?.trim()) ctx.addIssue({ code: "custom", message: "Nicht erfüllt benötigt eine Begründung." });
});

export const projectDepthCommandSchema = z.discriminatedUnion("operation", [
  common.extend({ operation: z.literal("result.set"), payload: z.object({ desired_result: boundedText(4000).nullable() }) }),
  common.extend({ operation: z.literal("criterion.create"), payload: z.object({ text: text(1000), sort_order: token }) }),
  common.extend({ operation: z.literal("criterion.edit"), payload: criterionId.extend({ text: text(1000) }) }),
  common.extend({ operation: z.literal("criterion.reorder"), payload: criterionId.extend({ sort_order: token }) }),
  common.extend({ operation: z.literal("criterion.archive"), payload: criterionId.extend({ reason: text(2000) }) }),
  common.extend({ operation: z.literal("review.submit"), payload: reviewPayload }),
  common.extend({ operation: z.literal("review.amend"), payload: z.object({ review_id: uuid, kind: z.enum(["clarification", "evidence_withdrawn", "marked_mistaken"]), review_resource_id: uuid.nullable(), reason: text(2000) }).refine((p) => (p.kind === "evidence_withdrawn") === (p.review_resource_id !== null)) }),
  common.extend({ operation: z.literal("project.reopen"), payload: z.object({ reason: boundedText(2000).nullable().optional(), mistaken_completion: z.boolean().optional() }).refine((p) => !p.mistaken_completion || !!p.reason?.trim()) }),
  common.extend({ operation: z.literal("project.archive"), payload: z.object({ reason: boundedText(2000).nullable().optional() }) }),
  common.extend({ operation: z.literal("project.status.set"), payload: z.object({ status: z.enum(["idea", "active", "paused", "blocked"]) }) }),
]);

export type ProjectDepthCommand = z.infer<typeof projectDepthCommandSchema>;
