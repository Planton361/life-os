import { describe, expect, it } from "vitest";
import { educationLogSignal, sortEducationLogs, type EducationLog } from "./education-log";

const log = (overrides: Partial<EducationLog>): EducationLog => ({ archivedAt: null, createdAt: "2026-07-13T10:00:00Z", durationMinutes: 30, focus: "Focus", id: "a", logDate: "2026-07-13", logType: "learning", notes: null, outcome: "Outcome", projectId: "project", startTime: null, unitsCompleted: null, wordCountDelta: null, ...overrides });

describe("education log signals", () => {
  it("filters 7 and 30 days, aggregates duration and separates learning and writing", () => {
    const logs = [log({ id: "learning", unitsCompleted: 3 }), log({ id: "writing", logDate: "2026-06-20", logType: "writing", wordCountDelta: -120 }), log({ id: "old", logDate: "2026-06-01", logType: "writing", wordCountDelta: 999 })];
    expect(educationLogSignal(logs, "2026-07-13", 7)).toEqual({ count: 1, durationMinutes: 30, unitsCompleted: 3, wordCountDelta: 0 });
    expect(educationLogSignal(logs, "2026-07-13", 30)).toEqual({ count: 2, durationMinutes: 60, unitsCompleted: 3, wordCountDelta: -120 });
  });

  it("excludes archives and sorts deterministically by date, time, creation and id", () => {
    const logs = [log({ id: "b", startTime: "09:00" }), log({ id: "a", startTime: "09:00" }), log({ id: "archive", archivedAt: "2026-07-13T12:00:00Z", unitsCompleted: 99 })];
    expect(educationLogSignal(logs, "2026-07-13", 7).unitsCompleted).toBe(0);
    expect(sortEducationLogs(logs).map((entry) => entry.id)).toEqual(["b", "a", "archive"]);
  });
});
