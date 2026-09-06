import { describe, expect, it } from "vitest";
import {
  CALENDAR_DAY_DURATION_MINUTES,
  CALENDAR_DAY_END_MINUTES,
  CALENDAR_DAY_HOUR_COUNT,
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
    expect(calendarMinutesToTime(CALENDAR_DAY_END_MINUTES)).toBe("00:00");
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

describe("canonical duration geometry", () => {
  it("uses exactly 18 equal hours from 06:00 through the 00:00 boundary", () => {
    expect(CALENDAR_DAY_START_MINUTES).toBe(6 * 60);
    expect(CALENDAR_DAY_END_MINUTES).toBe(24 * 60);
    expect(CALENDAR_DAY_DURATION_MINUTES).toBe(1080);
    expect(CALENDAR_DAY_HOUR_COUNT).toBe(18);
  });

  it.each([
    ["06:00", 6 * 60, 0],
    ["12:00", 12 * 60, 100 / 3],
    ["15:00", 15 * 60, 50],
    ["18:00", 18 * 60, 200 / 3],
    ["21:00", 21 * 60, 250 / 3],
    ["23:00", 23 * 60, 850 / 9],
    ["23:30", 23 * 60 + 30, 875 / 9],
    ["00:00 boundary", 24 * 60, 100],
  ])("maps %s to %f percent of the visible day", async (_, minutes, top) => {
    const { buildCalendarTimedBlocks } =
      await import("./calendar-view-model");
    const { timedBlocks } = await import("./calendar-mock-data");
    const point = buildCalendarTimedBlocks([
      {
        ...timedBlocks[0],
        id: `point-${minutes}`,
        startMinutes: minutes,
        endMinutes: minutes,
      },
    ])[0];

    expect(point.layout.top).toBeCloseTo(top);
  });

  it.each([15, 30, 45, 60, 90])(
    "maps %i minutes proportionally in persisted layout and pointer preview",
    async (duration) => {
      const { calendarDurationToHeightPercent } =
        await import("./calendar-pointer-utils");
      const { buildCalendarTimedBlocks } =
        await import("./calendar-view-model");
      const { timedBlocks } = await import("./calendar-mock-data");
      const source = timedBlocks[0];
      const block = buildCalendarTimedBlocks([
        { ...source, startMinutes: 480, endMinutes: 480 + duration },
      ])[0];
      const range = CALENDAR_DAY_END_MINUTES - CALENDAR_DAY_START_MINUTES;
      expect(block.layout.height).toBeCloseTo((duration / range) * 100);
      expect(block.layout.top).toBeCloseTo(
        ((480 - CALENDAR_DAY_START_MINUTES) / range) * 100,
      );
      expect(calendarDurationToHeightPercent(duration)).toBeCloseTo(
        block.layout.height,
      );
      expect((block.layout.height / 100) * ((range / 60) * 72)).toBeCloseTo(
        (duration / 60) * 72,
      );
    },
  );
  it("does not invent overlaps between adjacent half-hour blocks", async () => {
    const { buildCalendarTimedBlocks } = await import("./calendar-view-model");
    const { timedBlocks } = await import("./calendar-mock-data");
    const blocks = buildCalendarTimedBlocks([
      { ...timedBlocks[0], id: "a", startMinutes: 480, endMinutes: 510 },
      { ...timedBlocks[0], id: "b", startMinutes: 510, endMinutes: 540 },
    ]);
    expect(blocks.map((b) => b.layout.laneCount)).toEqual([1, 1]);
  });

  it.each([626, 986, 1707])(
    "preserves minute proportions when the visible day flexes to %i pixels",
    async (availableHeight) => {
      const { buildCalendarTimedBlocks } =
        await import("./calendar-view-model");
      const { timedBlocks } = await import("./calendar-mock-data");
      const [halfHour, hour] = buildCalendarTimedBlocks([
        {
          ...timedBlocks[0],
          id: "half-hour",
          startMinutes: 480,
          endMinutes: 510,
        },
        {
          ...timedBlocks[0],
          id: "hour",
          startMinutes: 600,
          endMinutes: 660,
        },
      ]);
      const halfHourPixels = (halfHour.layout.height / 100) * availableHeight;
      const hourPixels = (hour.layout.height / 100) * availableHeight;

      expect(halfHourPixels / hourPixels).toBeCloseTo(0.5);
      expect(hourPixels).toBeCloseTo(
        availableHeight / CALENDAR_DAY_HOUR_COUNT,
      );
    },
  );

  it.each([
    ["23:00–23:30", 23 * 60, 23 * 60 + 30, 850 / 9, 25 / 9, 875 / 9],
    [
      "23:30–00:00",
      23 * 60 + 30,
      24 * 60,
      875 / 9,
      25 / 9,
      100,
    ],
    ["23:00–00:00", 23 * 60, 24 * 60, 850 / 9, 50 / 9, 100],
  ])(
    "keeps %s inside the final equal hour interval",
    async (_, startMinutes, endMinutes, top, height, bottom) => {
      const { buildCalendarTimedBlocks } =
        await import("./calendar-view-model");
      const { timedBlocks } = await import("./calendar-mock-data");
      const block = buildCalendarTimedBlocks([
        {
          ...timedBlocks[0],
          id: `boundary-${startMinutes}-${endMinutes}`,
          startMinutes,
          endMinutes,
        },
      ])[0];

      expect(block.layout.top).toBeCloseTo(top);
      expect(block.layout.height).toBeCloseTo(height);
      expect(block.layout.top + block.layout.height).toBeCloseTo(bottom);
    },
  );
});
