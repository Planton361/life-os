import "server-only";
import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import type { Habit, HabitLog, HabitSnapshot, HabitWindowSettings } from "../../domain";
import type { CreateHabitInput, UpdateHabitInput, HabitWindowSettingsInput } from "../../schemas";
import { createHabitInputSchema, updateHabitInputSchema, habitWindowSettingsInputSchema } from "../../schemas/habit.schema";
import type { RepositoryResult } from "../../repositories/repository-result";
import type { createSupabaseHabitRepository } from "../../supabase/repositories/supabase-habit-repository";
import type { SqliteRuntime } from "../runtime";
import { requireOwnerContext, type OwnerContext } from "../owner-context";
import { decimalFromNumber, localDate, safeNumber, timestamp, uuid } from "../codecs";
import { incrementHabit } from "../commands/habit-commands";

type HabitRow = { id: string; user_id: string; profile_id: string; name: string; unit: string | null; daily_target: string | null; default_increment: string; time_window: Habit["window"]; sort_order: bigint; created_at: string; updated_at: string; archived_at: string | null };
type LogRow = { id: string; user_id: string; profile_id: string; habit_id: string; value: string; recorded_at: string; local_date: string; timezone: string; archived_at: string | null };
type SettingsRow = { timezone: string; habit_morning_starts_at: string; habit_midday_starts_at: string; habit_evening_starts_at: string };
function settings(row: SettingsRow): HabitWindowSettings {
  return { timezone: row.timezone, morningStartsAt: row.habit_morning_starts_at.slice(0, 5), middayStartsAt: row.habit_midday_starts_at.slice(0, 5), eveningStartsAt: row.habit_evening_starts_at.slice(0, 5) };
}
// The existing UI contract is numeric. Only its projection uses Number; target
// arithmetic, comparisons and persisted values remain exact decimal strings.
function habit(row: HabitRow): Habit {
  return { id: row.id, userId: row.user_id, profileId: row.profile_id, name: row.name, unit: row.unit, dailyTarget: row.daily_target === null ? null : Number(row.daily_target), defaultIncrement: Number(row.default_increment), window: row.time_window, sortOrder: safeNumber(row.sort_order), createdAt: row.created_at, updatedAt: row.updated_at, archivedAt: row.archived_at };
}
function log(row: LogRow): HabitLog {
  return { id: row.id, userId: row.user_id, profileId: row.profile_id, habitId: row.habit_id, value: Number(row.value), recordedAt: row.recorded_at, localDate: row.local_date, timezone: row.timezone, archivedAt: row.archived_at };
}
function failure(message: string): RepositoryResult<never> { return { ok: false, error: { code: "adapter_unavailable", message } }; }

export function createSqliteHabitRepository(store: SqliteRuntime, context: OwnerContext) {
  const owner = requireOwnerContext(context);
  const scoped = (userId: string, profileId: string) => userId === owner && profileId === owner;
  const now = () => timestamp(new Date().toISOString());
  const owned = (db: Database.Database, id: string, active = false) => db.prepare(`SELECT * FROM habits WHERE user_id=? AND profile_id=? AND id=?${active ? " AND archived_at IS NULL" : ""}`).get(owner, owner, uuid(id)) as HabitRow | undefined;
  function slot(db: Database.Database, window: string, preferred?: number) {
    const occupied = db.prepare("SELECT sort_order FROM habits WHERE user_id=? AND time_window=? AND archived_at IS NULL").all(owner, window) as { sort_order: bigint }[];
    const used = new Set(occupied.map(row => safeNumber(row.sort_order)));
    const result = preferred && !used.has(preferred) ? preferred : Array.from({ length: 8 }, (_, i) => i + 1).find(value => !used.has(value));
    if (!result) throw new Error("HABIT_SLOTS_FULL");
    return result;
  }
  return {
    async ensureProfile(userId: string, profileId: string) {
      if (!scoped(userId, profileId)) return false;
      return store.read(context, db => !!db.prepare("SELECT id FROM profiles WHERE id=?").get(owner));
    },
    async getSettings(userId: string, profileId: string) {
      if (!scoped(userId, profileId)) return null;
      return store.read(context, db => {
        const row = db.prepare("SELECT * FROM profiles WHERE id=?").get(owner) as SettingsRow | undefined;
        return row ? settings(row) : null;
      });
    },
    async getSnapshot(userId: string, profileId: string, startDate: string, endDate: string): Promise<RepositoryResult<HabitSnapshot>> {
      if (!scoped(userId, profileId)) return failure("Habit scope is invalid.");
      try { return store.read(context, db => {
        const profile = db.prepare("SELECT * FROM profiles WHERE id=?").get(owner) as SettingsRow | undefined;
        if (!profile) throw new Error("PROFILE_NOT_FOUND");
        const habits = (db.prepare("SELECT * FROM habits WHERE user_id=? ORDER BY time_window,sort_order,id").all(owner) as HabitRow[]).map(habit);
        const logs = (db.prepare("SELECT * FROM habit_logs WHERE user_id=? AND local_date>=? AND local_date<=? AND archived_at IS NULL ORDER BY recorded_at DESC,id DESC").all(owner, localDate(startDate), localDate(endDate)) as LogRow[]).map(log);
        return { ok: true as const, data: { habits, logs, settings: settings(profile) } };
      }); } catch { return failure("Unable to load habit snapshot."); }
    },
    async createHabit(userId: string, profileId: string, input: CreateHabitInput, automaticSlot = false): Promise<RepositoryResult<Habit>> {
      if (!scoped(userId, profileId)) return failure("Habit scope is invalid.");
      const parsed = createHabitInputSchema.safeParse(input);
      if (!parsed.success) return failure("Habit input is invalid.");
      try { return store.command(context, "habit.create", db => {
        const value = parsed.data, id = randomUUID(), at = now();
        const order = automaticSlot ? slot(db, value.window) : value.sortOrder;
        db.prepare("INSERT INTO habits(id,user_id,profile_id,name,unit,daily_target,default_increment,time_window,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)")
          .run(id, owner, owner, value.name, value.unit, value.dailyTarget === undefined ? null : decimalFromNumber(value.dailyTarget), decimalFromNumber(value.defaultIncrement), value.window, order, at, at);
        return { ok: true as const, data: habit(owned(db, id)!) };
      }); } catch { return failure("Habit slot is unavailable or the habit could not be created."); }
    },
    async updateHabit(userId: string, profileId: string, input: UpdateHabitInput): Promise<RepositoryResult<Habit>> {
      if (!scoped(userId, profileId)) return failure("Habit scope is invalid.");
      const parsed = updateHabitInputSchema.safeParse(input);
      if (!parsed.success) return failure("Habit input is invalid.");
      try { return store.command(context, "habit.update", db => {
        const value = parsed.data, existing = owned(db, value.habitId, true);
        if (!existing) throw new Error("HABIT_NOT_FOUND");
        const order = existing.time_window === value.window ? safeNumber(existing.sort_order) : slot(db, value.window, safeNumber(existing.sort_order));
        db.prepare("UPDATE habits SET name=?,unit=?,daily_target=?,default_increment=?,time_window=?,sort_order=?,updated_at=? WHERE user_id=? AND id=?")
          .run(value.name, value.unit, value.dailyTarget === undefined ? null : decimalFromNumber(value.dailyTarget), decimalFromNumber(value.defaultIncrement), value.window, order, now(), owner, value.habitId);
        return { ok: true as const, data: habit(owned(db, value.habitId)!) };
      }); } catch { return failure("Habit slot is unavailable or the habit could not be updated."); }
    },
    async archiveHabit(userId: string, profileId: string, habitId: string) {
      if (!scoped(userId, profileId)) return false;
      try { return store.command(context, "habit.archive", db => {
        if (!owned(db, habitId, true)) return false;
        const at = now();
        return db.prepare("UPDATE habits SET archived_at=?,updated_at=? WHERE user_id=? AND id=? AND archived_at IS NULL").run(at, at, owner, habitId).changes > 0;
      }); } catch { return false; }
    },
    async addLog(userId: string, profileId: string, habitId: string): Promise<RepositoryResult<"incremented" | "already_at_target">> {
      if (!scoped(userId, profileId)) return failure("Habit scope is invalid.");
      try { return { ok: true, data: store.command(context, "habit.increment", db => incrementHabit(db, owner, habitId, now())) }; }
      catch { return failure("Habit could not be incremented."); }
    },
    async undoLatestLog(userId: string, profileId: string, habitId: string, date: string) {
      if (!scoped(userId, profileId)) return false;
      try { return store.command(context, "habit.undo", db => {
        if (!owned(db, habitId)) return false;
        const latest = db.prepare("SELECT id FROM habit_logs WHERE user_id=? AND habit_id=? AND local_date=? AND archived_at IS NULL ORDER BY recorded_at DESC,id DESC LIMIT 1").get(owner, habitId, localDate(date)) as { id: string } | undefined;
        if (!latest) return false;
        const at = now();
        return db.prepare("UPDATE habit_logs SET archived_at=?,updated_at=? WHERE user_id=? AND id=? AND archived_at IS NULL").run(at, at, owner, latest.id).changes > 0;
      }); } catch { return false; }
    },
    async updateSettings(userId: string, profileId: string, input: HabitWindowSettingsInput) {
      if (!scoped(userId, profileId)) return false;
      const parsed = habitWindowSettingsInputSchema.safeParse(input);
      if (!parsed.success) return false;
      try { return store.command(context, "habit.settings", db => db.prepare("UPDATE profiles SET habit_morning_starts_at=?,habit_midday_starts_at=?,habit_evening_starts_at=?,updated_at=? WHERE id=?")
        .run(`${parsed.data.morningStartsAt}:00`, `${parsed.data.middayStartsAt}:00`, `${parsed.data.eveningStartsAt}:00`, now(), owner).changes > 0); } catch { return false; }
    },
  } satisfies ReturnType<typeof createSupabaseHabitRepository>;
}
