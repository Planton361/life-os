# Skills

Stand: 2026-07-07
Status: Active
Zweck: aktive eigene Life-OS-Skills und optionale externe Skills einordnen.
Quelle der Wahrheit: `AI_WORKFLOW.md`.  
Gilt für: Skill-Auswahl, Skill-Scope und sichere Aktivierung.
Nicht gilt für: automatische Installation externer Skills.

## Kurzfassung

Life OS nutzt project-local Codex-Skills fuer wiederholbare Agentenarbeit.
Externe Skills bleiben optional, reviewpflichtig und duerfen V5 oder die
Root-Dateien nicht ersetzen.

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
Nutzen, wenn Codex UI, Dashboard, Komponenten, Layout, visuelle Vorschlaege oder V5-Konformitaet reviewt.

Hinweis: Dieser Skill deckt V5 UI Review und Anti-generic UI ab. Es wird kein separater konkurrierender `life-os-v5-ui-review`-Skill gepflegt.

### `life-os-codex-task-writer`

Status: Active
Pfad: `.agents/skills/life-os-codex-task-writer/SKILL.md`
Zweck: vage Produkt-, Design-, Dokumentations- oder Implementierungsabsichten in kleine, sichere, prüfbare Codex-Aufträge übersetzen.
Nutzen, wenn ein unklarer Wunsch in einen sicheren, scoped Codex-Auftrag uebersetzt werden soll.

### `life-os-vertical-slice`

Status: Active
Pfad: `.agents/skills/life-os-vertical-slice/SKILL.md`
Zweck: Featurearbeit als vollstaendigen Nutzerfluss planen, bauen oder pruefen.
Nutzen, wenn UI, Navigation, Persistenz, Server Actions, Prepared States, Reload-Stabilitaet, Browser-Proof oder QA-Doku zusammenpassen muessen.

### `life-os-backend-action-slice`

Status: Active
Pfad: `.agents/skills/life-os-backend-action-slice/SKILL.md`
Zweck: Backend-/Server-Action-Arbeit innerhalb der Life-OS Security- und Data-Boundary halten.
Nutzen, wenn Server Actions, Repositories, Supabase-backed Mutations, Zod-Schemas, Ownership, Revalidation oder data-layer-only Arbeit betroffen sind.

### `life-os-browser-proof`

Status: Active
Pfad: `.agents/skills/life-os-browser-proof/SKILL.md`
Zweck: UI-, Form-, Button-, Navigations-, Prepared-State- und Persistenzverhalten im Browser beweisen.
Nutzen, wenn Codex User Flows, Reload-Stabilitaet oder sichtbares Verhalten mit lokalem Browser oder Playwright-kompatiblem Ablauf pruefen muss.

### `life-os-completion-gate`

Status: Active
Pfad: `.agents/skills/life-os-completion-gate/SKILL.md`
Zweck: Vor Abschluss eines Blocks entscheiden, ob der Scope wirklich fertig, sauber deferred oder blocked ist.
Nutzen vor finalem Bericht bei Feature-, Backend-, UI-, Workflow-, Docs- oder Review-Blocks.

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

## Empfohlene Kombinationen

UI feature:

```text
life-os-vertical-slice
life-os-design-taste
life-os-browser-proof
life-os-completion-gate
```

Backend feature:

```text
life-os-backend-action-slice
life-os-browser-proof
life-os-completion-gate
```

Review only:

```text
life-os-completion-gate
life-os-design-taste
```

Backend/data feature with UI:

```text
life-os-backend-action-slice
life-os-browser-proof
life-os-completion-gate
```

Bugfix:

```text
life-os-completion-gate
life-os-browser-proof, falls Verhalten betroffen ist
```

Docs/workflow:

```text
life-os-completion-gate
```

## W1.0D Prompt Integration

Neue Codex-Prompts muessen einen `Use Skills`-Abschnitt enthalten. Der
`life-os-codex-task-writer` erzeugt kuenftig Aufgaben mit passender
Skill-Kombination, klaren Hard Boundaries, Validation, Staging und Report
Format.

Prompt-Dateien:

- `.github/prompts/vertical-slice.prompt.md`
- `.github/prompts/backend-action-slice.prompt.md`
- `.github/prompts/browser-proof.prompt.md`
- `.github/prompts/completion-review.prompt.md`
- `.github/prompts/create-codex-task.prompt.md`

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
