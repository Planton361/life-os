# Prompting Rules

Stand: 2026-06-17  
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

Skills ersetzen nicht `AGENTS.md`, `DESIGN.md`, `AI_WORKFLOW.md`, `ROADMAP.md` oder V5. Externe Skills werden nur nach Review genutzt und nicht automatisch installiert.

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
- Bericht immer im Format aus `AGENTS.md` liefern, wenn eine Aufgabe umgesetzt wurde
