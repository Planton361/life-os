import { describe, expect, it } from "vitest";
import {
  taskScheduledMessage,
  taskTimeWriteFailedMessage,
} from "./task-schedule-messages";

describe("task schedule messages", () => {
  it("names the actual planned day instead of always today", () => {
    expect(taskScheduledMessage("schedule", "2026-11-11", "2026-11-11")).toBe(
      "Task für heute terminiert.",
    );
    expect(taskScheduledMessage("schedule", "2026-11-12", "2026-11-11")).toBe(
      "Task für Do., 12.11. terminiert.",
    );
    expect(taskScheduledMessage("plan", "2026-11-09", "2026-11-11")).toBe(
      "Task für Mo., 09.11. geplant.",
    );
  });

  it("explains failed time writes without naming a backend", () => {
    for (const operation of ["schedule", "reschedule", "unschedule"] as const) {
      const message = taskTimeWriteFailedMessage(operation);
      expect(message).not.toMatch(/supabase|sqlite/i);
      expect(message).toContain("Lade die Ansicht neu.");
    }
    expect(taskTimeWriteFailedMessage("reschedule")).toMatch(
      /^Der Task konnte nicht umgeplant werden\./,
    );
  });
});
