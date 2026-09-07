"use server";

import { revalidatePath } from "next/cache";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { createAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";
import {
  archiveJournalEntryInputSchema,
  createJournalEntryInputSchema,
  updateJournalEntryInputSchema,
} from "../schemas/life.schemas";
import { createSupabaseLifeRepository } from "../supabase/repositories/supabase-life-repository";
import type { JournalActionResult } from "@/features/life/journal/journal-model";

const value = (data: FormData, key: string) =>
  typeof data.get(key) === "string" ? String(data.get(key)).trim() : "";
function refreshJournal() {
  revalidatePath("/life/journal");
  revalidatePath("/life");
}
async function authContext() {
  if ((await getCurrentLifeOsProfileId()) !== "manual") return null;
  const auth = await createAuthenticatedSupabaseServerClient();
  return auth.ok ? auth : null;
}
export async function saveJournalEntryAction(
  data: FormData,
): Promise<JournalActionResult> {
  const auth = await authContext();
  if (!auth)
    return { ok: false, message: "Bitte melde dich im manuellen Profil an." };
  const id = value(data, "journalEntryId");
  const input = {
    body: value(data, "body"),
    entryDate: value(data, "entryDate"),
    title: value(data, "title"),
    journalEntryId: id,
  };
  const parsed = id
    ? updateJournalEntryInputSchema.safeParse(input)
    : createJournalEntryInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: "Bitte prüfe Datum, Inhalt und Titel (höchstens 200 Zeichen).",
    };
  try {
    const repository = createSupabaseLifeRepository(auth.client);
    const result = id
      ? await repository.updateJournalEntry(auth.user.id, {
          ...parsed.data,
          journalEntryId: id,
        })
      : await repository.createJournalEntry(auth.user.id, parsed.data);
    if (!result.ok)
      return {
        ok: false,
        message:
          "Der Eintrag konnte nicht gespeichert werden. Er ist möglicherweise nicht mehr verfügbar.",
      };
    refreshJournal();
    return {
      ok: true,
      id: result.data.id,
      message: id
        ? "Journal-Eintrag gespeichert."
        : "Journal-Eintrag erstellt.",
    };
  } catch {
    return {
      ok: false,
      message: "Speichern nicht möglich. Bitte versuche es erneut.",
    };
  }
}
export async function archiveJournalEntryAction(
  data: FormData,
): Promise<JournalActionResult> {
  const auth = await authContext();
  if (!auth)
    return { ok: false, message: "Bitte melde dich im manuellen Profil an." };
  const parsed = archiveJournalEntryInputSchema.safeParse({
    journalEntryId: value(data, "journalEntryId"),
  });
  if (!parsed.success)
    return { ok: false, message: "Dieser Eintrag ist nicht verfügbar." };
  try {
    const result = await createSupabaseLifeRepository(
      auth.client,
    ).archiveJournalEntry(auth.user.id, parsed.data.journalEntryId);
    if (!result.ok)
      return {
        ok: false,
        message:
          "Der Eintrag konnte nicht archiviert werden. Er ist möglicherweise nicht mehr verfügbar.",
      };
    refreshJournal();
    return {
      ok: true,
      id: parsed.data.journalEntryId,
      message: "Journal-Eintrag archiviert.",
    };
  } catch {
    return {
      ok: false,
      message: "Archivieren nicht möglich. Bitte versuche es erneut.",
    };
  }
}
