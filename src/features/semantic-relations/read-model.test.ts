import { describe, expect, it } from "vitest";
import { buildSemanticConnectedContext, type SemanticRelationEntry } from "./read-model";

const base: SemanticRelationEntry = {
  archived: false,
  direct: true,
  direction: "outgoing",
  href: "/portfolio?view=tasks&selected=1",
  relationType: "belongs to project",
  source: "tasks.project_id",
  targetId: "1",
  targetTitle: "Beta",
  targetType: "task",
};

describe("semantic relation read model", () => {
  it("sorts deterministically and deduplicates with direct relations preferred", () => {
    const indirect = { ...base, direct: false, via: { id: "p", title: "Project", type: "project" as const } };
    const result = buildSemanticConnectedContext([
      indirect,
      { ...base, targetId: "2", targetTitle: "alpha" },
      base,
    ]);
    expect(result.tasks.map((entry) => entry.targetTitle)).toEqual(["alpha", "Beta"]);
    expect(result.tasks.find((entry) => entry.targetId === "1")?.direct).toBe(true);
  });

  it("filters archives and projects canonical skill relations", () => {
    const archived = { ...base, archived: true };
    const skill = { ...base, targetId: "skill", targetType: "skill" as const };
    expect(buildSemanticConnectedContext([archived, skill]).tasks).toHaveLength(0);
    expect(buildSemanticConnectedContext([archived, skill]).skills).toEqual([
      skill,
    ]);
    expect(buildSemanticConnectedContext([archived], { historical: true }).tasks).toHaveLength(1);
  });
});
