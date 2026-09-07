/** Local training time uses the existing Europe/Berlin product timezone.
 * Nonexistent DST wall times are rejected; repeated times use the first instant.
 */
export function runningStartInstant(date: string, time: string): string | null {
  const wall = Date.parse(`${date}T${time}:00Z`);
  if (!Number.isFinite(wall)) return null;
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const candidates = new Set<number>();
  // Sample either side of a transition to obtain both offsets, then round-trip.
  for (const delta of [-86400000, 0, 86400000]) {
    const sample = wall + delta;
    const local = formatter.format(new Date(sample)).replace(" ", "T");
    const offset = Date.parse(`${local}:00Z`) - sample;
    const instant = wall - offset;
    if (formatter.format(new Date(instant)) === `${date} ${time}`)
      candidates.add(instant);
  }
  return candidates.size
    ? new Date(Math.min(...candidates)).toISOString()
    : null;
}
