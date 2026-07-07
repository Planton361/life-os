# Prompting Rules

Stand: 2026-07-07
Status: Active  
Zweck: Standard für Codex-/Claude-/Copilot-Aufträge.  
Quelle der Wahrheit: `AGENTS.md`.  
Gilt für: Coding-, Design- und Dokumentationsprompts.  
Nicht gilt für: kurze Brainstorming-Chats.

## Standardstruktur

```text
Ziel
Dateien lesen
Dateien ändern
Dateien nicht ändern
Layout-Anforderungen
Datenmodell-Anforderungen
Designregeln
Security/Accessibility-Regeln
Akzeptanzkriterien
Prüfung nach Fertigstellung
Ausgabeformat
```

## Featureprompt V2

Jeder neue Codex-Featureprompt nutzt kuenftig diese Struktur:

```text
Goal:
Use Skills:
Context:
Files to Read:
Files to Change:
Files Not to Change:
Hard Boundaries:
Vertical Slice Scope:
Done When:
Validation:
Staging:
Report Format:
```

`Vertical Slice Scope` muss explizit klaeren:

- UI oder Prepared/Future State
- Server Action oder Begruendung, warum keine Mutation noetig ist
- Repository/DB-Pfad, wenn Persistenz behauptet wird
- Zod/Auth/Ownership-Gates bei Mutations
- Reload-Stabilitaet
- Browser-Proof oder begruendete Ausnahme
- Manual/Demo/Empty-Grenze
- QA-Doku oder E2E-/Browser-Proof

Featureprompt-Regeln:

- Kein Button ohne Persistenz, echte Navigation oder klar markierten Prepared/Future State.
- Keine Persistenzbehauptung ohne Reload-Proof.
- Kein Feature-complete ohne Browser-Proof, wenn UI betroffen ist.
- Keine globale Textsuche als alleiniger Browser-Beweis.

## W1.0D Prompt Standards

Codex-Prompts referenzieren Skills explizit im Abschnitt `Use Skills`.
Die Skill-Auswahl soll klein und passend bleiben.

Standard-Kombinationen:

```text
UI Feature:
- life-os-vertical-slice
- life-os-design-taste
- life-os-browser-proof
- life-os-completion-gate

Backend/Data Feature:
- life-os-backend-action-slice
- life-os-completion-gate
- life-os-browser-proof, falls UI betroffen ist

UI Review:
- life-os-design-taste
- life-os-completion-gate

Bugfix:
- life-os-completion-gate
- life-os-browser-proof, falls Verhalten betroffen ist

Docs/Workflow:
- life-os-completion-gate
```

Wiederholbare Prompts:

- `.github/prompts/vertical-slice.prompt.md`: Featurearbeit mit UI, Server Action, Repository, Zod, Ownership, Reload und Browser-Proof.
- `.github/prompts/backend-action-slice.prompt.md`: Server Actions, Repositories, Zod/Auth/Ownership, Revalidation und data-layer-only Grenzen.
- `.github/prompts/browser-proof.prompt.md`: Browser-/E2E-Proofs fuer konkrete User Flows.
- `.github/prompts/completion-review.prompt.md`: Abschlussreview nach Codex-Blocks.
- `.github/prompts/create-codex-task.prompt.md`: breite Anforderungen in sichere Codex-Aufgaben uebersetzen.
- `.github/prompts/create-feature-spec.prompt.md`: Feature-Ideen in fokussierte Spezifikationen uebersetzen.
- `.github/prompts/dashboard-safe-change.prompt.md`: kleine Dashboard-V5-Aenderungen nach Change Type.
- `.github/prompts/build-dashboard-component.prompt.md`: einzelne Dashboard-V5-Komponenten bauen oder aktualisieren.
- `.github/prompts/review-ui-against-design.prompt.md`: Screenshots oder Diffs gegen V5 reviewen.
- `.github/prompts/accessibility-review.prompt.md`: UI oder Diff gegen Accessibility-Basics reviewen.

## Plan Mode

Plan Mode nutzen, bevor Codex große, mehrdateiige, sicherheitsrelevante, datenmodellbezogene oder designsystemrelevante Änderungen umsetzt.

Ein Plan muss nennen:

- gelesene Quellen
- geplante Dateien
- konkrete Änderungen
- Nicht-Ziele
- Risiken
- Validierung

Erst nach bestätigtem Scope wird umgesetzt.

## Pursue Goal

Pursue Goal nutzen, wenn ein bestätigtes Ziel über mehrere Arbeitsschritte konsequent bis zur validierten Definition of Done verfolgt werden soll.

Regeln:

- den ursprünglichen Scope nicht verkleinern
- Fortschritt gegen Akzeptanzkriterien prüfen
- Worktree als Wahrheit behandeln
- keine App-, Tool- oder Datenänderungen außerhalb des bestätigten Scopes
- Ziel erst nach Validierung als abgeschlossen betrachten

## Skill-Aktivierung

Aktive eigene Skills können explizit im Prompt genannt werden:

- `$life-os-design-taste` für V5-gebundene UI-/Designreviews
- `$life-os-codex-task-writer` für sichere, kleine, prüfbare Codex-Aufträge
- `$life-os-vertical-slice` fuer komplette Feature-Slices
- `$life-os-backend-action-slice` fuer Server Actions, Repositories, Zod/Auth/Ownership und data-layer-only Arbeit
- `$life-os-browser-proof` fuer Browser- und Reload-Proofs
- `$life-os-completion-gate` fuer ehrliche PASS/PASS_WITH_DEFERRED/BLOCKED-Abschluesse

Skills ersetzen nicht `AGENTS.md`, `DESIGN.md`, `AI_WORKFLOW.md`, `ROADMAP.md` oder V5. Externe Skills werden nur nach Review genutzt und nicht automatisch installiert.

Canonical Skill Path ist `.agents/skills`. `.github/skills` ist nicht aktiv, ausser ein File ist explizit als Copilot-/Mirror-Pfad dokumentiert.

## Gute Prompts

```text
Aktualisiere DESIGN.md auf V5.
Nutze docs/design/dashboard-v5.md als Quelle.
Ändere keine Komponenten.
Archivierte Dateien nicht löschen.
Berichte Diff und offene Punkte.
```

## Schlechte Prompts

```text
Mach das Dashboard schöner.
Bau die App fertig.
Überarbeite alles.
Installiere die besten Tools.
```

## Review-Pflicht

Bei großen Änderungen zuerst Plan ausgeben. Bei Security, Datenmodell oder Designsystem nie ohne expliziten Scope arbeiten.

## Harte Prompt-Grenzen

- keine Dateien löschen ohne ausdrückliche Bestätigung
- keine neue Designrichtung einführen
- V5 nicht durch externe Skills, MCPs, Screenshots oder generierte UI ersetzen
- keine externen Tools automatisch installieren oder aktivieren
- keine Feature-Completion ohne Vertical-Slice-Gate aus `docs/ai-workflow/life-os-agent-workflow-v2.md`
- Bericht immer im Format aus `AGENTS.md` liefern, wenn eine Aufgabe umgesetzt wurde
