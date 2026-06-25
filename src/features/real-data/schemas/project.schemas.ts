import type {
  AreaId,
  GoalId,
  IsoDateTimeString,
  ProfileId,
  ProjectId,
  UserId,
} from "../domain/ids";
import { projectStatuses, type ProjectStatus } from "../domain/project";
import {
  taskPriorities,
  type TaskPriority,
} from "../domain/task";
import {
  optionalDateTime,
  optionalEnum,
  optionalString,
  requiredString,
  asInputRecord,
  defineInputSchema,
  finishSchema,
  type SchemaIssue,
} from "./schema-contract";

export type CreateProjectInput = {
  userId: UserId;
  profileId: ProfileId;
  areaId?: AreaId;
  goalId?: GoalId;
  title: string;
  description?: string;
  status?: ProjectStatus;
  priority?: TaskPriority;
  nextStep?: string;
  deadline?: IsoDateTimeString;
};

export type UpdateProjectInput = {
  userId: UserId;
  profileId: ProfileId;
  projectId: ProjectId;
} & Partial<Omit<CreateProjectInput, "userId" | "profileId">>;

function readProjectPatch(
  record: Record<string, unknown>,
  issues: SchemaIssue[],
) {
  return {
    areaId: optionalString(record, "areaId", issues) as AreaId | undefined,
    deadline: optionalDateTime(record, "deadline", issues),
    description: optionalString(record, "description", issues),
    goalId: optionalString(record, "goalId", issues) as GoalId | undefined,
    nextStep: optionalString(record, "nextStep", issues),
    priority: optionalEnum(record, "priority", taskPriorities, issues),
    status: optionalEnum(record, "status", projectStatuses, issues),
  };
}

export const createProjectInputSchema = defineInputSchema<CreateProjectInput>(
  "createProjectInputSchema",
  (input) => {
    const issues: SchemaIssue[] = [];
    const record = asInputRecord(input, issues);

    return finishSchema(
      {
        ...readProjectPatch(record, issues),
        profileId: requiredString(record, "profileId", issues) as ProfileId,
        title: requiredString(record, "title", issues, 2),
        userId: requiredString(record, "userId", issues) as UserId,
      },
      issues,
    );
  },
);

export const updateProjectInputSchema = defineInputSchema<UpdateProjectInput>(
  "updateProjectInputSchema",
  (input) => {
    const issues: SchemaIssue[] = [];
    const record = asInputRecord(input, issues);

    return finishSchema(
      {
        ...readProjectPatch(record, issues),
        profileId: requiredString(record, "profileId", issues) as ProfileId,
        projectId: requiredString(record, "projectId", issues) as ProjectId,
        title: optionalString(record, "title", issues),
        userId: requiredString(record, "userId", issues) as UserId,
      },
      issues,
    );
  },
);
