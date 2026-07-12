import { dashboardLocalDate } from "@/features/dashboard/dashboard-read-model";

export const reviewTimeZone = "Europe/Berlin";

export function reviewToday() {
  return dashboardLocalDate(new Date(), reviewTimeZone);
}

function addUtcDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function nextLocalDate(date: string) {
  return addUtcDays(date, 1);
}

export function reviewWeek(date = reviewToday()) {
  const value = new Date(`${date}T00:00:00.000Z`);
  const day = value.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = addUtcDays(date, mondayOffset);

  return { end: addUtcDays(start, 6), start };
}
