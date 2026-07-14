"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  archiveJournalEntryInputSchema,
  createJournalEntryInputSchema,
  createLifeNoteInputSchema,
  lifeNoteLifecycleInputSchema,
  updateJournalEntryInputSchema,
  updateLifeNoteInputSchema,
} from "../schemas/life.schemas";
import { createSupabaseLifeRepository } from "../supabase/repositories/supabase-life-repository";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { createAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";

function value(formData: FormData, key: string) {
  const item = formData.get(key);
  return typeof item === "string" ? item.trim() : "";
}

function revalidateLife() {
  revalidatePath("/life");
  revalidatePath("/life/journal");
  revalidatePath("/life/notes");
  revalidatePath("/resources");
  revalidatePath("/portfolio");
}

function destination(path: "/life/journal" | "/life/notes", state: string, selected?: string): never {
  const params = new URLSearchParams({ state });
  if (selected) params.set("selected", selected);
  redirect(`${path}?${params.toString()}`);
}

async function context(path: "/life/journal" | "/life/notes") {
  if (await getCurrentLifeOsProfileId() !== "manual") destination(path, "auth_blocked");
  const auth = await createAuthenticatedSupabaseServerClient();
  if (!auth.ok) destination(path, "auth_blocked");
  return auth;
}

function journalInput(formData: FormData) {
  return { body: value(formData, "body"), entryDate: value(formData, "entryDate"), title: value(formData, "title") };
}

function noteInput(formData: FormData) {
  return { body: value(formData, "body"), title: value(formData, "title") };
}

export async function createJournalEntryFormAction(formData: FormData) {
  const auth = await context("/life/journal");
  const parsed = createJournalEntryInputSchema.safeParse(journalInput(formData));
  if (!parsed.success) destination("/life/journal", "invalid");
  const result = await createSupabaseLifeRepository(auth.client).createJournalEntry(auth.user.id, parsed.data);
  if (!result.ok) destination("/life/journal", "error");
  revalidateLife();
  destination("/life/journal", "created", result.data.id);
}

export async function updateJournalEntryFormAction(formData: FormData) {
  const auth = await context("/life/journal");
  const parsed = updateJournalEntryInputSchema.safeParse({ ...journalInput(formData), journalEntryId: value(formData, "journalEntryId") });
  if (!parsed.success) destination("/life/journal", "invalid");
  const result = await createSupabaseLifeRepository(auth.client).updateJournalEntry(auth.user.id, parsed.data);
  if (!result.ok) destination("/life/journal", "error", parsed.data.journalEntryId);
  revalidateLife();
  destination("/life/journal", "updated", result.data.id);
}

export async function archiveJournalEntryFormAction(formData: FormData) {
  const auth = await context("/life/journal");
  const parsed = archiveJournalEntryInputSchema.safeParse({ journalEntryId: value(formData, "journalEntryId") });
  if (!parsed.success) destination("/life/journal", "invalid");
  const result = await createSupabaseLifeRepository(auth.client).archiveJournalEntry(auth.user.id, parsed.data.journalEntryId);
  if (!result.ok) destination("/life/journal", "error", parsed.data.journalEntryId);
  revalidateLife();
  destination("/life/journal", "archived", parsed.data.journalEntryId);
}

export async function createLifeNoteFormAction(formData: FormData) {
  const auth = await context("/life/notes");
  const parsed = createLifeNoteInputSchema.safeParse(noteInput(formData));
  if (!parsed.success) destination("/life/notes", "invalid");
  const result = await createSupabaseLifeRepository(auth.client).createNote(auth.user.id, parsed.data);
  if (!result.ok) destination("/life/notes", "error");
  revalidateLife();
  destination("/life/notes", "created", result.data.id);
}

export async function updateLifeNoteFormAction(formData: FormData) {
  const auth = await context("/life/notes");
  const parsed = updateLifeNoteInputSchema.safeParse({ ...noteInput(formData), resourceId: value(formData, "resourceId") });
  if (!parsed.success) destination("/life/notes", "invalid");
  const result = await createSupabaseLifeRepository(auth.client).updateNote(auth.user.id, parsed.data.resourceId, parsed.data);
  if (!result.ok) destination("/life/notes", "error", parsed.data.resourceId);
  revalidateLife();
  destination("/life/notes", "updated", parsed.data.resourceId);
}

async function noteLifecycle(formData: FormData, archived: boolean) {
  const auth = await context("/life/notes");
  const parsed = lifeNoteLifecycleInputSchema.safeParse({ resourceId: value(formData, "resourceId") });
  if (!parsed.success) destination("/life/notes", "invalid");
  const result = await createSupabaseLifeRepository(auth.client).setNoteArchived(auth.user.id, parsed.data.resourceId, archived);
  if (!result.ok) destination("/life/notes", "error", parsed.data.resourceId);
  revalidateLife();
  destination("/life/notes", archived ? "archived" : "restored", parsed.data.resourceId);
}

export async function archiveLifeNoteFormAction(formData: FormData) { await noteLifecycle(formData, true); }
export async function restoreLifeNoteFormAction(formData: FormData) { await noteLifecycle(formData, false); }
