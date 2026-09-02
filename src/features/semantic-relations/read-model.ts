export type SemanticEntityType = "task" | "project" | "goal" | "resource" | "skill";

export type SemanticRelationEntry = {
  archived: boolean;
  direct: boolean;
  direction: "incoming" | "outgoing";
  href: `/${string}`;
  relationType: string;
  source: string;
  origins?: readonly ("direct" | "via_project")[];
  targetId: string;
  targetTitle: string;
  targetType: SemanticEntityType;
  via?: { id: string; title: string; type: "project" | "task" };
};

export type SemanticConnectedContext = {
  goals: readonly SemanticRelationEntry[];
  projects: readonly SemanticRelationEntry[];
  resources: readonly SemanticRelationEntry[];
  skills: readonly SemanticRelationEntry[];
  tasks: readonly SemanticRelationEntry[];
};

function compareEntries(left: SemanticRelationEntry, right: SemanticRelationEntry) {
  return (
    left.targetTitle.localeCompare(right.targetTitle, undefined, {
      sensitivity: "base",
    }) || left.targetId.localeCompare(right.targetId)
  );
}

function preferredEntry(
  current: SemanticRelationEntry | undefined,
  candidate: SemanticRelationEntry,
) {
  if (!current) return candidate;
  const preferred =
    candidate.direct !== current.direct
      ? candidate.direct
        ? candidate
        : current
      : compareEntries(candidate, current) < 0
        ? candidate
        : current;
  const origins = Array.from(
    new Set([
      ...(current.origins ?? [current.direct ? "direct" : "via_project"]),
      ...(candidate.origins ?? [candidate.direct ? "direct" : "via_project"]),
    ]),
  );

  return { ...preferred, origins };
}

export function buildSemanticConnectedContext(
  candidates: readonly SemanticRelationEntry[],
  options: Readonly<{ historical?: boolean }> = {},
): SemanticConnectedContext {
  const unique = new Map<string, SemanticRelationEntry>();

  for (const candidate of candidates) {
    if (candidate.archived && !options.historical) continue;
    const key = `${candidate.targetType}:${candidate.targetId}`;
    unique.set(key, preferredEntry(unique.get(key), candidate));
  }

  const entries = Array.from(unique.values()).sort(compareEntries);
  return {
    goals: entries.filter((entry) => entry.targetType === "goal"),
    projects: entries.filter((entry) => entry.targetType === "project"),
    resources: entries.filter((entry) => entry.targetType === "resource"),
    skills: entries.filter((entry) => entry.targetType === "skill"),
    tasks: entries.filter((entry) => entry.targetType === "task"),
  };
}

export function portfolioEntityHref(type: "task" | "project" | "goal" | "skill", id: string) {
  return `/portfolio?view=${type}s&selected=${id}` as `/${string}`;
}
