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
6. Choose `Standalone task` in Outcome Route.
7. Edit the `Task Draft` fields and use `Task erstellen`.
8. Open `/portfolio?view=tasks` and confirm the task is visible.
9. Use `Heute planen`.
10. Open `/today` and `/dashboard` and confirm the task is visible for the local day.
11. Use `Heute terminieren`.
12. Open `/calendar` and confirm the task appears in the timed grid.
13. Reload `/inbox`, `/portfolio?view=tasks`, `/today`, `/dashboard`, and `/calendar`.

## Entry Semantics

- Capture ≠ Task.
- Task ≠ Termin.
- Terminierte Task = Task + `scheduledStartAt`.
- Dashboard Quick Thought is generic Inbox capture.
- Inbox is where classification and Task Draft review happen.
- Portfolio owns task inventory and planning.
- Today shows today's execution view.
- Calendar shows scheduled time blocks.

## R1.6.6A Inbox Routing Notes

- Inbox is a routing system for raw captures, not a task-only creation surface.
- Dashboard Quick Thought is generic capture; it must save to Inbox without implying that a Task is created immediately.
- Task creation is only one possible outcome route after Inbox review.
- Planning signals such as priority, energy, effort, area, Today candidate, deadline hint, or recurrence hint are not fixed scheduling.
- Calendar creates or shows time blocks after planning confirmation; it is not the place where raw Inbox clarification happens.

## R1.6.6B Inbox Router UI

- Outcome Routes are visible as the primary router for the selected Inbox item.
- Standalone Task is marked as connected and opens the functional Task Draft.
- Add to Existing, Create New, Resource, and Solved / Archive are prepared routes, but they are marked as not connected.
- Prepared routes show draft shells and must not expose a persistence submit action.
- Planning Signals are hints for later planning, not scheduling.
- AI Assistant suggests routes and fields, but it does not decide or apply changes.

## R1.6.5B Follow-up Checks

1. If `/settings#supabase-session` shows `invalid session`, use `Session zurücksetzen`.
2. Confirm `/inbox`, `/portfolio?view=tasks`, `/today`, `/dashboard`, and `/calendar` stop showing repeated invalid refresh-token noise after reset.
3. Sign in again with local Supabase email/password.
4. Open `/dashboard`, confirm no `Inbox-Typ` dropdown is visible in `Quick Thought`, use `In Inbox speichern`, and confirm `In der Inbox gespeichert.` plus `Inbox öffnen`.
5. Open `/inbox`, confirm the captured thought appears as a generic Inbox capture with Outcome Route visible and without `Task erstellen`.
6. Choose `Standalone task`, confirm `Outcome Route gewählt` becomes done, and confirm `Task Draft` appears.
7. Confirm `Task Draft` fields are editable: title, description/context, next action, area, priority, effort/duration, energy, review-needed, and optional `Heute planen`.
8. Change title, description/context, next action, priority, effort/duration, and energy, then use `Task erstellen`.
9. Confirm exactly one `Task erstellt` state and `Portfolio öffnen` are visible after triage.
10. Confirm the already triaged item no longer shows a large `Task erstellen` button after reload, so no second task can be created from the same inbox item.
11. Confirm the checklist shows `Task Draft vorhanden` for saved task captures and `Outcome Route gewählt` done for a selected standalone-task route.
12. Confirm persisted draft fields in Portfolio: title, description/context including next action, priority, energy, duration, and optional Today planning.
13. Confirm Area persists only when the Inbox item already has a real DB Area; otherwise the UI labels Area as not saved.
14. Confirm the created task is visible through Portfolio, Today, Dashboard, and Calendar planning views after the normal manual DB flow.
15. If Portfolio, Today, Dashboard, or Calendar stay empty, verify that the item was triaged in Inbox and that the task is visible under `/portfolio?view=tasks` before checking planning or scheduling actions.

## Known Boundaries

- Browser auth is email/password only.
- Sign-up may require local Supabase email confirmation depending on Auth config.
- Project, Goal, Resource, Daily Log, complete/edit/archive flows are out of R1.6.5 scope.
- Session reset clears Supabase auth cookies only; it does not change database rows, RLS, policies, or migrations.
