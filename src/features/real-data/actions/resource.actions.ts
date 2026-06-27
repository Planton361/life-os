"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { linkResourceToTargetInputSchema } from "@/features/real-data";
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

function revalidateResourceRelationRoutes(targetType: string) {
  revalidatePath("/resources");
  revalidatePath("/portfolio");

  if (targetType === "task") {
    revalidatePath("/today");
    revalidatePath("/calendar");
    revalidatePath("/dashboard");
  }
}

export async function linkResourceToTargetAction(
  formData: FormData,
): Promise<void> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId !== "manual") {
    redirectToResourceRelationState(formData, "blocked");
  }

  const auth = await createAuthenticatedSupabaseServerClient();

  if (!auth.ok) {
    redirectToResourceRelationState(formData, "blocked");
  }

  const parsed = linkResourceToTargetInputSchema.safeParse({
    profileId: auth.user.id,
    relationType: optionalFormString(formData, "relationType"),
    resourceId: formString(formData, "resourceId"),
    targetId: formString(formData, "targetId"),
    targetType: formString(formData, "targetType"),
  });

  if (!parsed.success) {
    redirectToResourceRelationState(formData, "invalid");
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
      redirectToResourceRelationState(formData, "unsupported");
    }

    if (result.error.code === "not_found") {
      const missingState = result.error.message
        .toLowerCase()
        .includes("target")
        ? "missing_target"
        : "missing_resource";
      redirectToResourceRelationState(formData, missingState);
    }

    redirectToResourceRelationState(formData, "invalid");
  }

  revalidateResourceRelationRoutes(parsed.data.targetType);
  redirectToResourceRelationState(
    formData,
    duplicateBeforeWrite ? "existing" : "saved",
  );
}
