import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import ts from "typescript";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { initializeSyntheticDatabase } from "./synthetic-database";
import { issueOwnerContext } from "./owner-context";
import { SqliteRuntime } from "./runtime";
import { createSqliteHabitRepository } from "./repositories/habit-repository";

it("clamps competing Habit increments using the real command in independent processes", async () => {
  const directory = mkdtempSync(join(realpathSync(tmpdir()), "life-os-116-habit-race-"));
  const path = join(directory, "synthetic.db"), owner = "11600000-0000-4000-8000-000000000001";
  initializeSyntheticDatabase(path, owner);
  // Node-only proof workers need CommonJS artifacts. Compile the exact feature
  // source with the existing TypeScript toolchain; the server-only import is a
  // Next build fence and is omitted only in these disposable proof artifacts.
  for (const [source, output] of [["codecs.ts", "codecs.cjs"], ["commands/habit-commands.ts", "habit-command.cjs"]]) {
    const text = readFileSync(join("src/features/real-data/sqlite", source), "utf8").replace('import "server-only";', "").replace('from "../codecs"', 'from "./codecs.cjs"');
    writeFileSync(join(directory, output), ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { mode: 0o600 });
  }
  const context = issueOwnerContext(owner), store = new SqliteRuntime(path, { syntheticProof: true });
  const created = await createSqliteHabitRepository(store, context).createHabit(owner, owner, { name: "Concurrent synthetic habit", unit: null, dailyTarget: 0.3, defaultIncrement: 0.2, window: "Morning", sortOrder: 1 });
  if (!created.ok) throw new Error(created.error.message);
  const workers = Array.from({ length: 3 }, () => {
    const child = spawn(process.execPath, ["tests/sqlite/habit-writer.mjs", path, owner, created.data.id], { stdio: ["pipe", "pipe", "pipe"] });
    let output = "", errors = "";
    const ready = new Promise<void>((resolve, reject) => {
      child.on("error", reject);
      child.stdout.on("data", chunk => { output += chunk.toString(); if (output.includes("READY")) resolve(); });
      child.stderr.on("data", chunk => { errors += chunk.toString(); });
      child.on("exit", () => { if (!output.includes("READY")) reject(new Error(errors)); });
    });
    const done = new Promise<string>((resolve, reject) => {
      child.on("error", reject);
      child.on("exit", code => code === 0 ? resolve(output) : reject(new Error(errors)));
    });
    return { child, ready, done };
  });
  try {
    await Promise.all(workers.map(worker => worker.ready));
    for (const worker of workers) worker.child.stdin.end("GO\n");
    const outputs = await Promise.all(workers.map(worker => worker.done));
    expect(outputs.filter(text => text.includes("\nincremented\n"))).toHaveLength(2);
    expect(outputs.filter(text => text.includes("already_at_target"))).toHaveLength(1);
    expect(store.read(context, db => db.prepare("SELECT value FROM habit_logs WHERE user_id=? AND habit_id=? ORDER BY value").all(owner, created.data.id))).toEqual([{ value: "0.1" }, { value: "0.2" }]);
  } finally { for (const worker of workers) if (worker.child.exitCode === null) worker.child.kill("SIGKILL"); store.close(); }
}, 15_000);

it("serializes opposing dependency insertions from independent processes", async () => {
  const path = join(mkdtempSync(join(realpathSync(tmpdir()), "life-os-116-race-")), "synthetic.db");
  const owner = "11600000-0000-4000-8000-000000000001";
  initializeSyntheticDatabase(path, owner);
  const store = new SqliteRuntime(path, { syntheticProof: true });
  const context = issueOwnerContext(owner);
  const project = randomUUID(), a = randomUUID(), b = randomUUID();
  store.command(context, "task.create", (db, owner) => {
    db.prepare("INSERT INTO projects(id,user_id,title,status,created_at,updated_at) VALUES(?,?,'Race','active',?,?)").run(project, owner, "2026-10-06T10:00:00.000000Z", "2026-10-06T10:00:00.000000Z");
    for (const id of [a, b]) db.prepare("INSERT INTO tasks(id,user_id,project_id,title,created_at,updated_at) VALUES(?,?,?,'Race Task',?,?)").run(id, owner, project, "2026-10-06T10:00:00.000000Z", "2026-10-06T10:00:00.000000Z");
  });
  const workers = [[a, b], [b, a]].map(([pre, post]) => {
    const child = spawn(process.execPath, ["tests/sqlite/concurrent-writer.mjs", path, owner, project, pre, post, randomUUID()], { stdio: ["pipe", "pipe", "pipe"] });
    let output = "", errors = "";
    const ready = new Promise<void>((resolve, reject) => {
      child.on("error", reject);
      child.stdout.on("data", (chunk) => { output += chunk.toString(); if (output.includes("READY")) resolve(); });
      child.stderr.on("data", (chunk) => { errors += chunk.toString(); });
      child.on("exit", () => { if (!output.includes("READY")) reject(new Error(errors)); });
    });
    const done = new Promise<string>((resolve, reject) => {
      child.on("error", reject);
      child.on("exit", (code) => code === 0 ? resolve(output) : reject(new Error(errors)));
    });
    return { child, ready, done };
  });
  try {
    await Promise.all(workers.map((worker) => worker.ready));
    for (const worker of workers) worker.child.stdin.end("GO\n");
    const results = await Promise.all(workers.map((worker) => worker.done));
    expect(results.filter((output) => output.includes("COMMITTED"))).toHaveLength(1);
    expect(results.filter((output) => output.includes("REJECTED:DEPENDENCY_CYCLE"))).toHaveLength(1);
    expect(store.read(context, (db, owner) => db.prepare("SELECT count(*) AS count FROM task_dependencies WHERE user_id=?").get(owner))).toEqual({ count: BigInt(1) });
  } finally { for (const worker of workers) if (worker.child.exitCode === null) worker.child.kill("SIGKILL"); store.close(); }
}, 15_000);
