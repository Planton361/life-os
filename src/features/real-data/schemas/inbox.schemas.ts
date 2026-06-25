import {
  optionalEnum,
  optionalPositiveInteger,
  optionalString,
  requiredString,
  asInputRecord,
  defineInputSchema,
  finishSchema,
  type SchemaIssue,
} from "./schema-contract";
import { inboxItemTypes, type InboxItemType } from "../domain/inbox";
import type {
  AreaId,
  GoalId,
  InboxItemId,
  IsoDateTimeString,
  LocalDateString,
  ProfileId,
  ProjectId,
  UserId,
} from "../domain/ids";
import { taskEnergies, taskPriorities } from "../domain/task";
import type { TaskEnergy, TaskPriority } from "../domain/task";
import { optionalDateTime, optionalLocalDate } from "./schema-contract";

export type CaptureInboxItemInput = {
  userId: UserId;
  profileId: ProfileId;
  areaId?: AreaId;
  title: string;
  body?: string;
  type?: InboxItemType;
  source?: string;
};

export type TriageInboxItemToTaskInput = {
  userId: UserId;
  profileId: ProfileId;
  inboxItemId: InboxItemId;
  title: string;
  description?: string;
  areaId?: AreaId;
  projectId?: ProjectId;
  goalId?: GoalId;
  priority?: TaskPriority;
  energy?: TaskEnergy;
  plannedDate?: LocalDateString;
  scheduledStartAt?: IsoDateTimeString;
  durationMinutes?: number;
  dueAt?: IsoDateTimeString;
};

function readTriageTaskFields(
  record: Record<string, unknown>,
  issues: SchemaIssue[],
) {
  return {
    areaId: optionalString(record, "areaId", issues) as AreaId | undefined,
    description: optionalString(record, "description", issues),
    dueAt: optionalDateTime(record, "dueAt", issues),
    durationMinutes: optionalPositiveInteger(record, "durationMinutes", issues),
    energy: optionalEnum(record, "energy", taskEnergies, issues),
    goalId: optionalString(record, "goalId", issues) as GoalId | undefined,
    plannedDate: optionalLocalDate(record, "plannedDate", issues),
    priority: optionalEnum(record, "priority", taskPriorities, issues),
    projectId: optionalString(record, "projectId", issues) as
      | ProjectId
      | undefined,
    scheduledStartAt: optionalDateTime(record, "scheduledStartAt", issues),
  };
}

export const captureInboxItemInputSchema =
  defineInputSchema<CaptureInboxItemInput>(
    "captureInboxItemInputSchema",
    (input) => {
      const issues: SchemaIssue[] = [];
      const record = asInputRecord(input, issues);

      return finishSchema(
        {
          areaId: optionalString(record, "areaId", issues) as
            | AreaId
            | undefined,
          body: optionalString(record, "body", issues),
          profileId: requiredString(record, "profileId", issues) as ProfileId,
          source: optionalString(record, "source", issues),
          title: requiredString(record, "title", issues, 2),
          type: optionalEnum(record, "type", inboxItemTypes, issues),
          userId: requiredString(record, "userId", issues) as UserId,
        },
        issues,
      );
    },
  );

export const triageInboxItemToTaskInputSchema =
  defineInputSchema<TriageInboxItemToTaskInput>(
    "triageInboxItemToTaskInputSchema",
    (input) => {
      const issues: SchemaIssue[] = [];
      const record = asInputRecord(input, issues);

      return finishSchema(
        {
          ...readTriageTaskFields(record, issues),
          inboxItemId: requiredString(
            record,
            "inboxItemId",
            issues,
          ) as InboxItemId,
          profileId: requiredString(record, "profileId", issues) as ProfileId,
          title: requiredString(record, "title", issues, 2),
          userId: requiredString(record, "userId", issues) as UserId,
        },
        issues,
      );
    },
  );
