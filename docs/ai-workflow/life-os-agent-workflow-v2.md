# Life OS Agent Workflow V2

Stand: 2026-07-07
Status: Active
Zweck: Operative Agentenregeln fuer vollstaendige Life-OS-Featurearbeit mit UI, Backend und Browser-Proof.
Quelle der Wahrheit: `AGENTS.md`, `AI_WORKFLOW.md`, `PRODUCT.md`, `DESIGN.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `SECURITY.md`, `ACCESSIBILITY.md`, `ROADMAP.md`.
Gilt fuer: Codex-, Claude-, Cursor-, Copilot- und andere Agentenarbeiten an Features, Prompts, Reviews und Workflow-Dokumentation.
Nicht gilt fuer: Produktstrategie im Detail, automatische Toolinstallation, neue Skills, MCP-Aktivierung oder Remote-DB-Aktionen.

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

Keine MCP-Installation in diesem Block.

Empfohlene Reihenfolge:

1. Context7 fuer aktuelle Library-/API-Dokumentation, nur bei Docs-Bedarf.
2. Playwright MCP als spaeteres lokales Browser-/Screenshot-/A11y-QA-Werkzeug.
3. Figma MCP nur read-/review-scoped und nie als Ersatz fuer V5.
4. Chrome/Next DevTools MCP spaeter fuer Runtime-, Hydration- oder Performance-Diagnose.
5. Supabase MCP erst nach separatem Local/Staging-Scope mit klarer Secret- und Remote-DB-Grenze.

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
