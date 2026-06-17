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
