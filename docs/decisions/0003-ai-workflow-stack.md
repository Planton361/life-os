# 0003 – AI Workflow Stack

Stand: 2026-06-17  
Status: Accepted as Direction

## Kontext

Das Projekt nutzt oder evaluiert mehrere AI-Agenten-Workflows: Codex, Claude, Cursor, Copilot, MCP, Skills, Repomix, Playwright.

## Entscheidung

Die Toolchain wird dokumentationszentriert aufgebaut:

- Root-Dateien als operative Wahrheit
- `docs/` als Detailwissen
- `.github/instructions` und `.github/prompts` für wiederholbare Agentenarbeit
- MCP/Skills nur optional und sicherheitsgeprüft

## Konsequenzen

- Kein Tool ersetzt Produkt- oder Designwahrheit.
- Externe Tools werden nicht pauschal installiert.
- Agenten arbeiten mit klaren Leseregeln und Berichtspflicht.
