"use server";

import { withSubmittedDatasetEpoch } from "./submitted-dataset";

import { saveJournalEntryAction, archiveJournalEntryAction } from "./journal.actions";
import { getLifeRepository } from "@/features/real-data/runtime/facade";
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

import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { createAuthenticatedApplicationContext } from "@/features/real-data/runtime/application-context";

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
  const auth = await createAuthenticatedApplicationContext("write");
  if (!auth.ok) destination(path, "auth_blocked");
  return auth;
}

function noteInput(formData: FormData) {
  return { body: value(formData, "body"), title: value(formData, "title") };
}

export async function createJournalEntryFormAction(formData: FormData) {
  return withSubmittedDatasetEpoch(formData, async () => {
    formData.delete("journalEntryId");
    const result = await saveJournalEntryAction(formData);
    destination("/life/journal", result.ok ? "created" : "error", result.id);
  });
}
export async function updateJournalEntryFormAction(formData: FormData) {
  return withSubmittedDatasetEpoch(formData, async () => {
    if (!archiveJournalEntryInputSchema.safeParse({ journalEntryId: value(formData, "journalEntryId") }).success) destination("/life/journal", "invalid");
    const result = await saveJournalEntryAction(formData);
    destination("/life/journal", result.ok ? "updated" : "error", result.id);
  });
}
export async function archiveJournalEntryFormAction(formData: FormData) {
  return withSubmittedDatasetEpoch(formData, async () => {
    const result = await archiveJournalEntryAction(formData);
    destination("/life/journal", result.ok ? "archived" : "error", result.id);
  });
}

export async function createLifeNoteFormAction(formData: FormData) {
  return withSubmittedDatasetEpoch(formData, async () => {
    const auth = await context("/life/notes");
    const parsed = createLifeNoteInputSchema.safeParse(noteInput(formData));
    if (!parsed.success) destination("/life/notes", "invalid");
    const result = await getLifeRepository(auth.data).createNote(auth.user.id, parsed.data);
    if (!result.ok) destination("/life/notes", "error");
    revalidateLife();
    destination("/life/notes", "created", result.data.id);
  });
}

export async function updateLifeNoteFormAction(formData: FormData) {
  return withSubmittedDatasetEpoch(formData, async () => {
    const auth = await context("/life/notes");
    const parsed = updateLifeNoteInputSchema.safeParse({ ...noteInput(formData), resourceId: value(formData, "resourceId") });
    if (!parsed.success) destination("/life/notes", "invalid");
    const result = await getLifeRepository(auth.data).updateNote(auth.user.id, parsed.data.resourceId, parsed.data);
    if (!result.ok) destination("/life/notes", "error", parsed.data.resourceId);
    revalidateLife();
    destination("/life/notes", "updated", parsed.data.resourceId);
  });
}

async function noteLifecycle(formData: FormData, archived: boolean) {
  const auth = await context("/life/notes");
  const parsed = lifeNoteLifecycleInputSchema.safeParse({ resourceId: value(formData, "resourceId") });
  if (!parsed.success) destination("/life/notes", "invalid");
  const result = await getLifeRepository(auth.data).setNoteArchived(auth.user.id, parsed.data.resourceId, archived);
  if (!result.ok) destination("/life/notes", "error", parsed.data.resourceId);
  revalidateLife();
  destination("/life/notes", archived ? "archived" : "restored", parsed.data.resourceId);
}

export async function archiveLifeNoteFormAction(formData: FormData) {
  return withSubmittedDatasetEpoch(formData, async () => { await noteLifecycle(formData, true);
  });
}
export async function restoreLifeNoteFormAction(formData: FormData) {
  return withSubmittedDatasetEpoch(formData, async () => { await noteLifecycle(formData, false);
  });
}

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
  return withSubmittedDatasetEpoch(formData, async () => {
    const path = entertainmentPath(formData);
    const auth = await context(path);
    const parsed = entertainmentItemInputSchema.safeParse(entertainmentInput(formData));
    if (!parsed.success) destination(path, "invalid");
    const result = await getLifeRepository(auth.data).createEntertainmentItem(auth.user.id, parsed.data);
    if (!result.ok) destination(path, "error");
    revalidateLife();
    destination(path, "created", result.data.id);
  });
}

export async function updateEntertainmentItemFormAction(formData: FormData) {
  return withSubmittedDatasetEpoch(formData, async () => {
    const path = entertainmentPath(formData);
    const auth = await context(path);
    const parsed = updateEntertainmentItemInputSchema.safeParse({ ...entertainmentInput(formData), entertainmentItemId: value(formData, "entertainmentItemId") });
    if (!parsed.success) destination(path, "invalid");
    const result = await getLifeRepository(auth.data).updateEntertainmentItem(auth.user.id, parsed.data);
    if (!result.ok) destination(path, "error", parsed.data.entertainmentItemId);
    revalidateLife();
    destination(path, "updated", result.data.id);
  });
}

async function entertainmentLifecycle(formData: FormData, archived: boolean) {
  const path = entertainmentPath(formData);
  const auth = await context(path);
  const parsed = entertainmentItemLifecycleInputSchema.safeParse({ entertainmentItemId: value(formData, "entertainmentItemId") });
  if (!parsed.success) destination(path, "invalid");
  const result = await getLifeRepository(auth.data).setEntertainmentItemArchived(auth.user.id, parsed.data.entertainmentItemId, archived);
  if (!result.ok) destination(path, "error", parsed.data.entertainmentItemId);
  revalidateLife();
  destination(path, archived ? "archived" : "restored", parsed.data.entertainmentItemId);
}

export async function archiveEntertainmentItemFormAction(formData: FormData) {
  return withSubmittedDatasetEpoch(formData, async () => { await entertainmentLifecycle(formData, true);
  });
}
export async function restoreEntertainmentItemFormAction(formData: FormData) {
  return withSubmittedDatasetEpoch(formData, async () => { await entertainmentLifecycle(formData, false);
  });
}

function inventoryInput(formData: FormData) { return { acquiredOn: value(formData, "acquiredOn"), amount: value(formData, "amount"), category: value(formData, "category"), condition: value(formData, "condition"), currency: value(formData, "currency"), description: value(formData, "description"), location: value(formData, "location"), name: value(formData, "name"), quantity: value(formData, "quantity"), unit: value(formData, "unit") }; }
function wishlistInput(formData: FormData) { return { amount: value(formData, "amount"), category: value(formData, "category"), currency: value(formData, "currency"), description: value(formData, "description"), priority: value(formData, "priority"), status: value(formData, "status"), targetDate: value(formData, "targetDate"), title: value(formData, "title") }; }
function decisionInput(formData: FormData) { return { context: value(formData, "context"), criteria: value(formData, "criteria"), decision: value(formData, "decision"), decisionDate: value(formData, "decisionDate"), rationale: value(formData, "rationale"), status: value(formData, "status"), wishlistItemId: value(formData, "wishlistItemId") }; }

export async function createInventoryItemFormAction(formData: FormData) {
  return withSubmittedDatasetEpoch(formData, async () => {
    const auth = await context("/life/inventory"); const parsed = inventoryItemInputSchema.safeParse(inventoryInput(formData));
    if (!parsed.success) destination("/life/inventory", "invalid"); const result = await getLifeRepository(auth.data).createInventoryItem(auth.user.id, parsed.data);
    if (!result.ok) destination("/life/inventory", "error"); revalidateLife(); destination("/life/inventory", "inventory_created", result.data.id);
  });
}
export async function updateInventoryItemFormAction(formData: FormData) {
  return withSubmittedDatasetEpoch(formData, async () => {
    const auth = await context("/life/inventory"); const parsed = updateInventoryItemInputSchema.safeParse({ ...inventoryInput(formData), inventoryItemId: value(formData, "inventoryItemId") });
    if (!parsed.success) destination("/life/inventory", "invalid"); const result = await getLifeRepository(auth.data).updateInventoryItem(auth.user.id, parsed.data);
    if (!result.ok) destination("/life/inventory", "error"); revalidateLife(); destination("/life/inventory", "inventory_updated", result.data.id);
  });
}
async function inventoryLifecycle(formData: FormData, archived: boolean) {
  const auth = await context("/life/inventory"); const parsed = inventoryItemLifecycleInputSchema.safeParse({ inventoryItemId: value(formData, "inventoryItemId") });
  if (!parsed.success) destination("/life/inventory", "invalid"); const result = await getLifeRepository(auth.data).setInventoryItemArchived(auth.user.id, parsed.data.inventoryItemId, archived);
  if (!result.ok) destination("/life/inventory", "error"); revalidateLife(); destination("/life/inventory", archived ? "inventory_archived" : "inventory_restored", parsed.data.inventoryItemId);
}
export async function archiveInventoryItemFormAction(formData: FormData) {
  return withSubmittedDatasetEpoch(formData, async () => { await inventoryLifecycle(formData, true);
  });
}
export async function restoreInventoryItemFormAction(formData: FormData) {
  return withSubmittedDatasetEpoch(formData, async () => { await inventoryLifecycle(formData, false);
  });
}

export async function createWishlistItemFormAction(formData: FormData) {
  return withSubmittedDatasetEpoch(formData, async () => {
    const auth = await context("/life/inventory"); const parsed = wishlistItemInputSchema.safeParse(wishlistInput(formData));
    if (!parsed.success) destination("/life/inventory", "invalid"); const result = await getLifeRepository(auth.data).createWishlistItem(auth.user.id, parsed.data);
    if (!result.ok) destination("/life/inventory", "error"); revalidateLife(); destination("/life/inventory", "wishlist_created", result.data.id);
  });
}
export async function updateWishlistItemFormAction(formData: FormData) {
  return withSubmittedDatasetEpoch(formData, async () => {
    const auth = await context("/life/inventory"); const parsed = updateWishlistItemInputSchema.safeParse({ ...wishlistInput(formData), wishlistItemId: value(formData, "wishlistItemId") });
    if (!parsed.success) destination("/life/inventory", "invalid"); const result = await getLifeRepository(auth.data).updateWishlistItem(auth.user.id, parsed.data);
    if (!result.ok) destination("/life/inventory", "error"); revalidateLife(); destination("/life/inventory", "wishlist_updated", result.data.id);
  });
}
async function wishlistLifecycle(formData: FormData, archived: boolean) {
  const auth = await context("/life/inventory"); const parsed = wishlistItemLifecycleInputSchema.safeParse({ wishlistItemId: value(formData, "wishlistItemId") });
  if (!parsed.success) destination("/life/inventory", "invalid"); const result = await getLifeRepository(auth.data).setWishlistItemArchived(auth.user.id, parsed.data.wishlistItemId, archived);
  if (!result.ok) destination("/life/inventory", "error"); revalidateLife(); destination("/life/inventory", archived ? "wishlist_archived" : "wishlist_restored", parsed.data.wishlistItemId);
}
export async function archiveWishlistItemFormAction(formData: FormData) {
  return withSubmittedDatasetEpoch(formData, async () => { await wishlistLifecycle(formData, true);
  });
}
export async function restoreWishlistItemFormAction(formData: FormData) {
  return withSubmittedDatasetEpoch(formData, async () => { await wishlistLifecycle(formData, false);
  });
}

export async function createPurchaseDecisionFormAction(formData: FormData) {
  return withSubmittedDatasetEpoch(formData, async () => {
    const auth = await context("/life/inventory"); const parsed = purchaseDecisionInputSchema.safeParse(decisionInput(formData));
    if (!parsed.success) destination("/life/inventory", "invalid"); const result = await getLifeRepository(auth.data).createPurchaseDecision(auth.user.id, parsed.data);
    if (!result.ok) destination("/life/inventory", "error"); revalidateLife(); destination("/life/inventory", "decision_created", result.data.id);
  });
}
export async function updatePurchaseDecisionFormAction(formData: FormData) {
  return withSubmittedDatasetEpoch(formData, async () => {
    const auth = await context("/life/inventory"); const parsed = updatePurchaseDecisionInputSchema.safeParse({ ...decisionInput(formData), purchaseDecisionId: value(formData, "purchaseDecisionId") });
    if (!parsed.success) destination("/life/inventory", "invalid"); const result = await getLifeRepository(auth.data).updatePurchaseDecision(auth.user.id, parsed.data);
    if (!result.ok) destination("/life/inventory", "error"); revalidateLife(); destination("/life/inventory", "decision_updated", result.data.id);
  });
}
export async function archivePurchaseDecisionFormAction(formData: FormData) {
  return withSubmittedDatasetEpoch(formData, async () => {
    const auth = await context("/life/inventory"); const parsed = purchaseDecisionLifecycleInputSchema.safeParse({ purchaseDecisionId: value(formData, "purchaseDecisionId") });
    if (!parsed.success) destination("/life/inventory", "invalid"); const result = await getLifeRepository(auth.data).archivePurchaseDecision(auth.user.id, parsed.data.purchaseDecisionId);
    if (!result.ok) destination("/life/inventory", "error"); revalidateLife(); destination("/life/inventory", "decision_archived", parsed.data.purchaseDecisionId);
  });
}
export async function convertWishlistItemToInventoryFormAction(formData: FormData) {
  return withSubmittedDatasetEpoch(formData, async () => {
    const auth = await context("/life/inventory"); const parsed = convertWishlistItemInputSchema.safeParse({ wishlistItemId: value(formData, "wishlistItemId") });
    if (!parsed.success) destination("/life/inventory", "invalid"); const result = await getLifeRepository(auth.data).convertWishlistItemToInventory(auth.user.id, parsed.data.wishlistItemId);
    if (!result.ok) destination("/life/inventory", "error"); revalidateLife(); destination("/life/inventory", "converted", result.data.id);
  });
}
