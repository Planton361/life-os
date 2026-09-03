import { describe, expect, it } from "vitest";
import { buildCalendarTemporalSignals } from "./calendar-temporal-projection";

describe("calendar temporal projection", () => {
  const today = "2026-09-03";

  it("keeps a task schedule and its deadline as separate signals", () => {
    const signals = buildCalendarTemporalSignals({
      goals: [],
      projects: [],
      tasks: [
        {
          dueDate: "2026-09-05T23:59:59.000Z",
          id: "task-1",
          scheduledDate: "2026-09-04",
          status: "planned",
          title: "Task",
        },
      ],
      today,
    });

    expect(signals).toEqual([
      expect.objectContaining({ date: "2026-09-04", kind: "scheduled_task" }),
      expect.objectContaining({ date: "2026-09-05", kind: "task_deadline" }),
    ]);
  });

  it("derives overdue only for open task deadlines", () => {
    const signals = buildCalendarTemporalSignals({
      goals: [],
      projects: [],
      tasks: [
        { dueDate: "2026-09-01", id: "open", status: "planned", title: "Open" },
        { dueDate: "2026-09-01", id: "done", status: "done", title: "Done" },
      ],
      today,
    });

    expect(signals.find((signal) => signal.sourceId === "open")?.isOverdue).toBe(true);
    expect(signals.find((signal) => signal.sourceId === "done")?.isOverdue).toBe(false);
  });

  it("projects only generated occurrences, never a recurrence template", () => {
    const signals = buildCalendarTemporalSignals({
      goals: [],
      projects: [],
      tasks: [
        {
          id: "occurrence",
          isRecurringOccurrence: true,
          plannedDate: "2026-09-03",
          status: "planned",
          title: "Occurrence",
        },
      ],
      today,
    });

    expect(signals).toHaveLength(1);
    expect(signals[0]).toMatchObject({
      isRecurringOccurrence: true,
      kind: "planned_task",
      sourceId: "occurrence",
    });
  });

  it("uses canonical Project deadlines and Goal targets", () => {
    const signals = buildCalendarTemporalSignals({
      goals: [{ id: "goal", targetDate: "2026-09-10", title: "Goal" }],
      projects: [{ deadline: "2026-09-09", id: "project", title: "Project" }],
      tasks: [],
      today,
    });

    expect(signals.map((signal) => signal.kind)).toEqual([
      "project_deadline",
      "goal_target",
    ]);
  });
});
