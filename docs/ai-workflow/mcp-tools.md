# MCP Tools

Stand: 2026-06-17  
Status: Draft  
Zweck: MCP-Nutzung sicher und zweckgebunden einordnen.  
Quelle der Wahrheit: `AI_WORKFLOW.md` und `SECURITY.md`.  
Gilt für: Figma, Browser, Docs, Repo-Kontext, externe Toolzugriffe.  
Nicht gilt für: automatische MCP-Installation.

## Grundsatz

MCP ist eine Integrationsschicht für Tools und Datenquellen. Für Life OS gilt: nur aktivieren, wenn Zweck, Scope und Risiko klar sind.

## Mögliche MCP-Klassen

- Browser QA: Playwright MCP
- Design-Kontext: Figma/Magic MCP
- Library Docs: Context7
- Repo-Kontext: lokale Tools wie Repomix statt breiter Remote-Zugriff

## Empfohlene Reihenfolge

1. Context7 ist das erste empfohlene MCP für aktuelle Library-, Framework-, SDK- und API-Dokumentation.
2. Playwright MCP ist ein späteres Werkzeug für lokale UI-, Screenshot-, Browser- und Accessibility-QA.
3. Design- oder Browser-Automation-MCPs werden nur nach Zweck-, Scope-, Rechte- und Risiko-Review genutzt.

## Context7

Rolle: aktuelle Dokumentation prüfen, wenn Library-, Framework-, SDK-, API- oder CLI-Verhalten zeitlich instabil sein kann.

Grenzen:

- keine automatische Installation
- keine ungeprüfte Codeübernahme
- keine Secrets oder privaten Daten in Queries
- Root-Dateien und lokale Projektregeln bleiben maßgeblich

## Playwright MCP

Rolle: später lokale UI-Flows, Screenshots, Responsiveness und Accessibility-Hinweise prüfen.

Grenzen:

- nicht MVP-kritisch für Phase 1.6
- keine automatischen Browseraktionen mit Accountzugriff ohne Bestätigung
- keine Production-Daten oder privaten Sessions
- Review-Ergebnisse ersetzen keine V5-Designprüfung

## Security Gate

Vor Aktivierung prüfen:

- Welche Daten sieht das Tool?
- Welche Aktionen darf es ausführen?
- Werden Secrets berührt?
- Ist es lokal oder remote?
- Gibt es Logging/Telemetry?
- Kann der Zugriff zeitlich begrenzt werden?

## Nicht erlaubt

- Production-Secrets in MCP-Kontext
- private Health-/Review-Daten ohne Zweck
- automatische Browseraktionen mit Accountzugriff ohne Bestätigung
- Toolketten, die Änderungen ohne Review committen
