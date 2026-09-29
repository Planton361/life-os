"use server";

import { revalidatePath } from "next/cache";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { createAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";
import type { FormResult } from "@/features/entities/workbench/types";
import { projectDepthCommandSchema } from "../schemas/project-depth.schemas";
import { writeProjectDepth } from "../supabase/repositories/project-depth-repository";

export async function projectDepthAction(input: unknown): Promise<FormResult> {
  if ((await getCurrentLifeOsProfileId()) !== "manual") {
    return { status: "blocked", message: "Bitte ins Manual-Profil wechseln." };
  }
  const auth = await createAuthenticatedSupabaseServerClient();
  if (!auth.ok) return { status: "blocked", message: "Bitte im Manual-Profil anmelden." };
  const parsed = projectDepthCommandSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Prüfe die Project-Angaben." };
  const bytes = Buffer.byteLength(JSON.stringify(parsed.data.payload), "utf8");
  if (bytes > 1048576) return { status: "error", message: "Die Review-Eingabe ist zu groß." };
  const result = await writeProjectDepth(auth.client, {
    projectId: parsed.data.projectId,
    commandId: parsed.data.commandId,
    operation: parsed.data.operation,
    expectedRevision: parsed.data.expectedRevision,
    expectedCycle: parsed.data.expectedCycle,
    payload: parsed.data.payload,
  });
  if (!result.ok) return { status: "error", message: result.message };
  for (const path of [
    `/projects/${parsed.data.projectId}`, "/projects", "/portfolio",
    "/dashboard", "/today", "/calendar", "/goals",
    "/work", "/education", "/coding",
  ]) revalidatePath(path);
  revalidatePath("/goals/[goalId]", "page");
  return { status: "success", message: "Project-Änderung gespeichert." };
}
