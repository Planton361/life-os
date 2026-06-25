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
      message:
        auth.error === "missing_env"
          ? "Supabase ist lokal noch nicht konfiguriert."
          : "Melde dich an, um Inbox-Einträge zu speichern.",
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
      message:
        auth.error === "missing_env"
          ? "Supabase ist lokal noch nicht konfiguriert."
          : "Melde dich an, um Inbox-Einträge zu triagieren.",
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

  revalidatePath("/inbox");

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
