import { describe, expect, it } from "vitest";
import type { LifeTask } from "../entities/types";
import {
  dashboardTaskSelection,
  dashboardCalendarTimeProgress,
} from "./dashboard-read-model";

describe("dashboardCalendarTimeProgress", () => {
  it("derives Month, Week and Day from local calendar time only", () => {
    expect(
      dashboardCalendarTimeProgress(
        new Date("2026-07-15T12:00:00.000Z"),
        "UTC",
      ),
    ).toEqual([
      { label: "Month", progress: 47, value: "47%" },
      { label: "Week", progress: 36, value: "36%" },
      { label: "Day", progress: 50, value: "50%" },
    ]);
  });

  it("starts a new month, ISO week and day at zero", () => {
    expect(
      dashboardCalendarTimeProgress(
        new Date("2024-02-01T00:00:00.000Z"),
        "UTC",
      ),
    ).toEqual([
      { label: "Month", progress: 0, value: "0%" },
      { label: "Week", progress: 43, value: "43%" },
      { label: "Day", progress: 0, value: "0%" },
    ]);
  });

  it("uses ISO week boundaries and leap-month length", () => {
    const sundayEnd = dashboardCalendarTimeProgress(
      new Date("2026-01-04T23:59:00.000Z"),
      "UTC",
    );
    const leapMonthEnd = dashboardCalendarTimeProgress(
      new Date("2024-02-29T23:59:00.000Z"),
      "UTC",
    );

    expect(sundayEnd.map((row) => row.label)).toEqual(["Month", "Week", "Day"]);
    expect(sundayEnd[1]?.progress).toBe(100);
    expect(leapMonthEnd[0]?.progress).toBe(100);
    expect(leapMonthEnd[2]?.progress).toBe(100);
  });
});

it("excludes dependency-blocked tasks from current and Up Next without mutating the input", () => {
  const tasks = [
    {
      id: "blocked",
      status: "active",
      priority: "P0",
      dependencyAvailability: "BLOCKED",
    },
    {
      id: "ready",
      status: "planned",
      priority: "P1",
      dependencyAvailability: "READY",
    },
  ] as LifeTask[];
  expect(dashboardTaskSelection(tasks)).toEqual({
    current: tasks[1],
    upNext: [],
  });
  expect(tasks).toHaveLength(2);
});
