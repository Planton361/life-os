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
  skillDevelopmentCommand,
  readSqliteSkillDevelopment,
} from "./repositories/skill-development-repository";
import { compileRuntime } from "../../../../tests/sqlite/compile-runtime.mjs";
const compiled = compileRuntime(),
  owner = "11600000-0000-4000-8000-000000000001";
type Reply = {
  ready?: boolean;
  held?: boolean;
  ok?: boolean;
  error?: string;
  result?: Record<string, unknown>;
};
async function worker(path: string) {
  const child = fork(
    "tests/sqlite/skill-race-worker.mjs",
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
  return { child, next, exit, pendingReplies: () => queue.length };
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
    expect(b.pendingReplies()).toBe(0);
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
function setup() {
  const path = join(
    mkdtempSync(join(realpathSync(tmpdir()), "life-os-116-skill-race-")),
    "synthetic.db",
  );
  initializeSyntheticDatabase(path, owner);
  let store = new SqliteRuntime(path, { syntheticProof: true });
  const context = issueOwnerContext(owner);
  const created = skillDevelopmentCommand(store, context, {
      operation: "skill.create",
      commandId: randomUUID(),
      skillId: null,
      expectedRevision: null,
      payload: { name: "Race" },
    }) as Record<string, string>,
    sid = created.skill_id;
  const read = () => readSqliteSkillDevelopment(store, context, sid)!;
  const input = (operation: string, payload: unknown) => ({
    operation,
    payload,
    commandId: randomUUID(),
    skillId: sid,
    expectedRevision: read().skill.development_revision,
  });
  const command = (op: string, p: unknown) =>
    skillDevelopmentCommand(store, context, input(op, p)) as Record<
      string,
      string
    >;
  return {
    path,
    context,
    sid,
    read,
    input,
    command,
    close: () => store.close(),
    open: () => {
      store = new SqliteRuntime(path, { syntheticProof: true });
    },
    get store() {
      return store;
    },
  };
}
it("independent processes: same-key create produces one exact result and changed request conflicts", async () => {
  const f = setup();
  try {
    const c = {
      operation: "skill.create",
      commandId: randomUUID(),
      skillId: null,
      expectedRevision: null,
      payload: { name: "Same key" },
    };
    f.close();
    const [a, b] = await heldRace(f.path, { command: c }, { command: c });
    expect(a.ok).toBe(true);
    expect(b.result).toEqual(a.result);
    f.open();
    expect(
      f.store.read(f.context, (db) =>
        db.prepare("SELECT count(*) AS n FROM skills").get(),
      ),
    ).toEqual({ n: BigInt(2) });
    f.close();
    const [retry, conflict] = await heldRace(
      f.path,
      { command: c },
      { command: { ...c, payload: { name: "Changed" } } },
    );
    expect(retry.result).toEqual(a.result);
    expect(conflict.error).toBe("SKILL_COMMAND_KEY_CONFLICT");
  } finally {
    f.close();
  }
}, 15000);
it("independent processes: current target competitors leave one current and stale loser", async () => {
  const f = setup();
  try {
    const a = f.command("target.create", { title: "A" }).target_id,
      b = f.command("target.create", { title: "B" }).target_id,
      ca = f.input("target.current", { target_id: a }),
      cb = f.input("target.current", { target_id: b });
    f.close();
    const [x, y] = await heldRace(f.path, { command: ca }, { command: cb });
    expect(x.ok).toBe(true);
    expect(y.error).toBe("SKILL_STALE");
    f.open();
    expect(
      f
        .read()
        .targets.filter((t) => t.status === "current")
        .map((t) => t.id),
    ).toEqual([a]);
    expect(f.read().skill.development_revision).toBe("3");
  } finally {
    f.close();
  }
}, 15000);
it("independent processes: correction vs Review rejects stale Review without partial rows or receipt", async () => {
  const f = setup();
  try {
    const t = f.command("target.create", { title: "A" }).target_id,
      e = f.command("evidence.create", {
        title: "Before",
        evidence_date: "2026-09-01",
        source_type: "manual_note",
        source_id: null,
      }).evidence_id,
      c = f.input("evidence.correct", {
        evidence_id: e,
        title: "After",
        evidence_date: "2026-09-01",
        source_type: "manual_note",
        source_id: null,
        reason: "Correction",
      }),
      r = f.input("review.submit", {
        target_id: t,
        decision: "completed",
        note: "Race",
        open_milestones_acknowledged: true,
        evidence: [{ id: e, revision: 1 }],
      });
    f.close();
    const [a, b] = await heldRace(f.path, { command: c }, { command: r });
    expect(a.ok).toBe(true);
    expect(b.error).toBe("SKILL_STALE");
    f.open();
    expect(f.read().reviews).toHaveLength(0);
    expect(f.read().review_evidence).toHaveLength(0);
    expect(f.read().evidence[0]).toMatchObject({ title: "After", revision: 2 });
    expect(
      f.store.read(f.context, (db) =>
        db
          .prepare(
            "SELECT count(*) AS n FROM skill_command_receipts WHERE command_id=?",
          )
          .get(r.commandId),
      ),
    ).toEqual({ n: BigInt(0) });
  } finally {
    f.close();
  }
}, 15000);
it("independent processes: Target archive vs edit retains archive and rejects lost save", async () => {
  const f = setup();
  try {
    const t = f.command("target.create", { title: "Original" }).target_id,
      a = f.input("target.archive", { target_id: t }),
      b = f.input("target.edit", { target_id: t, title: "Lost save" });
    f.close();
    const [x, y] = await heldRace(f.path, { command: a }, { command: b });
    expect(x.ok).toBe(true);
    expect(y.error).toBe("SKILL_STALE");
    f.open();
    expect(f.read().targets[0].title).toBe("Original");
    expect(f.read().targets[0].archived_at).not.toBeNull();
  } finally {
    f.close();
  }
}, 15000);
for (const kind of ["edit", "archive"])
  for (const first of ["skill", "area"])
    it(`independent processes: Area ${kind} vs Skill validation, ${first} holds transaction`, async () => {
      const f = setup();
      try {
        const area = randomUUID(),
          now = "2026-10-06T10:00:00.000000Z";
        f.store.command(f.context, "area.create", (db) =>
          db
            .prepare(
              "INSERT INTO areas(id,user_id,key,name,created_at,updated_at) VALUES(?,?,'coding','Original Area',?,?)",
            )
            .run(area, owner, now, now),
        );
        const c = f.input("skill.edit", {
            name: "Validated Skill",
            area_id: area,
          }),
          mutation = { kind, id: area };
        f.close();
        const [a, b] = await heldRace(
          f.path,
          first === "skill" ? { command: c } : { mutation },
          first === "skill" ? { mutation } : { command: c },
        );
        expect(a.ok).toBe(true);
        expect(b.ok).toBe(
          first === "area" && kind === "archive" ? false : true,
        );
        if (!b.ok) expect(b.error).toBe("SKILL_AREA_UNAVAILABLE");
        f.open();
        const skill = f.read().skill;
        expect(skill.name).toBe(
          first === "area" && kind === "archive" ? "Race" : "Validated Skill",
        );
        expect(skill.development_revision).toBe(
          first === "area" && kind === "archive" ? "0" : "1",
        );
        const actual = f.store.read(f.context, (db) =>
          db.prepare("SELECT name,archived_at FROM areas WHERE id=?").get(area),
        ) as { name: string; archived_at: string | null };
        if (kind === "archive") expect(actual.archived_at).not.toBeNull();
        else expect(actual.name).toBe("Edited Area");
      } finally {
        f.close();
      }
    }, 15000);
