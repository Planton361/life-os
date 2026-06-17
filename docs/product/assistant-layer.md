# Assistant Layer

Stand: 2026-06-17  
Status: Draft  
Zweck: zukünftige KI-/Agentenfähigkeit als Produktschicht definieren.  
Quelle der Wahrheit: `AI_WORKFLOW.md` für Entwicklungsworkflow; diese Datei für Produktlogik.  
Gilt für: Agent Sessions, AI Summaries, Review Needed.  
Nicht gilt für: autonome Agenten ohne Review.

## Kurzfassung

Die Assistant Layer kommt erst, wenn manuelle Flows stabil sind. KI darf erfassen, zusammenfassen, vorschlagen und prüfen, aber kritische Daten nicht ungeprüft übernehmen.

## Mögliche Funktionen

- Inbox-Klärungsvorschläge
- Daily Review Summary
- Wochenreview-Vorschlag
- Agent Session Logging
- Codebase Notes
- Prompt Library
- Follow-up Detection

## Pflichtfelder für AI-Inhalte

- source
- generated_by
- review_needed
- linked_context
- confidence optional

## Nicht im MVP

- autonome Umplanung
- automatische Löschung
- direkte Änderung sensibler Health-Daten
- externe Tool-Ausführung ohne Freigabe
