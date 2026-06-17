# AI_WORKFLOW.md

Stand: 2026-06-17  
Status: Active  
Zweck: operative AI-/Agenten-Workflow-Regeln.  
Quelle der Wahrheit: Diese Datei; Details in `docs/ai-workflow/*`.  
Gilt für: Codex, Claude, Cursor, Copilot, MCP, Skills.  
Nicht gilt für: verpflichtende Installation externer Tools.

## Kurzfassung

Agents sollen dieselben Root-Wahrheiten lesen, nur relevante Detaildateien laden und keine alten Research- oder Dashboard-Varianten als aktive Quelle nutzen.

## Ebenen

1. Root-Dateien: immer relevante Wahrheit.
2. `docs/`: Detailwissen nach Bedarf.
3. `.github/instructions`: wiederverwendbare Kontextregeln.
4. `.github/prompts`: wiederholbare Aufgabenprompts.
5. Skills/MCP/Agents: optional und sicherheitsgeprüft.

## Aktuell sinnvoll

- AGENTS.md für Codex und andere Coding Agents.
- `.github/copilot-instructions.md` für repositoryweite Copilot-Regeln.
- `.github/instructions/*.instructions.md` für bereichsspezifische Regeln.
- `.github/prompts/*.prompt.md` für wiederholbare Workflows.
- Playwright für Screenshot-/Browser-QA.
- Context7 als optionale aktuelle Docs-Quelle.
- Repomix/Gitingest für große Kontextanalysen.

## Nur optional/später

- Task Master / CCPM
- Stagehand
- OpenHands
- Cline/Aider als Alternativharness
- Subagents
- eigene Skills
- Memory Layer

## Sicherheitsregel

MCP-/Agenten-Tools bekommen nie pauschal Zugriff auf Secrets, private Daten oder Produktionssysteme. Jede Integration braucht Zweck, Scope, Rechte, Risiko und Review.
