# DECISIONS.md

Stand: 2026-06-12

## Zweck

Architecture Decision Record für wichtige Projektentscheidungen.

## ADR-001: Eigene App statt Notion

Status: akzeptiert

Kontext:
Notion war Ausgangspunkt. Ziel ist jetzt eine eigene Life OS Web-App.

Entscheidung:
Notion wird nicht Zielsystem, sondern Inspirationsquelle.

Konsequenz:
Neue Regeln: App-Architektur, Datenmodell, Security, Accessibility, Testing.

## ADR-002: Next.js als App-Framework

Status: vorgeschlagen

Entscheidung:
Next.js App Router + React + TypeScript.

Grund:
Full-Stack-Web-App, Routing, Layouts, Server Components, Vercel-Integration.

## ADR-003: Supabase als Backend

Status: vorgeschlagen

Entscheidung:
Supabase Postgres + Auth + RLS.

Grund:
Datenbank, Auth und Zugriffsschutz für persönliche Daten.

## ADR-004: shadcn/ui als UI-Basis

Status: vorgeschlagen

Entscheidung:
shadcn/ui für Basiskomponenten, aber eigenes DESIGN.md für visuellen Charakter.

## ADR-005: Recharts für MVP-Visualisierung

Status: vorgeschlagen

Entscheidung:
Recharts für einfache React-Charts, CSS für einfache Progressbars.

## ADR-006: KI erst nach manuellem Flow

Status: akzeptiert

Entscheidung:
Agentenfeatures werden vorbereitet, aber nicht vor stabilem Datenmodell automatisiert.
