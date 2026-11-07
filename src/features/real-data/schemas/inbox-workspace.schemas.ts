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
  // Empty Clean Title stays NULL; a title is required only for a target route.
  title: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? null : value,
    z.string().trim().min(2).max(500).nullable(),
  ),
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

export const inboxCompletionSchema = inboxClarificationSchema
  .and(inboxRouteSchema)
  .refine((value) => value.route === "archive" || value.title !== null, {
    message: "Titel für das Ziel erforderlich.",
    path: ["title"],
  });
export type InboxCompletionInput = z.infer<typeof inboxCompletionSchema>;
