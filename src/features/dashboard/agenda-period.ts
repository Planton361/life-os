import type { CalendarViewModel } from "@/features/calendar/calendar-types";
export type DashboardAgendaView = "Day" | "Week" | "Month";
export function dashboardAgendaDays(
  today: string,
  view: Exclude<DashboardAgendaView, "Day">,
) {
  const anchor = new Date(`${today}T12:00:00Z`);
  if (view === "Month") anchor.setUTCDate(1);
  const month = anchor.getUTCMonth();
  const offset = (anchor.getUTCDay() + 6) % 7;
  anchor.setUTCDate(anchor.getUTCDate() - offset);
  const length = view === "Week" ? 7 : 42;
  return Array.from({ length }, (_, index) => {
    const date = new Date(anchor);
    date.setUTCDate(date.getUTCDate() + index);
    return {
      date: date.toISOString().slice(0, 10),
      inMonth: date.getUTCMonth() === month,
    };
  });
}
export function dashboardAgendaBlocks(
  calendar: CalendarViewModel,
  date: string,
) {
  return [...calendar.timedBlocks, ...calendar.allDayBlocks].filter(
    (block) => block.date === date,
  );
}
