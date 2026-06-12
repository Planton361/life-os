# TECH_STACK_DECISIONS.md

Stand: 2026-06-12

## Empfehlung

Für die App-Phase:

```text
Next.js App Router
React
TypeScript
Tailwind CSS
shadcn/ui
Supabase Postgres + Auth + Row Level Security
Drizzle ORM optional für Schema/Migrations
Zod
React Hook Form
TanStack Query für komplexere Client-Interaktion
Recharts für einfache Visualisierungen
Vitest
Playwright
Vercel
```

## Warum Next.js

Next.js ist ein React Framework für Full-Stack-Webanwendungen. Es bringt Routing, Server-/Client-Komponenten, Optimierungen und Full-Stack-Funktionen mit.

Nutzen für Life OS:

- App Router für strukturierte Routen
- Layouts für App Shell
- Server Components für datengetriebene Seiten
- Route Handlers für API-Endpunkte
- gute Vercel-Integration
- geeignet für MVP und späteren Ausbau

## Warum TypeScript

- stabilere Datenmodelle
- bessere Codex-Ergebnisse
- weniger Runtime-Fehler
- bessere Refactorings
- Grundlage für Zod, Drizzle, Prisma, Supabase Types

## Warum Tailwind CSS

- schnell für Prototyping
- gut mit Design Tokens kombinierbar
- gute Kontrolle über App-Vibe
- passt zu shadcn/ui

## Warum shadcn/ui

shadcn/ui liefert kopierbare Komponenten auf Basis von Tailwind und Radix-Primitives.

Nutzen:

- Cards
- Buttons
- Dialogs
- Sheets
- Tabs
- Forms
- Dropdowns
- Command Palette
- Progress
- Calendar
- Table

Wichtig:

```text
shadcn/ui ist Startpunkt, nicht fertiger Markenlook.
Komponenten müssen in das Life-OS-Designsystem überführt werden.
```

## Warum Supabase

Supabase deckt ab:

- Postgres
- Auth
- Row Level Security
- Storage optional
- Realtime optional
- Edge Functions optional

Für eine persönliche App ist RLS zentral, weil viele sensible Daten gespeichert werden.

## Drizzle vs. Prisma vs. nur Supabase Client

### Supabase Client only

Gut für:

- schneller MVP
- direkte Auth/RLS-Integration
- einfache CRUD-Flows

Risiko:

- Schema/Relations können mit wachsender App unübersichtlich werden

### Drizzle

Gut für:

- TypeScript Schema
- SQL-nahe Kontrolle
- Postgres-first
- leichtgewichtig
- gute Migrationslogik

Empfehlung:

```text
Für Life OS bevorzugt, wenn Schema früh sauber geführt werden soll.
```

### Prisma

Gut für:

- schnelle CRUD-Entwicklung
- sehr gutes DX
- bekanntes ORM
- Typgenerierung

Risiko:

- zusätzliches Abstraktionslevel
- bei Supabase/RLS bewusst konfigurieren

## Entscheidung

MVP-Start:

```text
Supabase Auth + Postgres + RLS
Drizzle für Schema/Migration prüfen
Supabase Client für Auth und einfache Queries
```

Wenn MVP sehr schnell gehen soll:

```text
Supabase Client only starten, Drizzle nach Schema-Stabilisierung hinzufügen.
```

## State Management

### Server State

- Server Components, wenn möglich
- Server Actions / Route Handlers für Mutations
- TanStack Query, wenn komplexe Client-Interaktion, optimistic updates oder Cache nötig werden

### Client State

- React state für lokale UI
- Zustand nur für Command Palette, global UI state, filters, selected panels
- keine globale State-Maschine im MVP

## Forms & Validation

- React Hook Form für Form State
- Zod für Runtime Validation und Schemas
- gemeinsame Schemas zwischen Client und Server

## Visualizations

- Recharts für einfache React Charts
- CSS Progress für Basisfortschritt
- D3 erst bei wirklich individuellen Visualisierungen

## Testing

- Vitest für Unit/Utility/Component-Tests
- React Testing Library optional
- Playwright für E2E-Flows
- axe-core später für Accessibility Checks

## Deployment

- Vercel für Next.js
- Supabase als Backend
- Preview Deployments für Design Review
- Environment Variables sauber trennen

## Nicht empfohlen im MVP

- eigene Backend-App mit NestJS
- Microservices
- GraphQL
- komplexe Event-Sourcing-Architektur
- native Mobile
- Electron
- vollständiges PWA-Offline-System
- D3-heavy Visualisierung
- komplexer AI-Agent-Backend-Stack


## Quellen und Referenzbasis

Diese Datei basiert auf folgenden Quellen und Best Practices:

- Next.js Docs: https://nextjs.org/docs
- Next.js App Router: https://nextjs.org/docs/app
- Next.js Route Handlers: https://nextjs.org/docs/app/getting-started/route-handlers
- shadcn/ui Docs: https://ui.shadcn.com/docs
- shadcn/ui Theming: https://ui.shadcn.com/docs/theming
- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Drizzle ORM: https://orm.drizzle.team/
- Prisma Docs: https://www.prisma.io/docs
- TanStack Query: https://tanstack.com/query/latest
- Zod: https://zod.dev/
- React Hook Form: https://react-hook-form.com/
- Recharts: https://recharts.org/
- Playwright: https://playwright.dev/
- Vitest: https://vitest.dev/
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- Nielsen Norman Group Dashboards: https://www.nngroup.com/articles/dashboards-preattentive/
- Nielsen Norman Group Progressive Disclosure: https://www.nngroup.com/articles/progressive-disclosure/
- Material Design 3 Cards: https://m3.material.io/components/cards
- Material Design 3 Color Roles: https://m3.material.io/styles/color/roles
- Atlassian Design Tokens / Spacing: https://atlassian.design/foundations/spacing
- IBM Carbon Spacing / Grid: https://carbondesignsystem.com/elements/spacing/overview/
- OpenAI Codex AGENTS.md: https://developers.openai.com/codex/guides/agents-md
- AGENTS.md Standard: https://agents.md/
- GitHub Copilot Custom Instructions: https://docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot
- VS Code Prompt Files: https://code.visualstudio.com/docs/copilot/customization/prompt-files
- Google Labs DESIGN.md: https://github.com/google-labs-code/design.md
