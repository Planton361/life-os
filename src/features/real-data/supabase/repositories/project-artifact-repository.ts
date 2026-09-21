import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import { projectArtifactInputSchema } from "../../schemas/project-artifact.schemas";

export async function setProjectResourceRole(
  client: SupabaseClient<Database>,
  input: unknown,
) {
  const parsed = projectArtifactInputSchema.safeParse(input);
  if (!parsed.success) return false;
  const { projectId, resourceId, role } = parsed.data;
  // Invoker RPC derives auth.uid(), checks both owned endpoints, and locks the
  // Project across primary demotion + promotion. No client-supplied owner.
  const result = await client.rpc("set_project_resource_role", {
    p_project_id: projectId,
    p_resource_id: resourceId,
    p_role: role,
  });
  return !result.error;
}
