import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  sourceReviewFixture,
  scope,
  owner,
  at,
} from "../../../../tests/sqlite/source-review-fixture";
import { result } from "../../../../tests/sqlite/nutrition-training-fixture";
import { compileRuntime } from "../../../../tests/sqlite/compile-runtime.mjs";
const compiled = compileRuntime();
type Reply = {
  ready?: boolean;
  entering?: boolean;
  held?: boolean;
  ok?: boolean;
  error?: string;
};
async function worker(path: string) {
  const child = fork(
    "tests/sqlite/task-parent-race-worker.mjs",
    [compiled, path, owner],
    { stdio: ["ignore", "ignore", "pipe", "ipc"] },
  );
  const queue: Reply[] = [],
    waiters: ((r: Reply) => void)[] = [];
  let stderr = "";
  child.stderr?.on("data", (c) => {
    stderr += c;
  });
  child.on("message", (r) => {
    const w = waiters.shift();
    if (w) w(r as Reply);
    else queue.push(r as Reply);
  });
  const next = () =>
    queue.length
      ? Promise.resolve(queue.shift()!)
      : new Promise<Reply>((resolve, reject) => {
          waiters.push(resolve);
          child.once("exit", () => {
            if (waiters.includes(resolve))
              reject(new Error(stderr || "Worker exited without response"));
          });
        });
  const exit = new Promise<void>((resolve) =>
    child.once("exit", () => resolve()),
  );
  expect(await next()).toEqual({ ready: true });
  return { child, next, exit, pending: () => queue.length };
}

for (const archiveFirst of [true, false])
  for (const alternative of [false, true]) {
    it(`serializes Parent archive versus ${alternative ? "timestamp UPDATE" : "Completion"}, archiveFirst=${archiveFirst}`, async () => {
      const f = sourceReviewFixture();
      try {
        const task = result(
          await f.tasks.createTask({
            ...scope,
            title: `#151 race ${randomUUID()}`,
            projectId: f.project,
          }),
        );
        const archive = {
          archive: {
            operation: "project.archive",
            commandId: randomUUID(),
            projectId: f.project,
            expectedRevision: "0",
            expectedCycle: "0",
            payload: { reason: "#151 race" },
          },
        };
        const completion = { taskId: task.id, at, alternative };
        const a = await worker(f.path),
          b = await worker(f.path);
        try {
          a.child.send({
            ...(archiveFirst ? archive : completion),
            hold: true,
          });
          expect(await a.next()).toEqual({ entering: true });
          expect(await a.next()).toEqual({ held: true });
          b.child.send(archiveFirst ? completion : archive);
          expect(await b.next()).toEqual({ entering: true });
          await new Promise((resolve) => setTimeout(resolve, 80));
          expect(b.pending()).toBe(0);
          a.child.send("commit");
          expect(await Promise.all([a.next(), b.next()])).toEqual(
            archiveFirst
              ? [{ ok: true }, { ok: false, error: "TASK_PROJECT_ARCHIVED" }]
              : [{ ok: true }, { ok: true }],
          );
          await Promise.all([a.exit, b.exit]);
        } finally {
          for (const w of [a, b])
            if (w.child.exitCode === null && w.child.signalCode === null)
              w.child.kill("SIGKILL");
          await Promise.all([a.exit, b.exit]);
        }
        expect(
          f.store.read(f.context, (db) =>
            db
              .prepare(
                "SELECT status,completed_at FROM tasks WHERE user_id=? AND id=?",
              )
              .get(owner, task.id),
          ),
        ).toEqual({
          status: archiveFirst || alternative ? "planned" : "done",
          completed_at: archiveFirst ? null : at,
        });
        expect(
          f.store.read(f.context, (db) =>
            db
              .prepare("SELECT status FROM projects WHERE user_id=? AND id=?")
              .get(owner, f.project),
          ),
        ).toEqual({ status: "archived" });
      } finally {
        f.store.close();
      }
    }, 15_000);
  }
