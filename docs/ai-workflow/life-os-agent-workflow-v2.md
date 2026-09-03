# Life OS Agent Workflow V2

Stand: 2026-07-07
Status: Historical supporting reference
Zweck: Historische Detailreferenz fuer vollstaendige Life-OS-Featurearbeit mit UI, Backend und Browser-Proof.
Quelle der Wahrheit: die in `AGENTS.md` definierte Reihenfolge; `AGENTS.md` und `AI_WORKFLOW.md` bleiben die kanonischen Codex-Workflow-Regeln.
Gilt nur als ergänzende Referenz für Codex-, Claude-, Cursor-, Copilot- und andere Agentenarbeiten. Bei Konflikt gilt die kanonische Quelle.
Nicht gilt fuer: Produktstrategie im Detail, automatische Toolinstallation, MCP-Aktivierung oder Remote-DB-Aktionen.

## 1. Zweck

Dieses Dokument generalisiert die bisher dashboard-spezifischen Sicherheits-,
Design- und Proof-Regeln fuer alle Life-OS-Featurearbeiten.

Ziel:

```text
Kein Feature gilt als abgeschlossen, bevor Product Intent, UI, Backend,
Persistenz- oder Prepared-State-Wahrheit, Reload-Stabilitaet und Browser-Proof
zusammen validiert sind.
```

## 2. Nicht-Ziele

- keine Produktfeatures bauen
- keine UI neu gestalten
- keine Codeverschiebung in `src/`
- keine Migrationen, RLS-/Policy-Aenderungen oder Remote-DB-Aktionen
- keine MCP-Installation
- keine neuen Skills implementieren
- keine externe AI/API aktivieren
- keine Secrets lesen, erzeugen oder dokumentieren

## 3. Canonical Skill Path

Canonical Skill Path:

```text
.agents/skills
```

Regeln:

- `.agents/skills` ist die aktive Skill-Wahrheit.
- `.github/skills` ist nicht aktiv, ausser ein File ist explizit als Copilot- oder Mirror-Pfad dokumentiert.
- Keine divergenten Skill-Versionen pflegen.
- Kein Skill-Duplikat ohne Owner, Status, Zweck und Sync-Regel.
- Skills ersetzen niemals `AGENTS.md`, `AI_WORKFLOW.md`, `DESIGN.md`, `ROADMAP.md` oder die Root-Wahrheiten.
- Externe Skills werden nur nach Zweck-, Scope-, Rechte- und Risiko-Review genutzt.

Aktive eigene Skills:

- `.agents/skills/life-os-design-taste/SKILL.md`
- `.agents/skills/life-os-codex-task-writer/SKILL.md`
- `.agents/skills/life-os-vertical-slice/SKILL.md`
- `.agents/skills/life-os-backend-action-slice/SKILL.md`
- `.agents/skills/life-os-browser-proof/SKILL.md`
- `.agents/skills/life-os-completion-gate/SKILL.md`

## 3.1 W1.0C Skills Baseline

W1.0C macht die dokumentierten Workflow-Gates als project-local Skills
nutzbar. Neue Codex-Prompts sollen die relevanten Skills explizit nennen,
statt die Gates nur frei zu paraphrasieren.

Aktive Baseline:

- `life-os-vertical-slice`: fuer Featurearbeit als vollstaendigen Nutzerfluss.
- `life-os-backend-action-slice`: fuer Server Actions, Repositories, Zod, Auth, Ownership und data-layer-only Arbeit.
- `life-os-browser-proof`: fuer Browser-, Reload- und Flow-Proof ohne MCP-Installationspflicht.
- `life-os-completion-gate`: fuer den Abschlussentscheid `PASS`, `PASS_WITH_DEFERRED` oder `BLOCKED`.
- `life-os-design-taste`: fuer V5 UI Review und Anti-generic UI. Kein separater konkurrierender V5-Review-Skill.

Prompt-Referenzen:

```text
Use $life-os-vertical-slice.
Use $life-os-backend-action-slice when mutations or repositories are touched.
Use $life-os-design-taste when UI is touched.
Use $life-os-browser-proof when UI, forms, buttons, navigation, prepared states, or persistence behavior must be proven.
Use $life-os-completion-gate before final reporting.
```

## 3.2 W1.0D Prompt Standards

W1.0D richtet die wiederholbaren Codex-Prompts auf Agent Workflow v2 aus.
Neue und aktualisierte Prompts muessen Skills explizit im Abschnitt
`Use Skills` referenzieren.

Aktive generische Prompts:

- `.github/prompts/vertical-slice.prompt.md`
- `.github/prompts/backend-action-slice.prompt.md`
- `.github/prompts/browser-proof.prompt.md`
- `.github/prompts/completion-review.prompt.md`
- `.github/prompts/create-codex-task.prompt.md`

Prompt-Ausgaben des `life-os-codex-task-writer` folgen dieser Struktur:

```text
Goal
Use Skills
Context
Files to Read
Hard Boundaries
Vertical Slice Scope
Done When
Validation
Staging
Report Format
```

MCP bleibt Phase W1.0E. W1.0D installiert keine MCPs und aendert keine MCP-
Konfiguration.

## 3.3 W1.0E MCP Pilot Readiness

W1.0E bereitet die lokale MCP-Pilotentscheidung vor, installiert aber kein MCP
und schreibt keine aktive Config.

Detailquelle:

- `docs/ai-workflow/mcp-pilot-readiness-w1-0e.md`

Pilot-Reihenfolge:

1. Playwright MCP zuerst fuer lokale Browser-Proofs.
2. Next DevTools MCP danach fuer lokale Runtime-, Route-, Hydration- und Server-Action-Diagnose.
3. Figma MCP spaeter read/review-scoped fuer V5-Fidelity und Design-Kontext.
4. Supabase MCP spaeter local/read-only fuer Schema-, RLS-/Policy- und Query-Kontext.

Nicht erlaubt in W1.0E:

- MCP-Installation
- `.mcp.json`
- `.codex/config.toml`
- User-Home-Konfiguration
- IDE-Konfiguration
- Remote-DB-Aktion
- Secret- oder Auth-State-Ausgabe

## 3.4 W1.0F UI / Function Debt Audit

W1.0F ist der Uebergang von Workflow-Migration zu finalen Vertical Slices.
Der Block baut keine Features, sondern klassifiziert UI-, Function-, Backend-
und Browser-Proof-Debt der bestehenden Life-OS-Flaechen gegen Agent Workflow v2.

Detailquelle:

- `docs/ai-workflow/ui-function-debt-audit-w1-0f.md`

W1.0F-Regel:

```text
Keine Surface gilt final connected, wenn UI, Action/Persistenz,
Reload-Stabilitaet und aktueller Browser-Proof nicht zusammen nachgewiesen
sind.
```

## 3.5 W1.0G Final Product Completion Roadmap

W1.0G uebersetzt den W1.0F-Debt in eine finale Produkt-Completion-Roadmap.
Nach W1.0G beginnt die Ausfuehrung finaler Vertical Slices, startend mit
Browser-Proof Recovery statt neuer Produktfeatures.

Detailquelle:

- `docs/product/final-product-completion-roadmap.md`

W1.0G-Regel:

```text
Proof- und Production-Claims werden zuerst stabilisiert. Feature-Tiefe,
Graph, AI und Automation folgen erst als kleine, validierbare Vertical Slices.
```

## 4. Vertical-Slice Completion Gate

Ein Feature gilt erst als abgeschlossen, wenn alle relevanten Punkte erfuellt
oder bewusst als nicht relevant begruendet sind:

1. Product Intent und Nicht-Ziele sind klar.
2. UI ist bedienbar.
3. Jeder Button persistiert, navigiert oder ist klar als Prepared/Future State markiert.
4. Server Action oder klarer Prepared State existiert.
5. Repository/DB-Pfad existiert, wenn Persistenz behauptet wird.
6. Zod, Auth und same-user Ownership sind fuer Mutations geprueft.
7. Reload-Stabilitaet ist geprueft, wenn Daten geschrieben oder projiziert werden.
8. Browser-Proof ist gruen, wenn UI oder User Flow betroffen sind.
9. Manual, Demo und Empty sind sauber getrennt.
10. QA-Doku oder E2E-/Browser-Proof ist aktualisiert.

Harte Regeln:

- Kein Button ohne Persistenz, echte Navigation oder klar markierten Prepared/Future State.
- Keine Persistenzbehauptung ohne Reload-Proof.
- Kein Feature-complete ohne Browser-Proof, wenn UI betroffen ist.
- Kein Demo-Fallback im Manual-Profil.
- Keine globale Textsuche als alleiniger Proof.

## 5. UI/V5 Review Gate

V5 bleibt Designwahrheit:

```text
Life OS - Linear Calm Dark Command Center
Dashboard Overhaul V5 - Subtle Color Identity Polish
```

Produktmodell:

```text
Dashboard = Steuerung
Bereichsseiten = Kontext
Detailseiten = Tiefe
Archiv = Vergangenheit
```

Vor UI-Aenderungen pruefen:

- `DESIGN.md`
- relevante `docs/design/*`
- bestehende V5-Komponenten, Tokens und Patterns
- vorhandene Figma-, Screenshot- oder DOM-Kontexte, falls vorhanden
- ob die UI an echte Funktionalitaet, Navigation oder klaren Prepared State gekoppelt ist

Nicht erlaubt:

- neue Designrichtung
- generische SaaS-Card-Wand
- Dashboard-Kopie fuer Bereichsseiten
- Neon-/Glow-/Glass-Ueberladung
- Charts ohne Entscheidung oder Textaussage
- Status nur ueber Farbe

## 6. Backend Action Gate

Neue Server Actions muessen:

- serverseitig authentifizieren.
- keine clientseitige `userId` als Trust Boundary akzeptieren.
- Zod `safeParse` nutzen.
- Repository oder RPC mit User-Scope nutzen.
- same-user Ownership fuer relationale FKs und polymorphe Targets pruefen.
- keine Service Role nutzen.
- relevante App-Pfade revalidieren.
- Fehler-, Success- und Blocked-Zustaende fuer die UI sichtbar machen.
- keine Secrets in Fehlern, Logs oder Client-Code preisgeben.

Aktueller Codepfad fuer dieses Pattern:

```text
src/features/real-data/actions
src/features/real-data/schemas
src/features/real-data/supabase/repositories
src/lib/supabase/server.ts
```

`src/server/*` ist derzeit keine aktive Boundary. Code nicht in neue
Server-Strukturen verschieben, solange kein bestaetigter Refactor-Scope
vorliegt.

## 7. Browser-Proof Gate

Bei UI- oder Funktionsaenderungen muss Codex einen Browser-Proof liefern oder
konkret begruenden, warum keiner noetig ist.

Browser-Proof bedeutet:

1. User Flow ausfuehren.
2. Button oder Form wirklich bedienen.
3. Persistenz oder Prepared-State-Verhalten bestaetigen.
4. Reload durchfuehren, wenn Daten geschrieben oder projiziert werden.
5. Ergebnis im konkreten Kontext pruefen.
6. Scoping-faehige Selektoren oder konkrete Regionen nutzen.
7. Keine globale Textsuche als alleinigen Beweis verwenden.

Wenn Playwright, Browser oder Sandbox blockiert sind, muss der Abschlussbericht
den blockierten Check, Grund und Rest-Risiko nennen.

## 8. Manual/Demo/Empty Boundary

Profile wechseln nur Datenquellen, nicht die UI-Wahrheit:

- `demo`: Design-Fixtures und V5-Referenz.
- `empty`: gleiche Shells ohne Demo-Strings.
- `manual`: echte lokale oder Supabase-backed Manual-Daten; kein Demo-Fallback.

Regeln:

- Manual darf keine Demo-Fixtures als Ersatz fuer fehlende Daten zeigen.
- Empty States erscheinen innerhalb der bestehenden Page- oder Card-Shell.
- Prepared/Future UI muss textlich klar blockiert sein und darf keinen Write behaupten.
- Manual Browser Proofs duerfen keine leere DB voraussetzen.
- Reload-Stabilitaet ist Teil des Proofs, wenn Daten persistiert werden.

## 9. MCP-Migration Reihenfolge

W1.0E ist Readiness, keine Installation.

Empfohlene Reihenfolge:

1. Playwright MCP als erstes lokales Browser-/Screenshot-/A11y-QA-Werkzeug.
2. Next DevTools MCP danach fuer Runtime-, Hydration- oder Performance-Diagnose.
3. Figma MCP danach nur read-/review-scoped und nie als Ersatz fuer V5.
4. Supabase MCP erst spaeter local/read-only mit klarer Secret- und Remote-DB-Grenze.

Context7 bleibt die bevorzugte aktuelle Docs-Quelle fuer Libraries und APIs,
ist aber nicht Teil dieser W1.0E-Installationsreihenfolge.

Vor Aktivierung immer pruefen:

- Zweck
- Scope
- Rechte
- Datenzugriff
- Logging/Telemetry
- Secret-Risiko
- Remote-vs-Local-Grenze

## 10. Skill-Migration Reihenfolge

1. `.agents/skills` als canonical dokumentieren.
2. `.github/skills` als inaktiv, deprecated oder mirror-only einordnen.
3. Keine Skill-Dateien dupliziert weiterentwickeln.
4. Erst spaeter neue Skills planen, wenn ein wiederholbarer Workflow bewiesen ist.
5. Neue Skills nur mit klarer Aktivierungsbeschreibung, Scope, Nicht-Zielen und Validierung.

## 11. Was Codex nie tun darf

- Dateien loeschen ohne explizite Freigabe.
- Produktfeatures nebenbei bauen.
- `src/` oder Datenmodell ausserhalb des bestaetigten Scopes aendern.
- RLS, Policies, Grants oder Migrationen umgehen.
- `supabase link`, `supabase db push` oder Remote-DB-Aktionen ohne Freigabe ausfuehren.
- `supabase db reset` als Standard-Testschritt nutzen.
- Service Role Key verwenden.
- Secrets, `.env`, private Daten, Browser-Sessions oder `private/` lesen oder dokumentieren.
- MCPs, externe AI/API oder neue Libraries automatisch installieren oder aktivieren.
- V5 durch externe Screenshots, Figma-Experimente oder generierte UI ersetzen.
- Feature-complete behaupten, wenn Browser-Proof, Reload-Proof oder Prepared-State-Wahrheit fehlen.

## 12. Abschlussbericht-Format

Standardformat:

```text
Erstellt:
Geändert:
Nicht geändert:
Validierung:
Offene Punkte:
Risiken:
```

Bei Workflow-/Migrationstasks zusaetzlich, falls relevant:

```text
Canonical Skill Path:
Skill Duplicate Handling:
Vertical Slice Gate:
Backend Action Gate:
UI/V5 Gate:
Browser Proof Gate:
Architecture Drift:
Prompt Standards:
Docs:
MCP:
Skills:
Commit:
Commit Hash:
Nicht gelöst:
Risiken:
```
