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
5. Eigene Skills: aktiv, eng gescoped und an Root-Wahrheiten gebunden.
6. Externe Skills/MCP/Agents: optional, reviewpflichtig und nicht automatisch aktiviert.

## Phase 1.6 - Codex Capability Enablement

Phase 1.6 liegt vor Phase 2. Sie finalisiert die Agentenfähigkeit, ohne App-Features zu bauen.

Scope:

- eigene Life-OS-Skills dokumentieren und aktiv nutzbar machen
- MCP-Regeln und sichere Tool-Nutzung einordnen
- Prompting-Regeln für Plan Mode, Pursue Goal und Skill-Aktivierung ergänzen
- Context7 als erste empfohlene Quelle für aktuelle Library-Dokumentation einordnen
- Playwright MCP als späteres UI-/Screenshot-/Accessibility-QA-Tool dokumentieren
- externe Tools, Skills und MCPs nicht automatisch installieren oder aktivieren

## Aktuell sinnvoll

- AGENTS.md für Codex und andere Coding Agents.
- `.github/copilot-instructions.md` für repositoryweite Copilot-Regeln.
- `.github/instructions/*.instructions.md` für bereichsspezifische Regeln.
- `.github/prompts/*.prompt.md` für wiederholbare Workflows.
- `$life-os-design-taste` für V5-gebundene UI-/Designreviews.
- `$life-os-codex-task-writer` für sichere, prüfbare Codex-Aufträge.
- `docs/ai-workflow/codex-dashboard-workflow.md` für sichere Dashboard-Änderungen nach Change Type.
- `.github/instructions/life-os-dashboard.instructions.md` für kompakte Dashboard-Regeln im GitHub-/Copilot-/Codex-Kontext.
- `.github/prompts/dashboard-safe-change.prompt.md` für kleine, dateigenaue Dashboard-Änderungen.
- Context7 als erste empfohlene aktuelle Docs-Quelle für Libraries und APIs.
- Playwright MCP später für lokale Screenshot-/Browser-/Accessibility-QA.
- Repomix/Gitingest für große Kontextanalysen.

Dashboard-Änderungen müssen künftig zuerst nach Change Type getrennt werden: `layout`, `color`, `content`, `motion`, `refactor`.

## Nur optional/später

- Task Master / CCPM
- Stagehand
- OpenHands
- Cline/Aider als Alternativharness
- Subagents
- weitere eigene Skills
- Memory Layer

## Sicherheitsregel

MCP-/Agenten-Tools bekommen nie pauschal Zugriff auf Secrets, private Daten oder Produktionssysteme. Jede Integration braucht Zweck, Scope, Rechte, Risiko und Review.

Aktive eigene Skills dürfen Dokumentation und Reviews strukturieren. Sie geben keine Autonomie-Freigabe für Produktentscheidungen, externe Installationen, Commits, Toolketten oder Zugriff auf Secrets.
