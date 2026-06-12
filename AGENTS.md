# AGENTS.md – Life OS App

Stand: 2026-06-12

## Projekt

Wir bauen eine eigene moderne Website/App für Antons Life OS / Monatsplanung.

Ziel:
Ein schönes, beeindruckendes und funktionales persönliches Produktivitäts-Cockpit für Tagesplanung, Wochenplanung, Projekte, Studium/Forschung, Arbeit, Coding/Agenten, Health, Ernährung, Personal und Reviews.

Leitsatz:

```text
Weniger Oberfläche. Mehr Steuerung.
```

## Arbeitsmodus für Codex

Vor jeder Aufgabe:

1. Relevante Markdown-Dateien lesen:
   - `PRODUCT.md`
   - `DESIGN.md`
   - `ARCHITECTURE.md`
   - `DATA_MODEL.md`
   - `SECURITY.md`
   - `ACCESSIBILITY.md`
   - relevante Dateien in `docs/`

2. Bestehenden Code prüfen.

3. Nur die angeforderten Dateien ändern.

4. Keine unnötigen Framework-/Library-Wechsel.

5. Nach Fertigstellung prüfen und berichten.

## Aktueller Ziel-Stack

```text
Next.js App Router
React
TypeScript
Tailwind CSS
shadcn/ui
Supabase Postgres + Auth + RLS
Zod
React Hook Form
Recharts
Vitest
Playwright
Vercel
```

## Wichtige Produktregeln

- Dashboard ist ein Cockpit, kein Datenlager.
- Heute, Inbox, Diese Woche, Projekte, Ziele und Review sind zentral.
- Visualisierungen sind erlaubt, aber müssen Handlung oder Motivation unterstützen.
- Keine Tabellenwand.
- Keine dekorativen Widgets als Hauptfokus.
- Maximal 6 Quick Actions im Main Dashboard.
- Mobile-Reihenfolge ist Produktentscheidung.
- App darf beeindruckend aussehen, aber nicht unübersichtlich werden.
- KI-/Agentenfeatures erst nach stabilem manuellem Flow.

## Designregeln

Siehe `DESIGN.md`.

Kurzfassung:

- moderne Premium-App
- starke Informationshierarchie
- semantische Farben
- konsistente Tokens
- hochwertige Cards
- wenige, klare Visualisierungen
- starke Empty States
- sichtbare Focus States
- keine generische Tailwind-SaaS-Optik

## Architekturregeln

Siehe `ARCHITECTURE.md`.

Kurzfassung:

- Server Components als Default
- Client Components nur für Interaktion
- Feature-Ordner nutzen
- UI-Komponenten wiederverwenden
- Datenzugriff zentralisieren
- Zod für Validierung
- RLS bei nutzerspezifischen Daten
- keine Service Keys im Client

## Security-Regeln

Siehe `SECURITY.md`.

Nie:

- Secrets committen
- RLS umgehen
- `service_role` im Client verwenden
- unvalidierte Inputs speichern
- fremde User-Daten anzeigen

## Accessibility-Regeln

Siehe `ACCESSIBILITY.md`.

Pflicht:

- semantische Struktur
- sichtbare Focus States
- Labels
- Tastaturbedienung
- Kontrast
- Status nicht nur farblich

## Dateien, die nicht ohne Auftrag geändert werden dürfen

- `AGENTS.md`
- `DESIGN.md`
- `PRODUCT.md`
- `ARCHITECTURE.md`
- `DATA_MODEL.md`
- `SECURITY.md`
- `ACCESSIBILITY.md`
- `ROADMAP.md`
- Datenbank-Migrationen, sobald produktive Daten existieren
- Package-Manager-Dateien bei Library-Änderungen ohne explizite Begründung

## Neue Libraries

Nur hinzufügen, wenn:

1. der Auftrag es verlangt oder
2. es klar begründet wird und
3. Alternativen geprüft wurden und
4. Bundle-/Komplexitätsrisiko genannt wird.

## Codex-Ausgabeformat

Nach jeder Aufgabe:

```text
Erstellt:
Geändert:
Nicht geändert:
Validierung:
Offene Punkte:
Risiken:
```

## Akzeptanzkriterien allgemein

```text
[ ] Nutzeraufgabe erfüllt.
[ ] Designsystem eingehalten.
[ ] Mobile nutzbar.
[ ] Accessibility nicht verschlechtert.
[ ] Security nicht verletzt.
[ ] Keine unnötige Library.
[ ] Keine Tabellenwand im Dashboard.
[ ] Keine unkontrollierte Architekturänderung.
```
