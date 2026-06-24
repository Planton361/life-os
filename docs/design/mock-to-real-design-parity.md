# Mock To Real Design Parity

Stand: 2026-06-24
Status: Active
Zweck: V5-Parity-Regeln fuer den Wechsel von Design-Fixtures zu lokalen oder spaeter echten Daten.

## Regel

```text
Demo, Empty, Manual und spaeter Supabase liefern dieselben ViewModels.
Die UI bleibt dieselbe.
```

## V5-Schutz

- Dashboard V5 bleibt die visuelle Wahrheit.
- Profile wechseln nur Datenquellen.
- Dashboard-Grid, Command Center, Sidebar und Section-Komposition bleiben locked.
- Gestaltete Area Pages wechseln nicht auf eine generische Ersatzseite.
- Empty States erscheinen innerhalb bestehender Cards.
- Manual-Eintraege erscheinen in denselben Cards, Listen und Detailseiten wie Demo-Eintraege.
- Leere Listen rendern einen einzelnen natuerlichen Empty State pro Section, keine wiederholten Platzhalterkarten.

## Demo

Demo zeigt Design-Fixtures und dient als Regression-Referenz. Demo-Daten duerfen nicht als Nutzerdaten behandelt oder resetet werden.

## Empty

Empty zeigt:

- gleiche Dashboard-Zonen
- gleiche Cards
- gleiche Bereichsseiten
- leere Arrays fuer Eintraege
- neutrale Counts und Statuswerte
- keine Demo-Titel, Demo-Aufgaben oder Demo-Projekte

## Manual

Manual zeigt lokale Eintraege aus `.local/life-os/manual-profile.json`.

Ein Task mit Datum, Startzeit und Dauer wird projiziert in:

- `/tasks`
- `/tasks/[taskId]`
- `/today`
- `/calendar`
- `/dashboard` Today Agenda und Daily Control, wenn passend

Ein Inbox Item wird projiziert in:

- `/inbox`
- `/today`
- Dashboard Inbox Count

Ein Project oder Goal wird projiziert in:

- `/projects` oder `/goals`
- Detailseite
- Dashboard Active Portfolio

## App-wide Area Shell Boundary

R1.3 schuetzt die visuelle Parity durch Datenquellen-Trennung:

- `src/app/**` und `src/components/**` importieren keine Mock-/Fixture-Dateien direkt.
- Normale Area-Routen laden Demo-Feature-ViewModels nur im aktiven `demo` Profil.
- `empty` und `manual` nutzen denselben Page-Rahmen und zeigen Empty States innerhalb bestehender Cards.
- Portfolio bleibt dieselbe Komponente, erhaelt aber ein profilabhaengiges `PortfolioViewModel`.
- Mental Health bleibt dieselbe `MentalHealthActionLandingPage` und erhaelt ein profilabhaengiges `MentalHealthPageViewModel`.
- Health, Nutrition, Coding, Life, Education, Work, Resources, Shop und Challenges behalten ihre bestehenden Page-Shells und bekommen profilabhaengige Area ViewModels aus `src/features/profile-data/area-view-models.ts`.

Diese Boundary ist ein Content/Data-Change. Sie darf keine V5-Dashboard-Layoutwerte, Grid-Reihenfolgen, App-Shell-Werte oder Card-Kompositionen veraendern.

## ProfileBoundaryPage

`ProfileBoundaryPage` ist kein Ersatz fuer gestaltete Seiten.

Erlaubt ist sie nur fuer Routen, die wirklich noch keine eigene Page-Komposition besitzen oder deren Page-Shell noch nicht profilfaehig verdrahtet wurde. Sobald eine Demo-Route eine gestaltete Page hat, muss diese Shell in `demo`, `empty` und `manual` bestehen bleiben:

```text
demo   -> gleiche Page mit Fixture-Daten
empty  -> gleiche Page mit Empty States
manual -> gleiche Page mit Manual-Daten oder Empty States
```

Nicht erlaubt:

```text
demo   -> gestaltete Page
empty  -> generische Boundary Page
manual -> generische Boundary Page
```

R1.2 Referenzkorrektur: `/health/mental` rendert in allen Profilen die Mental-Health-Shell. Demo-spezifische Signale wie konkrete Mood-, Sleep- und Repair-Werte erscheinen nur im Demo Profile.

R1.3 App-weite Regel: Eine gestaltete Area Page darf in `empty` oder `manual` nie durch eine generische `ProfileBoundaryPage` ersetzt werden. Die erlaubte Migration ist:

```text
Feature ViewModel -> Profile ViewModel Resolver -> gleiche Feature Page
```

Route-Skeletons ohne eigene Datenkomposition koennen weiterhin als Skeleton-Seiten bestehen. `ProfileBoundaryPage` bleibt nur fuer wirklich unverdrahtete Routen erlaubt, aktuell ausserhalb des R1.3-Area-Scope: `/review/daily` und `/timeline`.

## R1.4 Natural Empty States

Profilwechsel duerfen keine Demo-Item-Struktur konservieren, wenn keine echten Eintraege existieren. `empty` und `manual` ohne lokale Daten zeigen:

- dieselbe gestaltete Page Shell
- dieselben Section-Header, Controls, Tabs und CTA-Bereiche
- leere Content-Arrays fuer echte Eintragslisten
- genau einen natuerlichen Empty State innerhalb der betroffenen Card oder Section
- keine technischen Platzhaltertexte wie `No local entry`, `No local data`, `Manual-Profil: Noch keine lokalen Daten` oder `Manual profile has no`

Manual-Daten, die bereits lokal erfasst werden koennen, muessen durch dieselben Cards und Item-Komponenten wie Demo-Daten laufen. Wo noch keine lokale Eingabequelle existiert, bleibt die Shell sichtbar und zeigt einen natuerlichen Empty State.

## Blocked Demo Strings

Diese Inhalte duerfen in `empty` und `manual` nicht sichtbar sein:

- Life OS App
- Masterarbeit
- Finanzinformatik
- Literature source deadline
- Calendar page implementieren
- Portfolio page in Figma finalisieren
- Weekly review vorbereiten
- Hyperskill
- Data access setup question
- Article on calm dashboards
- Water / Coffee / Study
- Skyr / Skyr with oats and berries / Protein Bowl
- Steady
- 5-minute self-check
- 10-minute walk after deep work
- Mood Pattern
- Repair Routines
- Today Signal
- Agent Workflow
- Data model notes
- No local entry
- No local data
- Manual-Profil: Noch keine lokalen Daten
- Manual profile has no

## Supabase-Grenze

Spaeter ersetzt Supabase nur den Adapter. Supabase darf keine neue V5-Komposition, keine neue Calendar-Komponente und keine neue Dashboard-Struktur einfuehren.
