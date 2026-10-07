import { randomUUID, createHash } from "node:crypto";
import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { inspectSyntheticDatabase, restoreSyntheticBackup } from "../recovery";
import { initializeSyntheticDatabase } from "../synthetic-database";
import { SqliteRuntime, configureConnection, schemaVersion } from "../runtime";
import { issueOwnerContext, type OwnerContext } from "../owner-context";
import { projectDepthCommand, readSqliteProjectDepth } from "./project-depth-repository";
import { goalOwnedTables } from "../goal-schema";
import {
  goalCommandFingerprint,
  type GoalCommandKind,
} from "../commands/goal-commands";
import { createSqliteGoalOutcomeRepository } from "./goal-outcome-repository";
import type { RepositoryResult } from "../../repositories/repository-result";
import {
  currentGoalAchievementEvent,
  currentGoalMilestoneAchievementEvent,
} from "../../domain/goal-outcome";
const owner = "11600000-0000-4000-8000-000000000001";
const scope = { userId: owner, profileId: owner };
const now = "2026-10-06T10:00:00.000000Z";
function data<T>(result: RepositoryResult<T>): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}
function fixture() {
  const path = join(
    mkdtempSync(join(realpathSync(tmpdir()), "life-os-116-goal-")),
    "synthetic.db",
  );
  initializeSyntheticDatabase(path, owner);
  const store = new SqliteRuntime(path, { syntheticProof: true }),
    context = issueOwnerContext(owner),
    goalId = randomUUID();
  store.command(context, "goal.create", (db) =>
    db
      .prepare(
        "INSERT INTO goals(id,user_id,title,status,created_at,updated_at) VALUES(?,?,'Synthetic Goal','active',?,?)",
      )
      .run(goalId, owner, now, now),
  );
  const repo = createSqliteGoalOutcomeRepository(store, context);
  const milestone = async (title: string, sortOrder = 0) =>
    data(
      await repo.createGoalMilestone({
        ...scope,
        goalId,
        title,
        sortOrder,
        status: "planned",
      }),
    );
  const criterion = async (extra: Record<string, unknown> = {}) =>
    data(
      await repo.createGoalCriterion({
        ...scope,
        goalId,
        title: "Criterion",
        criterionType: "boolean",
        ...extra,
      }),
    );
  const command = async (
    kind: GoalCommandKind,
    payload: Record<string, unknown>,
    commandId = randomUUID(),
    requestFingerprint = goalCommandFingerprint(kind, {
      goal_id: goalId,
      ...payload,
    }),
    options = {},
  ) =>
    data(
      await repo.executeCommand({
        ...scope,
        kind,
        commandId,
        requestFingerprint,
        payload: { goal_id: goalId, ...payload },
        ...options,
      }),
    );
  const outcome = async () =>
    data(await repo.getGoalOutcome({ ...scope, goalId }));
  return {
    store,
    context,
    path,
    goalId,
    repo,
    milestone,
    criterion,
    command,
    outcome,
  };
}

describe("native Goal Outcome / Journey / History / Receipts", () => {
  it("installs all thirteen canonical Goal tables and keeps activation fail closed", () => {
    const f = fixture();
    try {
      const tables = f.store.read(f.context, (db) =>
        db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all(),
      ) as { name: string }[];
      for (const name of goalOwnedTables)
        expect(tables.some((t) => t.name === name)).toBe(true);
      expect(
        f.store.read(f.context, (db) =>
          db
            .prepare(
              "SELECT schema_version,compatibility_ready FROM runtime_metadata",
            )
            .get(),
        ),
      ).toEqual({ schema_version: BigInt(schemaVersion), compatibility_ready: BigInt(0) });
    } finally {
      f.store.close();
    }
  });
  it("retains Boolean/exact Numeric shapes, units, directions, latest revision, deferred and retracted semantics", async () => {
    const f = fixture();
    try {
      expect(
        (
          await f.repo.createGoalCriterion({
            ...scope,
            goalId: f.goalId,
            title: "Bad",
            criterionType: "boolean",
            target: 1,
          })
        ).ok,
      ).toBe(false);
      expect(
        (
          await f.repo.createGoalCriterion({
            ...scope,
            goalId: f.goalId,
            title: "Bad",
            criterionType: "numeric",
            unit: "kg",
            target: "Infinity",
            direction: "exact",
          })
        ).ok,
      ).toBe(false);
      const b = await f.criterion();
      const e = data(
        await f.repo.appendGoalCriterionEvaluation({
          ...scope,
          goalId: f.goalId,
          criterionId: b.id,
          criterionType: "boolean",
          booleanValue: true,
        }),
      );
      expect((await f.outcome()).summary.metCriteriaCount).toBe(1);
      expect(
        (
          await f.repo.appendGoalCriterionRevision(
            {
              ...scope,
              goalId: f.goalId,
              criterionId: b.id,
              criterionType: "boolean",
              booleanValue: false,
              expectedLatestEvaluationId: randomUUID(),
            },
            "criterion.correct",
          )
        ).ok,
      ).toBe(false);
      const corrected = data(
        await f.repo.appendGoalCriterionRevision(
          {
            ...scope,
            goalId: f.goalId,
            criterionId: b.id,
            criterionType: "boolean",
            booleanValue: false,
            expectedLatestEvaluationId: e.id,
            correctionReason: "Correction",
          },
          "criterion.correct",
        ),
      );
      expect(corrected.supersedesEvaluationId).toBe(e.id);
      const deferred = await f.command("criterion.evaluate", {
        criterion_id: b.id,
        deferred: true,
        expected_latest_evaluation_id: corrected.id,
      });
      const retracted = await f.command("criterion.retract", {
        criterion_id: b.id,
        expected_latest_evaluation_id: deferred.evaluation_id,
        correction_reason: "Retract",
      });
      expect((await f.outcome()).criteria[0].latestEvaluation?.id).toBe(
        retracted.evaluation_id,
      );
      expect((await f.outcome()).summary.metCriteriaCount).toBe(0);
      for (const direction of ["at_least", "at_most", "exact"]) {
        const target = "9007199254740993.000000000000000001";
        const c = await f.criterion({
          criterionType: "numeric",
          target,
          unit: "units",
          direction,
        });
        expect(c.target).toBe(null);
        expect(c.targetExact).toBe(target);
        expect(
          (
            await f.repo.appendGoalCriterionEvaluation({
              ...scope,
              goalId: f.goalId,
              criterionId: c.id,
              criterionType: "numeric",
              numericValue: target,
              unit: "other",
            })
          ).ok,
        ).toBe(false);
        data(
          await f.repo.appendGoalCriterionEvaluation({
            ...scope,
            goalId: f.goalId,
            criterionId: c.id,
            criterionType: "numeric",
            numericValue: target,
            unit: "units",
          }),
        );
      }
      expect((await f.outcome()).summary.metCriteriaCount).toBe(3);
      const exact = (await f.outcome()).criteria.find(
        (c) => c.direction === "exact",
      )!;
      await f.command("criterion.evaluate", {
        criterion_id: exact.id,
        numeric_value: "9007199254740993.000000000000000002",
        unit: "units",
        expected_latest_evaluation_id: exact.latestEvaluation!.id,
      });
      expect((await f.outcome()).summary.metCriteriaCount).toBe(2);
      const scientific = await f.criterion({
        criterionType: "numeric",
        target: "1.5e-7",
        unit: "s",
        direction: "exact",
      });
      expect(scientific.targetExact).toBe("0.00000015");
      data(
        await f.repo.appendGoalCriterionEvaluation({
          ...scope,
          goalId: f.goalId,
          criterionId: scientific.id,
          criterionType: "numeric",
          numericValue: ".000000150",
          unit: "s",
        }),
      );
      const archive = await f.criterion();
      data(
        await f.repo.archiveGoalCriterion({
          ...scope,
          goalId: f.goalId,
          criterionId: archive.id,
        }),
      );
      await expect(
        f.command("criterion.evaluate", {
          criterion_id: archive.id,
          boolean_value: true,
        }),
      ).rejects.toThrow("GOAL_CRITERION_NOT_FOUND");
    } finally {
      f.store.close();
    }
  });
  it("switches Current atomically, reviews only Current and advances by full Journey order without Task dependency", async () => {
    const f = fixture();
    try {
      const first = await f.milestone("First", 0),
        later = await f.milestone("Later", 2),
        middle = await f.milestone("Middle", 1);
      data(
        await f.repo.setGoalMilestoneStatus({
          ...scope,
          goalId: f.goalId,
          milestoneId: later.id,
          status: "active",
          expectedUpdatedAt: later.updatedAt,
        }),
      );
      expect(
        (await f.outcome()).milestones.find((m) => m.id === later.id)?.status,
      ).toBe("active");
      const cmd = randomUUID(),
        current = (await f.outcome()).milestones.find(
          (m) => m.id === later.id,
        )!;
      const input = {
        ...scope,
        goalId: f.goalId,
        milestoneId: later.id,
        status: "achieved",
        expectedUpdatedAt: current.updatedAt,
        commandId: cmd,
        note: "Explicit review",
      };
      data(await f.repo.setGoalMilestoneStatus(input));
      data(await f.repo.setGoalMilestoneStatus(input));
      const view = await f.outcome();
      expect(view.milestoneHistory).toHaveLength(1);
      expect(view.milestones.find((m) => m.id === first.id)?.status).toBe(
        "active",
      );
      expect(view.goalStatus).toBe("active");
      expect(
        f.store.read(f.context, (db) =>
          db
            .prepare(
              "SELECT result_payload FROM goal_command_receipts WHERE command_id=? AND user_id=?",
            )
            .get(cmd, owner),
        ),
      ).toMatchObject({ result_payload: expect.stringContaining(first.id) });
      expect(
        (
          await f.repo.setGoalMilestoneStatus({
            ...scope,
            goalId: f.goalId,
            milestoneId: middle.id,
            status: "achieved",
          })
        ).ok,
      ).toBe(false);
      expect(
        (
          await f.repo.setGoalMilestoneStatus({
            ...scope,
            goalId: f.goalId,
            milestoneId: later.id,
            status: "active",
            expectedUpdatedAt: current.updatedAt,
          })
        ).ok,
      ).toBe(false);
      data(
        await f.repo.setGoalMilestoneStatus({
          ...scope,
          goalId: f.goalId,
          milestoneId: later.id,
          status: "active",
          commandId: randomUUID(),
        }),
      );
      expect(
        (await f.outcome()).milestones
          .filter((m) => m.status === "active")
          .map((m) => m.id),
      ).toEqual([later.id]);
      data(
        await f.repo.reorderGoalMilestone({
          ...scope,
          goalId: f.goalId,
          milestoneId: later.id,
          direction: "up",
        }),
      );
      data(
        await f.repo.updateGoalMilestone({
          ...scope,
          goalId: f.goalId,
          milestoneId: middle.id,
          title: "Edited",
        }),
      );
      data(
        await f.repo.archiveGoalMilestone({
          ...scope,
          goalId: f.goalId,
          milestoneId: middle.id,
        }),
      );
      expect(
        (await f.outcome()).milestones.find((m) => m.id === middle.id)?.status,
      ).toBe("archived");
    } finally {
      f.store.close();
    }
  });
  it("requires explicit Goal achievement, preserves exact immutable basis and closed episodes across reopen/amend", async () => {
    const f = fixture();
    try {
      await expect(f.command("goal.achieve", {})).rejects.toThrow(
        "GOAL_ACHIEVEMENT_NO_ACTIVE_CRITERIA",
      );
      const c = await f.criterion(),
        m = await f.milestone("Step");
      await expect(f.command("goal.achieve", {})).rejects.toThrow(
        "GOAL_ACHIEVEMENT_CRITERIA_NOT_MET",
      );
      await f.command("criterion.evaluate", {
        criterion_id: c.id,
        boolean_value: true,
      });
      await expect(f.command("goal.achieve", {})).rejects.toThrow(
        "GOAL_ACHIEVEMENT_MILESTONES_NOT_ACHIEVED",
      );
      data(
        await f.repo.setGoalMilestoneStatus({
          ...scope,
          goalId: f.goalId,
          milestoneId: m.id,
          status: "active",
        }),
      );
      const me = await f.command(
        "milestone.achieve",
        { milestone_id: m.id },
        randomUUID(),
        undefined,
        { review: true },
      );
      const a = await f.command("goal.achieve", { note: "A" });
      const original = JSON.stringify(
        (await f.outcome()).achievementHistory[0].criterionBasis,
      );
      expect(
        (
          await f.repo.appendGoalCriterionEvaluation({
            ...scope,
            goalId: f.goalId,
            criterionId: c.id,
            criterionType: "boolean",
            booleanValue: false,
          })
        ).ok,
      ).toBe(false);
      await f.command("goal.reopen", {});
      await f.command("goal.amend", {
        event_id: a.event_id,
        correction_reason: "Old episode",
        achievement_note: "Corrected A",
      });
      await f.command("milestone.amend", {
        milestone_id: m.id,
        event_id: me.event_id,
        correction_reason: "Bounded history",
        note: "Fixed",
      });
      const b = await f.command("goal.achieve", { note: "B" });
      await f.command("goal.amend", {
        event_id: a.event_id,
        correction_reason: "Late old correction",
        occurred_at: "2099-01-01T00:00:00Z",
      });
      const view = await f.outcome();
      expect(
        currentGoalAchievementEvent(view.achievementHistory, view.goalStatus)
          ?.episodeId,
      ).toBe(b.episode_id);
      expect(
        JSON.stringify(
          view.achievementHistory.find((e) => e.id === a.event_id)
            ?.criterionBasis,
        ),
      ).toBe(original);
      expect(
        view.achievementHistory.find((e) => e.id === a.event_id)
          ?.milestoneBasis[0].achievementEpisodeId,
      ).toBe(me.episode_id);
      expect(view.goalStatus).toBe("achieved");
      expect(
        f.store.read(f.context, (db) =>
          db
            .prepare(
              "SELECT count(*) AS n FROM goal_achievement_criterion_basis",
            )
            .get(),
        ),
      ).toEqual({ n: BigInt(2) });
    } finally {
      f.store.close();
    }
  });
  it("appends replacement/withdrawal/supplement evidence for all three ledgers and preserves bounded source snapshots", async () => {
    const f = fixture();
    try {
      const p1 = randomUUID(),
        p2 = randomUUID();
      f.store.command(f.context, "project.create", (db) => {
        for (const [id, title] of [
          [p1, "Source A"],
          [p2, "Source B"],
        ])
          db.prepare(
            "INSERT INTO projects(id,user_id,goal_id,title,status,created_at,updated_at) VALUES(?,?,?,?,'active',?,?)",
          ).run(id, owner, f.goalId, title, now, now);
      });
      const c = await f.criterion(),
        ev = await f.command("criterion.evaluate", {
          criterion_id: c.id,
          boolean_value: true,
        });
      const m = await f.milestone("Step");
      data(
        await f.repo.setGoalMilestoneStatus({
          ...scope,
          goalId: f.goalId,
          milestoneId: m.id,
          status: "active",
        }),
      );
      const me = await f.command("milestone.achieve", { milestone_id: m.id });
      const ge = await f.command("goal.achieve", {});
      for (const family of ["criterion", "milestone", "goal"] as const) {
        const key =
          family === "criterion"
            ? { evaluation_id: ev.evaluation_id }
            : {
                achievement_event_id:
                  family === "milestone" ? me.event_id : ge.event_id,
                ...(family === "milestone" ? { milestone_id: m.id } : {}),
              };
        const table =
          family === "criterion"
            ? "goal_criterion_evaluation_evidence"
            : family === "milestone"
              ? "goal_milestone_achievement_evidence"
              : "goal_achievement_evidence";
        await f.command(`${family}.evidence`, {
          ...key,
          references: [{ source_type: "project", source_id: p1 }],
        });
        const old = f.store.read(f.context, (db) =>
          db
            .prepare(
              `SELECT id FROM ${table} WHERE user_id=? AND reference_action='attached'`,
            )
            .get(owner),
        ) as { id: string };
        await f.command(`${family}.evidence`, {
          ...key,
          action: "replaced",
          references: [
            {
              source_type: "project",
              source_id: p2,
              supersedes_reference_id: old.id,
              reason: "Better source",
            },
          ],
        });
        const replacement = f.store.read(f.context, (db) =>
          db
            .prepare(
              `SELECT id FROM ${table} WHERE user_id=? AND reference_action='replaced'`,
            )
            .get(owner),
        ) as { id: string };
        await expect(
          f.command(`${family}.evidence`, {
            ...key,
            action: "withdrawn",
            references: [
              { supersedes_reference_id: old.id, reason: "Already superseded" },
            ],
          }),
        ).rejects.toThrow("GOAL_EVIDENCE_REFERENCE_ALREADY_SUPERSEDED");
        await f.command(`${family}.evidence`, {
          ...key,
          action: "withdrawn",
          references: [
            { supersedes_reference_id: replacement.id, reason: "Withdraw" },
          ],
        });
        await f.command(`${family}.evidence`, {
          ...key,
          action: "supplemented",
          retrospective: true,
          references: [
            { source_type: "project", source_id: p1, reason: "Later evidence" },
          ],
        });
      }
      const view = await f.outcome();
      expect(view.criteria[0].latestEvaluation?.evidence).toHaveLength(1);
      expect(view.criteria[0].latestEvaluation?.evidenceHistory).toHaveLength(
        4,
      );
      expect(
        currentGoalMilestoneAchievementEvent(
          m.id,
          "achieved",
          view.milestoneHistory,
        )?.evidence,
      ).toHaveLength(1);
      expect(
        currentGoalAchievementEvent(view.achievementHistory, view.goalStatus)
          ?.evidence,
      ).toHaveLength(1);
    } finally {
      f.store.close();
    }
  });
  it("returns canonical receipts before payload/state validation, rejects fingerprint reuse and forged/foreign owner paths", async () => {
    const f = fixture();
    try {
      const c = await f.criterion(),
        id = randomUUID(),
        payload = {
          goal_id: f.goalId,
          criterion_id: c.id,
          boolean_value: true,
        };
      expect(goalCommandFingerprint("criterion.evaluate", payload)).toBe(
        createHash("sha256")
          .update(
            JSON.stringify({ commandKind: "criterion.evaluate", payload }),
          )
          .digest("hex"),
      );
      const a = await f.command(
        "criterion.evaluate",
        { criterion_id: c.id, boolean_value: true },
        id,
        "legacy-opaque-fingerprint",
      );
      const replay = data(
        await f.repo.executeCommand({
          ...scope,
          kind: "criterion.evaluate",
          commandId: id.toUpperCase(),
          requestFingerprint: "legacy-opaque-fingerprint",
          payload: {},
        }),
      );
      expect(replay).toEqual(a);
      expect(
        (
          await f.repo.executeCommand({
            ...scope,
            kind: "criterion.evaluate",
            commandId: id,
            requestFingerprint: "changed",
            payload,
          })
        ).ok,
      ).toBe(false);
      const other = randomUUID();
      expect(
        (
          await f.repo.getGoalOutcome({
            userId: other,
            profileId: other,
            goalId: f.goalId,
          })
        ).ok,
      ).toBe(false);
      const foreign = createSqliteGoalOutcomeRepository(
        f.store,
        issueOwnerContext(other),
      );
      expect(
        (
          await foreign.getGoalOutcome({
            userId: other,
            profileId: other,
            goalId: f.goalId,
          })
        ).ok,
      ).toBe(false);
      expect(() => f.store.read({} as OwnerContext, () => 1)).toThrow(
        "OWNER_CONTEXT_REQUIRED",
      );
      await expect(
        f.command("criterion.evaluate", {
          criterion_id: randomUUID(),
          boolean_value: true,
        }),
      ).rejects.toThrow("GOAL_CRITERION_NOT_FOUND");
      const raw = new Database(f.path);
      configureConnection(raw);
      try {
        raw.function("life_owner", () => null);
        raw.function("life_command", () => null);
        expect(() =>
          raw
            .prepare(
              "UPDATE goal_outcome_criteria SET title='bypass' WHERE id=?",
            )
            .run(c.id),
        ).toThrow();
        expect(() =>
          raw
            .prepare("DELETE FROM goal_command_receipts WHERE command_id=?")
            .run(id),
        ).toThrow();
        expect(() =>
          raw
            .prepare(
              "UPDATE goal_criterion_evaluations SET boolean_value=0 WHERE id=?",
            )
            .run(a.evaluation_id),
        ).toThrow();
      } finally {
        raw.close();
      }
      expect(() =>
        f.store.command(f.context, "goal.criterion.evaluate", (db) =>
          db
            .prepare(
              "INSERT INTO goal_criterion_evaluations(user_id,criterion_id,boolean_value) VALUES(?,?,1)",
            )
            .run(owner, c.id),
        ),
      ).toThrow("GOAL_EVALUATION_SNAPSHOT_INVALID");
      expect(
        f.store.read(f.context, (db) =>
          db
            .prepare("SELECT count(*) AS n FROM goal_criterion_evaluations")
            .get(),
        ),
      ).toEqual({ n: BigInt(1) });
    } finally {
      f.store.close();
    }
  });
  it("creates atomic support context, enforces same Goal/owner/cardinality and persists stable IDs through restart", async () => {
    const f = fixture();
    const m = await f.milestone("Context");
    try {
      data(
        await f.repo.setGoalMilestoneStatus({
          ...scope,
          goalId: f.goalId,
          milestoneId: m.id,
          status: "active",
        }),
      );
      const project = await f.command("project.context.create", {
        milestone_id: m.id,
        title: "Context Project",
      });
      const task = await f.command(
        "task.context.create",
        {
          milestone_id: m.id,
          project_id: project.project_id,
          title: "Context Task",
        },
        randomUUID(),
        undefined,
        { currentTask: true },
      );
      expect((await f.outcome()).projectSupport).toHaveLength(1);
      expect((await f.outcome()).taskSupport).toHaveLength(1);
      data(
        await f.repo.removeGoalProjectSupport({
          ...scope,
          goalId: f.goalId,
          supportId: project.support_id,
        }),
      );
      data(
        await f.repo.addGoalProjectSupport({
          ...scope,
          goalId: f.goalId,
          goalMilestoneId: m.id,
          projectId: project.project_id,
        }),
      );
      data(
        await f.repo.removeGoalTaskSupport({
          ...scope,
          goalId: f.goalId,
          supportId: task.support_id,
        }),
      );
      data(
        await f.repo.addGoalTaskSupport({
          ...scope,
          goalId: f.goalId,
          goalMilestoneId: m.id,
          taskId: task.task_id,
        }),
      );
      const second = await f.milestone("Other");
      expect(
        (
          await f.repo.addGoalTaskSupport({
            ...scope,
            goalId: f.goalId,
            goalMilestoneId: second.id,
            taskId: task.task_id,
          })
        ).ok,
      ).toBe(false);
      await expect(
        f.command(
          "task.context.create",
          { milestone_id: second.id, title: "Wrong current" },
          randomUUID(),
          undefined,
          { currentTask: true },
        ),
      ).rejects.toThrow("GOAL_TASK_REQUIRES_CURRENT_MILESTONE");
      const snapshot = JSON.stringify(await f.outcome());
      f.store.close();
      const restarted = new SqliteRuntime(f.path, { syntheticProof: true });
      try {
        expect(
          JSON.stringify(
            data(
              await createSqliteGoalOutcomeRepository(
                restarted,
                f.context,
              ).getGoalOutcome({ ...scope, goalId: f.goalId }),
            ),
          ),
        ).toBe(snapshot);
        expect(
          restarted.read(f.context, (db) => db.pragma("foreign_key_check")),
        ).toEqual([]);
        expect(
          restarted.read(f.context, (db) => db.pragma("integrity_check")),
        ).toEqual([{ integrity_check: "ok" }]);
      } finally {
        restarted.close();
      }
    } finally {
      f.store.close();
    }
  });
  it("preserves synthetic legacy bounded facts and reopens original episodes without invented identity", async () => {
    const f = fixture();
    try {
      const milestoneId = randomUUID(),
        goalEpisode = randomUUID(),
        milestoneEpisode = randomUUID(),
        goalEvent = randomUUID(),
        milestoneEvent = randomUUID();
      f.store.command(f.context, "synthetic.initialize", (db) => {
        db.prepare(
          "UPDATE goals SET status='achieved',achieved_at=?,achievement_note='Legacy bounded note' WHERE user_id=? AND id=?",
        ).run(now, owner, f.goalId);
        db.prepare(
          "INSERT INTO goal_milestones(id,user_id,goal_id,title,status) VALUES(?,?,?,'Current title','achieved')",
        ).run(milestoneId, owner, f.goalId);
        db.prepare(
          "INSERT INTO goal_achievement_events(id,user_id,goal_id,episode_id,event_type,occurred_at,resulting_status,legacy_state) VALUES(?,?,?,?,'achieved',?,'achieved',?)",
        ).run(
          goalEvent,
          owner,
          f.goalId,
          goalEpisode,
          now,
          JSON.stringify({ legacy_state: true }),
        );
        db.prepare(
          "INSERT INTO goal_milestone_achievement_events(id,user_id,goal_id,goal_milestone_id,episode_id,event_type,resulting_status,legacy_state) VALUES(?,?,?,?,?,'achieved','achieved',?)",
        ).run(
          milestoneEvent,
          owner,
          f.goalId,
          milestoneId,
          milestoneEpisode,
          JSON.stringify({ legacy_state: true }),
        );
      });
      const mr = await f.command("milestone.reopen", {
        milestone_id: milestoneId,
      });
      expect(mr.episode_id).toBe(milestoneEpisode);
      const gr = await f.command("goal.reopen", {});
      expect(gr.episode_id).toBe(goalEpisode);
      const view = await f.outcome();
      expect(
        view.achievementHistory.find((e) => e.id === goalEvent),
      ).toMatchObject({
        occurredAt: now,
        goalTitleSnapshot: null,
        legacyState: { legacy_state: true },
        retrospective: false,
      });
      expect(
        view.milestoneHistory.find((e) => e.id === milestoneEvent),
      ).toMatchObject({
        occurredAt: null,
        milestoneTitleSnapshot: null,
        milestoneDescriptionSnapshot: null,
        retrospective: false,
      });
      expect(
        view.achievementHistory.find((e) => e.id === gr.event_id)
          ?.goalTitleSnapshot,
      ).toBe(null);
      expect(
        view.milestoneHistory.find((e) => e.id === mr.event_id)
          ?.milestoneTitleSnapshot,
      ).toBe(null);
    } finally {
      f.store.close();
    }
  });
  it("denies native history mutation/deletion, forged aggregates and cross-owner evidence/support/receipts", async () => {
    const f = fixture();
    try {
      const c = await f.criterion(),
        m = await f.milestone("Immutable");
      const ev = await f.command("criterion.evaluate", {
        criterion_id: c.id,
        boolean_value: true,
      });
      data(
        await f.repo.setGoalMilestoneStatus({
          ...scope,
          goalId: f.goalId,
          milestoneId: m.id,
          status: "active",
        }),
      );
      const me = await f.command("milestone.achieve", { milestone_id: m.id }),
        ge = await f.command("goal.achieve", {});
      const source = randomUUID();
      f.store.command(f.context, "project.create", (db) =>
        db
          .prepare(
            "INSERT INTO projects(id,user_id,title,created_at,updated_at) VALUES(?,?,'Bounded source',?,?)",
          )
          .run(source, owner, now, now),
      );
      for (const [kind, parent] of [
        ["criterion.evidence", { evaluation_id: ev.evaluation_id }],
        [
          "milestone.evidence",
          { milestone_id: m.id, achievement_event_id: me.event_id },
        ],
        ["goal.evidence", { achievement_event_id: ge.event_id }],
      ] as const)
        await f.command(kind, {
          ...parent,
          references: [{ source_type: "project", source_id: source }],
        });
      const histories = [
        "goal_criterion_evaluations",
        "goal_milestone_achievement_events",
        "goal_achievement_events",
        "goal_achievement_criterion_basis",
        "goal_achievement_milestone_basis",
        "goal_criterion_evaluation_evidence",
        "goal_milestone_achievement_evidence",
        "goal_achievement_evidence",
        "goal_command_receipts",
      ];
      for (const table of histories) {
        expect(() =>
          f.store.command(f.context, "goal.goal.amend", (db) =>
            db.prepare(`UPDATE ${table} SET user_id=user_id`).run(),
          ),
        ).toThrow("GOAL_HISTORY_IMMUTABLE");
        expect(() =>
          f.store.command(f.context, "goal.goal.amend", (db) =>
            db.prepare(`DELETE FROM ${table}`).run(),
          ),
        ).toThrow("GOAL_HISTORY_IMMUTABLE");
      }
      const other = randomUUID(),
        foreign = createSqliteGoalOutcomeRepository(
          f.store,
          issueOwnerContext(other),
        );
      for (const kind of [
        "goal.achieve",
        "goal.reopen",
        "goal.amend",
        "milestone.achieve",
        "milestone.reopen",
        "milestone.amend",
        "criterion.evaluate",
        "criterion.correct",
        "criterion.retract",
        "criterion.evidence",
        "milestone.evidence",
        "goal.evidence",
        "project.context.create",
        "task.context.create",
      ] as const)
        expect(
          (
            await foreign.executeCommand({
              userId: other,
              profileId: other,
              kind,
              commandId: randomUUID(),
              requestFingerprint: "foreign",
              payload: {
                goal_id: f.goalId,
                milestone_id: m.id,
                criterion_id: c.id,
                event_id: ge.event_id,
                evaluation_id: ev.evaluation_id,
              },
            })
          ).ok,
        ).toBe(false);
      expect(
        (
          await f.repo.addGoalProjectSupport({
            userId: other,
            profileId: other,
            goalId: f.goalId,
            goalMilestoneId: m.id,
            projectId: source,
          })
        ).ok,
      ).toBe(false);
      await f.command("goal.reopen", {});
      expect(() =>
        f.store.command(f.context, "goal.goal.achieve", (db) =>
          db
            .prepare(
              "UPDATE goals SET status='achieved' WHERE user_id=? AND id=?",
            )
            .run(owner, f.goalId),
        ),
      ).toThrow("GOAL_HISTORY_REQUIRED");
      expect(() =>
        f.store.command(f.context, "goal.goal.achieve", (db) =>
          db
            .prepare(
              "INSERT INTO goal_achievement_criterion_basis(user_id,achievement_event_id,criterion_id) VALUES(?,?,?)",
            )
            .run(owner, ge.event_id, randomUUID()),
        ),
      ).toThrow("GOAL_BASIS_IMMUTABLE");
      const ref = f.store.read(f.context, (db) =>
        db
          .prepare(
            "SELECT id FROM goal_achievement_evidence WHERE user_id=? AND achievement_event_id=?",
          )
          .get(owner, ge.event_id),
      ) as { id: string };
      const project = readSqliteProjectDepth(f.store, f.context, String(source)).context;
      projectDepthCommand(f.store, f.context, {projectId:source,commandId:randomUUID(),operation:"project.archive",expectedRevision:project.completion_revision,expectedCycle:project.completion_cycle,payload:{}});
      await f.command("goal.evidence", {
        achievement_event_id: ge.event_id,
        action: "withdrawn",
        references: [
          {
            supersedes_reference_id: ref.id,
            reason: "Withdraw archived source",
          },
        ],
      });
      expect(
        (await f.outcome()).achievementHistory.find((e) => e.id === ge.event_id)
          ?.evidence,
      ).toHaveLength(0);
    } finally {
      f.store.close();
    }
  });
  it("validates public context/achievement/reopen/evidence/amend methods and normalized retries", async () => {
    const f = fixture();
    try {
      const m = await f.milestone("Public commands"),
        c = await f.criterion();
      const current = data(
        await f.repo.setGoalMilestoneStatus({
          ...scope,
          goalId: f.goalId,
          milestoneId: m.id,
          status: "active",
        }),
      );
      expect(
        data(
          await f.repo.setGoalMilestoneStatus({
            ...scope,
            goalId: f.goalId,
            milestoneId: m.id,
            status: "active",
            expectedUpdatedAt: current.updatedAt,
          }),
        ).updatedAt,
      ).toBe(current.updatedAt);
      const projectInput = {
        ...scope,
        goalId: f.goalId,
        milestoneId: m.id,
        title: "Public project",
        commandId: randomUUID(),
      };
      const project = data(await f.repo.createGoalContextProject(projectInput));
      expect(data(await f.repo.createGoalContextProject(projectInput))).toEqual(
        project,
      );
      const task = data(
        await f.repo.createGoalContextTask({
          ...scope,
          goalId: f.goalId,
          milestoneId: m.id,
          projectId: project.id,
          title: "Public task",
          plannedDate: "2026-10-08",
          durationMinutes: 20,
          commandId: randomUUID(),
        }),
      );
      expect((await f.outcome()).taskSupport[0].targetId).toBe(task.id);
      expect(
        (
          await f.repo.addGoalProjectSupport({
            ...scope,
            goalId: f.goalId,
            goalMilestoneId: m.id,
            projectId: project.id,
          })
        ).ok,
      ).toBe(false);
      const evaluation = data(
        await f.repo.appendGoalCriterionEvaluation({
          ...scope,
          goalId: f.goalId,
          criterionId: c.id,
          criterionType: "boolean",
          booleanValue: true,
        }),
      );
      data(
        await f.repo.addGoalCriterionEvidence({
          ...scope,
          goalId: f.goalId,
          evaluationId: evaluation.id,
          references: [{ sourceType: "task", sourceId: task.id }],
        }),
      );
      data(
        await f.repo.setGoalMilestoneStatus({
          ...scope,
          goalId: f.goalId,
          milestoneId: m.id,
          status: "achieved",
          expectedUpdatedAt: current.updatedAt,
        }),
      );
      const milestoneEvent = (await f.outcome()).milestoneHistory[0];
      data(
        await f.repo.addGoalMilestoneEvidence({
          ...scope,
          goalId: f.goalId,
          milestoneId: m.id,
          references: [
            {
              sourceType: "goal_criterion_evaluation",
              sourceId: evaluation.id,
            },
          ],
        }),
      );
      const amend = data(
        await f.repo.amendGoalMilestoneAchievementEvent({
          ...scope,
          goalId: f.goalId,
          milestoneId: m.id,
          eventId: milestoneEvent.id,
          correctionReason: "Amended",
          note: "Bounded",
        }),
      );
      expect(
        (await f.outcome()).milestoneHistory.find((e) => e.id === amend.id)
          ?.evidence,
      ).toHaveLength(1);
      const achieve = {
        ...scope,
        goalId: f.goalId,
        commandId: randomUUID(),
        note: "Accepted",
        references: [{ sourceType: "project", sourceId: project.id }],
      };
      data(await f.repo.achieveGoal(achieve));
      data(await f.repo.achieveGoal(achieve));
      const event = (await f.outcome()).achievementHistory[0];
      const correction = data(
        await f.repo.amendGoalAchievementEvent({
          ...scope,
          goalId: f.goalId,
          eventId: event.id,
          correctionReason: "Correct note",
          achievementNote: "Corrected",
        }),
      );
      data(
        await f.repo.addGoalAchievementEvidence({
          ...scope,
          goalId: f.goalId,
          achievementEventId: correction.id,
          action: "supplemented",
          retrospective: true,
          references: [
            { sourceType: "task", sourceId: task.id, reason: "Later source" },
          ],
        }),
      );
      expect(
        currentGoalAchievementEvent(
          (await f.outcome()).achievementHistory,
          "achieved",
        )?.evidence,
      ).toHaveLength(2);
      expect(
        data(await f.repo.getGoalOutcomeSummaries({ ...scope, goalIds: [] })),
      ).toEqual([]);
      const reopen = {
        ...scope,
        goalId: f.goalId,
        commandId: randomUUID(),
        expectedUpdatedAt: (await f.outcome()).updatedAt,
      };
      data(await f.repo.reopenGoal(reopen));
      data(await f.repo.reopenGoal(reopen));
      expect((await f.outcome()).goalStatus).toBe("active");
    } finally {
      f.store.close();
    }
  });
  it("round-trips populated Goal histories, receipts, IDs and native projection through online backup/restore", async () => {
    const f = fixture();
    try {
      const c = await f.criterion(),
        m = await f.milestone("Backup milestone");
      await f.command("criterion.evaluate", {
        criterion_id: c.id,
        boolean_value: true,
      });
      data(
        await f.repo.setGoalMilestoneStatus({
          ...scope,
          goalId: f.goalId,
          milestoneId: m.id,
          status: "active",
        }),
      );
      await f.command("milestone.achieve", { milestone_id: m.id });
      const event = await f.command("goal.achieve", {});
      await f.command("goal.amend", {
        event_id: event.event_id,
        correction_reason: "Backup amendment",
      });
      await f.command("goal.reopen", {});
      const before = inspectSyntheticDatabase(f.path),
        projection = await f.outcome();
      const backup = f.path.replace("synthetic.db", "online-copy.db"),
        restored = f.path.replace("synthetic.db", "isolated-restored.db");
      await f.store.backup(backup);
      expect(await restoreSyntheticBackup(backup, restored)).toEqual(before);
      const store = new SqliteRuntime(restored, { syntheticProof: true });
      try {
        expect(
          data(
            await createSqliteGoalOutcomeRepository(
              store,
              f.context,
            ).getGoalOutcome({ ...scope, goalId: f.goalId }),
          ),
        ).toEqual(projection);
      } finally {
        store.close();
      }
      expect(before.counts.goal_command_receipts).toBe(5);
      expect(before.counts.goal_achievement_events).toBe(3);
    } finally {
      f.store.close();
    }
  });
});
