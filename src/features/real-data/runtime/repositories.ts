import "server-only";
import type {
  GoalRepository,
  ProjectRepository,
  SkillRepository,
  TaskRepository,
  ResourceRepository,
  InboxRepository,
  RecurringTaskTemplateRepository,
  ReviewRepository,
} from "../repositories";
import type { createSqliteHealthRepository } from "../sqlite/repositories/health-repository";
import type { createSqliteHabitRepository } from "../sqlite/repositories/habit-repository";
import type { createSqliteNutritionRepository } from "../sqlite/repositories/nutrition-repository";
import type { createSqliteTrainingRepository } from "../sqlite/repositories/training-repository";
import type { createSupabaseScheduleSourceRepository } from "../supabase/repositories/supabase-schedule-source-repository";

import type { createSupabaseCodingRepository } from "../supabase/repositories/supabase-coding-repository";

import type { createSupabaseEducationRepository } from "../supabase/repositories/supabase-education-repository";

import type { createSupabaseWorkRepository } from "../supabase/repositories/supabase-work-repository";

import type { createSupabaseWorkKnowledgeRepository } from "../supabase/repositories/supabase-work-knowledge-repository";

import type { createSupabaseWorkMeetingRepository } from "../supabase/repositories/supabase-work-meeting-repository";

import type { createSupabaseLifeRepository } from "../supabase/repositories/supabase-life-repository";

import type { createSupabaseAntiRotRepository } from "../supabase/repositories/supabase-anti-rot-repository";

import type { createSupabaseChallengeRepository } from "../supabase/repositories/supabase-challenge-repository";

import type { createSupabaseShopRepository } from "../supabase/repositories/supabase-shop-repository";

export type ApplicationRepositories = Readonly<{
  coding: ReturnType<typeof createSupabaseCodingRepository>;
  education: ReturnType<typeof createSupabaseEducationRepository>;
  work: ReturnType<typeof createSupabaseWorkRepository>;
  workKnowledge: ReturnType<typeof createSupabaseWorkKnowledgeRepository>;
  workMeetings: ReturnType<typeof createSupabaseWorkMeetingRepository>;
  life: ReturnType<typeof createSupabaseLifeRepository>;
  antiRot: ReturnType<typeof createSupabaseAntiRotRepository>;
  challenges: ReturnType<typeof createSupabaseChallengeRepository>;
  shop: ReturnType<typeof createSupabaseShopRepository>;
  inboxWorkspace: {
    complete(
      input: import("../schemas/inbox-workspace.schemas").InboxCompletionInput,
    ): Promise<{ data: unknown; error: { code: string } | null }>;
    save(
      input: import("../schemas/inbox-workspace.schemas").InboxClarificationInput,
    ): Promise<{
      data: { updated_at: string } | null;
      error: { code: string } | null;
    }>;
    route(
      input: import("../schemas/inbox-workspace.schemas").InboxRouteInput,
    ): Promise<{ data: unknown; error: { code: string } | null }>;
  };
  tasks: TaskRepository;
  projects: ProjectRepository;
  goals: GoalRepository;
  skills: SkillRepository;
  resources: ResourceRepository;
  inbox: InboxRepository;
  recurrence: RecurringTaskTemplateRepository;
  reviews: ReviewRepository;
  health: ReturnType<typeof createSqliteHealthRepository>;
  habits: ReturnType<typeof createSqliteHabitRepository>;
  nutrition: Omit<
    ReturnType<typeof createSqliteNutritionRepository>,
    | "createExactRecipeIngredient"
    | "updateExactRecipeIngredient"
    | "getExactRecipeIngredients"
    | "applyNutritionPlan"
  >;
  training: Omit<
    ReturnType<typeof createSqliteTrainingRepository>,
    "completeRunningSession"
  >;
  scheduling: ReturnType<typeof createSupabaseScheduleSourceRepository>;
}>;

/** Reads can never acquire write admission by calling a repository method. */
export function admitRepository<T extends object>(
  repository: T,
  access: "read" | "write",
  reads: readonly (keyof T)[],
): T {
  const readMethods = new Set<PropertyKey>(reads);
  return new Proxy(repository, {
    get(target, key, receiver) {
      const value: unknown = Reflect.get(target, key, receiver);
      if (typeof value !== "function") return value;
      return (...args: unknown[]) => {
        if (!readMethods.has(key) && access !== "write")
          throw new Error("APPLICATION_WRITE_CONTEXT_REQUIRED");
        return Reflect.apply(value, target, args);
      };
    },
  });
}

export function admitApplicationRepositories(
  repositories: ApplicationRepositories,
  access: "read" | "write",
): ApplicationRepositories {
  return Object.freeze({
    coding: admitRepository(repositories.coding, access, ["getWorkspace"]),
    education: admitRepository(repositories.education, access, [
      "getWorkspace",
      "ownedProject",
    ]),
    work: admitRepository(repositories.work, access, ["getWorkspace"]),
    workKnowledge: admitRepository(repositories.workKnowledge, access, [
      "getKnowledge",
    ]),
    workMeetings: admitRepository(repositories.workMeetings, access, [
      "getMeetings",
    ]),
    life: admitRepository(repositories.life, access, [
      "getWorkspace",
      "getJournalEntries",
      "getEntertainmentWorkspace",
      "getInventoryWorkspace",
    ]),
    antiRot: admitRepository(repositories.antiRot, access, ["getWorkspace"]),
    challenges: admitRepository(repositories.challenges, access, [
      "getWorkspace",
      "progressFor",
    ]),
    shop: admitRepository(repositories.shop, access, ["getWorkspace"]),
    inboxWorkspace: admitRepository(repositories.inboxWorkspace, access, []),
    tasks: admitRepository(repositories.tasks, access, [
      "getTasksByUser",
      "getTasksForToday",
      "getCalendarTasks",
      "getPortfolioTasks",
    ]),
    projects: admitRepository(repositories.projects, access, [
      "getProjectsByUser",
    ]),
    goals: admitRepository(repositories.goals, access, ["getGoalsByUser"]),
    skills: admitRepository(repositories.skills, access, [
      "getActiveSkillsByUser",
      "getSkillsByUser",
      "getSkillEvidenceByUser",
      "getSkillEvidenceForSkill",
      "getTaskSkillLinksByUser",
    ]),
    inbox: admitRepository(repositories.inbox, access, ["getInboxItemsByUser"]),
    resources: admitRepository(repositories.resources, access, [
      "getResourcesByUser",
      "getResourceRelationsByUser",
      "getResourceRelationsForResource",
      "getResourceRelationsForTarget",
    ]),
    recurrence: admitRepository(repositories.recurrence, access, [
      "getActiveRecurringTaskTemplatesByUser",
      "getRecurringTaskTemplatesByUser",
    ]),
    reviews: admitRepository(repositories.reviews, access, [
      "getReviewByPeriod",
      "getReviewsInRange",
      "getTaskDecisions",
    ]),
    health: admitRepository(repositories.health, access, [
      "ensureProfile",
      "getSnapshot",
    ]),
    habits: admitRepository(repositories.habits, access, [
      "ensureProfile",
      "getSnapshot",
      "getSettings",
    ]),
    nutrition: admitRepository(repositories.nutrition, access, [
      "getRecipesByUser",
      "getActiveRecipesByUser",
      "getRecipeIngredients",
      "getMealsByUserAndDateRange",
    ]),
    training: admitRepository(repositories.training, access, ["getSnapshot"]),
    scheduling: admitRepository(repositories.scheduling, access, ["getLinks"]),
  });
}
