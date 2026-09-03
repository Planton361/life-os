<div align="center">

# Life OS

### A calm personal command center for deciding what deserves attention next.

![Status](https://img.shields.io/badge/status-active%20development-6E5494?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-17151B?style=flat-square&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-17151B?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-17151B?style=flat-square&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-17151B?style=flat-square&logo=supabase&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-17151B?style=flat-square&logo=pnpm&logoColor=white)

</div>

> **Less interface. More control.**

## Overview

Life OS is a personal-only, local-first daily companion for control,
scheduling, projects, knowledge and important areas of private life. It brings
daily execution and long-term direction into one controlled system.

It is designed for situations where many tasks, projects, goals and
responsibilities feel important at the same time. Instead of adding another
collection of disconnected lists, Life OS helps answer a more useful question:

> **What deserves attention next?**

The application is built primarily for personal use and is under active
development.

## Why this project exists

Planning becomes difficult when information is spread across task managers,
notes, calendars, documents and separate domain-specific tools.

That fragmentation creates three recurring problems:

- important information has to be remembered instead of trusted to a system;
- daily tasks become disconnected from projects and long-term goals;
- choosing what to do next takes more energy than doing the work itself.

Life OS addresses this by connecting capture, planning, execution and review
inside one consistent workspace.

## What Life OS brings together

| Area | Purpose |
|---|---|
| **Dashboard** | A compact cockpit for current priorities, control and open loops. |
| **Today** | A focused execution surface for the current day. |
| **Inbox** | Fast capture followed by deliberate triage. |
| **Portfolio** | Concrete Tasks, Projects, Goals and Skills with shared context. |
| **Calendar** | Canonical Task-based planning and temporal projection. |
| **Resources** | Knowledge, evidence and linked context. |
| **Review** | Structured reflection and system maintenance. |
| **Coding** | Technical projects, Skills and execution context. |
| **Education, Work & Life** | Domain context built on the shared core workflow. |
| **Health & Nutrition** | Personal records, routines, recipes, meals and planning. |
| **Journal, Notes, Inventory & Wishlist** | Active personal depth surfaces. |

Entertainment, Shop, Challenges and Anti-Rot remain retained but deferred and
hidden from active navigation. The personal AI assistant is not yet a
production capability.

## Core workflow

```text
Capture
   ↓
Clarify and organize
   ↓
Connect to a task, project, goal or life area
   ↓
Choose the next useful action
   ↓
Execute
   ↓
Review and adjust
```

Life OS is not intended to automate every decision. Its purpose is to make
decisions smaller, clearer and easier to act on.

## Design principles

The interface follows a **Linear Calm Dark Command Center** direction.

The main principles are:

- **Clarity before decoration** — important state should be visible without
  unnecessary visual noise.
- **Action before administration** — managing the system should not become a
  second job.
- **Progressive depth** — simple surfaces stay simple while detailed tools
  remain available when needed.
- **Explicit state** — loading, empty, error, success and archived states should
  be understandable.
- **Controlled color** — color communicates identity or meaning rather than
  filling space.
- **Accessibility by default** — interaction, hierarchy and feedback should
  remain usable beyond the ideal desktop setup.
- **Personal data stays personal** — secrets and real personal data do not
  belong in version control.

## Technical architecture

| Layer | Technology / approach |
|---|---|
| **Application framework** | Next.js |
| **Language** | TypeScript |
| **Interface styling** | Tailwind CSS and documented design tokens |
| **Authentication and data** | Supabase |
| **Code organization** | Feature-oriented modules under `src/features` |
| **Persistence boundary** | Domain-facing repository implementations for Supabase-backed data |
| **Browser validation** | Playwright and documented manual QA flows |
| **Package management** | pnpm |
| **Development process** | Documentation-driven and validation-first |

The application separates product behavior, interface rules, architecture,
data decisions and implementation workflow into explicit sources of truth.
This keeps feature work reviewable and reduces undocumented behavior.

## Getting started

### Prerequisites

- Node.js
- pnpm
- a configured Supabase project or local Supabase environment for authenticated
  and persistent-data flows

### Local development

```bash
pnpm install
pnpm dev
```

Open the local URL printed by Next.js.

Supabase-backed flows use the canonical local Target runtime; the older local
stack is legacy fallback only. They require the expected local environment
variables and database setup. See:

- [`supabase/README.md`](./supabase/README.md)
- [`docs/ops/local-personal-operations-runbook-w1-1b-3.md`](./docs/ops/local-personal-operations-runbook-w1-1b-3.md)

### Validation

Use the scripts defined in [`package.json`](./package.json) for the current
branch. Before merging a meaningful change, run the relevant combination of:

- static checks;
- automated tests;
- production build;
- focused browser validation;
- screenshot or interaction review for visible UI changes.

## Repository structure

```text
life-os/
├── src/
│   ├── app/             # Next.js routes and application shell
│   ├── features/        # Feature-oriented product modules
│   └── lib/             # Shared infrastructure and integrations
├── supabase/            # Database configuration and migrations
├── docs/
│   ├── product/         # Product scope and feature decisions
│   ├── design/          # Design rules, tokens and component guidance
│   ├── engineering/     # Technical decisions and implementation guidance
│   ├── data/            # Data-model and persistence decisions
│   ├── security/        # Security reviews and controls
│   ├── qa/              # Test evidence and validation reports
│   ├── ops/             # Local operation, deployment and recovery notes
│   └── decisions/       # Important architectural and product decisions
├── scripts/             # Development, QA and operational utilities
└── public/              # Static application assets
```

## Current status

Life OS is an active personal project.

The repository already contains a broad set of product surfaces, Supabase-backed
data repositories, authentication flows, design documentation and structured
QA evidence. Development currently focuses on the C2 integrated calendar
proof, then on completing and hardening end-to-end daily-companion workflows
rather than adding disconnected features.

Because the application models personal information and routines, public
source availability does not imply a public hosted service or shared personal
dataset.

## Important documentation

| Document | Purpose |
|---|---|
| [`PRODUCT.md`](./PRODUCT.md) | Product purpose, boundaries and priorities |
| [`DESIGN.md`](./DESIGN.md) | Operative design direction |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Technical architecture and boundaries |
| [`DATA_MODEL.md`](./DATA_MODEL.md) | Entities, relationships and data rules |
| [`SECURITY.md`](./SECURITY.md) | Security requirements and secret handling |
| [`ACCESSIBILITY.md`](./ACCESSIBILITY.md) | Accessibility expectations |
| [`ROADMAP.md`](./ROADMAP.md) | Planned implementation sequence |
| [`AI_WORKFLOW.md`](./AI_WORKFLOW.md) | Rules for agent-assisted development |
| [`AGENTS.md`](./AGENTS.md) | Repository-level instructions for coding agents |

## Development approach

Life OS uses a documentation-driven workflow:

1. define the product behavior and boundaries;
2. identify the relevant source-of-truth documents;
3. implement a focused vertical slice;
4. validate behavior, data flow and visible states;
5. review the diff and update documentation when the contract changed.

Agent-assisted development is supported, but agents do not replace product
decisions, validation or review.

## Scope and limitations

- Life OS is optimized for one person's planning model rather than generic
  enterprise collaboration.
- Some areas are deeper and more mature than others.
- Features may change as real usage exposes unnecessary complexity.
- External integrations are added selectively rather than treated as the
  default solution.
- Personal data, secrets and private environment configuration are excluded
  from version control.

## Project principle

```text
Less interface.
More control.
```
