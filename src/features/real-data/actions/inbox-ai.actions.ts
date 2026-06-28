"use server";

import { createMockInboxAISuggestion } from "@/features/inbox/ai/mock-inbox-ai-suggestion-provider";
import type { InboxAISuggestionActionResult } from "@/features/inbox/ai/inbox-ai-suggestion.types";
import { createSupabaseInboxRepository } from "@/features/real-data/supabase";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { createAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function authBlockedMessage(
  error: "auth_error" | "invalid_session" | "missing_env" | "unauthenticated",
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

  return "Melde dich an, um einen AI Vorschlag zu erzeugen.";
}

export async function suggestInboxRouteAction(
  _previousState: InboxAISuggestionActionResult | null,
  formData: FormData,
): Promise<InboxAISuggestionActionResult> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId !== "manual") {
    return {
      message: "Wechsle ins Manual-Profil, um echte Inbox-Vorschläge zu erzeugen.",
      status: "blocked",
    };
  }

  const auth = await createAuthenticatedSupabaseServerClient();

  if (!auth.ok) {
    return {
      message: authBlockedMessage(auth.error),
      status: "blocked",
    };
  }

  const inboxItemId = formString(formData, "inboxItemId");

  if (!inboxItemId) {
    return {
      message: "Wähle zuerst einen Inbox-Eintrag aus.",
      status: "error",
    };
  }

  const repository = createSupabaseInboxRepository(auth.client);
  const inboxItems = await repository.getInboxItemsByUser(
    auth.user.id,
    auth.user.id,
  );

  if (!inboxItems.ok) {
    return {
      message: "Inbox-Eintrag konnte nicht gelesen werden.",
      status: "error",
    };
  }

  const inboxItem = inboxItems.data.find((item) => item.id === inboxItemId);

  if (!inboxItem) {
    return {
      message: "Inbox-Eintrag wurde nicht im aktuellen User-Scope gefunden.",
      status: "error",
    };
  }

  return {
    message: "AI Vorschlag erzeugt. Prüfe ihn vor der Übernahme.",
    status: "success",
    suggestion: createMockInboxAISuggestion({
      body: inboxItem.body,
      title: inboxItem.title,
      type: inboxItem.type,
    }),
  };
}
