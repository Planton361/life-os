import type { WorkbenchData } from "@/features/real-data/supabase/repositories/entity-workbench-read";
export const projectRoleLabels: Record<string, string> = {
  primary_artifact: "Primary Work Artifact",
  additional_artifact: "Additional Work Artifact",
  reference: "Reference",
};

export function projectResourceUses<
  R extends Pick<WorkbenchData["resources"][number], "id">,
  L extends Pick<
    WorkbenchData["relations"][number],
    "target_type" | "target_id" | "resource_id" | "project_role"
  >,
>(data: { relations: L[]; resources: R[] }, projectId: string) {
  const links = data.relations.filter(
    (r) => r.target_type === "project" && r.target_id === projectId,
  );
  // Legacy multiple relation types remain intact. A Resource appears once per
  // Project; an explicit artifact use takes precedence over supporting edges.
  return [...new Set(links.map((r) => r.resource_id))].flatMap((id) => {
    const resource = data.resources.find((r) => r.id === id);
    if (!resource) return [];
    const uses = links.filter((r) => r.resource_id === id);
    const relation =
      uses.find((r) => r.project_role !== "reference") ?? uses[0];
    return [{ resource, relation, role: relation.project_role }];
  });
}
