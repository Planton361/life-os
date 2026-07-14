"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { createAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";
import {
  antiRotActionIdSchema,
  antiRotActionInputSchema,
  antiRotRecommendationSchema,
  updateAntiRotActionInputSchema,
} from "../schemas/anti-rot.schemas";
import { createSupabaseAntiRotRepository } from "../supabase/repositories/supabase-anti-rot-repository";
function value(data: FormData, key: string) {
  const item = data.get(key);
  return typeof item === "string" ? item.trim() : "";
}
function finish(state: string): never {
  revalidatePath("/challenges");
  redirect(`/challenges?state=${encodeURIComponent(state)}`);
}
async function context() {
  if ((await getCurrentLifeOsProfileId()) !== "manual") finish("auth_blocked");
  const auth = await createAuthenticatedSupabaseServerClient();
  if (!auth.ok) finish("auth_blocked");
  return {
    repository: createSupabaseAntiRotRepository(auth.client),
    userId: auth.user.id,
  };
}
function input(data: FormData) {
  return {
    category: value(data, "category"),
    description: value(data, "description"),
    energy: value(data, "energy"),
    estimatedMinutes: value(data, "estimatedMinutes"),
    title: value(data, "title"),
  };
}
export async function createAntiRotAction(data: FormData) {
  const parsed = antiRotActionInputSchema.safeParse(input(data));
  if (!parsed.success) finish("anti_rot_invalid");
  const { repository, userId } = await context();
  finish(
    (await repository.create(userId, parsed.data)).ok
      ? "anti_rot_created"
      : "anti_rot_error",
  );
}
export async function updateAntiRotAction(data: FormData) {
  const parsed = updateAntiRotActionInputSchema.safeParse({
    ...input(data),
    actionId: value(data, "actionId"),
  });
  if (!parsed.success) finish("anti_rot_invalid");
  const { repository, userId } = await context();
  finish(
    (await repository.update(userId, parsed.data)).ok
      ? "anti_rot_updated"
      : "anti_rot_error",
  );
}
async function idContext(data: FormData) {
  const parsed = antiRotActionIdSchema.safeParse({
    actionId: value(data, "actionId"),
  });
  if (!parsed.success) finish("anti_rot_invalid");
  return { ...(await context()), actionId: parsed.data.actionId };
}
export async function pauseAntiRotAction(data: FormData) {
  const { repository, userId, actionId } = await idContext(data);
  finish(
    (await repository.setStatus(userId, actionId, "paused"))
      ? "anti_rot_paused"
      : "anti_rot_resolve_first",
  );
}
export async function reactivateAntiRotAction(data: FormData) {
  const { repository, userId, actionId } = await idContext(data);
  finish(
    (await repository.setStatus(userId, actionId, "active"))
      ? "anti_rot_reactivated"
      : "anti_rot_error",
  );
}
export async function archiveAntiRotAction(data: FormData) {
  const { repository, userId, actionId } = await idContext(data);
  finish(
    (await repository.archive(userId, actionId))
      ? "anti_rot_archived"
      : "anti_rot_resolve_first",
  );
}
export async function restoreAntiRotAction(data: FormData) {
  const { repository, userId, actionId } = await idContext(data);
  finish(
    (await repository.restore(userId, actionId))
      ? "anti_rot_restored"
      : "anti_rot_error",
  );
}
export async function rotateAntiRotAction() {
  const { repository } = await context();
  finish(
    (await repository.rotate()).ok ? "anti_rot_recommended" : "anti_rot_empty",
  );
}
async function resolve(data: FormData, eventType: "completed" | "skipped") {
  const parsed = antiRotRecommendationSchema.safeParse({
    recommendationEventId: value(data, "recommendationEventId"),
  });
  if (!parsed.success) finish("anti_rot_invalid");
  const { repository } = await context();
  finish(
    (await repository.resolve(parsed.data.recommendationEventId, eventType)).ok
      ? `anti_rot_${eventType}`
      : "anti_rot_error",
  );
}
export async function completeAntiRotRecommendation(data: FormData) {
  return resolve(data, "completed");
}
export async function skipAntiRotRecommendation(data: FormData) {
  return resolve(data, "skipped");
}
