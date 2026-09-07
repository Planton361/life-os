import { HealthFeedback } from "./components/health-feedback";
import Link from "next/link";
import type { HealthTrackingData } from "./health-tracking";
import { sleepLabel } from "./health-tracking";
import type { getMentalReflectionContext } from "./mental-context-data";
import { SleepTrackingPanel } from "./components/health-tracking-panel";
import {
  HealthHeader,
  HealthSection,
  healthPage,
  healthButton,
  healthMuted,
} from "./components/health-detail-primitives";
import { dashboardLocalDate } from "@/features/dashboard/dashboard-read-model";
import { shiftDay } from "./habits/habit-analytics";
const moods = {
  calm: "Ruhig",
  content: "Zufrieden",
  focused: "Fokussiert",
  tired: "Müde",
  anxious: "Ängstlich",
  stressed: "Gestresst",
  happy: "Fröhlich",
};
export function MentalContextPage({
  data,
  reflection,
  status,
}: {
  data: HealthTrackingData;
  reflection: Awaited<ReturnType<typeof getMentalReflectionContext>>;
  status?: string;
}) {
  const entries = data.snapshot?.moods ?? [];
  const latest = entries[0];
  const sleep = data.snapshot?.sleep ?? [];
  const today = dashboardLocalDate();
  const days = Array.from({ length: 7 }, (_, i) => shiftDay(today, i - 6));
  return (
    <main className={healthPage} data-health-detail="mental">
      <HealthHeader
        domain="Mental"
        title="Mental Health"
        summary="Stimmung, Schlaf und Reflexion im Zusammenhang deiner letzten Tage."
      />
      {data.profileId === "manual" &&
        (!data.authAvailable || !data.snapshot) && (
          <p role="alert">
            {data.authAvailable
              ? "Health-Daten konnten nicht geladen werden."
              : "Melde dich lokal an, um deine Einträge zu sehen."}
          </p>
        )}
      {data.profileId !== "manual" && (
        <p className={healthMuted}>
          {data.profileId === "demo"
            ? "Demo-Profil · Beispielansichten sind getrennt von deinen persönlichen Einträgen."
            : "Leeres Profil · noch keine persönlichen Einträge."}
        </p>
      )}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <HealthSection title="Aktueller Zustand">
          <p className="text-3xl font-semibold text-[var(--accent-purple)]">
            {latest ? moods[latest.mood] : "Noch kein Check-in"}
          </p>
          {latest && (
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {latest.localDate === today ? "Heute" : "Zuletzt"} ·{" "}
              {new Intl.DateTimeFormat("de-DE", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: latest.timezone,
              }).format(new Date(latest.recordedAt))}
            </p>
          )}
          <Link className={`${healthButton} mt-4`} href="/dashboard">
            Mood im Dashboard erfassen
          </Link>
        </HealthSection>
        <HealthSection title="Schlaf & Erholung">
          <p className="text-3xl font-semibold">
            {sleep[0]
              ? sleepLabel(sleep[0].durationMinutes)
              : "Noch kein Schlafeintrag"}
          </p>
          {sleep[0] && (
            <>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {sleep[0].sleepDate} ·{" "}
                {sleep[0].quality
                  ? `Eigene Einschätzung ${sleep[0].quality}/5`
                  : "Ohne Qualitätseinschätzung"}
              </p>
              {sleep[0].note && (
                <p className={`${healthMuted} mt-2`}>{sleep[0].note}</p>
              )}
            </>
          )}
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-semibold">
              Schlaf erfassen & Verlauf öffnen
            </summary>
            <div className="mt-3">
              <SleepTrackingPanel data={data} status={status} />
            </div>
          </details>
          <HealthFeedback
            state={status}

            message={
              status === "saved"
                ? "Schlafeintrag gespeichert."
                : "Schlafeintrag konnte nicht gespeichert werden."
            }
          />
        </HealthSection>
        <HealthSection title="Mood im Verlauf">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {days.map((date) => {
              const values = entries.filter((e) => e.localDate === date);
              return (
                <div
                  key={date}
                  className="rounded-lg border border-[var(--border-subtle)] p-3"
                >
                  <p className="text-xs text-[var(--text-muted)]">{date}</p>
                  <p className="mt-2 text-sm font-semibold">
                    {values[0] ? moods[values[0].mood] : "—"}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {values.length
                      ? `${values.length} Check-ins`
                      : "Kein Eintrag im Verlauf"}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            Letzter Check-in je Tag aus den letzten 30 Einträgen. Keine
            numerische Bewertung der Stimmung.
          </p>
          {entries.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-semibold">
                Mood-Historie öffnen · {entries.length} Einträge
              </summary>
              <ol className="mt-3 grid gap-2">
                {entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-wrap justify-between gap-2 border-b border-[var(--border-subtle)] py-2 text-sm"
                  >
                    <span>{moods[entry.mood]}</span>
                    <time dateTime={entry.recordedAt}>
                      {new Intl.DateTimeFormat("de-DE", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: entry.timezone,
                      }).format(new Date(entry.recordedAt))}
                    </time>
                  </li>
                ))}
              </ol>
            </details>
          )}
        </HealthSection>
        <HealthSection title="Reflexion & Journal">
          {reflection.reviews.length ? (
            <>
              <p className="mb-3 text-sm">
                {
                  reflection.reviews.filter((r) => r.status === "completed")
                    .length
                }{" "}
                abgeschlossene Reviews in den letzten 30 Tagen
              </p>
              <div className="grid gap-2">
                {reflection.reviews.slice(0, 7).map((review) => (
                  <details
                    key={review.id}
                    className="rounded-lg border border-[var(--border-subtle)] p-3 text-sm"
                  >
                    <summary className="cursor-pointer font-semibold">
                      {review.kind === "daily" ? "Tagesreview" : "Wochenreview"}{" "}
                      · {review.periodStart} ·{" "}
                      {review.status === "completed"
                        ? "Abgeschlossen"
                        : "Entwurf"}
                    </summary>
                    {[...review.wins, ...review.blockers, ...review.openLoops]
                      .length > 0 && (
                      <div className="mt-2 grid gap-2">
                        {[
                          ["Gelungen", review.wins],
                          ["Hindernisse", review.blockers],
                          ["Offene Themen", review.openLoops],
                        ].map(([label, values]) => (
                          <p
                            className="text-sm text-[var(--text-secondary)]"
                            key={String(label)}
                          >
                            {String(label)}:{" "}
                            {(values as readonly string[]).join(" · ") || "—"}
                          </p>
                        ))}
                      </div>
                    )}
                    {review.nextPeriodFocus && (
                      <p className="mt-2 text-sm">
                        Nächster Fokus: {review.nextPeriodFocus}
                      </p>
                    )}
                    {review.outcome && (
                      <p className="mt-1 line-clamp-2 text-[var(--text-secondary)]">
                        {review.outcome}
                      </p>
                    )}
                  </details>
                ))}
              </div>
            </>
          ) : (
            <p className={healthMuted}>
              {reflection.available
                ? "Noch keine Reviews in den letzten 30 Tagen."
                : "Review-Kontext ist in diesem Profil nicht verfügbar."}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className={healthButton} href="/review/daily">
              Tagesreview
            </Link>
            <Link className={healthButton} href="/review/weekly">
              Wochenreview
            </Link>
            <Link className={healthButton} href="/life/journal">
              Journal öffnen
            </Link>
          </div>
        </HealthSection>
      </div>
      <HealthSection title="Die letzten Tage im Kontext">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-7">
          {days.map((date) => {
            const mood = entries.find((e) => e.localDate === date);
            const night = sleep.find((e) => e.sleepDate === date);
            const reviews = reflection.reviews.filter(
              (r) => r.kind === "daily" && r.periodStart === date,
            );
            return (
              <div
                key={date}
                className="rounded-lg border border-[var(--border-subtle)] p-3 text-xs"
              >
                <p className="mb-2 font-semibold">{date}</p>
                <p>Stimmung: {mood ? moods[mood.mood] : "—"}</p>
                <p className="mt-1">
                  Schlaf: {night ? sleepLabel(night.durationMinutes) : "—"}
                </p>
                <p className="mt-1">
                  Review:{" "}
                  {reviews.length
                    ? reviews[0].status === "completed"
                      ? "Abgeschlossen"
                      : "Entwurf"
                    : "—"}
                </p>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Persönliche Aufzeichnungen zur Orientierung. Fehlende Einträge
          erlauben keine Aussage über deinen Zustand.
        </p>
      </HealthSection>
    </main>
  );
}
