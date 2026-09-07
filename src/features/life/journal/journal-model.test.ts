import { describe, expect, it } from "vitest";
import {
  journalHistory,
  journalHref,
  journalQuery,
  journalSummary,
  journalTitle,
} from "./journal-model";
import {
  createJournalEntryInputSchema,
  updateJournalEntryInputSchema,
} from "../../real-data/schemas/life.schemas";
import type { JournalEntry } from "../../real-data/domain/life";
const entry = (
  id: string,
  entryDate: string,
  patch: Partial<JournalEntry> = {},
): JournalEntry => ({
  id,
  entryDate,
  title: null,
  body: "Erste Zeile\nReflexion zum Projekt",
  archivedAt: null,
  createdAt: `${entryDate}T10:00:00Z`,
  updatedAt: `${entryDate}T10:00:00Z`,
  ...patch,
});
const today = "2026-03-02";
const entries = [
  entry("old", "2026-02-23"),
  entry("week", "2026-02-24"),
  entry("month", "2026-03-01"),
  entry("today", today),
  entry("same-day", today),
  entry("future", "2026-03-03"),
  entry("archive", today, { archivedAt: `${today}T13:00:00Z` }),
];
const query = (search: string) => journalQuery(new URLSearchParams(search));
describe("Journal chronology and real counts", () => {
  it("uses entry date, includes the six prior calendar days and excludes archived/future entries from current counts", () => {
    expect(journalSummary(entries, today)).toEqual({
      today: 2,
      week: 4,
      days: 3,
      month: 3,
    });
    expect(
      journalHistory(entries, query("period=week"), today).map((e) => e.id),
    ).toEqual(["today", "same-day", "month", "week"]);
  });
  it("orders by date, creation instant then stable ID; later edits do not move an entry", () => {
    expect(
      journalHistory(
        [
          entry("a", today),
          entry("b", today, { createdAt: `${today}T11:00:00Z` }),
          entry("old", "2026-01-01", { updatedAt: `${today}T12:00:00Z` }),
        ],
        query(""),
        today,
      ).map((e) => e.id),
    ).toEqual(["b", "a", "old"]);
  });
  it("searches title and body case-insensitively, handles blank titles and never mutates the collection", () => {
    const data = [
      entry("a", today),
      entry("b", today, { title: "Abendgedanken", body: "Ruhe" }),
    ];
    expect(
      journalHistory(data, query("q=PROJEKT"), today).map((e) => e.id),
    ).toEqual(["a"]);
    expect(
      journalHistory(data, query("q=abend"), today).map((e) => e.id),
    ).toEqual(["b"]);
    expect(data.map((e) => e.id)).toEqual(["a", "b"]);
    expect(journalTitle(data[0])).toBe("Erste Zeile");
  });
  it("separates archive, real period filters and zero state", () => {
    expect(
      journalHistory(entries, query("view=archived"), today).map((e) => e.id),
    ).toEqual(["archive"]);
    expect(journalHistory(entries, query("period=month"), today)).toHaveLength(
      3,
    );
    expect(journalHistory(entries, query("period=today"), today)).toHaveLength(
      2,
    );
    expect(journalSummary([], today)).toEqual({
      today: 0,
      week: 0,
      days: 0,
      month: 0,
    });
  });
  it("normalizes URL state and preserves context for entry details", () => {
    expect(query("period=fake&panel=delete&view=unknown")).toMatchObject({
      period: "all",
      panel: "",
      archived: false,
    });
    expect(
      journalHref(new URLSearchParams("q=Gedanke&state=created"), {
        selected: "a",
        panel: "detail",
      }),
    ).toBe("/life/journal?q=Gedanke&selected=a&panel=detail");
  });
  it("keeps canonical optional titles, validates real dates/body and ownership target IDs", () => {
    expect(
      createJournalEntryInputSchema.safeParse({
        entryDate: today,
        title: "",
        body: "Ein Gedanke",
      }).data?.title,
    ).toBeNull();
    for (const input of [
      { entryDate: "2026-02-30", body: "Text", title: "" },
      { entryDate: today, body: "   ", title: "" },
      { entryDate: today, body: "Text", title: "x".repeat(201) },
    ])
      expect(createJournalEntryInputSchema.safeParse(input).success).toBe(
        false,
      );
    expect(
      updateJournalEntryInputSchema.safeParse({
        entryDate: today,
        body: "Text",
        title: "",
        journalEntryId: "foreign",
      }).success,
    ).toBe(false);
  });
});
