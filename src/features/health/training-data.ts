import "server-only";
import type { TrainingSnapshot } from "@/features/real-data";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { createAuthenticatedApplicationContext } from "@/features/real-data/runtime/application-context";

const empty: TrainingSnapshot = { runningPlans: [], runningPlanItems: [], runningSessions: [], exercises: [], strengthPlans: [], strengthPlanItems: [], strengthSessions: [], strengthSetLogs: [] };

export async function getTrainingPageData() {
  const profileId = await getCurrentLifeOsProfileId();
  if (profileId !== "manual") return { mode: profileId as "demo" | "empty", snapshot: empty, scheduleLinks: [] };
  const auth = await createAuthenticatedApplicationContext();
  if (!auth.ok) return { mode: "auth-blocked" as const, snapshot: empty, scheduleLinks: [] };
  const [result, links] = await Promise.all([auth.repositories.training.getSnapshot(auth.user.id), auth.repositories.scheduling.getLinks(auth.user.id)]);
  return result.ok ? { mode: "manual" as const, snapshot: result.data, scheduleLinks: links.error ? [] : (links.data ?? []) } : { mode: "auth-blocked" as const, snapshot: empty, scheduleLinks: [] };
}
