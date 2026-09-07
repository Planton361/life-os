import { resolveContentStateMeta } from "../content-state";
import type { HealthSnapshot } from "../real-data/domain/health";
import type { ReviewRecord } from "../real-data/domain/review";
import type { TrainingSnapshot } from "../real-data/domain/training";
import type { HealthOverviewViewModel } from "./types";
import { shiftDay } from "./habits/habit-analytics";
const moodNames = {
  calm: "Ruhig",
  content: "Zufrieden",
  focused: "Fokussiert",
  tired: "Müde",
  anxious: "Ängstlich",
  stressed: "Gestresst",
  happy: "Fröhlich",
};
const duration = (minutes: number) =>
  `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
/** Bind existing overview panels to canonical facts without changing their composition. */
export function projectHealthOverviewFacts(
  view: HealthOverviewViewModel,
  health: HealthSnapshot | null,
  reviews: readonly ReviewRecord[],
  training: TrainingSnapshot | null,
  today: string,
): HealthOverviewViewModel {
  const dates = Array.from({ length: 7 }, (_, i) => shiftDay(today, i - 6));
  const moods = health?.moods.filter((e) => dates.includes(e.localDate)) ?? [];
  const sleep = health?.sleep.filter((e) => dates.includes(e.sleepDate)) ?? [];
  const reflection = reviews.filter((r) => r.status === "completed");
  const sessions =
    training?.strengthSessions.filter(
      (s) => !s.archivedAt && s.status === "completed",
    ) ?? [];
  const days = Array.from({ length: 14 }, (_, i) => shiftDay(today, i - 13));
  const counts = days.map(
    (date) => sessions.filter((s) => s.sessionDate === date).length,
  );
  const max = Math.max(1, ...counts);
  const mentalCount = moods.length + sleep.length + reflection.length;
  return {
    ...view,
    contentStates: {
      ...view.contentStates,
      mentalHealth: resolveContentStateMeta({
        capacity: 3,
        itemCount: mentalCount,
      }),
      page: resolveContentStateMeta({
        capacity: 5,
        itemCount:
          mentalCount +
          (training?.runningSessions.filter(
            (s) => !s.archivedAt && s.status === "completed",
          ).length ?? 0) +
          sessions.length +
          (Number(view.habits.metrics[0]?.value) || 0),
      }),
    },
    mentalHealth: {
      ...view.mentalHealth,
      badge: health?.moods[0] ? moodNames[health.moods[0].mood] : "Self-check",
      moodDirections: Object.entries(moodNames)
        .filter(([mood]) => moods.some((e) => e.mood === mood))
        .map(([mood, label]) => ({
          label,
          mark: "●",
          accent: "var(--accent-purple)" as const,
          daysLabel: `${new Set(moods.filter((e) => e.mood === mood).map((e) => e.localDate)).size} Tage`,
          pattern: dates.map((date) =>
            moods.some((e) => e.localDate === date && e.mood === mood),
          ),
        })),
      sleep: {
        ...view.mentalHealth.sleep,
        value: sleep.length
          ? duration(
              Math.round(
                sleep.reduce((sum, e) => sum + e.durationMinutes, 0) /
                  sleep.length,
              ),
            )
          : "—",
        detail: sleep.length
          ? `${sleep.length} erfasste Nächte · letzte 7 Tage`
          : "Noch keine Schlafdaten",
        bars: sleep.length
          ? dates.map((date) => {
              const entry = sleep.find((e) => e.sleepDate === date);
              return {
                day: date.slice(5),
                label: entry ? duration(entry.durationMinutes) : "Kein Eintrag",
                value: entry ? entry.durationMinutes / 1440 : 0,
              };
            })
          : [],
      },
      journal: {
        ...view.mentalHealth.journal,
        value: reflection.length
          ? `${reflection.length} Reviews · 30 Tage`
          : "—",
        pattern: dates.map((date) =>
          reflection.some((r) => r.periodStart === date),
        ),
      },
    },
    habits: {
      ...view.habits,
      heatmap: {
        ...view.habits.heatmap,
        title: "Habit-Aktivität · letzte 30 Tage",
      },
    },
    strength: {
      ...view.strength,
      trainingPattern: {
        ...view.strength.trainingPattern,
        days: counts.some(Boolean)
          ? days.map((date, i) => ({
              day: date.slice(5),
              label: `${counts[i]} Sessions`,
              intensity: counts[i] / max,
              accent: "var(--accent-red)" as const,
            }))
          : [],
        note: "Abgeschlossene Sessions je Tag · Balken relativ zum höchsten Tageswert.",
      },
      sessionBalance: {
        ...view.strength.sessionBalance,
        items: sessions.length
          ? [
              {
                label: "Mit Plan",
                count: sessions.filter((s) => s.planId !== null).length,
                accent: "var(--accent-red)",
              },
              {
                label: "Frei",
                count: sessions.filter((s) => s.planId === null).length,
                accent: "var(--accent-cyan)",
              },
            ]
          : [],
      },
    },
  };
}
