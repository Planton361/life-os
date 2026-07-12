import { describe, expect, it } from "vitest";
import type { Habit, HabitLog, HabitWindowSettings } from "./habit";
import {
  aggregateHabitDay,
  habitProgress,
  latestHabitLog,
  orderedDashboardHabits,
  resolveHabitWindow,
} from "./habit";

const settings: HabitWindowSettings = {
  eveningStartsAt: "17:00",
  middayStartsAt: "11:00",
  morningStartsAt: "05:00",
  timezone: "Europe/Berlin",
};

describe("habit pure logic", () => {
  it("resolves all local times into ordered windows including overnight evening", () => {
    expect(resolveHabitWindow("04:59", settings)).toBe("Evening");
    expect(resolveHabitWindow("05:00", settings)).toBe("Morning");
    expect(resolveHabitWindow("11:00", settings)).toBe("Midday");
    expect(resolveHabitWindow("17:00", settings)).toBe("Evening");
  });

  it("aggregates timestamped values and preserves overachievement", () => {
    const logs = [{ value: 200 }, { value: 200 }, { value: 200 }] as HabitLog[];
    expect(aggregateHabitDay(logs)).toBe(600);
    expect(habitProgress(2400, 2000)).toEqual({
      currentValue: 2400,
      overachieved: true,
      percentage: 120,
    });
    expect(habitProgress(5, null).percentage).toBeNull();
  });

  it("sorts by configured order and limits dashboard slots to eight", () => {
    const habits = Array.from({ length: 10 }, (_, index) => ({
      id: String(index),
      sortOrder: 10 - index,
    })) as Habit[];
    expect(
      orderedDashboardHabits(habits).map((habit) => habit.sortOrder),
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("selects only the latest active log for undo", () => {
    const logs = [
      { archivedAt: null, id: "a", recordedAt: "2026-07-12T08:00:00Z" },
      {
        archivedAt: "2026-07-12T09:30:00Z",
        id: "c",
        recordedAt: "2026-07-12T09:00:00Z",
      },
      { archivedAt: null, id: "b", recordedAt: "2026-07-12T08:30:00Z" },
    ] as HabitLog[];
    expect(latestHabitLog(logs)?.id).toBe("b");
  });
});
