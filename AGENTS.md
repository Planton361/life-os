# AGENTS.md

Stand: 2026-07-07
Status: Active  
Zweck: Operative Arbeitsregeln für Codex, Claude, Cursor, Copilot und andere Coding Agents.  
Quelle der Wahrheit: Diese Datei für Agentenverhalten.  
Gilt für: alle Agentenarbeiten im Repo.  
Nicht gilt für: Produktstrategie im Detail; siehe `PRODUCT.md`.

## Kurzfassung

Arbeite erst prüfend, dann ändernd. Nichts löschen ohne ausdrückliche Bestätigung. Bestehende Dateien und Komponenten bevorzugt verbessern statt duplizieren. V5 ist die finale Dashboard-Designrichtung.

## Immer zuerst lesen

- `PRODUCT.md`
- `DESIGN.md`
- `ARCHITECTURE.md`
- `DATA_MODEL.md`
- `SECURITY.md`
- `ACCESSIBILITY.md`
- `ROADMAP.md`
- `AI_WORKFLOW.md`

Bei UI-/Dashboard-Aufgaben zusätzlich:

- `docs/design/dashboard-v5.md`
- `docs/design/dashboard-layout-lock.md`
- `docs/design/design-tokens.md`
- `docs/design/component-system.md`
- `docs/design/visualization-rules.md`
- `docs/design/effects-and-motion.md`
- `docs/engineering/dashboard-code-structure.md`
- `docs/ai-workflow/codex-dashboard-workflow.md`

Bei Produkt-/Route-Aufgaben zusätzlich:

- `docs/product/pages-and-routes.md`
- `docs/product/ux-flows.md`
- `docs/product/feature-spec.md`

Bei Agenten-/Prompt-Aufgaben zusätzlich:

- `docs/ai-workflow/life-os-agent-workflow-v2.md`
- `docs/ai-workflow/prompting-rules.md`
- `docs/ai-workflow/review-workflow.md`
- `docs/ai-workflow/tools-and-repos.md`

## Codex Capability Layer

Aktive eigene Skills:

- `$life-os-design-taste`: nutzen, wenn UI-, Dashboard-, Komponenten-, Layout- oder visuelle Vorschläge gegen V5 geprüft werden.
- `$life-os-codex-task-writer`: nutzen, wenn vage Anforderungen in kleine, sichere, prüfbare Codex-Aufträge übersetzt werden.

Regeln:

- Canonical Skill Path ist `.agents/skills`.
- `.github/skills` ist nicht aktiv, ausser explizit als Copilot-/Mirror-Pfad dokumentiert.
- Keine divergenten Skill-Versionen ohne Owner, Status und klaren Zweck pflegen.
- Skills ergänzen die Arbeit, ersetzen aber nicht `DESIGN.md`, `AI_WORKFLOW.md`, `ROADMAP.md` oder andere Root-Wahrheiten.
- `$life-os-design-taste` ersetzt V5 nicht. V5 bleibt die verbindliche Designwahrheit.
- Skills treffen keine autonomen Produktentscheidungen.
- Externe Skills, MCPs und Agententools werden erst nach Review von Zweck, Scope, Rechten und Risiko genutzt.
- Externe Tools werden nicht automatisch installiert oder aktiviert.
- Große Aufgaben zuerst im Plan Mode klären, dann erst im bestätigten Scope umsetzen.

## Arbeitsregeln

- Vor größeren Änderungen Plan ausgeben.
- Keine Dateien löschen.
- Keine alten Dashboard-Varianten reaktivieren.
- Keine neue Library ohne Begründung.
- Keine Secrets anfassen oder erzeugen.
- Keine RLS/Security-Regeln umgehen.
- Keine umfangreichen Refactors nebenbei.
- Kleine, reviewbare Änderungen bevorzugen.
- Nach Änderungen relevante Checks ausführen oder begründen, warum nicht möglich.
- Dashboard-Layout ist locked.
- Layoutwerte dürfen nur mit explizitem Layout-Scope geändert werden.
- Color-/Content-/Motion-/Refactor-Aufgaben dürfen keine Layoutwerte ändern.
- `next-env.d.ts` ist generated und wird nicht versioniert; vor TypeScript-Checks `pnpm typecheck` nutzen. Nicht auf `next-env.d.ts`-Diffs stoppen, wenn die Datei ignoriert oder untracked ist.

## Vertical-Slice Completion Gate

Ein Feature gilt erst als abgeschlossen, wenn:

- Product Intent und Nicht-Ziele klar sind.
- UI bedienbar ist oder der Zustand klar als Prepared/Future markiert ist.
- Jeder Button entweder persistiert, navigiert oder eindeutig als Prepared/Future blockiert ist.
- Server Action oder Repository/DB-Pfad existiert, wenn Persistenz behauptet wird.
- Zod, Auth und same-user Ownership fuer Mutations und relationale Targets geprueft sind.
- Reload-Stabilitaet geprueft ist, wenn ein Write oder eine Projektion behauptet wird.
- Browser-Proof gruen ist, wenn UI oder User Flow betroffen sind.
- Manual, Demo und Empty sauber getrennt bleiben.
- QA-Doku oder E2E-/Browser-Proof aktualisiert ist.

Keine Persistenzbehauptung ohne Reload-Proof. Kein Feature-complete ohne Browser-Proof, wenn UI betroffen ist.

## Backend Action Gate

Neue Server Actions muessen:

- serverseitig authentifizieren.
- keine clientseitige `userId` als Trust Boundary akzeptieren.
- Zod `safeParse` nutzen.
- Repository oder RPC mit User-Scope nutzen.
- same-user Ownership fuer FKs und polymorphe Targets pruefen.
- keine Service Role nutzen.
- relevante App-Pfade revalidieren.
- sichtbare Success-, Error- und Blocked-Zustaende ermoeglichen.

## UI/V5 Gate

V5 bleibt Designwahrheit. Codex darf keine neue Designrichtung, keine generische SaaS-Card-Wand und keine Dashboard-Kopie fuer Bereichsseiten einfuehren.

Vor UI-Arbeit pruefen:

- bestehende V5-Komponenten und Tokens.
- `DESIGN.md` und relevante `docs/design/*`.
- vorhandene Figma-, Screenshot- oder DOM-Kontexte, falls vorhanden.
- ob die UI direkt an echte Funktionalitaet, Navigation oder klaren Prepared State gekoppelt ist.

Produktmodell:

```text
Dashboard = Steuerung
Bereichsseiten = Kontext
Detailseiten = Tiefe
Archiv = Vergangenheit
```

## Browser-Proof Gate

Bei UI- oder Funktionsaenderungen muss Codex einen Browser-Proof liefern oder konkret begruenden, warum keiner noetig ist.

Browser-Proof bedeutet:

- User Flow ausfuehren.
- Button oder Form wirklich bedienen.
- Persistenz oder Prepared-State-Verhalten bestaetigen.
- Reload ausfuehren, wenn Daten geschrieben oder projiziert werden.
- Ergebnis im konkreten Kontext pruefen.
- Keine globale Textsuche als alleinigen Beweis verwenden.

## Design-Hard-Limits

- Aktive Designrichtung: `Life OS – Linear Calm Dark Command Center`.
- Figma-Basis: `Dashboard Overhaul V5 – Subtle Color Identity Polish`.
- Keine Neon-Gradients.
- Keine Glass-Lawine.
- Keine Chart-Flut.
- Keine generische AI-Slop-Optik.
- Keine übertriebene Gamification.
- P0 dominiert: Today Agenda und Daily Control.

## Ausgabeformat

```text
Erstellt:
Geändert:
Nicht geändert:
Validierung:
Offene Punkte:
Risiken:
```

## Definition of Done

- [ ] Aufgabe erfüllt.
- [ ] Designsystem respektiert.
- [ ] Mobile-Verhalten bedacht.
- [ ] Accessibility nicht verschlechtert.
- [ ] Security/Privacy nicht verletzt.
- [ ] Keine unnötigen Duplikate erzeugt.
- [ ] Keine alte Wahrheit aktiv gehalten.
