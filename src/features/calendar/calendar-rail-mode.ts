export type CalendarRailMode =
  | { type: "queue" }
  | { type: "selection"; blockId: string };

export function resolveCalendarRailMode(blockId?: string): CalendarRailMode {
  return blockId ? { type: "selection", blockId } : { type: "queue" };
}
