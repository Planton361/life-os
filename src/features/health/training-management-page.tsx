import {
  addRunningPlanItemAction,
  addStrengthPlanItemAction,
  addStrengthSetAction,
  archiveTrainingAction,
  completeStrengthSessionAction,
  saveExerciseAction,
  saveRunningPlanAction,
  saveRunningSessionAction,
  saveStrengthPlanAction,
  startStrengthSessionAction,
} from "@/features/real-data/actions/training.actions";
import { scheduleSourceFormAction } from "@/features/real-data/actions/schedule-source.actions";
import {
  formatPace,
  muscleGroups,
  muscleLoad,
  orderedPlanItems,
  runningTotals,
  strengthVolume,
  type TrainingSnapshot,
} from "@/features/real-data";

type Link = { source_id: string; source_type: string; task_id: string };
const card =
  "rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-panel)] p-4";
const input =
  "min-h-10 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-input)] px-3 text-sm text-[var(--text-primary)]";
const button =
  "min-h-10 rounded-xl border border-[var(--border-subtle)] bg-[var(--accent-red)] px-4 text-sm font-semibold text-white disabled:opacity-50";
const quietButton =
  "min-h-9 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-xs font-semibold text-[var(--text-secondary)]";
const label = "grid gap-1 text-xs font-semibold text-[var(--text-secondary)]";

function localDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
function localTime(iso: string | null) {
  return iso
    ? new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZone: "Europe/Berlin",
      }).format(new Date(iso))
    : "";
}
function Feedback({ state }: { state?: string }) {
  if (!state) return null;
  return (
    <p
      className="rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-sm"
      role="status"
    >
      {state === "saved"
        ? "Training data saved."
        : state === "blocked"
          ? "Manual authentication is required."
          : "Training data could not be saved."}
    </p>
  );
}
function Empty({ children }: { children: string }) {
  return <p className="text-sm text-[var(--text-muted)]">{children}</p>;
}
function ScheduleForm({
  id,
  type,
  duration,
}: {
  id: string;
  type: "running_plan_item" | "strength_plan";
  duration: number;
}) {
  return (
    <form
      action={scheduleSourceFormAction}
      className="grid gap-2 sm:grid-cols-4"
      data-testid={`schedule-${type}-${id}`}
    >
      <input name="sourceId" type="hidden" value={id} />
      <input name="sourceType" type="hidden" value={type} />
      <label className={label}>
        Date
        <input
          className={input}
          defaultValue={localDate()}
          name="plannedDate"
          type="date"
        />
      </label>
      <label className={label}>
        Time
        <input
          className={input}
          defaultValue="18:00"
          name="scheduledTime"
          type="time"
        />
      </label>
      <label className={label}>
        Duration
        <input
          className={input}
          defaultValue={duration}
          min="1"
          name="durationMinutes"
          type="number"
        />
      </label>
      <button className={`${button} self-end`} type="submit">
        Schedule / reschedule
      </button>
    </form>
  );
}

export function RunningManagementPage({
  snapshot,
  links,
  feedback,
  mode,
}: {
  snapshot: TrainingSnapshot;
  links: readonly Link[];
  feedback?: string;
  mode: "manual" | "empty" | "auth-blocked";
}) {
  const activePlans = snapshot.runningPlans.filter((plan) => !plan.archivedAt);
  const sessions = snapshot.runningSessions.filter(
    (session) => !session.archivedAt,
  );
  const completed = sessions.filter(
    (session) => session.status === "completed",
  );
  const latest = completed[0];
  const totals = runningTotals(completed);
  const today = localDate();
  const todayTotals = runningTotals(
    completed.filter((session) => session.sessionDate === today),
  );
  const todayTimestamp = new Date(`${today}T12:00:00`).getTime();
  const last7 = completed.filter(
    (session) =>
      todayTimestamp - new Date(`${session.sessionDate}T12:00:00`).getTime() <=
      7 * 86400000,
  );
  const last30 = completed.filter(
    (session) =>
      todayTimestamp - new Date(`${session.sessionDate}T12:00:00`).getTime() <=
      30 * 86400000,
  );
  return (
    <main
      className="mx-auto grid w-full max-w-[2208px] gap-3 pb-6"
      data-h2-running="page"
    >
      <header className={card}>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--accent-red)]">
          Health · Running
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Running Tracker</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Manual runs, executable plan units and log-derived pace. Pace is never
          stored as a second truth.
        </p>
      </header>
      <Feedback state={feedback} />
      {mode !== "manual" ? (
        <section className={card}>
          <h2 className="font-semibold">
            {mode === "auth-blocked"
              ? "Authentication required"
              : "No manual source"}
          </h2>
          <Empty>
            Writes remain unavailable until Manual mode has a valid local
            session.
          </Empty>
        </section>
      ) : (
        <>
          <section className="grid gap-3 lg:grid-cols-4">
            <article className={card}>
              <p className="text-xs text-[var(--text-muted)]">Latest run</p>
              <p className="mt-2 text-xl font-semibold">
                {latest ? `${latest.distanceKm} km` : "No run yet"}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                {latest
                  ? `${latest.durationMinutes} min · ${formatPace(latest.distanceKm, latest.durationMinutes)}`
                  : "Add a manual session below."}
              </p>
            </article>
            <article className={card}>
              <p className="text-xs text-[var(--text-muted)]">Today</p>
              <p className="mt-2 text-xl font-semibold">
                {todayTotals.distanceKm.toFixed(1)} km
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                {todayTotals.sessionCount} session(s) ·{" "}
                {todayTotals.durationMinutes} min
              </p>
            </article>
            <article className={card}>
              <p className="text-xs text-[var(--text-muted)]">7 days</p>
              <p className="mt-2 text-xl font-semibold">
                {runningTotals(last7).distanceKm.toFixed(1)} km
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                {runningTotals(last7).sessionCount} weekly session(s)
              </p>
            </article>
            <article className={card}>
              <p className="text-xs text-[var(--text-muted)]">30 days</p>
              <p className="mt-2 text-xl font-semibold">
                {runningTotals(last30).distanceKm.toFixed(1)} km
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                Lifetime {totals.sessionCount} sessions ·{" "}
                {totals.distanceKm.toFixed(1)} km
              </p>
            </article>
          </section>
          <section className={card} data-testid="running-session-form">
            <h2 className="text-lg font-semibold">Log a run</h2>
            <form
              action={saveRunningSessionAction}
              className="mt-3 grid gap-3 md:grid-cols-3"
            >
              <input name="planItemId" type="hidden" value="" />
              <label className={label}>
                Date
                <input
                  className={input}
                  defaultValue={today}
                  name="sessionDate"
                  required
                  type="date"
                />
              </label>
              <label className={label}>
                Optional start time
                <input className={input} name="startTime" type="time" />
              </label>
              <label className={label}>
                Distance (km)
                <input
                  className={input}
                  min="0.001"
                  name="distanceKm"
                  required
                  step="0.001"
                  type="number"
                />
              </label>
              <label className={label}>
                Duration (minutes)
                <input
                  className={input}
                  min="1"
                  name="durationMinutes"
                  required
                  type="number"
                />
              </label>
              <label className={label}>
                Optional average heart rate
                <input
                  className={input}
                  min="30"
                  max="240"
                  name="averageHeartRate"
                  type="number"
                />
              </label>
              <label className={label}>
                Optional notes
                <input className={input} maxLength={2000} name="notes" />
              </label>
              <button className={button} type="submit">
                Save completed run
              </button>
            </form>
          </section>
          <section className={card}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Running plans</h2>
              <span className="text-xs text-[var(--text-muted)]">
                Plan → Calendar/Routine → Session
              </span>
            </div>
            <form
              action={saveRunningPlanAction}
              className="mt-3 grid gap-3 md:grid-cols-[1fr_2fr_auto]"
            >
              <label className={label}>
                Plan name
                <input className={input} name="name" required />
              </label>
              <label className={label}>
                Goal
                <input className={input} name="goal" required />
              </label>
              <button className={`${button} self-end`} type="submit">
                Create plan
              </button>
            </form>
            <div className="mt-4 grid gap-3">
              {activePlans.length === 0 ? (
                <Empty>No running plan yet.</Empty>
              ) : (
                activePlans.map((plan) => {
                  const items = orderedPlanItems(
                    snapshot.runningPlanItems.filter(
                      (item) => item.planId === plan.id && !item.archivedAt,
                    ),
                  );
                  return (
                    <article
                      className="rounded-xl border border-[var(--border-subtle)] p-3"
                      data-testid={`running-plan-${plan.id}`}
                      key={plan.id}
                    >
                      <form
                        action={saveRunningPlanAction}
                        className="grid gap-2 md:grid-cols-[1fr_2fr_auto]"
                      >
                        <input name="planId" type="hidden" value={plan.id} />
                        <label className={label}>
                          Name
                          <input
                            className={input}
                            defaultValue={plan.name}
                            name="name"
                            required
                          />
                        </label>
                        <label className={label}>
                          Goal
                          <input
                            className={input}
                            defaultValue={plan.goal}
                            name="goal"
                            required
                          />
                        </label>
                        <button
                          className={`${quietButton} self-end`}
                          type="submit"
                        >
                          Save plan
                        </button>
                      </form>
                      <form action={archiveTrainingAction} className="mt-2">
                        <input name="id" type="hidden" value={plan.id} />
                        <input
                          name="table"
                          type="hidden"
                          value="running_plans"
                        />
                        <input
                          name="returnTo"
                          type="hidden"
                          value="/health/running"
                        />
                        <button className={quietButton}>Archive plan</button>
                      </form>
                      <div className="mt-3 grid gap-2">
                        {items.map((item) => (
                          <div
                            className="rounded-xl bg-[var(--surface-input)] p-3"
                            key={item.id}
                          >
                            <p className="font-semibold">
                              {item.sortOrder}. {item.title}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)]">
                              {item.plannedDistanceKm
                                ? `${item.plannedDistanceKm} km`
                                : "Distance open"}{" "}
                              ·{" "}
                              {item.plannedDurationMinutes
                                ? `${item.plannedDurationMinutes} min`
                                : "Duration open"}{" "}
                              ·{" "}
                              {links.some(
                                (link) =>
                                  link.source_type === "running_plan_item" &&
                                  link.source_id === item.id,
                              )
                                ? "Scheduled task linked"
                                : "Not scheduled"}
                            </p>
                            <details className="mt-2">
                              <summary className="cursor-pointer text-xs font-semibold">
                                Edit planned unit
                              </summary>
                              <form
                                action={addRunningPlanItemAction}
                                className="mt-2 grid gap-2 md:grid-cols-4"
                              >
                                <input
                                  name="itemId"
                                  type="hidden"
                                  value={item.id}
                                />
                                <input
                                  name="planId"
                                  type="hidden"
                                  value={plan.id}
                                />
                                <label className={label}>
                                  Title
                                  <input
                                    className={input}
                                    defaultValue={item.title}
                                    name="title"
                                    required
                                  />
                                </label>
                                <label className={label}>
                                  Distance km
                                  <input
                                    className={input}
                                    defaultValue={item.plannedDistanceKm ?? ""}
                                    name="plannedDistanceKm"
                                    step="0.001"
                                    type="number"
                                  />
                                </label>
                                <label className={label}>
                                  Duration min
                                  <input
                                    className={input}
                                    defaultValue={
                                      item.plannedDurationMinutes ?? ""
                                    }
                                    name="plannedDurationMinutes"
                                    type="number"
                                  />
                                </label>
                                <label className={label}>
                                  Order
                                  <input
                                    className={input}
                                    defaultValue={item.sortOrder}
                                    name="sortOrder"
                                    type="number"
                                  />
                                </label>
                                <button className={quietButton}>
                                  Save planned unit
                                </button>
                              </form>
                            </details>
                            <ScheduleForm
                              duration={item.plannedDurationMinutes ?? 30}
                              id={item.id}
                              type="running_plan_item"
                            />
                            <details className="mt-2">
                              <summary className="cursor-pointer text-xs font-semibold">
                                Complete this planned run
                              </summary>
                              <form
                                action={saveRunningSessionAction}
                                className="mt-2 grid gap-2 md:grid-cols-3"
                              >
                                <input
                                  name="planItemId"
                                  type="hidden"
                                  value={item.id}
                                />
                                <label className={label}>
                                  Date
                                  <input
                                    className={input}
                                    defaultValue={today}
                                    name="sessionDate"
                                    type="date"
                                  />
                                </label>
                                <label className={label}>
                                  Start
                                  <input
                                    className={input}
                                    name="startTime"
                                    type="time"
                                  />
                                </label>
                                <label className={label}>
                                  Distance km
                                  <input
                                    className={input}
                                    defaultValue={item.plannedDistanceKm ?? ""}
                                    min="0.001"
                                    name="distanceKm"
                                    required
                                    step="0.001"
                                    type="number"
                                  />
                                </label>
                                <label className={label}>
                                  Duration min
                                  <input
                                    className={input}
                                    defaultValue={
                                      item.plannedDurationMinutes ?? ""
                                    }
                                    min="1"
                                    name="durationMinutes"
                                    required
                                    type="number"
                                  />
                                </label>
                                <label className={label}>
                                  Heart rate
                                  <input
                                    className={input}
                                    name="averageHeartRate"
                                    type="number"
                                  />
                                </label>
                                <label className={label}>
                                  Notes
                                  <input className={input} name="notes" />
                                </label>
                                <button className={button}>
                                  Complete run + task
                                </button>
                              </form>
                            </details>
                          </div>
                        ))}
                        <details>
                          <summary className="cursor-pointer text-sm font-semibold">
                            Add planned unit
                          </summary>
                          <form
                            action={addRunningPlanItemAction}
                            className="mt-2 grid gap-2 md:grid-cols-5"
                          >
                            <input
                              name="planId"
                              type="hidden"
                              value={plan.id}
                            />
                            <label className={label}>
                              Title
                              <input className={input} name="title" required />
                            </label>
                            <label className={label}>
                              Distance km
                              <input
                                className={input}
                                min="0.001"
                                name="plannedDistanceKm"
                                step="0.001"
                                type="number"
                              />
                            </label>
                            <label className={label}>
                              Duration min
                              <input
                                className={input}
                                min="1"
                                name="plannedDurationMinutes"
                                type="number"
                              />
                            </label>
                            <label className={label}>
                              Order
                              <input
                                className={input}
                                defaultValue={items.length + 1}
                                min="0"
                                name="sortOrder"
                                type="number"
                              />
                            </label>
                            <button className={`${quietButton} self-end`}>
                              Add unit
                            </button>
                          </form>
                        </details>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
          <section className={card}>
            <h2 className="text-lg font-semibold">Running history</h2>
            <p className="text-xs text-[var(--text-muted)]">
              Daily entries with week/month signals from real completed
              sessions.
            </p>
            <div className="mt-3 grid gap-2">
              {completed.length === 0 ? (
                <Empty>No completed runs.</Empty>
              ) : (
                completed.map((run) => (
                  <article
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] p-3"
                    key={run.id}
                  >
                    <div>
                      <p className="font-semibold">
                        {run.sessionDate} · {run.distanceKm} km
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {run.durationMinutes} min ·{" "}
                        {formatPace(run.distanceKm, run.durationMinutes)}
                        {run.averageHeartRate
                          ? ` · ${run.averageHeartRate} bpm`
                          : ""}
                      </p>
                      {run.notes ? (
                        <p className="text-xs text-[var(--text-muted)]">
                          {run.notes}
                        </p>
                      ) : null}
                    </div>
                    <details>
                      <summary className="cursor-pointer text-xs font-semibold">
                        Edit / archive
                      </summary>
                      <form
                        action={saveRunningSessionAction}
                        className="mt-2 grid gap-2"
                      >
                        <input name="sessionId" type="hidden" value={run.id} />
                        <input
                          name="planItemId"
                          type="hidden"
                          value={run.planItemId ?? ""}
                        />
                        <label className={label}>
                          Date
                          <input
                            className={input}
                            defaultValue={run.sessionDate}
                            name="sessionDate"
                            type="date"
                          />
                        </label>
                        <label className={label}>
                          Distance km
                          <input
                            className={input}
                            defaultValue={run.distanceKm}
                            name="distanceKm"
                            step="0.001"
                            type="number"
                          />
                        </label>
                        <label className={label}>
                          Duration minutes
                          <input
                            className={input}
                            defaultValue={run.durationMinutes}
                            name="durationMinutes"
                            type="number"
                          />
                        </label>
                        <label className={label}>
                          Optional start time
                          <input
                            className={input}
                            defaultValue={localTime(run.startedAt)}
                            name="startTime"
                            type="time"
                          />
                        </label>
                        <label className={label}>
                          Optional average heart rate
                          <input
                            className={input}
                            defaultValue={run.averageHeartRate ?? ""}
                            max="240"
                            min="30"
                            name="averageHeartRate"
                            type="number"
                          />
                        </label>
                        <label className={label}>
                          Optional notes
                          <input
                            className={input}
                            defaultValue={run.notes ?? ""}
                            maxLength={2000}
                            name="notes"
                          />
                        </label>
                        <button className={quietButton}>Save edits</button>
                      </form>
                      <form action={archiveTrainingAction}>
                        <input name="id" type="hidden" value={run.id} />
                        <input
                          name="table"
                          type="hidden"
                          value="running_sessions"
                        />
                        <input
                          name="returnTo"
                          type="hidden"
                          value="/health/running"
                        />
                        <button className={quietButton}>Archive</button>
                      </form>
                    </details>
                  </article>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

export function StrengthManagementPage({
  snapshot,
  links,
  feedback,
  mode,
}: {
  snapshot: TrainingSnapshot;
  links: readonly Link[];
  feedback?: string;
  mode: "manual" | "empty" | "auth-blocked";
}) {
  const exercises = snapshot.exercises.filter(
    (exercise) => !exercise.archivedAt,
  );
  const plans = snapshot.strengthPlans.filter((plan) => !plan.archivedAt);
  const sessions = snapshot.strengthSessions.filter(
    (session) => !session.archivedAt,
  );
  const exerciseById = new Map(
    snapshot.exercises.map((exercise) => [exercise.id, exercise]),
  );
  const strengthPlanById = new Map(
    snapshot.strengthPlans.map((plan) => [plan.id, plan]),
  );
  const allVolume = strengthVolume(snapshot.strengthSetLogs);
  const loads = muscleLoad(snapshot.strengthSetLogs, snapshot.exercises);
  const today = localDate();
  return (
    <main
      className="mx-auto grid w-full max-w-[2208px] gap-3 pb-6"
      data-h2-strength="page"
    >
      <header className={card}>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--accent-red)]">
          Health · Strength
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Strength Tracker</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Exercise library, executable plans, real set logs and explicitly
          mapped muscle load.
        </p>
      </header>
      <Feedback state={feedback} />
      {mode !== "manual" ? (
        <section className={card}>
          <h2 className="font-semibold">
            {mode === "auth-blocked"
              ? "Authentication required"
              : "No manual source"}
          </h2>
          <Empty>
            Writes remain unavailable until Manual mode has a valid local
            session.
          </Empty>
        </section>
      ) : (
        <>
          <section className="grid gap-3 lg:grid-cols-3">
            <article className={card}>
              <p className="text-xs text-[var(--text-muted)]">
                Completed sessions
              </p>
              <p className="mt-2 text-xl font-semibold">
                {
                  sessions.filter((session) => session.status === "completed")
                    .length
                }
              </p>
            </article>
            <article className={card}>
              <p className="text-xs text-[var(--text-muted)]">
                Weighted volume
              </p>
              <p className="mt-2 text-xl font-semibold">
                {allVolume.weightedSetCount
                  ? `${allVolume.weightedVolumeKg.toFixed(1)} kg`
                  : "No weighted sets"}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {allVolume.unweightedRepetitions
                  ? `${allVolume.unweightedRepetitions} unweighted reps tracked separately`
                  : "No unweighted reps"}
              </p>
            </article>
            <article className={card}>
              <p className="text-xs text-[var(--text-muted)]">
                Muscle load source
              </p>
              <p className="mt-2 text-xl font-semibold">
                {loads.length ? "Completed set logs" : "No mapped load"}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {loads
                  .slice(0, 3)
                  .map(([muscle, load]) => `${muscle}: ${load.sets} sets`)
                  .join(" · ") || "Map exercises to muscles first."}
              </p>
            </article>
          </section>
          <section className={card}>
            <h2 className="text-lg font-semibold">Exercise library</h2>
            <form
              action={saveExerciseAction}
              className="mt-3 grid gap-3 md:grid-cols-3"
            >
              <label className={label}>
                Name
                <input className={input} name="name" required />
              </label>
              <label className={label}>
                Equipment
                <input className={input} name="equipment" />
              </label>
              <label className={label}>
                Description
                <input className={input} name="description" />
              </label>
              <fieldset className="md:col-span-3">
                <legend className="text-xs font-semibold text-[var(--text-secondary)]">
                  Muscle groups
                </legend>
                <div className="mt-2 flex flex-wrap gap-3">
                  {muscleGroups.map((muscle) => (
                    <label
                      className="flex items-center gap-1 text-xs"
                      key={muscle}
                    >
                      <input name="muscles" type="checkbox" value={muscle} />
                      {muscle}
                    </label>
                  ))}
                </div>
              </fieldset>
              <button className={button}>Create exercise</button>
            </form>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {exercises.length === 0 ? (
                <Empty>No exercises yet.</Empty>
              ) : (
                exercises.map((exercise) => (
                  <article
                    className="rounded-xl border border-[var(--border-subtle)] p-3"
                    key={exercise.id}
                  >
                    <p className="font-semibold">{exercise.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {exercise.equipment || "No equipment"} ·{" "}
                      {exercise.muscles.join(", ")}
                    </p>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-semibold">
                        Edit / archive
                      </summary>
                      <form
                        action={saveExerciseAction}
                        className="mt-2 grid gap-2"
                      >
                        <input
                          name="exerciseId"
                          type="hidden"
                          value={exercise.id}
                        />
                        <label className={label}>
                          Name
                          <input
                            className={input}
                            defaultValue={exercise.name}
                            name="name"
                          />
                        </label>
                        <label className={label}>
                          Equipment
                          <input
                            className={input}
                            defaultValue={exercise.equipment ?? ""}
                            name="equipment"
                          />
                        </label>
                        <label className={label}>
                          Description
                          <input
                            className={input}
                            defaultValue={exercise.description ?? ""}
                            name="description"
                          />
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {muscleGroups.map((muscle) => (
                            <label className="text-xs" key={muscle}>
                              <input
                                defaultChecked={exercise.muscles.includes(
                                  muscle,
                                )}
                                name="muscles"
                                type="checkbox"
                                value={muscle}
                              />{" "}
                              {muscle}
                            </label>
                          ))}
                        </div>
                        <button className={quietButton}>Save exercise</button>
                      </form>
                      <form action={archiveTrainingAction}>
                        <input name="id" type="hidden" value={exercise.id} />
                        <input name="table" type="hidden" value="exercises" />
                        <input
                          name="returnTo"
                          type="hidden"
                          value="/health/strength"
                        />
                        <button className={quietButton}>
                          Archive exercise
                        </button>
                      </form>
                    </details>
                  </article>
                ))
              )}
            </div>
          </section>
          <section className={card}>
            <h2 className="text-lg font-semibold">Strength plans</h2>
            <form
              action={saveStrengthPlanAction}
              className="mt-3 grid gap-3 md:grid-cols-[1fr_2fr_auto]"
            >
              <label className={label}>
                Plan name
                <input className={input} name="name" required />
              </label>
              <label className={label}>
                Goal
                <input className={input} name="goal" required />
              </label>
              <button className={`${button} self-end`}>Create plan</button>
            </form>
            <div className="mt-4 grid gap-3">
              {plans.length === 0 ? (
                <Empty>No strength plan yet.</Empty>
              ) : (
                plans.map((plan) => {
                  const items = orderedPlanItems(
                    snapshot.strengthPlanItems.filter(
                      (item) => item.planId === plan.id,
                    ),
                  );
                  return (
                    <article
                      className="rounded-xl border border-[var(--border-subtle)] p-3"
                      data-testid={`strength-plan-${plan.id}`}
                      key={plan.id}
                    >
                      <form
                        action={saveStrengthPlanAction}
                        className="grid gap-2 md:grid-cols-[1fr_2fr_auto]"
                      >
                        <input name="planId" type="hidden" value={plan.id} />
                        <label className={label}>
                          Name
                          <input
                            className={input}
                            defaultValue={plan.name}
                            name="name"
                          />
                        </label>
                        <label className={label}>
                          Goal
                          <input
                            className={input}
                            defaultValue={plan.goal}
                            name="goal"
                          />
                        </label>
                        <button className={quietButton}>Save plan</button>
                      </form>
                      <p className="mt-2 text-xs text-[var(--text-secondary)]">
                        {links.some(
                          (link) =>
                            link.source_type === "strength_plan" &&
                            link.source_id === plan.id,
                        )
                          ? "Scheduled task linked"
                          : "Not scheduled"}
                      </p>
                      <div className="mt-2 grid gap-1">
                        {items.map((item) => (
                          <details key={item.id}>
                            <summary className="cursor-pointer text-sm">
                              {item.sortOrder}.{" "}
                              {exerciseById.get(item.exerciseId)?.name ??
                                "Archived exercise"}{" "}
                              · {item.targetSets} × {item.targetReps}
                              {item.targetWeightKg
                                ? ` @ ${item.targetWeightKg} kg`
                                : " · unweighted/bodyweight"}
                            </summary>
                            <form
                              action={addStrengthPlanItemAction}
                              className="mt-2 grid gap-2 md:grid-cols-5"
                            >
                              <input
                                name="itemId"
                                type="hidden"
                                value={item.id}
                              />
                              <input
                                name="planId"
                                type="hidden"
                                value={plan.id}
                              />
                              <label className={label}>
                                Exercise
                                <select
                                  className={input}
                                  defaultValue={item.exerciseId}
                                  name="exerciseId"
                                >
                                  {exercises.map((exercise) => (
                                    <option
                                      key={exercise.id}
                                      value={exercise.id}
                                    >
                                      {exercise.name}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className={label}>
                                Order
                                <input
                                  className={input}
                                  defaultValue={item.sortOrder}
                                  name="sortOrder"
                                  type="number"
                                />
                              </label>
                              <label className={label}>
                                Sets
                                <input
                                  className={input}
                                  defaultValue={item.targetSets}
                                  name="targetSets"
                                  type="number"
                                />
                              </label>
                              <label className={label}>
                                Reps
                                <input
                                  className={input}
                                  defaultValue={item.targetReps}
                                  name="targetReps"
                                  type="number"
                                />
                              </label>
                              <label className={label}>
                                Weight kg
                                <input
                                  className={input}
                                  defaultValue={item.targetWeightKg ?? ""}
                                  name="targetWeightKg"
                                  step="0.001"
                                  type="number"
                                />
                              </label>
                              <button className={quietButton}>
                                Save plan exercise
                              </button>
                            </form>
                          </details>
                        ))}
                      </div>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-semibold">
                          Add plan exercise
                        </summary>
                        <form
                          action={addStrengthPlanItemAction}
                          className="mt-2 grid gap-2 md:grid-cols-5"
                        >
                          <input name="planId" type="hidden" value={plan.id} />
                          <label className={label}>
                            Exercise
                            <select className={input} name="exerciseId">
                              {exercises.map((exercise) => (
                                <option key={exercise.id} value={exercise.id}>
                                  {exercise.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className={label}>
                            Order
                            <input
                              className={input}
                              defaultValue={items.length + 1}
                              name="sortOrder"
                              type="number"
                            />
                          </label>
                          <label className={label}>
                            Sets
                            <input
                              className={input}
                              defaultValue="3"
                              name="targetSets"
                              type="number"
                            />
                          </label>
                          <label className={label}>
                            Reps
                            <input
                              className={input}
                              defaultValue="8"
                              name="targetReps"
                              type="number"
                            />
                          </label>
                          <label className={label}>
                            Weight kg
                            <input
                              className={input}
                              name="targetWeightKg"
                              step="0.001"
                              type="number"
                            />
                          </label>
                          <button className={quietButton}>Add exercise</button>
                        </form>
                      </details>
                      <div className="mt-3">
                        <ScheduleForm
                          duration={60}
                          id={plan.id}
                          type="strength_plan"
                        />
                      </div>
                      <form
                        action={startStrengthSessionAction}
                        className="mt-2 flex flex-wrap gap-2"
                      >
                        <input name="planId" type="hidden" value={plan.id} />
                        <input name="notes" type="hidden" value="" />
                        <label className={label}>
                          Session date
                          <input
                            className={input}
                            defaultValue={today}
                            name="sessionDate"
                            type="date"
                          />
                        </label>
                        <button className={`${button} self-end`}>
                          Start session
                        </button>
                      </form>
                      <form action={archiveTrainingAction} className="mt-2">
                        <input name="id" type="hidden" value={plan.id} />
                        <input
                          name="table"
                          type="hidden"
                          value="strength_plans"
                        />
                        <input
                          name="returnTo"
                          type="hidden"
                          value="/health/strength"
                        />
                        <button className={quietButton}>Archive plan</button>
                      </form>
                    </article>
                  );
                })
              )}
            </div>
          </section>
          <section className={card}>
            <h2 className="text-lg font-semibold">Sessions and set log</h2>
            <div className="mt-3 grid gap-3">
              {sessions.length === 0 ? (
                <Empty>No strength sessions.</Empty>
              ) : (
                sessions.map((session) => {
                  const logs = snapshot.strengthSetLogs.filter(
                    (log) => log.sessionId === session.id,
                  );
                  const volume = strengthVolume(logs);
                  const planExercises = snapshot.strengthPlanItems.filter(
                    (item) => item.planId === session.planId,
                  );
                  return (
                    <article
                      className="rounded-xl border border-[var(--border-subtle)] p-3"
                      data-testid={`strength-session-${session.id}`}
                      key={session.id}
                    >
                      <div className="flex flex-wrap justify-between gap-2">
                        <div>
                          <p className="font-semibold">
                            {session.sessionDate} ·{" "}
                            {strengthPlanById.get(session.planId ?? "")?.name ??
                              "Manual session"}{" "}
                            · {session.status}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)]">
                            {volume.weightedSetCount
                              ? `${volume.weightedVolumeKg.toFixed(1)} kg weighted volume`
                              : "No weighted volume"}
                            {volume.unweightedRepetitions
                              ? ` · ${volume.unweightedRepetitions} unweighted reps`
                              : ""}
                          </p>
                        </div>
                        {session.status === "in_progress" ? (
                          <form action={completeStrengthSessionAction}>
                            <input name="id" type="hidden" value={session.id} />
                            <button className={button}>
                              Complete session + task
                            </button>
                          </form>
                        ) : null}
                      </div>
                      <div className="mt-2 grid gap-1">
                        {logs.map((log) => (
                          <p className="text-xs" key={log.id}>
                            Set {log.setOrder}:{" "}
                            {exerciseById.get(log.exerciseId)?.name ??
                              "Archived exercise"}{" "}
                            · {log.repetitions} reps
                            {log.weightKg
                              ? ` × ${log.weightKg} kg`
                              : " · unweighted"}
                          </p>
                        ))}
                      </div>
                      {session.status === "in_progress" ? (
                        <form
                          action={addStrengthSetAction}
                          className="mt-3 grid gap-2 md:grid-cols-5"
                        >
                          <input
                            name="sessionId"
                            type="hidden"
                            value={session.id}
                          />
                          <label className={label}>
                            Exercise
                            <select className={input} name="exerciseId">
                              {planExercises.map((item) => (
                                <option key={item.id} value={item.exerciseId}>
                                  {exerciseById.get(item.exerciseId)?.name ??
                                    "Archived exercise"}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className={label}>
                            Set order
                            <input
                              className={input}
                              defaultValue={logs.length + 1}
                              name="setOrder"
                              type="number"
                            />
                          </label>
                          <label className={label}>
                            Repetitions
                            <input
                              className={input}
                              name="repetitions"
                              type="number"
                            />
                          </label>
                          <label className={label}>
                            Weight kg (optional)
                            <input
                              className={input}
                              name="weightKg"
                              step="0.001"
                              type="number"
                            />
                          </label>
                          <label className={label}>
                            Notes
                            <input className={input} name="notes" />
                          </label>
                          <button className={quietButton}>Log set</button>
                        </form>
                      ) : null}
                    </article>
                  );
                })
              )}
            </div>
          </section>
          <section className={card}>
            <h2 className="text-lg font-semibold">Muscle map</h2>
            <p className="text-xs text-[var(--text-muted)]">
              Source: completed and in-progress real set logs through explicit
              exercise mappings. Intensity is text-supported by set count.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {loads.length === 0 ? (
                <Empty>No muscle load yet.</Empty>
              ) : (
                loads.map(([muscle, load]) => (
                  <article
                    className="rounded-xl border border-[var(--border-subtle)] p-3"
                    key={muscle}
                  >
                    <p className="font-semibold">{muscle}</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Intensity: {load.sets} set(s)
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {load.weightedVolumeKg
                        ? `${load.weightedVolumeKg.toFixed(1)} kg weighted`
                        : "No weighted volume"}
                      {load.unweightedRepetitions
                        ? ` · ${load.unweightedRepetitions} unweighted reps`
                        : ""}
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
