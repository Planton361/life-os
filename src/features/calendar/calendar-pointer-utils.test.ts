import { describe, expect, it } from "vitest";
import {
  CALENDAR_DAY_END_MINUTES,
  CALENDAR_DAY_START_MINUTES,
} from "./calendar-mock-data";
import {
  CALENDAR_POINTER_SNAP_MINUTES,
  calendarMinutesToTime,
  calendarSlotFromRelativeOffset,
  resizedCalendarDuration,
  snapCalendarMinutes,
} from "./calendar-pointer-utils";

describe("calendar pointer slot mapping", () => {
  it("uses one deterministic 15-minute snap contract", () => {
    expect(CALENDAR_POINTER_SNAP_MINUTES).toBe(15);
    expect(snapCalendarMinutes(9 * 60 + 8)).toBe(9 * 60 + 15);
    expect(calendarMinutesToTime(snapCalendarMinutes(9 * 60 + 8))).toBe(
      "09:15",
    );
  });

  it("maps a relative week-grid position without depending on a viewport pixel size", () => {
    expect(
      calendarSlotFromRelativeOffset({
        durationMinutes: 45,
        relativeOffset:
          (9 * 60 + 8 - CALENDAR_DAY_START_MINUTES) /
          (CALENDAR_DAY_END_MINUTES - CALENDAR_DAY_START_MINUTES),
      }),
    ).toBe(9 * 60 + 15);
  });

  it("keeps a dropped task within the visible planning day", () => {
    expect(
      calendarSlotFromRelativeOffset({
        durationMinutes: 90,
        relativeOffset: 1,
      }),
    ).toBe(CALENDAR_DAY_END_MINUTES - 90);
  });

  it("resizes from the block bottom with the same snap and minimum duration", () => {
    expect(
      resizedCalendarDuration({
        relativeOffset:
          (10 * 60 + 7 - CALENDAR_DAY_START_MINUTES) /
          (CALENDAR_DAY_END_MINUTES - CALENDAR_DAY_START_MINUTES),
        startMinutes: 9 * 60,
      }),
    ).toBe(60);
    expect(
      resizedCalendarDuration({
        relativeOffset:
          (8 * 60 - CALENDAR_DAY_START_MINUTES) /
          (CALENDAR_DAY_END_MINUTES - CALENDAR_DAY_START_MINUTES),
        startMinutes: 9 * 60,
      }),
    ).toBe(15);
  });
});
