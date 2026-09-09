import { z } from "zod";

const nullableId = z.preprocess(
  (v) => (v === "" ? null : v),
  z.uuid().nullable().default(null),
);
export const projectMilestoneInputSchema = z
  .object({
    projectId: z.uuid(),
    operation: z.enum(["save", "assign", "up", "down", "archive"]),
    milestoneId: nullableId,
    taskId: nullableId,
    title: z.string().trim().max(500).default(""),
    description: z.string().trim().max(10000).default(""),
    status: z.enum(["open", "active", "done"]).default("open"),
    targetDate: z.preprocess(
      (v) => (v === "" ? null : v),
      z.iso.date().nullable().default(null),
    ),
  })
  .superRefine((v, ctx) => {
    if (v.operation === "save" && !v.title)
      ctx.addIssue({
        code: "custom",
        path: ["title"],
        message: "Titel erforderlich",
      });
    if (v.operation === "assign" && !v.taskId)
      ctx.addIssue({
        code: "custom",
        path: ["taskId"],
        message: "Task erforderlich",
      });
    if (["up", "down", "archive"].includes(v.operation) && !v.milestoneId)
      ctx.addIssue({
        code: "custom",
        path: ["milestoneId"],
        message: "Milestone erforderlich",
      });
  });
