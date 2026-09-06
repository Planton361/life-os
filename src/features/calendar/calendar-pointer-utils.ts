import {
  CALENDAR_DAY_END_MINUTES,
  CALENDAR_DAY_START_MINUTES,
} from "./calendar-mock-data";

export const CALENDAR_POINTER_SNAP_MINUTES = 15;
export const CALENDAR_MINIMUM_DURATION_MINUTES = 15;

export function timeToCalendarMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

export function calendarMinutesToTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function snapCalendarMinutes(minutes: number) {
  return (
    Math.round(minutes / CALENDAR_POINTER_SNAP_MINUTES) *
    CALENDAR_POINTER_SNAP_MINUTES
  );
}

export function calendarDurationToHeightPercent(durationMinutes: number) {
  const range = CALENDAR_DAY_END_MINUTES - CALENDAR_DAY_START_MINUTES;

  return (Math.max(0, durationMinutes) / range) * 100;
}

export function calendarSlotFromRelativeOffset({
  durationMinutes,
  relativeOffset,
}: {
  durationMinutes: number;
  relativeOffset: number;
}) {
  const range = CALENDAR_DAY_END_MINUTES - CALENDAR_DAY_START_MINUTES;
  const rawMinutes = CALENDAR_DAY_START_MINUTES + relativeOffset * range;
  const latestStart = Math.max(
    CALENDAR_DAY_START_MINUTES,
    CALENDAR_DAY_END_MINUTES - durationMinutes,
  );
  const snapped = snapCalendarMinutes(rawMinutes);

  return Math.max(CALENDAR_DAY_START_MINUTES, Math.min(latestStart, snapped));
}

export function resizedCalendarDuration({
  relativeOffset,
  startMinutes,
}: {
  relativeOffset: number;
  startMinutes: number;
}) {
  const range = CALENDAR_DAY_END_MINUTES - CALENDAR_DAY_START_MINUTES;
  const rawEnd = CALENDAR_DAY_START_MINUTES + relativeOffset * range;
  const snappedEnd = snapCalendarMinutes(rawEnd);
  const minimumEnd = startMinutes + CALENDAR_MINIMUM_DURATION_MINUTES;
  const endMinutes = Math.max(
    minimumEnd,
    Math.min(CALENDAR_DAY_END_MINUTES, snappedEnd),
  );

  return endMinutes - startMinutes;
}
