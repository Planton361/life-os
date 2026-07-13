"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { linkResourceToTargetInputSchema, unlinkResourceFromTargetInputSchema } from "@/features/real-data";
import { createSupabaseResourceRepository } from "@/features/real-data/supabase";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { createAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";

type ResourceRelationCreateState =
  | "blocked"
  | "existing"
  | "invalid"
  | "missing_resource"
  | "missing_target"
  | "saved"
  | "unsupported";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalFormString(formData: FormData, key: string) {
  return formString(formData, key) || undefined;
}

function resourceRelationReturnUrl(
  formData: FormData,
  state: ResourceRelationCreateState,
) {
  const params = new URLSearchParams({
    relationCreate: state,
  });
  const resourceId = optionalFormString(formData, "resourceId");

  if (resourceId) {
    params.set("selected", resourceId);
  }

  return `/resources?${params.toString()}`;
}

function redirectToResourceRelationState(
  formData: FormData,
  state: ResourceRelationCreateState,
): never {
  redirect(resourceRelationReturnUrl(formData, state));
}

function portfolioResourceRelationState(
  state: ResourceRelationCreateState,
): string {
  if (state === "saved") return "resource_linked";
  if (state === "existing") return "resource_existing";
  if (state === "missing_resource") return "resource_missing_resource";
  if (state === "missing_target") return "resource_missing_target";
  if (state === "unsupported") return "resource_unsupported";
  if (state === "blocked") return "blocked";

  return "resource_error";
}

function portfolioResourceRelationReturnUrl(
  formData: FormData,
  state: ResourceRelationCreateState,
) {
  const returnView = optionalFormString(formData, "returnView");
  const selectedTargetId =
    optionalFormString(formData, "selectedTargetId") ??
    optionalFormString(formData, "targetId");
  const params = new URLSearchParams({
    targetCreate: portfolioResourceRelationState(state),
  });

  if (returnView) {
    params.set("view", returnView);
  }

  if (selectedTargetId) {
    params.set("selected", selectedTargetId);
  }

  return `/portfolio?${params.toString()}`;
}

function redirectToPortfolioResourceRelationState(
  formData: FormData,
  state: ResourceRelationCreateState,
): never {
  redirect(portfolioResourceRelationReturnUrl(formData, state));
}

function revalidateResourceRelationRoutes(targetType: string) {
  revalidatePath("/resources");
  revalidatePath("/portfolio");

  if (targetType === "task") {
    revalidatePath("/today");
    revalidatePath("/calendar");
    revalidatePath("/dashboard");
  }
}

async function createResourceRelationState(
  formData: FormData,
): Promise<ResourceRelationCreateState> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId !== "manual") {
    return "blocked";
  }

  const auth = await createAuthenticatedSupabaseServerClient();

  if (!auth.ok) {
    return "blocked";
  }

  const parsed = linkResourceToTargetInputSchema.safeParse({
    profileId: auth.user.id,
    relationType: optionalFormString(formData, "relationType"),
    resourceId: formString(formData, "resourceId"),
    targetId: formString(formData, "targetId"),
    targetType: formString(formData, "targetType"),
  });

  if (!parsed.success) {
    return "invalid";
  }

  const repository = createSupabaseResourceRepository(auth.client);
  const existingRelations = await repository.getResourceRelationsForResource(
    auth.user.id,
    auth.user.id,
    parsed.data.resourceId,
  );
  const duplicateBeforeWrite =
    existingRelations.ok &&
    existingRelations.data.some(
      (relation) =>
        relation.targetType === parsed.data.targetType &&
        relation.targetId === parsed.data.targetId &&
        relation.relationType === parsed.data.relationType,
    );
  const result = await repository.linkResource({
    ...parsed.data,
    userId: auth.user.id,
  });

  if (!result.ok) {
    if (result.error.code === "validation_error") {
      return "unsupported";
    }

    if (result.error.code === "not_found") {
      return result.error.message
        .toLowerCase()
        .includes("target")
        ? "missing_target"
        : "missing_resource";
    }

    return "invalid";
  }

  revalidateResourceRelationRoutes(parsed.data.targetType);
  return duplicateBeforeWrite ? "existing" : "saved";
}

export async function linkResourceToTargetAction(
  formData: FormData,
): Promise<void> {
  redirectToResourceRelationState(
    formData,
    await createResourceRelationState(formData),
  );
}

export async function linkPortfolioResourceToTargetAction(
  formData: FormData,
): Promise<void> {
  redirectToPortfolioResourceRelationState(
    formData,
    await createResourceRelationState(formData),
  );
}

export async function unlinkPortfolioResourceFromTargetAction(formData: FormData): Promise<void> {
  const profileId = await getCurrentLifeOsProfileId();
  if (profileId !== "manual") redirectToPortfolioResourceRelationState(formData, "blocked");
  const auth = await createAuthenticatedSupabaseServerClient();
  if (!auth.ok) redirectToPortfolioResourceRelationState(formData, "blocked");
  const parsed = unlinkResourceFromTargetInputSchema.safeParse({
    profileId: auth.user.id,
    relationId: formString(formData, "relationId"),
  });
  if (!parsed.success) redirectToPortfolioResourceRelationState(formData, "invalid");
  const result = await createSupabaseResourceRepository(auth.client).unlinkResource(
    auth.user.id, auth.user.id, parsed.data.relationId,
  );
  if (!result.ok) redirectToPortfolioResourceRelationState(formData, "invalid");
  revalidateResourceRelationRoutes(result.data.targetType);
  redirectToPortfolioResourceRelationState(formData, "saved");
}
