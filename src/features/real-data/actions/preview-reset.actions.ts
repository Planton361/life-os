"use server";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { authenticatedPreviewRuntime } from "../runtime/application-context";
import { assertBrowserWriteOrigin } from "../sqlite/request-boundary";
import { admitPreviewReset } from "../sqlite/preview-grant";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";

const executeSchema = z
  .object({
    token: z.string().length(72),
    commandId: z.uuid(),
    confirmation: z.literal("ZURÜCKSETZEN"),
  })
  .strict();
const receiptSchema = z.object({ commandId: z.uuid() }).strict();
async function admission(createSession = false) {
  if ((await getCurrentLifeOsProfileId()) !== "manual")
    throw new Error("RESET_DENIED");
  const runtime = await authenticatedPreviewRuntime();
  if (!runtime) throw new Error("RESET_DENIED");
  assertBrowserWriteOrigin(new Headers(await headers()), runtime.config.origin);
  const jar = await cookies();
  let session = jar.get("life-preview-reset-session")?.value;
  if (!session && createSession) {
    session = randomUUID();
    jar.set("life-preview-reset-session", session, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: 86400,
    });
  }
  if (!session || !z.uuid().safeParse(session).success)
    throw new Error("RESET_DENIED");
  const permission = admitPreviewReset(
    {
      path: runtime.config.path,
      owner: runtime.userId,
      origin: runtime.config.origin,
      login: runtime.config.ownerLogin,
    },
    createHash("sha256").update(session).digest("hex"),
  );
  return { ...runtime, permission };
}
export async function preparePreviewResetAction() {
  try {
    const a = await admission(true);
    return {
      ok: true as const,
      challenge: a.store.preparePreviewReset(a.owner, a.permission),
    };
  } catch {
    return {
      ok: false as const,
      message:
        "Zurücksetzen nicht verfügbar. Bitte die Preview-Berechtigung prüfen und neu laden.",
    };
  }
}
export async function executePreviewResetAction(input: unknown) {
  const parsed = executeSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false as const,
      message: "Bitte exakt ZURÜCKSETZEN eingeben.",
    };
  try {
    const a = await admission();
    const receipt = a.store.executePreviewReset(
      a.owner,
      a.permission,
      parsed.data,
    );
    revalidatePath("/", "layout");
    return { ok: true as const, receipt };
  } catch {
    return {
      ok: false as const,
      message:
        "Zurücksetzen nicht bestätigt. Daten oder Berechtigung können sich geändert haben. Bitte den Status prüfen oder neu vorbereiten.",
    };
  }
}
export async function previewResetReceiptAction(input: unknown) {
  const parsed = receiptSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  try {
    const a = await admission();
    return {
      ok: true as const,
      receipt: a.store.previewResetReceipt(
        a.owner,
        a.permission,
        parsed.data.commandId,
      ),
    };
  } catch {
    return { ok: false as const };
  }
}
