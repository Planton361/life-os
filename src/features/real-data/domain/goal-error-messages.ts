// Readable German text for Goal command codes, shared by both runtimes (#200).
const goalErrorMessages: Record<string, string> = {
  GOAL_ACHIEVEMENT_REQUIRES_ACTIVE:
    "Nur aktive Goals können erreicht werden. Goal zuerst aktivieren.",
  GOAL_ACHIEVEMENT_NO_ACTIVE_CRITERIA:
    "Mindestens ein aktives Kriterium ist erforderlich.",
  GOAL_ACHIEVEMENT_CRITERIA_NOT_MET:
    "Alle aktiven Kriterien müssen erfüllt sein.",
  GOAL_ACHIEVEMENT_MILESTONES_NOT_ACHIEVED:
    "Alle nicht archivierten Etappen müssen erreicht sein.",
  GOAL_ACHIEVEMENT_GOAL_ARCHIVED:
    "Ein archiviertes Goal kann nicht erreicht werden.",
  GOAL_ARCHIVED: "Ein archiviertes Goal kann nicht verändert werden.",
  GOAL_READ_ONLY:
    "Ein erreichtes Goal ist schreibgeschützt. Öffne es zuerst wieder.",
  GOAL_NOT_FOUND: "Das Goal wurde im aktuellen Benutzerkontext nicht gefunden.",
  GOAL_CRITERION_NOT_FOUND:
    "Das Kriterium wurde im aktuellen Benutzerkontext nicht gefunden.",
  GOAL_MILESTONE_NOT_FOUND:
    "Die Etappe wurde im aktuellen Benutzerkontext nicht gefunden.",
  GOAL_CRITERION_ARCHIVED:
    "Ein archiviertes Kriterium kann nicht bewertet werden.",
  GOAL_CRITERION_ACHIEVED_REQUIRES_REOPEN:
    "Öffne das Ziel zuerst wieder, bevor du das Kriterium änderst.",
  GOAL_DEFERRED_EVALUATION_SHAPE:
    "Eine „Später prüfen“-Bewertung darf keinen Wert und keine Einheit enthalten.",
  GOAL_NUMERIC_EVALUATION_UNIT:
    "Die Einheit der Bewertung muss exakt zum Kriterium passen.",
  GOAL_NUMERIC_FINITE_REQUIRED: "Bitte einen gültigen Messwert eingeben.",
  GOAL_BOOLEAN_EVALUATION_SHAPE:
    "Boolean-Kriterien akzeptieren nur true oder false.",
  GOAL_PROJECT_SUPPORT_TARGET_INVALID:
    "Das Project gehört nicht zu diesem Goal oder ist archiviert.",
  GOAL_TASK_SUPPORT_TARGET_INVALID:
    "Der Task gehört nicht mehr zum aktiven Benutzerkontext.",
  GOAL_TASK_SUPPORT_GOAL_CONFLICT:
    "Der Task hat widersprüchliche direkte und geerbte Goal-Zuordnungen.",
  GOAL_TASK_SUPPORT_GOAL_MISMATCH: "Der Task gehört nicht zu diesem Goal.",
  GOAL_TASK_REQUIRES_CURRENT_MILESTONE:
    "Tasks können nur der aktuellen Etappe hinzugefügt werden.",
  GOAL_MILESTONE_ARCHIVED:
    "Eine archivierte Etappe kann nicht verknüpft werden.",
  GOAL_MILESTONE_STATUS_TRANSITION_INVALID:
    "Dieser Etappenstatuswechsel ist im akzeptierten Lebenszyklus nicht erlaubt.",
  GOAL_STALE_STATE:
    "Der Stand hat sich geändert. Lade das Goal neu und wiederhole die Entscheidung.",
  GOAL_COMMAND_FINGERPRINT_MISMATCH:
    "Diese Entscheidung wurde bereits mit einem anderen Inhalt verwendet.",
  GOAL_MILESTONE_ACHIEVE_REQUIRES_ACTIVE:
    "Eine Etappe muss aktiv sein, bevor sie erreicht werden kann.",
  GOAL_MILESTONE_OPEN_EPISODE_NOT_FOUND:
    "Für diese Etappe wurde keine offene Erreichungsepisode gefunden.",
  GOAL_OPEN_EPISODE_NOT_FOUND:
    "Für dieses Goal wurde keine offene Erreichungsepisode gefunden.",
  GOAL_REOPEN_REQUIRES_ACHIEVED:
    "Nur ein erreichtes Goal kann wieder geöffnet werden.",
  GOAL_MILESTONE_EVENT_NOT_FOUND:
    "Die Etappenentscheidung ist im aktuellen Benutzerkontext nicht verfügbar.",
  GOAL_EVENT_NOT_FOUND:
    "Die Zielentscheidung ist im aktuellen Benutzerkontext nicht verfügbar.",
  GOAL_EVENT_CORRECTION_REASON_REQUIRED:
    "Für eine Verlaufsänderung ist eine Begründung erforderlich.",
  GOAL_EVIDENCE_ACTION_INVALID: "Diese Belegänderung ist nicht erlaubt.",
  GOAL_EVIDENCE_REFERENCE_REQUIRED:
    "Eine bestehende Belegreferenz muss ausgewählt werden.",
  GOAL_EVIDENCE_REFERENCE_NOT_FOUND:
    "Die zu ändernde Belegreferenz wurde nicht gefunden.",
  GOAL_EVIDENCE_REFERENCE_ALREADY_SUPERSEDED:
    "Diese Belegreferenz wurde bereits korrigiert; verwende die letzte Referenz der Kette.",
  GOAL_EVIDENCE_REASON_REQUIRED:
    "Für Ersetzen, Zurücknehmen oder retrospektives Ergänzen ist ein Grund erforderlich.",
  GOAL_EVIDENCE_SOURCE_REQUIRED:
    "Für diese Belegänderung muss eine aktive Quelle ausgewählt werden.",
  GOAL_EVIDENCE_REPLACEMENT_SAME_SOURCE:
    "Ein Ersatz muss auf eine neue zulässige Quelle zeigen.",
  GOAL_RETROSPECTIVE_SUPPLEMENT_REQUIRED:
    "Retrospektive Ergänzungen müssen ausdrücklich markiert werden.",
  GOAL_EVIDENCE_SOURCE_INVALID:
    "Die Belegquelle ist nicht mehr aktiv oder gehört nicht zum aktuellen Benutzer.",
  GOAL_EVIDENCE_SOURCE_TYPE_INVALID:
    "Dieser Belegtyp ist für diese Entscheidung nicht erlaubt.",
  GOAL_CONTEXT_AREA_INVALID:
    "Die Area gehört nicht zum aktuellen Benutzerkontext.",
  GOAL_CONTEXT_TITLE_REQUIRED: "Bitte einen Titel eingeben.",
  GOAL_INPUT_INVALID: "Bitte prüfe deine Eingaben.",
};

const goalErrorFallback = "Die Ziel-Änderung konnte nicht gespeichert werden.";

/** Readable text for a known Goal code contained in `message`, if any. */
export function knownGoalErrorMessage(message: string) {
  return Object.entries(goalErrorMessages).find(([code]) =>
    message.includes(code),
  )?.[1];
}

/** User-facing Goal error: known code → German text, raw code → fallback. */
export function goalErrorMessage(message?: string | null) {
  if (!message) return goalErrorFallback;
  return (
    knownGoalErrorMessage(message) ??
    (/GOAL_[A-Z_]+/.test(message) ? goalErrorFallback : message)
  );
}
