---
name: life-os-design-taste
description: Active Life OS design review skill. Use when Codex needs to review UI, dashboard, component, layout, or visual proposals against Life OS V5, the Linear Calm Dark Command Center direction, Anti-AI-Slop rules, component-system rules, accessibility basics, and P0/P1/P2/P3 hierarchy before implementation or during review.
---

# Life OS Design Taste

Use this skill for UI and design review only. Do not create a new design direction, do not replace `DESIGN.md`, and do not override `docs/design/dashboard-v5.md`.

## Sources

Read the relevant sources before judging design work:

- `DESIGN.md`
- `docs/design/dashboard-v5.md`
- `docs/design/design-tokens.md`
- `docs/design/component-system.md`
- `docs/design/visualization-rules.md`
- `docs/design/anti-ai-slop.md`
- `ACCESSIBILITY.md`

## Fixed Design Truth

The active direction is:

```text
Life OS – Linear Calm Dark Command Center
Dashboard Overhaul V5 – Subtle Color Identity Polish
```

V5 is the design truth. External inspiration, screenshots, generated UI, Figma experiments, and optional design-review skills may help identify issues, but they do not replace V5.

## Priority Hierarchy

Review every dashboard proposal against this hierarchy:

- P0: Today Agenda, Daily Control
- P1: Quick Thought, Command Center, Sidebar, Mood Check, Habit Tracker, Active Portfolio
- P2: Meals Today, Running / Muscle / Recovery, Nutrient Balance, Weight Loss
- P3: Time Progress, Anti-Rot Actions, Challenges / Reward Focus

P0 must dominate. P2/P3 must support the daily flow without competing for attention.

## Anti-AI-Slop Checks

Reject or fix patterns that make the UI generic or decorative:

- generic gradient hero surfaces
- neon gradients, glow-heavy surfaces, or glass everywhere
- random icons without information value
- cards without a clear job
- charts without a decision or behavior purpose
- actions that do not map to real user intent
- status shown only through color
- inconsistent pill colors
- dense widget text without hierarchy
- exaggerated motivational copy or gamification pressure

Prefer existing component types, clear card jobs, tokens, semantic color, text-backed status, and limited visual emphasis.

## Review Method

1. Identify the user workflow and the main decision the UI must support.
2. Check whether Today Agenda and Daily Control remain visually dominant.
3. Check whether each card has a clear purpose, header, hierarchy, and bounded item count.
4. Check whether visualizations answer a real question.
5. Check whether color, icons, spacing, and motion are semantic rather than decorative.
6. Check mobile, keyboard, contrast, labels, and color-not-alone accessibility basics.
7. Propose minimal fixes that preserve V5 instead of redesigning from scratch.

## Required Output

```text
Was passt zu V5:
Was verletzt V5:
Konkrete Fixes:
Acceptance Decision:
```

Use one of these decisions:

- `PASS`: fits V5 and needs no material changes.
- `PASS_WITH_FIXES`: direction is acceptable if listed fixes are made.
- `FAIL`: violates V5, weakens P0/P1 hierarchy, or introduces a new design direction.
