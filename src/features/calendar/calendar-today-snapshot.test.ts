import { describe, expect, it } from "vitest";
import { calendarTodaySnapshot } from "./calendar-today-snapshot";
import type { CalendarDayViewModel } from "./calendar-types";

function day(date: string, isToday: boolean): CalendarDayViewModel {
  return {
    id: date,
    date,
    isToday,
    dayNumber: date.slice(-2),
    weekday: "Sun",
    fullLabel: date,
  };
}

describe("Calendar request today snapshot", () => {
  it("keeps Manual's existing local day across the UTC boundary", () => {
    const days = [day("2026-10-10", false), day("2026-10-11", true)];
    expect(
      calendarTodaySnapshot({ profileId: "manual", days }, "2026-10-10"),
    ).toBe("2026-10-11");
  });

  it("uses the next request's day instead of retaining module initialization's day", () => {
    expect(
      calendarTodaySnapshot(
        { profileId: "manual", days: [day("2026-10-10", true)] },
        "2026-10-10",
      ),
    ).toBe("2026-10-10");
    expect(
      calendarTodaySnapshot(
        { profileId: "manual", days: [day("2026-10-11", true)] },
        "2026-10-11",
      ),
    ).toBe("2026-10-11");
  });

  it.each(["demo", "empty"] as const)(
    "preserves %s's UTC Today control independently of its viewModel day",
    (profileId) => {
      expect(
        calendarTodaySnapshot(
          {
            profileId,
            days: [
              day(profileId === "demo" ? "2026-06-12" : "2026-10-11", true),
            ],
          },
          "2026-10-10",
        ),
      ).toBe("2026-10-10");
    },
  );

  it("retains the request UTC fallback when no day is marked", () => {
    expect(
      calendarTodaySnapshot({ profileId: "manual", days: [] }, "2026-10-11"),
    ).toBe("2026-10-11");
  });
});
