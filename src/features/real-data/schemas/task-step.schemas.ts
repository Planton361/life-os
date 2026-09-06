import { z } from "zod";
export const taskStepCreateSchema = z.object({
  taskId: z.uuid(),
  title: z.string().trim().min(1).max(500),
  position: z.coerce.number().int().min(0).default(0),
});
export const taskStepUpdateSchema = taskStepCreateSchema.extend({
  stepId: z.uuid(),
  completed: z.boolean(),
});
export const taskStepArchiveSchema = z.object({
  taskId: z.uuid(),
  stepId: z.uuid(),
});
