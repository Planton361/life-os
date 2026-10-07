import { fork, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { initializeSyntheticDatabase } from "./synthetic-database";
import { SqliteRuntime } from "./runtime";
import { issueOwnerContext } from "./owner-context";
import {
  projectDepthCommand,
  readSqliteProjectDepth,
} from "./repositories/project-depth-repository";
import { compileRuntime } from "../../../../tests/sqlite/compile-runtime.mjs";
const compiled = compileRuntime(),
  owner = "11600000-0000-4000-8000-000000000001",
  now = "2026-10-06T00:00:00.000000Z";
type Reply = {
  ready?: boolean;
  held?: boolean;
  ok?: boolean;
  error?: string;
  result?: Record<string, unknown>;
};
async function worker(path: string) {
  const child = fork(
    "tests/sqlite/project-race-worker.mjs",
    [compiled, path, owner],
    { stdio: ["ignore", "ignore", "pipe", "ipc"] },
  );
  let stderr = "";
  child.stderr?.on("data", (c) => (stderr += String(c)));
  const queue: Reply[] = [],
    waiters: ((reply: Reply) => void)[] = [];
  let exited = false;
  child.on("message", (message) => {
    const r = message as Reply;
    const waiter = waiters.shift();
    if (waiter) waiter(r);
    else queue.push(r);
  });
  const next = () =>
    queue.length
      ? Promise.resolve(queue.shift()!)
      : new Promise<Reply>((resolve, reject) => {
          if (exited) reject(new Error(stderr));
          else {
            waiters.push(resolve);
            child.once("exit", () => {
              if (waiters.includes(resolve)) reject(new Error(stderr));
            });
          }
        });
  const exit = new Promise<void>((resolve) =>
    child.once("exit", () => {
      exited = true;
      resolve();
    }),
  );
  expect(await next()).toEqual({ ready: true });
  return { child, next, exit };
}
function setup() {
  const path = join(
    mkdtempSync(join(realpathSync(tmpdir()), "life-os-116-project-race-")),
    "synthetic.db",
  );
  initializeSyntheticDatabase(path, owner);
  const context = issueOwnerContext(owner),
    id = randomUUID();
  let store = new SqliteRuntime(path, { syntheticProof: true });
  store.command(context, "project.create", (db) =>
    db
      .prepare(
        "INSERT INTO projects(id,user_id,title,status,created_at,updated_at) VALUES(?,?,'Race','active',?,?)",
      )
      .run(id, owner, now, now),
  );
  const read = () => readSqliteProjectDepth(store, context, id);
  const input = (
    operation: string,
    payload: unknown,
    commandId: string = randomUUID(),
  ) => ({
    projectId: id,
    commandId,
    operation,
    expectedRevision: read().context.completion_revision,
    expectedCycle: read().context.completion_cycle,
    payload,
  });
  const command = (operation: string, payload: unknown) =>
    projectDepthCommand(store, context, input(operation, payload));
  command("result.set", { desired_result: "Race result" });
  const criterion = String(
    command("criterion.create", { text: "Satisfied", sort_order: "0" })
      .criterion_id,
  );
  const review = (decision = "completed") => ({
    fingerprint: read().context.fingerprint,
    decision,
    result_accepted: decision === "completed",
    rationale: "Concurrent acceptance",
    criteria: [{ id: criterion, assessment: "satisfied" }],
    archived_ids: [],
    archived_criteria_acknowledged: false,
    evidence: [],
    open_work_acknowledged: false,
  });
  const close = () => store.close(),
    open = () => {
      store = new SqliteRuntime(path, { syntheticProof: true });
    };
  const state = () =>
    store.read(context, (db) => ({
      p: db
        .prepare(
          "SELECT status,completion_revision,completion_cycle FROM projects WHERE id=?",
        )
        .get(id),
      reviews: db
        .prepare(
          "SELECT id,decision,completion_cycle FROM project_reviews WHERE project_id=?",
        )
        .all(id),
      criteria: db
        .prepare(
          "SELECT review_id FROM project_review_criteria WHERE project_id=?",
        )
        .all(id),
      resources: db
        .prepare(
          "SELECT review_id FROM project_review_resources WHERE project_id=?",
        )
        .all(id),
      events: db
        .prepare(
          "SELECT event_kind,cycle_before,cycle_after FROM project_lifecycle_events WHERE project_id=?",
        )
        .all(id),
      receipts: db
        .prepare(
          "SELECT command_id FROM project_command_receipts WHERE project_id=?",
        )
        .all(id),
    })) as {
      p: {
        status: string;
        completion_revision: bigint;
        completion_cycle: bigint;
      };
      reviews: unknown[];
      criteria: unknown[];
      resources: unknown[];
      events: unknown[];
      receipts: unknown[];
    };
  return {
    path,
    context,
    id,
    input,
    command,
    review,
    read,
    close,
    open,
    state,
    get store() {
      return store;
    },
  };
}
async function heldRace(
  path: string,
  first: Record<string, unknown>,
  second: Record<string, unknown>,
) {
  const a = await worker(path),
    b = await worker(path);
  const children: ChildProcess[] = [a.child, b.child];
  try {
    a.child.send({ ...first, hold: true });
    expect((await a.next()).held).toBe(true);
    b.child.send(second);
    // The second connection must remain blocked while the first holds BEGIN IMMEDIATE.
    await new Promise((resolve) => setTimeout(resolve, 80));
    a.child.send("commit");
    const responses = await Promise.all([a.next(), b.next()]);
    await Promise.all([a.exit, b.exit]);
    return responses;
  } finally {
    for (const c of children)
      if (c.exitCode === null && c.signalCode === null) c.kill("SIGKILL");
    await Promise.all([a.exit, b.exit]);
  }
}
it("independent processes: concurrent same-key Review produces one exact effect/result; changed canonical identity conflicts", async () => {
  const f = setup();
  try {
    const req = f.input("review.submit", f.review("continue"));
    f.close();
    const [a, b] = await heldRace(f.path, { command: req }, { command: req });
    expect(a.ok).toBe(true);
    expect(b).toEqual(a);
    f.open();
    expect(f.state().reviews).toHaveLength(1);
    expect(f.state().receipts).toHaveLength(3);
    expect(() =>
      projectDepthCommand(f.store, f.context, {
        ...req,
        payload: { ...(req.payload as object), rationale: "Changed" },
      }),
    ).toThrow("PROJECT_COMMAND_KEY_CONFLICT");
  } finally {
    f.close();
  }
}, 15000);
it("independent processes: competing completion and concurrent Reopen yield one Review/cycle/event and stale losers", async () => {
  const f = setup();
  try {
    const a = f.input("review.submit", f.review()),
      b = { ...a, commandId: randomUUID() };
    f.close();
    const replies = await heldRace(f.path, { command: a }, { command: b });
    expect(replies[0].ok).toBe(true);
    expect(replies[1]).toMatchObject({ ok: false, error: "PROJECT_STALE" });
    f.open();
    expect(f.state().reviews).toHaveLength(1);
    expect(f.state().p.status).toBe("completed");
    const reopen = f.input("project.reopen", {});
    f.close();
    const rr = await heldRace(
      f.path,
      { command: reopen },
      { command: { ...reopen, commandId: randomUUID() } },
    );
    expect(rr[0].ok).toBe(true);
    expect(rr[1]).toMatchObject({ ok: false, error: "PROJECT_STALE" });
    f.open();
    expect(f.state().events).toHaveLength(1);
    expect(f.state().p.completion_cycle).toBe(BigInt(1));
    expect(f.state().p.status).toBe("active");
    expect(f.state().reviews).toHaveLength(1);
  } finally {
    f.close();
  }
}, 15000);
for (const kind of ["edit", "unlink", "archive"])
  it(`independent processes: Resource ${kind} vs Review fails without Review/snapshots/success receipt`, async () => {
    const f = setup();
    try {
      const id = randomUUID(),
        relation = randomUUID();
      f.store.command(f.context, "resource.create", (db) => {
        db.prepare(
          "INSERT INTO resources(id,user_id,title,type,url,created_at,updated_at) VALUES(?,?,'Before edit','link','https://example.test/proof',?,?)",
        ).run(id, owner, now, now);
        db.prepare(
          "INSERT INTO resource_relations(id,user_id,resource_id,target_type,target_id,created_at) VALUES(?,?,?,'project',?,?)",
        ).run(relation, owner, id, f.id, now);
      });
      const ctx = f.read().context,
        req = f.input("review.submit", {
          ...f.review("continue"),
          evidence: [
            {
              relation_id: relation,
              criterion_id: null,
              token: ctx.resources[0].token,
            },
          ],
        });
      const before = f.state();
      f.close();
      const responses = await heldRace(
        f.path,
        { mutation: { kind, id: kind === "unlink" ? relation : id } },
        { command: req },
      );
      expect(responses[0].ok).toBe(true);
      expect(responses[1].ok).toBe(false);
      expect(responses[1].error).toMatch(
        /PROJECT_STALE_RESOURCE|PROJECT_RESOURCE_UNAVAILABLE/,
      );
      f.open();
      expect(f.state()).toEqual(before);
    } finally {
      f.close();
    }
  }, 15000);
it("independent processes: Completion vs Reopen serializes by supplied revision, preserving one valid completed state", async () => {
  const f = setup();
  try {
    const complete = f.input("review.submit", f.review()),
      reopen = f.input("project.reopen", {});
    f.close();
    const replies = await heldRace(
      f.path,
      { command: complete },
      { command: reopen },
    );
    expect(replies[0].ok).toBe(true);
    expect(replies[1]).toMatchObject({ ok: false, error: "PROJECT_STALE" });
    f.open();
    expect(f.state().p).toMatchObject({
      status: "completed",
      completion_cycle: BigInt(0),
      completion_revision: BigInt(3),
    });
    expect(f.state().reviews).toHaveLength(1);
    expect(f.state().events).toHaveLength(0);
  } finally {
    f.close();
  }
}, 15000);
it("independent processes: Archive vs Review ends archived with no fabricated Review or snapshots", async () => {
  const f = setup();
  try {
    const archive = f.input("project.archive", {}),
      review = f.input("review.submit", f.review());
    f.close();
    const replies = await heldRace(
      f.path,
      { command: archive },
      { command: review },
    );
    expect(replies[0].ok).toBe(true);
    expect(replies[1]).toMatchObject({ ok: false, error: "PROJECT_STALE" });
    f.open();
    expect(f.state().p.status).toBe("archived");
    expect(f.state().reviews).toHaveLength(0);
    expect(f.state().criteria).toHaveLength(0);
    expect(f.state().resources).toHaveLength(0);
    expect(f.state().events).toHaveLength(1);
    expect(f.state().receipts).toHaveLength(3);
  } finally {
    f.close();
  }
}, 15000);
it("independent processes: same key with a changed request conflicts while original transaction is held", async () => {
  const f = setup();
  try {
    const req = f.input("review.submit", f.review("continue"));
    f.close();
    const [a, b] = await heldRace(
      f.path,
      { command: req },
      {
        command: {
          ...req,
          payload: { ...(req.payload as object), rationale: "Changed request" },
        },
      },
    );
    expect(a.ok).toBe(true);
    expect(b).toMatchObject({
      ok: false,
      error: "PROJECT_COMMAND_KEY_CONFLICT",
    });
    f.open();
    expect(f.state().reviews).toHaveLength(1);
    expect(f.state().receipts).toHaveLength(3);
  } finally {
    f.close();
  }
}, 15000);
