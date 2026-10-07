import "server-only";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { createAuthenticatedApplicationContext } from "./application-context";
import { presentationRead, type PresentationRead } from "./presentation-read";
export type WorkbenchData = PresentationRead<
  import("../supabase/repositories/entity-workbench-read").WorkbenchData
>;

export async function readEntityWorkbench(
  allowUnavailableDependencies = false,
) {
  if ((await getCurrentLifeOsProfileId()) !== "manual") return null;
  const auth = await createAuthenticatedApplicationContext();
  return auth.ok
    ? presentationRead(
        await auth.data.reads.workbench(allowUnavailableDependencies),
      )
    : null;
}
