import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { projectMilestoneInputSchema } from "../../schemas/project-milestone.schemas";

export async function writeProjectMilestone(
  client: SupabaseClient<Database>,
  userId: string,
  input: unknown,
) {
  const parsed = projectMilestoneInputSchema.safeParse(input);
  if (!parsed.success) return false;
  const v = parsed.data;
  // Clearing a single edge also remains possible after the Project is archived.
  // The authenticated action supplies userId; never trust an owner in form data.
  if (v.operation === "assign" && v.milestoneId === null && v.taskId) {
    const result = await client
      .from("tasks")
      .update({ milestone_id: null })
      .eq("id", v.taskId)
      .eq("user_id", userId)
      .eq("project_id", v.projectId)
      .is("archived_at", null)
      .select("id")
      .maybeSingle();
    return !result.error && Boolean(result.data);
  }
  const result = await client.rpc("write_project_milestone", {
    p_project_id: v.projectId,
    p_operation: v.operation,
    p_milestone_id: v.milestoneId ?? undefined,
    p_task_id: v.taskId ?? undefined,
    p_title: v.title,
    p_description: v.description || undefined,
    p_status: v.status,
    p_target_date: v.targetDate ?? undefined,
  });
  return !result.error;
}
