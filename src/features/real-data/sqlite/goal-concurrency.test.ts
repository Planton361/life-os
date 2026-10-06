import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { compileRuntime } from "../../../../tests/sqlite/compile-runtime.mjs";
import { initializeSyntheticDatabase } from "./synthetic-database";
import { SqliteRuntime } from "./runtime";
import { issueOwnerContext } from "./owner-context";
import { createSqliteGoalOutcomeRepository } from "./repositories/goal-outcome-repository";
import {
  goalCommandFingerprint,
  type GoalCommandRequest,
  type GoalCommandKind,
} from "./commands/goal-commands";
import type { RepositoryResult } from "../repositories/repository-result";
const owner = "11600000-0000-4000-8000-000000000001",
  scope = { userId: owner, profileId: owner };
const compiled = compileRuntime();
type Request = GoalCommandRequest & { current?: boolean };
type Response = {
  ok: boolean;
  error?: string;
  result?: Record<string, string | null>;
};
function data<T>(r: RepositoryResult<T>) {
  if (!r.ok) throw new Error(r.error.message);
  return r.data;
}
async function race(path: string, requests: Request[]): Promise<Response[]> {
  const workers = requests.map(() =>
    fork("tests/sqlite/goal-race-worker.mjs", [compiled, path, owner], {
      stdio: ["ignore", "ignore", "pipe", "ipc"],
    }),
  );
  const timers = workers.map((child) =>
    setTimeout(() => child.kill("SIGKILL"), 12000),
  );
  const results = workers.map(
    (child) =>
      new Promise<Response>((resolve, reject) => {
        child.on("message", (message) => {
          const result = message as Response & { ready?: boolean };
          if (!result.ready) resolve(result);
        });
        child.once("error", reject);
        child.once("exit", (code) => {
          if (code !== 0) reject(new Error(`GOAL_RACE_WORKER_EXIT_${code}`));
        });
      }),
  );
  try {
    await Promise.all(
      workers.map(
        (child) =>
          new Promise<void>((resolve, reject) => {
            child.on("message", (message) => {
              if ((message as { ready?: boolean }).ready) resolve();
            });
            child.once("error", reject);
            child.once("exit", (code) => {
              if (code !== 0) reject(new Error(`START_${code}`));
            });
          }),
      ),
    );
    workers.forEach((child, i) => child.send(requests[i]));
    return await Promise.all(results);
  } finally {
    timers.forEach(clearTimeout);
    for (const child of workers) if (child.connected) child.disconnect();
  }
}
function fixture() {
  const path = join(
    mkdtempSync(join(realpathSync(tmpdir()), "life-os-116-goal-races-")),
    "synthetic.db",
  );
  initializeSyntheticDatabase(path, owner);
  const store = new SqliteRuntime(path, { syntheticProof: true }),
    context = issueOwnerContext(owner),
    goalId = randomUUID();
  store.command(context, "goal.create", (db) =>
    db
      .prepare(
        "INSERT INTO goals(id,user_id,title,status,created_at,updated_at) VALUES(?,?,'Race Goal','active',life_now(),life_now())",
      )
      .run(goalId, owner),
  );
  const repo = createSqliteGoalOutcomeRepository(store, context);
  const request = (
    kind: GoalCommandKind,
    payload: Record<string, unknown>,
    extra = {},
  ): Request => {
    const p = { goal_id: goalId, ...payload };
    return {
      kind,
      payload: p,
      commandId: randomUUID(),
      requestFingerprint: goalCommandFingerprint(kind, p),
      ...extra,
    };
  };
  const run = async (r: Request) =>
    data(await repo.executeCommand({ ...scope, ...r }));
  return { path, store, context, goalId, repo, request, run };
}
it("independent processes switch Current with one canonical final current and explicit stale conflicts", async () => {
  const f = fixture();
  const a = data(
      await f.repo.createGoalMilestone({
        ...scope,
        goalId: f.goalId,
        title: "A",
        status: "planned",
        sortOrder: 0,
      }),
    ),
    b = data(
      await f.repo.createGoalMilestone({
        ...scope,
        goalId: f.goalId,
        title: "B",
        status: "planned",
        sortOrder: 1,
      }),
    );
  f.store.close();
  const results = await race(f.path, [
    f.request(
      "milestone.reopen",
      { milestone_id: a.id, expected_updated_at: a.updatedAt },
      { current: true },
    ),
    f.request(
      "milestone.reopen",
      { milestone_id: b.id, expected_updated_at: b.updatedAt },
      { current: true },
    ),
  ]);
  expect(results.filter((r) => r.ok)).toHaveLength(2);
  const store = new SqliteRuntime(f.path, { syntheticProof: true });
  try {
    const view = data(
      await createSqliteGoalOutcomeRepository(store, f.context).getGoalOutcome({
        ...scope,
        goalId: f.goalId,
      }),
    );
    expect(view.milestones.filter((m) => m.status === "active")).toHaveLength(
      1,
    );
    expect(view.milestoneHistory).toHaveLength(0);
  } finally {
    store.close();
  }
}, 20000);
it("concurrent review/advance creates one event/receipt and activates the correct next planned milestone", async () => {
  const f = fixture(),
    a = data(
      await f.repo.createGoalMilestone({
        ...scope,
        goalId: f.goalId,
        title: "A",
        status: "planned",
        sortOrder: 0,
      }),
    ),
    b = data(
      await f.repo.createGoalMilestone({
        ...scope,
        goalId: f.goalId,
        title: "B",
        status: "planned",
        sortOrder: 1,
      }),
    );
  const current = data(
    await f.repo.setGoalMilestoneStatus({
      ...scope,
      goalId: f.goalId,
      milestoneId: a.id,
      status: "active",
    }),
  );
  f.store.close();
  const results = await race(f.path, [
    f.request(
      "milestone.achieve",
      { milestone_id: a.id, expected_updated_at: current.updatedAt },
      { review: true },
    ),
    f.request(
      "milestone.achieve",
      { milestone_id: a.id, expected_updated_at: current.updatedAt },
      { review: true },
    ),
  ]);
  expect(results.filter((r) => r.ok)).toHaveLength(1);
  expect(results.find((r) => !r.ok)?.error).toBe("GOAL_STALE_STATE");
  expect(results.find((r) => r.ok)?.result?.next_milestone_id).toBe(b.id);
  const store = new SqliteRuntime(f.path, { syntheticProof: true });
  try {
    expect(
      store.read(f.context, (db) =>
        db
          .prepare(
            "SELECT count(*) AS n FROM goal_milestone_achievement_events",
          )
          .get(),
      ),
    ).toEqual({ n: BigInt(1) });
  } finally {
    store.close();
  }
}, 20000);
it("same-ID races return one canonical receipt; correction vs retraction preserves stale expectations", async () => {
  const f = fixture(),
    c = data(
      await f.repo.createGoalCriterion({
        ...scope,
        goalId: f.goalId,
        title: "Boolean",
        criterionType: "boolean",
      }),
    ),
    r = f.request("criterion.evaluate", {
      criterion_id: c.id,
      boolean_value: true,
    });
  f.store.close();
  const same = await race(f.path, [r, r]);
  expect(same.every((r) => r.ok)).toBe(true);
  expect(same[0].result).toEqual(same[1].result);
  const latest = same[0].result!.evaluation_id;
  const corrections = await race(f.path, [
    f.request("criterion.correct", {
      criterion_id: c.id,
      boolean_value: false,
      expected_latest_evaluation_id: latest,
    }),
    f.request("criterion.retract", {
      criterion_id: c.id,
      expected_latest_evaluation_id: latest,
    }),
  ]);
  expect(corrections.filter((r) => r.ok)).toHaveLength(1);
  expect(corrections.find((r) => !r.ok)?.error).toBe("GOAL_STALE_STATE");
  const store = new SqliteRuntime(f.path, { syntheticProof: true });
  try {
    expect(
      store.read(f.context, (db) =>
        db
          .prepare("SELECT count(*) AS n FROM goal_criterion_evaluations")
          .get(),
      ),
    ).toEqual({ n: BigInt(2) });
    expect(
      store.read(f.context, (db) =>
        db.prepare("SELECT count(*) AS n FROM goal_command_receipts").get(),
      ),
    ).toEqual({ n: BigInt(2) });
  } finally {
    store.close();
  }
}, 20000);
it("achieve vs stale reopen cannot silently refresh a revision or rewrite an episode", async () => {
  const f = fixture(),
    c = data(
      await f.repo.createGoalCriterion({
        ...scope,
        goalId: f.goalId,
        title: "Boolean",
        criterionType: "boolean",
      }),
    );
  await f.run(
    f.request("criterion.evaluate", {
      criterion_id: c.id,
      boolean_value: true,
    }),
  );
  const before = data(
    await f.repo.getGoalOutcome({ ...scope, goalId: f.goalId }),
  );
  f.store.close();
  const results = await race(f.path, [
    f.request("goal.achieve", { expected_updated_at: before.updatedAt }),
    f.request("goal.reopen", { expected_updated_at: before.updatedAt }),
  ]);
  expect(results[0].ok).toBe(true);
  expect(results[1].ok).toBe(false);
  expect(["GOAL_REOPEN_REQUIRES_ACHIEVED", "GOAL_STALE_STATE"]).toContain(
    results[1].error,
  );
  const store = new SqliteRuntime(f.path, { syntheticProof: true });
  try {
    const view = data(
      await createSqliteGoalOutcomeRepository(store, f.context).getGoalOutcome({
        ...scope,
        goalId: f.goalId,
      }),
    );
    expect(view.goalStatus).toBe("achieved");
    expect(view.achievementHistory).toHaveLength(1);
    expect(view.achievementHistory[0].criterionBasis).toHaveLength(1);
  } finally {
    store.close();
  }
}, 20000);
