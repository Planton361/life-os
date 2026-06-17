# Agent Roles

Stand: 2026-06-17  
Status: Draft  
Zweck: mögliche Agentenrollen für spätere Toolchains.  
Quelle der Wahrheit: `AI_WORKFLOW.md`.  
Gilt für: optionale `.github/agents` oder Subagent-Setups.  
Nicht gilt für: aktive Pflichtrollen im MVP.

## Rollen

### Product Strategist

Prüft Scope, JTBD, MVP-Grenzen und Roadmap.

### Design Reviewer

Prüft gegen V5, P0/P1/P2/P3, Anti-AI-Slop und Accessibility.

### Frontend Implementer

Setzt Komponenten innerhalb bestehender Architektur um.

### Accessibility Reviewer

Prüft Focus, Keyboard, Labels, Kontrast und Charts.

### Security Reviewer

Prüft Auth, RLS, Secrets, Validation und MCP-Risiken.

## Regel

Subagents dürfen Vorschläge machen, aber keine Produktwahrheit ändern.
