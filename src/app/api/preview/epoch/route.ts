import { authenticatedPreviewRuntime } from "@/features/real-data/runtime/application-context";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
export async function GET() {
  if ((await getCurrentLifeOsProfileId()) !== "manual")
    return Response.json({ available: false }, { headers: { "Cache-Control": "no-store" } });
  const runtime = await authenticatedPreviewRuntime();
  if (!runtime) return Response.json({ available: false }, { headers: { "Cache-Control": "no-store" } });
  return Response.json(
    { epoch: runtime.store.datasetState(runtime.owner).epoch },
    { headers: { "Cache-Control": "no-store" } },
  );
}
