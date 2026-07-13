export type EducationLog = {
  archivedAt: string | null;
  createdAt: string;
  durationMinutes: number;
  focus: string;
  id: string;
  logDate: string;
  logType: "learning" | "writing";
  notes: string | null;
  outcome: string;
  projectId: string;
  startTime: string | null;
  unitsCompleted: number | null;
  wordCountDelta: number | null;
};

export type EducationLogSignal = { count: number; durationMinutes: number; unitsCompleted: number; wordCountDelta: number };

function localDateOffset(today: string, days: number) {
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export function sortEducationLogs(logs: readonly EducationLog[]) {
  return [...logs].sort((left, right) =>
    `${right.logDate}|${right.startTime ?? ""}|${right.createdAt}|${right.id}`.localeCompare(
      `${left.logDate}|${left.startTime ?? ""}|${left.createdAt}|${left.id}`,
    ));
}

export function educationLogSignal(logs: readonly EducationLog[], today: string, days: 7 | 30) {
  const earliest = localDateOffset(today, days - 1);
  return logs.filter((log) => !log.archivedAt && log.logDate >= earliest && log.logDate <= today).reduce<EducationLogSignal>((signal, log) => ({
    count: signal.count + 1,
    durationMinutes: signal.durationMinutes + log.durationMinutes,
    unitsCompleted: signal.unitsCompleted + (log.logType === "learning" ? log.unitsCompleted ?? 0 : 0),
    wordCountDelta: signal.wordCountDelta + (log.logType === "writing" ? log.wordCountDelta ?? 0 : 0),
  }), { count: 0, durationMinutes: 0, unitsCompleted: 0, wordCountDelta: 0 });
}
