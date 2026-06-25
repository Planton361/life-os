import type { DailyLog } from "../domain";
import {
  closeDailyLogInputSchema,
  upsertDailyLogInputSchema,
  type CloseDailyLogInput,
  type UpsertDailyLogInput,
} from "../schemas";
import { defineUseCaseContract, type UseCaseHandler } from "./use-case-contract";

export type DailyLogOutput = {
  dailyLog: DailyLog;
};

export type UpsertDailyLogUseCase = UseCaseHandler<
  UpsertDailyLogInput,
  DailyLogOutput
>;

export type CloseDailyLogUseCase = UseCaseHandler<
  CloseDailyLogInput,
  DailyLogOutput
>;

export const upsertDailyLogContract = defineUseCaseContract<
  UpsertDailyLogInput,
  DailyLogOutput
>({
  affectedReadModels: ["today", "dashboard"],
  inputSchema: upsertDailyLogInputSchema,
  name: "upsertDailyLog",
  notes: [
    "One Daily Log exists per user/profile/localDate.",
    "Daily Log stores day context, not copied task state.",
  ],
  repositories: ["dailyLogs"],
  transaction: "single_write",
});

export const closeDailyLogContract = defineUseCaseContract<
  CloseDailyLogInput,
  DailyLogOutput
>({
  affectedReadModels: ["today", "dashboard"],
  inputSchema: closeDailyLogInputSchema,
  name: "closeDailyLog",
  notes: ["Closes the Daily Log without mutating canonical Task fields."],
  repositories: ["dailyLogs"],
  transaction: "single_write",
});
