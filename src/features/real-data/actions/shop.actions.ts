"use server";

import { withSubmittedDatasetEpoch } from "./submitted-dataset";
import { revalidatePath } from "next/cache";
import { getShopRepository } from "@/features/real-data/runtime/facade";
import { redirect } from "next/navigation";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { createAuthenticatedApplicationContext } from "@/features/real-data/runtime/application-context";
import {
  redeemShopItemSchema,
  shopItemIdSchema,
  shopItemInputSchema,
  updateShopItemInputSchema,
} from "../schemas/shop.schemas";

function value(data: FormData, key: string) {
  const item = data.get(key);
  return typeof item === "string" ? item.trim() : "";
}
function finish(state: string): never {
  revalidatePath("/shop");
  revalidatePath("/challenges");
  redirect(`/shop?state=${encodeURIComponent(state)}`);
}
async function context() {
  if ((await getCurrentLifeOsProfileId()) !== "manual") finish("auth_blocked");
  const auth = await createAuthenticatedApplicationContext("write");
  if (!auth.ok) finish("auth_blocked");
  return {
    repository: getShopRepository(auth.data),
    userId: auth.user.id,
  };
}
function input(data: FormData) {
  return {
    category: value(data, "category"),
    costCoins: value(data, "costCoins"),
    description: value(data, "description"),
    title: value(data, "title"),
  };
}
export async function createShopItemAction(data: FormData) {
  return withSubmittedDatasetEpoch(data, async () => {
    const parsed = shopItemInputSchema.safeParse(input(data));
    if (!parsed.success) finish("invalid");
    const { repository, userId } = await context();
    finish(
      (await repository.create(userId, parsed.data)).ok ? "created" : "error",
    );
  });
}
export async function updateShopItemAction(data: FormData) {
  return withSubmittedDatasetEpoch(data, async () => {
    const parsed = updateShopItemInputSchema.safeParse({
      ...input(data),
      shopItemId: value(data, "shopItemId"),
    });
    if (!parsed.success) finish("invalid");
    const { repository, userId } = await context();
    finish(
      (await repository.update(userId, parsed.data)).ok ? "updated" : "error",
    );
  });
}
async function idContext(data: FormData) {
  const parsed = shopItemIdSchema.safeParse({
    shopItemId: value(data, "shopItemId"),
  });
  if (!parsed.success) finish("invalid");
  return { ...(await context()), shopItemId: parsed.data.shopItemId };
}
export async function pauseShopItemAction(data: FormData) {
  return withSubmittedDatasetEpoch(data, async () => {
    const { repository, userId, shopItemId } = await idContext(data);
    finish(
      (await repository.setPaused(userId, shopItemId, true)) ? "paused" : "error",
    );
  });
}
export async function reactivateShopItemAction(data: FormData) {
  return withSubmittedDatasetEpoch(data, async () => {
    const { repository, userId, shopItemId } = await idContext(data);
    finish(
      (await repository.setPaused(userId, shopItemId, false))
        ? "reactivated"
        : "error",
    );
  });
}
export async function archiveShopItemAction(data: FormData) {
  return withSubmittedDatasetEpoch(data, async () => {
    const { repository, userId, shopItemId } = await idContext(data);
    finish((await repository.archive(userId, shopItemId)) ? "archived" : "error");
  });
}
export async function restoreShopItemAction(data: FormData) {
  return withSubmittedDatasetEpoch(data, async () => {
    const { repository, userId, shopItemId } = await idContext(data);
    finish((await repository.restore(userId, shopItemId)) ? "restored" : "error");
  });
}
export async function redeemShopItemAction(data: FormData) {
  return withSubmittedDatasetEpoch(data, async () => {
    const parsed = redeemShopItemSchema.safeParse({
      requestKey: value(data, "requestKey"),
      shopItemId: value(data, "shopItemId"),
    });
    if (!parsed.success) finish("invalid");
    const { repository } = await context();
    finish(
      (await repository.redeem(parsed.data.shopItemId, parsed.data.requestKey)).ok
        ? "redeemed"
        : "insufficient",
    );
  });
}
