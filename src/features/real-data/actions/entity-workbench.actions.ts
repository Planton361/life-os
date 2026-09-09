"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import {
  createPortfolioTaskAction,
  updatePortfolioTaskAction,
  completeTaskAction,
  reopenTaskAction,
  archiveTaskAction,
  linkTaskSkillAction,
  unlinkTaskSkillAction,
} from "./task.actions";
import {
  createProjectAction,
  updateProjectAction,
  archiveProjectAction,
  createGoalAction,
  updateGoalAction,
  archiveGoalAction,
} from "./portfolio.actions";
import {
  createSkillAction,
  updateSkillAction,
  archiveSkillAction,
  createSkillEvidenceAction,
  deleteSkillEvidenceAction,
} from "./skill.actions";
import {
  createSupabaseResourceRepository,
  createSupabaseTaskRepository,
  createSupabaseProjectRepository,
} from "../supabase";
import {
  createResourceInputSchema,
  updateResourceInputSchema,
  resourceLifecycleInputSchema,
  linkResourceInputSchema,
  updateTaskInputSchema,
  updateProjectInputSchema,
} from "../schemas";
import {
  workbenchKinds,
  entityRoutes,
  type FormResult,
  type WorkbenchKind,
} from "@/features/entities/workbench/types";

import { writeProjectMilestone } from "../supabase/repositories/project-milestone-repository";
import { setProjectResourceRole } from "../supabase/repositories/project-artifact-repository";
import { writeTaskStep } from "../supabase/repositories/task-step-repository";

function refresh() {
  for (const path of [
    ...Object.values(entityRoutes),
    "/portfolio",
    "/dashboard",
    "/inbox",
    "/today",
    "/calendar",
  ])
    revalidatePath(path);
  for (const kind of workbenchKinds) {
    revalidatePath(`${entityRoutes[kind]}/new`);
    revalidatePath(`${entityRoutes[kind]}/[${kind}Id]`, "page");
  }
}
function str(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}
const invalid: FormResult = {
  status: "error",
  message: "Prüfe die Angaben und Beziehungen.",
};
async function context() {
  if ((await getCurrentLifeOsProfileId()) !== "manual") return null;
  const auth = await createAuthenticatedSupabaseServerClient();
  return auth.ok ? auth : null;
}
export async function saveWorkbenchEntity(
  kind: WorkbenchKind,
  id: string | null,
  form: FormData,
): Promise<FormResult> {
  if (
    !z.enum(workbenchKinds).safeParse(kind).success ||
    (id && !z.uuid().safeParse(id).success)
  )
    return invalid;
  let result: FormResult;
  if (id) form.set(`${kind}Id`, id);
  if (kind === "task") {
    const r = await (id
      ? updatePortfolioTaskAction(form)
      : createPortfolioTaskAction(form));
    result = { ...r, id: r.taskId };
  } else if (kind === "project") {
    const r = await (id
      ? updateProjectAction(form)
      : createProjectAction(form));
    result = { ...r, id: r.projectId };
  } else if (kind === "goal") {
    const r = await (id ? updateGoalAction(form) : createGoalAction(form));
    result = { ...r, id: r.goalId };
  } else if (kind === "skill") {
    const r = await (id ? updateSkillAction(form) : createSkillAction(form));
    result = { ...r, id: r.skillId };
  } else {
    const auth = await context();
    if (!auth)
      return { status: "blocked", message: "Bitte im Manual-Profil anmelden." };
    const scope = { userId: auth.user.id, profileId: auth.user.id };
    const input = {
      ...scope,
      title: str(form, "title"),
      type: str(form, "type"),
      body: str(form, "body") || null,
      url: str(form, "url") || null,
      resourceId: id,
    };
    const repo = createSupabaseResourceRepository(auth.client);
    if (input.url && !z.url().safeParse(input.url).success) return invalid;
    if (id) {
      const parsed = updateResourceInputSchema.safeParse(input);
      if (!parsed.success) return invalid;
      const r = await repo.updateResource(parsed.data);
      result = r.ok
        ? { status: "success", message: "Resource gespeichert.", id: r.data.id }
        : invalid;
    } else {
      const parsed = createResourceInputSchema.safeParse(input);
      if (!parsed.success) return invalid;
      const r = await repo.createResource(parsed.data);
      result = r.ok
        ? { status: "success", message: "Resource erstellt.", id: r.data.id }
        : invalid;
    }
  }
  if (result.status === "success") refresh();
  return result;
}
export async function workbenchOperation(
  operation: string,
  form: FormData,
): Promise<FormResult> {
  const auth = await context();
  if (!auth)
    return { status: "blocked", message: "Bitte im Manual-Profil anmelden." };
  const scope = { userId: auth.user.id, profileId: auth.user.id };
  let result: FormResult = invalid;
  if (operation === "project.milestone") {
    if (
      await writeProjectMilestone(auth.client, auth.user.id, {
        operation: str(form, "milestoneOperation"),
        projectId: str(form, "projectId"),
        milestoneId: str(form, "milestoneId"),
        taskId: str(form, "taskId"),
        title: str(form, "title"),
        description: str(form, "description"),
        status: str(form, "status") || "open",
        targetDate: str(form, "targetDate"),
      })
    )
      result = { status: "success", message: "Milestone gespeichert." };
  } else if (operation === "project.resource.role") {
    if (
      await setProjectResourceRole(auth.client, {
        projectId: str(form, "projectId"),
        resourceId: str(form, "resourceId"),
        role: str(form, "role"),
      })
    )
      result = {
        status: "success",
        message: "Project-Verwendung gespeichert.",
      };
  } else if (
    operation === "step.create" ||
    operation === "step.update" ||
    operation === "step.archive"
  ) {
    const ok = await writeTaskStep(
      auth.client,
      auth.user.id,
      operation === "step.create"
        ? "create"
        : operation === "step.update"
          ? "update"
          : "archive",
      {
        taskId: str(form, "taskId"),
        stepId: str(form, "stepId"),
        title: str(form, "title"),
        position: str(form, "position") || "0",
        completed: form.get("completed") === "on",
      },
    );
    if (ok)
      result = { status: "success", message: "Arbeitsschritt gespeichert." };
  } else if (operation === "task.complete")
    result = await completeTaskAction(form);
  else if (operation === "task.reopen") result = await reopenTaskAction(form);
  else if (operation === "task.archive") result = await archiveTaskAction(form);
  else if (operation === "project.archive")
    result = await archiveProjectAction(form);
  else if (operation === "goal.archive") result = await archiveGoalAction(form);
  else if (operation === "skill.archive")
    result = await archiveSkillAction(form);
  else if (operation === "skill.link") result = await linkTaskSkillAction(form);
  else if (operation === "skill.unlink")
    result = await unlinkTaskSkillAction(form);
  else if (operation === "evidence.create")
    result = await createSkillEvidenceAction(form);
  else if (operation === "evidence.remove")
    result = await deleteSkillEvidenceAction(form);
  else if (
    operation === "resource.archive" ||
    operation === "resource.restore"
  ) {
    const parsed = resourceLifecycleInputSchema.safeParse({
      ...scope,
      resourceId: str(form, "resourceId"),
    });
    if (!parsed.success) return invalid;
    const repo = createSupabaseResourceRepository(auth.client);
    const r = await (operation === "resource.archive"
      ? repo.archiveResource(parsed.data)
      : repo.restoreResource(parsed.data));
    if (r.ok)
      result = { status: "success", message: "Resource-Status gespeichert." };
  } else if (operation === "resource.link") {
    const parsed = linkResourceInputSchema.safeParse({
      ...scope,
      resourceId: str(form, "resourceId"),
      targetType: str(form, "targetType"),
      targetId: str(form, "targetId"),
      relationType: "context",
    });
    if (!parsed.success) return invalid;
    const r = await createSupabaseResourceRepository(auth.client).linkResource(
      parsed.data,
    );
    if (r.ok) result = { status: "success", message: "Resource verknüpft." };
  } else if (operation === "resource.unlink") {
    const parsed = z.uuid().safeParse(str(form, "relationId"));
    if (!parsed.success) return invalid;
    const r = await createSupabaseResourceRepository(
      auth.client,
    ).unlinkResource(auth.user.id, auth.user.id, parsed.data);
    if (r.ok) result = { status: "success", message: "Verknüpfung gelöst." };
  } else if (operation === "task.context") {
    const parsed = updateTaskInputSchema.safeParse({
      ...scope,
      taskId: str(form, "taskId"),
      ...(form.has("projectId")
        ? { projectId: str(form, "projectId") || null }
        : {}),
      ...(form.has("goalId") ? { goalId: str(form, "goalId") || null } : {}),
    });
    if (!parsed.success) return invalid;
    const r = await createSupabaseTaskRepository(auth.client).updateTask(
      parsed.data,
    );
    if (r.ok)
      result = { status: "success", message: "Task-Beziehung gespeichert." };
  } else if (operation === "project.context") {
    const parsed = updateProjectInputSchema.safeParse({
      ...scope,
      projectId: str(form, "projectId"),
      goalId: str(form, "goalId") || null,
    });
    if (!parsed.success) return invalid;
    const r = await createSupabaseProjectRepository(auth.client).updateProject(
      parsed.data,
    );
    if (r.ok)
      result = { status: "success", message: "Project-Beziehung gespeichert." };
  }
  if (result.status === "success") refresh();
  return result;
}
