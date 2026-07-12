import { describe, expect, it, vi } from "vitest";
import type { RecurringTaskTemplate, Task } from "../domain";
import type { RecurringTaskGenerationContext } from "./recurring-task-generation";
import {
  generateRecurringTaskInstancesForDate,
  getDueTemplateDates,
  isTemplateDueOnDate,
} from "./recurring-task-generation";

function template(
  overrides: Partial<RecurringTaskTemplate> = {},
): RecurringTaskTemplate {
  return {
    areaId: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    description: null,
    durationMinutes: 30,
    endsOn: null,
    energy: "medium",
    goalId: null,
    id: "template-1",
    isActive: true,
    nextAction: null,
    priority: "P1",
    profileId: "user-1",
    projectId: null,
    recurrenceRule: { frequency: "daily", interval: 2, version: "v1" },
    startsOn: "2026-07-01",
    timezone: "Europe/Berlin",
    title: "Routine",
    updatedAt: "2026-07-01T00:00:00.000Z",
    userId: "user-1",
    ...overrides,
  } as RecurringTaskTemplate;
}

describe("recurring task rules", () => {
  it("respects daily intervals, start/end boundaries, and pause state", () => {
    const recurring = template({ endsOn: "2026-07-05" });

    expect(getDueTemplateDates(recurring, "2026-06-30", "2026-07-07")).toEqual([
      "2026-07-01",
      "2026-07-03",
      "2026-07-05",
    ]);
    expect(
      isTemplateDueOnDate({ ...recurring, isActive: false }, "2026-07-03"),
    ).toBe(false);
  });

  it("uses ISO weekdays and weekly intervals deterministically", () => {
    const recurring = template({
      recurrenceRule: {
        byWeekday: [1, 3],
        frequency: "weekly",
        interval: 2,
        version: "v1",
      },
      startsOn: "2026-07-06",
    });

    expect(getDueTemplateDates(recurring, "2026-07-06", "2026-07-19")).toEqual([
      "2026-07-06",
      "2026-07-08",
    ]);
  });
});

describe("recurring task generation idempotency", () => {
  it("returns the existing instance on a repeated explicit generation", async () => {
    const recurring = template({
      recurrenceRule: { frequency: "daily", interval: 1, version: "v1" },
      startsOn: "2026-07-12",
    });
    const instances = new Map<string, Task>();
    const createGeneratedTaskInstance = vi.fn(async (input) => {
      const key = `${input.templateId}:${input.instanceDate}`;
      const existing = instances.get(key);
      if (existing)
        return { data: { existing: true, task: existing }, ok: true } as const;

      const task = {
        id: "task-1",
        instanceDate: input.instanceDate,
        title: input.title,
      } as Task;
      instances.set(key, task);
      return { data: { existing: false, task }, ok: true } as const;
    });
    const context = {
      recurringTaskTemplates: {
        getActiveRecurringTaskTemplatesByUser: vi.fn(async () => ({
          data: [recurring],
          ok: true,
        })),
      },
      tasks: { createGeneratedTaskInstance },
    } as unknown as RecurringTaskGenerationContext;
    const input = {
      date: "2026-07-12" as const,
      profileId: "user-1",
      userId: "user-1",
    };

    const first = await generateRecurringTaskInstancesForDate(input, context);
    const second = await generateRecurringTaskInstancesForDate(input, context);

    expect(first.ok && first.data.generated).toHaveLength(1);
    expect(second.ok && second.data.generated).toHaveLength(0);
    expect(second.ok && second.data.existing).toHaveLength(1);
    expect(instances).toHaveLength(1);
  });
});
