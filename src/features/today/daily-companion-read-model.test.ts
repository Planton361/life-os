import { describe, expect, it } from "vitest";
import {
  buildDailyCompanionTaskProjection,
  dailyCompanionTaskStatusLabel,
} from "./daily-companion-read-model";

describe("daily companion task projection", () => {
  const today = "2026-09-03";

  it("derives planned, scheduled, done and open work from one task source", () => {
    const projection = buildDailyCompanionTaskProjection(
      [
        { date: today, id: "scheduled-open", startTime: "09:00", status: "planned" },
        { date: today, id: "scheduled-done", startTime: "10:00", status: "done" },
        { date: today, id: "flexible-open", status: "planned" },
        { date: today, id: "canceled", status: "canceled" },
        { date: "2026-09-04", id: "tomorrow", status: "planned" },
      ],
      today,
    );

    expect(projection.planned.map((task) => task.id)).toEqual([
      "scheduled-open",
      "scheduled-done",
      "flexible-open",
    ]);
    expect(projection.scheduled.map((task) => task.id)).toEqual([
      "scheduled-open",
      "scheduled-done",
    ]);
    expect(projection.completed.map((task) => task.id)).toEqual(["scheduled-done"]);
    expect(projection.open.map((task) => task.id)).toEqual([
      "scheduled-open",
      "flexible-open",
    ]);
  });

  it("labels execution state without persisting a second task truth", () => {
    expect(dailyCompanionTaskStatusLabel({ id: "done", status: "done" })).toBe("Done");
    expect(dailyCompanionTaskStatusLabel({ id: "scheduled", startTime: "09:00", status: "planned" })).toBe("Scheduled");
    expect(dailyCompanionTaskStatusLabel({ id: "open", status: "planned" })).toBe("Open planned");
  });
});
