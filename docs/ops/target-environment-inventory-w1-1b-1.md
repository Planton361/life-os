# W1.1B.1 Target Environment Inventory

Stand: 2026-07-10
Status: `blocked_needs_target`
Quelle der Wahrheit: `AGENTS.md`, Root-Dokumente, `docs/product/production-readiness-closure-plan-w1-1b.md`, R1.9.x Readiness-Dokumente, `.env.example`, `package.json`, `next.config.ts`, `supabase/config.toml` und lokale Migrationen.
Nicht gilt fuer: Deployment, Remote Supabase Audit, Remote Migration, echte Secrets, Produktfeatures, UI-Aenderungen oder Production Release Claim.

## 1. Zweck

W1.1B.1 inventarisiert die spaetere Zielumgebung fuer Production-Rehearsals,
ohne eine Production-Umgebung auszuwaehlen oder zu beruehren.

Ziele:

- bekannte lokale Runtime-, Build-, Supabase- und Env-Fakten erfassen
- moegliche Zielumgebungen bewerten
- Env- und Secret-Grenzen aus `.env.example` dokumentieren
- Auth-/Redirect-/Domain-Anforderungen fuer spaetere Rehearsals sammeln
- konkrete Nutzerfragen fuer die Target-Env-Entscheidung festhalten

Entscheidung:

```text
W1.1B.1 waehlt keine Production-Umgebung ohne Nutzerentscheidung.
W1.1B.1 fuehrt kein Deployment und keine Remote-Aktion aus.
```

## 2. Nicht-Ziele

- keine Produktfeatures
- keine UI-Aenderungen
- keine `src`-Aenderungen
- keine Test-Aenderungen
- keine Migration
- keine RLS-/Policy-Aenderung
- keine Remote-DB-Aktion
- kein `supabase link`
- kein `supabase db push`
- kein `supabase db reset`
- kein echtes Deployment
- keine Production Secrets lesen oder ausgeben
- keine `.env.local`, `.env`, `.local/**` oder `private/**` lesen
- kein Service Role Key
- keine neue Library
- keine MCP-Installation
- kein Production Release Claim

## 3. Ausgangslage

Aktueller Baseline-Commit:

```text
2df2216 docs: define production readiness closure plan
```

W1.1B-Entscheidung:

```text
Life OS ist lokal proof-stable.
Life OS ist noch nicht production-ready.
```

Lokale Proof-Basis nach W1.1A:

- Core-Grep `Manual|Inbox|Today|Dashboard|Calendar|Portfolio`: 86 passed,
  2 skipped, 0 failed.
- Extensions-Grep `Resources|Nutrition|Skill|AI|Recurring`: 25 passed,
  0 skipped, 0 failed.
- Kein Remote-/Production-Claim.

Production Readiness bleibt offen fuer:

- Target Env Verification
- Remote Supabase Audit
- Deployment Rehearsal
- Production Backup / Restore Drill
- Production Performance Baseline
- Production Accessibility Manual Review
- Monitoring / Logging / Error Handling

## 4. Known Local Environment

Known:

- Framework: Next.js App Router, Next.js `16.2.2`.
- UI Runtime: React `^19.0.0`, React DOM `^19.0.0`.
- Sprache: TypeScript `^5.0.0`.
- Styling: Tailwind CSS `^4.0.0`.
- Auth/DB: Supabase Auth, Postgres und RLS ueber `@supabase/ssr` `^0.12.0`
  und `@supabase/supabase-js` `^2.108.2`.
- Validation: Zod `^4.4.3`.
- Package Manager: `pnpm@11.3.0`.
- Build-Befehl: `pnpm build`.
- Dev-Befehl: `pnpm dev`.
- Typecheck: `pnpm typecheck`.
- Lint: `pnpm lint`.
- E2E: `pnpm exec playwright test` oder `pnpm test:e2e`.
- Dashboard QA Script: `pnpm qa:dashboard`.
- Export Script: `pnpm export:local`, aktuell bewusst nur Platzhalter.
- Next Config: `next.config.ts` enthaelt nur Legacy-Education-Redirects und
  keine Deployment-Secret-Logik.
- Erwartete Deployment Runtime laut R1.9.3: Node.js `22.x`.
- Lokale Supabase CLI Dev Dependency: `supabase` `^2.107.0`.
- Lokale Supabase Project ID in `supabase/config.toml`: `life-os-app`.
- Lokale Supabase DB Major Version: Postgres `17`.
- Lokale Supabase API: enabled, Port `54321`.
- Lokale Supabase DB: Port `54322`, Shadow Port `54320`.
- Lokale Supabase Studio: enabled, Port `54323`.
- Lokaler Auth Site URL in `supabase/config.toml`: `http://127.0.0.1:3000`.
- Lokale Additional Redirect URL: `https://127.0.0.1:3000`.
- Local Auth Email Confirmations: `enable_confirmations = false`.
- Local Signups: `enable_signup = true`.
- Local Realtime, Storage, Edge Runtime und Analytics sind in
  `supabase/config.toml` enabled.
- Supabase migrations sind lokal vorhanden unter `supabase/migrations/`:
  Core Schema, authenticated grants, inbox RPCs, recurring templates,
  nutrition recipes/meals, skills/evidence und R1.9.1 security hardening.
- Lokaler RLS/Security-Status: R1.9.1 `LOCAL_RLS_SECURITY_AUDIT_PASS_AFTER_FIX`.
- Lokaler Backup/Restore-Status: R1.9.2 Strategie definiert; keine echte
  Production Automation.
- Lokaler Performance-Status: R1.9.4 dokumentiert; kein Production Claim.
- Lokaler Accessibility-Status: R1.9.5 dokumentiert; kein Production Claim.
- `.gitignore` schuetzt `.env*`, `.local/`, `supabase/.temp/`,
  `supabase/.branches/`, `exports/`, `backups/`, Dumps und Playwright-
  Artefakte.
- `.env.example` ist die einzige versionierte Env-Quelle und enthaelt nur
  Platzhalter.
- GitHub Actions: kein `.github/workflows/**` im Repo gefunden.

Unknown:

- Zielhosting ist nicht festgelegt.
- Production- oder Staging-Domain ist nicht festgelegt.
- Remote Supabase Projekt ist nicht festgelegt.
- Preview-Deployment-Strategie ist nicht festgelegt.
- Production Auth Site URL und Redirect-Allow-List sind nicht festgelegt.
- Production Backup/PITR-Anforderung ist nicht festgelegt.
- Monitoring-/Logging-Anbieter und Retention sind nicht festgelegt.
- Rollback-Strategie fuer Deployment und Datenbank ist nicht festgelegt.

Assumed:

- Next.js passt technisch zu Vercel, aber Vercel ist nicht entschieden.
- Supabase Cloud passt technisch zur bestehenden Supabase Auth/Postgres/RLS-
  Architektur, aber ein Cloud-Projekt ist nicht entschieden.
- Node.js `22.x` sollte als Target Runtime verwendet werden, bis eine
  Zielplattform begruendet davon abweicht.
- Local-only bleibt Entwicklungsmodus, nicht Production-Release-Ziel.

Blocked:

- Target Environment Verification ist `blocked_needs_target`.
- Deployment Rehearsal ist `blocked_needs_target`.
- Remote Supabase Audit ist `blocked_needs_remote_access`.
- Backup/Restore Drill ist `blocked_needs_target`.
- Production Performance Baseline ist `blocked_needs_target`.
- Production Accessibility Claim ist `blocked_needs_manual_review`.

## 5. Target Environment Options

W1.1B.1 bewertet Optionen, trifft aber keine Auswahl.

### Vercel fuer Next.js App

Vorteile:

- Nativer Fit fuer Next.js App Router.
- Preview Deployments sind technisch naheliegend.
- Build-Befehl `pnpm build` und Node Runtime koennen explizit konfiguriert
  werden.
- Deployment-Rehearsal kann spaeter route-/auth-fokussiert ausgefuehrt werden.

Risiken:

- Env-Werte werden build-/runtime-spezifisch verwaltet und duerfen nicht ins
  Repo.
- `NEXT_PUBLIC_*` Werte werden browser-visible und muessen als public behandelt
  werden.
- Auth Cookies, Redirects und deployed Domain muessen mit Supabase Auth
  abgeglichen werden.
- Edge-/Node-Runtime-Unterschiede koennen Server-Action- oder SSR-Verhalten
  beeinflussen.

Benoetigte Env:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- optional legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- spaeter nur server-side/future: AI Provider Keys, Export Encryption Key

Auth-/Redirect-Anforderungen:

- Production App URL festlegen.
- Supabase Site URL auf Production App URL setzen.
- Preview Domains in Redirect-Allow-List aufnehmen, falls Preview Deployments
  verwendet werden.
- localhost bleibt Development-only.

Backup-/Restore-Auswirkung:

- App-Hosting loest keine DB-Backups.
- Backup/Restore bleibt Supabase- oder DB-Projektaufgabe.

Monitoring-Auswirkung:

- Vercel Logs/Analytics koennten Runtime-Signale liefern, ersetzen aber keine
  PII-/Secret-Logging-Policy.
- Error Logging muss vor Production Claim begrenzt werden.

Status: `blocked_needs_target`

### Supabase Cloud fuer Remote DB/Auth

Vorteile:

- Passt zur bestehenden Supabase Auth/Postgres/RLS-Architektur.
- Hosted Auth, RLS, advisors, backups/PITR je nach Plan.
- Remote Audit kann RLS, grants, functions, advisors und Auth config gegen
  Zielprojekt pruefen.

Risiken:

- Hosted Projekt kann von lokalem Config-/Migration-/Grant-Stand abweichen.
- Data API Exposure, Auth Site URL, Redirect URLs und Email Confirmation
  Verhalten muessen explizit geprueft werden.
- Backups/PITR haengen vom Supabase Plan und Projektkonfiguration ab.
- Service Role darf nicht in Client, Playwright, Docs oder Codex-Kontext.

Benoetigte Env:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- optional legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Service Role nur fuer spaetere eng begrenzte serverseitige Admin-/Ops-
  Ausnahme, nicht fuer aktuelle App Runtime und nicht fuer Browser.

Auth-/Redirect-Anforderungen:

- Supabase Site URL auf deployed App URL setzen.
- Redirect-Allow-List fuer Production und ggf. Preview Domains pflegen.
- Email Confirmation Verhalten bewusst entscheiden.
- Cookie-/SSR-Verhalten mit deployed Domain pruefen.

Backup-/Restore-Auswirkung:

- Backup/PITR, Restore-Fenster, RPO/RTO und isolierter Restore Drill muessen
  separat bestaetigt werden.
- Storage-Backup bleibt relevant, falls Storage spaeter produktiv genutzt wird.

Monitoring-Auswirkung:

- Supabase Logs/Advisors koennen Remote-DB Signale liefern.
- Alerting fuer Backup-Fehler, Auth-Fehler und DB-Risiken ist noch offen.

Status: `blocked_needs_remote_access`

### Custom VPS / Docker

Vorteile:

- Hohe Kontrolle ueber Runtime, Netzwerk, Logs und Deployment.
- Kann App und ggf. Self-hosted Supabase-nahe Infrastruktur trennen oder
  zusammenfuehren.
- Rollback-/Backup-Prozesse koennen vollstaendig selbst definiert werden.

Risiken:

- Mehr Betriebsaufwand fuer TLS, Domains, Node Runtime, Prozessmanager,
  Updates, Log Rotation, Backups, Monitoring und Security Patches.
- Self-hosted Supabase/Auth erhoeht Auth-/Email-/Redirect-/API_EXTERNAL_URL-
  Komplexitaet.
- Hohe Gefahr, Production-Hardening vor Featurearbeit zu unterschaetzen.

Benoetigte Env:

- Dieselben public Supabase Env-Werte fuer App Runtime.
- Zusaetzlich server-/ops-only Secrets fuer Prozessmanager, SMTP, Backup,
  Storage oder Monitoring je nach gewaehltem Setup.

Auth-/Redirect-Anforderungen:

- Production Domain und TLS muessen vor Auth-Test stabil sein.
- Supabase Auth Site URL, external URL und Redirects muessen zur Domain passen.
- Cookie Secure/SameSite-Verhalten muss im Browser-Proof geprueft werden.

Backup-/Restore-Auswirkung:

- Betreiber ist fuer DB- und File-Backups, Encryption, Restore Drill, RPO/RTO
  und Offsite-Strategie verantwortlich.

Monitoring-Auswirkung:

- Monitoring, Alerting, Log Rotation, Error Tracking und PII-Redaction muessen
  explizit geplant und betrieben werden.

Status: `blocked_needs_target`

### Local-only als Entwicklungsmodus

Vorteile:

- Aktuell validiert fuer lokale Manual-/Browser-Proofs.
- Kein Remote-Datenrisiko.
- `.local/`, `.env.local`, Supabase `.temp` und lokale Auth-State-Artefakte
  bleiben ignoriert.

Risiken:

- Keine Production-Domain, kein Remote-Auth, kein Remote-RLS-Audit, kein
  Deployment-Rehearsal.
- Kein Production Backup/Restore, keine Production Performance und keine
  Production Accessibility.
- Darf nicht als Production Release Ziel ausgegeben werden.

Benoetigte Env:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` oder legacy fallback
- `PLAYWRIGHT_HOST`
- `PLAYWRIGHT_PORT`
- `PLAYWRIGHT_SUPABASE_AUTH_STATE`

Auth-/Redirect-Anforderungen:

- Localhost/127.0.0.1 bleibt Development-only.
- Auth-State-Dateien bleiben unter `.local/` und werden nicht committed.

Backup-/Restore-Auswirkung:

- Nur lokale Hygieneregeln; kein Production Backup Claim.

Monitoring-Auswirkung:

- Kein Production Monitoring.

Status: `ready_local`

## 6. Env / Secret Inventory

Keine echten Werte wurden gelesen oder dokumentiert. Grundlage ist
`.env.example` plus versionierte Supabase-Config-Referenzen.

| Variable | Klasse | Status | Regeln |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Client-safe | required for Manual Supabase mode | Browser-visible; muss zur Ziel-Supabase-URL passen. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Client-safe | preferred public key | Browser-visible; kein Secret. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-safe | legacy fallback | Nur nutzen, falls Publishable Key nicht verfuegbar ist. |
| `SUPABASE_SERVICE_ROLE_KEY` | Forbidden for client; server-only future exception | not used | Nie `NEXT_PUBLIC_`, nie Client, nie Playwright, nie Docs/Chat. |
| `PLAYWRIGHT_HOST` | Test-only / local-only | local proof only | Darf Production nicht steuern. |
| `PLAYWRIGHT_PORT` | Test-only / local-only | local proof only | Default local `3000`. |
| `PLAYWRIGHT_SUPABASE_AUTH_STATE` | Test-only / local-only sensitive path | ignored file under `.local/` | Pfad darf dokumentiert werden; Inhalt nie lesen oder ausgeben. |
| `AI_PROVIDER_API_KEY` | Future-only / server-only | not used | Erst nach AI Governance Scope. |
| `OPENAI_API_KEY` | Future-only / server-only; local Supabase Studio placeholder | not used by app runtime | Nicht in Client, nicht in Repo; Supabase Studio placeholder ist kein App Runtime Claim. |
| `DEEPSEEK_API_KEY` | Future-only / server-only | not used | Erst nach AI Governance Scope. |
| `EXPORT_ENCRYPTION_KEY` | Future-only / server-only | not used | Erst nach Backup/Export Encryption Scope. |
| `SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN` | Server-only / local service placeholder | disabled SMS provider | Nur relevant, wenn SMS Auth spaeter aktiviert wird. |
| `SUPABASE_AUTH_EXTERNAL_APPLE_SECRET` | Server-only / local service placeholder | disabled OAuth provider | Nur relevant, wenn Apple OAuth spaeter aktiviert wird. |
| `SENDGRID_API_KEY` | Server-only / future SMTP placeholder | SMTP commented out | Nur relevant, wenn Production SMTP aktiviert wird. |

Forbidden:

- echte `.env.local` oder `.env` Werte dokumentieren
- Service Role in Client, Playwright oder Browser-Bundle
- AI Provider Keys vor Governance-Scope
- Export Encryption Keys im Repo
- Auth-State-Inhalte, Screenshots, Traces oder private Daten committen

## 7. Supabase Local-vs-Remote Boundary

Local Supabase:

- ist aktuell validiert fuer lokale RLS-/Grants-/Advisor-Pruefung.
- nutzt `supabase/config.toml`, lokale Ports und lokale Migrationen.
- hat API/DB/Studio/Inbucket/Auth lokal konfiguriert.
- verwendet lokale Auth URLs fuer `127.0.0.1:3000`.
- hat migrationsbasierte Tabellen, RLS-Policies, authenticated grants und
  Security-Hardening.

Remote Supabase:

- ist nicht auditiert.
- ist nicht gelinkt.
- wurde nicht gelesen.
- wurde nicht beschrieben.
- hat keinen dokumentierten Project URL/Key/Plan/Backup-Stand.

Nicht ausgefuehrt:

- kein `supabase link`
- kein `supabase db push`
- kein `supabase db reset`
- keine Remote Migration
- keine Remote Query
- keine Service Role

Spaeter fuer Remote zu pruefen:

- Project URL
- Publishable/Anon Key
- Auth Site URL
- Redirect URLs fuer Production und Preview
- Email Confirmation Verhalten
- RLS Policies gegen Zielprojekt
- Grants und Data API Exposure
- Functions/RPC Execute Grants
- Supabase Security Advisors
- Migrationstand
- Backups/PITR
- Restore-Drill-Ziel
- Storage, falls spaeter relevant
- Log-/Retention-/Alerting-Grenzen

Remote Audit bleibt:

```text
W1.1B.2 Remote Supabase Readiness Audit Plan
```

## 8. Auth / Redirect / Domain Requirements

Local Development:

- App URL: `http://localhost:3000` oder `http://127.0.0.1:3000` je nach
  Playwright-/Dev-Kontext.
- Supabase local Auth Site URL aus `supabase/config.toml`:
  `http://127.0.0.1:3000`.
- Local additional redirect URL: `https://127.0.0.1:3000`.
- Local email confirmations sind disabled.
- Playwright Auth-State bleibt local-only unter `.local/`.

Production:

- Production Domain/Subdomain muss entschieden werden.
- Supabase Site URL muss auf die Production App URL zeigen.
- Redirect-Allow-List muss Production Domain enthalten.
- `NEXT_PUBLIC_SUPABASE_URL` muss auf das Zielprojekt zeigen.
- Public Supabase Key muss als browser-visible public key behandelt werden.
- Cookie-/storage-Verhalten muss in der deployed Domain geprueft werden.
- Email Confirmation Verhalten muss bewusst entschieden werden.

Preview:

- Preview Domains muessen entschieden werden.
- Falls Preview Deployments genutzt werden, muessen Redirect URLs pro Preview-
  Muster oder erlaubter Domain-Strategie gepflegt werden.
- Preview darf nicht gegen Production-Daten laufen, solange Backup/Restore,
  RLS und Datenpolicy offen sind.

Blocked:

```text
Target Domain, Preview Domain und Remote Supabase Projekt sind unbekannt.
```

## 9. Deployment Preflight Checklist

Vor einem spaeteren Deployment-Rehearsal muessen diese Punkte gruen oder
explizit blockiert sein:

- [ ] Target Hosting gewaehlt.
- [ ] Remote Supabase Projekt gewaehlt.
- [ ] Production/Preview Domain entschieden.
- [ ] Node Runtime `22.x` bestaetigt oder Abweichung dokumentiert.
- [ ] `NEXT_PUBLIC_SUPABASE_URL` in Zielumgebung gesetzt, nicht im Repo.
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Zielumgebung gesetzt, nicht im
      Repo.
- [ ] Legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` nur bei Bedarf gesetzt.
- [ ] Keine Service Role oder Provider Secrets in client-visible Env.
- [ ] `pnpm typecheck` gruen.
- [ ] `pnpm lint` gruen.
- [ ] `pnpm build` gruen.
- [ ] Supabase local `db lint` gruen.
- [ ] Supabase local security advisors gruen.
- [ ] Remote RLS Audit geplant.
- [ ] Auth Site URL geprueft.
- [ ] Auth Redirect URLs fuer Production geprueft.
- [ ] Auth Redirect URLs fuer Preview geklaert, falls Preview aktiv ist.
- [ ] Email Confirmation Verhalten entschieden.
- [ ] Backup/Restore-Plan geprueft.
- [ ] RPO/RTO und Restore-Drill-Ziel geklaert.
- [ ] Monitoring/Error Logging geklaert.
- [ ] PII-/Secret-Logging-Regeln geklaert.
- [ ] Rollback-Plan fuer App Deployment geklaert.
- [ ] Rollback-/Recovery-Plan fuer DB-Migrationen geklaert.
- [ ] Keine produktiven Daten ohne Backup/Restore-Gate.
- [ ] Kein production-ready Claim vor Rehearsal.

## 10. Questions for User

1. Soll die erste Zielumgebung Vercel fuer die Next.js App sein?
2. Gibt es bereits ein Supabase Cloud Projekt fuer Staging oder Production?
3. Soll es Preview-Deployments geben, oder nur eine feste Staging/Production
   URL?
4. Welche Domain oder Subdomain ist fuer die erste deployed App geplant?
5. Soll Auth zunaechst privat/eingeschraenkt bleiben oder oeffentlich nutzbar
   sein?
6. Welche Daten duerfen in eine Remote-Umgebung: leer, synthetisch, lokale
   Testdaten oder spaeter echte private Daten?
7. Soll Remote zunaechst als leeres Staging-Projekt starten?
8. Wird fuer den ersten Remote-Block Supabase Backup/PITR benoetigt, oder reicht
   ein manueller Restore Drill mit synthetischen Daten?
9. Sollen Preview Deployments dasselbe Supabase Projekt nutzen wie Staging oder
   strikt getrennt bleiben?
10. Welches Monitoring/Error-Logging ist akzeptabel, bevor externe Provider oder
    PII-nahe Logs erlaubt werden?

## 11. Blockers

Aktueller Status:

```text
blocked_needs_target
```

Blocker:

- Zielhosting nicht entschieden.
- Remote Supabase Projekt nicht entschieden.
- Production Domain nicht entschieden.
- Preview-Strategie nicht entschieden.
- Auth Site URL/Redirect-Allow-List nicht festgelegt.
- Remote RLS/Grants/Advisors nicht auditiert.
- Backup/PITR/Restore-Drill nicht entschieden.
- Monitoring/Error-Logging/Retention nicht entschieden.
- Rollback-Plan nicht entschieden.

Nicht blockiert:

- lokale Doku- und Readiness-Arbeit.
- W1.1B.2 als Plan fuer Remote Supabase Audit, solange er keine Remote-Aktion
  ausfuehrt.

## 12. Next Block Recommendation

Empfohlen:

```text
User Target Decision -> W1.1B.2 Remote Supabase Readiness Audit Plan
```

Begruendung:

- W1.1B.1 kann keine Zielumgebung auswaehlen.
- W1.1B.2 sollte erst Remote-Audit-Kommandos, Rollen und No-Service-Role-
  Grenzen definieren, bevor irgendein Remote-Zugriff erlaubt wird.
- Ein Deployment-Rehearsal sollte erst nach Target-Env-Entscheidung und Remote-
  Supabase Readiness Plan starten.

Bis dahin erlaubter Claim:

```text
Life OS ist lokal proof-stable.
Life OS ist noch nicht production-ready.
```

Browser-Proof:

```text
Browser-Proof: NOT_NEEDED
```

Grund: W1.1B.1 ist docs-only und bedient keine UI, Form, Navigation,
Persistenz, Prepared State oder Target-Env-URL.
