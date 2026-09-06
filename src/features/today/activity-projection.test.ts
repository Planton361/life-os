import { describe, expect, it } from "vitest";
import {
  emptyActivitySources,
  projectTodayActivity,
  type ActivitySources,
} from "./activity-projection";
const task = (patch: Partial<ActivitySources["tasks"][number]>) =>
  ({
    id: "task",
    title: "Independent task",
    created_at: "2026-09-06T07:00:00Z",
    completed_at: null,
    scheduled_start_at: null,
    planned_date: null,
    status: "todo",
    archived_at: null,
    ...patch,
  }) as ActivitySources["tasks"][number];
describe("Today source-first day projection", () => {
  it("separates created, scheduled and completed, sorts instants and does not infer updates", () => {
    const sources = emptyActivitySources();
    sources.tasks = [
      task({
        updated_at: "2026-09-06T20:00:00Z",
        completed_at: "2026-09-06T10:00:00Z",
        scheduled_start_at: "2026-09-06T08:00:00Z",
        status: "done",
      }),
    ];
    const log = projectTodayActivity(
      sources,
      "Europe/Berlin",
      new Date("2026-09-06T12:00:00Z"),
    );
    expect(log.events.map((e) => [e.kind, e.time])).toEqual([
      ["TASK CREATED", "09:00"],
      ["TASK SCHEDULED", "10:00"],
      ["TASK COMPLETED", "12:00"],
    ]);
    expect(log.metrics.find((m) => m.label === "Still open")?.value).toBe(0);
  });
  it("includes unplanned creations and excludes yesterday despite updated_at today", () => {
    const sources = emptyActivitySources();
    sources.tasks = [
      task({}),
      task({
        id: "old",
        created_at: "2026-09-04T12:00:00Z",
        updated_at: "2026-09-06T12:00:00Z",
      }),
    ];
    expect(
      projectTodayActivity(
        sources,
        "Europe/Berlin",
        new Date("2026-09-06T12:00:00Z"),
      ).events.map((e) => e.id),
    ).toEqual(["task:created"]);
  });
  it.each([
    ["Europe/Berlin", "2026-09-05T22:00:00Z", "2026-09-06", "00:00"],
    ["America/Los_Angeles", "2026-09-07T06:59:00Z", "2026-09-06", "23:59"],
    ["Europe/Berlin", "2026-03-29T01:30:00Z", "2026-03-29", "03:30"],
  ])("respects local midnight / DST in %s", (zone, at, day, time) => {
    const sources = emptyActivitySources();
    sources.tasks = [task({ created_at: at })];
    const log = projectTodayActivity(sources, zone, new Date(at));
    expect(log.day).toBe(day);
    expect(log.events[0].time).toBe(time);
  });
  it("preserves two distinct DST fallback instants with the same clock label", () => {
    const sources = emptyActivitySources();
    sources.tasks = [
      task({ created_at: "2026-10-25T01:30:00Z" }),
      task({ id: "earlier", created_at: "2026-10-25T00:30:00Z" }),
    ];
    const events = projectTodayActivity(
      sources,
      "Europe/Berlin",
      new Date("2026-10-25T12:00:00Z"),
    ).events;
    expect(events.map((e) => e.id)).toEqual([
      "earlier:created",
      "task:created",
    ]);
    expect(events.map((e) => e.time)).toEqual(["02:30", "02:30"]);
  });
  it("labels an ambiguous Quick Thought source honestly and retains its original title", () => {
    const sources = emptyActivitySources();
    sources.inbox = [
      {
        id: "capture",
        created_at: "2026-09-06T08:00:00Z",
        original_title: "Original",
        title: "Cleaned",
        processed_at: "2026-09-06T09:00:00Z",
        created_task_id: null,
      },
    ] as ActivitySources["inbox"];
    expect(
      projectTodayActivity(
        sources,
        "Europe/Berlin",
        new Date("2026-09-06T12:00:00Z"),
      ).events.map((e) => [e.kind, e.title]),
    ).toEqual([
      ["INBOX CAPTURE", "Original"],
      ["INBOX PROCESSED", "Cleaned"],
    ]);
  });
});

it("projects supported domain timestamps while excluding undone habit records", () => {
  const sources = emptyActivitySources(),
    at = "2026-09-06T09:00:00Z";
  sources.meals = [
    { id: "meal", title: "Lunch", completed_at: at },
  ] as ActivitySources["meals"];
  sources.runs = [
    {
      id: "run",
      completed_at: at,
      archived_at: null,
      distance_km: 5,
      duration_minutes: 30,
    },
  ] as ActivitySources["runs"];
  sources.strength = [
    { id: "strength", completed_at: at, archived_at: null },
  ] as ActivitySources["strength"];
  sources.habits = [
    { id: "undone", recorded_at: at, archived_at: at, value: 1 },
  ] as ActivitySources["habits"];
  const kinds = projectTodayActivity(
    sources,
    "Europe/Berlin",
    new Date(at),
  ).events.map((e) => e.kind);
  expect(kinds).toEqual([
    "MEAL COMPLETED",
    "RUN COMPLETED",
    "STRENGTH COMPLETED",
  ]);
});

it("retains a carried task's explicitly captured original day without inventing a schedule event", () => {
  const sources = emptyActivitySources();
  sources.tasks = [
    task({ created_at: "2026-09-01T08:00:00Z", planned_date: "2026-09-07" }),
  ];
  sources.reviews = [
    {
      id: "review",
      kind: "daily",
      period_start: "2026-09-06",
      archived_at: null,
    },
  ] as ActivitySources["reviews"];
  sources.decisions = [
    {
      review_id: "review",
      task_id: "task",
      decision: "carry_forward",
      planning_snapshot_captured: true,
      original_planned_date: "2026-09-06",
      original_scheduled_start_at: null,
    },
  ] as ActivitySources["decisions"];
  const log = projectTodayActivity(
    sources,
    "Europe/Berlin",
    new Date("2026-09-06T12:00:00Z"),
  );
  expect(log.planned.map((t) => [t.id, t.carriedForward])).toEqual([
    ["task", true],
  ]);
  expect(log.events).toEqual([]);
  expect(log.metrics.find((m) => m.label === "Carried forward")?.value).toBe(1);
});
