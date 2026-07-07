# W1.1A Browser Proof Recovery

Stand: 2026-07-07
Status: BLOCKED_AUTH_STATE
Zweck: Current Browser-Proof-Recovery fuer lokale Manual-DB-Write-Flows nach W1.0F/W1.0G.
Quelle der Wahrheit: `AGENTS.md`, Root-Dokumente, `docs/product/final-product-completion-roadmap.md`, `docs/ai-workflow/ui-function-debt-audit-w1-0f.md`, `docs/qa/manual-db-test-data-hygiene.md`, `tests/e2e/content-state-system.spec.ts`.
Nicht gilt fuer: Produktfeatures, UI-Rekomposition, Migrationen, RLS-/Policy-Aenderungen, Remote-DB, MCP-Installation oder Auth-State-/Secret-Ausgabe.

## 1. Zweck

W1.1A sollte aktuelle, nicht skip-lastige DB-Write-Browser-Proofs wiederherstellen
oder exakt begruenden, warum einzelne Proofs deferred bleiben muessen.

Bewertet wurden die zwei vereinbarten Greps:

```bash
PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Manual|Inbox|Today|Dashboard|Calendar|Portfolio"
```

```bash
PLAYWRIGHT_HOST=localhost PLAYWRIGHT_PORT=3000 PLAYWRIGHT_SUPABASE_AUTH_STATE=.local/playwright/supabase-auth-state-localhost.json pnpm exec playwright test tests/e2e/content-state-system.spec.ts --grep "Resources|Nutrition|Skill|AI|Recurring"
```

## 2. Nicht-Ziele

- Keine neuen Produktfeatures.
- Keine UI-Rekomposition oder Designaenderung.
- Keine Migration.
- Keine RLS-, Policy- oder Grant-Aenderung.
- Keine Remote-DB-Aktion.
- Kein `supabase link`, `supabase db push` oder `supabase db reset`.
- Keine MCP-Installation.
- Keine neue Library.
- Keine Secret-, `.env.local`- oder Auth-State-Ausgabe.
- Keine Staging-Aktion fuer `.local/`, `private/` oder `docs/product/life-os-full-roadmap-checklist.md`.

## 3. Ausgangslage

W1.0F/W1.0G klassifizierten alle Kernflaechen als `partial`, nicht final
`connected`, weil aktuelle Browser-Proofs fuer DB-Write-Flows skip-lastig waren.
Historische QA dokumentiert breitere Green Runs, aber W1.1A bewertet nur den
aktuellen lokalen Zustand.

Die Auth-State-Datei fuer localhost ist vorhanden und ignoriert, aber die
aktuellen Manual-DB-Write-Tests erreichen keine aktive Supabase-Session im
Browser. Die betroffenen Tests skippen am bestehenden Manual-DB-Gate, sobald
Quick Capture oder Manual-DB-Controls nicht enabled sind.

Ein anfaenglicher paralleler Core-/Extensions-Lauf wurde verworfen: beide
Playwright-Greps teilen sich `.local/life-os/manual-profile.json` und duerfen
fuer beweiskraeftige Ergebnisse nicht gleichzeitig laufen.

## 4. Current Skip Analysis

Initial Core Proof, sequenziell:

- Total: 88
- Passed: 40
- Skipped: 48
- Failed: 0

Initial Extensions Proof, sequenziell:

- Total: 25
- Passed: 11
- Skipped: 14
- Failed: 0

Aktive Skip-Ursache:

- `PLAYWRIGHT_SUPABASE_AUTH_STATE` ist gesetzt, daher sind die statischen
  "Auth-State fehlt"-Skips nicht der aktuelle Hauptgrund.
- Die Manual-DB-Write-Flows skippen dynamisch am bestehenden
  `skipIfManualDbUnavailable`-Gate oder an vergleichbaren Manual-Supabase-
  Gates, weil die UI-Controls fuer Supabase-backed Writes nicht enabled sind.
- Aktuell wurden keine echten Empty-State-Gates als primaere Skip-Ursache
  erreicht. Solche Gates existieren weiter fuer gefuellte lokale DB-Zustaende,
  werden aber in diesem Lauf vom Auth-/Session-Gate ueberholt.

Blockierte Connected Claims:

- Dashboard Quick Capture und Today Agenda Projection.
- Inbox Capture, Routing, Create New, Resource, AI Suggestion und Archive.
- Today Planner, Recurring und Calendar Projection.
- Portfolio Task/Project/Goal/Skill/Evidence.
- Resource Relations.
- Nutrition Recipe/Meal.

## 5. DB-Write Proof Inventory

| Flow | Current W1.1A Status | Begruendung |
| --- | --- | --- |
| Dashboard Quick Capture / Quick Thought | skipped; stale historical proof only | Manual DB write control nicht aktiv. |
| Inbox Capture | skipped; stale historical proof only | Quick Capture ist im Manual-DB-Zustand nicht enabled. |
| Inbox Standalone Task Create | skipped; stale historical proof only | Triage-Flow braucht aktive Manual-Supabase-Session. |
| Inbox Create New Project | skipped; stale historical proof only | Create-New-DB-Proof skippt am Manual-DB-Gate. |
| Inbox Create New Goal | skipped; stale historical proof only | Create-New-DB-Proof skippt am Manual-DB-Gate. |
| Inbox Resource Create | skipped; stale historical proof only | Resource-Draft-DB-Proof skippt am Manual-DB-Gate. |
| Inbox Solved / Archive | skipped; stale historical proof only | Archive-DB-Proof braucht aktive Manual-Supabase-Session. |
| Inbox AI Suggestion Task Draft -> Confirm | skipped; stale historical proof only | Confirm-Write braucht aktive Manual-Supabase-Session. |
| Today Planner Task Planning | skipped; stale historical proof only | Planner-DB-Proof braucht aktive Manual-Supabase-Session. |
| Calendar Scheduling Controls | skipped; stale historical proof only | Scheduling-DB-Proof braucht aktive Manual-Supabase-Session. |
| Portfolio Task Create | skipped; stale historical proof only | Portfolio Task Action braucht aktive Manual-Supabase-Session. |
| Portfolio Project Create | skipped; stale historical proof only | Project Action braucht aktive Manual-Supabase-Session. |
| Portfolio Goal Create | skipped; stale historical proof only | Goal Action braucht aktive Manual-Supabase-Session. |
| Project Workbench Task Create | skipped; stale historical proof only | Linked Task Action braucht aktive Manual-Supabase-Session. |
| Goal Workbench Project/Task Create | skipped; stale historical proof only | Linked Goal actions brauchen aktive Manual-Supabase-Session. |
| Resource Relation Create | skipped; stale historical proof only | Resource Relation Proof skippt mit Manual Supabase auth unavailable. |
| Nutrition Recipe Create | skipped; stale historical proof only | Nutrition DB Proof skippt mit Manual Supabase auth unavailable. |
| Nutrition Meal Create / Complete | skipped; stale historical proof only | Meal Write/Complete braucht aktive Manual-Supabase-Session. |
| Skill Create / Edit / Archive | skipped; stale historical proof only | Skill Actions brauchen aktive Manual-Supabase-Session. |
| Skill Evidence Create / Delete | skipped; stale historical proof only | Evidence Actions brauchen aktive Manual-Supabase-Session. |
| Recurring Generate | skipped; stale historical proof only | Recurring Trigger ist nur mit aktiver Manual-Supabase-Session sichtbar. |

## 6. Fixes / Test Stabilization

Keine Produkt-, UI-, Test- oder Backend-Fixes wurden vorgenommen.

Grund: Die aktuelle Blockade liegt nicht an einer nachgewiesenen Selector-,
Reload- oder Redirect-Instabilitaet, sondern an der nicht aktiven lokalen
Manual-Supabase-Session. Eine Auth-State-Erneuerung ohne Secret-Zugriff ist im
Repo nicht als sicherer Helper vorhanden. Die historisch dokumentierte Reparatur
nutzte lokale Env-/Token-Informationen; W1.1A verbietet das Lesen oder Ausgeben
von `.env.local`, Secrets und Auth-State-Inhalten.

Test-Run-Hygiene:

- Core- und Extensions-Greps muessen sequenziell laufen, weil die Tests die
  ignorierte lokale Manual-Profil-Datei teilen.
- Parallele Greps koennen lokale Fixture-Rennen erzeugen und sind fuer W1.1A
  nicht beweiskraeftig.

## 7. Final Core Proof Set

Finaler Core-Grep, sequenziell:

- Command: `Manual|Inbox|Today|Dashboard|Calendar|Portfolio`
- Total: 88
- Passed: 40
- Skipped: 48
- Failed: 0

Bewertung:

- Testlauf gruen.
- DB-Write-Proof nicht wiederhergestellt.
- Alle aktuellen Core-Write- und Projection-Claims bleiben `partial` oder
  `stale historical proof only`, bis die lokale Manual-Supabase-Session wieder
  aktiv ist.

## 8. Final Extensions Proof Set

Finaler Extensions-Grep, sequenziell:

- Command: `Resources|Nutrition|Skill|AI|Recurring`
- Total: 25
- Passed: 11
- Skipped: 14
- Failed: 0

Bewertung:

- Testlauf gruen.
- Resource-, Nutrition-, Skill/Evidence-, AI-Confirm- und Recurring-Write-
  Proofs bleiben auth-blocked.

## 9. Remaining Skips

Remaining Skips:

- Core: 48
- Extensions: 14

Primaerer aktueller Grund:

- Lokale Manual-Supabase-Session ist nicht aktiv verfuegbar, obwohl der
  Auth-State-Pfad gesetzt ist.

Nicht geloest in W1.1A:

- Auth-State wurde nicht erneuert, weil dafuer kein checked-in, secret-sicherer
  Projekt-Helper gefunden wurde.
- `.env.local` und Auth-State-Inhalte wurden nicht gelesen oder ausgegeben.
- Kein DB reset oder Cleanup wurde ausgefuehrt.

## 10. Connected Claim Impact

W1.1A stuft keine Surface von `partial` auf `connected` hoch.

Weiter belastbar:

- Demo-, Empty- und strukturelle Manual-Shell-Proofs laufen gruen.
- Prepared/Future-State- und No-Demo-Fallback-Claims bleiben durch die
  passierenden Tests unterstuetzt.

Nicht aktuell belastbar:

- Alle DB-backed Write- und Reload-Claims der Kernflows.
- Cross-surface Projection Claims fuer Today, Dashboard, Calendar und
  Portfolio, soweit sie auf aktuellen DB-Writes beruhen.

Entscheidung:

- Dashboard, Inbox, Today, Calendar, Portfolio, Resources, Nutrition, Skills,
  Recurring und AI Suggestion Confirm bleiben `partial`.
- Historische QA bleibt als Historie gueltig, darf aber nicht als aktueller
  W1.1A-Connected-Proof ausgegeben werden.

## 11. Follow-ups

1. Lokalen Playwright-Supabase-Auth-State nach bestehender Projektkonvention
   erneuern, ohne Secrets oder Auth-State-Inhalte auszugeben oder zu stagen.
2. Danach die zwei W1.1A-Greps sequenziell erneut ausfuehren.
3. Wenn die DB-Write-Proofs danach fehlschlagen, den ersten echten roten Flow
   als separaten kleinen Proof-Blocker bearbeiten.
4. Optional einen expliziten Auth-Preflight fuer W1.1B/Folgebloecke planen, der
   vor breiten DB-Write-Greps klar zwischen "Auth-State fehlt", "Session
   ungueltig" und "DB-Dichte-Gate" unterscheidet.
