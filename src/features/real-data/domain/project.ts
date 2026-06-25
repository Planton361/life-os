import type {
  AreaId,
  GoalId,
  IsoDateTimeString,
  ProfileId,
  ProjectId,
  UserScopedEntity,
} from "./ids";
import type { TaskPriority } from "./task";

export const projectStatuses = [
  "idea",
  "active",
  "paused",
  "blocked",
  "completed",
  "archived",
] as const;

export type ProjectStatus = (typeof projectStatuses)[number];

export type Project = UserScopedEntity & {
  id: ProjectId;
  profileId: ProfileId;
  areaId: AreaId | null;
  goalId: GoalId | null;
  title: string;
  description: string | null;
  status: ProjectStatus;
  priority: TaskPriority;
  nextStep: string | null;
  deadline: IsoDateTimeString | null;
};
