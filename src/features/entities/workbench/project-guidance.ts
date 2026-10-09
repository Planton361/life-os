export type ProjectTaskGuidance =
  | { kind: "archived" }
  | { kind: "completed" }
  | { kind: "empty" }
  | { kind: "single-ready"; taskId: string }
  | { kind: "multiple-ready"; count: number }
  | { kind: "all-blocked"; count: number }
  | { kind: "no-open-work" };

export function projectTaskGuidance({
  archived,
  completed = false,
  taskCount,
  readyTaskIds,
  blockedCount,
}: {
  archived: boolean;
  completed?: boolean;
  taskCount: number;
  readyTaskIds: readonly string[];
  blockedCount: number;
}): ProjectTaskGuidance {
  if (archived) return { kind: "archived" };
  if (completed) return { kind: "completed" };
  if (taskCount === 0) return { kind: "empty" };
  if (readyTaskIds.length === 1)
    return { kind: "single-ready", taskId: readyTaskIds[0] };
  if (readyTaskIds.length > 1)
    return { kind: "multiple-ready", count: readyTaskIds.length };
  if (blockedCount > 0) return { kind: "all-blocked", count: blockedCount };
  return { kind: "no-open-work" };
}
