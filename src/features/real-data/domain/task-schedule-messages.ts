// Runtime-neutral feedback for the Task time path (Planner Queue / Inspector).

const dayLabel = (plannedDate: string, today: string) => {
  if (plannedDate === today) return "heute";
  // Date-only value: format at UTC noon so no timezone can shift the day.
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${plannedDate}T12:00:00Z`));
};

export function taskScheduledMessage(
  mode: "plan" | "schedule",
  plannedDate: string,
  today: string,
) {
  return `Task für ${dayLabel(plannedDate, today)} ${mode === "schedule" ? "terminiert" : "geplant"}.`;
}

const verbs = {
  schedule: "geplant",
  reschedule: "umgeplant",
  unschedule: "entterminiert",
} as const;

export function taskTimeWriteFailedMessage(operation: keyof typeof verbs) {
  return `Der Task konnte nicht ${verbs[operation]} werden. Er wurde möglicherweise inzwischen geändert, abgeschlossen oder archiviert. Lade die Ansicht neu.`;
}
