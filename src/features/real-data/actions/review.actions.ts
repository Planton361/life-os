"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { saveReviewInputSchema, type ReviewKind } from "@/features/real-data";
import { createSupabaseReviewRepository } from "@/features/real-data/supabase";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { createAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";
import {
  reviewTimeZone,
  reviewToday,
  reviewWeek,
} from "@/features/review/review-period";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function formLines(formData: FormData, key: string) {
  return formString(formData, key)
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function reviewPath(kind: ReviewKind, state: "blocked" | "error" | "saved") {
  return `/review/${kind}?review=${state}`;
}

function revalidateReviewProjections() {
  revalidatePath("/review/daily");
  revalidatePath("/review/weekly");
  revalidatePath("/dashboard");
  revalidatePath("/today");
  revalidatePath("/calendar");
}

async function saveReview(
  kind: ReviewKind,
  formData: FormData,
): Promise<never> {
  const profileId = await getCurrentLifeOsProfileId();
  if (profileId !== "manual") redirect(reviewPath(kind, "blocked"));

  const auth = await createAuthenticatedSupabaseServerClient();
  if (!auth.ok) redirect(reviewPath(kind, "blocked"));

  const today = reviewToday();
  const week = reviewWeek(today);
  const parsed = saveReviewInputSchema.safeParse({
    blockers: formLines(formData, "blockers"),
    carryTaskIds:
      kind === "daily"
        ? formData
            .getAll("carryTaskIds")
            .filter((value): value is string => typeof value === "string")
        : [],
    kind,
    nextPeriodFocus: formString(formData, "nextPeriodFocus") || undefined,
    openLoops: formLines(formData, "openLoops"),
    outcome: formString(formData, "outcome") || undefined,
    periodEnd: kind === "daily" ? today : week.end,
    periodStart: kind === "daily" ? today : week.start,
    planningNote: formString(formData, "planningNote") || undefined,
    status: formString(formData, "status") || "draft",
    timezone: reviewTimeZone,
    wins: formLines(formData, "wins"),
  });

  if (!parsed.success) redirect(reviewPath(kind, "error"));

  const result = await createSupabaseReviewRepository(auth.client).saveReview({
    ...parsed.data,
    profileId: auth.user.id,
    userId: auth.user.id,
  });

  if (!result.ok) redirect(reviewPath(kind, "error"));

  revalidateReviewProjections();
  redirect(reviewPath(kind, "saved"));
}

export async function saveDailyReviewFormAction(formData: FormData) {
  return saveReview("daily", formData);
}

export async function saveWeeklyReviewFormAction(formData: FormData) {
  return saveReview("weekly", formData);
}
