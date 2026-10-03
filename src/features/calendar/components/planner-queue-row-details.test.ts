import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { PlannerQueueItem } from "../calendar-types";
import {
  enrichPlannerQueue,
  type WeeklyTaskContext,
} from "../weekly-task-context";
import {
  PlannerQueueRowDetails,
  PlannerQueueSummary,
} from "./planner-queue-row-details";

const task: PlannerQueueItem = {
  id: "ready",
  title: "Ready Task",
  area: "Work",
  priority: "P2",
  durationMinutes: 30,
  isRecurringOccurrence: false,
  skills: [],
  rankingGroup: "backlog",
  rankingReason: "Backlog",
};
const context: WeeklyTaskContext = {
  id: task.id,
  title: task.title,
  execution: "READY",
  blockers: [],
  goalConflict: false,
  goals: [],
  skills: [],
};
it.each(["none", "P0", "P1", "P2", "P3"] as const)(
  "renders Queue summary with priority=%s without placeholder separators",
  (priority) => {
    const markup = renderToStaticMarkup(
      createElement(PlannerQueueSummary, {
        task: { ...task, rankingReason: "Project next work", priority },
        duration: "30 min",
      }),
    );
    expect(markup).toBe(
      priority === "none"
        ? "Project next work · 30 min"
        : `Project next work · ${priority} · 30 min`,
    );
  },
);
function render(
  source: WeeklyTaskContext,
  overrides: Partial<PlannerQueueItem> = {},
  sourceLabel: string | null = null,
) {
  const [enriched] = enrichPlannerQueue([{ ...task, ...overrides }], {
    [task.id]: source,
  });
  expect(enriched.id).toBe(task.id);
  expect(enriched.rankingGroup).toBe(task.rankingGroup);
  return renderToStaticMarkup(
    createElement(PlannerQueueRowDetails, { task: enriched, sourceLabel }),
  );
}
it("renders real context orientation and only existing planning metadata", () => {
  const real = {
    ...context,
    project: { id: "project", title: "Real Project", result: null },
  };
  const markup = render(
    real,
    { dueDate: "2026-10-03", isRecurringOccurrence: true },
    "Meal source",
  );
  expect(markup).toContain("data-queue-orientation");
  expect(markup).toContain("Project · Real Project");
  expect(markup).toContain("Deadline 2026-10-03 · Recurring · Meal source");
  expect(markup).not.toContain("No deadline");
  expect(render(real, { isRecurringOccurrence: true })).toContain(
    ">Recurring</p>",
  );
  expect(render(real, {}, "Meal source")).toContain(">Meal source</p>");
});
it("renders no orientation or metadata row for a genuine no-context Task", () => {
  const markup = render(context);
  expect(markup).not.toContain("data-queue-orientation");
  expect(markup).not.toContain("data-queue-planning-metadata");
  expect(markup).not.toContain("No deadline");
  expect(markup).not.toContain("nicht verfügbar");
});
it("keeps context-read failure visibly distinct from empty for an otherwise READY Task", () => {
  const markup = render(
    { ...context, unavailable: true },
    { orientation: "Stale Project" },
  );
  expect(markup).toContain("data-queue-orientation");
  expect(markup).toContain("Kontext derzeit nicht verfügbar");
  expect(markup).not.toContain("Stale Project");
  expect(markup).not.toContain("data-queue-planning-metadata");
  expect(markup).not.toContain("No deadline");
});
