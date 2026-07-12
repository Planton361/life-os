import Link from "next/link";
import {
  archiveHabitAction,
  createHabitAction,
  incrementHabitAction,
  undoHabitAction,
  updateHabitAction,
  updateHabitWindowSettingsAction,
} from "@/features/real-data/actions/habit.actions";
import { aggregateHabitDay, habitProgress } from "@/features/real-data";
import {
  PageHeader,
  Pill,
  RoutePage,
  SectionPanel,
} from "@/components/layout/route-page-primitives";
import type { HabitTrackingPageData } from "../habit-tracking-data";

const fieldClass =
  "min-h-10 w-full rounded-[9px] border border-[var(--border-default)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-primary)] outline-none focus-visible:border-[var(--accent-cyan)]";
const buttonClass =
  "min-h-10 rounded-[9px] border border-[var(--border-default)] px-3 text-xs font-semibold text-[var(--text-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]";

function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function number(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function HabitFields({
  habit,
}: Readonly<{
  habit?: NonNullable<HabitTrackingPageData["snapshot"]>["habits"][number];
}>) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      <label className="text-xs font-semibold text-[var(--text-secondary)]">
        Name
        <input
          className={fieldClass}
          defaultValue={habit?.name}
          name="name"
          required
        />
      </label>
      <label className="text-xs font-semibold text-[var(--text-secondary)]">
        Einheit
        <input
          className={fieldClass}
          defaultValue={habit?.unit ?? ""}
          name="unit"
          placeholder="ml, Minuten, Wiederholungen"
        />
      </label>
      <label className="text-xs font-semibold text-[var(--text-secondary)]">
        Tagesziel optional
        <input
          className={fieldClass}
          defaultValue={habit?.dailyTarget ?? ""}
          min="0.01"
          name="dailyTarget"
          step="any"
          type="number"
        />
      </label>
      <label className="text-xs font-semibold text-[var(--text-secondary)]">
        Standard-Increment
        <input
          className={fieldClass}
          defaultValue={habit?.defaultIncrement ?? 1}
          min="0.01"
          name="defaultIncrement"
          required
          step="any"
          type="number"
        />
      </label>
      <label className="text-xs font-semibold text-[var(--text-secondary)]">
        Zeitfenster
        <select
          className={fieldClass}
          defaultValue={habit?.window ?? "Morning"}
          name="window"
        >
          <option>Morning</option>
          <option>Midday</option>
          <option>Evening</option>
        </select>
      </label>
      <label className="text-xs font-semibold text-[var(--text-secondary)]">
        Dashboard-Slot 1–8
        <input
          className={fieldClass}
          defaultValue={habit?.sortOrder ?? 1}
          max="8"
          min="1"
          name="sortOrder"
          required
          type="number"
        />
      </label>
    </div>
  );
}

export function HabitTrackingPage({
  data,
  feedback,
}: Readonly<{ data: HabitTrackingPageData; feedback?: string }>) {
  const snapshot = data.snapshot;
  const activeHabits =
    snapshot?.habits.filter((habit) => habit.archivedAt === null) ?? [];
  const archivedHabits =
    snapshot?.habits.filter((habit) => habit.archivedAt !== null) ?? [];
  const dates = Array.from({ length: 7 }, (_, index) =>
    addDays(data.today, index - 6),
  );

  return (
    <RoutePage>
      <PageHeader
        eyebrow="Health · Habit tracking"
        summary="Flexible Mengen und ruhige Verlaufssignale aus einzelnen timestamped Logs – ohne Streak-Druck."
        title="Habits"
      />
      <nav aria-label="Health views" className="flex gap-2">
        <Link className={buttonClass} href="/health">
          Health
        </Link>
        <Link className={buttonClass} href="/review/daily">
          Daily Review
        </Link>
      </nav>

      {feedback ? (
        <div
          className="rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-1)] px-4 py-3 text-sm text-[var(--text-secondary)]"
          role={feedback === "saved" ? "status" : "alert"}
        >
          {feedback === "saved"
            ? "Habit-Daten gespeichert."
            : feedback === "blocked"
              ? "Authentifiziertes Manual-Profil erforderlich."
              : "Habit-Aktion konnte nicht gespeichert werden. Prüfe Slot und Eingaben."}
        </div>
      ) : null}
      {data.blockedReason ? (
        <div
          className="rounded-[10px] border border-[rgba(217,146,79,.30)] bg-[rgba(217,146,79,.08)] px-4 py-3 text-sm text-[var(--text-secondary)]"
          role="alert"
        >
          {data.blockedReason}
        </div>
      ) : null}

      {snapshot ? (
        <>
          <SectionPanel title="Zeitfenster">
            <form
              action={updateHabitWindowSettingsAction}
              className="grid gap-3 sm:grid-cols-3 xl:grid-cols-[1fr_1fr_1fr_auto] xl:items-end"
              data-habits-section="window-settings"
            >
              <label className="text-xs font-semibold text-[var(--text-secondary)]">
                Morning ab
                <input
                  className={fieldClass}
                  defaultValue={snapshot.settings.morningStartsAt}
                  name="morningStartsAt"
                  required
                  type="time"
                />
              </label>
              <label className="text-xs font-semibold text-[var(--text-secondary)]">
                Midday ab
                <input
                  className={fieldClass}
                  defaultValue={snapshot.settings.middayStartsAt}
                  name="middayStartsAt"
                  required
                  type="time"
                />
              </label>
              <label className="text-xs font-semibold text-[var(--text-secondary)]">
                Evening ab
                <input
                  className={fieldClass}
                  defaultValue={snapshot.settings.eveningStartsAt}
                  name="eveningStartsAt"
                  required
                  type="time"
                />
              </label>
              <button className={buttonClass} type="submit">
                Grenzen speichern
              </button>
            </form>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Evening läuft nach Mitternacht bis zum Morning-Start weiter. Die
              Grenzen sind geordnet und decken den gesamten lokalen Tag in{" "}
              {snapshot.settings.timezone} ab.
            </p>
          </SectionPanel>

          <SectionPanel title="Habit erstellen">
            <form
              action={createHabitAction}
              className="grid gap-3"
              data-habits-section="create-form"
            >
              <HabitFields />
              <button
                className={`${buttonClass} justify-self-end`}
                type="submit"
              >
                Habit erstellen
              </button>
            </form>
          </SectionPanel>

          <SectionPanel title="Heute">
            <div
              className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
              data-habits-section="today"
            >
              {activeHabits.map((habit) => {
                const logs = snapshot.logs.filter(
                  (log) =>
                    log.habitId === habit.id && log.localDate === data.today,
                );
                const current = aggregateHabitDay(logs);
                const progress = habitProgress(current, habit.dailyTarget);
                return (
                  <article
                    className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-2)] p-3"
                    data-habit-id={habit.id}
                    key={habit.id}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                          {habit.name}
                        </h3>
                        <p className="text-xs text-[var(--text-muted)]">
                          {habit.window} · Slot {habit.sortOrder}
                        </p>
                      </div>
                      <Pill
                        accent={
                          progress.percentage !== null &&
                          progress.percentage >= 100
                            ? "var(--accent-green)"
                            : "var(--accent-purple)"
                        }
                      >
                        {progress.percentage === null
                          ? "Kein Ziel"
                          : progress.overachieved
                            ? `${Math.round(progress.percentage)}% · über Ziel`
                            : `${Math.round(progress.percentage)}%`}
                      </Pill>
                    </div>
                    <p className="mt-3 text-xl font-semibold text-[var(--text-primary)]">
                      {number(current)}
                      {habit.unit ? ` ${habit.unit}` : ""}
                      {habit.dailyTarget !== null
                        ? ` / ${number(habit.dailyTarget)} ${habit.unit ?? ""}`
                        : ""}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {logs.length} Logs · +{number(habit.defaultIncrement)} je
                      Klick
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <form action={incrementHabitAction}>
                        <input name="habitId" type="hidden" value={habit.id} />
                        <button className={buttonClass} type="submit">
                          + {number(habit.defaultIncrement)}{" "}
                          {habit.unit ?? "Count"}
                        </button>
                      </form>
                      <form action={undoHabitAction}>
                        <input name="habitId" type="hidden" value={habit.id} />
                        <button
                          className={buttonClass}
                          disabled={logs.length === 0}
                          type="submit"
                        >
                          Letzten Log rückgängig
                        </button>
                      </form>
                    </div>
                  </article>
                );
              })}
              {activeHabits.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  Noch keine aktiven Habits. Erstelle den ersten Slot oben.
                </p>
              ) : null}
            </div>
          </SectionPanel>

          <SectionPanel title="Tages-, Wochen- und Monatssignale">
            <div className="space-y-3" data-habits-section="history">
              {snapshot.habits.map((habit) => {
                const monthLogs = snapshot.logs.filter(
                  (log) => log.habitId === habit.id,
                );
                const monthValue = aggregateHabitDay(monthLogs);
                const weekValue = aggregateHabitDay(
                  monthLogs.filter((log) => dates.includes(log.localDate)),
                );
                return (
                  <article
                    className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-2)] p-3"
                    key={`history-${habit.id}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                        {habit.name}
                      </h3>
                      <Pill
                        accent={
                          habit.archivedAt
                            ? "var(--text-muted)"
                            : "var(--accent-cyan)"
                        }
                      >
                        {habit.archivedAt ? "Archiviert" : habit.window}
                      </Pill>
                    </div>
                    <div className="mt-3 grid grid-cols-7 gap-1">
                      {dates.map((date) => {
                        const value = aggregateHabitDay(
                          monthLogs.filter((log) => log.localDate === date),
                        );
                        return (
                          <div
                            className="rounded-[7px] border border-[var(--border-subtle)] px-1 py-2 text-center"
                            key={`${habit.id}-${date}`}
                          >
                            <p className="text-[9px] text-[var(--text-muted)]">
                              {date.slice(8)}
                            </p>
                            <p className="text-xs font-semibold text-[var(--text-primary)]">
                              {number(value)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-xs text-[var(--text-secondary)]">
                      7 Tage: {number(weekValue)} {habit.unit ?? ""} · 30 Tage:{" "}
                      {number(monthValue)} {habit.unit ?? ""} ·{" "}
                      {monthLogs.length} timestamped Logs
                    </p>
                  </article>
                );
              })}
            </div>
          </SectionPanel>

          <SectionPanel title="Verwalten und anordnen">
            <div className="space-y-3" data-habits-section="management">
              {activeHabits.map((habit) => (
                <article
                  className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-2)] p-3"
                  key={`manage-${habit.id}`}
                >
                  <form action={updateHabitAction} className="grid gap-3">
                    <input name="habitId" type="hidden" value={habit.id} />
                    <HabitFields habit={habit} />
                    <button
                      className={`${buttonClass} justify-self-end`}
                      type="submit"
                    >
                      Habit speichern
                    </button>
                  </form>
                  <form
                    action={archiveHabitAction}
                    className="mt-2 flex justify-end"
                  >
                    <input name="habitId" type="hidden" value={habit.id} />
                    <button className={buttonClass} type="submit">
                      Habit archivieren
                    </button>
                  </form>
                </article>
              ))}
              {archivedHabits.length > 0 ? (
                <p className="text-xs text-[var(--text-muted)]">
                  {archivedHabits.length} archivierte Habits bleiben oben im
                  Verlauf sichtbar.
                </p>
              ) : null}
            </div>
          </SectionPanel>
        </>
      ) : (
        <SectionPanel title="Habit Tracking">
          <p className="text-sm text-[var(--text-muted)]">
            Keine Demo-Daten werden in Empty oder Auth-blocked übernommen.
          </p>
        </SectionPanel>
      )}
    </RoutePage>
  );
}
