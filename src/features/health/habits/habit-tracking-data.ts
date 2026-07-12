import "server-only";

import type { HabitSnapshot } from "@/features/real-data";
import { localDateInTimeZone } from "@/features/real-data";
import { createSupabaseHabitRepository } from "@/features/real-data/supabase";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { createAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";

export type HabitTrackingPageData = {
  profileId: "empty" | "manual";
  canWrite: boolean;
  blockedReason?: string;
  snapshot: HabitSnapshot | null;
  today: string;
};

function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function getHabitTrackingPageData(): Promise<HabitTrackingPageData> {
  const profileId = await getCurrentLifeOsProfileId();
  if (profileId !== "manual") {
    return {
      canWrite: false,
      profileId: "empty",
      snapshot: null,
      today: new Date().toISOString().slice(0, 10),
    };
  }

  const auth = await createAuthenticatedSupabaseServerClient();
  if (!auth.ok) {
    return {
      blockedReason:
        "Melde dich lokal an, um Habits zu verwalten und zu protokollieren.",
      canWrite: false,
      profileId: "manual",
      snapshot: null,
      today: new Date().toISOString().slice(0, 10),
    };
  }

  const repository = createSupabaseHabitRepository(auth.client);
  if (!(await repository.ensureProfile(auth.user.id, auth.user.id))) {
    return {
      blockedReason: "Das lokale Profil konnte nicht vorbereitet werden.",
      canWrite: false,
      profileId: "manual",
      snapshot: null,
      today: new Date().toISOString().slice(0, 10),
    };
  }
  const settings = await repository.getSettings(auth.user.id, auth.user.id);
  if (!settings) {
    return {
      blockedReason: "Habit-Zeitfenster konnten nicht geladen werden.",
      canWrite: false,
      profileId: "manual",
      snapshot: null,
      today: new Date().toISOString().slice(0, 10),
    };
  }
  const today = localDateInTimeZone(new Date(), settings.timezone);
  const snapshot = await repository.getSnapshot(
    auth.user.id,
    auth.user.id,
    addDays(today, -29),
    today,
  );
  return {
    blockedReason: snapshot.ok
      ? undefined
      : "Habit-Daten konnten nicht geladen werden.",
    canWrite: snapshot.ok,
    profileId: "manual",
    snapshot: snapshot.ok ? snapshot.data : null,
    today,
  };
}
