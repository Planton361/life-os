/** Task deadlines are instants; editors and Calendar expose the profile's day. */
export function taskDeadlineLocalDay(instant: string, zone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(instant));
  const part = (name: string) => parts.find((p) => p.type === name)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

// Extracted from the existing Inbox deadline rule. Try the actual offsets on
// both sides of a transition and verify the wall time, independent of host TZ.
export function taskDeadlineEndOfDay(date: string, zone: string): string {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date
  )
    throw new Error("TASK_DEADLINE_INVALID");
  const wall = Date.parse(`${date}T23:59:59Z`);
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const candidates: number[] = [];
  for (const delta of [-36, 0, 36]) {
    const sample = wall + delta * 3600000;
    const offset =
      Date.parse(formatter.format(new Date(sample)).replace(" ", "T") + "Z") -
      sample;
    const instant = wall - offset;
    if (
      formatter.format(new Date(instant)).replace(" ", "T") ===
      `${date}T23:59:59`
    )
      candidates.push(instant);
  }
  if (!candidates.length) throw new Error("TASK_DEADLINE_UNAVAILABLE");
  return new Date(Math.max(...candidates)).toISOString();
}

/** Missing fields and unchanged local days omit the key, preserving microseconds. */
export function taskDeadlinePatch(
  submitted: string | undefined,
  current: string | null,
  zone: string,
): { dueAt?: string | null } {
  if (submitted === undefined) return {};
  new Intl.DateTimeFormat("en", { timeZone: zone }).format(0);
  const currentDay = current ? taskDeadlineLocalDay(current, zone) : "";
  if (submitted === currentDay) return {};
  return {
    dueAt: submitted === "" ? null : taskDeadlineEndOfDay(submitted, zone),
  };
}
