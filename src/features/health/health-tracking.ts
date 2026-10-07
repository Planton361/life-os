import "server-only";
import type { HealthSnapshot } from "@/features/real-data";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { createAuthenticatedApplicationContext } from "@/features/real-data/runtime/application-context";

export type HealthTrackingData = { profileId: "demo" | "empty" | "manual"; authAvailable: boolean; snapshot: HealthSnapshot | null };
export async function getHealthTrackingData(): Promise<HealthTrackingData> {
  const profileId = await getCurrentLifeOsProfileId();
  if (profileId !== "manual") return { profileId, authAvailable: false, snapshot: null };
  const auth = await createAuthenticatedApplicationContext();
  if (!auth.ok) return { profileId, authAvailable: false, snapshot: null };
  return { profileId, authAvailable: true, snapshot: await auth.repositories.health.getSnapshot(auth.user.id, auth.user.id) };
}

export function sleepLabel(minutes: number) { return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`; }
export function weightProgress(weights: HealthSnapshot["weights"], target: number) {
  if (!weights.length) return null;
  const current = weights[0].weightKg;
  const start = weights[weights.length - 1].weightKg;
  if (start === target) return { current, progress: current === target ? 100 : 0 };
  return { current, progress: Math.max(0, Math.min(100, Math.round(((start - current) / (start - target)) * 100))) };
}
