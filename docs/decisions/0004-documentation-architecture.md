# 0004 – Documentation Architecture

Stand: 2026-06-17  
Status: Proposed

## Kontext

Viele Markdown-Dateien existieren nebeneinander. Einige sind Dopplungen oder Legacy.

## Entscheidung

Dokumentation wird in drei aktive Ebenen geteilt:

1. ChatGPT-Projektwissen: konzeptionell.
2. Workspace Root: operative Agentenwahrheit.
3. `docs/`: Details nach Bedarf.

Zusätzlich:

- `.github/instructions` für wiederverwendbare Regeln.
- `.github/prompts` für wiederholbare Prompts.
- `docs/archive/legacy` für alte Quellen.

## Konsequenzen

- weniger Dopplung
- klarere Agentenführung
- alte Dateien bleiben verfügbar, aber nicht aktiv
