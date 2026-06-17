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
| `upstash/context7` | erstes empfohlenes MCP für aktuelle Library-/API-Dokumentation | Core now | nur bei Docs-Bedarf nutzen; nicht ungeprüft Code übernehmen |
| `yamadashy/repomix` | Repo-Kontext für LLMs | Soon | keine Secrets einpacken |
| `cyclotruc/gitingest` | fremde Repos analysieren | Research only | fremde Patterns prüfen |
| `microsoft/playwright-mcp` | späteres UI-/Screenshot-/A11y-QA-Tool | Later | nur lokal/sicher verwenden; keine Account-Browseraktionen ohne Bestätigung |
| `browserbase/stagehand` | Browser-Agenten später | Later | nicht MVP-kritisch |
| `nextlevelbuilder/ui-ux-pro-max-skill` | optionale Design-/UX-Review-Hilfe | Research/Soon | ersetzt V5 nicht; keine neue Designrichtung |
| `21st-dev/magic-mcp` | Komponenten-Inspiration | Research/Soon | kein Dashboard neu generieren |
| `github/awesome-copilot` | Beispiele für Copilot-Anpassungen | Research only | nicht blind übernehmen |
| `hesreallyhim/awesome-claude-code` | Claude-Code-Ideen | Research only | prüfen, nicht kopieren |
| `VoltAgent/awesome-claude-code-subagents` | Subagent-Beispiele | Research only | Subagents erst später |
| `wshobson/agents` | Agentenrollen | Research only | Rollen an Life OS anpassen |
| `cline/cline` | IDE-Agent | Later | Alternative, kein Muss |
| `aider-ai/aider` | Terminal-Coding-Agent | Later | zusätzlich nur bei Bedarf |
| `All-Hands-AI/OpenHands` | schweres Agentensystem | Later | zu groß für MVP |
| `supermemoryai/supermemory` | Memory Layer | Later | Datenschutz prüfen |
| `obra/superpowers` | Plan-/Spec-/TDD-Methodik | Research/Soon | als Prozess, nicht Toolzwang und keine Autonomie-Freigabe |
| `anthropics/skills` | Skill-Struktur | Research/Soon | eigene Skills erst nach stabilem Workflow |
| `VoltAgent/awesome-design-md` | DESIGN.md Beispiele | Research only | V5 bleibt Quelle |

## Phase 1.6 Einordnung

- Context7 ist das erste empfohlene MCP, wenn aktuelle Library-, Framework-, SDK- oder API-Dokumentation gebraucht wird.
- Playwright MCP bleibt ein späteres Werkzeug für lokale UI-, Screenshot-, Browser- und Accessibility-QA.
- Superpowers wird als Plan-/Spec-/TDD-Methodik verstanden, nicht als Freigabe für autonome Produktentscheidungen.
- UI UX Pro Max kann als Design-Review-Hilfe geprüft werden, ersetzt aber nie V5.
- Kein externes Tool wird automatisch installiert, aktiviert oder mit Secrets verbunden.

## Sicherheitsregel

Kein Tool erhält pauschal Zugriff auf `.env`, Production DB, private Daten oder Browser-Sessions.
