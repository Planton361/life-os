import type {
  AreaId,
  GoalId,
  IsoDateTimeString,
  ProfileId,
  UserId,
} from "../domain/ids";
import {
  goalHorizons,
  goalStatuses,
  type GoalHorizon,
  type GoalStatus,
} from "../domain/goal";
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

export type CreateGoalInput = {
  userId: UserId;
  profileId: ProfileId;
  areaId?: AreaId;
  title: string;
  description?: string;
  status?: GoalStatus;
  horizon?: GoalHorizon;
  why?: string;
  measure?: string;
  targetValue?: string;
  targetDate?: IsoDateTimeString;
};

export type UpdateGoalInput = {
  userId: UserId;
  profileId: ProfileId;
  goalId: GoalId;
} & Partial<Omit<CreateGoalInput, "userId" | "profileId">>;

function readGoalPatch(record: Record<string, unknown>, issues: SchemaIssue[]) {
  return {
    areaId: optionalString(record, "areaId", issues) as AreaId | undefined,
    description: optionalString(record, "description", issues),
    horizon: optionalEnum(record, "horizon", goalHorizons, issues),
    measure: optionalString(record, "measure", issues),
    status: optionalEnum(record, "status", goalStatuses, issues),
    targetDate: optionalDateTime(record, "targetDate", issues),
    targetValue: optionalString(record, "targetValue", issues),
    why: optionalString(record, "why", issues),
  };
}

export const createGoalInputSchema = defineInputSchema<CreateGoalInput>(
  "createGoalInputSchema",
  (input) => {
    const issues: SchemaIssue[] = [];
    const record = asInputRecord(input, issues);

    return finishSchema(
      {
        ...readGoalPatch(record, issues),
        profileId: requiredString(record, "profileId", issues) as ProfileId,
        title: requiredString(record, "title", issues, 2),
        userId: requiredString(record, "userId", issues) as UserId,
      },
      issues,
    );
  },
);

export const updateGoalInputSchema = defineInputSchema<UpdateGoalInput>(
  "updateGoalInputSchema",
  (input) => {
    const issues: SchemaIssue[] = [];
    const record = asInputRecord(input, issues);

    return finishSchema(
      {
        ...readGoalPatch(record, issues),
        goalId: requiredString(record, "goalId", issues) as GoalId,
        profileId: requiredString(record, "profileId", issues) as ProfileId,
        title: optionalString(record, "title", issues),
        userId: requiredString(record, "userId", issues) as UserId,
      },
      issues,
    );
  },
);
