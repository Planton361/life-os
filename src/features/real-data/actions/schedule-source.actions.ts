"use server";

import { revalidatePath } from "next/cache";
import { scheduleSourceInputSchema } from "../schemas/schedule-source.schema";
import { createSupabaseScheduleSourceRepository } from "../supabase/repositories/supabase-schedule-source-repository";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { createAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";

function value(formData: FormData, key: string) {
  const candidate = formData.get(key);
  return typeof candidate === "string" ? candidate.trim() : "";
}

function revalidateScheduleProjections() {
  for (const path of ["/calendar", "/today", "/dashboard", "/nutrition", "/nutrition/meal-planner", "/review/daily", "/review/weekly"]) revalidatePath(path);
}

export async function scheduleSourceFormAction(formData: FormData) {
  if ((await getCurrentLifeOsProfileId()) !== "manual") return;
  const auth = await createAuthenticatedSupabaseServerClient();
  if (!auth.ok) return;
  const plannedDate = value(formData, "plannedDate");
  const scheduledTime = value(formData, "scheduledTime") || "12:00";
  const rawStart = value(formData, "scheduledStartAt");
  const scheduledStartAt = rawStart || new Date(`${plannedDate}T${scheduledTime}:00+02:00`).toISOString();
  const parsed = scheduleSourceInputSchema.safeParse({
    durationMinutes: value(formData, "durationMinutes"),
    plannedDate,
    scheduledStartAt,
    sourceId: value(formData, "sourceId"),
    sourceType: value(formData, "sourceType"),
  });
  if (!parsed.success) return;
  const result = await createSupabaseScheduleSourceRepository(auth.client).schedule(parsed.data);
  if (!result.error) revalidateScheduleProjections();
}
