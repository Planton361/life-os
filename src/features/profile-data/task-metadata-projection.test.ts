import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AgendaEventCard } from "@/components/dashboard/sections/today-agenda-section";
import { CalendarTimedBlock } from "@/features/calendar/components/calendar-block";
import { SelectedContext } from "@/features/calendar/components/calendar-right-panel";
import type { CalendarTimedBlockViewModel } from "@/features/calendar/calendar-types";
import type { LifeTask } from "@/features/entities/types";
import type { Task as RealDataTask } from "@/features/real-data/domain/task";
import {
  realTaskToLifeTask,
  taskToAgendaEvent,
  taskToCalendarBlock,
  taskToCurrentTask,
} from "./view-models";

const lookups = {
  goalTitles: new Map(),
  projectTitles: new Map(),
} as unknown as Parameters<typeof taskToCalendarBlock>[1];

function realTask(overrides: Partial<RealDataTask> = {}): RealDataTask {
  return {
    id: "task-1",
    userId: "user-1",
    profileId: "user-1",
    title: "Title only task",
    description: null,
    status: "planned",
    priority: "none",
    energy: null,
    areaId: null,
    projectId: null,
    goalId: null,
    sourceInboxItemId: null,
    plannedDate: "2026-11-05",
    scheduledStartAt: "2026-11-05T18:00:00.000Z",
    durationMinutes: 60,
    dueAt: null,
    completedAt: null,
    createdAt: "2026-11-05T12:00:00.000Z",
    updatedAt: "2026-11-05T12:00:00.000Z",
    ...overrides,
  } as RealDataTask;
}

function project(task: RealDataTask, areaLabel?: string): LifeTask {
  const projected = realTaskToLifeTask(task);
  if (!projected) throw new Error("expected a projected task");
  return { ...projected, canonicalAreaLabel: areaLabel };
}

function timedBlock(task: LifeTask): CalendarTimedBlockViewModel {
  const block = taskToCalendarBlock(task, lookups);
  if (!block) throw new Error("expected a timed block");
  return {
    ...block,
    compact: false,
    density: "regular",
    durationMinutes: block.endMinutes - block.startMinutes,
    layout: { height: 10, lane: 0, laneCount: 1, left: 0, top: 0, width: 100 },
  };
}

function renderAll(task: LifeTask) {
  const block = timedBlock(task);
  return [
    renderToStaticMarkup(createElement(SelectedContext, { block })),
    renderToStaticMarkup(createElement(CalendarTimedBlock, { block })),
    renderToStaticMarkup(
      createElement(AgendaEventCard, { event: taskToAgendaEvent(task, 0) }),
    ),
  ].join("\n");
}

describe("Task metadata in Calendar and Dashboard projections", () => {
  it.each([undefined, "Inbox-Aufgabe"])(
    "invents no priority, Area or next step for a title-only Task (inbox source: %s)",
    (sourceInboxItemId) => {
      const task = project(realTask({ sourceInboxItemId: sourceInboxItemId as never }));
      expect(task.nextStep).toBe("");

      const block = taskToCalendarBlock(task, lookups)!;
      expect(block).toMatchObject({ priority: undefined, meta: undefined, area: undefined, plannedOutcome: undefined });
      expect(block.sourceEntity.label).toBe("Task");

      const event = taskToAgendaEvent(task, 0);
      expect(event).toMatchObject({ priority: undefined, relevanceLabel: undefined, areaLabel: undefined, note: "", nextAction: undefined });
      expect(taskToCurrentTask(task).contextLabel).toBe("");

      const markup = renderAll(task);
      for (const invented of ["P3", "none", "Review", "Prepared for later scheduling", "Area:", "Outcome:", "area "])
        expect(markup).not.toContain(invented);
      expect(markup).toContain(
        'aria-label="Title only task, 19:00 to 20:00, Task Block, planned, source Task"',
      );
    },
  );

  it("keeps explicitly set priority, Area, description and next step", () => {
    const task = project(
      realTask({
        areaId: "area-1" as never,
        description: "Draft the chapter\n\nNächste Aktion: Outline section two",
        priority: "P1",
      }),
      "Education",
    );

    const block = taskToCalendarBlock(task, lookups)!;
    expect(block).toMatchObject({ priority: "P1", meta: "P1", area: "Education", plannedOutcome: "Outline section two" });
    expect(block.sourceEntity.label).toBe("Task / Education");

    const event = taskToAgendaEvent(task, 0);
    expect(event).toMatchObject({ priority: "P1", relevanceLabel: "P1", areaLabel: "Education", note: "Draft the chapter", nextAction: "Outline section two", strong: true });
    expect(taskToCurrentTask(task).contextLabel).toBe("Education · P1");

    const markup = renderAll(task);
    for (const expected of ["P1", "Area: </dt><dd class=\"inline\">Education", "Outcome: </dt><dd class=\"inline\">Outline section two", "Draft the chapter", "area Education"])
      expect(markup).toContain(expected);
  });

  it("does not repeat a description that doubles as the next step", () => {
    const task = project(realTask({ description: "Read the paper" }));
    const event = taskToAgendaEvent(task, 0);
    expect(event).toMatchObject({ note: "Read the paper", nextAction: undefined });
    const markup = renderToStaticMarkup(createElement(AgendaEventCard, { event }));
    expect(markup.match(/Read the paper/g)).toHaveLength(3);
  });
});
