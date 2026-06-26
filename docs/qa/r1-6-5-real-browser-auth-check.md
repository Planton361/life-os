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

## R1.6.6C Solved / Archive Route

- Solved / Archive is connected as the first non-task persistent route.
- The route removes an Inbox item from the active Inbox by soft archive.
- It must not hard-delete the row.
- It must not create a Task, Resource, Project, or Goal.
- Archived items are reload-stable outside the active Inbox.
- Archive view does not exist yet.

## R1.6.6D Add to Existing Target Picker

- Add to Existing is connected as a Target Picker, not as a generic auto-link.
- Existing Projects, Goals, and Resources are loaded read-only through the authenticated Supabase client and normal RLS.
- Task contribution is the only persistent Add-to-Existing path in this block.
- Project target writes the created task with `project_id`; Goal target writes the created task with `goal_id`.
- Resource Link is visible as prepared but does not write a Resource relation yet.
- Skill remains Future Scope until a real persisted Skill entity exists.
- Without an existing Project or Goal target, Add to Existing must not expose an enabled persistent submit.
- Route selection alone still writes nothing.

## R1.6.6D2 Inbox Router Visual Check

- Inbox Active Item must render in this order: Original Capture, Clarify Fields, Outcome Route, Draft, Planning Signals.
- `Noch kein Draft ausgewählt` appears only inside the Draft slot and only before a route is selected.
- Each selected route renders exactly one matching draft in the Draft slot.
- Add to Existing shows `Bestehendem Objekt zuordnen` with Target type, Existing target, and Beitragstyp controls.
- Planning Signals sit below the Draft slot and do not overlap Route Cards or Draft content.
- Create New and Resource can be selected, but their Draft shells clearly say they do not write persistence yet.
- Add to Existing is partially connected: Task to Project/Goal only; Resource Link is prepared; Note/Decision/Skill are not connected.
- Triaged or archived items show their post-state and must not reopen the active router as the primary work surface.

## R1.6.6D3 Inbox Router Layout Check

- In the 3-column desktop layout, the Active Item card body must scroll internally.
- Add-to-Existing Draft must not be clipped by the card or page container.
- Target type controls, Existing target select, Beitragstyp controls, and lower draft controls must remain reachable.
- Planning Signals may sit below the fold, but must remain reachable through the Active Item scroll area.
- Queue and assistant columns should remain stable while the Active Item body scrolls.

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
16. For Add to Existing, open `/inbox`, choose `Add to Existing`, and confirm the Target Picker lists only real DB Projects, Goals, or Resources.
17. Select a Project or Goal, keep Beitragstyp `Task`, edit the draft, and use `Task-Beitrag erstellen`.
18. Confirm the Inbox item reaches `Task erstellt` and the task appears in Portfolio with the selected Project or Goal relation when such a target exists.
19. Select Resource + Resource Link and confirm it is marked prepared without creating a Resource relation.

## Known Boundaries

- Browser auth is email/password only.
- Sign-up may require local Supabase email confirmation depending on Auth config.
- Project, Goal, Resource, Daily Log, complete/edit/archive flows are out of R1.6.5 scope.
- Session reset clears Supabase auth cookies only; it does not change database rows, RLS, policies, or migrations.
