import {
  dailyLogStatuses,
  type DailyLogStatus,
} from "../domain/daily-log";
import type {
  DailyLogId,
  IsoDateTimeString,
  LocalDateString,
  ProfileId,
  TimezoneId,
  UserId,
} from "../domain/ids";
import { taskEnergies, type TaskEnergy } from "../domain/task";
import {
  optionalDateTime,
  optionalEnum,
  optionalString,
  requiredLocalDate,
  requiredString,
  asInputRecord,
  defineInputSchema,
  finishSchema,
  type SchemaIssue,
} from "./schema-contract";

export type UpsertDailyLogInput = {
  userId: UserId;
  profileId: ProfileId;
  localDate: LocalDateString;
  timezone: TimezoneId;
  openingNote?: string;
  closingNote?: string;
  carryForwardNote?: string;
  energy?: TaskEnergy;
  mood?: string;
  status?: DailyLogStatus;
};

export type CloseDailyLogInput = {
  userId: UserId;
  profileId: ProfileId;
  dailyLogId: DailyLogId;
  closingNote?: string;
  carryForwardNote?: string;
  closedAt?: IsoDateTimeString;
};

export const upsertDailyLogInputSchema =
  defineInputSchema<UpsertDailyLogInput>(
    "upsertDailyLogInputSchema",
    (input) => {
      const issues: SchemaIssue[] = [];
      const record = asInputRecord(input, issues);

      return finishSchema(
        {
          carryForwardNote: optionalString(
            record,
            "carryForwardNote",
            issues,
          ),
          closingNote: optionalString(record, "closingNote", issues),
          energy: optionalEnum(record, "energy", taskEnergies, issues),
          localDate: requiredLocalDate(record, "localDate", issues),
          mood: optionalString(record, "mood", issues),
          openingNote: optionalString(record, "openingNote", issues),
          profileId: requiredString(record, "profileId", issues) as ProfileId,
          status: optionalEnum(record, "status", dailyLogStatuses, issues),
          timezone: requiredString(record, "timezone", issues) as TimezoneId,
          userId: requiredString(record, "userId", issues) as UserId,
        },
        issues,
      );
    },
  );

export const closeDailyLogInputSchema =
  defineInputSchema<CloseDailyLogInput>(
    "closeDailyLogInputSchema",
    (input) => {
      const issues: SchemaIssue[] = [];
      const record = asInputRecord(input, issues);

      return finishSchema(
        {
          carryForwardNote: optionalString(
            record,
            "carryForwardNote",
            issues,
          ),
          closedAt: optionalDateTime(record, "closedAt", issues),
          closingNote: optionalString(record, "closingNote", issues),
          dailyLogId: requiredString(
            record,
            "dailyLogId",
            issues,
          ) as DailyLogId,
          profileId: requiredString(record, "profileId", issues) as ProfileId,
          userId: requiredString(record, "userId", issues) as UserId,
        },
        issues,
      );
    },
  );
