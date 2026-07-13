import { describe, expect, it } from "vitest";
import { formatPace, muscleLoad, orderedPlanItems, paceSecondsPerKilometer, runningTotals, strengthVolume, workoutScheduleIdentity, type Exercise, type RunningSession, type StrengthSetLog } from "./training";

const session = (overrides: Partial<RunningSession> = {}): RunningSession => ({ id: "run", planItemId: null, sessionDate: "2026-07-13", startedAt: null, distanceKm: 5, durationMinutes: 30, averageHeartRate: null, notes: null, status: "completed", completedAt: "2026-07-13T10:00:00Z", archivedAt: null, ...overrides });
const setLog = (overrides: Partial<StrengthSetLog> = {}): StrengthSetLog => ({ id: "set", sessionId: "session", exerciseId: "exercise", setOrder: 1, repetitions: 10, weightKg: 20, notes: null, recordedAt: "2026-07-13T10:00:00Z", ...overrides });

describe("training domain", () => {
  it("derives pace deterministically and leaves missing inputs unknown", () => {
    expect(paceSecondsPerKilometer(5, 30)).toBe(360);
    expect(formatPace(4.8, 31)).toBe("6:28 / km");
    expect(formatPace(null, 30)).toBeNull();
  });
  it("aggregates only completed, active runs", () => {
    expect(runningTotals([session(), session({ id: "open", status: "in_progress", completedAt: null }), session({ id: "archived", archivedAt: "now" })])).toEqual({ distanceKm: 5, durationMinutes: 30, sessionCount: 1 });
  });
  it("separates weighted volume from honest unweighted repetitions", () => {
    expect(strengthVolume([setLog(), setLog({ id: "body", weightKg: null, repetitions: 12 })])).toEqual({ weightedSetCount: 1, weightedVolumeKg: 200, unweightedRepetitions: 12 });
  });
  it("derives muscle load only through explicit exercise mappings", () => {
    const exercises: Exercise[] = [{ id: "exercise", name: "Squat", description: null, equipment: null, archivedAt: null, muscles: ["Quadriceps", "Glutes"] }];
    expect(muscleLoad([setLog()], exercises)).toEqual([["Glutes", { sets: 1, weightedVolumeKg: 200, unweightedRepetitions: 0 }], ["Quadriceps", { sets: 1, weightedVolumeKg: 200, unweightedRepetitions: 0 }]]);
    expect(muscleLoad([setLog({ exerciseId: "unknown" })], exercises)).toEqual([]);
  });
  it("orders plan items deterministically", () => {
    expect(orderedPlanItems([{ id: "b", sortOrder: 2 }, { id: "a", sortOrder: 1 }]).map((item) => item.id)).toEqual(["a", "b"]);
  });
  it("uses one stable idempotency identity per workout source", () => {
    expect(workoutScheduleIdentity("running_plan_item", "unit")).toBe(workoutScheduleIdentity("running_plan_item", "unit"));
    expect(workoutScheduleIdentity("strength_plan", "unit")).not.toBe(workoutScheduleIdentity("running_plan_item", "unit"));
  });
});
