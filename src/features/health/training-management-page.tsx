import { HealthFeedback } from "./components/health-feedback";
import {
  HealthHeader,
  healthPage,
  healthCard,
  healthInput,
  healthPrimary,
  healthButton,
  healthLabel,
} from "./components/health-detail-primitives";
import { shiftDay } from "./habits/habit-analytics";
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

const muscleLabels: Record<string, string> = {
  Chest: "Brust",
  Back: "Rücken",
  Shoulders: "Schultern",
  Biceps: "Bizeps",
  Triceps: "Trizeps",
  Forearms: "Unterarme",
  Core: "Rumpf",
  Glutes: "Gesäß",
  Quadriceps: "Vordere Oberschenkel",
  Hamstrings: "Hintere Oberschenkel",
  Calves: "Waden",
};

type Link = { source_id: string; source_type: string; task_id: string };
const card = healthCard;
const input = healthInput;
const button = healthPrimary;
const quietButton = healthButton;
const label = healthLabel;

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
  return (
    <HealthFeedback
      state={state}

      message={
        state === "saved"
          ? "Trainingsdaten gespeichert."
          : state === "blocked"
            ? "Lokale Anmeldung erforderlich."
            : "Trainingsdaten konnten nicht gespeichert werden."
      }
    />
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
    <details className="mt-3">
      <summary className="cursor-pointer text-xs font-semibold">
        Termin im Kalender
      </summary>
      <form
        action={scheduleSourceFormAction}
        className="grid gap-2 sm:grid-cols-2"
        data-testid={`schedule-${type}-${id}`}
      >
        <input name="sourceId" type="hidden" value={id} />
        <input name="sourceType" type="hidden" value={type} />
        <label className={label}>
          Datum
          <input
            className={input}
            defaultValue={localDate()}
            name="plannedDate"
            type="date"
          />
        </label>
        <label className={label}>
          Uhrzeit
          <input
            className={input}
            defaultValue="18:00"
            name="scheduledTime"
            type="time"
          />
        </label>
        <label className={label}>
          Dauer
          <input
            className={input}
            defaultValue={duration}
            min="1"
            name="durationMinutes"
            type="number"
          />
        </label>
        <button className={`${button} self-end`} type="submit">
          Im Kalender einplanen
        </button>
      </form>
    </details>
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
  const last7 = completed.filter(
    (session) =>
      session.sessionDate >= shiftDay(today, -6) &&
      session.sessionDate <= today,
  );
  const last30 = completed.filter(
    (session) =>
      session.sessionDate >= shiftDay(today, -29) &&
      session.sessionDate <= today,
  );
  return (
    <main
      className={healthPage}
      data-h2-running="page"
      data-health-detail="running"
    >
      <HealthHeader
        domain="Running"
        title="Running Tracker"
        summary="Läufe dokumentieren, Training planen und deine Entwicklung nachvollziehen."
      />
      <Feedback state={feedback} />
      {mode !== "manual" ? (
        <section className={card}>
          <h2 className="font-semibold">
            {mode === "auth-blocked"
              ? "Anmeldung erforderlich"
              : "Keine persönlichen Trainingsdaten"}
          </h2>
          <Empty>Melde dich lokal an, um Training zu dokumentieren.</Empty>
        </section>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className={card}>
              <p className="text-xs text-[var(--text-muted)]">Letzter Lauf</p>
              <p className="mt-2 text-xl font-semibold">
                {latest ? `${latest.distanceKm} km` : "Noch kein Lauf"}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                {latest
                  ? `${latest.durationMinutes} min · ${formatPace(latest.distanceKm, latest.durationMinutes)}`
                  : "Erfasse deinen ersten Lauf."}
              </p>
            </article>
            <article className={card}>
              <p className="text-xs text-[var(--text-muted)]">Heute</p>
              <p className="mt-2 text-xl font-semibold">
                {todayTotals.distanceKm.toFixed(1)} km
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                {todayTotals.sessionCount} Läufe · {todayTotals.durationMinutes}{" "}
                min
              </p>
            </article>
            <article className={card}>
              <p className="text-xs text-[var(--text-muted)]">7 Tage</p>
              <p className="mt-2 text-xl font-semibold">
                {runningTotals(last7).distanceKm.toFixed(1)} km
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                {runningTotals(last7).sessionCount} Läufe
              </p>
            </article>
            <article className={card}>
              <p className="text-xs text-[var(--text-muted)]">30 Tage</p>
              <p className="mt-2 text-xl font-semibold">
                {runningTotals(last30).distanceKm.toFixed(1)} km
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                Insgesamt {totals.sessionCount} Läufe ·{" "}
                {totals.distanceKm.toFixed(1)} km
              </p>
            </article>
          </section>
          <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <div className="grid min-w-0 gap-4">
              <section className={card}>
                <h2 className="text-lg font-semibold">Laufhistorie</h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Abgeschlossene Läufe mit Dauer und Tempo.
                </p>
                <div className="mt-3 grid gap-2">
                  {completed.length === 0 ? (
                    <Empty>Noch keine abgeschlossenen Läufe.</Empty>
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
                            Bearbeiten / archivieren
                          </summary>
                          <form
                            action={saveRunningSessionAction}
                            className="mt-2 grid gap-2"
                          >
                            <input
                              name="sessionId"
                              type="hidden"
                              value={run.id}
                            />
                            <input
                              name="planItemId"
                              type="hidden"
                              value={run.planItemId ?? ""}
                            />
                            <label className={label}>
                              Datum
                              <input
                                className={input}
                                defaultValue={run.sessionDate}
                                name="sessionDate"
                                type="date"
                              />
                            </label>
                            <label className={label}>
                              Distanz km
                              <input
                                className={input}
                                defaultValue={run.distanceKm}
                                name="distanceKm"
                                step="0.001"
                                type="number"
                              />
                            </label>
                            <label className={label}>
                              Dauer (Minuten)
                              <input
                                className={input}
                                defaultValue={run.durationMinutes}
                                name="durationMinutes"
                                type="number"
                              />
                            </label>
                            <label className={label}>
                              Startzeit (optional)
                              <input
                                className={input}
                                defaultValue={localTime(run.startedAt)}
                                name="startTime"
                                type="time"
                              />
                            </label>
                            <label className={label}>
                              Ø Herzfrequenz (optional)
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
                              Notizen (optional)
                              <input
                                className={input}
                                defaultValue={run.notes ?? ""}
                                maxLength={2000}
                                name="notes"
                              />
                            </label>
                            <button className={quietButton}>
                              Änderungen speichern
                            </button>
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
                            <button className={quietButton}>Archivieren</button>
                          </form>
                        </details>
                      </article>
                    ))
                  )}
                </div>
              </section>
              <section className={card} aria-label="Laufentwicklung">
                <h2 className="text-lg font-semibold">
                  Distanz · letzte vier Wochen
                </h2>
                <div className="mt-4 grid gap-3">
                  {Array.from({ length: 4 }, (_, i) => {
                    const end = shiftDay(today, -7 * (3 - i));
                    const start = shiftDay(end, -6);
                    const week = runningTotals(
                      completed.filter(
                        (run) =>
                          run.sessionDate >= start && run.sessionDate <= end,
                      ),
                    );
                    const max = Math.max(
                      1,
                      ...Array.from({ length: 4 }, (_, j) => {
                        const e = shiftDay(today, -7 * (3 - j));
                        return runningTotals(
                          completed.filter(
                            (r) =>
                              r.sessionDate >= shiftDay(e, -6) &&
                              r.sessionDate <= e,
                          ),
                        ).distanceKm;
                      }),
                    );
                    return (
                      <div key={end}>
                        <div className="mb-1 flex flex-wrap justify-between gap-2 text-xs">
                          <span>
                            {start} – {end}
                          </span>
                          <span>
                            {week.distanceKm.toFixed(1)} km ·{" "}
                            {week.sessionCount} Läufe · {week.durationMinutes}{" "}
                            min
                          </span>
                        </div>
                        <div className="h-2 rounded bg-[var(--surface-3)]">
                          <div
                            className="h-2 rounded bg-[var(--accent-red)]"
                            style={{
                              width: `${(week.distanceKm / max) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
            <div className="grid min-w-0 gap-4">
              <section className={card} data-testid="running-session-form">
                <h2 className="text-lg font-semibold">Lauf erfassen</h2>
                <form
                  action={saveRunningSessionAction}
                  className="mt-3 grid gap-3 sm:grid-cols-2"
                >
                  <input name="planItemId" type="hidden" value="" />
                  <label className={label}>
                    Datum
                    <input
                      className={input}
                      defaultValue={today}
                      name="sessionDate"
                      required
                      type="date"
                    />
                  </label>
                  <label className={label}>
                    Startzeit (optional)
                    <input className={input} name="startTime" type="time" />
                  </label>
                  <label className={label}>
                    Distanz (km)
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
                    Dauer (Minuten)
                    <input
                      className={input}
                      min="1"
                      name="durationMinutes"
                      required
                      type="number"
                    />
                  </label>
                  <label className={label}>
                    Ø Herzfrequenz (optional)
                    <input
                      className={input}
                      min="30"
                      max="240"
                      name="averageHeartRate"
                      type="number"
                    />
                  </label>
                  <label className={label}>
                    Notizen (optional)
                    <input className={input} maxLength={2000} name="notes" />
                  </label>
                  <button className={button} type="submit">
                    Lauf speichern
                  </button>
                </form>
              </section>
              <section className={card}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">Laufpläne</h2>
                  <span className="text-xs text-[var(--text-muted)]">
                    Planung · Termine im Kalender
                  </span>
                </div>
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-semibold">
                    Neuer Plan
                  </summary>
                  <form
                    action={saveRunningPlanAction}
                    className="mt-3 grid gap-3 sm:grid-cols-2"
                  >
                    <label className={label}>
                      Planname
                      <input className={input} name="name" required />
                    </label>
                    <label className={label}>
                      Ziel / Kontext
                      <input className={input} name="goal" required />
                    </label>
                    <button className={`${button} self-end`} type="submit">
                      Plan erstellen
                    </button>
                  </form>
                </details>
                <div className="mt-4 grid gap-3">
                  {activePlans.length === 0 ? (
                    <Empty>Noch kein Laufplan.</Empty>
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
                          <h3 className="font-semibold">{plan.name}</h3>
                          <p className="mb-3 text-sm text-[var(--text-secondary)]">
                            {plan.goal}
                          </p>
                          <details>
                            <summary className="cursor-pointer text-xs font-semibold">
                              Plan bearbeiten
                            </summary>
                            <form
                              action={saveRunningPlanAction}
                              className="grid gap-2 sm:grid-cols-2"
                            >
                              <input
                                name="planId"
                                type="hidden"
                                value={plan.id}
                              />
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
                                Ziel / Kontext
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
                                Plan speichern
                              </button>
                            </form>
                          </details>
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
                            <button className={quietButton}>
                              Plan archivieren
                            </button>
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
                                    : "Distanz offen"}{" "}
                                  ·{" "}
                                  {item.plannedDurationMinutes
                                    ? `${item.plannedDurationMinutes} min`
                                    : "Dauer offen"}{" "}
                                  ·{" "}
                                  {links.some(
                                    (link) =>
                                      link.source_type ===
                                        "running_plan_item" &&
                                      link.source_id === item.id,
                                  )
                                    ? "Kalendertermin verknüpft"
                                    : "Ohne Kalendertermin"}
                                </p>
                                <details className="mt-2">
                                  <summary className="cursor-pointer text-xs font-semibold">
                                    Planeinheit bearbeiten
                                  </summary>
                                  <form
                                    action={addRunningPlanItemAction}
                                    className="mt-2 grid gap-2 sm:grid-cols-2"
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
                                      Titel
                                      <input
                                        className={input}
                                        defaultValue={item.title}
                                        name="title"
                                        required
                                      />
                                    </label>
                                    <label className={label}>
                                      Distanz km
                                      <input
                                        className={input}
                                        defaultValue={
                                          item.plannedDistanceKm ?? ""
                                        }
                                        name="plannedDistanceKm"
                                        step="0.001"
                                        type="number"
                                      />
                                    </label>
                                    <label className={label}>
                                      Dauer min
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
                                      Reihenfolge
                                      <input
                                        className={input}
                                        defaultValue={item.sortOrder}
                                        name="sortOrder"
                                        type="number"
                                      />
                                    </label>
                                    <button className={quietButton}>
                                      Planeinheit speichern
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
                                    Geplanten Lauf abschließen
                                  </summary>
                                  <form
                                    action={saveRunningSessionAction}
                                    className="mt-2 grid gap-2 sm:grid-cols-2"
                                  >
                                    <input
                                      name="planItemId"
                                      type="hidden"
                                      value={item.id}
                                    />
                                    <label className={label}>
                                      Datum
                                      <input
                                        className={input}
                                        defaultValue={today}
                                        name="sessionDate"
                                        type="date"
                                      />
                                    </label>
                                    <label className={label}>
                                      Startzeit
                                      <input
                                        className={input}
                                        name="startTime"
                                        type="time"
                                      />
                                    </label>
                                    <label className={label}>
                                      Distanz km
                                      <input
                                        className={input}
                                        defaultValue={
                                          item.plannedDistanceKm ?? ""
                                        }
                                        min="0.001"
                                        name="distanceKm"
                                        required
                                        step="0.001"
                                        type="number"
                                      />
                                    </label>
                                    <label className={label}>
                                      Dauer min
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
                                      Herzfrequenz
                                      <input
                                        className={input}
                                        name="averageHeartRate"
                                        type="number"
                                      />
                                    </label>
                                    <label className={label}>
                                      Notizen
                                      <input className={input} name="notes" />
                                    </label>
                                    <button className={button}>
                                      Lauf abschließen
                                    </button>
                                  </form>
                                </details>
                              </div>
                            ))}
                            <details>
                              <summary className="cursor-pointer text-sm font-semibold">
                                Planeinheit hinzufügen
                              </summary>
                              <form
                                action={addRunningPlanItemAction}
                                className="mt-2 grid gap-2 sm:grid-cols-2"
                              >
                                <input
                                  name="planId"
                                  type="hidden"
                                  value={plan.id}
                                />
                                <label className={label}>
                                  Titel
                                  <input
                                    className={input}
                                    name="title"
                                    required
                                  />
                                </label>
                                <label className={label}>
                                  Distanz km
                                  <input
                                    className={input}
                                    min="0.001"
                                    name="plannedDistanceKm"
                                    step="0.001"
                                    type="number"
                                  />
                                </label>
                                <label className={label}>
                                  Dauer min
                                  <input
                                    className={input}
                                    min="1"
                                    name="plannedDurationMinutes"
                                    type="number"
                                  />
                                </label>
                                <label className={label}>
                                  Reihenfolge
                                  <input
                                    className={input}
                                    defaultValue={items.length + 1}
                                    min="0"
                                    name="sortOrder"
                                    type="number"
                                  />
                                </label>
                                <button className={`${quietButton} self-end`}>
                                  Einheit hinzufügen
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
            </div>
          </div>
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
  const activeIds = new Set(sessions.map((session) => session.id));
  const activeLogs = snapshot.strengthSetLogs.filter((log) =>
    activeIds.has(log.sessionId),
  );
  const allVolume = strengthVolume(activeLogs);
  const loads = muscleLoad(activeLogs, snapshot.exercises);
  const today = localDate();
  return (
    <main
      className={healthPage}
      data-h2-strength="page"
      data-health-detail="strength"
    >
      <HealthHeader
        domain="Strength"
        title="Strength Tracker"
        summary="Training dokumentieren, Übungen verwalten und deine Belastung nachvollziehen."
      />
      <Feedback state={feedback} />
      {mode !== "manual" ? (
        <section className={card}>
          <h2 className="font-semibold">
            {mode === "auth-blocked"
              ? "Anmeldung erforderlich"
              : "Keine persönlichen Trainingsdaten"}
          </h2>
          <Empty>Melde dich lokal an, um Training zu dokumentieren.</Empty>
        </section>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className={card}>
              <p className="text-xs text-[var(--text-muted)]">
                Abgeschlossen · 7 Tage
              </p>
              <p className="mt-2 text-xl font-semibold">
                {
                  sessions.filter(
                    (session) =>
                      session.status === "completed" &&
                      session.sessionDate >= shiftDay(today, -6) &&
                      session.sessionDate <= today,
                  ).length
                }{" "}
                Sessions
              </p>
            </article>
            <article className={card}>
              <p className="text-xs text-[var(--text-muted)]">
                Abgeschlossene Sessions
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
                Gewichtsvolumen
              </p>
              <p className="mt-2 text-xl font-semibold">
                {allVolume.weightedSetCount
                  ? `${allVolume.weightedVolumeKg.toFixed(1)} kg`
                  : "Noch keine gewichteten Sätze"}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {allVolume.unweightedRepetitions
                  ? `${allVolume.unweightedRepetitions} Wiederholungen ohne Gewicht`
                  : "Keine Wiederholungen ohne Gewicht"}
              </p>
            </article>
            <article className={card}>
              <p className="text-xs text-[var(--text-muted)]">
                Zugeordnete Muskelgruppen
              </p>
              <p className="mt-2 text-xl font-semibold">{loads.length}</p>
              <p className="text-xs text-[var(--text-secondary)]">
                {loads
                  .slice(0, 3)
                  .map(
                    ([muscle, load]) =>
                      `${muscleLabels[muscle]}: ${load.sets} Sätze`,
                  )
                  .join(" · ") ||
                  "Zuordnungen findest du in der Übungsbibliothek."}
              </p>
            </article>
          </section>
          <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <div className="grid min-w-0 gap-4">
              <section className={card}>
                <h2 className="text-lg font-semibold">
                  Trainingshistorie & Sessions
                </h2>
                <details className="my-3">
                  <summary className="cursor-pointer text-sm font-semibold">
                    Freie Session starten
                  </summary>
                  <form
                    action={startStrengthSessionAction}
                    className="mt-3 grid gap-3 sm:grid-cols-2"
                    data-testid="free-strength-session"
                  >
                    <input name="planId" type="hidden" value="" />
                    <label className={label}>
                      Trainingsdatum
                      <input
                        className={input}
                        name="sessionDate"
                        type="date"
                        defaultValue={today}
                        required
                      />
                    </label>
                    <label className={label}>
                      Notizen
                      <input className={input} name="notes" />
                    </label>
                    <button className={button}>Freie Session starten</button>
                  </form>
                </details>
                <div className="mt-3 grid gap-3">
                  {sessions.length === 0 ? (
                    <Empty>
                      Noch keine Sessions. Starte frei oder aus einem Plan.
                    </Empty>
                  ) : (
                    sessions.map((session) => {
                      const logs = snapshot.strengthSetLogs.filter(
                        (log) => log.sessionId === session.id,
                      );
                      const volume = strengthVolume(logs);
                      const planExercises = session.planId
                        ? snapshot.strengthPlanItems.filter(
                            (item) =>
                              item.planId === session.planId &&
                              exercises.some(
                                (exercise) => exercise.id === item.exerciseId,
                              ),
                          )
                        : exercises.map((exercise) => ({
                            id: exercise.id,
                            exerciseId: exercise.id,
                          }));
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
                                {strengthPlanById.get(session.planId ?? "")
                                  ?.name ?? "Freie Session"}{" "}
                                ·{" "}
                                {session.status === "completed"
                                  ? "Abgeschlossen"
                                  : "Läuft"}
                              </p>
                              <p className="text-xs text-[var(--text-secondary)]">
                                {volume.weightedSetCount
                                  ? `${volume.weightedVolumeKg.toFixed(1)} kg Gewichtsvolumen`
                                  : "Ohne Gewichtsvolumen"}
                                {volume.unweightedRepetitions
                                  ? ` · ${volume.unweightedRepetitions} Wiederholungen ohne Gewicht`
                                  : ""}
                              </p>
                            </div>
                            {session.status === "in_progress" ? (
                              <form action={completeStrengthSessionAction}>
                                <input
                                  name="id"
                                  type="hidden"
                                  value={session.id}
                                />
                                <button className={button}>
                                  Session abschließen
                                </button>
                              </form>
                            ) : null}
                          </div>
                          <div className="mt-2 grid gap-1">
                            {logs.map((log) => (
                              <p className="text-xs" key={log.id}>
                                Satz {log.setOrder}:{" "}
                                {exerciseById.get(log.exerciseId)?.name ??
                                  "Archivierte Übung"}{" "}
                                · {log.repetitions} Wiederholungen
                                {log.weightKg
                                  ? ` × ${log.weightKg} kg`
                                  : " · ohne Gewicht"}
                              </p>
                            ))}
                          </div>
                          {session.status === "in_progress" ? (
                            <form
                              action={addStrengthSetAction}
                              className="mt-3 grid gap-2 sm:grid-cols-2"
                            >
                              <input
                                name="sessionId"
                                type="hidden"
                                value={session.id}
                              />
                              <label className={label}>
                                Übung
                                <select className={input} name="exerciseId">
                                  {planExercises.map((item) => (
                                    <option
                                      key={item.id}
                                      value={item.exerciseId}
                                    >
                                      {exerciseById.get(item.exerciseId)
                                        ?.name ?? "Archivierte Übung"}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className={label}>
                                Satznummer
                                <input
                                  className={input}
                                  defaultValue={logs.length + 1}
                                  name="setOrder"
                                  type="number"
                                />
                              </label>
                              <label className={label}>
                                Wiederholungen
                                <input
                                  className={input}
                                  name="repetitions"
                                  type="number"
                                />
                              </label>
                              <label className={label}>
                                Gewicht kg (optional)
                                <input
                                  className={input}
                                  name="weightKg"
                                  step="0.001"
                                  type="number"
                                />
                              </label>
                              <label className={label}>
                                Notizen
                                <input className={input} name="notes" />
                              </label>
                              <button className={quietButton}>
                                Satz speichern
                              </button>
                            </form>
                          ) : null}
                        </article>
                      );
                    })
                  )}
                </div>
              </section>
              <section className={card}>
                <h2 className="text-lg font-semibold">Muskelübersicht</h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Sätze aus laufenden und abgeschlossenen Sessions. Mehrfach
                  zugeordnete Muskeln zählen denselben Satz; Werte nicht
                  addieren.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {loads.length === 0 ? (
                    <Empty>Noch keine Sätze mit Muskelzuordnung.</Empty>
                  ) : (
                    loads.map(([muscle, load]) => (
                      <article
                        className="rounded-xl border border-[var(--border-subtle)] p-3"
                        key={muscle}
                      >
                        <p className="font-semibold">{muscleLabels[muscle]}</p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          Sätze: {load.sets} Sätze
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {load.weightedVolumeKg
                            ? `${load.weightedVolumeKg.toFixed(1)} kg Gewichtsvolumen`
                            : "Ohne Gewichtsvolumen"}
                          {load.unweightedRepetitions
                            ? ` · ${load.unweightedRepetitions} Wiederholungen ohne Gewicht`
                            : ""}
                        </p>
                      </article>
                    ))
                  )}
                </div>
              </section>
            </div>
            <div className="grid min-w-0 gap-4">
              <section className={card}>
                <h2 className="text-lg font-semibold">Krafttrainingspläne</h2>
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-semibold">
                    Neuer Plan
                  </summary>
                  <form
                    action={saveStrengthPlanAction}
                    className="mt-3 grid gap-3 sm:grid-cols-2"
                  >
                    <label className={label}>
                      Planname
                      <input className={input} name="name" required />
                    </label>
                    <label className={label}>
                      Ziel / Kontext
                      <input className={input} name="goal" required />
                    </label>
                    <button className={`${button} self-end`}>
                      Plan erstellen
                    </button>
                  </form>
                </details>
                <div className="mt-4 grid gap-3">
                  {plans.length === 0 ? (
                    <Empty>Noch kein Krafttrainingsplan.</Empty>
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
                          <h3 className="font-semibold">{plan.name}</h3>
                          <p className="mb-3 text-sm text-[var(--text-secondary)]">
                            {plan.goal}
                          </p>
                          <details>
                            <summary className="cursor-pointer text-xs font-semibold">
                              Plan bearbeiten
                            </summary>
                            <form
                              action={saveStrengthPlanAction}
                              className="grid gap-2 sm:grid-cols-2"
                            >
                              <input
                                name="planId"
                                type="hidden"
                                value={plan.id}
                              />
                              <label className={label}>
                                Name
                                <input
                                  className={input}
                                  defaultValue={plan.name}
                                  name="name"
                                />
                              </label>
                              <label className={label}>
                                Ziel / Kontext
                                <input
                                  className={input}
                                  defaultValue={plan.goal}
                                  name="goal"
                                />
                              </label>
                              <button className={quietButton}>
                                Plan speichern
                              </button>
                            </form>
                          </details>
                          <p className="mt-2 text-xs text-[var(--text-secondary)]">
                            {links.some(
                              (link) =>
                                link.source_type === "strength_plan" &&
                                link.source_id === plan.id,
                            )
                              ? "Kalendertermin verknüpft"
                              : "Ohne Kalendertermin"}
                          </p>
                          <div className="mt-2 grid gap-1">
                            {items.map((item) => (
                              <details key={item.id}>
                                <summary className="cursor-pointer text-sm">
                                  {item.sortOrder}.{" "}
                                  {exerciseById.get(item.exerciseId)?.name ??
                                    "Archivierte Übung"}{" "}
                                  · {item.targetSets} × {item.targetReps}
                                  {item.targetWeightKg
                                    ? ` @ ${item.targetWeightKg} kg`
                                    : " · ohne Gewicht/bodyweight"}
                                </summary>
                                <form
                                  action={addStrengthPlanItemAction}
                                  className="mt-2 grid gap-2 sm:grid-cols-2"
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
                                    Übung
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
                                    Reihenfolge
                                    <input
                                      className={input}
                                      defaultValue={item.sortOrder}
                                      name="sortOrder"
                                      type="number"
                                    />
                                  </label>
                                  <label className={label}>
                                    Sätze
                                    <input
                                      className={input}
                                      defaultValue={item.targetSets}
                                      name="targetSets"
                                      type="number"
                                    />
                                  </label>
                                  <label className={label}>
                                    Wiederholungen
                                    <input
                                      className={input}
                                      defaultValue={item.targetReps}
                                      name="targetReps"
                                      type="number"
                                    />
                                  </label>
                                  <label className={label}>
                                    Gewicht kg
                                    <input
                                      className={input}
                                      defaultValue={item.targetWeightKg ?? ""}
                                      name="targetWeightKg"
                                      step="0.001"
                                      type="number"
                                    />
                                  </label>
                                  <button className={quietButton}>
                                    Planübung speichern
                                  </button>
                                </form>
                              </details>
                            ))}
                          </div>
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs font-semibold">
                              Planübung hinzufügen
                            </summary>
                            <form
                              action={addStrengthPlanItemAction}
                              className="mt-2 grid gap-2 sm:grid-cols-2"
                            >
                              <input
                                name="planId"
                                type="hidden"
                                value={plan.id}
                              />
                              <label className={label}>
                                Übung
                                <select className={input} name="exerciseId">
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
                                Reihenfolge
                                <input
                                  className={input}
                                  defaultValue={items.length + 1}
                                  name="sortOrder"
                                  type="number"
                                />
                              </label>
                              <label className={label}>
                                Sätze
                                <input
                                  className={input}
                                  defaultValue="3"
                                  name="targetSets"
                                  type="number"
                                />
                              </label>
                              <label className={label}>
                                Wiederholungen
                                <input
                                  className={input}
                                  defaultValue="8"
                                  name="targetReps"
                                  type="number"
                                />
                              </label>
                              <label className={label}>
                                Gewicht kg
                                <input
                                  className={input}
                                  name="targetWeightKg"
                                  step="0.001"
                                  type="number"
                                />
                              </label>
                              <button className={quietButton}>
                                Übung hinzufügen
                              </button>
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
                            <input
                              name="planId"
                              type="hidden"
                              value={plan.id}
                            />
                            <input name="notes" type="hidden" value="" />
                            <label className={label}>
                              Trainingsdatum
                              <input
                                className={input}
                                defaultValue={today}
                                name="sessionDate"
                                type="date"
                              />
                            </label>
                            <button className={`${button} self-end`}>
                              Session starten
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
                            <button className={quietButton}>
                              Plan archivieren
                            </button>
                          </form>
                        </article>
                      );
                    })
                  )}
                </div>
              </section>
              <section className={card}>
                <h2 className="text-lg font-semibold">Übungsbibliothek</h2>
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-semibold">
                    Neue Übung
                  </summary>{" "}
                  <form
                    action={saveExerciseAction}
                    className="mt-3 grid gap-3 sm:grid-cols-2"
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
                      Beschreibung
                      <input className={input} name="description" />
                    </label>
                    <fieldset className="sm:col-span-2">
                      <legend className="text-xs font-semibold text-[var(--text-secondary)]">
                        Muskelgruppen
                      </legend>
                      <div className="mt-2 flex flex-wrap gap-3">
                        {muscleGroups.map((muscle) => (
                          <label
                            className="flex items-center gap-1 text-xs"
                            key={muscle}
                          >
                            <input
                              name="muscles"
                              type="checkbox"
                              value={muscle}
                            />
                            {muscleLabels[muscle]}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <button className={button}>Übung erstellen</button>
                  </form>
                </details>
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {exercises.length === 0 ? (
                    <Empty>Noch keine Übungen.</Empty>
                  ) : (
                    exercises.map((exercise) => (
                      <article
                        className="rounded-xl border border-[var(--border-subtle)] p-3"
                        key={exercise.id}
                      >
                        <p className="font-semibold">{exercise.name}</p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {exercise.equipment || "Ohne Equipment"} ·{" "}
                          {exercise.muscles
                            .map((muscle) => muscleLabels[muscle])
                            .join(", ")}
                        </p>
                        {exercise.description && (
                          <p className="mt-2 text-sm text-[var(--text-secondary)]">
                            {exercise.description}
                          </p>
                        )}
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs font-semibold">
                            Bearbeiten / archivieren
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
                              Beschreibung
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
                                  {muscleLabels[muscle]}
                                </label>
                              ))}
                            </div>
                            <button className={quietButton}>
                              Übung speichern
                            </button>
                          </form>
                          <form action={archiveTrainingAction}>
                            <input
                              name="id"
                              type="hidden"
                              value={exercise.id}
                            />
                            <input
                              name="table"
                              type="hidden"
                              value="exercises"
                            />
                            <input
                              name="returnTo"
                              type="hidden"
                              value="/health/strength"
                            />
                            <button className={quietButton}>
                              Übung archivieren
                            </button>
                          </form>
                        </details>
                      </article>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
