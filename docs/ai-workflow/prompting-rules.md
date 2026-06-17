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
