import type {
  Area,
  DailyLog,
  DailyLogTask,
  Goal,
  InboxItem,
  LocalDateString,
  Profile,
  ProfileId,
  Project,
  RecurringTaskTemplate,
  Resource,
  ResourceRelation,
  ResourceId,
  SupportedResourceRelationTargetType,
  Task,
  UserId,
} from "../domain";
import type {
  ArchiveInboxItemInput,
  ArchiveTaskInput,
  CaptureInboxItemInput,
  CarryTaskForwardInput,
  CloseDailyLogInput,
  CompleteTaskInput,
  CreateRecurringTaskTemplateInput,
  CreateGoalInput,
  CreateProjectInput,
  CreateResourceInput,
  CreateTaskInput,
  DeactivateRecurringTaskTemplateInput,
  LinkResourceInput,
  ReopenTaskInput,
  UpdateRecurringTaskTemplateInput,
  RescheduleTaskInput,
  ScheduleTaskInput,
  TriageInboxItemToTaskInput,
  UnscheduleTaskInput,
  UpdateGoalInput,
  UpdateProjectInput,
  UpdateTaskInput,
  UpsertDailyLogInput,
} from "../schemas";
import type { RepositoryListResult, RepositoryResult } from "./repository-result";

export type MarkInboxItemTriagedInput = {
  userId: UserId;
  profileId: ProfileId;
  inboxItemId: string;
  taskId: string;
};

export type CreateResourceFromInboxInput = CreateResourceInput & {
  inboxItemId: string;
};

export type LinkTaskToDailyLogInput = {
  userId: UserId;
  profileId: ProfileId;
  dailyLogId: string;
  taskId: string;
  role: DailyLogTask["role"];
  sortOrder?: number;
  plannedState?: string;
  note?: string;
};

export type CalendarTaskRangeInput = {
  userId: UserId;
  profileId: ProfileId;
  fromDate: LocalDateString;
  toDate: LocalDateString;
};

export type TaskListInput = {
  userId: UserId;
  profileId: ProfileId;
  sortBy?: "created" | "planned" | "scheduled";
  ascending?: boolean;
};

export interface ProfileRepository {
  getProfileById(
    userId: UserId,
    profileId: ProfileId,
  ): Promise<RepositoryResult<Profile>>;
  getProfilesByUser(userId: UserId): Promise<RepositoryListResult<Profile>>;
  getAreasByProfile(
    userId: UserId,
    profileId: ProfileId,
  ): Promise<RepositoryListResult<Area>>;
}

export interface InboxRepository {
  archiveInboxItem(
    input: ArchiveInboxItemInput,
  ): Promise<RepositoryResult<InboxItem>>;
  createInboxItem(
    input: CaptureInboxItemInput,
  ): Promise<RepositoryResult<InboxItem>>;
  getInboxItemsByUser(
    userId: UserId,
    profileId: ProfileId,
  ): Promise<RepositoryListResult<InboxItem>>;
  markInboxItemTriaged(
    input: MarkInboxItemTriagedInput,
  ): Promise<RepositoryResult<InboxItem>>;
}

export interface TaskRepository {
  archiveTask(input: ArchiveTaskInput): Promise<RepositoryResult<Task>>;
  createTask(input: CreateTaskInput): Promise<RepositoryResult<Task>>;
  updateTask(input: UpdateTaskInput): Promise<RepositoryResult<Task>>;
  scheduleTask(input: ScheduleTaskInput): Promise<RepositoryResult<Task>>;
  completeTask(input: CompleteTaskInput): Promise<RepositoryResult<Task>>;
  reopenTask(input: ReopenTaskInput): Promise<RepositoryResult<Task>>;
  rescheduleTask(input: RescheduleTaskInput): Promise<RepositoryResult<Task>>;
  unscheduleTask(input: UnscheduleTaskInput): Promise<RepositoryResult<Task>>;
  carryTaskForward(input: CarryTaskForwardInput): Promise<RepositoryResult<Task>>;
  getTasksByUser(input: TaskListInput): Promise<RepositoryListResult<Task>>;
  getTasksForToday(
    userId: UserId,
    profileId: ProfileId,
    localDate: LocalDateString,
  ): Promise<RepositoryListResult<Task>>;
  getCalendarTasks(
    input: CalendarTaskRangeInput,
  ): Promise<RepositoryListResult<Task>>;
  getPortfolioTasks(
    userId: UserId,
    profileId: ProfileId,
  ): Promise<RepositoryListResult<Task>>;
}

export interface ProjectRepository {
  createProject(input: CreateProjectInput): Promise<RepositoryResult<Project>>;
  updateProject(input: UpdateProjectInput): Promise<RepositoryResult<Project>>;
  getProjectsByUser(
    userId: UserId,
    profileId: ProfileId,
  ): Promise<RepositoryListResult<Project>>;
}

export interface GoalRepository {
  createGoal(input: CreateGoalInput): Promise<RepositoryResult<Goal>>;
  updateGoal(input: UpdateGoalInput): Promise<RepositoryResult<Goal>>;
  getGoalsByUser(
    userId: UserId,
    profileId: ProfileId,
  ): Promise<RepositoryListResult<Goal>>;
}

export interface DailyLogRepository {
  upsertDailyLog(
    input: UpsertDailyLogInput,
  ): Promise<RepositoryResult<DailyLog>>;
  closeDailyLog(input: CloseDailyLogInput): Promise<RepositoryResult<DailyLog>>;
  linkTaskToDailyLog(
    input: LinkTaskToDailyLogInput,
  ): Promise<RepositoryResult<DailyLogTask>>;
  getDailyLogByLocalDate(
    userId: UserId,
    profileId: ProfileId,
    localDate: LocalDateString,
  ): Promise<RepositoryResult<DailyLog>>;
}

export interface ResourceRepository {
  createResource(input: CreateResourceInput): Promise<RepositoryResult<Resource>>;
  getResourceRelationsByUser(
    userId: UserId,
    profileId: ProfileId,
  ): Promise<RepositoryListResult<ResourceRelation>>;
  getResourceRelationsForResource(
    userId: UserId,
    profileId: ProfileId,
    resourceId: ResourceId,
  ): Promise<RepositoryListResult<ResourceRelation>>;
  getResourceRelationsForTarget(
    userId: UserId,
    profileId: ProfileId,
    targetType: SupportedResourceRelationTargetType,
    targetId: string,
  ): Promise<RepositoryListResult<ResourceRelation>>;
  linkResource(
    input: LinkResourceInput,
  ): Promise<RepositoryResult<ResourceRelation>>;
  getResourcesByUser(
    userId: UserId,
    profileId: ProfileId,
  ): Promise<RepositoryListResult<Resource>>;
}

export interface RecurringTaskTemplateRepository {
  createRecurringTaskTemplate(
    input: CreateRecurringTaskTemplateInput,
  ): Promise<RepositoryResult<RecurringTaskTemplate>>;
  deactivateRecurringTaskTemplate(
    input: DeactivateRecurringTaskTemplateInput,
  ): Promise<RepositoryResult<RecurringTaskTemplate>>;
  getActiveRecurringTaskTemplatesByUser(
    userId: UserId,
    profileId: ProfileId,
  ): Promise<RepositoryListResult<RecurringTaskTemplate>>;
  getRecurringTaskTemplatesByUser(
    userId: UserId,
    profileId: ProfileId,
  ): Promise<RepositoryListResult<RecurringTaskTemplate>>;
  updateRecurringTaskTemplate(
    input: UpdateRecurringTaskTemplateInput,
  ): Promise<RepositoryResult<RecurringTaskTemplate>>;
}

export interface RealDataRepository {
  profiles: ProfileRepository;
  inbox: InboxRepository;
  tasks: TaskRepository;
  projects: ProjectRepository;
  goals: GoalRepository;
  dailyLogs: DailyLogRepository;
  resources: ResourceRepository;
  recurringTaskTemplates: RecurringTaskTemplateRepository;
}

export type TriageInboxItemToTaskTransaction = (
  input: TriageInboxItemToTaskInput,
) => Promise<
  RepositoryResult<{
    inboxItem: InboxItem;
    task: Task;
  }>
>;

export type CreateResourceFromInboxTransaction = (
  input: CreateResourceFromInboxInput,
) => Promise<RepositoryResult<Resource>>;
