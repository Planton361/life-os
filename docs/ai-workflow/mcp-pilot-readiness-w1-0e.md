# MCP Pilot Readiness W1.0E

Stand: 2026-07-07
Status: HISTORICAL
Zweck: Lokale MCP-Pilotentscheidung fuer Life OS vorbereiten.
Historischer Quellenstand: `AI_WORKFLOW.md`, `SECURITY.md`, `docs/ai-workflow/life-os-agent-workflow-v2.md`, `docs/ai-workflow/mcp-tools.md`. Aktuelle Tool-/Security-Grenzen kommen aus `AI_WORKFLOW.md`, `SECURITY.md` und dem genehmigten Issue.
Gilt fuer: MCP-Readiness, lokale Tool-Kontexte, Browser-Proof, Runtime-Diagnose.
Nicht gilt fuer: MCP-Installation, User-Home-Konfiguration, Produktfeatures, `src/`, Migrationen oder Remote-DB-Aktionen.

## 1. Zweck

W1.0E bewertet, welche MCPs Life OS zuerst lokal testen sollte, und welche
Grenzen vor einer spaeteren Installation gelten.

Entscheidung:

```text
W1.0E installiert kein MCP.
W1.0E bereitet die lokale Pilotentscheidung vor.
```

## 2. Nicht-Ziele

- keine MCP-Installation
- keine `.mcp.json`
- keine `.codex/config.toml`
- keine User-Home-Konfiguration
- keine IDE-Konfiguration
- keine Produktfeatures
- keine UI- oder `src/`-Aenderungen
- keine Migration, RLS-/Policy-Aenderung oder Remote-DB-Aktion
- keine Secrets lesen, erzeugen oder dokumentieren
- kein `.env.local` oeffnen
- kein `private/` oder `docs/product/life-os-full-roadmap-checklist.md`

## 3. Lokales Tooling-Inventar

Stand des lokalen Projekts:

```text
Node: v22.22.2
pnpm: 11.3.0
Next.js: 16.2.2
Playwright: @playwright/test 1.61.0
Top-level playwright package: nicht installiert
```

Relevante Scripts aus `package.json`:

```text
dev: next dev
typecheck: next typegen && tsc --noEmit --incremental false
test:e2e: playwright test
qa:dashboard: playwright test tests/e2e/dashboard.spec.ts
```

Bestehende Next-Konfiguration:

- `next.config.ts` nutzt nur Legacy-Education-Redirects.
- Keine MCP-, DevTools- oder Browser-Konfiguration.

Bestehende Playwright-Konfiguration:

- `playwright.config.ts`
- `testDir: ./tests/e2e`
- `outputDir: test-results`
- `baseURL`: `http://127.0.0.1:3000` per Default
- Env Overrides: `PLAYWRIGHT_HOST`, `PLAYWRIGHT_PORT`
- Webserver: `pnpm dev --hostname <host> --port <port>`
- `reuseExistingServer: !CI`
- Screenshots nur bei Failure
- Trace erst beim Retry

Bestehende E2E Auth-State-Konvention:

- `.env.example` dokumentiert `PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json`.
- `tests/e2e/content-state-system.spec.ts` liest diese Datei optional und fuegt Cookies in den Browser-Kontext ein.
- `.local/` ist in `.gitignore` ausgeschlossen.
- Tests skippen lokale Supabase-/Manual-Flows, wenn Auth State oder lokale DB nicht verfuegbar sind.

Bestehende `.codex`-Struktur:

- repo-lokal existiert `.codex/`.
- keine Dateien oder aktive MCP-Konfiguration darin gefunden.

Bestehende MCP-Konfiguration:

- keine `.mcp.json` im Repo gefunden.
- keine repo-lokale `.codex/config.toml` gefunden.
- `supabase/config.toml` existiert, ist aber Supabase-CLI-Konfiguration, keine MCP-Konfiguration.

## 4. MCP-Pilot-Reihenfolge

Reihenfolge fuer spaetere Pilots:

1. Playwright MCP
2. Next DevTools MCP
3. Figma MCP
4. Supabase MCP

Grund:

- Playwright MCP schliesst direkt an bestehende Browser-Proof-Regeln, E2E-Tests und `.local`-Auth-State-Konvention an.
- Next DevTools MCP hilft erst danach bei Runtime-, App-Router- und Server-Action-Diagnose.
- Figma MCP ist nuetzlich fuer Design-Kontext, darf V5 aber nicht ersetzen.
- Supabase MCP hat das hoechste Daten-/Secret-Risiko und kommt erst local/read-only.

## 5. Playwright MCP Pilot Scope

Zweck:

- Browser-Proof fuer UI und Funktion
- Role-, Label- und Accessibility-Tree-basierte Interaktion
- Reload-Proofs
- Form- und Button-Proofs
- konkrete Region statt globale Textsuche pruefen

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
- keine Production-Session
- keine privaten Daten in Screenshots, Traces oder Logs
- `.local/` und Auth-State nie stagen
- keine Screenshots mit Secrets oder privaten Daten committen
- keine globale Textsuche als alleiniger Beweis
- keine automatischen Browseraktionen mit Accountzugriff ohne bestaetigten Scope

Pilot-Readiness:

- bestehende Playwright-Tests und Konfiguration sind vorhanden.
- Auth-State-Konvention ist bereits `.local`-basiert.
- Browser-Proof-Skill und Browser-Proof-Prompt existieren.

## 6. Next DevTools MCP Pilot Scope

Zweck:

- Runtime-, Route- und Log-Kontext
- Hydration-, Server-Action- und App-Router-Debugging
- Build- und Devserver-nahe Analyse

Life-OS-Nutzung:

- Buttons sehen fertig aus, aber Action haengt nicht.
- Route oder Server Action braucht Debug-Kontext.
- Runtime Error muss lokal eingegrenzt werden.
- Hydration oder App-Router-Verhalten weicht vom Codebild ab.

Grenzen:

- local dev server only
- keine Production Logs
- keine Secrets
- keine Deployment-Verbindung
- keine automatische Fix- oder Commit-Aktion

Pilot-Readiness:

- Next.js ist lokal installiert.
- Devserver-Script existiert.
- Pilot erst nach Playwright MCP, weil Browser-Proof das unmittelbare Workflow-Gate ist.

## 7. Figma MCP Future Scope

Phase:

```text
W1.0F oder spaeter
```

Zweck:

- V5-Fidelity pruefen
- Anti-generic UI Review unterstuetzen
- Frame-, Token- und Layout-Kontext lesen

Grenzen:

- read/review-scoped zuerst
- V5 bleibt Designwahrheit
- keine automatische Designrichtung
- keine Figma-Write-Actions ohne explizite Freigabe
- kein Ersatz fuer `DESIGN.md` oder `docs/design/dashboard-v5.md`

## 8. Supabase MCP Future Scope

Phase:

```text
nach Playwright MCP, Next DevTools MCP und Figma Read/Review-Scope
```

Zweck:

- Schema-Inspection
- RLS-/Policy-Kontext
- Query- und Table-Kontext

Grenzen:

- local/read-only zuerst
- keine Remote-Writes
- kein Service Role Key
- kein `supabase db push`
- kein `supabase link`
- kein `supabase db reset` als MCP-Schritt
- keine Production-Daten
- keine Secrets in MCP-Kontext

Aktueller Standard:

```text
Supabase CLI bleibt die Standardquelle fuer lokale DB-Checks.
```

## 9. Security / Privacy Grenzen

Vor jedem MCP-Pilot klaeren:

- Welche Daten kann das Tool sehen?
- Welche Aktionen darf das Tool ausfuehren?
- Ist der Zugriff local-only?
- Werden Secrets, Auth-State, private Daten oder Screenshots beruehrt?
- Gibt es Logging, Telemetry oder Remote-Ausleitung?
- Wie wird Staging verhindert?
- Wie wird der Scope zeitlich und fachlich begrenzt?

Nicht erlaubt:

- Production-Secrets im MCP-Kontext
- Production-Daten
- private Health-, Journal-, Work- oder Review-Daten ohne expliziten Scope
- automatische Writes
- Tool-Output mit Secrets im Bericht
- Commit von `.local/`, Auth-State, Traces oder Screenshots mit privaten Daten

## 10. Auth-State / Secrets Regeln

Auth-State:

- nur lokal unter `.local/`
- nie stagen
- nie in Screenshots oder Logs ausgeben
- nur fuer lokal bestaetigte Browser-Proofs nutzen
- kein Production-Account ohne expliziten Scope

Secrets:

- `.env.local` nicht oeffnen
- `.env*` nicht stagen
- nur `.env.example` fuer Platzhalter lesen
- keine Service Role Keys fuer MCP
- keine API Keys in Config-Beispielen

## 11. Config-Strategie

W1.0E erstellt keine aktive MCP-Konfiguration. Beispiele duerfen nur als
Platzhalter in Doku stehen.

Nicht erstellen:

```text
.mcp.json
.codex/config.toml
User-Home-Konfig
IDE-Konfig mit echten Pfaden
```

Beispiel fuer eine spaetere repo-lokale Pilot-Konfiguration:

```json
{
  "mcpServers": {
    "playwright-local": {
      "command": "<playwright-mcp-command>",
      "args": ["<local-only-args>"],
      "env": {
        "PLAYWRIGHT_HOST": "127.0.0.1",
        "PLAYWRIGHT_PORT": "3000"
      }
    }
  }
}
```

Beispiel fuer eine spaetere Codex-Konfiguration:

```toml
[mcp_servers.playwright-local]
command = "<playwright-mcp-command>"
args = ["<local-only-args>"]

[mcp_servers.playwright-local.env]
PLAYWRIGHT_HOST = "127.0.0.1"
PLAYWRIGHT_PORT = "3000"
```

Diese Beispiele sind nicht aktiv und enthalten keine Secrets.

## 12. Akzeptanzkriterien fuer tatsaechliche Pilot-Installation

Vor Installation eines MCP-Piloten muessen erfuellt sein:

- konkreter Pilot-Zweck und Nicht-Ziele
- lokale Daten- und Auth-State-Grenze
- Staging-Schutz fuer `.local/`, Traces, Screenshots und Auth-State
- keine Secret- oder Production-Verbindung
- dokumentierte Start-/Stop-Anweisung
- dokumentierte erlaubte Aktionen
- dokumentierte verbotene Aktionen
- Rollback- oder Deaktivierungsweg
- Review der Config vor Aktivierung
- Abschlussbericht mit Security-/Privacy-Risiko

Fuer Playwright MCP zusaetzlich:

- Test gegen lokale Route
- kein Screenshot mit privaten Daten
- kein globaler Textsearch als alleiniger Proof
- Reload-Proof-Regel bestaetigt

## 13. Deferred Items

- Playwright MCP installieren und konfigurieren.
- Next DevTools MCP evaluieren und konfigurieren.
- Figma MCP read/review-scoped testen.
- Supabase MCP local/read-only pruefen.
- Devserver-/MCP-Startbefehle finalisieren.
- Browser-Proof-Berichtsvorlage nach erstem echten MCP-Pilot schaerfen.
