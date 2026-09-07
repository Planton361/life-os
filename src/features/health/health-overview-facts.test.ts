import { describe, it, expect } from "vitest";
import { projectHealthOverviewFacts } from "./health-overview-facts";
import type { HealthOverviewViewModel } from "./types";
import type { HealthSnapshot } from "../real-data/domain/health";
import type { TrainingSnapshot } from "../real-data/domain/training";
const base = {
  contentStates: {},
  mentalHealth: { sleep: {}, journal: {} },
  habits: { heatmap: { rows: [] }, metrics: [{ value: "0" }] },
  strength: { trainingPattern: {}, sessionBalance: {} },
} as unknown as HealthOverviewViewModel;
const health = {
  moods: [{ mood: "focused", localDate: "2026-09-07" }],
  sleep: [
    { sleepDate: "2026-09-07", durationMinutes: 462 },
    { sleepDate: "2026-08-30", durationMinutes: 300 },
  ],
  weights: [],
  weightGoal: null,
} as unknown as HealthSnapshot;
describe("canonical Health overview facts", () => {
  it("shows saved Mood and the seven-day sleep mean without old manual-profile signals", () => {
    const view = projectHealthOverviewFacts(
      base,
      health,
      [],
      null,
      "2026-09-07",
    );
    expect(view.mentalHealth.badge).toBe("Fokussiert");
    expect(view.mentalHealth.moodDirections[0].pattern).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      true,
    ]);
    expect(view.mentalHealth.sleep.value).toBe("7h 42m");
    expect(view.mentalHealth.sleep.bars[0].value).toBe(0);
    expect(view.mentalHealth.sleep.bars[6].value).toBeCloseTo(462 / 1440);
    expect(view.mentalHealth.sleep.bars[6].label).toBe("7h 42m");
    expect(view.contentStates.mentalHealth.state).not.toBe("empty");
  });
  it("does not turn an empty snapshot into activity", () =>
    expect(
      projectHealthOverviewFacts(base, null, [], null, "2026-09-07")
        .contentStates.page.state,
    ).toBe("empty"));
  it("classifies training only by canonical session plan linkage, with archived sessions excluded", () => {
    const training = {
      strengthSessions: [
        {
          sessionDate: "2026-09-07",
          status: "completed",
          planId: null,
          archivedAt: null,
        },
        {
          sessionDate: "2026-09-07",
          status: "completed",
          planId: "p",
          archivedAt: null,
        },
        {
          sessionDate: "2026-09-07",
          status: "completed",
          planId: "p",
          archivedAt: "archived",
        },
      ],
      runningSessions: [],
    } as unknown as TrainingSnapshot;
    const view = projectHealthOverviewFacts(
      base,
      null,
      [],
      training,
      "2026-09-07",
    );
    expect(view.strength.trainingPattern.days[0].intensity).toBe(0);
    expect(view.strength.trainingPattern.days[13].intensity).toBe(1);
    expect(view.strength.trainingPattern.days[13].label).toBe("2 Sessions");
    expect(
      view.strength.sessionBalance.items.map((i) => [i.label, i.count]),
    ).toEqual([
      ["Mit Plan", 1],
      ["Frei", 1],
    ]);
  });
});
