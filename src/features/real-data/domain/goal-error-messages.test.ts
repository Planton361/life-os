import { describe, expect, it } from "vitest";
import { goalErrorMessage, knownGoalErrorMessage } from "./goal-error-messages";

describe("goalErrorMessage", () => {
  it("translates raw SQLite Goal codes", () => {
    expect(goalErrorMessage("GOAL_STALE_STATE")).toBe(
      "Der Stand hat sich geändert. Lade das Goal neu und wiederhole die Entscheidung.",
    );
    expect(goalErrorMessage("GOAL_REOPEN_REQUIRES_ACHIEVED")).toBe(
      "Nur ein erreichtes Goal kann wieder geöffnet werden.",
    );
    expect(goalErrorMessage("GOAL_READ_ONLY")).not.toMatch(/GOAL_/);
  });

  it("finds codes inside PostgreSQL error text and keeps the specific match", () => {
    expect(
      knownGoalErrorMessage('ERROR: GOAL_ACHIEVEMENT_GOAL_ARCHIVED (P0001)'),
    ).toBe("Ein archiviertes Goal kann nicht erreicht werden.");
    expect(knownGoalErrorMessage("GOAL_MILESTONE_EVENT_NOT_FOUND")).toBe(
      "Die Etappenentscheidung ist im aktuellen Benutzerkontext nicht verfügbar.",
    );
  });

  it("never shows an unknown raw code and keeps readable adapter text", () => {
    expect(goalErrorMessage("GOAL_TABLE_INVALID")).toBe(
      "Die Ziel-Änderung konnte nicht gespeichert werden.",
    );
    expect(goalErrorMessage(undefined)).toBe(
      "Die Ziel-Änderung konnte nicht gespeichert werden.",
    );
    expect(goalErrorMessage("Goal konnte nicht gespeichert oder geladen werden.")).toBe(
      "Goal konnte nicht gespeichert oder geladen werden.",
    );
  });
});
