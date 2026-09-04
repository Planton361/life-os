import { describe, expect, it } from "vitest";
import { findVisibleSchedulingConflict } from "./calendar-visible-conflict";
import type { CalendarTimedBlockViewModel } from "./calendar-types";

const scheduledBlock = {
  accent: "var(--accent-blue)",
  area: "Work",
  compact: false,
  date: "2026-09-07",
  dayId: "day-2026-09-07",
  density: "regular",
  durationMinutes: 60,
  endMinutes: 10 * 60,
  endTime: "10:00",
  id: "block-a",
  layout: {
    height: 10,
    lane: 0,
    laneCount: 1,
    left: 0,
    top: 10,
    width: 100,
  },
  linkedEntity: "Block A",
  source: "task",
  sourceEntity: { label: "Task", type: "task" },
  startMinutes: 9 * 60,
  startTime: "09:00",
  status: "planned",
  taskId: "task-a",
  title: "Block A",
  type: "task_block",
} satisfies CalendarTimedBlockViewModel;

describe("visible Calendar scheduling conflict", () => {
  it("detects equal starts, partial overlap and full containment", () => {
    const blocks = [scheduledBlock];

    expect(
      findVisibleSchedulingConflict(
        {
          durationMinutes: 30,
          plannedDate: "2026-09-07",
          scheduledTime: "09:00",
          taskId: "task-b",
        },
        blocks,
      ),
    ).toMatchObject({ title: "Block A" });
    expect(
      findVisibleSchedulingConflict(
        {
          durationMinutes: 30,
          plannedDate: "2026-09-07",
          scheduledTime: "08:45",
          taskId: "task-b",
        },
        blocks,
      ),
    ).toMatchObject({ title: "Block A" });
    expect(
      findVisibleSchedulingConflict(
        {
          durationMinutes: 120,
          plannedDate: "2026-09-07",
          scheduledTime: "08:30",
          taskId: "task-b",
        },
        blocks,
      ),
    ).toMatchObject({ title: "Block A" });
  });

  it("allows adjacent and different-day blocks while excluding the task itself", () => {
    const blocks = [scheduledBlock];

    expect(
      findVisibleSchedulingConflict(
        {
          durationMinutes: 30,
          plannedDate: "2026-09-07",
          scheduledTime: "10:00",
          taskId: "task-b",
        },
        blocks,
      ),
    ).toBeNull();
    expect(
      findVisibleSchedulingConflict(
        {
          durationMinutes: 30,
          plannedDate: "2026-09-08",
          scheduledTime: "09:00",
          taskId: "task-b",
        },
        blocks,
      ),
    ).toBeNull();
    expect(
      findVisibleSchedulingConflict(
        {
          durationMinutes: 30,
          plannedDate: "2026-09-07",
          scheduledTime: "09:00",
          taskId: "task-a",
        },
        blocks,
      ),
    ).toBeNull();
  });
});
