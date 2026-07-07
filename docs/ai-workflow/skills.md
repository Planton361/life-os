# Skills

Stand: 2026-07-07
Status: Active
Zweck: aktive eigene Life-OS-Skills und optionale externe Skills einordnen.
Quelle der Wahrheit: `AI_WORKFLOW.md`.  
Gilt für: Skill-Auswahl, Skill-Scope und sichere Aktivierung.
Nicht gilt für: automatische Installation externer Skills.

## Kurzfassung

Life OS nutzt zwei aktive eigene Codex-Skills für wiederholbare Agentenarbeit. Externe Skills bleiben optional, reviewpflichtig und dürfen V5 oder die Root-Dateien nicht ersetzen.

Canonical Skill Path:

```text
.agents/skills
```

`.agents/skills` ist die aktive Skill-Wahrheit. `.github/skills` ist nicht aktiv, ausser ein Skill ist explizit als Copilot-/Mirror-Pfad dokumentiert. Divergente Skill-Versionen duerfen nicht gepflegt werden.

## Aktive eigene Skills

### `life-os-design-taste`

Status: Active
Pfad: `.agents/skills/life-os-design-taste/SKILL.md`
Zweck: UI-, Dashboard-, Komponenten-, Layout- und visuelle Vorschläge gegen V5, Anti-AI-Slop, Component-System, Visualisierungsregeln und Accessibility prüfen.

### `life-os-codex-task-writer`

Status: Active
Pfad: `.agents/skills/life-os-codex-task-writer/SKILL.md`
Zweck: vage Produkt-, Design-, Dokumentations- oder Implementierungsabsichten in kleine, sichere, prüfbare Codex-Aufträge übersetzen.

## Optionale externe Skills

### UI UX Pro Max

Status: Optional / Review-Hilfe
Rolle: kann später als zusätzliche Design-Review-Perspektive dienen.
Grenze: ersetzt weder `DESIGN.md` noch `docs/design/dashboard-v5.md`; darf keine neue Designrichtung setzen.

### Externe Skill-Sammlungen

Status: Research only / optional
Rolle: Inspiration für Skill-Struktur und Agentenrollen.
Grenze: keine automatische Aktivierung, kein Kopieren ohne Anpassung an Life OS, keine Installation ohne explizite Freigabe.

## Skill Duplicate Handling

Aktueller Duplicate-/Mirror-Befund:

- `.agents/skills/life-os-design-taste/SKILL.md` ist aktiv.
- `.github/skills/life-os-design-taste/SKILL.md` existiert als Draft/Optional-Pfad.

Regel:

- `.github/skills/life-os-design-taste` nicht als aktive Quelle verwenden.
- Keine Aenderung dort vornehmen, solange kein expliziter Copilot-/Mirror-Sync-Scope bestaetigt ist.
- Falls ein Mirror benoetigt wird, muss er Owner, Status, Sync-Regel und Quelle `.agents/skills/life-os-design-taste/SKILL.md` nennen.

## Spätere eigene Kandidaten

### `life-os-dashboard-review`

Zweck: Screenshot Review gegen P0/P1/P2/P3-Hierarchie. Noch nicht aktiv.

## Skill-Regeln

- ein Skill = eine Aufgabe
- klare Aktivierungsbeschreibung
- canonical path `.agents/skills`
- kein divergenter `.github/skills`-Mirror ohne dokumentierten Owner/Status
- keine Secrets
- keine autonomen Codeänderungen ohne Review
- V5 nicht ersetzen
- keine neue Designrichtung einführen
- externe Skills nur nach Zweck-, Scope-, Rechte- und Risiko-Review
- keine externen Skills automatisch installieren oder aktivieren
