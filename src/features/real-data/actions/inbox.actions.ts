"use server";

import { revalidatePath } from "next/cache";
import {
  captureInboxItemInputSchema,
  triageInboxItemToTaskInputSchema,
} from "@/features/real-data";
import {
  createSupabaseInboxRepository,
  createSupabaseInboxTriageTransaction,
} from "@/features/real-data/supabase";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { createAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";

export type InboxCaptureActionResult = {
  inboxItemId?: string;
  message: string;
  status: "blocked" | "error" | "success";
};

export type InboxTriageActionResult = {
  inboxItemId?: string;
  message: string;
  status: "blocked" | "error" | "success";
  taskId?: string;
};

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function revalidateInboxCaptureRoutes() {
  revalidatePath("/inbox");
  revalidatePath("/dashboard");
  revalidatePath("/today");
}

function revalidateInboxTriageRoutes() {
  revalidatePath("/inbox");
  revalidatePath("/portfolio");
  revalidatePath("/today");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
}

function authBlockedMessage(
  error: "auth_error" | "invalid_session" | "missing_env" | "unauthenticated",
  actionLabel: string,
) {
  if (error === "missing_env") {
    return "Supabase ist lokal noch nicht konfiguriert.";
  }

  if (error === "invalid_session") {
    return "Die Supabase Session ist ungültig. Setze sie in den Settings zurück und melde dich neu an.";
  }

  if (error === "auth_error") {
    return "Supabase Auth konnte die Session nicht prüfen. Setze sie in den Settings zurück.";
  }

  return `Melde dich an, um Inbox-Einträge zu ${actionLabel}.`;
}

export async function captureInboxItemAction(
  formData: FormData,
): Promise<InboxCaptureActionResult> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId !== "manual") {
    revalidatePath("/inbox");

    return {
      message: "Wechsle ins Manual-Profil, um Inbox-Einträge zu speichern.",
      status: "blocked",
    };
  }

  const auth = await createAuthenticatedSupabaseServerClient();

  if (!auth.ok) {
    return {
      message: authBlockedMessage(auth.error, "speichern"),
      status: "blocked",
    };
  }

  const title = formString(formData, "title");
  const body = formString(formData, "note");
  const fallbackTitle = body.split(/\s+/).slice(0, 9).join(" ");

  const parsed = captureInboxItemInputSchema.safeParse({
    body: body || undefined,
    profileId: auth.user.id,
    source: "inbox.quick_capture",
    title: title || fallbackTitle,
    type: formString(formData, "type") || "note",
    userId: auth.user.id,
  });

  if (!parsed.success) {
    return {
      message: "Erfasse zuerst einen gültigen Inbox-Eintrag.",
      status: "error",
    };
  }

  const repository = createSupabaseInboxRepository(auth.client);
  const result = await repository.createInboxItem(parsed.data);

  if (!result.ok) {
    return {
      message: "Der Inbox-Eintrag konnte nicht gespeichert werden.",
      status: "error",
    };
  }

  revalidateInboxCaptureRoutes();

  return {
    inboxItemId: result.data.id,
    message: "Gespeichert. Der Eintrag liegt in der Inbox.",
    status: "success",
  };
}

export async function captureInboxItemFormAction(
  formData: FormData,
): Promise<void> {
  await captureInboxItemAction(formData);
}

export async function triageInboxItemToTaskAction(
  formData: FormData,
): Promise<InboxTriageActionResult> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId !== "manual") {
    revalidatePath("/inbox");

    return {
      message: "Wechsle ins Manual-Profil, um Inbox-Einträge zu triagieren.",
      status: "blocked",
    };
  }

  const auth = await createAuthenticatedSupabaseServerClient();

  if (!auth.ok) {
    return {
      message: authBlockedMessage(auth.error, "triagieren"),
      status: "blocked",
    };
  }

  const parsed = triageInboxItemToTaskInputSchema.safeParse({
    description: formString(formData, "description") || undefined,
    inboxItemId: formString(formData, "inboxItemId"),
    profileId: auth.user.id,
    title: formString(formData, "title"),
    userId: auth.user.id,
  });

  if (!parsed.success) {
    return {
      message: "Der Inbox-Eintrag konnte nicht als Task angelegt werden.",
      status: "error",
    };
  }

  const triageTransaction = createSupabaseInboxTriageTransaction(auth.client);
  const result = await triageTransaction(parsed.data);

  if (!result.ok) {
    return {
      message: "Der Task konnte nicht aus dem Inbox-Eintrag erstellt werden.",
      status: "error",
    };
  }

  revalidateInboxTriageRoutes();

  return {
    inboxItemId: result.data.inboxItem.id,
    message: "Task erstellt.",
    status: "success",
    taskId: result.data.task.id,
  };
}

export async function triageInboxItemToTaskFormAction(
  formData: FormData,
): Promise<void> {
  await triageInboxItemToTaskAction(formData);
}
