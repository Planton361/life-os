import type { SupabaseClientLike } from "../database.types";
import { taskDependencyGraphSchema } from "../../domain/task-dependencies";
import { taskDependencyInputSchema } from "../../schemas/task-dependency.schemas";

export async function readTaskDependencyGraph(client: SupabaseClientLike) {
  const result = await client.rpc("read_task_dependency_graph");
  if (result.error)
    throw new Error("Task Dependencies konnten nicht geladen werden.");
  return taskDependencyGraphSchema.parse(result.data);
}
export function dependencyErrorMessage(message: string) {
  const errors: Record<string, string> = {
    DEPENDENCY_SELF: "Ein Task kann nicht von sich selbst abhängen.",
    DEPENDENCY_DUPLICATE: "Diese Dependency besteht bereits.",
    DEPENDENCY_CYCLE: "Diese Dependency würde einen Zyklus erzeugen.",
    DEPENDENCY_COMPLETED_SUCCESSOR:
      "Ein abgeschlossener Task kann keinen unerfüllten Vorgänger erhalten.",
    DEPENDENCY_BLOCKED:
      "Task ist blockiert. Schließe zuerst die Vorgänger im Task Detail ab.",
    DEPENDENCY_PROJECT_MOVE:
      "Entferne zuerst die Dependencies, bevor du das Project wechselst.",
    DEPENDENCY_ARCHIVED:
      "Archivierte Tasks sind keine zulässigen neuen Dependency-Ziele.",
  };
  return (
    Object.entries(errors).find(([code]) => message.includes(code))?.[1] ??
    "Dependency konnte nicht gespeichert werden. Prüfe Project, Zugriff und aktuelle Tasks und lade erneut."
  );
}
export async function writeTaskDependency(
  client: SupabaseClientLike,
  userId: string,
  input: unknown,
) {
  const parsed = taskDependencyInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      status: "error" as const,
      message:
        "Prüfe die Dependency-Angaben; Self Dependency ist nicht erlaubt.",
    };
  const v = parsed.data;
  const result =
    v.operation === "add"
      ? await client
          .from("task_dependencies")
          .insert({
            user_id: userId,
            project_id: v.projectId,
            predecessor_task_id: v.predecessorId,
            successor_task_id: v.taskId,
          })
          .select("id")
          .single()
      : await client
          .from("task_dependencies")
          .delete()
          .eq("user_id", userId)
          .eq("id", v.dependencyId)
          .eq("successor_task_id", v.taskId)
          .select("id")
          .single();
  if (result.error || !result.data)
    return {
      status: "error" as const,
      message: dependencyErrorMessage(result.error?.message ?? ""),
    };
  return {
    status: "success" as const,
    message:
      v.operation === "add"
        ? "Dependency gespeichert."
        : "Dependency entfernt.",
  };
}

// Dependency links may refer to older Tasks beyond PostgREST's first page.
export async function readWorkbenchTasks(
  client: SupabaseClientLike,
  userId: string,
) {
  const rows: import("../database.types").TableRow<"tasks">[] = [];
  const pageSize = 500;
  for (let start = 0; ; start += pageSize) {
    const result = await client
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("id")
      .range(start, start + pageSize - 1);
    if (result.error) return { data: null, error: result.error };
    rows.push(...(result.data ?? []));
    if ((result.data?.length ?? 0) < pageSize)
      return { data: rows, error: null };
  }
}
