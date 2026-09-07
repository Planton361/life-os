import { describe, it, expect } from "vitest";
import { habitDays, habitSummary, shiftDay } from "./habit-analytics";
import type {
  Habit,
  HabitLog,
  HabitSnapshot,
} from "@/features/real-data/domain/habit";
const habit: Habit = {
  id: "h",
  userId: "u",
  profileId: "u",
  name: "Water",
  unit: "ml",
  dailyTarget: 2000,
  defaultIncrement: 500,
  window: "Morning",
  sortOrder: 1,
  createdAt: "2026-08-30T23:30:00Z",
  updatedAt: "2026-08-30T23:30:00Z",
  archivedAt: null,
};
const log = (
  date: string,
  value: number,
  archivedAt: string | null = null,
): HabitLog => ({
  id: `${date}-${value}`,
  habitId: "h",
  userId: "u",
  profileId: "u",
  value,
  localDate: date,
  recordedAt: `${date}T10:00:00Z`,
  timezone: "Europe/Berlin",
  archivedAt,
});
const snapshot: HabitSnapshot = {
  habits: [habit],
  logs: [
    log("2026-08-31", 500),
    log("2026-08-31", 1500),
    log("2026-08-31", 500, "undo"),
    log("2026-08-01", 1),
  ],
  settings: {
    timezone: "Europe/Berlin",
    morningStartsAt: "06:00",
    middayStartsAt: "12:00",
    eveningStartsAt: "18:00",
  },
};
describe("Habit tracker semantics", () => {
  it("adds canonical active increments, excludes undo and respects creation in local timezone", () => {
    const days = habitDays(
      habit,
      snapshot.logs,
      "2026-08-31",
      7,
      "Europe/Berlin",
    );
    expect(days[6]).toMatchObject({
      value: 2000,
      logs: 2,
      completed: true,
      eligible: true,
    });
    expect(days[5].eligible).toBe(false);
  });
  it("never assigns completion to targetless habits", () =>
    expect(
      habitDays(
        { ...habit, dailyTarget: null },
        snapshot.logs,
        "2026-08-31",
        1,
        "Europe/Berlin",
      )[0],
    ).toMatchObject({ value: 2000, completed: false }));
  it("counts a full calendar month including day 31, excluding archived logs", () =>
    expect(habitSummary(snapshot, "2026-08-31")).toEqual({
      active: 1,
      completed: 1,
      targeted: 1,
      weekActiveDays: 1,
      monthLogs: 3,
    }));
  it("corrects summaries after undo and excludes archived habits from today's denominator", () => {
    expect(
      habitSummary(
        { ...snapshot, logs: [log("2026-08-31", 500)] },
        "2026-08-31",
      ).completed,
    ).toBe(0);
    expect(
      habitSummary(
        { ...snapshot, habits: [{ ...habit, archivedAt: "now" }] },
        "2026-08-31",
      ),
    ).toMatchObject({ active: 0, targeted: 0, completed: 0 });
  });
  it("walks local date keys over leap days and DST without elapsed-hour assumptions", () => {
    expect(shiftDay("2024-03-01", -1)).toBe("2024-02-29");
    expect(shiftDay("2026-03-30", -1)).toBe("2026-03-29");
  });
});
