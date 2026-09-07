"use server";

import { saveJournalEntryAction, archiveJournalEntryAction } from "./journal.actions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  archiveJournalEntryInputSchema,
  createLifeNoteInputSchema,
  lifeNoteLifecycleInputSchema,
  updateLifeNoteInputSchema,
  entertainmentItemInputSchema,
  entertainmentItemLifecycleInputSchema,
  updateEntertainmentItemInputSchema,
  convertWishlistItemInputSchema,
  inventoryItemInputSchema,
  inventoryItemLifecycleInputSchema,
  purchaseDecisionInputSchema,
  purchaseDecisionLifecycleInputSchema,
  updateInventoryItemInputSchema,
  updatePurchaseDecisionInputSchema,
  updateWishlistItemInputSchema,
  wishlistItemInputSchema,
  wishlistItemLifecycleInputSchema,
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
  revalidatePath("/life/entertainment");
  revalidatePath("/life/entertainment/books");
  revalidatePath("/life/entertainment/movies");
  revalidatePath("/life/entertainment/series");
  revalidatePath("/life/entertainment/games");
  revalidatePath("/life/inventory");
}

type LifeActionPath = "/life/journal" | "/life/notes" | "/life/inventory" | "/life/entertainment" | "/life/entertainment/books" | "/life/entertainment/movies" | "/life/entertainment/series" | "/life/entertainment/games";

function destination(path: LifeActionPath, state: string, selected?: string): never {
  const params = new URLSearchParams({ state });
  if (selected) params.set("selected", selected);
  redirect(`${path}?${params.toString()}`);
}

async function context(path: LifeActionPath) {
  if (await getCurrentLifeOsProfileId() !== "manual") destination(path, "auth_blocked");
  const auth = await createAuthenticatedSupabaseServerClient();
  if (!auth.ok) destination(path, "auth_blocked");
  return auth;
}

function noteInput(formData: FormData) {
  return { body: value(formData, "body"), title: value(formData, "title") };
}

export async function createJournalEntryFormAction(formData: FormData) {
  formData.delete("journalEntryId");
  const result = await saveJournalEntryAction(formData);
  destination("/life/journal", result.ok ? "created" : "error", result.id);
}
export async function updateJournalEntryFormAction(formData: FormData) {
  if (!archiveJournalEntryInputSchema.safeParse({ journalEntryId: value(formData, "journalEntryId") }).success) destination("/life/journal", "invalid");
  const result = await saveJournalEntryAction(formData);
  destination("/life/journal", result.ok ? "updated" : "error", result.id);
}
export async function archiveJournalEntryFormAction(formData: FormData) {
  const result = await archiveJournalEntryAction(formData);
  destination("/life/journal", result.ok ? "archived" : "error", result.id);
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

function entertainmentPath(formData: FormData): LifeActionPath {
  const returnTo = value(formData, "returnTo");
  if (returnTo === "books" || returnTo === "movies" || returnTo === "series" || returnTo === "games") return `/life/entertainment/${returnTo}`;
  return "/life/entertainment";
}

function entertainmentInput(formData: FormData) {
  return {
    completedOn: value(formData, "completedOn"),
    creatorOrStudio: value(formData, "creatorOrStudio"),
    mediaType: value(formData, "mediaType"),
    notes: value(formData, "notes"),
    progressCurrent: value(formData, "progressCurrent"),
    progressTotal: value(formData, "progressTotal"),
    progressUnit: value(formData, "progressUnit"),
    rating: value(formData, "rating"),
    releaseYear: value(formData, "releaseYear"),
    startedOn: value(formData, "startedOn"),
    status: value(formData, "status"),
    title: value(formData, "title"),
  };
}

export async function createEntertainmentItemFormAction(formData: FormData) {
  const path = entertainmentPath(formData);
  const auth = await context(path);
  const parsed = entertainmentItemInputSchema.safeParse(entertainmentInput(formData));
  if (!parsed.success) destination(path, "invalid");
  const result = await createSupabaseLifeRepository(auth.client).createEntertainmentItem(auth.user.id, parsed.data);
  if (!result.ok) destination(path, "error");
  revalidateLife();
  destination(path, "created", result.data.id);
}

export async function updateEntertainmentItemFormAction(formData: FormData) {
  const path = entertainmentPath(formData);
  const auth = await context(path);
  const parsed = updateEntertainmentItemInputSchema.safeParse({ ...entertainmentInput(formData), entertainmentItemId: value(formData, "entertainmentItemId") });
  if (!parsed.success) destination(path, "invalid");
  const result = await createSupabaseLifeRepository(auth.client).updateEntertainmentItem(auth.user.id, parsed.data);
  if (!result.ok) destination(path, "error", parsed.data.entertainmentItemId);
  revalidateLife();
  destination(path, "updated", result.data.id);
}

async function entertainmentLifecycle(formData: FormData, archived: boolean) {
  const path = entertainmentPath(formData);
  const auth = await context(path);
  const parsed = entertainmentItemLifecycleInputSchema.safeParse({ entertainmentItemId: value(formData, "entertainmentItemId") });
  if (!parsed.success) destination(path, "invalid");
  const result = await createSupabaseLifeRepository(auth.client).setEntertainmentItemArchived(auth.user.id, parsed.data.entertainmentItemId, archived);
  if (!result.ok) destination(path, "error", parsed.data.entertainmentItemId);
  revalidateLife();
  destination(path, archived ? "archived" : "restored", parsed.data.entertainmentItemId);
}

export async function archiveEntertainmentItemFormAction(formData: FormData) { await entertainmentLifecycle(formData, true); }
export async function restoreEntertainmentItemFormAction(formData: FormData) { await entertainmentLifecycle(formData, false); }

function inventoryInput(formData: FormData) { return { acquiredOn: value(formData, "acquiredOn"), amount: value(formData, "amount"), category: value(formData, "category"), condition: value(formData, "condition"), currency: value(formData, "currency"), description: value(formData, "description"), location: value(formData, "location"), name: value(formData, "name"), quantity: value(formData, "quantity"), unit: value(formData, "unit") }; }
function wishlistInput(formData: FormData) { return { amount: value(formData, "amount"), category: value(formData, "category"), currency: value(formData, "currency"), description: value(formData, "description"), priority: value(formData, "priority"), status: value(formData, "status"), targetDate: value(formData, "targetDate"), title: value(formData, "title") }; }
function decisionInput(formData: FormData) { return { context: value(formData, "context"), criteria: value(formData, "criteria"), decision: value(formData, "decision"), decisionDate: value(formData, "decisionDate"), rationale: value(formData, "rationale"), status: value(formData, "status"), wishlistItemId: value(formData, "wishlistItemId") }; }

export async function createInventoryItemFormAction(formData: FormData) {
  const auth = await context("/life/inventory"); const parsed = inventoryItemInputSchema.safeParse(inventoryInput(formData));
  if (!parsed.success) destination("/life/inventory", "invalid"); const result = await createSupabaseLifeRepository(auth.client).createInventoryItem(auth.user.id, parsed.data);
  if (!result.ok) destination("/life/inventory", "error"); revalidateLife(); destination("/life/inventory", "inventory_created", result.data.id);
}
export async function updateInventoryItemFormAction(formData: FormData) {
  const auth = await context("/life/inventory"); const parsed = updateInventoryItemInputSchema.safeParse({ ...inventoryInput(formData), inventoryItemId: value(formData, "inventoryItemId") });
  if (!parsed.success) destination("/life/inventory", "invalid"); const result = await createSupabaseLifeRepository(auth.client).updateInventoryItem(auth.user.id, parsed.data);
  if (!result.ok) destination("/life/inventory", "error"); revalidateLife(); destination("/life/inventory", "inventory_updated", result.data.id);
}
async function inventoryLifecycle(formData: FormData, archived: boolean) {
  const auth = await context("/life/inventory"); const parsed = inventoryItemLifecycleInputSchema.safeParse({ inventoryItemId: value(formData, "inventoryItemId") });
  if (!parsed.success) destination("/life/inventory", "invalid"); const result = await createSupabaseLifeRepository(auth.client).setInventoryItemArchived(auth.user.id, parsed.data.inventoryItemId, archived);
  if (!result.ok) destination("/life/inventory", "error"); revalidateLife(); destination("/life/inventory", archived ? "inventory_archived" : "inventory_restored", parsed.data.inventoryItemId);
}
export async function archiveInventoryItemFormAction(formData: FormData) { await inventoryLifecycle(formData, true); }
export async function restoreInventoryItemFormAction(formData: FormData) { await inventoryLifecycle(formData, false); }

export async function createWishlistItemFormAction(formData: FormData) {
  const auth = await context("/life/inventory"); const parsed = wishlistItemInputSchema.safeParse(wishlistInput(formData));
  if (!parsed.success) destination("/life/inventory", "invalid"); const result = await createSupabaseLifeRepository(auth.client).createWishlistItem(auth.user.id, parsed.data);
  if (!result.ok) destination("/life/inventory", "error"); revalidateLife(); destination("/life/inventory", "wishlist_created", result.data.id);
}
export async function updateWishlistItemFormAction(formData: FormData) {
  const auth = await context("/life/inventory"); const parsed = updateWishlistItemInputSchema.safeParse({ ...wishlistInput(formData), wishlistItemId: value(formData, "wishlistItemId") });
  if (!parsed.success) destination("/life/inventory", "invalid"); const result = await createSupabaseLifeRepository(auth.client).updateWishlistItem(auth.user.id, parsed.data);
  if (!result.ok) destination("/life/inventory", "error"); revalidateLife(); destination("/life/inventory", "wishlist_updated", result.data.id);
}
async function wishlistLifecycle(formData: FormData, archived: boolean) {
  const auth = await context("/life/inventory"); const parsed = wishlistItemLifecycleInputSchema.safeParse({ wishlistItemId: value(formData, "wishlistItemId") });
  if (!parsed.success) destination("/life/inventory", "invalid"); const result = await createSupabaseLifeRepository(auth.client).setWishlistItemArchived(auth.user.id, parsed.data.wishlistItemId, archived);
  if (!result.ok) destination("/life/inventory", "error"); revalidateLife(); destination("/life/inventory", archived ? "wishlist_archived" : "wishlist_restored", parsed.data.wishlistItemId);
}
export async function archiveWishlistItemFormAction(formData: FormData) { await wishlistLifecycle(formData, true); }
export async function restoreWishlistItemFormAction(formData: FormData) { await wishlistLifecycle(formData, false); }

export async function createPurchaseDecisionFormAction(formData: FormData) {
  const auth = await context("/life/inventory"); const parsed = purchaseDecisionInputSchema.safeParse(decisionInput(formData));
  if (!parsed.success) destination("/life/inventory", "invalid"); const result = await createSupabaseLifeRepository(auth.client).createPurchaseDecision(auth.user.id, parsed.data);
  if (!result.ok) destination("/life/inventory", "error"); revalidateLife(); destination("/life/inventory", "decision_created", result.data.id);
}
export async function updatePurchaseDecisionFormAction(formData: FormData) {
  const auth = await context("/life/inventory"); const parsed = updatePurchaseDecisionInputSchema.safeParse({ ...decisionInput(formData), purchaseDecisionId: value(formData, "purchaseDecisionId") });
  if (!parsed.success) destination("/life/inventory", "invalid"); const result = await createSupabaseLifeRepository(auth.client).updatePurchaseDecision(auth.user.id, parsed.data);
  if (!result.ok) destination("/life/inventory", "error"); revalidateLife(); destination("/life/inventory", "decision_updated", result.data.id);
}
export async function archivePurchaseDecisionFormAction(formData: FormData) {
  const auth = await context("/life/inventory"); const parsed = purchaseDecisionLifecycleInputSchema.safeParse({ purchaseDecisionId: value(formData, "purchaseDecisionId") });
  if (!parsed.success) destination("/life/inventory", "invalid"); const result = await createSupabaseLifeRepository(auth.client).archivePurchaseDecision(auth.user.id, parsed.data.purchaseDecisionId);
  if (!result.ok) destination("/life/inventory", "error"); revalidateLife(); destination("/life/inventory", "decision_archived", parsed.data.purchaseDecisionId);
}
export async function convertWishlistItemToInventoryFormAction(formData: FormData) {
  const auth = await context("/life/inventory"); const parsed = convertWishlistItemInputSchema.safeParse({ wishlistItemId: value(formData, "wishlistItemId") });
  if (!parsed.success) destination("/life/inventory", "invalid"); const result = await createSupabaseLifeRepository(auth.client).convertWishlistItemToInventory(auth.user.id, parsed.data.wishlistItemId);
  if (!result.ok) destination("/life/inventory", "error"); revalidateLife(); destination("/life/inventory", "converted", result.data.id);
}
