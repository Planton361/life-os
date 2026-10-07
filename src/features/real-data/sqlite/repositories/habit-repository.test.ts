import { randomUUID } from "node:crypto";
import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { initializeSyntheticDatabase } from "../synthetic-database";
import { SqliteRuntime } from "../runtime";
import { issueOwnerContext } from "../owner-context";
import { incrementHabit } from "../commands/habit-commands";
import { createSqliteHabitRepository } from "./habit-repository";

const owner = "11600000-0000-4000-8000-000000000001";
const input = { name: "Synthetic habit", unit: null, dailyTarget: 0.3, defaultIncrement: 0.2, window: "Morning" as const, sortOrder: 1 };
function fixture() {
  const path = join(mkdtempSync(join(realpathSync(tmpdir()), "life-os-116-habit-")), "synthetic.db");
  initializeSyntheticDatabase(path, owner);
  const store = new SqliteRuntime(path, { syntheticProof: true }), context = issueOwnerContext(owner);
  return { path, store, context, repo: createSqliteHabitRepository(store, context) };
}

describe("native Habit compatibility", () => {
  it("clamps exact decimals at the profile's local-day boundary and preserves undo/history", async () => {
    const f = fixture();
    const created = await f.repo.createHabit(owner, owner, input);
    if (!created.ok) throw new Error(created.error.message);
    const id = created.data.id;
    try {
      const increment = (at: string) => f.store.command(f.context, "habit.increment", db => incrementHabit(db, owner, id, at));
      expect(increment("2026-10-05T22:30:00Z")).toBe("incremented");
      expect(increment("2026-10-06T10:00:00Z")).toBe("incremented");
      expect(increment("2026-10-06T11:00:00Z")).toBe("already_at_target");
      expect(f.store.read(f.context, db => db.prepare("SELECT value,local_date FROM habit_logs WHERE user_id=? AND habit_id=? ORDER BY recorded_at").all(owner, id)))
        .toEqual([{ value: "0.2", local_date: "2026-10-06" }, { value: "0.1", local_date: "2026-10-06" }]);
      expect(await f.repo.undoLatestLog(owner, owner, id, "2026-10-06")).toBe(true);
      expect(increment("2026-10-06T11:30:00Z")).toBe("incremented");
      expect(increment("2026-10-06T22:01:00Z")).toBe("incremented");
      expect(await f.repo.archiveHabit(owner, owner, id)).toBe(true);
      expect((await f.repo.addLog(owner, owner, id)).ok).toBe(false);
    } finally { f.store.close(); }
    const restarted = new SqliteRuntime(f.path, { syntheticProof: true });
    try {
      const snapshot = await createSqliteHabitRepository(restarted, f.context).getSnapshot(owner, owner, "2026-10-06", "2026-10-07");
      expect(snapshot.ok && snapshot.data.logs.map(row => row.value).sort()).toEqual([0.1, 0.2, 0.2]);
      expect(snapshot.ok && snapshot.data.habits[0].id).toBe(id);
      expect(snapshot.ok && snapshot.data.habits[0].archivedAt).not.toBe(null);
      expect(restarted.read(f.context, db => db.prepare("SELECT count(*) AS n FROM habit_logs WHERE user_id=? AND habit_id=?").get(owner, id))).toEqual({ n: BigInt(4) });
    } finally { restarted.close(); }
  });
  it("enforces owner/profile, eight active slots, settings ordering and native input validation", async () => {
    const f = fixture();
    try {
      expect((await f.repo.createHabit(randomUUID(), owner, input)).ok).toBe(false);
      expect((await f.repo.createHabit(owner, randomUUID(), input)).ok).toBe(false);
      expect((await f.repo.createHabit(owner, owner, { ...input, defaultIncrement: -1 })).ok).toBe(false);
      for (let i = 0; i < 8; i++) expect((await f.repo.createHabit(owner, owner, input, true)).ok).toBe(true);
      expect((await f.repo.createHabit(owner, owner, input, true)).ok).toBe(false);
      expect(await f.repo.updateSettings(owner, owner, { morningStartsAt: "10:00", middayStartsAt: "09:00", eveningStartsAt: "17:00" })).toBe(false);
      expect(await f.repo.updateSettings(owner, owner, { morningStartsAt: "06:00", middayStartsAt: "12:00", eveningStartsAt: "18:00" })).toBe(true);
      expect(await f.repo.getSettings(owner, owner)).toEqual({ timezone: "Europe/Berlin", morningStartsAt: "06:00", middayStartsAt: "12:00", eveningStartsAt: "18:00" });
      expect((await f.repo.createHabit(owner, owner, { ...input, window: "Evening", defaultIncrement: 1e-7 })).ok).toBe(true);
    } finally { f.store.close(); }
  });
});
