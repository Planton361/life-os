import type {
  Area,
  DailyLog,
  DailyLogTask,
  Goal,
  InboxItem,
  LocalDateString,
  Meal,
  Profile,
  ProfileId,
  Project,
  RecurringTaskTemplate,
  Recipe,
  Resource,
  ResourceRelation,
  ResourceId,
  Skill,
  SkillEvidence,
  SupportedResourceRelationTargetType,
  Task,
  TaskEnergy,
  UserId,
  TaskPriority,
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
  MealCompleteInput,
  MealCreateInput,
  MealUpdateInput,
  CreateProjectInput,
  CreateResourceInput,
  RecipeArchiveInput,
  RecipeCreateInput,
  RecipeUpdateInput,
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
  SkillArchiveInput,
  SkillCreateInput,
  SkillEvidenceCreateInput,
  SkillEvidenceDeleteInput,
  SkillEvidenceUpdateInput,
  SkillUpdateInput,
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

export type CreateGeneratedTaskInstanceInput = {
  userId: UserId;
  profileId: ProfileId;
  templateId: string;
  instanceDate: LocalDateString;
  title: string;
  description?: string | null;
  areaId?: string | null;
  projectId?: string | null;
  goalId?: string | null;
  priority?: TaskPriority | null;
  energy?: TaskEnergy | null;
  durationMinutes?: number | null;
};

export type GeneratedTaskInstanceResult = {
  task: Task;
  existing: boolean;
};

export type MealDateRangeListInput = {
  userId: UserId;
  profileId: ProfileId;
  startDate: LocalDateString;
  endDate: LocalDateString;
};

export type CreateRecipeRepositoryInput = RecipeCreateInput & {
  userId: UserId;
  profileId: ProfileId;
};

export type UpdateRecipeRepositoryInput = RecipeUpdateInput & {
  userId: UserId;
  profileId: ProfileId;
};

export type ArchiveRecipeRepositoryInput = RecipeArchiveInput & {
  userId: UserId;
  profileId: ProfileId;
};

export type CreateMealRepositoryInput = MealCreateInput & {
  userId: UserId;
  profileId: ProfileId;
};

export type UpdateMealRepositoryInput = MealUpdateInput & {
  userId: UserId;
  profileId: ProfileId;
};

export type CompleteMealRepositoryInput = MealCompleteInput & {
  userId: UserId;
  profileId: ProfileId;
};

export type CreateSkillRepositoryInput = SkillCreateInput & {
  userId: UserId;
};

export type UpdateSkillRepositoryInput = SkillUpdateInput & {
  userId: UserId;
};

export type ArchiveSkillRepositoryInput = SkillArchiveInput & {
  userId: UserId;
};

export type CreateSkillEvidenceRepositoryInput = SkillEvidenceCreateInput & {
  userId: UserId;
};

export type UpdateSkillEvidenceRepositoryInput = SkillEvidenceUpdateInput & {
  userId: UserId;
};

export type DeleteSkillEvidenceRepositoryInput = SkillEvidenceDeleteInput & {
  userId: UserId;
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
  createGeneratedTaskInstance(
    input: CreateGeneratedTaskInstanceInput,
  ): Promise<RepositoryResult<GeneratedTaskInstanceResult>>;
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

export interface NutritionRepository {
  archiveRecipe(
    input: ArchiveRecipeRepositoryInput,
  ): Promise<RepositoryResult<Recipe>>;
  completeMeal(
    input: CompleteMealRepositoryInput,
  ): Promise<RepositoryResult<Meal>>;
  createMeal(input: CreateMealRepositoryInput): Promise<RepositoryResult<Meal>>;
  createRecipe(
    input: CreateRecipeRepositoryInput,
  ): Promise<RepositoryResult<Recipe>>;
  getActiveRecipesByUser(
    userId: UserId,
    profileId: ProfileId,
  ): Promise<RepositoryListResult<Recipe>>;
  getMealsByUserAndDateRange(
    input: MealDateRangeListInput,
  ): Promise<RepositoryListResult<Meal>>;
  getRecipesByUser(
    userId: UserId,
    profileId: ProfileId,
  ): Promise<RepositoryListResult<Recipe>>;
  updateMeal(input: UpdateMealRepositoryInput): Promise<RepositoryResult<Meal>>;
  updateRecipe(
    input: UpdateRecipeRepositoryInput,
  ): Promise<RepositoryResult<Recipe>>;
}

export interface SkillRepository {
  archiveSkill(
    input: ArchiveSkillRepositoryInput,
  ): Promise<RepositoryResult<Skill>>;
  createSkill(
    input: CreateSkillRepositoryInput,
  ): Promise<RepositoryResult<Skill>>;
  createSkillEvidence(
    input: CreateSkillEvidenceRepositoryInput,
  ): Promise<RepositoryResult<SkillEvidence>>;
  deleteSkillEvidence(
    input: DeleteSkillEvidenceRepositoryInput,
  ): Promise<RepositoryResult<SkillEvidence>>;
  getActiveSkillsByUser(userId: UserId): Promise<RepositoryListResult<Skill>>;
  getSkillEvidenceByUser(
    userId: UserId,
  ): Promise<RepositoryListResult<SkillEvidence>>;
  getSkillEvidenceForSkill(input: {
    userId: UserId;
    skillId: string;
  }): Promise<RepositoryListResult<SkillEvidence>>;
  getSkillsByUser(userId: UserId): Promise<RepositoryListResult<Skill>>;
  updateSkill(
    input: UpdateSkillRepositoryInput,
  ): Promise<RepositoryResult<Skill>>;
  updateSkillEvidence(
    input: UpdateSkillEvidenceRepositoryInput,
  ): Promise<RepositoryResult<SkillEvidence>>;
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
  nutrition: NutritionRepository;
  skills: SkillRepository;
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
