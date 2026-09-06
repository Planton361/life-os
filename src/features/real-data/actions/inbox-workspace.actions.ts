"use server";

import { revalidatePath } from "next/cache";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { createAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";
import {
  inboxClarificationSchema,
  inboxCompletionSchema,
  inboxRouteSchema,
} from "../schemas/inbox-workspace.schemas";
import { createInboxWorkspaceRepository } from "../supabase/repositories/supabase-inbox-workspace-repository";

export type InboxWorkspaceResult = {
  status: "success" | "error" | "blocked";
  message: string;
  updatedAt?: string;
  href?: string;
};
async function context() {
  if ((await getCurrentLifeOsProfileId()) !== "manual") return null;
  const auth = await createAuthenticatedSupabaseServerClient();
  return auth.ok ? auth : null;
}
function failure(code?: string): InboxWorkspaceResult {
  return {
    status: "error",
    message:
      code === "PT409"
        ? "Dieser Eintrag wurde inzwischen geändert. Deine Eingaben bleiben erhalten. Lade den aktuellen Stand vor dem erneuten Speichern."
        : "Der Eintrag oder sein Ziel ist nicht mehr verfügbar. Es wurde nichts übernommen.",
  };
}
function refresh() {
  for (const path of [
    "/inbox",
    "/dashboard",
    "/today",
    "/calendar",
    "/portfolio",
    "/tasks",
    "/projects",
    "/goals",
    "/resources",
    "/skills",
  ])
    revalidatePath(path);
}
export async function saveInboxClarificationAction(
  input: unknown,
): Promise<InboxWorkspaceResult> {
  const auth = await context();
  if (!auth)
    return {
      status: "blocked",
      message:
        "Melde dich im Manual-Profil an, um Inbox-Einträge zu speichern.",
    };
  const parsed = inboxClarificationSchema.safeParse(input);
  if (!parsed.success)
    return {
      status: "error",
      message:
        "Prüfe Titel, Datum und Planning Signals. Titel: 2–500 Zeichen; Dauer: 1–10080 Minuten.",
    };
  const result = await createInboxWorkspaceRepository(
    auth.client,
    auth.user.id,
  ).save(parsed.data);
  if (result.error || !result.data) return failure(result.error?.code);
  refresh();
  return {
    status: "success",
    message: "Inbox-Eintrag gespeichert.",
    updatedAt: result.data.updated_at,
  };
}
export async function routeSavedInboxItemAction(
  input: unknown,
): Promise<InboxWorkspaceResult> {
  const auth = await context();
  if (!auth)
    return {
      status: "blocked",
      message:
        "Melde dich im Manual-Profil an, um Inbox-Einträge zu verarbeiten.",
    };
  const parsed = inboxRouteSchema.safeParse(input);
  if (!parsed.success)
    return {
      status: "error",
      message:
        "Wähle eine gültige Route und gegebenenfalls ein bestehendes Ziel.",
    };
  const result = await createInboxWorkspaceRepository(
    auth.client,
    auth.user.id,
  ).route(parsed.data);
  if (result.error || !result.data) return failure(result.error?.code);
  const target = result.data as { kind: string; id: string | null };
  const href =
    target.kind === "resource"
      ? `/resources?selected=${target.id}`
      : target.kind === "task"
        ? `/portfolio?view=tasks&selected=${target.id}`
        : target.kind === "project"
          ? `/portfolio?view=projects&selected=${target.id}`
          : target.kind === "goal"
            ? `/portfolio?view=goals&selected=${target.id}`
            : undefined;
  refresh();
  return {
    status: "success",
    message:
      target.kind === "archive"
        ? "Inbox-Eintrag abgeschlossen."
        : "Gedanke zugeordnet.",
    href,
  };
}

export async function completeInboxTriageAction(
  input: unknown,
): Promise<InboxWorkspaceResult> {
  const auth = await context();
  if (!auth)
    return {
      status: "blocked",
      message:
        "Melde dich im Manual-Profil an, um Inbox-Einträge zu verarbeiten.",
    };
  const parsed = inboxCompletionSchema.safeParse(input);
  if (!parsed.success)
    return {
      status: "error",
      message:
        "Prüfe Titel, Planning Signals, Route und gegebenenfalls das bestehende Ziel.",
    };
  const result = await createInboxWorkspaceRepository(
    auth.client,
    auth.user.id,
  ).complete(parsed.data);
  if (result.error || !result.data) return failure(result.error?.code);
  const target = result.data as { kind: string; id: string | null };
  const href =
    target.kind === "resource"
      ? `/resources?selected=${target.id}`
      : target.kind === "task"
        ? `/portfolio?view=tasks&selected=${target.id}`
        : target.kind === "project"
          ? `/portfolio?view=projects&selected=${target.id}`
          : target.kind === "goal"
            ? `/portfolio?view=goals&selected=${target.id}`
            : undefined;
  refresh();
  return {
    status: "success",
    message:
      target.kind === "archive"
        ? "Inbox-Eintrag abgeschlossen."
        : "Gedanke gespeichert und zugeordnet.",
    href,
  };
}
