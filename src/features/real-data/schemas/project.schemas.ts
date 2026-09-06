import { projectStatuses } from "../domain/project";
import { taskPriorities } from "../domain/task";
import {
  dateTimeStringSchema,
  optionalEnumSchema,
  optionalTrimmedStringSchema,
  requiredTrimmedStringSchema,
  z,
} from "./schema-contract";

const requiredIdSchema = requiredTrimmedStringSchema();
const titleSchema = requiredTrimmedStringSchema(2);
const nullableOptionalString = z
  .union([z.string().trim().min(1), z.null()])
  .optional();
const nullableOptionalDateTime = z
  .union([dateTimeStringSchema, z.null()])
  .optional();

const projectPatchSchema = z.object({
  areaId: optionalTrimmedStringSchema,
  deadline: nullableOptionalDateTime,
  description: optionalTrimmedStringSchema,
  goalId: nullableOptionalString,
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
  areaId: z.string().trim().min(1).nullable().optional(),
  description: z.string().trim().min(1).nullable().optional(),
  nextStep: z.string().trim().min(1).nullable().optional(),

  profileId: requiredIdSchema,
  projectId: requiredIdSchema,
  title: optionalTrimmedStringSchema,
  userId: requiredIdSchema,
});

export type UpdateProjectInput = z.infer<typeof updateProjectInputSchema>;
