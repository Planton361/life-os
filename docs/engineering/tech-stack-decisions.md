# Tech Stack Decisions

Stand: 2026-06-17  
Status: Active  
Zweck: technische Stack-Entscheidungen.  
Quelle der Wahrheit: `ARCHITECTURE.md`.  
Gilt für: technische Umsetzung.  
Nicht gilt für: Versionspinning.

## Entscheidung

```text
Next.js App Router + React + TypeScript + Tailwind + shadcn/ui
Supabase Auth/Postgres/RLS
Zod + React Hook Form
Recharts sparsam
Vitest + Playwright
Vercel
```

## Begründung

- passt zu App Shell und Routenmodell
- gut mit Server Components
- schnelle MVP-Umsetzung
- Supabase deckt Auth/RLS/Postgres ab
- Designsystem lässt sich über Tailwind/Tokens führen

## Grenzen

- Keine Microservices im MVP.
- Keine neue Library ohne Begründung.
- Keine schweren Chart-Libraries ohne Notwendigkeit.
- Keine eigene Auth.
