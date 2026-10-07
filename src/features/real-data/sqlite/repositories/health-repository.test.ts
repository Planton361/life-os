import { randomUUID } from "node:crypto";
import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { initializeSyntheticDatabase } from "../synthetic-database";
import { SqliteRuntime } from "../runtime";
import { issueOwnerContext } from "../owner-context";
import { createSqliteHealthRepository } from "./health-repository";

const owner = "11600000-0000-4000-8000-000000000001";
function fixture() {
  const path = join(mkdtempSync(join(realpathSync(tmpdir()), "life-os-116-health-")), "synthetic.db");
  initializeSyntheticDatabase(path, owner);
  const context = issueOwnerContext(owner), store = new SqliteRuntime(path, { syntheticProof: true });
  return { path, store, context, repo: createSqliteHealthRepository(store, context) };
}
describe("native Health compatibility", () => {
  it("upserts by canonical day/owner, rounds like numeric(5,2) and preserves IDs on restart", async () => {
    const f = fixture();
    let snapshot;
    try {
      expect(await f.repo.saveSleep(owner, owner, { sleepDate: "2026-10-06", durationMinutes: 420, quality: 3 })).toBe(true);
      expect(await f.repo.saveWeight(owner, owner, { measuredOn: "2026-10-06", weightKg: 80.125 })).toBe(true);
      expect(await f.repo.saveWeightGoal(owner, owner, { targetWeightKg: 75.125, targetDate: "2027-01-01" })).toBe(true);
      const first = await f.repo.getSnapshot(owner, owner);
      expect(await f.repo.saveSleep(owner, owner, { sleepDate: "2026-10-06", durationMinutes: 480, note: "Updated synthetic night" })).toBe(true);
      expect(await f.repo.saveWeight(owner, owner, { measuredOn: "2026-10-06", weightKg: 79.555 })).toBe(true);
      expect(await f.repo.saveWeightGoal(owner, owner, { targetWeightKg: 74.555 })).toBe(true);
      snapshot = await f.repo.getSnapshot(owner, owner);
      expect(snapshot?.sleep[0]).toMatchObject({ id: first?.sleep[0].id, durationMinutes: 480, quality: null, note: "Updated synthetic night" });
      expect(snapshot?.weights[0]).toMatchObject({ id: first?.weights[0].id, weightKg: 79.56 });
      expect(snapshot?.weightGoal).toMatchObject({ id: first?.weightGoal?.id, targetWeightKg: 74.56, targetDate: null });
      expect(f.store.read(f.context, db => db.prepare("SELECT weight_kg FROM weight_entries WHERE user_id=?").all(owner))).toEqual([{ weight_kg: "79.56" }]);
    } finally { f.store.close(); }
    const restarted = new SqliteRuntime(f.path, { syntheticProof: true });
    try { expect(await createSqliteHealthRepository(restarted, f.context).getSnapshot(owner, owner)).toEqual(snapshot); }
    finally { restarted.close(); }
  });
  it("keeps Mood undo as soft history and rejects forged scope / invalid domain inputs", async () => {
    const f = fixture();
    try {
      expect(await f.repo.addMood(owner, owner, { mood: "calm", localDate: "2026-10-06", timezone: "Europe/Berlin" })).toBe(true);
      expect(await f.repo.undoTodayMood(owner, owner, "2026-10-06")).toBe(true);
      expect(await f.repo.undoTodayMood(owner, owner, "2026-10-06")).toBe(false);
      expect((await f.repo.getSnapshot(owner, owner))?.moods).toHaveLength(0);
      expect(f.store.read(f.context, db => db.prepare("SELECT count(*) AS n FROM mood_entries WHERE user_id=? AND archived_at IS NOT NULL").get(owner))).toEqual({ n: BigInt(1) });
      expect(await f.repo.saveWeight(randomUUID(), owner, { measuredOn: "2026-10-06", weightKg: 80 })).toBe(false);
      expect(await f.repo.saveSleep(owner, randomUUID(), { sleepDate: "2026-10-06", durationMinutes: 480 })).toBe(false);
      expect(await f.repo.saveSleep(owner, owner, { sleepDate: "2026-02-30", durationMinutes: 480 })).toBe(false);
      expect(await f.repo.saveWeightGoal(owner, owner, { targetWeightKg: 501 })).toBe(false);
      expect(await f.repo.getSnapshot(randomUUID(), owner)).toBe(null);
    } finally { f.store.close(); }
  });
});
