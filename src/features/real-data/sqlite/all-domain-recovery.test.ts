import { join } from "node:path";
import { expect, it, vi } from "vitest";
import { populatedAllDomainFixture } from "../../../../tests/sqlite/all-domain-fixture";
import { wishlistInput } from "../../../../tests/sqlite/retained-fixture";
import {
  at,
  owner,
  scope,
} from "../../../../tests/sqlite/source-review-fixture";
import { canonicalTableNames } from "./canonical-catalog";
import { inspectSyntheticDatabase, restoreSyntheticBackup } from "./recovery";
import { createSqliteCanonicalBaseRepository } from "./repositories/canonical-base-repository";
import { createSqliteGoalOutcomeRepository } from "./repositories/goal-outcome-repository";
import { createSqliteHealthRepository } from "./repositories/health-repository";
import { createSqliteNutritionRepository } from "./repositories/nutrition-repository";
import { readSqliteProjectDepth } from "./repositories/project-depth-repository";
import { createSqliteRetainedRepository } from "./repositories/retained-repository";
import { createSqliteReviewRepository } from "./repositories/review-repository";
import { readSqliteSkillDevelopment } from "./repositories/skill-development-repository";
import { createSqliteTrainingRepository } from "./repositories/training-repository";
import { SqliteRuntime } from "./runtime";
vi.mock("server-only", () => ({}));

it("round-trips one populated all-domain backend fixture through clean restart, online backup and isolated restore", async () => {
  const f = await populatedAllDomainFixture();
  const ids = f.ids;
  f.store.close();
  const before = inspectSyntheticDatabase(f.path);
  expect(canonicalTableNames.filter((t) => !(t in before.counts))).toEqual([]);
  expect(canonicalTableNames).toHaveLength(83);
  for (const table of [
    "journal_entries",
    "coding_sessions",
    "education_logs",
    "work_logs",
    "work_decisions",
    "work_meetings",
    "work_meeting_followups",
    "entertainment_items",
    "wishlist_items",
    "inventory_items",
    "purchase_decisions",
    "anti_rot_actions",
    "anti_rot_events",
    "challenges",
    "challenge_progress_logs",
    "reward_ledger_entries",
    "shop_items",
    "shop_redemptions",
    "goal_command_receipts",
    "goal_achievement_events",
    "goal_milestone_achievement_events",
    "project_command_receipts",
    "project_reviews",
    "skill_command_receipts",
    "skill_evidence_revisions",
    "skill_development_review_evidence",
    "review_task_decisions",
    "habit_logs",
    "sleep_entries",
    "weight_entries",
    "mood_entries",
  ])
    expect(before.counts[table]).toBeGreaterThan(0);
  async function projection(store: SqliteRuntime) {
    const r = createSqliteRetainedRepository(store, f.context);
    const links = store.read(f.context, (db) =>
      db
        .prepare(
          "SELECT l.*,t.status,t.completed_at FROM schedule_source_links l JOIN tasks t ON t.id=l.task_id AND t.user_id=l.user_id WHERE l.user_id=? ORDER BY l.id",
        )
        .all(owner),
    );
    expect(links).toHaveLength(4);
    expect(links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source_type: "meal" }),
        expect.objectContaining({ source_type: "review" }),
        expect.objectContaining({ source_type: "running_plan_item" }),
        expect.objectContaining({ source_type: "strength_plan" }),
      ]),
    );
    for (const link of links)
      expect(link).toMatchObject({
        status: "done",
        completed_at: expect.any(String),
      });
    const reward = r.rewardWorkspace(owner);
    expect(reward.balance).toBe(BigInt(3));
    expect(reward.ledger).toHaveLength(2);
    expect(reward.redemptions).toEqual([
      expect.objectContaining({
        id: ids.redemption,
        title_snapshot: "Break",
        cost_coins: BigInt(7),
      }),
    ]);
    expect(
      r.read(owner, "inventory").find((i) => i.id === ids.inventory),
    ).toMatchObject({
      id: ids.inventory,
      acquisition_value: wishlistInput.amount,
    });
    const reviews = createSqliteReviewRepository(store, f.context);
    const decisions = await reviews.getTaskDecisions(owner, ids.review);
    expect(decisions).toMatchObject({
      ok: true,
      data: [
        expect.objectContaining({
          taskId: ids.carry,
          targetDate: "2026-10-07",
        }),
      ],
    });
    const snapshots = store.read(f.context, (db) =>
      db
        .prepare(
          "SELECT original_planned_date,original_scheduled_start_at,planning_snapshot_captured FROM review_task_decisions WHERE user_id=? AND task_id=?",
        )
        .all(owner, ids.carry),
    );
    expect(snapshots).toEqual([
      {
        original_planned_date: "2026-10-06",
        original_scheduled_start_at: at,
        planning_snapshot_captured: BigInt(1),
      },
    ]);
    const base = createSqliteCanonicalBaseRepository(store, f.context);
    return {
      projectDepth: (() => {
        const p = readSqliteProjectDepth(store, f.context, f.project);
        return {
          ...p,
          context: { ...p.context, work_observed_at: "read-clock" },
        };
      })(),
      canonical: {
        profile: base.profile(owner),
        areas: base.read(owner, "areas"),
        daily: base.read(owner, "daily_logs"),
        dayTasks: base.read(owner, "daily_log_tasks"),
        milestones: base.read(owner, "project_milestones"),
        dependencies: base.dependencies(owner),
      },
      reward,
      links,
      decisions,
      snapshots,
      journal: r.read(owner, "journal"),
      entertainment: r.read(owner, "entertainment"),
      inventory: r.read(owner, "inventory"),
      coding: r.workspace(owner, "coding"),
      education: r.workspace(owner, "education"),
      work: r.workspace(owner, "work"),
      life: r.workspace(owner, "life"),
      health: await createSqliteHealthRepository(store, f.context).getSnapshot(
        owner,
        owner,
      ),
      nutrition: await createSqliteNutritionRepository(
        store,
        f.context,
      ).getRecipesByUser(owner, owner),
      training: await createSqliteTrainingRepository(
        store,
        f.context,
      ).getSnapshot(owner),
      skill: {
        ...readSqliteSkillDevelopment(store, f.context, f.skill),
        as_of: "read-clock",
      },
      goal: await createSqliteGoalOutcomeRepository(
        store,
        f.context,
      ).getGoalOutcome({ ...scope, goalId: f.goal }),
    };
  }
  const restarted = new SqliteRuntime(f.path, { syntheticProof: true });
  try {
    const original = await projection(restarted);
    expect(inspectSyntheticDatabase(f.path)).toEqual(before);
    const backup = join(f.directory, "all-domain-online.db"),
      restored = join(f.directory, "all-domain-restored.db");
    await restarted.backup(backup);
    expect(inspectSyntheticDatabase(backup)).toEqual(before);
    expect(await restoreSyntheticBackup(backup, restored)).toEqual(before);
    const candidate = new SqliteRuntime(restored, { syntheticProof: true });
    try {
      expect(await projection(candidate)).toEqual(original);
    } finally {
      candidate.close();
    }
  } finally {
    restarted.close();
  }
});
