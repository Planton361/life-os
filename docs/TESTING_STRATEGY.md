# TESTING_STRATEGY.md

Stand: 2026-06-12

## Testpyramide

### Unit / Utility

Tool:

```text
Vitest
```

Für:

- pure functions
- validation helpers
- date logic
- progress calculations
- data mappers

### Component

Tools:

```text
Vitest
React Testing Library optional
```

Für:

- DashboardCard
- CompactList
- forms
- visualization components

### E2E

Tool:

```text
Playwright
```

Flows:

- Login
- Quick Add
- Create Task
- Process Inbox
- Daily Review
- Project page
- Mobile Dashboard

### Accessibility

Später:

```text
@axe-core/playwright
```

Prüfen:

- headings
- labels
- focus
- contrast manuell
- keyboard flow

## Minimum vor Merge

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Wenn E2E vorhanden:

```text
pnpm e2e
```
