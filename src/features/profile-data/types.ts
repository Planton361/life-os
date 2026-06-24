import type { CalendarViewModel } from "@/features/calendar";
import type {
  DashboardMealSlotState,
  DashboardViewModel,
  HabitTrackerWindow,
  MealType,
} from "@/features/dashboard";
import type {
  EntityArea,
  EntityCollection,
  EntityPriority,
  GoalHorizon,
  GoalStatus,
  LifeGoal,
  LifeProject,
  LifeTask,
  ProjectStatus,
  TaskStatus,
} from "@/features/entities/types";
import type {
  InboxCaptureType,
  InboxQueueItem,
  InboxStage,
  InboxViewModel,
} from "@/features/inbox";
import type { MentalHealthPageViewModel } from "@/features/health/mental-health-view-model";
import type { PortfolioViewModel } from "@/features/portfolio";
import type { TodayViewModel } from "@/features/today";

export const lifeOsProfileIds = ["demo", "empty", "manual"] as const;

export type LifeOsProfileId = (typeof lifeOsProfileIds)[number];

export type LifeOsProfileSummary = {
  id: LifeOsProfileId;
  label: string;
  description: string;
  mutable: boolean;
};

export type ManualInboxItem = {
  id: string;
  title: string;
  stage: InboxStage;
  type: InboxCaptureType;
  next: string;
  age: string;
  note: string;
  areaId: EntityArea;
  createdAt: string;
};

export type ManualHabit = {
  id: string;
  marker: string;
  label: string;
  window: HabitTrackerWindow;
  currentValue: number;
  targetValue: number;
  unit?: string;
  stepValue: number;
  total: number;
  areaId: EntityArea;
  createdAt: string;
};

export type ManualMood = {
  label: string;
  updatedAt: string;
};

export type ManualMealSlot = {
  id: string;
  type: Exclude<MealType, "Snack">;
  state: DashboardMealSlotState;
  name: string;
  time: string;
  kcal?: string;
  macros: string[];
  updatedAt: string;
};

export type ManualProfileData = {
  version: 1;
  updatedAt: string | null;
  tasks: LifeTask[];
  projects: LifeProject[];
  goals: LifeGoal[];
  inboxItems: ManualInboxItem[];
  habits: ManualHabit[];
  mood: ManualMood | null;
  meals: ManualMealSlot[];
};

export type CreateTaskInput = {
  title: string;
  description?: string;
  date?: string;
  startTime?: string;
  durationMinutes?: number;
  areaId?: EntityArea;
  priority?: EntityPriority;
  status?: TaskStatus;
  nextStep?: string;
  projectId?: string;
  goalId?: string;
};

export type CreateInboxItemInput = {
  title: string;
  note?: string;
  type?: InboxCaptureType;
  areaId?: EntityArea;
};

export type CreateProjectInput = {
  title: string;
  description?: string;
  areaId?: EntityArea;
  status?: ProjectStatus;
  priority?: EntityPriority;
  nextStep?: string;
  deadline?: string;
};

export type CreateGoalInput = {
  title: string;
  description?: string;
  areaId?: EntityArea;
  status?: GoalStatus;
  horizon?: GoalHorizon;
  why?: string;
  measure?: string;
  targetValue?: string;
  nextStep?: string;
};

export type CreateHabitInput = {
  label: string;
  window?: HabitTrackerWindow;
  targetValue?: number;
  unit?: string;
  areaId?: EntityArea;
};

export type SetMoodInput = {
  label: string;
};

export type SaveMealSlotInput = {
  type: Exclude<MealType, "Snack">;
  state?: DashboardMealSlotState;
  name?: string;
  time?: string;
  kcal?: string;
  macros?: string[];
};

export type LifeOsDataSource = {
  profile: LifeOsProfileSummary;
  getDashboardViewModel(): Promise<DashboardViewModel>;
  getEntityCollection(): Promise<EntityCollection>;
  getTasks(): Promise<LifeTask[]>;
  createTask(input: CreateTaskInput): Promise<LifeTask>;
  getInboxItems(): Promise<InboxQueueItem[]>;
  createInboxItem(input: CreateInboxItemInput): Promise<ManualInboxItem>;
  getProjects(): Promise<LifeProject[]>;
  createProject(input: CreateProjectInput): Promise<LifeProject>;
  getGoals(): Promise<LifeGoal[]>;
  createGoal(input: CreateGoalInput): Promise<LifeGoal>;
  createHabit(input: CreateHabitInput): Promise<ManualHabit>;
  setMood(input: SetMoodInput): Promise<ManualMood>;
  saveMealSlot(input: SaveMealSlotInput): Promise<ManualMealSlot>;
  getPortfolioViewModel(): Promise<PortfolioViewModel>;
  getMentalHealthViewModel(): Promise<MentalHealthPageViewModel>;
  getInboxViewModel(): Promise<InboxViewModel>;
  getTodayViewModel(): Promise<TodayViewModel>;
  getCalendarViewModel(): Promise<CalendarViewModel>;
  resetManualProfile(): Promise<void>;
};
