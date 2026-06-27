# Recurring Task / Routine Model Lock

Stand: 2026-06-27
Status: Active
Scope: R1.7.5 Recurring Task / Routine Model Lock

## 1. Zweck

Dieses Dokument sperrt die Produkt- und Datenmodellsemantik fuer wiederkehrende Tasks, Routinen und Habits. R1.7.5 implementiert keine Recurrence Engine, keine Migration und keine UI. Der Block verhindert, dass `plannedDate`, `scheduledStartAt` und `durationMinutes` mit Template-Semantik vermischt werden.

## 2. Begriffe

- Task: Ein konkreter ausfuehrbarer Arbeits- oder Lebensschritt.
- Recurring Task Template: Eine Vorlage, die beschreibt, welche Task-Instanzen nach welcher Regel entstehen sollen.
- Generated Task Instance: Eine normale Task, die aus einer Vorlage fuer ein konkretes Datum erzeugt wurde.
- Routine: Eine wiederkehrende Sequenz oder Gruppe von Elementen, spaeter als Container fuer mehrere Templates nutzbar.
- Habit: Wiederholtes Verhalten mit Log-/Consistency-Fokus, nicht automatisch eine Task.
- Instance Date: User-lokales Datum, fuer das eine Instanz erzeugt wurde.
- Generation: Der kontrollierte Use Case, der aus Templates konkrete Task-Instanzen anlegt.

## 3. Task vs Recurring Task vs Routine vs Habit

Ein Task bleibt die kanonische Einheit fuer Daily Core, Calendar, Dashboard und Portfolio. Er kann geplant, terminiert, abgeschlossen, wieder geoeffnet, entterminiert, verschoben und archiviert werden.

Ein Recurring Task ist keine einzelne dauerhafte Task mit wechselndem Datum. In Life OS ist Recurring Task eine Vorlage plus konkrete generierte Task-Instanzen. Die Vorlage beschreibt Wiederholung, Defaults und Kontext. Die Instanz ist das ausfuehrbare Tagesobjekt.

Eine Routine ist eine Gruppe oder Sequenz. Sie kann spaeter mehrere Recurring Task Templates enthalten, zum Beispiel Morning Routine, Evening Shutdown oder Training Prep. Sie ist nicht selbst der erledigbare Task.

Ein Habit ist Tracking und Verhaltenserkennung. Habits zaehlen Logs, Signale, Streaks, Repair Loops oder Konsistenz. Ein Habit darf spaeter optional eine Daily Task erzeugen, aber nur ueber eine explizite Regel.

## 4. Generate-vs-Reference Entscheidung

R1.7.5 lockt das Modell: Recurring Tasks verwenden Template + Generated Instances.

Nicht gewaehlt: Eine einzelne Task mit `recurrence_rule`, deren `plannedDate`, `scheduledStartAt` oder Completion taeglich umgedeutet wird.

Begruendung:

- Daily Core braucht konkrete Tagesobjekte.
- Completion muss pro Datum und Instanz funktionieren.
- Calendar braucht echte `scheduledStartAt`-Werte pro Zeitblock.
- Dashboard Agenda darf nur konkrete Arbeit zeigen, keine abstrakten Templates.
- Review braucht nachvollziehbare History.
- Carry Forward, Snooze und Reschedule duerfen einzelne Instanzen betreffen, nicht still die Serie.

## 5. Scheduling-Semantik

`plannedDate` bleibt das user-lokale Planungsdatum einer konkreten Task-Instanz. Es ist kein Template-Faelligkeitsmuster.

`scheduledStartAt` bleibt der konkrete Calendar-Time-Grid-Start einer Task-Instanz. Nur Tasks mit `scheduledStartAt` duerfen als Calendar Time Block erscheinen.

`durationMinutes` bleibt Schaetzung oder Blocklaenge einer konkreten Task-Instanz. Template-Defaults duerfen spaeter `defaultDurationMinutes` heissen, muessen aber bei Generation in die Instanz kopiert werden.

Recurring Templates duerfen spaeter Defaults enthalten:

- `defaultPlannedTime` oder `defaultScheduledTime`
- `defaultDurationMinutes`
- `defaultPriority`
- `defaultEnergy`
- `areaId`, `projectId`, `goalId`

Diese Defaults sind keine Daily-Core-Objekte, bis eine Instanz erzeugt wurde.

## 6. Completion-Semantik

Completion gehoert auf die generierte Task-Instanz:

- `tasks.completed_at` beschreibt den Abschluss genau dieser Instanz.
- `tasks.status = done` beschreibt genau diese Instanz.
- Reopen betrifft genau diese Instanz.
- Review zaehlt Instanzen, nicht Templates.

Eine Template-Aenderung darf abgeschlossene Instanzen nicht rueckwirkend aendern.

## 7. Skipped/Missed/Snoozed Semantik

Skipped ist eine explizite Entscheidung fuer eine konkrete Instanz oder einen Daily-Log-Bezug. Das bestehende `daily_log_task_relation_type = skipped` zeigt, dass Tagesbezug ohne Task-Duplikat modelliert werden kann. Eine spaetere `skippedAt`-Spalte auf Tasks ist optional, aber nicht Teil von R1.7.5.

Missed wird im MVP abgeleitet, nicht sofort gespeichert. Beispiel: geplante offene Instanz liegt nach Tagesende noch offen. Persistente Missed-Events brauchen eigenen Review-/Daily-Log-Scope.

Snooze oder Verschieben betrifft die konkrete Instanz. Es aendert `plannedDate` und optional `scheduledStartAt` der Instanz, nicht die Vorlage.

Archive muss explizit getrennt werden:

- Instance archivieren: nur diese Task verschwindet aus aktiven Views.
- Template archivieren: keine zukuenftigen Instanzen mehr erzeugen.

## 8. Today/Dashboard/Calendar Darstellung

Today zeigt generated instances wie normale Tasks. Today darf Templates nicht als Tagesereignisse anzeigen.

Dashboard Today Agenda zeigt nur konkrete Task-Instanzen. Keine Routine-Matrix, keine Template-Liste und keine Streak-Mechanik im P0-Bereich.

Calendar zeigt scheduled generated instances wie normale scheduled Tasks. Calendar Planner Queue zeigt generated instances mit `plannedDate` ohne `scheduledStartAt`.

Portfolio darf spaeter Template-Kontext zeigen, etwa "generated from Morning Routine", aber nicht im Daily Core erzwingen.

Habits bleiben in Health/Habits als Signale und Logs. Sie duerfen nicht automatisch Dashboard-Tasks erzeugen, solange keine explizite Generation-Regel existiert.

## 9. Review-Auswirkungen

Review bewertet Instanzen und Tagesentscheidungen, nicht abstrakte Templates.

Daily Review kann spaeter zeigen:

- erledigte generated instances
- offene generated instances
- skipped Instanzen
- abgeleitete missed Instanzen
- Carry Forward von konkreten Instanzen

Weekly Review kann Template-Qualitaet aus Instanz-History ableiten, zum Beispiel "zu oft gesnoozed" oder "Dauer unrealistisch". Es soll keine Completion direkt auf Templates buchen.

## 10. Data Model Optionen

### Option A - recurrence fields on tasks

Skizze:

```text
tasks.recurrence_rule
tasks.recurrence_parent_id
tasks.instance_date
```

Vorteile:

- kleine Migration
- nah am bestehenden Task-Modell
- weniger Tabellen im ersten Schritt

Nachteile:

- vermischt Template und Instanz
- Completion-History wird schwerer
- Daily Core muesste wissen, ob eine Task Vorlage oder Instanz ist
- hoeheres Risiko, `plannedDate` und `scheduledStartAt` zu verwaessern

Entscheidung: Nicht als Zielmodell fuer Life OS.

### Option B - recurring_task_templates + generated task instances

Skizze:

```text
recurring_task_templates
tasks.generated_from_template_id
tasks.instance_date
```

Vorteile:

- klare Trennung von Vorlage und Ausfuehrung
- Daily Core sieht konkrete Tasks
- Completion pro Instanz
- Calendar bleibt bei `scheduledStartAt`
- Review bleibt nachvollziehbar
- Idempotenz ist ueber Template + Instance Date modellierbar

Nachteile:

- braucht Migration
- braucht Generation-Use-Case
- braucht Idempotenzregeln
- braucht UI fuer Template-Pflege erst spaeter

Entscheidung: R1.7.5 lockt Option B als naechstes Implementierungsziel.

### Option C - routines + routine_items + generated task instances

Skizze:

```text
routines
routine_items
recurring_task_templates
tasks.generated_from_template_id
tasks.instance_date
```

Vorteile:

- langfristig passend fuer Morning/Evening/Training-Routinen
- Sequenzen und Gruppen werden explizit
- Routine kann mehrere Task Templates und spaeter Habit-Bezuege enthalten

Nachteile:

- zu gross fuer den direkten MVP-Schritt
- mehr UI-, DB-, RLS- und Repository-Aufwand
- hohes Risiko einer Routine-Engine vor stabiler Instanzgenerierung

Entscheidung: Spaeterer Ausbau nach Option B, nicht R1.7.5B.

## 11. Migration Gate

R1.7.5 baut keine Migration.

Eine spaetere Migration braucht mindestens:

- `user_id` auf jeder neuen nutzerspezifischen Tabelle
- RLS fuer Templates, Routinen und Routine Items
- Zod-Schemas fuer alle Mutationen
- Repository Interface und Supabase Repository
- keine Service Role
- keine Remote-DB-Aktion ohne explizite Freigabe
- Idempotenz fuer Instanzgenerierung
- klare Ownership fuer `generated_from_template_id`

Vorlaeufige R1.7.5B-Zielskizze:

```text
recurring_task_templates
- id
- user_id
- title
- description
- recurrence_rule
- timezone
- start_date
- end_date
- default_priority
- default_energy
- default_duration_minutes
- default_area_id
- default_project_id
- default_goal_id
- archived_at
- created_at
- updated_at

tasks
- generated_from_template_id nullable
- instance_date nullable
```

Idempotenz braucht einen eindeutigen aktiven Key, etwa:

```text
user_id + generated_from_template_id + instance_date
```

Der genaue SQL-Entwurf ist nicht in R1.7.5 freigegeben.

## 12. Nicht-Ziele

- Keine Migration.
- Keine RLS-/Policy-Aenderung.
- Keine Remote-DB-Aktion.
- Keine Service Role.
- Keine Recurrence Engine.
- Keine Background Jobs.
- Keine Cron Jobs.
- Keine automatische Task-Erzeugung.
- Keine Habit-System-Umarbeitung.
- Keine Calendar-Recomposition.
- Keine Dashboard-Neugestaltung.
- Keine neue Library.
- Keine AI Routine Suggestions.

## 13. Akzeptanzkriterien

- Task, Recurring Task, Routine und Habit sind getrennt.
- Option B ist als Zielmodell gelockt.
- `plannedDate`, `scheduledStartAt` und `durationMinutes` bleiben Instanzfelder.
- Daily Core, Calendar, Dashboard und Review zeigen konkrete Instanzen, keine Templates.
- Skipped, missed und snoozed sind instanzbezogen oder abgeleitet beschrieben.
- Migration ist als Gate dokumentiert, aber nicht gebaut.
- Spaetere Implementierungsbloecke sind in sichere, reviewbare Schritte zerlegt.

## Audit R1.7.5

### Task Schema Ist

Bestehende Task-Felder:

- `status`
- `priority`
- `energy`
- `areaId`
- `projectId`
- `goalId`
- `sourceInboxItemId`
- `plannedDate`
- `scheduledStartAt`
- `durationMinutes`
- `dueAt`
- `completedAt`
- `carriedFromDailyLogId`
- `archivedAt`

Es gibt keine Recurrence-Felder, keine Template-ID, keine Instance-Date-Spalte und keine Routine-Zuordnung auf Tasks.

### Scheduling Actions Ist

Bestehende Actions:

- `scheduleTaskForTodayAction`
- `rescheduleTaskAction`
- `unscheduleTaskAction`
- `completeTaskAction`
- `reopenTaskAction`
- `archiveTaskAction`
- `createPortfolioTaskAction`

Scheduling schreibt bestehende Task-Felder und revalidiert Portfolio, Today, Dashboard und Calendar. Es gibt keine Generation Action und keine Serienlogik.

### Habit/Routine Ist

Habits existieren als Health/Habits ViewModels und Mock-/Manual-Projektion. Sie sind aktuell keine Supabase-Tabelle im Core-Schema und kein Task-Generator.

Routine-Begriffe erscheinen in Dashboard-/Health-Copy und Habit-Analytics, aber es gibt keine kanonische Routine-Entity, kein Repository und keine Routine Items.

### Daily Core Projection

Today zeigt Tasks mit heutigem Datum als Activity Events. Offene Tasks ohne Datum, aber mit Planning Signals, erscheinen als Today Planner Candidates. Carry Forward referenziert offene heutige Tasks und dupliziert sie nicht.

Dashboard Today Agenda zeigt konkrete Tasks aus der Manual-/Supabase-Task-Projektion. Dashboard ist kein Template- oder Routine-Manager.

### Calendar Semantik

Calendar baut Time Blocks nur aus Tasks mit Datum und Startzeit. Tasks mit Datum ohne Startzeit bleiben in der Planner Queue. R1.7.4 Scheduling Controls veraendern konkrete Task-Instanzen ueber bestehende Actions.

### Gaps

- Keine Template-Entity.
- Keine `generated_from_template_id`.
- Keine `instance_date`.
- Keine Idempotenzregel fuer Generation.
- Keine Generation Use Case.
- Keine Routine-Entity.
- Keine Routine Items.
- Keine serverseitige Recurrence-Auswertung.
- Keine Habit-to-Task-Regel.

## Generation Semantik

MVP-Generation ist user-triggered oder wird beim Oeffnen von Today/Calendar serverseitig geprueft. Es gibt keine Background Jobs und keine Cron Jobs im MVP.

Idempotenz wird ueber Template + Instance Date garantiert. Ein Template darf fuer ein Datum nur eine aktive Instanz erzeugen.

Template-Aenderungen gelten nur fuer zukuenftige Instanzen. Bereits erzeugte Instanzen bleiben echte Tasks und behalten ihre Historie.

Timezone-Regel: Generation arbeitet mit der Template-Timezone oder spaeter der Profil-Timezone. `instance_date` ist user-lokal. `scheduledStartAt` bleibt ein konkreter Timestamp, gerendert in User-/Profil-Timezone.

Wenn eine geplante Instanz nicht erledigt wird, wird Missed zunaechst abgeleitet. Skipped ist explizit. Snooze verschiebt die Instanz.

## Needed Future Types

Keine Source-Types in R1.7.5.

Spaeter sinnvoll:

- `RecurringTaskTemplate`
- `GeneratedTaskInstance`
- `Routine`
- `RoutineItem`
- `TaskGenerationResult`
- `TaskGenerationConflict`

## Implementation Plan

### R1.7.5B - Recurring Task Schema Lock/Migration

Ziel: Tabellen- und Spaltenentwurf fuer Templates und Instanzreferenz bauen.

Gates: RLS, `user_id`, Zod, Repository Interface, keine Service Role, keine Remote DB, Migration Review.

### R1.7.5C - Recurring Template Repository + Actions

Ziel: Templates erstellen, bearbeiten, archivieren.

Gates: Server Actions, Zod, User Scope, RLS, keine Generator-UI ohne echte Persistenz.

### R1.7.5D - Instance Generation Use Case

Ziel: Idempotente Instanzgenerierung fuer ein Datum oder einen Datumsbereich.

Gates: Template + Instance Date Idempotenz, keine Background Jobs, klare Fehler-/Duplicate-Semantik.

### R1.7.5E - Today/Calendar Integration

Ziel: Generated instances erscheinen in Today Planner, Today Activity Stream und Calendar Planner/Grid wie normale Tasks.

Gates: keine Template-Anzeige im Daily Core, keine Calendar-Recomposition, keine Dashboard-Routine-Matrix.

### R1.7.5F - QA Browser Proof

Ziel: Browserbeweis fuer Template Create, Generation, Reload-Stabilitaet, Completion, Skip/Snooze und Calendar/Today/Dashboard-Projektion.

Gates: E2E, Auth/RLS, keine Service Role, keine Remote DB.
