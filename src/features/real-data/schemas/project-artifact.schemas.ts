import { z } from "zod";
export const projectResourceRoles = [
  "reference",
  "additional_artifact",
  "primary_artifact",
] as const;
export const projectArtifactInputSchema = z.object({
  projectId: z.uuid(),
  resourceId: z.uuid(),
  role: z.enum([...projectResourceRoles, "remove"]),
});
export type ProjectArtifactInput = z.infer<typeof projectArtifactInputSchema>;
