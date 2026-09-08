import { describe, expect, it } from "vitest";
import { projectResourceUses } from "./project-artifacts";
import { projectArtifactInputSchema } from "../../real-data/schemas/project-artifact.schemas";
import type { WorkbenchData } from "@/features/real-data/supabase/repositories/entity-workbench-read";

describe("Project artifact semantics", () => {
  const data = {
    resources: [
      {
        id: "r",
        title: "GitHub Thesis",
        type: "link",
        url: "https://github.com/example/repo",
        archived_at: null,
      },
    ],
    relations: [
      {
        id: "ref",
        target_type: "project",
        target_id: "a",
        resource_id: "r",
        project_role: "reference",
      },
      {
        id: "other",
        target_type: "project",
        target_id: "b",
        resource_id: "r",
        project_role: "reference",
      },
    ],
  } as unknown as WorkbenchData;
  it("never infers artifact role from type, URL or title", () => {
    expect(projectResourceUses(data, "a").map((u) => u.role)).toEqual([
      "reference",
    ]);
  });
  it("shows one explicit artifact despite retained supporting edges, without changing another Project", () => {
    const updated = {
      ...data,
      relations: [
        ...data.relations,
        {
          ...data.relations[0],
          id: "artifact",
          project_role: "primary_artifact",
        },
      ],
    };
    expect(projectResourceUses(updated, "a").map((u) => u.role)).toEqual([
      "primary_artifact",
    ]);
    expect(projectResourceUses(updated, "b").map((u) => u.role)).toEqual([
      "reference",
    ]);
    expect(updated.resources).toHaveLength(1);
  });
  it("retains archived resource identity for truthful history", () => {
    const updated = {
      ...data,
      resources: data.resources.map((r) => ({
        ...r,
        archived_at: "2026-09-08",
      })),
    };
    expect(projectResourceUses(updated, "a")[0].resource.archived_at).toBe(
      "2026-09-08",
    );
  });
  it("rejects invalid target IDs and guessed/provider roles", () => {
    const input = {
      projectId: "11111111-1111-4111-8111-111111111111",
      resourceId: "22222222-2222-4222-8222-222222222222",
      role: "primary_artifact",
    };
    expect(projectArtifactInputSchema.safeParse(input).success).toBe(true);
    expect(
      projectArtifactInputSchema.safeParse({ ...input, role: "github" })
        .success,
    ).toBe(false);
    expect(
      projectArtifactInputSchema.safeParse({
        ...input,
        projectId: "foreign-url",
      }).success,
    ).toBe(false);
  });
});
