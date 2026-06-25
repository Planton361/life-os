import { projectStatuses } from "../domain/project";
import { taskPriorities } from "../domain/task";
import {
  optionalDateTimeStringSchema,
  optionalEnumSchema,
  optionalTrimmedStringSchema,
  requiredTrimmedStringSchema,
  z,
} from "./schema-contract";

const requiredIdSchema = requiredTrimmedStringSchema();
const titleSchema = requiredTrimmedStringSchema(2);

const projectPatchSchema = z.object({
  areaId: optionalTrimmedStringSchema,
  deadline: optionalDateTimeStringSchema,
  description: optionalTrimmedStringSchema,
  goalId: optionalTrimmedStringSchema,
  nextStep: optionalTrimmedStringSchema,
  priority: optionalEnumSchema(taskPriorities),
  status: optionalEnumSchema(projectStatuses),
});

export const createProjectInputSchema = projectPatchSchema.extend({
  profileId: requiredIdSchema,
  title: titleSchema,
  userId: requiredIdSchema,
});

export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;

export const updateProjectInputSchema = projectPatchSchema.extend({
  profileId: requiredIdSchema,
  projectId: requiredIdSchema,
  title: optionalTrimmedStringSchema,
  userId: requiredIdSchema,
});

export type UpdateProjectInput = z.infer<typeof updateProjectInputSchema>;
