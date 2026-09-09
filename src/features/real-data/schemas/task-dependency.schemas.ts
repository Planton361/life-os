import { z } from "zod";
export const taskDependencyInputSchema = z.discriminatedUnion("operation", [
  z
    .object({
      operation: z.literal("add"),
      projectId: z.uuid(),
      taskId: z.uuid(),
      predecessorId: z.uuid(),
    })
    .refine(
      (v) => v.taskId !== v.predecessorId,
      "Self Dependency ist nicht erlaubt.",
    ),
  z.object({
    operation: z.literal("remove"),
    taskId: z.uuid(),
    dependencyId: z.uuid(),
  }),
]);
