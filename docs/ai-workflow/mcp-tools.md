# MCP Tools

Stand: 2026-07-07
Status: ACTIVE — supporting reference, non-canonical
Zweck: MCP-Nutzung sicher und zweckgebunden einordnen.  
Canonical authority: `AI_WORKFLOW.md`, `SECURITY.md` and the approved GitHub Issue. This file is a supporting tool reference only.  
Gilt für: Figma, Browser, Docs, Repo-Kontext, externe Toolzugriffe.  
Nicht gilt für: automatische MCP-Installation.

## Grundsatz

MCP ist eine Integrationsschicht für Tools und Datenquellen. Für Life OS gilt:
nur aktivieren, wenn Zweck, Scope und Risiko klar sind.

W1.0E installiert kein MCP. W1.0E dokumentiert Readiness und Pilot-Grenzen.

Detailquelle:

- `docs/ai-workflow/mcp-pilot-readiness-w1-0e.md`

## Mögliche MCP-Klassen

- Browser QA: Playwright MCP
- Design-Kontext: Figma/Magic MCP
- Library Docs: Context7
- Repo-Kontext: lokale Tools wie Repomix statt breiter Remote-Zugriff

## Pilot-Reihenfolge

1. Playwright MCP zuerst fuer lokale Browser-Proofs.
2. Next DevTools MCP danach fuer Runtime-, Route-, Hydration- und Server-Action-Diagnose.
3. Figma MCP spaeter read/review-scoped fuer V5-Fidelity, Frame-, Token- und Layout-Kontext.
4. Supabase MCP spaeter local/read-only fuer Schema-, RLS-/Policy- und Query-Kontext.

Context7 bleibt die bevorzugte aktuelle Docs-Quelle fuer Library-, Framework-,
SDK- und API-Dokumentation, ist aber nicht Teil des lokalen W1.0E-Piloten.

## Context7

Rolle: aktuelle Dokumentation prüfen, wenn Library-, Framework-, SDK-, API- oder CLI-Verhalten zeitlich instabil sein kann.

Grenzen:

- keine automatische Installation
- keine ungeprüfte Codeübernahme
- keine Secrets oder privaten Daten in Queries
- Root-Dateien und lokale Projektregeln bleiben maßgeblich

## Playwright MCP

Rolle: erster Pilot fuer lokale Browser-Proofs, UI-/Funktionsfluesse,
Role-/Label-basierte Interaktion, Reload-Proofs, Form- und Button-Proofs.

Life-OS-Nutzung:

- Dashboard Quick Capture
- Inbox Routing
- Calendar Scheduling Controls
- Portfolio Context Actions
- Resource Relations
- Nutrition Forms
- Skill Evidence

Grenzen:

- local-only
- keine privaten Daten in Screenshots, Traces oder Logs
- `.local/` und Auth-State nicht stagen
- keine Production-Session
- Review-Ergebnisse ersetzen keine V5-Designprüfung

## Next DevTools MCP

Rolle: zweiter Pilot fuer Runtime-, Route-, Log-, Hydration-, Server-Action-
und App-Router-Debugging am lokalen Devserver.

Life-OS-Nutzung:

- Button sieht fertig aus, aber Action haengt.
- Route oder Server Action braucht lokalen Runtime-Kontext.
- Runtime Error oder Hydration-Verhalten muss eingegrenzt werden.

Grenzen:

- local dev server only
- keine Production Logs
- keine Secrets
- keine Deployment-Verbindung

## Figma MCP

Rolle: spaeterer read/review-scoped Pilot fuer V5-Fidelity, Anti-generic UI,
Frame-, Token- und Layout-Kontext.

Grenzen:

- W1.0F oder spaeter
- V5 bleibt Designwahrheit
- keine automatische Designrichtung
- keine Figma-Write-Actions ohne Freigabe

## Supabase MCP

Rolle: spaeterer local/read-only Pilot fuer Schema-Inspection, RLS-/Policy-
Kontext und Query-/Table-Kontext.

Grenzen:

- local/read-only zuerst
- keine Remote-Writes
- kein Service Role Key
- kein `supabase db push`
- keine Production-Daten
- Supabase CLI bleibt aktuelle Standardquelle

## Config-Strategie

W1.0E dokumentiert nur Beispiele mit Platzhaltern. Nicht erstellen:

```text
.mcp.json
.codex/config.toml
User-Home-Konfig
IDE-Konfig mit echten Pfaden
```

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
