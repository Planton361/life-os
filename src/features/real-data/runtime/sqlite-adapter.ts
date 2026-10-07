import { sqliteInboxTransactions } from "./sqlite-inbox-transactions";
import { createSqliteInboxWorkspaceRepository } from "../sqlite/repositories/inbox-workspace-repository";
import { skillDevelopmentCommand } from "../sqlite/repositories/skill-development-repository";
import { applyNutritionPlan } from "../sqlite/commands/nutrition-commands";
import "server-only";
import { sqliteRetainedApplicationRepositories } from "./sqlite-retained-adapter";
import type { ApplicationRepositories } from "./repositories";
import type { ApplicationScopes } from "./application-context";
import type { SqliteRuntime } from "../sqlite/runtime";
import {
  requireOwnerContext,
  type OwnerContext,
} from "../sqlite/owner-context";
import type { RepositoryResult } from "../repositories/repository-result";
import {
  mapGoalRowToDomain,
  mapProjectRowToDomain,
  mapSkillRowToDomain,
  mapSkillEvidenceRowToDomain,
  mapTaskSkillLinkRowToDomain,
} from "../supabase/mappers";
import type { TableRow } from "../supabase/database.types";
import { safeNumber } from "../sqlite/codecs";
import { createSqliteCanonicalBaseRepository } from "../sqlite/repositories/canonical-base-repository";
import { createSqliteTaskRepository } from "../sqlite/repositories/task-repository";
import { sourceTaskCommands } from "../sqlite/commands/source-commands";
import { createSqliteResourceRepository } from "../sqlite/repositories/resource-repository";
import { createSqliteInboxRepository } from "../sqlite/repositories/inbox-repository";
import { createSqliteRecurringTaskTemplateRepository } from "../sqlite/repositories/recurring-task-template-repository";
import { createSqliteReviewRepository } from "../sqlite/repositories/review-repository";
import { createSqliteHealthRepository } from "../sqlite/repositories/health-repository";
import { createSqliteHabitRepository } from "../sqlite/repositories/habit-repository";
import { createSqliteNutritionRepository } from "../sqlite/repositories/nutrition-repository";
import { createSqliteTrainingRepository } from "../sqlite/repositories/training-repository";
import { taskSkillLink } from "../sqlite/repositories/skill-development-repository";
import { createSqliteScheduleSourceRepository } from "../sqlite/repositories/schedule-source-repository";

// Canonical Number DTOs fail rather than silently rounding an unsafe integer.
function dto<T>(row: unknown): T {
  return Object.fromEntries(
    Object.entries(row as Record<string, unknown>).map(([key, value]) => [
      key,
      typeof value === "bigint" ? safeNumber(value) : value,
    ]),
  ) as T;
}
async function result<T>(body: () => T): Promise<RepositoryResult<T>> {
  try {
    return { ok: true, data: body() };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "SQLITE_APPLICATION_OPERATION_FAILED";
    return {
      ok: false,
      error: {
        code: /CONFLICT|LIFECYCLE|ALIGNMENT/.test(message)
          ? "conflict"
          : /OWNER|SCOPE/.test(message)
            ? "forbidden"
            : "adapter_unavailable",
        message,
      },
    };
  }
}

export function sqliteApplicationScopes(
  store: SqliteRuntime,
  context: OwnerContext,
): ApplicationScopes {
  const owner = requireOwnerContext(context);
  function owns(table: "goals" | "projects", userId: string, id: string) {
    if (userId !== owner) return false;
    return store.read(context, (db) =>
      Boolean(
        db
          .prepare(
            `SELECT id FROM ${table} WHERE user_id=? AND id=? AND archived_at IS NULL`,
          )
          .get(owner, id),
      ),
    );
  }
  return {
    ownsActiveGoal: async (user, id) => owns("goals", user, id),
    ownsActiveProject: async (user, id) => owns("projects", user, id),
  };
}

export function sqliteApplicationRepositories(
  store: SqliteRuntime,
  context: OwnerContext,
): ApplicationRepositories {
  const owner = requireOwnerContext(context);
  const base = createSqliteCanonicalBaseRepository(store, context);
  const scope = (user: string, profile = user) => {
    if (user !== owner || profile !== owner) throw new Error("OWNER_DENIED");
  };
  const skillRows = (user: string, active = false) => {
    scope(user);
    return store.read(context, (db) =>
      db
        .prepare(
          `SELECT * FROM skills WHERE user_id=? ${active ? "AND archived_at IS NULL AND status<>'archived'" : ""} ORDER BY updated_at DESC,id`,
        )
        .all(owner)
        .map((r) => mapSkillRowToDomain(dto<TableRow<"skills">>(r))),
    );
  };
  const evidence = (user: string, skillId?: string) => {
    scope(user);
    return store.read(context, (db) => {
      if (
        skillId &&
        !db
          .prepare("SELECT id FROM skills WHERE user_id=? AND id=?")
          .get(owner, skillId)
      )
        throw new Error("SKILL_NOT_FOUND");
      return db
        .prepare(
          `SELECT * FROM skill_evidence WHERE user_id=? AND withdrawn_at IS NULL ${skillId ? "AND skill_id=?" : ""} ORDER BY evidence_date DESC,created_at DESC,id`,
        )
        .all(owner, ...(skillId ? [skillId] : []))
        .map((r) =>
          mapSkillEvidenceRowToDomain(dto<TableRow<"skill_evidence">>(r)),
        );
    });
  };
  const deniedLegacySkillWrite = async (): Promise<
    RepositoryResult<never>
  > => ({
    ok: false,
    error: {
      code: "validation_error",
      message:
        "Skill writes require skill_development_command, command_id and expected development revision; Evidence is withdrawn, never deleted.",
    },
  });
  return {
    ...sqliteRetainedApplicationRepositories(store, context),
    inboxWorkspace: (() => {
      const repo = createSqliteInboxWorkspaceRepository(store, context);
      return {
        complete: async (input) => repo.complete(input),
        save: async (input) => repo.save(input),
        route: async (input) => repo.route(input),
      };
    })(),
    tasks: createSqliteTaskRepository(store, context, sourceTaskCommands),
    inbox: createSqliteInboxRepository(store, context),
    resources: createSqliteResourceRepository(store, context),
    recurrence: createSqliteRecurringTaskTemplateRepository(store, context),
    reviews: createSqliteReviewRepository(store, context),
    health: createSqliteHealthRepository(store, context),
    habits: createSqliteHabitRepository(store, context),
    nutrition: createSqliteNutritionRepository(store, context),
    training: createSqliteTrainingRepository(store, context),
    scheduling: createSqliteScheduleSourceRepository(store, context),
    projects: {
      getProjectsByUser: (user, profile) =>
        result(() => {
          scope(user, profile);
          return base
            .activeEntities(user, "projects")
            .map((r) => mapProjectRowToDomain(dto<TableRow<"projects">>(r)));
        }),
      createProject: (input) =>
        result(() =>
          mapProjectRowToDomain(dto<TableRow<"projects">>(base.project(input))),
        ),
      updateProject: (input) =>
        result(() =>
          mapProjectRowToDomain(
            dto<TableRow<"projects">>(base.project(input, true)),
          ),
        ),
    },
    goals: {
      getGoalsByUser: (user, profile) =>
        result(() => {
          scope(user, profile);
          return base
            .activeEntities(user, "goals")
            .map((r) => mapGoalRowToDomain(dto<TableRow<"goals">>(r)));
        }),
      createGoal: (input) =>
        result(() =>
          mapGoalRowToDomain(dto<TableRow<"goals">>(base.goal(input))),
        ),
      updateGoal: (input) =>
        result(() =>
          mapGoalRowToDomain(dto<TableRow<"goals">>(base.goal(input, true))),
        ),
    },
    skills: {
      archiveSkill: deniedLegacySkillWrite,
      createSkill: deniedLegacySkillWrite,
      updateSkill: deniedLegacySkillWrite,
      createSkillEvidence: deniedLegacySkillWrite,
      updateSkillEvidence: deniedLegacySkillWrite,
      deleteSkillEvidence: deniedLegacySkillWrite,
      getActiveSkillsByUser: (user) => result(() => skillRows(user, true)),
      getSkillsByUser: (user) => result(() => skillRows(user)),
      getSkillEvidenceByUser: (user) => result(() => evidence(user)),
      getSkillEvidenceForSkill: (input) =>
        result(() => evidence(input.userId, input.skillId)),
      getTaskSkillLinksByUser: (user) =>
        result(() => {
          scope(user);
          return store.read(context, (db) =>
            db
              .prepare(
                "SELECT * FROM task_skill_links WHERE user_id=? ORDER BY created_at,id",
              )
              .all(owner)
              .map((r) =>
                mapTaskSkillLinkRowToDomain(
                  dto<TableRow<"task_skill_links">>(r),
                ),
              ),
          );
        }),
      linkTaskSkill: (input) =>
        result(() => {
          scope(input.userId);
          return mapTaskSkillLinkRowToDomain(
            dto<TableRow<"task_skill_links">>(
              taskSkillLink(store, context, input),
            ),
          );
        }),
      unlinkTaskSkill: (input) =>
        result(() => {
          scope(input.userId);
          return mapTaskSkillLinkRowToDomain(
            dto<TableRow<"task_skill_links">>(
              taskSkillLink(store, context, input, true),
            ),
          );
        }),
    },
  };
}

import type { ApplicationUseCases } from "./use-cases";
import { createSqliteGoalOutcomeRepository } from "../sqlite/repositories/goal-outcome-repository";
import {
  readSqliteProjectDepth,
  writeSqliteProjectDepth,
} from "../sqlite/repositories/project-depth-repository";
import { createSqliteProjectArtifactRepository } from "../sqlite/repositories/resource-repository";
import { createSqliteTaskStepRepository } from "../sqlite/repositories/task-step-repository";
import { dependencyErrorMessage } from "../supabase/repositories/task-dependency-repository";
export function sqliteApplicationUseCases(
  store: SqliteRuntime,
  context: OwnerContext,
): ApplicationUseCases {
  const owner = requireOwnerContext(context);
  const goal = createSqliteGoalOutcomeRepository(store, context);
  const base = createSqliteCanonicalBaseRepository(store, context);
  return {
    ...sqliteInboxTransactions(store, context),
    applyNutritionPlan: async (operations) => {
      try {
        store.command(context, "nutrition.plan", (db) =>
          applyNutritionPlan(db, owner, operations),
        );
        return { error: null };
      } catch (e) {
        return {
          error: {
            message: e instanceof Error ? e.message : "NUTRITION_PLAN_FAILED",
          },
        };
      }
    },
    skillDevelopmentCommand: async (input) => {
      try {
        return {
          data: skillDevelopmentCommand(store, context, input),
          error: null,
        };
      } catch (e) {
        return {
          data: null,
          error: {
            message: e instanceof Error ? e.message : "SKILL_COMMAND_FAILED",
          },
        };
      }
    },
    getGoalOutcome: (userId, goalId, dependencyGraph) =>
      goal.getGoalOutcome({
        userId,
        profileId: userId,
        goalId,
        dependencyGraph,
      }),
    getGoalOutcomeSummaries: (userId, goalIds) =>
      goal.getGoalOutcomeSummaries({ userId, profileId: userId, goalIds }),
    createGoalContextProject: (input) =>
      goal.createGoalContextProject({ ...input, profileId: input.userId }),
    createGoalContextTask: (input) =>
      goal.createGoalContextTask({ ...input, profileId: input.userId }),
    createGoalMilestone: (input) =>
      goal.createGoalMilestone({ ...input, profileId: input.userId }),
    updateGoalMilestone: (input) =>
      goal.updateGoalMilestone({ ...input, profileId: input.userId }),
    setGoalMilestoneStatus: (input) =>
      goal.setGoalMilestoneStatus({ ...input, profileId: input.userId }),
    archiveGoalMilestone: (input) =>
      goal.archiveGoalMilestone({ ...input, profileId: input.userId }),
    reorderGoalMilestone: (input) =>
      goal.reorderGoalMilestone({ ...input, profileId: input.userId }),
    createGoalCriterion: (input) =>
      goal.createGoalCriterion({ ...input, profileId: input.userId }),
    archiveGoalCriterion: (input) =>
      goal.archiveGoalCriterion({ ...input, profileId: input.userId }),
    appendGoalCriterionEvaluation: (input) =>
      goal.appendGoalCriterionEvaluation({ ...input, profileId: input.userId }),
    appendGoalCriterionRevision: (input, kind) =>
      goal.appendGoalCriterionRevision(
        { ...input, profileId: input.userId },
        kind,
      ),
    addGoalCriterionEvidence: (input) =>
      goal.addGoalCriterionEvidence({ ...input, profileId: input.userId }),
    addGoalMilestoneEvidence: (input) =>
      goal.addGoalMilestoneEvidence({ ...input, profileId: input.userId }),
    addGoalAchievementEvidence: (input) =>
      goal.addGoalAchievementEvidence({ ...input, profileId: input.userId }),
    amendGoalMilestoneAchievementEvent: (input) =>
      goal.amendGoalMilestoneAchievementEvent({
        ...input,
        profileId: input.userId,
      }),
    amendGoalAchievementEvent: (input) =>
      goal.amendGoalAchievementEvent({ ...input, profileId: input.userId }),
    addGoalProjectSupport: (input) =>
      goal.addGoalProjectSupport({ ...input, profileId: input.userId }),
    removeGoalProjectSupport: (input) =>
      goal.removeGoalProjectSupport({ ...input, profileId: input.userId }),
    addGoalTaskSupport: (input) =>
      goal.addGoalTaskSupport({ ...input, profileId: input.userId }),
    removeGoalTaskSupport: (input) =>
      goal.removeGoalTaskSupport({ ...input, profileId: input.userId }),
    achieveGoal: (input) =>
      goal.achieveGoal({ ...input, profileId: input.userId }),
    reopenGoal: (input) =>
      goal.reopenGoal({ ...input, profileId: input.userId }),
    readProjectDepth: async (userId, projectId, beforeRevision) => {
      if (userId !== owner) throw new Error("OWNER_DENIED");
      return readSqliteProjectDepth(store, context, projectId, beforeRevision);
    },
    writeProjectDepth: (input) =>
      writeSqliteProjectDepth(store, context, input),
    readTaskDependencyGraph: async () => base.dependencies(owner),
    writeTaskDependency: async (userId, input) => {
      try {
        base.dependency(userId, input);
        return {
          status: "success",
          message:
            (input as { operation?: string }).operation === "remove"
              ? "Dependency entfernt."
              : "Dependency gespeichert.",
        };
      } catch (error) {
        return {
          status: "error",
          message: dependencyErrorMessage(
            error instanceof Error ? error.message : "",
          ),
        };
      }
    },
    writeProjectMilestone: async (userId, input) => {
      try {
        base.milestone(userId, input);
        return true;
      } catch {
        return false;
      }
    },
    setProjectResourceRole: (input) =>
      createSqliteProjectArtifactRepository(
        store,
        context,
      ).setProjectResourceRole(input),
    writeTaskStep: async (userId, operation, input) =>
      userId === owner &&
      createSqliteTaskStepRepository(store, context).write(operation, input),
  };
}
