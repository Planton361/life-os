export type TaskGoalAlignment =
  | "none"
  | "direct"
  | "via_project"
  | "redundant"
  | "conflict";

type GoalId = string | null | undefined;

export function resolveTaskGoalAlignment(
  directGoalId: GoalId,
  projectGoalId: GoalId,
): TaskGoalAlignment {
  if (directGoalId && projectGoalId) {
    return directGoalId === projectGoalId ? "redundant" : "conflict";
  }

  if (directGoalId) return "direct";
  if (projectGoalId) return "via_project";

  return "none";
}

export function hasTaskGoalConflict(
  directGoalId: GoalId,
  projectGoalId: GoalId,
) {
  return resolveTaskGoalAlignment(directGoalId, projectGoalId) === "conflict";
}

export function projectGoalChangeConflictsWithDirectTasks(
  nextProjectGoalId: GoalId,
  directTaskGoalIds: readonly GoalId[],
) {
  if (!nextProjectGoalId) return false;

  return directTaskGoalIds.some(
    (directGoalId) =>
      Boolean(directGoalId) && directGoalId !== nextProjectGoalId,
  );
}
