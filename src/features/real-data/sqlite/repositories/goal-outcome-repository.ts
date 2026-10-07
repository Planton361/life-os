import "server-only";
import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import { z } from "zod";
import { createProjectInputSchema } from "../../schemas/project.schemas";
import { createTaskInputSchema } from "../../schemas/task.schemas";
import { localDateSchema } from "../../schemas/schema-contract";
import type { TaskDependencyGraph } from "../../domain/task-dependencies";
import * as schemas from "../../schemas/goal-outcome.schemas";
import type { RepositoryResult } from "../../repositories/repository-result";
import { requireOwnerContext, type OwnerContext } from "../owner-context";
import type { SqliteRuntime } from "../runtime";
import { timestamp, uuid } from "../codecs";
import {
  activeGoal,
  activeGoalMilestone,
  exactGoalNumber,
  executeGoalCommandInTransaction,
  goalCommandFingerprint,
  goalRow,
  goalRows,
  insertGoalRow,
  priorGoalReceipt,
  setGoalCurrentMilestoneInTransaction,
  requireGoalRow,
  type GoalCommandRequest,
  type GoalCommandKind,
} from "../commands/goal-commands";
import {
  mapGoalCriterion,
  mapGoalEvaluation,
  mapGoalMilestone,
  readGoalOutcome,
} from "./goal-outcome-read";

const contextFields = {
  goalId: z.uuid(),
  milestoneId: z.uuid(),
  userId: z.uuid(),
  profileId: z.uuid(),
  commandId: z.uuid().optional(),
};
const contextProjectSchema = createProjectInputSchema.extend({
  ...contextFields,
  targetDate: localDateSchema.optional(),
});
const contextTaskSchema = createTaskInputSchema.extend(contextFields);
type Scope = { userId: string; profileId: string };
function failure(error: unknown): RepositoryResult<never> {
  const message =
    error instanceof Error ? error.message : "GOAL_COMMAND_FAILED";
  return {
    ok: false,
    error: {
      code: /OWNER_|SCOPE_/.test(message)
        ? "forbidden"
        : message.endsWith("NOT_FOUND")
          ? "not_found"
          : "conflict",
      message: /^GOAL_[A-Z_]+$/.test(message)
        ? message
        : "Goal konnte nicht gespeichert oder geladen werden.",
    },
  };
}

export function createSqliteGoalOutcomeRepository(
  store: SqliteRuntime,
  context: OwnerContext,
) {
  const scope = (input: Scope) => {
    const owner = requireOwnerContext(context);
    if (uuid(input.userId) !== owner || uuid(input.profileId) !== owner)
      throw new Error("SCOPE_DENIED");
    return owner;
  };
  const command = <S extends z.ZodType, T>(
    schema: S,
    input: unknown,
    kind: string,
    body: (db: Database.Database, owner: string, input: z.output<S>) => T,
  ): RepositoryResult<T> => {
    try {
      const parsed = schema.safeParse(input);
      if (!parsed.success) throw new Error("GOAL_INPUT_INVALID");
      const normalized = Object.fromEntries(
        Object.entries(parsed.data as Record<string, unknown>).map(
          ([key, value]) => [
            key,
            key.endsWith("Id") && typeof value === "string"
              ? uuid(value)
              : value,
          ],
        ),
      ) as z.output<S>;
      scope(normalized as Scope);
      return {
        ok: true,
        data: store.command(context, kind, (db, owner) =>
          body(db, owner, normalized),
        ),
      };
    } catch (error) {
      return failure(error);
    }
  };
  const execute = (
    db: Database.Database,
    owner: string,
    kind: GoalCommandKind,
    payload: Record<string, unknown>,
    commandId?: string,
    options: Pick<GoalCommandRequest, "review" | "currentTask"> = {},
  ) =>
    executeGoalCommandInTransaction(db, owner, {
      kind,
      commandId: commandId ?? randomUUID(),
      requestFingerprint: goalCommandFingerprint(kind, payload),
      payload,
      ...options,
    });
  const milestone = (
    db: Database.Database,
    owner: string,
    goalId: string,
    id: string,
  ) => mapGoalMilestone(activeGoalMilestone(db, owner, goalId, id));
  const references = (
    items: readonly {
      sourceType?: string;
      sourceId?: string;
      supersedesReferenceId?: string;
      reason?: string;
    }[],
  ) =>
    items.map((r) => ({
      source_type: r.sourceType ?? null,
      source_id: r.sourceId ?? null,
      supersedes_reference_id: r.supersedesReferenceId ?? null,
      reason: r.reason ?? null,
    }));
  const evidence = (
    family: "criterion" | "milestone" | "goal",
    input: unknown,
  ) => {
    const schema =
      family === "criterion"
        ? schemas.goalCriterionEvidenceInputSchema
        : family === "milestone"
          ? schemas.goalMilestoneEvidenceInputSchema
          : schemas.goalAchievementEvidenceInputSchema;
    return command(schema, input, `goal.${family}.evidence`, (db, owner, i) => {
      const payload = {
        goal_id: i.goalId,
        ...("evaluationId" in i ? { evaluation_id: i.evaluationId } : {}),
        ...("milestoneId" in i ? { milestone_id: i.milestoneId } : {}),
        ...("achievementEventId" in i
          ? { achievement_event_id: i.achievementEventId ?? null }
          : {}),
        action: i.action,
        retrospective: i.retrospective ?? false,
        references: references(i.references),
      };
      const result = execute(
        db,
        owner,
        `${family}.evidence`,
        payload,
        i.commandId,
      );
      return { referencesChanged: Number(result.references_changed) };
    });
  };
  const revision = (
    input: unknown,
    kind: "criterion.evaluate" | "criterion.correct" | "criterion.retract",
  ) => {
    // Validate the established schema without coercing exact decimal text into
    // an IEEE Number. The finite decimal codec validates that field separately.
    const raw = input as Record<string, unknown>;
    let numeric: string | null;
    try {
      numeric =
        raw?.numericValue == null || raw.numericValue === ""
          ? null
          : exactGoalNumber(raw.numericValue as string | number);
    } catch (error) {
      return failure(error);
    }
    const validation = numeric === null ? input : { ...raw, numericValue: 0 };
    return command(
      schemas.goalCriterionEvaluationInputSchema,
      validation,
      `goal.${kind}`,
      (db, owner, i) => {
        const c = requireGoalRow(
          goalRow(
            db,
            "SELECT * FROM goal_outcome_criteria WHERE user_id=? AND goal_id=? AND id=?",
            owner,
            i.goalId,
            i.criterionId,
          ),
          "GOAL_CRITERION_NOT_FOUND",
        );
        if (c.criterion_type !== i.criterionType)
          throw new Error("GOAL_CRITERION_TYPE_CHANGED");
        const result = execute(
          db,
          owner,
          kind,
          {
            goal_id: i.goalId,
            criterion_id: i.criterionId,
            expected_latest_evaluation_id: i.expectedLatestEvaluationId ?? null,
            deferred:
              kind === "criterion.retract"
                ? false
                : i.evaluationState === "deferred",
            boolean_value:
              kind === "criterion.retract" ? null : (i.booleanValue ?? null),
            numeric_value:
              kind === "criterion.retract"
                ? null
                : typeof raw.numericValue === "number"
                  ? raw.numericValue
                  : numeric,
            unit: kind === "criterion.retract" ? null : (i.unit ?? null),
            note: i.note ?? null,
            correction_reason: i.correctionReason ?? null,
            retrospective: i.retrospective ?? false,
          },
          i.commandId,
        );
        return mapGoalEvaluation(
          requireGoalRow(
            goalRow(
              db,
              "SELECT * FROM goal_criterion_evaluations WHERE user_id=? AND id=?",
              owner,
              result.evaluation_id,
            ),
            "GOAL_EVALUATION_NOT_FOUND",
          ),
        );
      },
    );
  };
  const addSupport = (family: "project" | "task", input: unknown) =>
    command(
      family === "project"
        ? schemas.goalProjectSupportInputSchema
        : schemas.goalTaskSupportInputSchema,
      input,
      "goal.support.add",
      (db, owner, i) => {
        activeGoal(db, owner, i.goalId, true);
        activeGoalMilestone(db, owner, i.goalId, i.goalMilestoneId);
        const target = "projectId" in i ? i.projectId : i.taskId;
        const id = randomUUID();
        insertGoalRow(
          db,
          family === "project"
            ? "goal_milestone_project_support"
            : "goal_milestone_task_support",
          {
            id,
            user_id: owner,
            goal_id: i.goalId,
            goal_milestone_id: i.goalMilestoneId,
            [`${family}_id`]: target,
          },
        );
        return { id };
      },
    );
  const removeSupport = (family: "project" | "task", input: unknown) =>
    command(
      schemas.goalSupportRemoveInputSchema,
      input,
      "goal.support.remove",
      (db, owner, i) => {
        const deleted = db
          .prepare(
            `DELETE FROM goal_milestone_${family}_support WHERE user_id=? AND goal_id=? AND id=?`,
          )
          .run(owner, i.goalId, i.supportId);
        if (!deleted.changes) throw new Error("GOAL_SUPPORT_NOT_FOUND");
        return { id: i.supportId };
      },
    );
  return {
    async getGoalOutcome(
      input: Scope & { goalId: string; dependencyGraph?: TaskDependencyGraph },
    ) {
      try {
        scope(input);
        return {
          ok: true as const,
          data: store.read(context, (db, owner) =>
            readGoalOutcome(
              db,
              owner,
              uuid(input.goalId),
              input.dependencyGraph,
            ),
          ),
        };
      } catch (error) {
        return failure(error);
      }
    },
    async getGoalOutcomeSummaries(
      input: Scope & { goalIds?: readonly string[] },
    ) {
      try {
        scope(input);
        return {
          ok: true as const,
          data: store.read(context, (db, owner) =>
            goalRows(
              db,
              "SELECT id FROM goals WHERE user_id=? AND archived_at IS NULL ORDER BY id",
              owner,
            )
              .filter(
                (r) => !input.goalIds || input.goalIds.includes(String(r.id)),
              )
              .map((r) => readGoalOutcome(db, owner, String(r.id)).summary),
          ),
        };
      } catch (error) {
        return failure(error);
      }
    },
    async executeCommand(input: Scope & GoalCommandRequest) {
      try {
        scope(input);
        return {
          ok: true as const,
          data: store.command(context, `goal.${input.kind}`, (db, owner) =>
            executeGoalCommandInTransaction(db, owner, input),
          ),
        };
      } catch (error) {
        return failure(error);
      }
    },
    async createGoalContextProject(input: unknown) {
      return command(
        contextProjectSchema,
        input,
        "goal.project.context.create",
        (db, owner, i) => {
          const result = execute(
            db,
            owner,
            "project.context.create",
            {
              user_id: owner,
              goal_id: i.goalId,
              milestone_id: i.milestoneId,
              title: i.title,
              description: i.description ?? null,
              status: i.status ?? "idea",
              priority: i.priority ?? "P2",
              next_step: i.nextStep ?? null,
              target_date: i.targetDate ?? null,
              area_id: i.areaId ?? null,
            },
            i.commandId,
          );
          return { id: String(result.project_id) };
        },
      );
    },
    async createGoalContextTask(input: unknown) {
      return command(
        contextTaskSchema,
        input,
        "goal.task.context.create",
        (db, owner, i) => {
          const result = execute(
            db,
            owner,
            "task.context.create",
            {
              user_id: owner,
              goal_id: i.goalId,
              milestone_id: i.milestoneId,
              project_id: i.projectId ?? null,
              title: i.title,
              description: i.description ?? null,
              priority: i.priority ?? "P2",
              energy: i.energy ?? null,
              planned_date: i.plannedDate ?? null,
              due_at: i.dueAt ?? null,
              duration_minutes: i.durationMinutes ?? null,
              area_id: i.areaId ?? null,
            },
            i.commandId,
            { currentTask: true },
          );
          return { id: String(result.task_id) };
        },
      );
    },
    async createGoalMilestone(input: unknown) {
      return command(
        schemas.goalMilestoneCreateInputSchema,
        input,
        "goal.milestone.create",
        (db, owner, i) => {
          activeGoal(db, owner, i.goalId, true);
          const id = randomUUID();
          insertGoalRow(db, "goal_milestones", {
            id,
            user_id: owner,
            goal_id: i.goalId,
            title: i.title,
            description: i.description ?? null,
            target_date: i.targetDate ?? null,
            status: i.status,
            sort_order: i.sortOrder,
          });
          return milestone(db, owner, i.goalId, id);
        },
      );
    },
    async updateGoalMilestone(input: unknown) {
      return command(
        schemas.goalMilestoneUpdateInputSchema,
        input,
        "goal.milestone.update",
        (db, owner, i) => {
          activeGoal(db, owner, i.goalId, true);
          activeGoalMilestone(db, owner, i.goalId, i.milestoneId);
          db.prepare(
            "UPDATE goal_milestones SET title=?,description=?,target_date=? WHERE user_id=? AND goal_id=? AND id=?",
          ).run(
            i.title,
            i.description ?? null,
            i.targetDate ?? null,
            owner,
            i.goalId,
            i.milestoneId,
          );
          return milestone(db, owner, i.goalId, i.milestoneId);
        },
      );
    },
    async setGoalMilestoneStatus(input: unknown) {
      const parsed = schemas.goalMilestoneStatusInputSchema.safeParse(input);
      if (!parsed.success) return failure(new Error("GOAL_INPUT_INVALID"));
      const i = parsed.data;
      // Use the reopen marker for active switches: planned->active writes no
      // history; achieved->active invokes the same canonical reopen command.
      const kind =
        i.status === "achieved" ? "milestone.achieve" : "milestone.reopen";
      return command(
        schemas.goalMilestoneStatusInputSchema,
        input,
        `goal.${kind}`,
        (db, owner, i) => {
          const payload = {
            goal_id: i.goalId,
            milestone_id: i.milestoneId,
            expected_updated_at: i.expectedUpdatedAt ?? null,
            ...(i.status === "achieved" ? { note: i.note ?? null } : {}),
          };
          const prior =
            i.commandId &&
            priorGoalReceipt(
              db,
              owner,
              i.commandId,
              goalCommandFingerprint(kind, payload),
            );
          if (prior) return milestone(db, owner, i.goalId, i.milestoneId);
          activeGoal(db, owner, i.goalId, true);
          const current = activeGoalMilestone(
            db,
            owner,
            i.goalId,
            i.milestoneId,
          );
          if (
            i.expectedUpdatedAt &&
            timestamp(i.expectedUpdatedAt) !== current.updated_at
          )
            throw new Error("GOAL_STALE_STATE");
          if (i.status === "active")
            setGoalCurrentMilestoneInTransaction(
              db,
              owner,
              i.goalId,
              i.milestoneId,
              i.expectedUpdatedAt,
              i.commandId,
              goalCommandFingerprint(kind, payload),
            );
          else if (i.status === "achieved")
            execute(db, owner, kind, payload, i.commandId, { review: true });
          else
            db.prepare(
              "UPDATE goal_milestones SET status=? WHERE user_id=? AND goal_id=? AND id=?",
            ).run(i.status, owner, i.goalId, i.milestoneId);
          return milestone(db, owner, i.goalId, i.milestoneId);
        },
      );
    },
    async archiveGoalMilestone(input: unknown) {
      return command(
        schemas.goalMilestoneArchiveInputSchema,
        input,
        "goal.milestone.archive",
        (db, owner, i) => {
          activeGoal(db, owner, i.goalId, true);
          activeGoalMilestone(db, owner, i.goalId, i.milestoneId);
          db.prepare(
            "UPDATE goal_milestones SET status='archived',archived_at=life_now() WHERE user_id=? AND goal_id=? AND id=?",
          ).run(owner, i.goalId, i.milestoneId);
          return { id: i.milestoneId };
        },
      );
    },
    async reorderGoalMilestone(input: unknown) {
      return command(
        schemas.goalMilestoneReorderInputSchema,
        input,
        "goal.milestone.reorder",
        (db, owner, i) => {
          activeGoal(db, owner, i.goalId, true);
          activeGoalMilestone(db, owner, i.goalId, i.milestoneId);
          const siblings = goalRows(
            db,
            "SELECT id,sort_order FROM goal_milestones WHERE user_id=? AND goal_id=? AND archived_at IS NULL ORDER BY sort_order,id",
            owner,
            i.goalId,
          );
          const index = siblings.findIndex((s) => s.id === i.milestoneId),
            other = siblings[index + (i.direction === "up" ? -1 : 1)];
          if (other) {
            db.prepare(
              "UPDATE goal_milestones SET sort_order=? WHERE user_id=? AND id=?",
            ).run(other.sort_order, owner, i.milestoneId);
            db.prepare(
              "UPDATE goal_milestones SET sort_order=? WHERE user_id=? AND id=?",
            ).run(siblings[index].sort_order, owner, other.id);
          }
          return { id: i.milestoneId };
        },
      );
    },
    async createGoalCriterion(input: unknown) {
      const raw = input as Record<string, unknown>;
      let target: string | null;
      try {
        target =
          raw?.target == null || raw.target === ""
            ? null
            : exactGoalNumber(raw.target as string | number);
      } catch (error) {
        return failure(error);
      }
      return command(
        schemas.goalOutcomeCriterionCreateInputSchema,
        target === null ? input : { ...raw, target: 0 },
        "goal.criterion.create",
        (db, owner, i) => {
          activeGoal(db, owner, i.goalId, true);
          if (i.goalMilestoneId)
            activeGoalMilestone(db, owner, i.goalId, i.goalMilestoneId);
          const id = randomUUID();
          insertGoalRow(db, "goal_outcome_criteria", {
            id,
            user_id: owner,
            goal_id: i.goalId,
            goal_milestone_id: i.goalMilestoneId ?? null,
            title: i.title,
            criterion_type: i.criterionType,
            unit: i.unit ?? null,
            target,
            direction: i.direction ?? null,
          });
          return mapGoalCriterion(
            requireGoalRow(
              goalRow(
                db,
                "SELECT * FROM goal_outcome_criteria WHERE user_id=? AND id=?",
                owner,
                id,
              ),
              "GOAL_CRITERION_NOT_FOUND",
            ),
          );
        },
      );
    },
    async archiveGoalCriterion(input: unknown) {
      return command(
        schemas.goalOutcomeCriterionArchiveInputSchema,
        input,
        "goal.criterion.archive",
        (db, owner, i) => {
          activeGoal(db, owner, i.goalId, true);
          requireGoalRow(
            goalRow(
              db,
              "SELECT id FROM goal_outcome_criteria WHERE user_id=? AND goal_id=? AND id=? AND archived_at IS NULL",
              owner,
              i.goalId,
              i.criterionId,
            ),
            "GOAL_CRITERION_NOT_FOUND",
          );
          db.prepare(
            "UPDATE goal_outcome_criteria SET archived_at=life_now() WHERE user_id=? AND goal_id=? AND id=?",
          ).run(owner, i.goalId, i.criterionId);
          return { id: i.criterionId };
        },
      );
    },
    async appendGoalCriterionEvaluation(input: unknown) {
      return revision(input, "criterion.evaluate");
    },
    async appendGoalCriterionRevision(
      input: unknown,
      kind: "criterion.evaluate" | "criterion.correct" | "criterion.retract",
    ) {
      return revision(input, kind);
    },
    async addGoalCriterionEvidence(input: unknown) {
      return evidence("criterion", input);
    },
    async addGoalMilestoneEvidence(input: unknown) {
      return evidence("milestone", input);
    },
    async addGoalAchievementEvidence(input: unknown) {
      return evidence("goal", input);
    },
    async amendGoalMilestoneAchievementEvent(input: unknown) {
      return command(
        schemas.goalMilestoneAmendInputSchema,
        input,
        "goal.milestone.amend",
        (db, owner, i) => {
          const result = execute(
            db,
            owner,
            "milestone.amend",
            {
              goal_id: i.goalId,
              milestone_id: i.milestoneId,
              event_id: i.eventId,
              occurred_at: i.occurredAt ?? null,
              note: i.note ?? null,
              correction_reason: i.correctionReason,
              retrospective: i.retrospective ?? false,
            },
            i.commandId,
          );
          return { id: String(result.event_id) };
        },
      );
    },
    async amendGoalAchievementEvent(input: unknown) {
      return command(
        schemas.goalAchievementAmendInputSchema,
        input,
        "goal.goal.amend",
        (db, owner, i) => {
          const result = execute(
            db,
            owner,
            "goal.amend",
            {
              goal_id: i.goalId,
              event_id: i.eventId,
              occurred_at: i.occurredAt ?? null,
              achievement_note: i.achievementNote ?? null,
              correction_reason: i.correctionReason,
              retrospective: i.retrospective ?? false,
            },
            i.commandId,
          );
          return { id: String(result.event_id) };
        },
      );
    },
    async addGoalProjectSupport(input: unknown) {
      return addSupport("project", input);
    },
    async addGoalTaskSupport(input: unknown) {
      return addSupport("task", input);
    },
    async removeGoalProjectSupport(input: unknown) {
      return removeSupport("project", input);
    },
    async removeGoalTaskSupport(input: unknown) {
      return removeSupport("task", input);
    },
    async achieveGoal(input: unknown) {
      return command(
        schemas.goalAchieveInputSchema,
        input,
        "goal.goal.achieve",
        (db, owner, i) => {
          execute(
            db,
            owner,
            "goal.achieve",
            {
              goal_id: i.goalId,
              expected_updated_at: i.expectedUpdatedAt ?? null,
              note: i.note ?? null,
              references: (i.references ?? []).map((r) => ({
                source_type: r.sourceType,
                source_id: r.sourceId,
                reason: r.reason ?? null,
              })),
            },
            i.commandId,
          );
          return { id: i.goalId };
        },
      );
    },
    async reopenGoal(input: unknown) {
      return command(
        schemas.goalReopenInputSchema,
        input,
        "goal.goal.reopen",
        (db, owner, i) => {
          execute(
            db,
            owner,
            "goal.reopen",
            {
              goal_id: i.goalId,
              expected_updated_at: i.expectedUpdatedAt ?? null,
            },
            i.commandId,
          );
          return { id: i.goalId };
        },
      );
    },
  };
}
