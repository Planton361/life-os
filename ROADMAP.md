# ROADMAP.md

Stand: 2026-06-18
Status: Active
Zweck: operative Reihenfolge.
Quelle der Wahrheit: Diese Datei.
Gilt für: Phasenplanung.  
Nicht gilt für: Issue-Details.

## Aktueller Stand

Designrichtung ist abgeschlossen:

```text
Life OS – Linear Calm Dark Command Center
Dashboard Overhaul V5 – Subtle Color Identity Polish
```

Aktuelles Gate vor weiterer Implementierung:

- Navigation & Source-of-Truth Blueprint
- `pages-and-routes.md` Alignment
- Product/Data/Roadmap Alignment

## Phasen

- Phase 1: Kontext und Regeln bereinigen.
- Phase 1.6: Codex Capability Enablement. Eigene Skills, MCP-Regeln, Prompting-Regeln und sichere Tool-Nutzung dokumentieren. Keine externen Tools automatisch aktivieren.
- Phase 2: Next.js Static App mit Mockdaten und stabiler manueller Source of Truth.
- Phase 3: Datenmodell, Auth und Supabase.
- Phase 4: Operative Nutzung für eine Woche.
- Phase 5: Area Dashboards.
- Phase 6: Visualisierung und Motivation.
- Phase 7: Agentenfähigkeit.
- Phase 8: Hardening.

## Phase 2 Reihenfolge

Nach dem IA-/Source-of-Truth-Gate:

1. Navigation Config + Sidebar Skeleton.
2. Top-Level Route Skeletons.
3. Area Route Skeletons.
4. Calendar/Today Review Panel.
5. Resource/Search/Relationship Skeletons.

Phase 2 bleibt statisch und mockdatenbasiert. Sie legt UX, Navigation, Page-Skeletons und manuelle Flows an, ohne Supabase, CRUD oder Migrationen vorzuziehen.

## Phase 3 Grenze

Phase 3 startet erst nach stabiler manueller Source of Truth und umfasst:

- Auth
- Supabase
- Tabellen
- RLS
- Seed-Daten
- erste CRUD-Flows

Canonical Data Core, Privacy-Level und AI-Governance werden in Phase 3 technisch ausgearbeitet. Phase 2 dokumentiert und simuliert diese Konzepte nur.

## Reihenfolge-Regel

```text
Erst täglicher Flow.
Dann Bereiche.
Dann Visualisierung.
Dann KI.
Dann Automatisierung.
```

Analytics, Agents, Imports, Shop, Challenges und Automationen kommen nicht vor stabiler manueller Source of Truth. Shop und Challenges bleiben Utility-/Motivationspunkte und sind nicht P0.
