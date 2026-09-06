import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import {
  taskStepCreateSchema,
  taskStepUpdateSchema,
  taskStepArchiveSchema,
} from "../../schemas/task-step.schemas";

export async function writeTaskStep(
  client: SupabaseClient<Database>,
  userId: string,
  operation: "create" | "update" | "archive",
  input: unknown,
) {
  const schema =
    operation === "create"
      ? taskStepCreateSchema
      : operation === "update"
        ? taskStepUpdateSchema
        : taskStepArchiveSchema;
  const parsed = schema.safeParse(input);
  if (!parsed.success) return false;
  const data = parsed.data;
  const parent = await client
    .from("tasks")
    .select("id")
    .eq("user_id", userId)
    .eq("id", data.taskId)
    .is("archived_at", null)
    .maybeSingle();
  if (parent.error || !parent.data) return false;
  if (operation === "create" && "title" in data) {
    const result = await client
      .from("task_steps")
      .insert({
        user_id: userId,
        task_id: data.taskId,
        title: data.title,
        position: data.position,
      })
      .select("id")
      .single();
    return !result.error && Boolean(result.data);
  }
  if (!("stepId" in data)) return false;
  let patch: Database["public"]["Tables"]["task_steps"]["Update"];
  if (operation === "archive")
    patch = { archived_at: new Date().toISOString() };
  else {
    const update = taskStepUpdateSchema.safeParse(input);
    if (!update.success) return false;
    const current = await client
      .from("task_steps")
      .select("completed_at")
      .eq("id", data.stepId)
      .eq("task_id", data.taskId)
      .eq("user_id", userId)
      .is("archived_at", null)
      .maybeSingle();
    if (current.error || !current.data) return false;
    patch = {
      title: update.data.title,
      position: update.data.position,
      completed_at: update.data.completed
        ? (current.data.completed_at ?? new Date().toISOString())
        : null,
    };
  }
  const result = await client
    .from("task_steps")
    .update(patch)
    .eq("id", data.stepId)
    .eq("task_id", data.taskId)
    .eq("user_id", userId)
    .is("archived_at", null)
    .select("id")
    .maybeSingle();
  return !result.error && Boolean(result.data);
}
