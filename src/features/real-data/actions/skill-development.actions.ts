"use server";
import { revalidatePath } from "next/cache";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { createAuthenticatedApplicationContext } from "@/features/real-data/runtime/application-context";
import { parseSkillCommand } from "../schemas/skill-development.schema";
export async function skillDevelopmentCommand(input: unknown) {
  if ((await getCurrentLifeOsProfileId()) !== "manual")
    return {
      status: "blocked" as const,
      message: "Wechsle ins Manual-Profil.",
    };
  const auth = await createAuthenticatedApplicationContext("write");
  if (!auth.ok)
    return {
      status: "blocked" as const,
      message: "Melde dich an, um Skill-Daten zu speichern.",
    };
  const parsed = parseSkillCommand(input);
  if (!parsed.success)
    return {
      status: "error" as const,
      message: "Bitte prüfe die Skill-Eingaben.",
    };
  const { data, error } = await auth.data.useCases.skillDevelopmentCommand(parsed.data);
  if (error)
    return {
      status: "error" as const,
      message: /SKILL_STALE|SKILL_EVIDENCE_STALE/.test(error.message)
        ? "Die Skill wurde inzwischen geändert. Lade die aktuelle Ansicht und prüfe deine Eingaben erneut."
        : /SKILL_COMMAND_KEY_CONFLICT/.test(error.message)
          ? "Diese Anfrage wurde bereits mit anderen Eingaben gespeichert."
          : /ACK_REQUIRED/.test(error.message)
            ? "Bestätige die noch offenen Lernschritte."
            : /FUTURE/.test(error.message)
              ? "Evidence benötigt ein heutiges oder vergangenes Datum."
              : "Die Änderung konnte nicht gespeichert werden. Prüfe Lifecycle, Quelle und Eingaben.",
    };
  const result = data as {
    skill_id: string;
    development_revision: number;
    evidence_id?: string;
  };
  for (const route of [
    "/portfolio",
    "/skills",
    "/projects",
    "/goals",
    "/tasks",
    "/resources",
    "/education",
    "/coding",
  ])
    revalidatePath(route, "layout");
  return { status: "success" as const, message: "Skill gespeichert.", result };
}
