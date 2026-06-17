# Tools and Repos

Stand: 2026-06-17  
Status: Active  
Zweck: AI-/Agenten-Tooling einordnen.  
Quelle der Wahrheit: `AI_WORKFLOW.md`.  
Gilt für: Tool-Auswahl und Recherche.  
Nicht gilt für: automatische Installation oder verbindliche Nutzung.

## Bewertungslogik

| Status | Bedeutung |
|---|---|
| Core now | sofort nützlich, geringe Komplexität |
| Soon | nützlich nach Dokumentationsmigration oder UI-Start |
| Later | erst bei größerem Repo/mehr Komplexität |
| Research only | Inspirationsquelle, keine aktive Toolchain |

## Tool-Mapping

| Tool / Repo | Rolle | Status | Grenze |
|---|---|---|---|
| `github/spec-kit` | Spec-driven Development | Soon | nicht jede kleine Änderung überspezifizieren |
| `eyaltoledano/claude-task-master` | PRD in Tasks zerlegen | Later | erst bei größerem Taskvolumen |
| `automazeio/ccpm` | Epic/Issue-Agentenworkflow | Later | zu schwer für MVP |
| `upstash/context7` | aktuelle Docs für Libraries | Soon | nicht ungeprüft Code übernehmen |
| `yamadashy/repomix` | Repo-Kontext für LLMs | Soon | keine Secrets einpacken |
| `cyclotruc/gitingest` | fremde Repos analysieren | Research only | fremde Patterns prüfen |
| `microsoft/playwright-mcp` | Browser-QA/Screenshot/A11y | Soon | nur lokal/sicher verwenden |
| `browserbase/stagehand` | Browser-Agenten später | Later | nicht MVP-kritisch |
| `nextlevelbuilder/ui-ux-pro-max-skill` | Design-/UX-Review | Research/Soon | ersetzt V5 nicht |
| `21st-dev/magic-mcp` | Komponenten-Inspiration | Research/Soon | kein Dashboard neu generieren |
| `github/awesome-copilot` | Beispiele für Copilot-Anpassungen | Research only | nicht blind übernehmen |
| `hesreallyhim/awesome-claude-code` | Claude-Code-Ideen | Research only | prüfen, nicht kopieren |
| `VoltAgent/awesome-claude-code-subagents` | Subagent-Beispiele | Research only | Subagents erst später |
| `wshobson/agents` | Agentenrollen | Research only | Rollen an Life OS anpassen |
| `cline/cline` | IDE-Agent | Later | Alternative, kein Muss |
| `aider-ai/aider` | Terminal-Coding-Agent | Later | zusätzlich nur bei Bedarf |
| `All-Hands-AI/OpenHands` | schweres Agentensystem | Later | zu groß für MVP |
| `supermemoryai/supermemory` | Memory Layer | Later | Datenschutz prüfen |
| `obra/superpowers` | Agentenmethodik | Research/Soon | als Prozess, nicht Toolzwang |
| `anthropics/skills` | Skill-Struktur | Research/Soon | eigene Skills erst nach stabilem Workflow |
| `VoltAgent/awesome-design-md` | DESIGN.md Beispiele | Research only | V5 bleibt Quelle |

## Sicherheitsregel

Kein Tool erhält pauschal Zugriff auf `.env`, Production DB, private Daten oder Browser-Sessions.
