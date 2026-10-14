import { describe, expect, it } from "vitest";
import {
  taskDeadlineEndOfDay,
  taskDeadlineLocalDay,
  taskDeadlinePatch,
} from "./task-deadline";
import { mapUpdateTaskInputToPatch } from "../supabase/mappers/task.mapper";

export const deadlineCases = [
  ["Europe/Berlin", "2026-10-12", "2026-10-12T21:59:59.000Z"],
  ["Europe/Berlin", "2026-01-31", "2026-01-31T22:59:59.000Z"],
  ["Europe/Berlin", "2026-03-28", "2026-03-28T22:59:59.000Z"],
  ["Europe/Berlin", "2026-03-29", "2026-03-29T21:59:59.000Z"],
  ["Europe/Berlin", "2026-10-24", "2026-10-24T21:59:59.000Z"],
  ["Europe/Berlin", "2026-10-25", "2026-10-25T22:59:59.000Z"],
  ["Europe/Berlin", "2026-12-31", "2026-12-31T22:59:59.000Z"],
  ["America/Los_Angeles", "2026-03-08", "2026-03-09T06:59:59.000Z"],
  ["America/Los_Angeles", "2026-11-01", "2026-11-02T07:59:59.000Z"],
  ["America/Los_Angeles", "2026-12-31", "2027-01-01T07:59:59.000Z"],
  ["Asia/Tokyo", "2027-01-01", "2027-01-01T14:59:59.000Z"],
  ["Pacific/Auckland", "2026-09-27", "2026-09-27T10:59:59.000Z"],
] as const;

describe("Task Deadline local-day contract", () => {
  it.each(deadlineCases)(
    "%s %s roundtrips at local 23:59:59",
    (zone, day, instant) => {
      expect(taskDeadlineEndOfDay(day, zone)).toBe(instant);
      expect(taskDeadlineLocalDay(instant, zone)).toBe(day);
      expect(taskDeadlinePatch(day, instant, zone)).toEqual({});
    },
  );
  it("omits due_at for unchanged historical microseconds and absent fields; clears only explicitly", () => {
    const current = "2026-10-12T23:59:59.123456Z";
    for (const submitted of [undefined, "2026-10-13"]) {
      const patch = mapUpdateTaskInputToPatch({
        userId: "owner",
        profileId: "owner",
        taskId: "task",
        title: "Title only",
        ...taskDeadlinePatch(submitted, current, "Europe/Berlin"),
      });
      expect(patch).toEqual({ title: "Title only" });
      expect(patch).not.toHaveProperty("due_at");
    }
    expect(taskDeadlinePatch("", current, "Europe/Berlin")).toEqual({
      dueAt: null,
    });
    expect(taskDeadlinePatch("", null, "Europe/Berlin")).toEqual({});
    expect(taskDeadlinePatch("2026-10-12", null, "Europe/Berlin")).toEqual({
      dueAt: "2026-10-12T21:59:59.000Z",
    });
  });
  it.each(["2026-02-30", "2026-13-01", "invalid", "2026-10-12T00:00:00Z"])(
    "rejects invalid date %s",
    (day) => {
      expect(() => taskDeadlineEndOfDay(day, "Europe/Berlin")).toThrow();
    },
  );
  it("rejects invalid zones and nonexistent IANA local days", () => {
    expect(() => taskDeadlineEndOfDay("2026-10-12", "invalid")).toThrow();
    expect(() => taskDeadlineEndOfDay("2011-12-30", "Pacific/Apia")).toThrow();
  });
});
