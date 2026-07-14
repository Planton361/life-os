import { describe, expect, it } from "vitest";
import {
  activeAntiRotActions,
  currentAntiRotRecommendation,
  selectAntiRotAction,
  sortAntiRotHistory,
  type AntiRotAction,
  type AntiRotEvent,
} from "./anti-rot";
const action = (
  id: string,
  overrides: Partial<AntiRotAction> = {},
): AntiRotAction => ({
  archivedAt: null,
  category: null,
  createdAt: `2026-07-14T00:00:0${id}.000Z`,
  description: null,
  energy: null,
  estimatedMinutes: null,
  id,
  status: "active",
  title: id,
  updatedAt: "2026-07-14T00:00:00.000Z",
  ...overrides,
});
const event = (
  id: string,
  actionId: string,
  eventType: AntiRotEvent["eventType"],
  recommendationEventId: string | null = null,
): AntiRotEvent => ({
  actionId,
  createdAt: `2026-07-14T00:00:0${id}.000Z`,
  eventType,
  id,
  recommendationEventId,
});
describe("Anti-Rot pure lifecycle", () => {
  it("selects only active, non-archived actions", () => {
    expect(
      activeAntiRotActions([
        action("1"),
        action("2", { status: "paused" }),
        action("3", { archivedAt: "2026-07-14" }),
      ]).map((item) => item.id),
    ).toEqual(["1"]);
  });
  it("uses stable least-recently-used rotation", () => {
    expect(
      selectAntiRotAction(
        [action("1"), action("2")],
        [event("3", "1", "recommended")],
      )?.id,
    ).toBe("2");
  });
  it("avoids the immediately skipped action when an alternative exists", () => {
    expect(
      selectAntiRotAction(
        [action("1"), action("2")],
        [event("3", "1", "skipped", "0")],
      )?.id,
    ).toBe("2");
  });
  it("derives one open recommendation and treats repeated resolutions idempotently", () => {
    const events = [
      event("1", "1", "recommended"),
      event("2", "1", "completed", "1"),
    ];
    expect(currentAntiRotRecommendation(events)).toBeNull();
    expect(
      currentAntiRotRecommendation([
        ...events,
        event("3", "1", "completed", "1"),
      ]),
    ).toBeNull();
  });
  it("keeps an unresolved recommendation current", () => {
    expect(
      currentAntiRotRecommendation([event("1", "1", "recommended")])?.id,
    ).toBe("1");
  });
  it("sorts history deterministically", () => {
    expect(
      sortAntiRotHistory([
        event("1", "1", "recommended"),
        event("2", "2", "recommended"),
      ]).map((item) => item.id),
    ).toEqual(["2", "1"]);
  });
});
