import "server-only";
import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { addDecimals, compareDecimals, localDayAt, subtractDecimals, timestamp, uuid } from "../codecs";

// Called only inside the runtime's IMMEDIATE owner-scoped command. The lock
// covers the active log sum, target clamp and insertion, matching the PG RPC.
export function incrementHabit(db: Database.Database, owner: string, habitId: string, recordedAt: string) {
  habitId = uuid(habitId); recordedAt = timestamp(recordedAt);
  const habit = db.prepare("SELECT daily_target,default_increment FROM habits WHERE user_id=? AND profile_id=? AND id=? AND archived_at IS NULL")
    .get(owner, owner, habitId) as { daily_target: string | null; default_increment: string } | undefined;
  const profile = db.prepare("SELECT timezone FROM profiles WHERE id=?").get(owner) as { timezone: string } | undefined;
  if (!habit || !profile) throw new Error("HABIT_NOT_FOUND");
  const date = localDayAt(recordedAt, profile.timezone);
  const values = db.prepare("SELECT value FROM habit_logs WHERE user_id=? AND habit_id=? AND local_date=? AND archived_at IS NULL")
    .all(owner, habitId, date) as { value: string }[];
  const current = values.reduce((sum, row) => addDecimals(sum, row.value), "0");
  if (habit.daily_target !== null && compareDecimals(current, habit.daily_target) >= 0) return "already_at_target" as const;
  let value = habit.default_increment;
  if (habit.daily_target !== null) {
    const remaining = subtractDecimals(habit.daily_target, current);
    if (compareDecimals(remaining, value) < 0) value = remaining;
  }
  if (compareDecimals(value, "0") <= 0) throw new Error("HABIT_INCREMENT_INVALID");
  db.prepare("INSERT INTO habit_logs(id,user_id,profile_id,habit_id,value,recorded_at,local_date,timezone,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)")
    .run(randomUUID(), owner, owner, habitId, value, recordedAt, date, profile.timezone, recordedAt, recordedAt);
  return "incremented" as const;
}
