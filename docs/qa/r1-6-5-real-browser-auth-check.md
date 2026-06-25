# R1.6.5 Real Browser Auth Check

## Env

- Local Supabase runtime only.
- `NEXT_PUBLIC_SUPABASE_URL`.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- No remote DB, `supabase link`, `supabase db push`, migrations, or policy changes.

## Browser Check

1. Open `/settings#supabase-session`.
2. Confirm `Manual Profile` can remain active while `Supabase Session` shows signed out.
3. Sign in with local Supabase email/password.
4. Open `/inbox`.
5. Capture a Manual Inbox item.
6. Convert it with `Als Task anlegen`.
7. Open `/portfolio?view=tasks` and confirm the task is visible.
8. Use `Heute planen`.
9. Open `/today` and `/dashboard` and confirm the task is visible for the local day.
10. Use `Heute terminieren`.
11. Open `/calendar` and confirm the task appears in the timed grid.
12. Reload `/inbox`, `/portfolio?view=tasks`, `/today`, `/dashboard`, and `/calendar`.

## R1.6.5B Follow-up Checks

1. If `/settings#supabase-session` shows `invalid session`, use `Session zurücksetzen`.
2. Confirm `/inbox`, `/portfolio?view=tasks`, `/today`, `/dashboard`, and `/calendar` stop showing repeated invalid refresh-token noise after reset.
3. Sign in again with local Supabase email/password.
4. Open `/dashboard`, choose `Aufgaben-Capture`, use `In Inbox speichern`, and confirm `Als Aufgaben-Capture in der Inbox gespeichert`.
5. Follow `In Inbox als Task anlegen`, confirm the captured thought appears there, and use `Als Task anlegen`.
6. Confirm the created task is visible through Portfolio, Today, Dashboard, and Calendar planning views after the normal manual DB flow.

## Known Boundaries

- Browser auth is email/password only.
- Sign-up may require local Supabase email confirmation depending on Auth config.
- Project, Goal, Resource, Daily Log, complete/edit/archive flows are out of R1.6.5 scope.
- Session reset clears Supabase auth cookies only; it does not change database rows, RLS, policies, or migrations.
