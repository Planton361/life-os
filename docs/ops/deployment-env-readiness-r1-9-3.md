# R1.9.3 Deployment Environment Readiness / Config Boundary Check

Stand: 2026-06-28
Status: Deployment environment boundary defined; no deployment executed
Zweck: Env-, Build-, Supabase- und Secrets-Grenzen fuer den naechsten
Production-Hardening-Schritt dokumentieren.

## 1. Zweck

R1.9.3 definiert, welche Environment-Variablen im aktuellen MVP-Core genutzt
werden, welche Variablen client-safe sind, welche Werte server-only bleiben
muessen und welche Supabase-Grenzen zwischen lokaler Entwicklung und spaeterer
Production gelten.

Dieser Block deployed nichts, dokumentiert keine echten `.env`-Werte, verbindet
kein Remote-Projekt und aendert keine RLS-/Security-Regeln. Codex hat
`.env.local` nicht geoeffnet.

## 2. Gepruefte Quellen

- `src/lib/supabase/server.ts`
- `src/features/real-data/actions/**`
- `src/features/inbox/ai/**`
- `playwright.config.ts`
- `tests/e2e/**`
- `supabase/config.toml`
- `supabase/migrations/**`
- `.gitignore`
- `package.json`
- `next.config.ts`
- `docs/security/rls-security-audit-r1-9-1.md`
- `docs/security/backup-export-restore-strategy-r1-9-2.md`
- `docs/qa/r1-6-5-real-browser-auth-check.md`
- Next.js v16.2.2 Environment Variables guide:
  https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/02-guides/environment-variables.mdx
- Next.js v16.2.2 Upgrade guide:
  https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/02-guides/upgrading/version-16.mdx
- Supabase changelog:
  https://supabase.com/changelog.md

## 3. Env Vars Found

Current app/runtime:

| Variable | Location | Class | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `src/lib/supabase/server.ts`, auth copy | client-safe public | Required for Manual Supabase mode. Bundled into browser code if referenced from client modules. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `src/lib/supabase/server.ts`, auth copy | client-safe public | Preferred public Supabase key. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `src/lib/supabase/server.ts`, auth copy | client-safe public legacy fallback | Public anon fallback only; not a service-role key. |

Test/local-only:

| Variable | Location | Class | Notes |
| --- | --- | --- | --- |
| `PLAYWRIGHT_HOST` | `playwright.config.ts`, `tests/e2e/**` | local/test | Defaults to `127.0.0.1`; local browser proof host override. |
| `PLAYWRIGHT_PORT` | `playwright.config.ts`, `tests/e2e/**` | local/test | Defaults to `3000`. |
| `PLAYWRIGHT_SUPABASE_AUTH_STATE` | `tests/e2e/content-state-system.spec.ts` | local/test sensitive path | Points to ignored `.local/` auth-state JSON. Do not commit the file. |
| `CI` | `playwright.config.ts` | CI/test | Controls retries and web-server reuse. |

Supabase local service config placeholders:

| Variable | Location | Class | Notes |
| --- | --- | --- | --- |
| `OPENAI_API_KEY` | `supabase/config.toml` Studio config | local service/server-only | For Supabase Studio AI helper only; not used by Life OS app runtime. |
| `SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN` | `supabase/config.toml` disabled SMS provider | service/server-only | Placeholder for disabled Twilio config. |
| `SUPABASE_AUTH_EXTERNAL_APPLE_SECRET` | `supabase/config.toml` disabled Apple provider | service/server-only | Placeholder for disabled Apple OAuth config. |

Future-only / forbidden in browser:

| Variable | Status | Boundary |
| --- | --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Not used | Server-only future exception. Must never be committed or exposed to client bundles. |
| `AI_PROVIDER_API_KEY`, `OPENAI_API_KEY`, `DEEPSEEK_API_KEY` | Not used by app runtime | Server-only future AI provider scope; current AI suggestion provider is deterministic local mock. |
| `EXPORT_ENCRYPTION_KEY` | Not used | Server-only future backup/export encryption scope. |

## 4. Client / Server Boundary

Next.js treats variables prefixed with `NEXT_PUBLIC_` as browser-visible build
time values when imported into client-side code. Non-prefixed variables stay
server-only unless explicitly serialized or leaked by application code.

Current boundary:

- Client-safe: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and legacy
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Server-only current app secrets: none found.
- The Supabase client is created through `src/lib/supabase/server.ts` with
  `server-only`, cookie handling and the public Supabase key. It does not read
  a service-role key.
- Server Actions in `src/features/real-data/actions/**` call
  `createAuthenticatedSupabaseServerClient()` and rely on authenticated user
  scope, not client-supplied `userId`.
- The inbox AI action uses `createMockInboxAISuggestion()` and does not call an
  external provider or read provider secrets.

Forbidden:

- No real secret may use a `NEXT_PUBLIC_` prefix.
- No `SUPABASE_SERVICE_ROLE_KEY` in React/client modules.
- No `.env.local`, `.env`, auth-state JSON, dump, export or backup file in git.
- No remote Supabase credentials in docs or examples.

## 5. Supabase Boundary

Local development:

- Uses `supabase/config.toml`, local ports and local migrations.
- `supabase/.temp/` and `supabase/.branches/` are ignored local CLI artifacts.
- `supabase/config.toml` is configured for local Auth URLs
  (`127.0.0.1:3000`) and local Studio/API ports.
- Local Data API grants and RLS status are documented in
  `docs/security/rls-security-audit-r1-9-1.md`.
- Supabase CLI checked in this block with `HOME=/tmp/life-os-supabase-home` and
  `SUPABASE_TELEMETRY_DISABLED=1`: version `2.107.0`.

Production or staging:

- Must use a separate Supabase project and deployment environment variables.
- Must apply migrations intentionally through a reviewed release process.
- Must re-run RLS/grants/function/security-advisor checks against the target
  project before any production release claim.
- Must configure Auth Site URL and redirect allow-list for the deployment
  domain.
- Must verify Data API exposure/grants for hosted Supabase behavior; recent
  Supabase changes keep newly created public-schema entities from being
  auto-exposed unless explicitly granted.
- If self-hosting Supabase Auth, review the `API_EXTERNAL_URL`/Auth external
  URL behavior from the 2026-06-18 Supabase changelog entry before deployment.

Not done in R1.9.3:

- No `supabase link`.
- No `supabase db push`.
- No remote DB reads or writes.
- No migration.
- No new policy or grant.
- No service-role access.

## 6. Build / Runtime Readiness

Current build/runtime assumptions:

- `packageManager`: `pnpm@11.3.0`.
- Runtime target for deployment should be Node.js `22.x` to match the project
  toolchain and avoid Node 20 support churn in the current Supabase/Next stack.
- `next.config.ts` contains only route redirects and no deployment-time secret
  logic.
- Missing Supabase public env values cause Manual Supabase mode to return
  `missing_env`; the app should still build.
- `next-env.d.ts` is generated and not versioned.

Validation in this block:

```text
pnpm typecheck
pnpm lint
HOME=/tmp/life-os-supabase-home SUPABASE_TELEMETRY_DISABLED=1 pnpm exec supabase db lint --local --level warning
HOME=/tmp/life-os-supabase-home SUPABASE_TELEMETRY_DISABLED=1 pnpm exec supabase db advisors --local --type security --level warn --fail-on none
pnpm build
```

R1.9.3 Ergebnis: alle oben genannten Checks liefen lokal gruen. Die Supabase
local Checks benoetigten Zugriff auf die lokale Docker-backed Supabase Runtime;
der Build benoetigte lokale Turbopack-Prozessrechte. Beides blieb lokal und war
keine Remote-DB-Aktion und kein Deployment.

## 7. Secrets Handling

Rules:

- `.env.example` may contain placeholders only.
- `.env.local`, `.env`, `.env.*`, auth-state JSON and generated credentials
  must remain unversioned.
- `PLAYWRIGHT_SUPABASE_AUTH_STATE` may point to `.local/...`; the target file is
  sensitive local state and ignored.
- Backup/export secrets and generated artifacts stay covered by R1.9.2 local
  hygiene rules.
- Service-role, AI-provider, OAuth-provider and export-encryption secrets are
  server-only future scope and require a separate reviewed implementation block
  before use.

## 8. Gitignore

Current `.gitignore` protects:

- `.env*`
- `.local/`
- `supabase/.temp/`
- `supabase/.branches/`
- `exports/`
- `backups/`
- `*.dump`
- `*.sql.gz`
- `*.backup`
- `test-results/`
- `playwright-report/`

It explicitly allows `.env.example`, so placeholder documentation can be
versioned without exposing real secrets.

## 9. Auth / RLS / Migration

- Auth remains Supabase-cookie based through `@supabase/ssr`.
- RLS status remains the R1.9.1 local audit status.
- R1.9.3 makes no schema, policy, function or grant changes.
- R1.9.3 does not perform a remote-production RLS audit.
- Production must not be claimed until target-project RLS/grants/advisors are
  re-checked in that environment.

## 10. Deployment Checklist

Before a real deployment block:

- Set `NEXT_PUBLIC_SUPABASE_URL` for the target Supabase project.
- Set `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; use
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` only as fallback.
- Do not set service-role or provider secrets in client-visible env.
- Configure Auth Site URL and redirect allow-list for the deployed domain.
- Confirm deployment runtime Node.js `22.x`.
- Apply migrations through reviewed process only.
- Run remote/staging RLS, grants, function and advisor checks.
- Confirm production backup configuration and restore drill plan from R1.9.2.
- Run `pnpm build` in the target deployment environment.

## 11. Release Readiness Impact

```text
DEPLOYMENT_ENV_BOUNDARY_DEFINED
PLACEHOLDER_ENV_EXAMPLE_ADDED
NO_SECRETS_READ_OR_COMMITTED
NO_DEPLOYMENT_EXECUTED
NO_REMOTE_SUPABASE_ACTION
NOT_PRODUCTION_RELEASE_READY
```

R1.9.3 reduces deployment/config ambiguity. It does not replace a real
deployment rehearsal, remote Supabase audit, production backup drill,
performance review or full accessibility pass.
