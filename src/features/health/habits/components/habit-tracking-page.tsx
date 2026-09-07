import { HealthFeedback } from "../../components/health-feedback";
import Link from "next/link";
import {
  archiveHabitAction,
  updateHabitAction,
} from "@/features/real-data/actions/habit.actions";
import type { HabitTrackingPageData } from "../habit-tracking-data";
import { habitDays, habitSummary, shiftDay } from "../habit-analytics";
import {
  HealthHeader,
  HealthSection,
  HealthSummary,
  healthPage,
  healthInput as fieldClass,
  healthButton as buttonClass,
  healthMuted,
} from "../../components/health-detail-primitives";
const windows = { Morning: "Morgens", Midday: "Mittags", Evening: "Abends" };
const number = (value: number) =>
  new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(value);
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
        Schrittweite
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
          <option value="Morning">Morgens</option>
          <option value="Midday">Mittags</option>
          <option value="Evening">Abends</option>
        </select>
      </label>
      <input name="sortOrder" type="hidden" value={habit?.sortOrder ?? 1} />
    </div>
  );
}

export function HabitTrackingPage({
  data,
  feedback,
  selected,
  period = "month",
}: {
  data: HabitTrackingPageData;
  feedback?: string;
  selected?: string;
  period?: string;
}) {
  const snapshot = data.snapshot;
  const habit =
    snapshot?.habits.find((h) => h.id === selected) ??
    snapshot?.habits.find((h) => !h.archivedAt) ??
    snapshot?.habits[0];
  const count = period === "day" ? 1 : period === "week" ? 7 : 30;
  const summary = snapshot ? habitSummary(snapshot, data.today) : null;
  const href = (id: string, view = period) =>
    `/health/habits?selected=${id}&period=${view}`;
  return (
    <main className={healthPage} data-health-detail="habits">
      <HealthHeader
        domain="Habits"
        title="Habit Tracker"
        summary="Deine Gewohnheiten im Verlauf. Mengen, Tageszeiten und die letzten 30 Tage auf einen Blick."
      />
      <HealthFeedback
        state={feedback}

        message={
          feedback === "saved"
            ? "Habit-Daten gespeichert."
            : "Habit konnte nicht gespeichert werden. Prüfe die Eingaben und freie Plätze im Zeitfenster."
        }
      />
      {data.blockedReason && <p role="alert">{data.blockedReason}</p>}
      {summary && (
        <HealthSummary
          items={[
            { label: "Aktive Habits", value: summary.active },
            {
              label: "Heute erfüllt",
              value: `${summary.completed} / ${summary.targeted}`,
              detail: "Habits mit Tagesziel",
            },
            {
              label: "Aktive Tage · 7 Tage",
              value: `${summary.weekActiveDays} / 7`,
              detail: "Tage mit mindestens einem Eintrag",
            },
            { label: "Einträge diesen Monat", value: summary.monthLogs },
          ]}
        />
      )}
      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="grid min-w-0 gap-4">
          {" "}
          <HealthSection title="Habits & Verlauf">
            <div className="grid gap-2" data-habits-section="history">
              {snapshot?.habits.map((h) => {
                const days = habitDays(
                  h,
                  snapshot.logs,
                  data.today,
                  30,
                  snapshot.settings.timezone,
                );
                const current = days[29];
                const last = snapshot.logs
                  .filter(
                    (l) =>
                      l.habitId === h.id &&
                      !l.archivedAt &&
                      l.localDate >= shiftDay(data.today, -29),
                  )
                  .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];
                return (
                  <article
                    key={h.id}
                    data-habit-id={h.id}
                    className={`min-w-0 rounded-lg border p-3 ${habit?.id === h.id ? "border-[var(--accent-cyan)]" : "border-[var(--border-subtle)]"}`}
                  >
                    <Link
                      className="block rounded outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                      href={href(h.id)}
                      aria-current={habit?.id === h.id ? "true" : undefined}
                    >
                      <div className="flex flex-wrap justify-between gap-2">
                        <h3 className="font-semibold">{h.name}</h3>
                        <span className="text-xs text-[var(--text-secondary)]">
                          {h.archivedAt ? "Archiviert" : windows[h.window]}
                        </span>
                      </div>
                      <p className="my-2 text-sm">
                        Heute: {number(current.value)}
                        {h.dailyTarget !== null
                          ? ` / ${number(h.dailyTarget)}`
                          : ""}{" "}
                        {h.unit ?? ""} ·{" "}
                        {h.dailyTarget === null
                          ? "Ohne Ziel"
                          : current.completed
                            ? "Ziel erreicht"
                            : "Ziel offen"}
                      </p>
                      <div aria-label="30-Tage-Muster" className="flex gap-1">
                        {days.map((d) => (
                          <span
                            key={d.date}
                            title={`${d.date}: ${number(d.value)} ${h.unit ?? ""}`}
                            className={`h-3 min-w-0 flex-1 rounded-sm ${d.value > 0 ? "bg-[var(--accent-cyan)]" : "bg-[var(--surface-3)]"}`}
                          />
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-[var(--text-muted)]">
                        7 Tage:{" "}
                        {number(
                          days.slice(-7).reduce((s, d) => s + d.value, 0),
                        )}{" "}
                        {h.unit ?? ""} · 30 Tage:{" "}
                        {number(days.reduce((s, d) => s + d.value, 0))}{" "}
                        {h.unit ?? ""}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {last
                          ? `Zuletzt im Zeitraum: ${last.localDate}`
                          : "Kein Eintrag in den letzten 30 Tagen"}
                      </p>
                    </Link>
                  </article>
                );
              })}
            </div>
            {!snapshot?.habits.length && (
              <p className={healthMuted}>
                Noch keine Habits. Neue Habits und tägliche Einträge findest du
                im Dashboard.
              </p>
            )}
          </HealthSection>{" "}
          {habit && !habit.archivedAt && data.canWrite && (
            <HealthSection title="Habit verwalten">
              <details>
                <summary className="cursor-pointer text-sm font-semibold">
                  Bearbeiten · {habit.name}
                </summary>
                <form
                  action={updateHabitAction}
                  className="mt-4 grid gap-3"
                  data-habits-section="management"
                >
                  <input name="habitId" type="hidden" value={habit.id} />
                  <HabitFields habit={habit} />
                  <button className={buttonClass}>Habit speichern</button>
                </form>
                <form action={archiveHabitAction} className="mt-3">
                  <input name="habitId" type="hidden" value={habit.id} />
                  <button className={buttonClass}>Habit archivieren</button>
                </form>
              </details>
            </HealthSection>
          )}
          <HealthSection title="Tageszeiten">
            <div className="grid gap-3 sm:grid-cols-3">
              {snapshot &&
                Object.entries(windows).map(([key, label]) => {
                  const ids = new Set(
                    snapshot.habits
                      .filter((h) => h.window === key && !h.archivedAt)
                      .map((h) => h.id),
                  );
                  const days = new Set(
                    snapshot.logs
                      .filter(
                        (l) =>
                          ids.has(l.habitId) &&
                          !l.archivedAt &&
                          l.localDate >= shiftDay(data.today, -29),
                      )
                      .map((l) => l.localDate),
                  );
                  return (
                    <div key={key}>
                      <p className="text-sm font-semibold">{label}</p>
                      <p className={healthMuted}>
                        {ids.size} Habits · {days.size} aktive Tage
                      </p>
                    </div>
                  );
                })}
            </div>
            <p className="mt-3 text-xs text-[var(--text-muted)]">
              Letzte 30 Tage, nach aktueller Habit-Zuordnung. Zeitfenster und
              schnelle Einträge im Dashboard.
            </p>
          </HealthSection>
        </div>
        <div className="grid min-w-0 gap-4">
          <HealthSection
            title={habit ? `Verlauf · ${habit.name}` : "Ausgewähltes Habit"}
          >
            {habit && snapshot ? (
              <div data-habits-section="selected">
                <nav
                  aria-label="Habit Zeitraum"
                  className="mb-4 flex flex-wrap gap-2"
                >
                  {[
                    ["day", "Tag"],
                    ["week", "Woche"],
                    ["month", "Monat"],
                  ].map(([value, label]) => (
                    <Link
                      key={value}
                      className={buttonClass}
                      aria-current={
                        (count === 1
                          ? "day"
                          : count === 7
                            ? "week"
                            : "month") === value
                          ? "page"
                          : undefined
                      }
                      href={href(habit.id, value)}
                    >
                      {label}
                    </Link>
                  ))}
                </nav>
                <p className="mb-3 text-sm text-[var(--text-secondary)]">
                  {windows[habit.window]} ·{" "}
                  {count === 30
                    ? "Letzte 30 Tage"
                    : count === 7
                      ? "Letzte 7 Tage"
                      : "Heute"}{" "}
                  ·{" "}
                  {habit.dailyTarget === null
                    ? "Werte ohne Completion"
                    : `Vergleich mit aktuellem Ziel: ${number(habit.dailyTarget)} ${habit.unit ?? ""}`}
                </p>
                <div
                  className="overflow-x-auto"
                  tabIndex={0}
                  aria-label="Habit Tageswerte"
                >
                  <div
                    className={
                      count === 1
                        ? "grid max-w-56 gap-2"
                        : "grid min-w-[560px] grid-cols-7 gap-2"
                    }
                  >
                    {habitDays(
                      habit,
                      snapshot.logs,
                      data.today,
                      count,
                      snapshot.settings.timezone,
                    ).map((d) => (
                      <div
                        key={d.date}
                        className="min-w-0 rounded-lg border border-[var(--border-subtle)] p-2"
                        data-habit-date={d.date}
                      >
                        <p className="text-xs text-[var(--text-muted)]">
                          {d.date.slice(8)}.{d.date.slice(5, 7)}.
                        </p>
                        <p className="mt-2 break-words text-sm font-semibold">
                          {number(d.value)}
                          {habit.dailyTarget !== null
                            ? ` / ${number(habit.dailyTarget)}`
                            : ""}{" "}
                          {habit.unit ?? ""}
                        </p>
                        <p className="mt-1 text-[10px] text-[var(--text-secondary)]">
                          {!d.eligible && !d.logs
                            ? "Vor Erstellung"
                            : habit.dailyTarget === null
                              ? d.logs
                                ? "Aktivität"
                                : "Kein Eintrag"
                              : d.completed
                                ? "Zielvergleich erfüllt"
                                : d.logs
                                  ? "Aktivität · unter Ziel"
                                  : "Kein Eintrag"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="mt-3 text-xs text-[var(--text-muted)]">
                  Farbe zeigt Aktivität. Frühere Ziele sind nicht gespeichert;
                  der Zielvergleich verwendet das aktuelle Tagesziel.
                </p>
              </div>
            ) : (
              <p className={healthMuted}>
                Wähle ein Habit, um seine Tageswerte zu sehen.
              </p>
            )}
          </HealthSection>
        </div>
      </div>
    </main>
  );
}
