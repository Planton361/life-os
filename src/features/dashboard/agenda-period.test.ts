import { expect, it } from "vitest";
import { dashboardAgendaDays } from "./agenda-period";
it("maps weeks Monday through Sunday across year boundaries", () => {
  const days = dashboardAgendaDays("2027-01-01", "Week");
  expect(days[0].date).toBe("2026-12-28");
  expect(days[6].date).toBe("2027-01-03");
});
it("maps a bounded month grid including leap day", () => {
  const days = dashboardAgendaDays("2024-02-14", "Month");
  expect(days).toHaveLength(42);
  expect(days.filter((day) => day.inMonth)).toHaveLength(29);
});
