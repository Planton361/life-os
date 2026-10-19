"use server";

import { withSubmittedDatasetEpoch } from "./submitted-dataset";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { createAuthenticatedApplicationContext } from "../runtime/application-context";
import { taskResourceDraftSchema } from "../schemas/task-resource.schemas";

export async function saveTaskResource(form: FormData): Promise<{
  status: "success" | "error" | "partial";
  message: string;
  resourceId?: string;
}> {
  return withSubmittedDatasetEpoch(form, async () => {
    if ((await getCurrentLifeOsProfileId()) !== "manual")
      return { status: "error", message: "Bitte im Manual-Profil anmelden." };
    const auth = await createAuthenticatedApplicationContext("write");
    if (!auth.ok)
      return {
        status: "error",
        message: "Keine Schreibberechtigung. Bitte erneut anmelden.",
      };
    const ids = z
      .object({ taskId: z.uuid(), requestId: z.uuid() })
      .safeParse({
        taskId: form.get("taskId"),
        requestId: form.get("requestId"),
      });
    const draft = taskResourceDraftSchema.safeParse({
      type: form.get("type"),
      body: form.get("body"),
      url: form.get("url"),
      title: form.get("title") ?? "",
    });
    if (!ids.success || !draft.success)
      return {
        status: "error",
        message: draft.success
          ? "Ungültige Task-Anfrage."
          : draft.error.issues[0].message,
      };
    // Opaque retry token only; neither identity nor ownership comes from the client.
    const hash = createHash("sha256")
      .update(JSON.stringify([auth.user.id, ids.data.taskId, ids.data.requestId]))
      .digest("hex");
    const resourceId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
    const result = await auth.repositories.resources.createTaskResource({
      userId: auth.user.id,
      profileId: auth.user.id,
      taskId: ids.data.taskId,
      resourceId,
      draft: draft.data,
    });
    if (!result.ok)
      return {
        status: "error",
        resourceId,
        message:
          "Speichern nicht bestätigt. Entwurf beibehalten und erneut versuchen oder Resource prüfen. Archivierte oder quellengesteuerte Tasks sind schreibgeschützt.",
      };
    for (const route of [
      "/resources",
      `/resources/${resourceId}`,
      "/tasks",
      `/tasks/${ids.data.taskId}`,
      "/portfolio",
      "/today",
      "/calendar",
      "/dashboard",
    ])
      revalidatePath(route);
    return result.data.linked
      ? {
          status: "success",
          message:
            draft.data.type === "note"
              ? "Task-Notiz gespeichert."
              : "Link gespeichert.",
          resourceId,
        }
      : {
          status: "partial",
          message:
            "Resource erstellt, aber noch nicht mit diesem Task verknüpft. Entwurf bleibt erhalten. Erneut versuchen verknüpft denselben Eintrag.",
          resourceId,
        };
  });
}
