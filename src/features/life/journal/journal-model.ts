import type { JournalEntry } from "../../real-data/domain/life";

export type JournalMode =
  | "manual"
  | "demo"
  | "empty"
  | "auth-blocked"
  | "error";
export type JournalActionResult = { ok: boolean; message: string; id?: string };
export type JournalQuery = {
  q: string;
  period: string;
  archived: boolean;
  selected: string;
  panel: string;
};
export function journalQuery(params: {
  get: (name: string) => string | null;
}): JournalQuery {
  return {
    q: params.get("q")?.trim() ?? "",
    period: ["today", "week", "month"].includes(params.get("period") ?? "")
      ? params.get("period")!
      : "all",
    archived: params.get("view") === "archived",
    selected: params.get("selected") ?? "",
    panel: ["new", "detail", "edit", "archive"].includes(
      params.get("panel") ?? "",
    )
      ? params.get("panel")!
      : "",
  };
}
export function journalHref(
  params: { toString: () => string },
  patch: Record<string, string | null>,
) {
  const next = new URLSearchParams(params.toString());
  for (const [key, value] of Object.entries(patch)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }
  next.delete("state");
  return `/life/journal${next.size ? `?${next}` : ""}`;
}
function daysBefore(day: string, offset: number) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}
export function journalTitle(entry: JournalEntry) {
  return (
    entry.title ||
    entry.body
      .split(/\r?\n/)
      .find((line) => line.trim())
      ?.trim() ||
    "Ohne Titel"
  );
}
export function journalHistory(
  entries: readonly JournalEntry[],
  query: JournalQuery,
  today: string,
) {
  const lower =
    query.period === "today"
      ? today
      : query.period === "week"
        ? daysBefore(today, 6)
        : query.period === "month"
          ? `${today.slice(0, 7)}-01`
          : "";
  const needle = query.q.toLocaleLowerCase("de-DE");
  return entries
    .filter(
      (entry) =>
        Boolean(entry.archivedAt) === query.archived &&
        (!lower || (entry.entryDate >= lower && entry.entryDate <= today)) &&
        (!needle ||
          `${entry.title ?? ""}\n${entry.body}`
            .toLocaleLowerCase("de-DE")
            .includes(needle)),
    )
    .sort(
      (a, b) =>
        b.entryDate.localeCompare(a.entryDate) ||
        b.createdAt.localeCompare(a.createdAt) ||
        b.id.localeCompare(a.id),
    );
}
export function journalSummary(
  entries: readonly JournalEntry[],
  today: string,
) {
  const active = entries.filter(
    (entry) => !entry.archivedAt && entry.entryDate <= today,
  );
  const week = active.filter(
    (entry) => entry.entryDate >= daysBefore(today, 6),
  );
  return {
    today: active.filter((entry) => entry.entryDate === today).length,
    week: week.length,
    days: new Set(week.map((entry) => entry.entryDate)).size,
    month: active.filter((entry) =>
      entry.entryDate.startsWith(today.slice(0, 7)),
    ).length,
  };
}
export function journalDate(day: string) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T12:00:00Z`));
}
