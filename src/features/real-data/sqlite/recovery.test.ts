import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { initializeSyntheticDatabase } from "./synthetic-database";
import { issueOwnerContext } from "./owner-context";
import { SqliteRuntime } from "./runtime";
import { inspectSyntheticDatabase, restoreSyntheticBackup } from "./recovery";

it("survives SIGKILL mid-transaction and verifies online backup / isolated restore", async () => {
  const directory = mkdtempSync(join(realpathSync(tmpdir()), "life-os-116-recovery-"));
  const path = join(directory, "synthetic.db"), backup = join(directory, "backup.db"), restore = join(directory, "restored.db");
  const owner = "11600000-0000-4000-8000-000000000001";
  initializeSyntheticDatabase(path, owner);
  const committed = randomUUID(), uncommitted = randomUUID();
  const child = spawn(process.execPath, ["tests/sqlite/crash-writer.mjs", path, owner, committed, uncommitted], { stdio: ["pipe", "pipe", "pipe"] });
  let output = "", errors = "";
  const exited = new Promise<void>((resolve, reject) => { child.on("error", reject); child.on("exit", () => resolve()); });
  try {
    await new Promise<void>((resolve, reject) => {
      child.on("error", reject);
      child.stdout.on("data", (chunk) => { output += chunk.toString(); if (output.includes("UNCOMMITTED")) resolve(); });
      child.stderr.on("data", (chunk) => { errors += chunk.toString(); });
      child.on("exit", () => { if (!output.includes("UNCOMMITTED")) reject(new Error(errors)); });
    });
    child.kill("SIGKILL"); await exited;
    expect(child.signalCode).toBe("SIGKILL");
    const store = new SqliteRuntime(path, { syntheticProof: true });
    try {
      const context = issueOwnerContext(owner);
      expect(store.read(context, (db, user) => db.prepare("SELECT id FROM tasks WHERE user_id=? ORDER BY id").all(user))).toEqual([{ id: committed }]);
      const original = inspectSyntheticDatabase(path);
      await store.backup(backup);
      expect(inspectSyntheticDatabase(backup)).toEqual(original);
      expect(await restoreSyntheticBackup(backup, restore)).toEqual(original);
      await expect(store.backup(backup)).rejects.toThrow();
      await expect(restoreSyntheticBackup(backup, restore)).rejects.toThrow();
    } finally { store.close(); }
  } finally { if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL"); await exited; }
}, 15_000);
