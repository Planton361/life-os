import type { CalendarViewModel } from "./calendar-types";

// Called by the Server Component once per request. Manual already carries its
// authoritative local day; Demo/Empty Today controls retain their UTC policy.
export function calendarTodaySnapshot(
  viewModel: Pick<CalendarViewModel, "profileId" | "days">,
  requestUtcToday: string,
): string {
  return viewModel.profileId === "manual"
    ? viewModel.days.find((day) => day.isToday)?.date ?? requestUtcToday
    : requestUtcToday;
}
