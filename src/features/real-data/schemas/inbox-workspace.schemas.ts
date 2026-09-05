import { z } from "zod";

export const inboxRoutes = [
  "task",
  "existing_project",
  "existing_goal",
  "existing_skill",
  "project",
  "goal",
  "resource",
  "note",
  "archive",
] as const;
const nullableText = z.string().trim().max(20000).nullable();
export const inboxClarificationSchema = z.object({
  inboxItemId: z.uuid(),
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
  title: z.string().trim().min(2).max(500),
  body: nullableText,
  nextAction: nullableText,
  missingInfo: nullableText,
  priority: z.enum(["P0", "P1", "P2", "P3", "none"]),
  energy: z.enum(["low", "medium", "high"]).nullable(),
  durationMinutes: z.number().int().positive().max(10080).nullable(),
  areaId: z.uuid().nullable(),
  reviewNeeded: z.boolean(),
  todayCandidate: z.boolean(),
  deadlineHint: z.iso.date().nullable(),
});
export const inboxRouteSchema = z
  .object({
    inboxItemId: z.uuid(),
    expectedUpdatedAt: z.iso.datetime({ offset: true }),
    route: z.enum(inboxRoutes),
    targetId: z.uuid().nullable(),
  })
  .refine(
    (value) => !value.route.startsWith("existing_") || value.targetId !== null,
    { message: "Ziel auswählen." },
  );
export type InboxClarificationInput = z.infer<typeof inboxClarificationSchema>;
export type InboxRouteInput = z.infer<typeof inboxRouteSchema>;
