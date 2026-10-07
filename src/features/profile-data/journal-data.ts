import "server-only";
import { getLifeRepository } from "@/features/real-data/runtime/facade";
import { getCurrentLifeOsProfileId } from "./profile-cookie";
import { createAuthenticatedApplicationContext } from "@/features/real-data/runtime/application-context";

import { localDateInTimeZone } from "@/features/real-data/domain/habit";
import type { JournalEntry } from "@/features/real-data/domain/life";
import type { JournalMode } from "@/features/life/journal/journal-model";

export async function getJournalData(): Promise<{
  entries: JournalEntry[];
  today: string;
  mode: JournalMode;
}> {
  const profile = await getCurrentLifeOsProfileId();
  const today = localDateInTimeZone(new Date(), "Europe/Berlin");
  if (profile === "empty") return { entries: [], today, mode: "empty" };
  if (profile === "demo") {
    const { journalEntries } = await import("@/features/life/mock-life-data");
    return {
      today,
      mode: "demo",
      entries: journalEntries.map((entry) => ({
        id: entry.id,
        entryDate: entry.date.slice(0, 10),
        title: entry.title,
        body: entry.body,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        archivedAt: null,
      })),
    };
  }
  const auth = await createAuthenticatedApplicationContext();
  if (!auth.ok) return { entries: [], today, mode: "auth-blocked" };
  try {
    const [entries, timezone] = await Promise.all([
      getLifeRepository(auth.data).getJournalEntries(auth.user.id),
      auth.data.reads.profileTimezone(),
    ]);
    return {
      entries,
      mode: "manual",
      today: localDateInTimeZone(
        new Date(),
        timezone,
      ),
    };
  } catch {
    return { entries: [], today, mode: "error" };
  }
}
