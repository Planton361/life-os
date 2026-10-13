import { fork } from "node:child_process";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  sourceReviewFixture,
  scope,
  owner,
} from "../../../../tests/sqlite/source-review-fixture";
import { result } from "../../../../tests/sqlite/nutrition-training-fixture";
import { compileRuntime } from "../../../../tests/sqlite/compile-runtime.mjs";
const compiled = compileRuntime([
  "src/features/real-data/sqlite/repositories/task-repository.ts",
]);
type Reply = {
  ready?: boolean;
  entering?: boolean;
  held?: boolean;
  ok?: boolean;
  error?: string;
};
async function worker(path: string) {
  const child = fork(
    "tests/sqlite/inbox-task-release-race-worker.mjs",
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
    const waiter = waiters.shift();
    if (waiter) waiter(r as Reply);
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
for (const releaseFirst of [false, true])
  it(`independent writers: releaseFirst=${releaseFirst}, losing stale form cannot change status or metadata`, async () => {
    const f = sourceReviewFixture();
    try {
      const task = result(
        await f.tasks.createTask({
          ...scope,
          title: "Original metadata",
          status: "inbox",
        }),
      );
      const row = () =>
        f.store.read(f.context, (db) =>
          db
            .prepare("SELECT status,title,updated_at FROM tasks WHERE id=?")
            .get(task.id),
        ) as { status: string; title: string; updated_at: string };
      const old = row(),
        a = await worker(f.path),
        b = await worker(f.path);
      try {
        a.child.send({
          taskId: task.id,
          expectedUpdatedAt: old.updated_at,
          release: releaseFirst,
          hold: true,
        });
        expect(await a.next()).toEqual({ entering: true });
        expect(await a.next()).toEqual({ held: true });
        b.child.send({
          taskId: task.id,
          expectedUpdatedAt: old.updated_at,
          release: !releaseFirst,
        });
        expect(await b.next()).toEqual({ entering: true });
        await new Promise((resolve) => setTimeout(resolve, 80));
        expect(b.pending()).toBe(0);
        a.child.send("commit");
        expect(await Promise.all([a.next(), b.next()])).toEqual([
          { ok: true },
          {
            ok: false,
            error: releaseFirst ? "TASK_STALE" : "TASK_RELEASE_STALE",
          },
        ]);
        await Promise.all([a.exit, b.exit]);
        expect(row()).toMatchObject({
          status: releaseFirst ? "planned" : "inbox",
          title: releaseFirst ? "Original metadata" : "Concurrent metadata",
        });
        expect(row().updated_at).not.toBe(old.updated_at);
      } finally {
        for (const w of [a, b])
          if (w.child.exitCode === null && w.child.signalCode === null)
            w.child.kill("SIGKILL");
        await Promise.all([a.exit, b.exit]);
      }
    } finally {
      f.store.close();
    }
  }, 15_000);
