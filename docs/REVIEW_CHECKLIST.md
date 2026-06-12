# REVIEW_CHECKLIST.md

Stand: 2026-06-12

## Zweck

Diese Datei ist die verbindliche Checkliste für Design-, Code- und Produktreviews.

## 1. Product Fit

```text
[ ] Ist klar, welche Nutzeraufgabe die Seite löst?
[ ] Hilft die Seite Anton heute konkret?
[ ] Ist die Seite Teil eines klaren Flows?
[ ] Werden Details sinnvoll ausgelagert?
[ ] Gibt es einen nächsten sinnvollen Schritt?
```

## 2. Dashboard 5-Sekunden-Test

```text
[ ] Was ist heute wichtig?
[ ] Was ist in der Inbox offen?
[ ] Was ist diese Woche relevant?
[ ] Welche Projekte/Ziele sind aktiv?
[ ] Was muss reviewed werden?
```

Fail, wenn:

- Today nicht sichtbar ist
- Inbox versteckt ist
- Review fehlt
- Visualisierungen die Hauptaufgaben verdrängen

## 3. UX / IA

```text
[ ] Navigation ist klar.
[ ] Primär/Sekundär/Tertiär ist erkennbar.
[ ] Mobile-Reihenfolge ist bewusst.
[ ] Keine Tabellenwand.
[ ] Keine unnötigen Tabs.
[ ] Keine toten Links.
[ ] Empty States helfen.
[ ] Error States helfen.
```

## 4. Visual Design

```text
[ ] Tokens werden genutzt.
[ ] Cards sind konsistent.
[ ] Farben sind semantisch.
[ ] Typografie ist scanbar.
[ ] Spacing folgt Skala.
[ ] Schatten/Radius sind konsistent.
[ ] Vibe passt zur Area.
[ ] App wirkt modern, aber nicht überladen.
```

## 5. Visualisierung

```text
[ ] Chart hat eine klare Frage.
[ ] Chart hat Textlabel/Kernaussage.
[ ] Farbe ist nicht alleinige Information.
[ ] Kein Chart-Overload.
[ ] Progress ist motivierend, nicht spielerisch übertrieben.
```

## 6. Accessibility

```text
[ ] Eine H1 pro Seite.
[ ] Logische Heading-Struktur.
[ ] Alle Inputs mit Labels.
[ ] Focus States sichtbar.
[ ] Keyboard Navigation möglich.
[ ] Kontrast ausreichend.
[ ] Touch Targets ausreichend.
[ ] Charts auch ohne Farbe verständlich.
```

## 7. Security / Privacy

```text
[ ] Auth nötig?
[ ] user_id vorhanden?
[ ] RLS Policy vorhanden?
[ ] Input validiert?
[ ] Keine Secrets im Client.
[ ] Keine fremden Daten sichtbar.
[ ] Keine sensiblen Daten unnötig gespeichert.
```

## 8. Codequalität

```text
[ ] TypeScript ohne `any`-Missbrauch.
[ ] Komponenten sind klein und klar.
[ ] Feature-Code ist im richtigen Ordner.
[ ] Keine duplizierten Komponenten ohne Grund.
[ ] Keine neue Library ohne Begründung.
[ ] Loading/Error/Empty States bedacht.
[ ] Tests oder Prüfschritte vorhanden.
```

## 9. Codex-Ausgabe

Codex soll nach jeder Aufgabe berichten:

```text
Erstellt:
Geändert:
Nicht geändert:
Validierung:
Offene Punkte:
Risiken:
```

## 10. Definition of Done

Ein Feature ist fertig, wenn:

```text
[ ] Es löst eine klare Nutzeraufgabe.
[ ] Es passt ins Designsystem.
[ ] Es ist mobile nutzbar.
[ ] Es ist zugänglich.
[ ] Es validiert Eingaben.
[ ] Es verletzt keine Security-Regeln.
[ ] Es ist mit Mockdaten oder echten Daten geprüft.
[ ] Es verschlechtert Dashboard-Klarheit nicht.
```


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
