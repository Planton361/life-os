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
  it("keeps an unknown historical Goal identity separate from the current identity", () => {
    const sources = emptyActivitySources();
    sources.goalEvents = [
      {
        id: "reopened",
        goalId: "goal-1",
        goalTitle: null,
        currentGoalTitle: "Current goal identity",
        eventType: "goal_reopened",
        occurredAt: null,
        recordedAt: "2026-09-06T08:00:00Z",
      },
    ];
    const event = projectTodayActivity(
      sources,
      "Europe/Berlin",
      new Date("2026-09-06T12:00:00Z"),
    ).events[0];
    expect(event).toMatchObject({
      kind: "GOAL REOPENED",
      title: "Ziel",
      context: "Goal-Verlauf · aktuelle Zielidentität: Current goal identity",
    });
  });

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

const habitLog = (id: string, at: string, patch = {}) =>
  ({
    id,
    habit_id: "stretch",
    local_date: "2026-09-06",
    recorded_at: at,
    value: 1,
    archived_at: null,
    ...patch,
  }) as ActivitySources["habits"][number];
const today = (sources: ActivitySources) =>
  projectTodayActivity(
    sources,
    "Europe/Berlin",
    new Date("2026-09-06T14:00:00Z"),
  );
it("aggregates active habit logs with target, latest effective time and stable identity after undo", () => {
  const sources = emptyActivitySources();
  sources.habitDefinitions = {
    stretch: { name: "Dehnen", daily_target: 5, unit: null },
  };
  sources.habits = Array.from({ length: 5 }, (_, i) =>
    habitLog(String(i), `2026-09-06T08:0${i}:00Z`),
  );
  const metrics = today(sources).metrics;
  expect(today(sources).events).toMatchObject([
    {
      id: "habit:stretch:2026-09-06",
      kind: "HABIT",
      title: "Dehnen · 5/5",
      context: "Tagesziel erreicht",
      time: "10:04",
    },
  ]);
  sources.habits[4].archived_at = "2026-09-06T09:00:00Z";
  expect(today(sources).events).toMatchObject([
    {
      id: "habit:stretch:2026-09-06",
      title: "Dehnen · 4/5",
      context: "Fortschritt heute",
      time: "10:03",
    },
  ]);
  expect(today(sources).events).toHaveLength(1);
  expect(today(sources).metrics).toEqual(metrics);
  sources.habits.forEach((log) => {
    log.archived_at = "2026-09-06T09:00:00Z";
  });
  expect(today(sources).events).toEqual([]);
});
it("uses canonical units and optional targets, without rounding to a made-up completion", () => {
  const sources = emptyActivitySources();
  sources.habitDefinitions = {
    stretch: { name: "Meditation", daily_target: null, unit: "min" },
  };
  sources.habits = [
    habitLog("a", "2026-09-06T08:00:00Z", { value: 10 }),
    habitLog("b", "2026-09-06T09:00:00Z", { value: 10 }),
  ];
  expect(today(sources).events[0]).toMatchObject({
    title: "Meditation · 20 min heute",
    context: "Fortschritt heute",
  });
  sources.habitDefinitions.stretch.daily_target = 30;
  expect(today(sources).events[0].title).toBe("Meditation · 20/30 min");
});
it("selects one latest active local-day mood deterministically and suppresses older/history rows", () => {
  const sources = emptyActivitySources();
  sources.moods = [
    {
      id: "a",
      mood: "calm",
      recorded_at: "2026-09-06T09:00:00Z",
      archived_at: null,
    },
    {
      id: "b",
      mood: "focused",
      recorded_at: "2026-09-06T09:00:00Z",
      archived_at: null,
    },
    {
      id: "c",
      mood: "sad",
      recorded_at: "2026-09-06T10:00:00Z",
      archived_at: "2026-09-06T11:00:00Z",
    },
    {
      id: "d",
      mood: "tired",
      recorded_at: "2026-09-06T22:00:00Z",
      archived_at: null,
    },
  ] as ActivitySources["moods"];
  const result = today(sources).events;
  expect(result).toMatchObject([
    { id: "mood:2026-09-06", kind: "MOOD", title: "focused", time: "11:00" },
  ]);
  sources.moods.reverse();
  expect(today(sources).events).toEqual(result);
});
it("keeps local-day habit boundaries and deterministic combined chronology without hard limits", () => {
  const sources = emptyActivitySources();
  sources.habits = [
    habitLog("a", "2026-09-05T22:01:00Z"),
    habitLog("old", "2026-09-05T21:59:00Z", { local_date: "2026-09-05" }),
    habitLog("next", "2026-09-06T22:00:00Z", { local_date: "2026-09-07" }),
  ];
  sources.tasks = Array.from({ length: 30 }, (_, i) =>
    task({ id: String(i), created_at: "2026-09-06T07:00:00Z" }),
  );
  const result = today(sources).events;
  expect(result).toHaveLength(31);
  expect(result[0]).toMatchObject({
    kind: "HABIT",
    title: "Habit · 1 heute",
    time: "00:01",
  });
  sources.tasks.reverse();
  sources.habits.reverse();
  expect(today(sources).events).toEqual(result);
});
it("suppresses review creation and metadata saves, retaining actual completion only", () => {
  const sources = emptyActivitySources();
  sources.reviews = [
    {
      id: "r",
      kind: "daily",
      period_start: "2026-09-06",
      created_at: "2026-09-06T07:00:00Z",
      updated_at: "2026-09-06T08:00:00Z",
      completed_at: "2026-09-06T09:00:00Z",
      archived_at: null,
    },
  ] as ActivitySources["reviews"];
  expect(today(sources).events.map((e) => e.kind)).toEqual([
    "REVIEW COMPLETED",
  ]);
});
