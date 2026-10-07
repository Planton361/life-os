import "server-only";
import { randomUUID } from "node:crypto";
import type { HealthSnapshot, MoodEntry, SleepEntry, WeightEntry, WeightGoal } from "../../domain";
import type { MoodEntryInput, SleepEntryInput, WeightEntryInput, WeightGoalInput } from "../../schemas";
import { moodEntryInputSchema, sleepEntryInputSchema, weightEntryInputSchema, weightGoalInputSchema } from "../../schemas/health.schema";
import type { createSupabaseHealthRepository } from "../../supabase/repositories/supabase-health-repository";
import { decimalFromNumber, localDate, numeric, safeNumber, timestamp, timezone } from "../codecs";
import { requireOwnerContext, type OwnerContext } from "../owner-context";
import type { SqliteRuntime } from "../runtime";

type MoodRow = { id: string; user_id: string; profile_id: string; mood: MoodEntry["mood"]; recorded_at: string; local_date: string; timezone: string };
type SleepRow = { id: string; user_id: string; profile_id: string; sleep_date: string; duration_minutes: bigint; quality: bigint | null; note: string | null };
type WeightRow = { id: string; user_id: string; profile_id: string; measured_on: string; weight_kg: string };
type GoalRow = { id: string; user_id: string; profile_id: string; target_date: string | null; target_weight_kg: string };
const mood = (row: MoodRow): MoodEntry => ({ id: row.id, userId: row.user_id, profileId: row.profile_id, mood: row.mood, recordedAt: row.recorded_at, localDate: row.local_date, timezone: row.timezone });
const sleep = (row: SleepRow): SleepEntry => ({ id: row.id, userId: row.user_id, profileId: row.profile_id, sleepDate: row.sleep_date, durationMinutes: safeNumber(row.duration_minutes), quality: row.quality === null ? null : safeNumber(row.quality), note: row.note });
const weight = (row: WeightRow): WeightEntry => ({ id: row.id, userId: row.user_id, profileId: row.profile_id, measuredOn: row.measured_on, weightKg: Number(row.weight_kg) });
const goal = (row: GoalRow): WeightGoal => ({ id: row.id, userId: row.user_id, profileId: row.profile_id, targetDate: row.target_date, targetWeightKg: Number(row.target_weight_kg) });

export function createSqliteHealthRepository(store: SqliteRuntime, context: OwnerContext) {
  const owner = requireOwnerContext(context), scoped = (user: string, profile: string) => user === owner && profile === owner;
  const now = () => timestamp(new Date().toISOString());
  return {
    async ensureProfile(userId: string, profileId: string) {
      if (!scoped(userId, profileId)) return false;
      return store.read(context, db => !!db.prepare("SELECT id FROM profiles WHERE id=?").get(owner));
    },
    async getSnapshot(userId: string, profileId: string): Promise<HealthSnapshot | null> {
      if (!scoped(userId, profileId)) return null;
      try { return store.read(context, db => {
        const moods = (db.prepare("SELECT * FROM mood_entries WHERE user_id=? AND archived_at IS NULL ORDER BY recorded_at DESC,id DESC LIMIT 30").all(owner) as MoodRow[]).map(mood);
        const sleeps = (db.prepare("SELECT * FROM sleep_entries WHERE user_id=? ORDER BY sleep_date DESC,id LIMIT 30").all(owner) as SleepRow[]).map(sleep);
        const weights = (db.prepare("SELECT * FROM weight_entries WHERE user_id=? ORDER BY measured_on DESC,id LIMIT 90").all(owner) as WeightRow[]).map(weight);
        const target = db.prepare("SELECT * FROM weight_goals WHERE user_id=?").get(owner) as GoalRow | undefined;
        return { moods, sleep: sleeps, weights, weightGoal: target ? goal(target) : null };
      }); } catch { return null; }
    },
    async addMood(userId: string, profileId: string, input: MoodEntryInput) {
      if (!scoped(userId, profileId)) return false;
      const parsed = moodEntryInputSchema.safeParse(input); if (!parsed.success) return false;
      try { return store.command(context, "health.mood", db => {
        const at = now();
        db.prepare("INSERT INTO mood_entries(id,user_id,profile_id,mood,recorded_at,local_date,timezone,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)")
          .run(randomUUID(), owner, owner, parsed.data.mood, at, localDate(parsed.data.localDate), timezone(parsed.data.timezone), at, at);
        return true;
      }); } catch { return false; }
    },
    async undoTodayMood(userId: string, profileId: string, date: string) {
      if (!scoped(userId, profileId)) return false;
      try { return store.command(context, "health.mood_undo", db => {
        const latest = db.prepare("SELECT id FROM mood_entries WHERE user_id=? AND local_date=? AND archived_at IS NULL ORDER BY recorded_at DESC,id DESC LIMIT 1").get(owner, localDate(date)) as { id: string } | undefined;
        if (!latest) return false;
        const at = now(); return db.prepare("UPDATE mood_entries SET archived_at=?,updated_at=? WHERE user_id=? AND id=? AND archived_at IS NULL").run(at, at, owner, latest.id).changes > 0;
      }); } catch { return false; }
    },
    async saveSleep(userId: string, profileId: string, input: SleepEntryInput) {
      if (!scoped(userId, profileId)) return false;
      const parsed = sleepEntryInputSchema.safeParse(input); if (!parsed.success) return false;
      try { return store.command(context, "health.sleep", db => {
        const value = parsed.data, at = now();
        db.prepare("INSERT INTO sleep_entries(id,user_id,profile_id,sleep_date,duration_minutes,quality,note,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id,sleep_date) DO UPDATE SET duration_minutes=excluded.duration_minutes,quality=excluded.quality,note=excluded.note,updated_at=excluded.updated_at")
          .run(randomUUID(), owner, owner, localDate(value.sleepDate), value.durationMinutes, value.quality ?? null, value.note ?? null, at, at);
        return true;
      }); } catch { return false; }
    },
    async saveWeight(userId: string, profileId: string, input: WeightEntryInput) {
      if (!scoped(userId, profileId)) return false;
      const parsed = weightEntryInputSchema.safeParse(input); if (!parsed.success) return false;
      try { return store.command(context, "health.weight", db => {
        const at = now();
        db.prepare("INSERT INTO weight_entries(id,user_id,profile_id,measured_on,weight_kg,created_at,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(user_id,measured_on) DO UPDATE SET weight_kg=excluded.weight_kg,updated_at=excluded.updated_at")
          .run(randomUUID(), owner, owner, localDate(parsed.data.measuredOn), numeric(decimalFromNumber(parsed.data.weightKg), 5, 2), at, at);
        return true;
      }); } catch { return false; }
    },
    async saveWeightGoal(userId: string, profileId: string, input: WeightGoalInput) {
      if (!scoped(userId, profileId)) return false;
      const parsed = weightGoalInputSchema.safeParse(input); if (!parsed.success) return false;
      try { return store.command(context, "health.weight_goal", db => {
        const at = now();
        db.prepare("INSERT INTO weight_goals(id,user_id,profile_id,target_weight_kg,target_date,created_at,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET target_weight_kg=excluded.target_weight_kg,target_date=excluded.target_date,updated_at=excluded.updated_at")
          .run(randomUUID(), owner, owner, numeric(decimalFromNumber(parsed.data.targetWeightKg), 5, 2), parsed.data.targetDate === undefined ? null : localDate(parsed.data.targetDate), at, at);
        return true;
      }); } catch { return false; }
    },
  } satisfies ReturnType<typeof createSupabaseHealthRepository>;
}
