import {
  containsExportCredential,
  sameOriginExportRequest,
} from "@/features/obsidian-projection/export-security";
import { createAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import {
  readProjectProjection,
  projectExportInput,
  ProjectionReadError,
} from "@/features/real-data/supabase/repositories/project-projection-read";
import {
  contentHash,
  projectMarkdown,
} from "@/features/obsidian-projection/project-markdown";
import { zipPackage } from "@/features/obsidian-projection/zip-package";
export const runtime = "nodejs";
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
const error = (message: string, status: number) =>
  Response.json({ message }, { status, headers });
export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  if (!sameOriginExportRequest(request))
    return error("Export nur direkt aus Life OS möglich.", 403);
  if ((await getCurrentLifeOsProfileId()) !== "manual")
    return error("Der Export benötigt das Manual-Profil.", 403);
  const auth = await createAuthenticatedSupabaseServerClient();
  if (!auth.ok)
    return error("Bitte lokal anmelden und erneut exportieren.", 401);
  const input = projectExportInput.safeParse(await context.params);
  if (!input.success) return error("Ungültiges Project.", 400);
  try {
    const source = await readProjectProjection(
      auth.client,
      auth.user.id,
      input.data,
    );
    // No transaction/migration is introduced for export. Detect changes across two
    // bounded reads; inconsistent snapshots fail visibly instead of shipping stale edges.
    const verification = await readProjectProjection(
      auth.client,
      auth.user.id,
      input.data,
    );
    if (
      contentHash(JSON.stringify(source)) !==
      contentHash(JSON.stringify(verification))
    )
      return error(
        "Project-Daten haben sich geändert. Bitte erneut exportieren.",
        409,
      );
    const projection = projectMarkdown(source);
    const manifest = JSON.stringify(projection.manifest, null, 2) + "\n";
    const files = [
      { path: ".life-os-projection.json", content: manifest },
      ...projection.files,
    ];
    // Defense in depth for accidentally pasted common credentials. No system secrets,
    // auth session or provider configuration is ever part of the source allowlist.
    if (files.some((f) => containsExportCredential(f.content)))
      return error(
        "Export enthält möglicherweise Zugangsdaten. Bitte entferne sie aus dem Project-Kontext.",
        422,
      );
    const zip = zipPackage(
      files.map((f) => ({
        path: `${projection.folder}/${f.path}`,
        content: f.content,
      })),
    );
    return new Response(zip, {
      headers: {
        ...headers,
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="Life-OS-Project.zip"; filename*=UTF-8''${encodeURIComponent(`${projection.folder}.zip`).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}`,
      },
    });
  } catch (cause) {
    return error(
      cause instanceof ProjectionReadError
        ? cause.message
        : "Export konnte nicht erstellt werden. Bitte erneut versuchen.",
      422,
    );
  }
}
