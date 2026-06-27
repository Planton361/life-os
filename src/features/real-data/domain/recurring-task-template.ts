import type {
  AreaId,
  GoalId,
  LocalDateString,
  ProfileId,
  ProjectId,
  RecurringTaskTemplateId,
  TimezoneId,
  UserScopedEntity,
} from "./ids";
import type { TaskEnergy, TaskPriority } from "./task";

export type RecurrenceRuleV1 =
  | {
      version: "v1";
      frequency: "daily";
      interval?: number;
    }
  | {
      version: "v1";
      frequency: "weekly";
      interval?: number;
      byWeekday: number[];
    };

export type RecurrenceRule = RecurrenceRuleV1 | Record<string, unknown>;

export type RecurringTaskTemplate = UserScopedEntity & {
  id: RecurringTaskTemplateId;
  profileId: ProfileId;
  areaId: AreaId | null;
  projectId: ProjectId | null;
  goalId: GoalId | null;
  title: string;
  description: string | null;
  nextAction: string | null;
  priority: TaskPriority | null;
  energy: TaskEnergy | null;
  durationMinutes: number | null;
  recurrenceRule: RecurrenceRule;
  startsOn: LocalDateString;
  endsOn: LocalDateString | null;
  timezone: TimezoneId;
  isActive: boolean;
};
