"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  skillArchiveInputSchema,
  skillCreateInputSchema,
  skillEvidenceCreateInputSchema,
  skillEvidenceDeleteInputSchema,
  skillEvidenceUpdateInputSchema,
  skillUpdateInputSchema,
} from "@/features/real-data";
import { createSupabaseSkillRepository } from "@/features/real-data/supabase";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { createAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";

export type SkillActionResult = {
  evidenceId?: string;
  message: string;
  skillId?: string;
  status: "blocked" | "error" | "success";
};

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalFormString(formData: FormData, key: string) {
  return formString(formData, key) || undefined;
}

function optionalFormStringIfPresent(formData: FormData, key: string) {
  if (!formData.has(key)) return undefined;

  return optionalFormString(formData, key);
}

function optionalNullableFormString(formData: FormData, key: string) {
  const value = formString(formData, key);
  return value.length > 0 ? value : null;
}

function optionalNullableFormStringIfPresent(formData: FormData, key: string) {
  if (!formData.has(key)) return undefined;

  return optionalNullableFormString(formData, key);
}

function optionalFormNumber(formData: FormData, key: string) {
  if (!formData.has(key)) return undefined;

  const value = Number(formString(formData, key));

  return Number.isFinite(value) ? value : undefined;
}

function evidenceSourceIdFromForm(formData: FormData) {
  const sourceReference = formString(formData, "sourceReference");

  if (sourceReference) {
    const [sourceType, sourceId = ""] = sourceReference.split(":", 2);

    if (sourceType === "manual_note") return null;

    return sourceId || undefined;
  }

  if (evidenceSourceTypeFromForm(formData) === "manual_note") return null;

  return optionalNullableFormString(formData, "sourceId");
}

function evidenceSourceIdFromFormIfPresent(formData: FormData) {
  if (formData.has("sourceReference")) {
    return evidenceSourceIdFromForm(formData);
  }

  if (evidenceSourceTypeFromForm(formData) === "manual_note") return null;

  return optionalNullableFormStringIfPresent(formData, "sourceId");
}

function evidenceSourceTypeFromForm(formData: FormData) {
  const sourceReference = formString(formData, "sourceReference");

  if (sourceReference) {
    return sourceReference.split(":", 1)[0];
  }

  return formString(formData, "sourceType");
}

function revalidateSkillRoutes(sourceType?: string) {
  revalidatePath("/portfolio");
  revalidatePath("/education");
  revalidatePath("/coding");

  if (sourceType === "resource") {
    revalidatePath("/resources");
  }
}

function skillRedirectUrl(
  targetCreate:
    | "blocked"
    | "error"
    | "skill_archived"
    | "skill_created"
    | "skill_evidence_created"
    | "skill_evidence_deleted"
    | "skill_updated",
  skillId?: string,
) {
  const params = new URLSearchParams({
    targetCreate,
    view: "skills",
  });

  if (skillId) {
    params.set("selected", skillId);
  }

  return `/portfolio?${params.toString()}`;
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

  return "Melde dich an, um Skill-Daten zu speichern.";
}

function repositoryFailureMessage(message: string) {
  if (message.includes("Area")) {
    return "Der Area-Kontext konnte nicht bestätigt werden.";
  }

  if (message.includes("Skill evidence source")) {
    return "Die Evidence-Quelle wurde im aktuellen User-Scope nicht gefunden.";
  }

  if (message.includes("Skill evidence")) {
    return "Die Skill Evidence wurde im aktuellen User-Scope nicht gefunden.";
  }

  if (message.includes("Skill")) {
    return "Die Skill wurde im aktuellen User-Scope nicht gefunden.";
  }

  if (message.includes("source")) {
    return "Die Evidence-Quelle ist für diesen Typ nicht gültig.";
  }

  return "Skill-Daten konnten nicht gespeichert werden.";
}

async function getAuthenticatedSkillContext() {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId !== "manual") {
    return {
      ok: false as const,
      result: {
        message: "Wechsle ins Manual-Profil, um Skill-Daten zu speichern.",
        status: "blocked" as const,
      },
    };
  }

  const auth = await createAuthenticatedSupabaseServerClient();

  if (!auth.ok) {
    return {
      ok: false as const,
      result: {
        message: authBlockedMessage(auth.error),
        status: "blocked" as const,
      },
    };
  }

  return {
    auth,
    ok: true as const,
  };
}

export async function createSkillAction(
  formData: FormData,
): Promise<SkillActionResult> {
  const context = await getAuthenticatedSkillContext();

  if (!context.ok) return context.result;

  const parsed = skillCreateInputSchema.safeParse({
    areaId: optionalNullableFormString(formData, "areaId"),
    category: optionalFormString(formData, "category"),
    level: optionalFormString(formData, "level"),
    name: formString(formData, "name"),
    status: optionalFormString(formData, "status"),
    summary: optionalFormString(formData, "summary"),
  });

  if (!parsed.success) {
    return {
      message: "Gib gültige Skill-Daten ein.",
      status: "error",
    };
  }

  const repository = createSupabaseSkillRepository(context.auth.client);
  const result = await repository.createSkill({
    ...parsed.data,
    userId: context.auth.user.id,
  });

  if (!result.ok) {
    return {
      message: repositoryFailureMessage(result.error.message),
      status: "error",
    };
  }

  revalidateSkillRoutes();

  return {
    message: "Skill erstellt.",
    skillId: result.data.id,
    status: "success",
  };
}

export async function createSkillFormAction(formData: FormData): Promise<void> {
  const result = await createSkillAction(formData);

  if (result.status === "success") {
    redirect(skillRedirectUrl("skill_created", result.skillId));
  }

  redirect(skillRedirectUrl(result.status === "blocked" ? "blocked" : "error"));
}

export async function updateSkillAction(
  formData: FormData,
): Promise<SkillActionResult> {
  const context = await getAuthenticatedSkillContext();

  if (!context.ok) return context.result;

  const parsed = skillUpdateInputSchema.safeParse({
    areaId: optionalNullableFormStringIfPresent(formData, "areaId"),
    category: optionalFormStringIfPresent(formData, "category"),
    level: optionalFormStringIfPresent(formData, "level"),
    name: optionalFormStringIfPresent(formData, "name"),
    skillId: formString(formData, "skillId"),
    status: optionalFormStringIfPresent(formData, "status"),
    summary: optionalFormStringIfPresent(formData, "summary"),
  });

  if (!parsed.success) {
    return {
      message: "Gib gültige Skill-Daten ein.",
      status: "error",
    };
  }

  const repository = createSupabaseSkillRepository(context.auth.client);
  const result = await repository.updateSkill({
    ...parsed.data,
    userId: context.auth.user.id,
  });

  if (!result.ok) {
    return {
      message: repositoryFailureMessage(result.error.message),
      status: "error",
    };
  }

  revalidateSkillRoutes();

  return {
    message: "Skill aktualisiert.",
    skillId: result.data.id,
    status: "success",
  };
}

export async function updateSkillFormAction(formData: FormData): Promise<void> {
  const result = await updateSkillAction(formData);
  const skillId = result.skillId ?? formString(formData, "skillId");

  if (result.status === "success") {
    redirect(skillRedirectUrl("skill_updated", skillId));
  }

  redirect(
    skillRedirectUrl(
      result.status === "blocked" ? "blocked" : "error",
      skillId,
    ),
  );
}

export async function archiveSkillAction(
  formData: FormData,
): Promise<SkillActionResult> {
  const context = await getAuthenticatedSkillContext();

  if (!context.ok) return context.result;

  const parsed = skillArchiveInputSchema.safeParse({
    skillId: formString(formData, "skillId"),
  });

  if (!parsed.success) {
    return {
      message: "Die Skill konnte nicht validiert werden.",
      status: "error",
    };
  }

  const repository = createSupabaseSkillRepository(context.auth.client);
  const result = await repository.archiveSkill({
    ...parsed.data,
    userId: context.auth.user.id,
  });

  if (!result.ok) {
    return {
      message: repositoryFailureMessage(result.error.message),
      status: "error",
    };
  }

  revalidateSkillRoutes();

  return {
    message: "Skill archiviert.",
    skillId: result.data.id,
    status: "success",
  };
}

export async function archiveSkillFormAction(formData: FormData): Promise<void> {
  const result = await archiveSkillAction(formData);

  if (result.status === "success") {
    redirect(skillRedirectUrl("skill_archived"));
  }

  redirect(
    skillRedirectUrl(
      result.status === "blocked" ? "blocked" : "error",
      formString(formData, "skillId"),
    ),
  );
}

export async function createSkillEvidenceAction(
  formData: FormData,
): Promise<SkillActionResult> {
  const context = await getAuthenticatedSkillContext();

  if (!context.ok) return context.result;

  const parsed = skillEvidenceCreateInputSchema.safeParse({
    evidenceDate: formString(formData, "evidenceDate"),
    note: optionalFormString(formData, "note"),
    skillId: formString(formData, "skillId"),
    sourceId: evidenceSourceIdFromForm(formData),
    sourceType: evidenceSourceTypeFromForm(formData),
    title: formString(formData, "title"),
    weight: optionalFormNumber(formData, "weight"),
  });

  if (!parsed.success) {
    return {
      message: "Gib gültige Skill-Evidence-Daten ein.",
      status: "error",
    };
  }

  const repository = createSupabaseSkillRepository(context.auth.client);
  const result = await repository.createSkillEvidence({
    ...parsed.data,
    userId: context.auth.user.id,
  });

  if (!result.ok) {
    return {
      message: repositoryFailureMessage(result.error.message),
      status: "error",
    };
  }

  revalidateSkillRoutes(result.data.sourceType);

  return {
    evidenceId: result.data.id,
    message: "Skill Evidence erstellt.",
    skillId: result.data.skillId,
    status: "success",
  };
}

export async function createSkillEvidenceFormAction(
  formData: FormData,
): Promise<void> {
  const result = await createSkillEvidenceAction(formData);
  const skillId = result.skillId ?? formString(formData, "skillId");

  if (result.status === "success") {
    redirect(skillRedirectUrl("skill_evidence_created", skillId));
  }

  redirect(
    skillRedirectUrl(
      result.status === "blocked" ? "blocked" : "error",
      skillId,
    ),
  );
}

export async function updateSkillEvidenceAction(
  formData: FormData,
): Promise<SkillActionResult> {
  const context = await getAuthenticatedSkillContext();

  if (!context.ok) return context.result;

  const parsed = skillEvidenceUpdateInputSchema.safeParse({
    evidenceDate: optionalFormStringIfPresent(formData, "evidenceDate"),
    evidenceId: formString(formData, "evidenceId"),
    note: optionalFormStringIfPresent(formData, "note"),
    skillId: optionalFormStringIfPresent(formData, "skillId"),
    sourceId: evidenceSourceIdFromFormIfPresent(formData),
    sourceType: formData.has("sourceReference")
      ? evidenceSourceTypeFromForm(formData)
      : optionalFormStringIfPresent(formData, "sourceType"),
    title: optionalFormStringIfPresent(formData, "title"),
    weight: optionalFormNumber(formData, "weight"),
  });

  if (!parsed.success) {
    return {
      message: "Gib gültige Skill-Evidence-Daten ein.",
      status: "error",
    };
  }

  const repository = createSupabaseSkillRepository(context.auth.client);
  const result = await repository.updateSkillEvidence({
    ...parsed.data,
    userId: context.auth.user.id,
  });

  if (!result.ok) {
    return {
      message: repositoryFailureMessage(result.error.message),
      status: "error",
    };
  }

  revalidateSkillRoutes(result.data.sourceType);

  return {
    evidenceId: result.data.id,
    message: "Skill Evidence aktualisiert.",
    skillId: result.data.skillId,
    status: "success",
  };
}

export async function deleteSkillEvidenceAction(
  formData: FormData,
): Promise<SkillActionResult> {
  const context = await getAuthenticatedSkillContext();

  if (!context.ok) return context.result;

  const parsed = skillEvidenceDeleteInputSchema.safeParse({
    evidenceId: formString(formData, "evidenceId"),
  });

  if (!parsed.success) {
    return {
      message: "Die Skill Evidence konnte nicht validiert werden.",
      status: "error",
    };
  }

  const repository = createSupabaseSkillRepository(context.auth.client);
  const result = await repository.deleteSkillEvidence({
    ...parsed.data,
    userId: context.auth.user.id,
  });

  if (!result.ok) {
    return {
      message: repositoryFailureMessage(result.error.message),
      status: "error",
    };
  }

  revalidateSkillRoutes(result.data.sourceType);

  return {
    evidenceId: result.data.id,
    message: "Skill Evidence gelöscht.",
    skillId: result.data.skillId,
    status: "success",
  };
}

export async function deleteSkillEvidenceFormAction(
  formData: FormData,
): Promise<void> {
  const result = await deleteSkillEvidenceAction(formData);
  const skillId = result.skillId ?? formString(formData, "skillId");

  if (result.status === "success") {
    redirect(skillRedirectUrl("skill_evidence_deleted", skillId));
  }

  redirect(
    skillRedirectUrl(
      result.status === "blocked" ? "blocked" : "error",
      skillId,
    ),
  );
}
