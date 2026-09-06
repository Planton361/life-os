import { describe, expect, it } from "vitest";
import { resolveCalendarRailMode } from "./calendar-rail-mode";
describe("Calendar rail mode", () => {
  it("defaults to Queue without a selected block", () => {
    expect(resolveCalendarRailMode()).toEqual({ type: "queue" });
  });
  it("opens one temporary block inspector and returns to Queue on deselect", () => {
    expect(resolveCalendarRailMode("task-a")).toEqual({
      type: "selection",
      blockId: "task-a",
    });
    expect(resolveCalendarRailMode(undefined)).toEqual({ type: "queue" });
  });
});
