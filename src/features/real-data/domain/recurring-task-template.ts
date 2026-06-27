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

export type RecurrenceRule = Record<string, unknown>;

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
