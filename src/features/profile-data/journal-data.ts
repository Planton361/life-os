import "server-only";
import { getCurrentLifeOsProfileId } from "./profile-cookie";
import { createAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseLifeRepository } from "@/features/real-data/supabase/repositories/supabase-life-repository";
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
  const auth = await createAuthenticatedSupabaseServerClient();
  if (!auth.ok) return { entries: [], today, mode: "auth-blocked" };
  try {
    const [entries, timezone] = await Promise.all([
      createSupabaseLifeRepository(auth.client).getJournalEntries(auth.user.id),
      auth.client
        .from("profiles")
        .select("timezone")
        .eq("id", auth.user.id)
        .maybeSingle(),
    ]);
    if (timezone.error) throw new Error("Profile unavailable");
    return {
      entries,
      mode: "manual",
      today: localDateInTimeZone(
        new Date(),
        timezone.data?.timezone ?? "Europe/Berlin",
      ),
    };
  } catch {
    return { entries: [], today, mode: "error" };
  }
}
