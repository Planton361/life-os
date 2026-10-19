import { readFileSync, realpathSync } from "node:fs";
import { dirname, basename } from "node:path";
import { tmpdir } from "node:os";

// Only the disposable regression child imports this file. Production clocks,
// launchers and the installed personal service are never changed.
const clock = process.env.LIFE_OS_DISPOSABLE_CALENDAR_CLOCK;
if (
  !clock ||
  basename(clock) !== "calendar-clock.txt" ||
  !realpathSync(dirname(clock)).startsWith(`${realpathSync(tmpdir())}/life-os-`)
)
  throw new Error("DISPOSABLE_CALENDAR_CLOCK_BOUNDARY_REQUIRED");
const NativeDate = Date;
function now() {
  const value = readFileSync(clock, "utf8").trim();
  if (!/^2026-10-(10|11)T\d{2}:\d{2}:00\.000Z$/.test(value))
    throw new Error("DISPOSABLE_CALENDAR_CLOCK_VALUE_REQUIRED");
  return NativeDate.parse(value);
}
function FixtureDate(...args) {
  if (!new.target) return new NativeDate(now()).toString();
  return Reflect.construct(
    NativeDate,
    args.length ? args : [now()],
    new.target,
  );
}
// Next wraps Date using its own property descriptors, including parse/UTC.
// Preserve the full native API for that wrapper and for normal application use.
Object.defineProperties(FixtureDate, {
  ...Object.getOwnPropertyDescriptors(NativeDate),
  now: { ...Object.getOwnPropertyDescriptor(NativeDate, "now"), value: now },
});
globalThis.Date = FixtureDate;
