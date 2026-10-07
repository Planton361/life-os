import { readProjectProjection } from "../supabase/repositories/project-projection-read";
import { createInboxWorkspaceRepository } from "../supabase/repositories/supabase-inbox-workspace-repository";
import { createSupabaseShopRepository } from "../supabase/repositories/supabase-shop-repository";
import { createSupabaseChallengeRepository } from "../supabase/repositories/supabase-challenge-repository";
import { createSupabaseAntiRotRepository } from "../supabase/repositories/supabase-anti-rot-repository";
import "server-only";
import type { SupabaseClientLike } from "../supabase/database.types";
import * as repositories from "../supabase/repositories";
import type { ApplicationRepositories } from "./repositories";
import type { ApplicationScopes } from "./application-context";

export function supabaseApplicationScopes(
  client: SupabaseClientLike,
  ownerId: string,
): ApplicationScopes {
  async function owns(table: "goals" | "projects", userId: string, id: string) {
    if (userId !== ownerId) return false;
    const result = await client
      .from(table)
      .select("id")
      .eq("user_id", ownerId)
      .eq("id", id)
      .is("archived_at", null)
      .maybeSingle();
    return !result.error && Boolean(result.data);
  }
  return {
    ownsActiveGoal: (user, id) => owns("goals", user, id),
    ownsActiveProject: (user, id) => owns("projects", user, id),
  };
}

export function supabaseApplicationRepositories(
  client: SupabaseClientLike,
  ownerId: string,
): ApplicationRepositories {
  return {
    coding: repositories.createSupabaseCodingRepository(client),
    education: repositories.createSupabaseEducationRepository(client),
    work: repositories.createSupabaseWorkRepository(client),
    workKnowledge: repositories.createSupabaseWorkKnowledgeRepository(client),
    workMeetings: repositories.createSupabaseWorkMeetingRepository(client),
    life: repositories.createSupabaseLifeRepository(client),
    antiRot: createSupabaseAntiRotRepository(client),
    challenges: createSupabaseChallengeRepository(client),
    shop: createSupabaseShopRepository(client),
    inboxWorkspace: createInboxWorkspaceRepository(client, ownerId),
    tasks: repositories.createSupabaseTaskRepository(client),
    projects: repositories.createSupabaseProjectRepository(client),
    goals: repositories.createSupabaseGoalRepository(client),
    skills: repositories.createSupabaseSkillRepository(client),
    inbox: repositories.createSupabaseInboxRepository(client),
    resources: repositories.createSupabaseResourceRepository(client),
    recurrence:
      repositories.createSupabaseRecurringTaskTemplateRepository(client),
    reviews: repositories.createSupabaseReviewRepository(client),
    health: repositories.createSupabaseHealthRepository(client),
    habits: repositories.createSupabaseHabitRepository(client),
    nutrition: repositories.createSupabaseNutritionRepository(client),
    training: repositories.createSupabaseTrainingRepository(client),
    scheduling: repositories.createSupabaseScheduleSourceRepository(client),
  };
}

import type { ApplicationUseCases } from "./use-cases";
import * as task_dependency_repository from "../supabase/repositories/task-dependency-repository";
import * as task_step_repository from "../supabase/repositories/task-step-repository";
import * as project_artifact_repository from "../supabase/repositories/project-artifact-repository";
import * as project_milestone_repository from "../supabase/repositories/project-milestone-repository";
import * as project_depth_repository from "../supabase/repositories/project-depth-repository";
export function supabaseApplicationUseCases(
  client: SupabaseClientLike,
): ApplicationUseCases {
  return {
    triageInbox: repositories.createSupabaseInboxTriageTransaction(client),
    resourceFromInbox:
      repositories.createSupabaseInboxResourceTransaction(client),
    applyNutritionPlan: async (operations) => {
      const r = await client.rpc("apply_nutrition_plan", {
        p_operations: operations as import("@/types/supabase").Json,
      });
      return { error: r.error };
    },
    skillDevelopmentCommand: async (input) => {
      const r = await client.rpc("skill_development_command", {
        p_skill_id: input.skillId,
        p_command_id: input.commandId,
        p_operation: input.operation,
        p_expected_revision: input.expectedRevision,
        p_payload: input.payload as import("@/types/supabase").Json,
      });
      return { data: r.data, error: r.error };
    },
    createGoalContextProject: (...args) =>
      repositories.createGoalContextProject(client, ...args),
    createGoalContextTask: (...args) =>
      repositories.createGoalContextTask(client, ...args),
    getGoalOutcome: (...args) => repositories.getGoalOutcome(client, ...args),
    getGoalOutcomeSummaries: (...args) =>
      repositories.getGoalOutcomeSummaries(client, ...args),
    createGoalMilestone: (...args) =>
      repositories.createGoalMilestone(client, ...args),
    updateGoalMilestone: (...args) =>
      repositories.updateGoalMilestone(client, ...args),
    setGoalMilestoneStatus: (...args) =>
      repositories.setGoalMilestoneStatus(client, ...args),
    archiveGoalMilestone: (...args) =>
      repositories.archiveGoalMilestone(client, ...args),
    reorderGoalMilestone: (...args) =>
      repositories.reorderGoalMilestone(client, ...args),
    createGoalCriterion: (...args) =>
      repositories.createGoalCriterion(client, ...args),
    archiveGoalCriterion: (...args) =>
      repositories.archiveGoalCriterion(client, ...args),
    appendGoalCriterionEvaluation: (...args) =>
      repositories.appendGoalCriterionEvaluation(client, ...args),
    appendGoalCriterionRevision: (...args) =>
      repositories.appendGoalCriterionRevision(client, ...args),
    addGoalCriterionEvidence: (...args) =>
      repositories.addGoalCriterionEvidence(client, ...args),
    addGoalMilestoneEvidence: (...args) =>
      repositories.addGoalMilestoneEvidence(client, ...args),
    addGoalAchievementEvidence: (...args) =>
      repositories.addGoalAchievementEvidence(client, ...args),
    amendGoalMilestoneAchievementEvent: (...args) =>
      repositories.amendGoalMilestoneAchievementEvent(client, ...args),
    amendGoalAchievementEvent: (...args) =>
      repositories.amendGoalAchievementEvent(client, ...args),
    addGoalProjectSupport: (...args) =>
      repositories.addGoalProjectSupport(client, ...args),
    removeGoalProjectSupport: (...args) =>
      repositories.removeGoalProjectSupport(client, ...args),
    addGoalTaskSupport: (...args) =>
      repositories.addGoalTaskSupport(client, ...args),
    removeGoalTaskSupport: (...args) =>
      repositories.removeGoalTaskSupport(client, ...args),
    achieveGoal: (...args) => repositories.achieveGoal(client, ...args),
    reopenGoal: (...args) => repositories.reopenGoal(client, ...args),
    readProjectDepth: (...args) =>
      project_depth_repository.readProjectDepth(client, ...args),
    writeProjectDepth: (...args) =>
      project_depth_repository.writeProjectDepth(client, ...args),
    writeProjectMilestone: (...args) =>
      project_milestone_repository.writeProjectMilestone(client, ...args),
    setProjectResourceRole: (...args) =>
      project_artifact_repository.setProjectResourceRole(client, ...args),
    readTaskDependencyGraph: (...args) =>
      task_dependency_repository.readTaskDependencyGraph(client, ...args),
    writeTaskDependency: (...args) =>
      task_dependency_repository.writeTaskDependency(client, ...args),
    writeTaskStep: (...args) =>
      task_step_repository.writeTaskStep(client, ...args),
  };
}

import type {
  ApplicationReadServices,
  EntityCatalogOptions,
} from "./read-services";
import { readAuthenticatedEntityWorkbench } from "../supabase/repositories/entity-workbench-read";
import { readWeeklyPlanningContext } from "../supabase/repositories/weekly-planning-read";
import { readTodayActivity } from "../supabase/repositories/supabase-today-activity-repository";
export function supabaseApplicationReads(
  client: SupabaseClientLike,
  ownerId: string,
): ApplicationReadServices {
  async function catalog<
    T extends "projects" | "goals" | "skills" | "tasks" | "resources" | "areas",
  >(table: T, options: EntityCatalogOptions = {}) {
    const rows: import("../supabase/database.types").TableRow<T>[] = [];
    for (let start = 0; ; start += 500) {
      let query = client
        .from(
          table as
            | "projects"
            | "goals"
            | "skills"
            | "tasks"
            | "resources"
            | "areas",
        )
        .select("*")
        .eq("user_id", ownerId)
        .order(table === "areas" ? "sort_order" : "updated_at", {
          ascending: table === "areas",
        })
        .order("id");
      if (options.activeOnly) query = query.is("archived_at", null);
      if (options.ids) query = query.in("id", [...options.ids]);
      const response = await query.range(start, start + 499);
      if (response.error) throw new Error("Entity catalog unavailable");
      const page = (response.data ??
        []) as unknown as import("../supabase/database.types").TableRow<T>[];
      rows.push(
        ...page.filter(
          (row) =>
            !(
              options.activeOnly &&
              table === "skills" &&
              "status" in row &&
              row.status === "archived"
            ),
        ),
      );
      if (
        page.length < 500 ||
        (options.limit !== undefined && rows.length >= options.limit)
      )
        return {
          data:
            options.limit === undefined ? rows : rows.slice(0, options.limit),
          error: null,
        };
    }
  }
  return {
    catalog: {
      projects: (options) => catalog("projects", options),
      goals: (options) => catalog("goals", options),
      skills: (options) => catalog("skills", options),
      tasks: (options) => catalog("tasks", options),
      resources: (options) => catalog("resources", options),
      areas: (options) => catalog("areas", options),
    },
    projectProjection: (input) => readProjectProjection(client, ownerId, input),
    profileTimezone: async () => {
      const result = await client
        .from("profiles")
        .select("timezone")
        .eq("id", ownerId)
        .maybeSingle();
      if (result.error) throw new Error("Profile unavailable");
      return result.data?.timezone ?? "Europe/Berlin";
    },
    workbench: (allowUnavailableDependencies) =>
      readAuthenticatedEntityWorkbench(
        client,
        ownerId,
        allowUnavailableDependencies,
      ),
    weeklyPlanning: () => readWeeklyPlanningContext(client, ownerId),
    todayActivity: (now) => readTodayActivity(client, ownerId, now),
    skillDevelopment: async (skillId) => {
      const result = await client.rpc("skill_development_read", {
        p_skill_id: skillId,
      });
      return { data: result.data, error: result.error };
    },
  };
}
