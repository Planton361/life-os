"use server";

import { revalidatePath } from "next/cache";
import {
  archiveInboxItemInputSchema,
  captureInboxItemInputSchema,
  createResourceInputSchema,
  triageInboxItemToTaskInputSchema,
} from "@/features/real-data";
import {
  createSupabaseInboxRepository,
  createSupabaseInboxResourceTransaction,
  createSupabaseInboxTriageTransaction,
} from "@/features/real-data/supabase";
import { routeSavedInboxItemAction } from "./inbox-workspace.actions";
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

export type InboxArchiveActionResult = {
  inboxItemId?: string;
  message: string;
  status: "blocked" | "error" | "success";
};

export type InboxResourceActionResult = {
  inboxItemId?: string;
  message: string;
  resourceId?: string;
  status: "blocked" | "error" | "success";
};

export type InboxCreateNewActionResult = {
  goalId?: string;
  inboxItemId?: string;
  message: string;
  projectId?: string;
  status: "blocked" | "error" | "success";
};

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalFormString(formData: FormData, key: string) {
  return formString(formData, key) || undefined;
}

function optionalFormNumber(formData: FormData, key: string) {
  const value = Number(formString(formData, key));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

const appTimeZone = "Europe/Berlin";

function localDateLabel(date = new Date(), timeZone = appTimeZone) {
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date);
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? "00";

  return `${part("year")}-${part("month")}-${part("day")}`;
}

function taskDescriptionFromDraft(formData: FormData) {
  const description = formString(formData, "description");
  const nextAction = formString(formData, "nextAction");

  if (!nextAction) return description || undefined;
  if (!description) return `Nächste Aktion: ${nextAction}`;

  return `${description}\n\nNächste Aktion: ${nextAction}`;
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

function revalidateInboxArchiveRoutes() {
  revalidatePath("/inbox");
  revalidatePath("/dashboard");
  revalidatePath("/today");
}

function revalidateInboxResourceRoutes() {
  revalidatePath("/inbox");
  revalidatePath("/resources");
  revalidatePath("/dashboard");
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
    areaId: optionalFormString(formData, "areaId"),
    description: taskDescriptionFromDraft(formData),
    durationMinutes: optionalFormNumber(formData, "durationMinutes"),
    energy: optionalFormString(formData, "energy"),
    goalId: optionalFormString(formData, "goalId"),
    inboxItemId: formString(formData, "inboxItemId"),
    plannedDate:
      formString(formData, "planToday") === "on" ? localDateLabel() : undefined,
    profileId: auth.user.id,
    priority: optionalFormString(formData, "priority"),
    projectId: optionalFormString(formData, "projectId"),
    skillId: optionalFormString(formData, "skillId"),
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

export async function archiveInboxItemAction(
  formData: FormData,
): Promise<InboxArchiveActionResult> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId !== "manual") {
    revalidatePath("/inbox");

    return {
      message: "Wechsle ins Manual-Profil, um Inbox-Einträge abzuschließen.",
      status: "blocked",
    };
  }

  const auth = await createAuthenticatedSupabaseServerClient();

  if (!auth.ok) {
    return {
      message: authBlockedMessage(auth.error, "abzuschließen"),
      status: "blocked",
    };
  }

  const parsed = archiveInboxItemInputSchema.safeParse({
    inboxItemId: formString(formData, "inboxItemId"),
    profileId: auth.user.id,
    userId: auth.user.id,
  });

  if (!parsed.success) {
    return {
      message: "Der Inbox-Eintrag konnte nicht abgeschlossen werden.",
      status: "error",
    };
  }

  const repository = createSupabaseInboxRepository(auth.client);
  const result = await repository.archiveInboxItem(parsed.data);

  if (!result.ok) {
    return {
      message: "Der Inbox-Eintrag konnte nicht archiviert werden.",
      status: "error",
    };
  }

  revalidateInboxArchiveRoutes();

  return {
    inboxItemId: result.data.id,
    message: "Inbox-Eintrag abgeschlossen.",
    status: "success",
  };
}

export async function archiveInboxItemFormAction(
  formData: FormData,
): Promise<void> {
  await archiveInboxItemAction(formData);
}

export async function archiveInboxItemFormStateAction(
  _previousState: InboxArchiveActionResult | null,
  formData: FormData,
): Promise<InboxArchiveActionResult> {
  return archiveInboxItemAction(formData);
}

export async function createResourceFromInboxAction(
  formData: FormData,
): Promise<InboxResourceActionResult> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId !== "manual") {
    revalidatePath("/inbox");

    return {
      message: "Wechsle ins Manual-Profil, um Resources zu erstellen.",
      status: "blocked",
    };
  }

  const auth = await createAuthenticatedSupabaseServerClient();

  if (!auth.ok) {
    return {
      message: authBlockedMessage(auth.error, "als Resource zu speichern"),
      status: "blocked",
    };
  }

  const inboxItemId = formString(formData, "inboxItemId");
  const summary = formString(formData, "summary");
  const content = formString(formData, "content");
  const parsed = createResourceInputSchema.safeParse({
    body: [summary, content].filter(Boolean).join("\n\n") || undefined,
    profileId: auth.user.id,
    reviewNeeded: true,
    source: inboxItemId ? `inbox:${inboxItemId}` : "inbox.resource_draft",
    title: formString(formData, "title"),
    type: formString(formData, "type"),
    url: optionalFormString(formData, "url"),
    userId: auth.user.id,
  });

  if (!inboxItemId || !parsed.success) {
    return {
      message:
        "Der Inbox-Eintrag konnte nicht als Resource gespeichert werden.",
      status: "error",
    };
  }

  const resourceTransaction = createSupabaseInboxResourceTransaction(
    auth.client,
  );
  const resourceResult = await resourceTransaction({
    ...parsed.data,
    inboxItemId,
  });

  if (!resourceResult.ok) {
    return {
      message: "Resource konnte nicht gespeichert werden.",
      status: "error",
    };
  }

  revalidateInboxResourceRoutes();

  return {
    inboxItemId,
    message: "Resource erstellt.",
    resourceId: resourceResult.data.id,
    status: "success",
  };
}

export async function createResourceFromInboxFormStateAction(
  _previousState: InboxResourceActionResult | null,
  formData: FormData,
): Promise<InboxResourceActionResult> {
  return createResourceFromInboxAction(formData);
}

export async function createProjectFromInboxAction(
  formData: FormData,
): Promise<InboxCreateNewActionResult> {
  return routeExistingSavedCapture(formData, "project");
}

export async function createProjectFromInboxFormStateAction(
  _previousState: InboxCreateNewActionResult | null,
  formData: FormData,
): Promise<InboxCreateNewActionResult> {
  return createProjectFromInboxAction(formData);
}

export async function createGoalFromInboxAction(
  formData: FormData,
): Promise<InboxCreateNewActionResult> {
  return routeExistingSavedCapture(formData, "goal");
}

export async function createGoalFromInboxFormStateAction(
  _previousState: InboxCreateNewActionResult | null,
  formData: FormData,
): Promise<InboxCreateNewActionResult> {
  return createGoalFromInboxAction(formData);
}

// Retained compatibility entry points use the same atomic saved-item transaction.
// The removed draft surface is no longer a second source of entity fields.
async function routeExistingSavedCapture(
  formData: FormData,
  route: "project" | "goal",
): Promise<InboxCreateNewActionResult> {
  const auth = await createAuthenticatedSupabaseServerClient();
  if (!auth.ok)
    return {
      status: "blocked",
      message: authBlockedMessage(auth.error, "zuordnen"),
    };
  const parsed = archiveInboxItemInputSchema.safeParse({
    inboxItemId: formString(formData, "inboxItemId"),
    userId: auth.user.id,
    profileId: auth.user.id,
  });
  if (!parsed.success)
    return { status: "error", message: "Ungültiger Inbox-Eintrag." };
  const items = await createSupabaseInboxRepository(
    auth.client,
  ).getInboxItemsByUser(auth.user.id, auth.user.id);
  const item = items.ok
    ? items.data.find((item) => item.id === parsed.data.inboxItemId)
    : null;
  if (!item)
    return { status: "error", message: "Inbox-Eintrag nicht verfügbar." };
  const result = await routeSavedInboxItemAction({
    inboxItemId: item.id,
    expectedUpdatedAt: item.updatedAt,
    route,
    targetId: null,
  });
  const targetId = result.href
    ? (new URL(result.href, "http://localhost").searchParams.get("selected") ??
      undefined)
    : undefined;
  return {
    status: result.status,
    message: result.message,
    inboxItemId: item.id,
    ...(route === "project" ? { projectId: targetId } : { goalId: targetId }),
  };
}
