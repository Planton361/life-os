import type {
  WorkActivity,
  WorkArchitectureItem,
  WorkFollowUp,
  WorkLogEntry,
  WorkMeetingNote,
  WorkSection,
  WorkTask,
  WorkWikiEntry,
} from "./types";

export const mockWorkTasks: WorkTask[] = [
  {
    id: "task-understand-test-process",
    title: "Testprozess nachvollziehen",
    status: "in_progress",
    priority: "high",
    context:
      "Ein neutraler Prüfablauf soll in einzelne, wiederholbare Schritte zerlegt werden.",
    nextAction: "Offenen Prozessschritt als Review-Frage vorbereiten.",
    linkedActivityIds: [
      "activity-log-excerpt-analysis",
      "activity-testdata-flow",
      "activity-root-cause",
    ],
    linkedWikiEntryIds: ["wiki-testdata-check", "wiki-review-checklist"],
    updatedAt: "2026-06-20T15:20:00.000Z",
  },
  {
    id: "task-document-interface-behavior",
    title: "Schnittstellenverhalten dokumentieren",
    status: "open",
    priority: "medium",
    context:
      "Eine abstrakte Schnittstelle soll als persönliches Lernmodell beschrieben werden.",
    nextAction: "Unterschied zwischen Übergabepunkt und Prozessschritt im Wiki ergänzen.",
    linkedActivityIds: [
      "activity-log-excerpt-analysis",
      "activity-architecture-relation",
    ],
    linkedWikiEntryIds: ["wiki-interface-process", "wiki-validation-check"],
    updatedAt: "2026-06-20T13:40:00.000Z",
  },
  {
    id: "task-understand-validation-layer",
    title: "Validierungsschicht verstehen",
    status: "blocked",
    priority: "medium",
    context:
      "Die Validierung wird nur als generisches Konzept notiert, bis Review-Freigabe vorliegt.",
    nextAction: "Klärung notieren, welche Prüflogik allgemein beschrieben werden darf.",
    linkedActivityIds: ["activity-testdata-flow", "activity-root-cause"],
    linkedWikiEntryIds: ["wiki-validation-check", "wiki-testdata-check"],
    updatedAt: "2026-06-19T16:45:00.000Z",
  },
  {
    id: "task-structure-wiki-notes",
    title: "Wiki-Notizen strukturieren",
    status: "in_progress",
    priority: "low",
    context:
      "Persönliche Arbeitsnotizen sollen als Wiki-Einträge auffindbar bleiben.",
    nextAction: "Tags vereinheitlichen und veraltete Drafts prüfen.",
    linkedActivityIds: ["activity-process-note"],
    linkedWikiEntryIds: ["wiki-batch-process", "wiki-domain-key"],
    updatedAt: "2026-06-18T13:30:00.000Z",
  },
  {
    id: "task-collect-review-questions",
    title: "Review-Fragen für nächsten Termin sammeln",
    status: "open",
    priority: "high",
    context:
      "Offene Verständnisfragen werden vorbereitet, ohne vertrauliche Details zu speichern.",
    nextAction: "Fragenliste mit neutralen Begriffen formulieren.",
    linkedActivityIds: ["activity-architecture-relation"],
    linkedWikiEntryIds: ["wiki-review-checklist"],
    updatedAt: "2026-06-17T18:05:00.000Z",
  },
];

export const mockWorkActivities: WorkActivity[] = [
  {
    id: "activity-log-excerpt-analysis",
    taskId: "task-document-interface-behavior",
    title: "Log-Auszug analysiert",
    type: "analysis",
    date: "2026-06-20",
    durationLabel: "45 min",
    summary:
      "Ein neutralisierter Log-Hinweis wurde nach Zeitpunkt, erwarteter Wirkung und offenem Kontext sortiert.",
    result:
      "Der Hinweis passt eher zum Schnittstellenübergang als zum späteren Prozessschritt.",
    howItWasDone:
      "Beobachtung, Annahme und offene Frage wurden getrennt notiert, damit keine vertraulichen Details übernommen werden.",
    evidence:
      "Persönliche Zusammenfassung mit anonymisierten Zeit- und Ablaufhinweisen.",
    blockers: [],
    followUps: ["Wiki-Notiz zur Abgrenzung ergänzen"],
    linkedWikiEntryIds: ["wiki-interface-process"],
    linkedArchitectureItemIds: ["arch-import-interface"],
  },
  {
    id: "activity-testdata-flow",
    taskId: "task-understand-test-process",
    title: "Testdatenfluss rekonstruiert",
    type: "testing",
    date: "2026-06-19",
    durationLabel: "60 min",
    summary:
      "Der Weg von Eingabe über Prüfung bis Verarbeitung wurde als Lernskizze nachgebaut.",
    result:
      "Die Rolle der Validierungsschicht ist verständlicher, aber noch nicht vollständig geklärt.",
    howItWasDone:
      "Testdaten wurden nur als generische Kategorien beschrieben und mit einer privaten Checkliste verglichen.",
    evidence:
      "Neutrale Schrittfolge in der persönlichen Prozessnotiz.",
    blockers: ["Review-Freigabe für genaue Prozessinterpretation fehlt"],
    followUps: ["Validierungsfragen für nächsten Termin sammeln"],
    linkedWikiEntryIds: ["wiki-testdata-check", "wiki-validation-check"],
    linkedArchitectureItemIds: ["arch-data-flow", "arch-validation-layer"],
  },
  {
    id: "activity-process-note",
    taskId: "task-structure-wiki-notes",
    title: "Prozessnotiz geschrieben",
    type: "documentation",
    date: "2026-06-18",
    durationLabel: "35 min",
    summary:
      "Eine wiederverwendbare How-to-Notiz für die persönliche Datenprüfung wurde erstellt.",
    result:
      "Vorbereitung, Durchführung und Review-Schritt sind getrennt auffindbar.",
    howItWasDone:
      "Aus mehreren neutralen Beobachtungen wurde eine kurze Checkliste ohne interne Namen abgeleitet.",
    evidence: "Wiki-Entwurf mit Tags für Testdaten, Review und Checkliste.",
    blockers: [],
    followUps: ["Begriff fachlicher Schlüssel nachschlagen"],
    linkedWikiEntryIds: ["wiki-testdata-check", "wiki-domain-key"],
    linkedArchitectureItemIds: ["arch-review-dependency"],
  },
  {
    id: "activity-root-cause",
    taskId: "task-understand-validation-layer",
    title: "Fehlerursache eingegrenzt",
    type: "debugging",
    date: "2026-06-19",
    durationLabel: "50 min",
    summary:
      "Eine mögliche Ursache wurde als Verständnislücke zwischen Datenprüfung und Folgeprozess eingeordnet.",
    result:
      "Der nächste sinnvolle Schritt ist eine Review-Frage statt einer Annahme im Wiki.",
    howItWasDone:
      "Symptom, überprüfte Annahmen und offene Freigabe wurden getrennt protokolliert.",
    evidence: "Persönliche Fehlerursachen-Notiz ohne echte Log-Zeilen.",
    blockers: ["Exakte Ursache erst nach Review belastbar"],
    followUps: ["Unklaren Prozessschritt im nächsten Termin fragen"],
    linkedWikiEntryIds: ["wiki-review-checklist", "wiki-validation-check"],
    linkedArchitectureItemIds: ["arch-validation-layer"],
  },
  {
    id: "activity-architecture-relation",
    taskId: "task-collect-review-questions",
    title: "Architekturbeziehung skizziert",
    type: "research",
    date: "2026-06-17",
    durationLabel: "30 min",
    summary:
      "Die Beziehung zwischen Import, Prüfung und Review wurde als persönliche Kontextnotiz skizziert.",
    result:
      "Eine einfache Architekturfrage kann im nächsten Termin präzise gestellt werden.",
    howItWasDone:
      "Nur abstrakte Bausteine und Beziehungen wurden notiert, keine internen Systemnamen.",
    evidence: "Textgeführte Architekturkarte mit offenen Beziehungen.",
    blockers: [],
    followUps: ["Architekturbeziehung zwischen Prüfung und Import klären"],
    linkedWikiEntryIds: ["wiki-interface-process", "wiki-review-checklist"],
    linkedArchitectureItemIds: ["arch-import-interface", "arch-validation-layer"],
  },
];

export const mockWorkLogEntries: WorkLogEntry[] = [
  {
    id: "work-log-interface-behavior",
    title: "Schnittstellenverhalten nachvollzogen",
    date: "2026-06-20",
    status: "follow_up_open",
    taskIds: ["task-document-interface-behavior", "task-understand-test-process"],
    activityIds: ["activity-log-excerpt-analysis", "activity-testdata-flow"],
    summary:
      "Ein generisches Schnittstellenverhalten wurde anhand von Testfall, Datenprüfung und Prozessnotiz eingeordnet.",
    accomplished:
      "Testfall rekonstruiert und Ursache im Ablauf eingegrenzt.",
    howItWasDone:
      "Ablauf über neutralisierten Log-Hinweis, Testdaten und persönliche Prozessnotiz nachvollzogen.",
    blockers: [],
    followUps: ["Validierungsschicht im Wiki ergänzen"],
    linkedWikiEntryIds: ["wiki-validation-check"],
    linkedArchitectureItemIds: ["arch-validation-layer", "arch-import-interface"],
    createdAt: "2026-06-20T09:30:00.000Z",
    updatedAt: "2026-06-20T15:20:00.000Z",
  },
  {
    id: "work-log-test-process",
    title: "Fehlerursache im Testprozess dokumentiert",
    date: "2026-06-19",
    status: "review_needed",
    taskIds: ["task-understand-test-process", "task-understand-validation-layer"],
    activityIds: ["activity-root-cause", "activity-testdata-flow"],
    summary:
      "Ein wiederkehrender Testprozess wurde als persönliches Lernmuster notiert.",
    accomplished:
      "Prüfschritte sortiert und mögliche Fehlerquelle als Review-Punkt markiert.",
    howItWasDone:
      "Testdaten, erwartetes Ergebnis und tatsächliche Beobachtung getrennt notiert.",
    blockers: ["Review-Freigabe für die genaue Prozessinterpretation fehlt"],
    followUps: ["Unklaren Prozessschritt im nächsten Termin fragen"],
    linkedWikiEntryIds: ["wiki-testdata-check"],
    linkedArchitectureItemIds: ["arch-daily-review-process"],
    createdAt: "2026-06-19T11:00:00.000Z",
    updatedAt: "2026-06-19T16:45:00.000Z",
  },
  {
    id: "work-log-data-check",
    title: "Ablauf für Datenprüfung verstanden",
    date: "2026-06-18",
    status: "logged",
    taskIds: ["task-structure-wiki-notes"],
    activityIds: ["activity-process-note"],
    summary:
      "Ein neutraler Prüfablauf wurde in einzelne Schritte zerlegt.",
    accomplished:
      "Eingabe, Prüfung und Verarbeitung als nachvollziehbare Reihenfolge beschrieben.",
    howItWasDone:
      "Eigene Notiz mit Prozessskizze, Prüfkriterien und offenen Begriffen erstellt.",
    blockers: [],
    followUps: ["Begriff fachlicher Schlüssel nachschlagen"],
    linkedWikiEntryIds: ["wiki-domain-key", "wiki-testdata-check"],
    linkedArchitectureItemIds: ["arch-data-flow"],
    createdAt: "2026-06-18T10:15:00.000Z",
    updatedAt: "2026-06-18T13:30:00.000Z",
  },
  {
    id: "work-log-architecture-meeting",
    title: "Architekturhinweis aus Meeting nachbereitet",
    date: "2026-06-17",
    status: "follow_up_open",
    taskIds: ["task-collect-review-questions"],
    activityIds: ["activity-architecture-relation"],
    summary:
      "Ein allgemeiner Architekturhinweis wurde in persönliche Lernnotizen übersetzt.",
    accomplished:
      "Zusammenhang zwischen Import, Prüfung und Review als Kontextkarte vorbereitet.",
    howItWasDone:
      "Meetingnotiz, vorhandene Wiki-Notiz und Architektur-Snapshot abgeglichen.",
    blockers: [],
    followUps: ["Architekturbeziehung zwischen Prüfung und Import klären"],
    linkedWikiEntryIds: ["wiki-interface-process"],
    linkedArchitectureItemIds: ["arch-import-interface", "arch-validation-layer"],
    createdAt: "2026-06-17T14:10:00.000Z",
    updatedAt: "2026-06-17T18:05:00.000Z",
  },
  {
    id: "work-log-recurring-check",
    title: "Prozessnotiz für wiederkehrende Prüfung erstellt",
    date: "2026-06-16",
    status: "closed",
    taskIds: ["task-structure-wiki-notes"],
    activityIds: ["activity-process-note"],
    summary:
      "Eine persönliche How-to-Notiz für eine wiederkehrende Prüfung wurde erstellt.",
    accomplished:
      "Checkliste mit Vorbereitung, Durchführung und Review-Schritt geschrieben.",
    howItWasDone:
      "Aus mehreren neutralen Beobachtungen eine kurze, wiederverwendbare Prozessnotiz gebaut.",
    blockers: [],
    followUps: [],
    linkedWikiEntryIds: ["wiki-review-checklist"],
    linkedArchitectureItemIds: ["arch-review-dependency"],
    createdAt: "2026-06-16T09:20:00.000Z",
    updatedAt: "2026-06-16T12:40:00.000Z",
  },
];

export const mockWorkWikiEntries: WorkWikiEntry[] = [
  {
    id: "wiki-batch-process",
    title: "Batch-Prozess: Grundidee",
    type: "concept",
    summary:
      "Persönliche Erklärung, wie ein zeitversetzter Prozess Eingaben sammelt, prüft und verarbeitet.",
    body:
      "Ein Batch-Prozess wird hier als neutrales Lernmodell verstanden: Eingaben werden gesammelt, zu einem späteren Zeitpunkt geprüft und danach weiterverarbeitet. Die Notiz beschreibt nur das Muster, keine echten Systemdetails.",
    tags: ["prozess", "grundidee"],
    status: "active",
    lastReviewedAt: "2026-06-19",
    relatedArchitectureItemIds: ["arch-data-flow"],
    relatedLogEntryIds: ["work-log-data-check"],
    relatedTaskIds: ["task-structure-wiki-notes"],
  },
  {
    id: "wiki-testdata-check",
    title: "Testdaten prüfen: Vorgehen",
    type: "how_to",
    summary:
      "Kurze Checkliste für persönliche Orientierung bei neutralisierten Testdaten.",
    body:
      "Vor dem Prüfen wird festgehalten, welche Eingabe erwartet wird, welche Validierung greift und welches Ergebnis beobachtet wurde. Details bleiben abstrakt und dienen nur der eigenen Orientierung.",
    tags: ["testdaten", "checkliste"],
    status: "active",
    lastReviewedAt: "2026-06-20",
    relatedArchitectureItemIds: ["arch-validation-layer"],
    relatedLogEntryIds: ["work-log-test-process", "work-log-data-check"],
    relatedTaskIds: ["task-understand-test-process", "task-understand-validation-layer"],
  },
  {
    id: "wiki-interface-process",
    title: "Schnittstelle vs. Prozessschritt",
    type: "glossary",
    summary:
      "Abgrenzung zwischen Übergabepunkt und fachlichem Ablauf, ohne echte Systemdetails.",
    body:
      "Eine Schnittstelle beschreibt hier nur den Übergabepunkt. Ein Prozessschritt beschreibt, was danach fachlich mit der Eingabe geschieht. Die Notiz hilft, Beobachtungen im Work Log präziser zu benennen.",
    tags: ["schnittstelle", "prozess"],
    status: "needs_review",
    relatedArchitectureItemIds: ["arch-import-interface"],
    relatedLogEntryIds: ["work-log-architecture-meeting"],
    relatedTaskIds: ["task-document-interface-behavior"],
  },
  {
    id: "wiki-review-checklist",
    title: "Review vor Änderung: Checkliste",
    type: "checklist",
    summary:
      "Persönliche Erinnerungsnotiz, wann ein Review nötig ist und welche Fragen vorher geklärt sein müssen.",
    body:
      "Vor einer Änderung: Ziel neutral formulieren, Annahmen markieren, offene Datenpunkte prüfen und erst danach Review-Fragen stellen. Die Checkliste ersetzt keine Freigabe.",
    tags: ["review", "sicherheit"],
    status: "active",
    lastReviewedAt: "2026-06-16",
    relatedArchitectureItemIds: ["arch-review-dependency"],
    relatedLogEntryIds: ["work-log-recurring-check"],
    relatedTaskIds: ["task-collect-review-questions", "task-understand-test-process"],
  },
  {
    id: "wiki-domain-key",
    title: "Begriff: Fachlicher Schlüssel",
    type: "reference",
    summary:
      "Neutralisierte Begriffsklärung, wie ein fachlicher Schlüssel im Datenkontext verstanden werden kann.",
    body:
      "Ein fachlicher Schlüssel ist ein Merkmal, über das ein Datensatz in einem Prozess wiedererkannt werden kann. Diese Definition bleibt allgemein und enthält keine echten Werte oder Tabellen.",
    tags: ["begriff", "daten"],
    status: "draft",
    relatedArchitectureItemIds: ["arch-data-flow"],
    relatedLogEntryIds: ["work-log-data-check"],
    relatedTaskIds: ["task-structure-wiki-notes"],
  },
  {
    id: "wiki-validation-check",
    title: "Validierungsschicht: Überblick",
    type: "architecture",
    summary:
      "Persönlicher Rahmen, um Validierung, Eingabequalität und Folgeprozess sauber zu trennen.",
    body:
      "Die Validierungsschicht wird als konzeptuelle Stelle verstanden, an der Eingaben formal und fachlich geprüft werden. Offene Detailfragen bleiben als Review-Punkte markiert.",
    tags: ["validierung", "architektur"],
    status: "needs_review",
    relatedArchitectureItemIds: ["arch-validation-layer"],
    relatedLogEntryIds: ["work-log-interface-behavior"],
    relatedTaskIds: [
      "task-document-interface-behavior",
      "task-understand-validation-layer",
    ],
  },
];

export const mockWorkArchitectureItems: WorkArchitectureItem[] = [
  {
    id: "arch-data-flow",
    title: "Datenfluss: Eingabe → Prüfung → Verarbeitung",
    type: "data_flow",
    summary:
      "Persönliche Kontextkarte für einen generischen Datenfluss ohne echte Systemnamen.",
    status: "known",
    relatedIds: ["arch-import-interface", "arch-validation-layer"],
    wikiEntryIds: ["wiki-batch-process", "wiki-domain-key"],
    note:
      "Als Lernmodell hilfreich, solange keine echten Log-Auszüge oder internen Bezeichnungen übernommen werden.",
  },
  {
    id: "arch-validation-layer",
    title: "Modul: Validierungsschicht",
    type: "module",
    summary:
      "Konzeptuelle Stelle, an der Eingaben formal und fachlich geprüft werden.",
    status: "learning",
    relatedIds: ["arch-data-flow", "arch-review-dependency"],
    wikiEntryIds: ["wiki-testdata-check", "wiki-validation-check"],
    note:
      "Noch klären, welche Prüfungen generisch erklärt werden können und was vertraulich bleiben muss.",
  },
  {
    id: "arch-daily-review-process",
    title: "Prozess: tägliche Abstimmung",
    type: "process",
    summary:
      "Neutraler Kontext für Fragen, Reviewpunkte und kleine Nachbereitungen.",
    status: "known",
    relatedIds: ["arch-review-dependency"],
    wikiEntryIds: ["wiki-review-checklist"],
    note:
      "Dient als persönlicher Erinnerungsort, nicht als offizielles Meeting-Protokoll.",
  },
  {
    id: "arch-import-interface",
    title: "Interface: externer Import",
    type: "interface",
    summary:
      "Abstrakter Eingangspunkt für Daten, ohne echte Partner-, System- oder Kundennamen.",
    status: "unclear",
    relatedIds: ["arch-data-flow", "arch-validation-layer"],
    wikiEntryIds: ["wiki-interface-process"],
    note:
      "Beziehung zu Prüfung und Folgeprozess ist als Lernfrage offen.",
  },
  {
    id: "arch-review-dependency",
    title: "Dependency: Freigabe durch Review",
    type: "dependency",
    summary:
      "Hinweis, dass bestimmte Änderungen erst nach Review sauber verstanden oder umgesetzt werden.",
    status: "needs_review",
    relatedIds: ["arch-validation-layer", "arch-daily-review-process"],
    wikiEntryIds: ["wiki-review-checklist"],
    note:
      "Rot/Orange nur als vorsichtiger Hinweis, nicht als Eskalationssystem.",
  },
];

export const mockWorkFollowUps: WorkFollowUp[] = [
  {
    id: "followup-process-step",
    title: "Unklaren Prozessschritt im nächsten Termin fragen",
    source: "activity",
    status: "open",
    priority: "high",
    nextAction: "Frage neutral formulieren und keine vertraulichen Details notieren.",
    linkedLogEntryId: "work-log-test-process",
    linkedActivityId: "activity-root-cause",
  },
  {
    id: "followup-validation-wiki",
    title: "Wiki-Notiz zu Validierung ergänzen",
    source: "wiki",
    status: "open",
    priority: "medium",
    nextAction: "Validierungsschicht als persönliches Lernmodell beschreiben.",
    linkedWikiEntryId: "wiki-validation-check",
  },
  {
    id: "followup-architecture-relation",
    title: "Architekturbeziehung zwischen Prüfung und Import klären",
    source: "work_log",
    status: "waiting",
    priority: "medium",
    nextAction: "Erst nach nächstem Review-Termin aktualisieren.",
    linkedLogEntryId: "work-log-architecture-meeting",
    linkedActivityId: "activity-architecture-relation",
    linkedWikiEntryId: "wiki-interface-process",
  },
  {
    id: "followup-result-note",
    title: "Ergebnisnotiz für letzten Work Block abschließen",
    source: "manual",
    status: "blocked",
    priority: "low",
    nextAction: "Blocker prüfen und dann kurze Outcome-Notiz ergänzen.",
    linkedLogEntryId: "work-log-interface-behavior",
  },
];

export const mockWorkMeetings: WorkMeetingNote[] = [
  {
    id: "meeting-review-context",
    title: "Review-Kontext nachbereitet",
    date: "2026-06-20",
    summary:
      "Persönliche Nachbereitung eines neutralen Review-Kontexts mit offenen Fragen.",
    decisions: ["Review-Hinweise nur als persönliche Lernnotizen ablegen"],
    followUps: ["Unklaren Prozessschritt im nächsten Termin fragen"],
    linkedWikiEntryIds: ["wiki-review-checklist"],
  },
  {
    id: "meeting-process-sync",
    title: "Prozessabgleich vorbereitet",
    date: "2026-06-18",
    summary:
      "Vorbereitung für ein Gespräch über generische Prozessschritte und Datenprüfung.",
    decisions: [],
    followUps: ["Architekturbeziehung zwischen Prüfung und Import klären"],
    linkedWikiEntryIds: ["wiki-testdata-check", "wiki-interface-process"],
  },
];

export const mockWorkSections: WorkSection[] = [
  {
    id: "log",
    title: "Work Log",
    href: "/work/log",
    purpose: "Tagebuch für Arbeit, Ergebnis, Lösungsweg und Follow-ups.",
    lastActivity: "Schnittstellenverhalten nachvollzogen",
    openItems: 3,
    nextAction: "Letzten Work Block abschließen",
  },
  {
    id: "wiki",
    title: "Wiki",
    href: "/work/wiki",
    purpose: "Persönlicher Nachschlageort für Begriffe, Prozesse und How-tos.",
    lastActivity: "Testdaten prüfen: Vorgehen",
    openItems: 2,
    nextAction: "Validierung ergänzen",
  },
  {
    id: "meetings",
    title: "Meetings",
    href: "/work/meetings",
    purpose: "Meetingnotizen, Entscheidungen und offene Punkte vorbereiten.",
    lastActivity: "Review-Kontext nachbereitet",
    openItems: 2,
    nextAction: "Frage für nächsten Termin vorbereiten",
  },
];

export const mockWorkPrivacyNotes = [
  "Work notes are private",
  "Do not store secrets",
  "Do not paste confidential customer data",
  "Architecture notes are personal learning context",
  "Wiki entries are personal lookup notes, not official documentation",
];
