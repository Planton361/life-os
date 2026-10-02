import { z } from "zod";
const title = z.string().trim().min(1).max(200),
  text = z.string().trim().max(8000),
  uuid = z.uuid();
const target = z.object({ target_id: uuid });
const milestone = target.extend({ milestone_id: uuid });
const evidence = z
  .object({
    title,
    note: text.nullable().optional(),
    evidence_date: z.iso.date(),
    source_type: z.enum(["task", "project", "goal", "resource", "manual_note"]),
    source_id: uuid.nullable(),
    weight: z.number().int().min(1).max(5).nullable().optional(),
  })
  .refine(
    (v) =>
      v.source_type === "manual_note"
        ? v.source_id === null
        : v.source_id !== null,
    "Ungültige Evidence-Quelle",
  );
const schemas = {
  "skill.create": z.object({
    name: title,
    summary: text.nullable().optional(),
    category: text.nullable().optional(),
    level: text.nullable().optional(),
    area_id: uuid.nullable().optional(),
    status: z.enum(["active", "paused", "archived"]).optional(),
  }),
  "skill.edit": z.object({
    name: title,
    summary: text.nullable().optional(),
    category: text.nullable().optional(),
    level: text.nullable().optional(),
    area_id: uuid.nullable().optional(),
    status: z.enum(["active", "paused"]).optional(),
  }),
  "skill.archive": z.object({}),
  "skill.restore": z.object({}),
  "target.create": z.object({ title, description: text.nullable().optional() }),
  "target.edit": target.extend({
    title,
    description: text.nullable().optional(),
  }),
  "target.current": target,
  "target.archive": target,
  "target.restore": target,
  "target.reopen": target,
  "milestone.create": target.extend({
    title,
    description: text.nullable().optional(),
  }),
  "milestone.edit": milestone.extend({
    title,
    description: text.nullable().optional(),
  }),
  "milestone.current": milestone,
  "milestone.archive": milestone,
  "milestone.restore": milestone,
  "milestone.reopen": milestone,
  "milestone.reorder": target.extend({ ids: z.array(uuid).min(1) }),
  "review.submit": target
    .extend({
      milestone_id: uuid.nullable().optional(),
      decision: z.enum(["continue", "completed", "retired"]),
      note: text.pipe(z.string().min(1)),
      open_milestones_acknowledged: z.boolean(),
      evidence: z.array(
        z.object({ id: uuid, revision: z.number().int().positive() }),
      ),
    })
    .refine(
      (v) => !v.milestone_id || v.decision !== "retired",
      "Lernschritte werden abgeschlossen oder weiterentwickelt, nicht retired.",
    ),
  "review.amend": z.object({
    review_id: uuid,
    kind: z.enum(["clarification", "withdrawal", "mistaken"]),
    note: text.pipe(z.string().min(1)),
  }),
  "evidence.create": evidence,
  "evidence.correct": evidence.and(
    z.object({ evidence_id: uuid, reason: text.pipe(z.string().min(1)) }),
  ),
  "evidence.withdraw": z.object({
    evidence_id: uuid,
    reason: text.pipe(z.string().min(1)),
  }),
  "evidence.restore": z.object({
    evidence_id: uuid,
    reason: text.pipe(z.string().min(1)),
  }),
} as const;
export type SkillCommandOperation = keyof typeof schemas;
export function parseSkillCommand(input: unknown) {
  const header = z
    .object({
      operation: z.enum(
        Object.keys(schemas) as [
          SkillCommandOperation,
          ...SkillCommandOperation[],
        ],
      ),
      commandId: uuid,
      skillId: uuid.nullable(),
      expectedRevision: z.number().int().nonnegative().nullable(),
      payload: z.unknown(),
    })
    .safeParse(input);
  if (!header.success) return header;
  const parsed = schemas[header.data.operation].safeParse(header.data.payload);
  if (!parsed.success) return parsed;
  if (
    header.data.operation === "skill.create"
      ? header.data.skillId !== null || header.data.expectedRevision !== null
      : header.data.skillId === null || header.data.expectedRevision === null
  )
    return { success: false as const };
  return {
    success: true as const,
    data: { ...header.data, payload: parsed.data },
  };
}
