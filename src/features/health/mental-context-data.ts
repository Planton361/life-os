import "server-only";
import { createAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { createSupabaseReviewRepository } from "@/features/real-data/supabase/repositories/supabase-review-repository";
import { dashboardLocalDate } from "@/features/dashboard/dashboard-read-model";
import { shiftDay } from "./habits/habit-analytics";
import type { ReviewRecord } from "@/features/real-data/domain/review";
export async function getMentalReflectionContext(): Promise<{
  reviews: readonly ReviewRecord[];
  available: boolean;
}> {
  if ((await getCurrentLifeOsProfileId()) !== "manual")
    return { reviews: [], available: false };
  const auth = await createAuthenticatedSupabaseServerClient();
  if (!auth.ok) return { reviews: [], available: false };
  const today = dashboardLocalDate();
  const result = await createSupabaseReviewRepository(
    auth.client,
  ).getReviewsInRange(auth.user.id, auth.user.id, shiftDay(today, -29), today);
  return { reviews: result.ok ? result.data : [], available: result.ok };
}
