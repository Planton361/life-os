import "server-only";
import type { TrainingSnapshot } from "@/features/real-data";
import { createSupabaseScheduleSourceRepository, createSupabaseTrainingRepository } from "@/features/real-data/supabase";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { createAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";

const empty: TrainingSnapshot = { runningPlans: [], runningPlanItems: [], runningSessions: [], exercises: [], strengthPlans: [], strengthPlanItems: [], strengthSessions: [], strengthSetLogs: [] };

export async function getTrainingPageData() {
  const profileId = await getCurrentLifeOsProfileId();
  if (profileId !== "manual") return { mode: profileId as "demo" | "empty", snapshot: empty, scheduleLinks: [] };
  const auth = await createAuthenticatedSupabaseServerClient();
  if (!auth.ok) return { mode: "auth-blocked" as const, snapshot: empty, scheduleLinks: [] };
  const [result, links] = await Promise.all([createSupabaseTrainingRepository(auth.client).getSnapshot(auth.user.id), createSupabaseScheduleSourceRepository(auth.client).getLinks(auth.user.id)]);
  return result.ok ? { mode: "manual" as const, snapshot: result.data, scheduleLinks: links.error ? [] : (links.data ?? []) } : { mode: "auth-blocked" as const, snapshot: empty, scheduleLinks: [] };
}
