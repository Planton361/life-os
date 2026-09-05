import { describe, expect, it } from "vitest";
import {
  inboxClarificationSchema,
  inboxRouteSchema,
} from "./inbox-workspace.schemas";
const valid = {
  inboxItemId: "ad47db5c-e771-40a5-8bf3-64a73e7c7c18",
  expectedUpdatedAt: "2026-09-06T12:00:00Z",
  title: "Thought",
  body: "Context",
  nextAction: "Ask",
  missingInfo: "Who?",
  priority: "P1",
  energy: "high",
  durationMinutes: 45,
  areaId: null,
  reviewNeeded: true,
  todayCandidate: false,
  deadlineHint: "2026-10-01",
};
describe("Inbox workspace boundary", () => {
  it("accepts clearing optional fields and preserves explicit false signals", () => {
    expect(
      inboxClarificationSchema.parse({
        ...valid,
        body: "",
        nextAction: null,
        missingInfo: "",
        energy: null,
        durationMinutes: null,
        deadlineHint: null,
        reviewNeeded: false,
      }).reviewNeeded,
    ).toBe(false);
  });
  it.each([
    { title: " " },
    { durationMinutes: 0 },
    { durationMinutes: 1.5 },
    { energy: "fake" },
    { areaId: "someone" },
    { deadlineHint: "2026-02-30" },
    { expectedUpdatedAt: "" },
  ])("rejects invalid persisted input %j", (patch) => {
    expect(
      inboxClarificationSchema.safeParse({ ...valid, ...patch }).success,
    ).toBe(false);
  });
  it("requires a real target for existing routes", () => {
    expect(
      inboxRouteSchema.safeParse({
        ...valid,
        route: "existing_project",
        targetId: null,
      }).success,
    ).toBe(false);
    expect(
      inboxRouteSchema.safeParse({
        ...valid,
        route: "existing_goal",
        targetId: valid.inboxItemId,
      }).success,
    ).toBe(true);
    expect(
      inboxRouteSchema.safeParse({
        ...valid,
        route: "universal",
        targetId: null,
      }).success,
    ).toBe(false);
  });
});
