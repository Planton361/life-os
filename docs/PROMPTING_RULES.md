# PROMPTING_RULES.md

Stand: 2026-06-12

## Codex Prompt Struktur

Jeder Prompt enthält:

```text
Ziel
Kontext
Dateien lesen
Dateien ändern
Dateien nicht ändern
Designregeln
Architekturregeln
Security/Accessibility
Akzeptanzkriterien
Prüfung
Ausgabeformat
```

## Gute Prompts

```text
Erstelle die DashboardHero-Komponente.
Nutze DESIGN.md.
Ändere nur components/dashboard/DashboardHero.tsx und ggf. Tests.
Keine neue Library.
Prüfe mobile Layout und Accessibility.
```

## Schlechte Prompts

```text
Mach die App schöner.
Bau alles.
Füge einfach ein paar coole Charts hinzu.
```

## Design Prompt Regel

Immer Skelett und Vibe trennen:

```text
Skelett nicht ändern.
Vibe über Tokens/Komponentenstil anpassen.
```
