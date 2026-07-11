# F1.1B Project / Goal Workbench State Clarity

Stand: 2026-07-11
Status: Implemented; validation in this block
Quelle der Wahrheit: `docs/product/project-goal-workbench-depth-scope-f1-1a.md`,
`docs/product/final-product-completion-roadmap.md`,
`docs/product/final-surface-connected-claim-review-f0-1.md`, V5 Design Docs
und `tests/e2e/content-state-system.spec.ts`.
Nicht gilt fuer: neue Datenmodelle, Milestones, Logs, Review Cadence,
Progress Engine, Archive/Undo, Graph, AI Coach, Migrationen, RLS-/Policy-
Aenderungen, Remote-DB oder Deployment.

## 1. Zweck

F1.1B schaerft die sichtbare Wahrheit der bestehenden Project/Goal Workbench.
Der Block baut keine neue Workbench und keine neue Persistenz. Er macht klarer,
welche Bereiche connected sind, welche nur vorbereitet sind und welche
Progress-/Metric-Texte nur einfache Signale sind.

## 2. Nicht-Ziele

- keine Project/Goal Workbench neu bauen
- keine Milestones implementieren
- keine Logs implementieren
- keine Review Cadence implementieren
- keine Project-/Goal-Progress-Engine implementieren
- keine Project-/Goal-Archive- oder Undo-Semantik implementieren
- keine Resource-Management-Funktion in der Workbench bauen
- keine Graph-/Relations-Map bauen
- keine AI-Coach-Funktion bauen
- keine neue Tabelle, Migration, RLS-/Policy-Aenderung oder Remote-DB-Aktion

## 3. Project Workbench State Clarity

Connected sichtbar gehalten:

- `Linked Task fuer Project erstellen` persistiert eine Task mit Project-
  Kontext im Manual-Profil.
- Linked Tasks werden weiter im Project Workbench angezeigt.
- Task Lifecycle- und Scheduling-Controls bleiben echte Task Actions.
- Resource Relations werden weiter angezeigt, wenn eine echte Relation auf das
  Project existiert.

Geklaert:

- `Task-Fortschritt` wurde zu `Task-basiertes Signal`.
- Empty Progress Copy sagt jetzt, dass Fortschritt nur aus verknuepften Tasks
  berechnet wird.
- Linked Task Section erklaert, dass Lifecycle- und Scheduling-Controls echte
  Task Actions sind.
- Prepared/Future Section sagt explizit, dass Milestones und Project Log noch
  keine lokale Datenquelle/Persistenz haben.
- Future Scope nennt Project Archive/Undo, Graph und AI Coach ausdruecklich als
  nicht persistiert.

## 4. Goal Workbench State Clarity

Connected sichtbar gehalten:

- `Linked Task fuer Goal erstellen` persistiert eine Task mit Goal-Kontext im
  Manual-Profil.
- `Linked Project fuer Goal erstellen` persistiert ein Project mit Goal-Kontext
  im Manual-Profil.
- Linked Projects und Linked Tasks werden weiter aus vorhandenen lokalen Daten
  angezeigt.
- Task Lifecycle- und Scheduling-Controls bleiben echte Task Actions.
- Resource Relations werden weiter angezeigt, wenn eine echte Relation auf das
  Goal existiert.

Geklaert:

- `Linked Work Progress` wurde zu `Arbeitsbasiertes Signal`.
- Goal-Kennzahlen sprechen von Projects, Tasks und erledigten Tasks statt von
  einer finalen Ziel-Progress-Engine.
- Linked Project/Task Sections erklaeren, dass die Listen vorhandene lokale
  Daten lesen.
- Prepared/Future Section sagt explizit, dass Milestones, Review Cadence und
  Goal Log noch keine Persistenz schreiben.
- Future Scope nennt Goal Archive/Undo, Graph und AI Coach ausdruecklich als
  nicht persistiert.

## 5. Prepared/Future Areas

Final verbunden wurden keine neuen Prepared/Future Areas.

Klarer markiert:

- Project Milestones
- Project Log
- Goal Milestones
- Goal Review Cadence
- Goal Log
- Resource Management innerhalb der Workbench
- Project/Goal Archive/Undo
- Graph / Relations Map
- AI Coach

Entscheidung:

```text
Prepared/Future bleibt ehrlich markiert.
Keine Prepared Section behauptet Write-Faehigkeit.
Keine Prepared Section zeigt Fake-Milestones, Fake-Logs oder Fake-Reviews.
```

## 6. Progress / Metrics Clarity

Project:

- Progress in der Project Workbench ist als task-basiertes Signal formuliert.
- Ohne verknuepfte Tasks steht kein berechneter Fortschritt im Raum.
- Die globale Context-Panel-Progresszeile heisst `Progress-Signal / Count`.
- Die Notiz unter der Progressbar sagt, dass Project Progress nur ein Signal
  ist und Milestones, Logs sowie Archive/Undo nicht verbunden sind.

Goal:

- Progress in der Goal Workbench ist als arbeitsbasiertes Signal formuliert.
- Linked Projects und Linked Tasks bleiben echte Zaehlwerte.
- Die globale Context-Panel-Progressnotiz sagt, dass Review Cadence, Key
  Results und Zielhistorie nicht verbunden sind.

Nicht geaendert:

- Keine neue Fortschrittsformel.
- Keine OKR-/KR-Engine.
- Keine Milestone-basierte Berechnung.

## 7. Entity Route / Workbench Truth

Geprueft:

- Portfolio bleibt Kontext und Sammlung.
- Project/Goal Workbench im Portfolio bleibt die connected lokale Workbench fuer
  linked work.
- `/projects`, `/projects/[projectId]`, `/goals` und `/goals/[goalId]`
  bleiben eigene Entity Routes und wurden in F1.1B nicht neu ausgerichtet.

Fix-Entscheidung:

- Keine Route wurde gebaut oder ersetzt.
- Die Workbench copy verspricht keine neue Detailseite.
- Entity Route Alignment bleibt F1.1H.

## 8. Design-Taste Review

Was passt zu V5:

- dichte, ruhige Workbench-Struktur bleibt erhalten
- textgestuetzte Status- und Progress-Signale
- keine neuen Kartenwaende, Graphen, Gradients oder dekorativen Elemente
- Prepared/Future Bereiche bleiben leise und untergeordnet

Was verletzt V5:

- Vor F1.1B konnte Progress-Copy finaler wirken als die Datenbasis.
- Prepared Copy war korrekt, aber zu unspezifisch fuer Nutzererwartung.
- Resource Section zeigte echte Relations, ohne klar zu sagen, dass sie
  display-only ist.

Konkrete Fixes:

- Progress Copy entschaerft
- Connected Work beschrieben
- Prepared/Future Copy konkretisiert
- Resource Relation Display als Anzeige, nicht Management, markiert

Acceptance Decision:

```text
PASS_WITH_DEFERRED
```

V5 passt fuer diesen Block. Deferred bleiben echte Tiefen-Slices.

## 9. Fixes

Geaendert:

- `src/features/portfolio/components/portfolio-context-panel.tsx`
- `tests/e2e/content-state-system.spec.ts`

UI-Fixes:

- Project/Goal create headings als Linked Work geschaerft.
- Connected create descriptions sagen `persistiert`.
- Progress-/Metric-Copy entschaerft.
- Prepared/Future headings und body copy geschaerft.
- Resource Relation Display als display-only markiert.

E2E-Fixes:

- Focused Workbench assertions pruefen die neue state-clarity copy.
- Bestehende form aria labels bleiben stabil.
- Bestehende connected form/buttons bleiben sichtbar.

## 10. Remaining Deferred Work

- Project Milestones
- Goal Milestones
- Project Log
- Goal Log
- Goal Review Cadence
- Project/Goal update/status/archive/undo semantics
- final Project/Goal progress model
- Workbench-local Resource Management
- Skill Evidence / Evidence Depth im Project/Goal Kontext
- Entity Route Alignment
- Graph / Relations Map
- AI Coach

## 11. Connected Claim Impact

Claim bleibt unveraendert:

```text
Project Workbench = local_connected_with_depth_gap
Goal Workbench = local_connected_with_depth_gap
Portfolio = local_connected_with_depth_gap
```

F1.1B verbessert sichtbare State-Wahrheit, aber hebt keine Surface auf
`local_connected` oder `final complete`.

Keine Production-, Remote-, Public-SaaS- oder final-complete-Claims.

## 12. Validation

Standardchecks:

- `git diff --check`: passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm build`: passed after sandbox escalation for Turbopack localhost port
  binding.
- `pnpm exec supabase db lint --local --level warning`: passed after sandbox
  escalation for Supabase CLI local state/telemetry writes.
- `pnpm exec supabase db advisors --local --type security --level warn
  --fail-on none`: passed after sandbox escalation for Supabase CLI local
  state/telemetry writes.

Browser proof:

- Broad requested grep
  `Portfolio|Project Workbench|Goal Workbench|Manual`: blocked by an unrelated
  Calendar manual test before the Portfolio block. Failure:
  `Manual Calendar unschedules DB task back into planner queue` expected
  `15 min spaeter` to be enabled, but it was disabled.
- F1.0C.1 isolated this blocker as `TEST_SLOT_SELECTION_BUG`: the Calendar
  free-slot helper could fall back to a crowded Manual-DB slot instead of
  proving a same-day free move-later window. The Calendar app correctly
  disabled `15 min spaeter` once the test had scheduled into a visible
  conflict.
- F1.0C.1 fixed the Calendar proof helper and reran the focused Calendar proof
  `Calendar|Today|Dashboard|Manual`: passed, 72 passed, 2 skipped, 0 failed.
- Narrow F1.1B proof
  `Portfolio|Project Workbench|Goal Workbench`: passed, 27 passed, 0 failed.
- F1.0C.1 reran the same narrow F1.1B proof after the Calendar fix:
  passed, 27 passed, 0 failed.

Proof impact:

- Project/Goal Workbench state-clarity assertions are green.
- Connected Project/Goal linked Task, Goal-linked Project, Task lifecycle,
  Portfolio Add-to-Existing, Archive, Resource-to-Project and Resource-to-Goal
  relation flows remain green in the focused proof.
- Broad `Manual` remains a cross-surface regression grep, not the Workbench
  acceptance proof. F1.1B acceptance stays the focused
  `Portfolio|Project Workbench|Goal Workbench` proof.
