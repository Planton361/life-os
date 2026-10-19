import "server-only";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { hostname } from "node:os";
import { dirname, isAbsolute, resolve, relative } from "node:path";
import { z } from "zod";

export const previewWorkerVersion = 2;
const grantSchema = z
  .object({
    version: z.literal(2),
    schema: z.literal(10),
    instance: z.uuid(),
    host: z.string().min(1),
    uid: z.number().int().nonnegative(),
    device: z.number().int(),
    inode: z.number().int(),
    owner: z.uuid(),
    origin: z.string().url(),
    login: z.string().min(1),
  })
  .strict();
export type PreviewGrant = z.infer<typeof grantSchema>;
type LaunchBinding = Readonly<{
  grantPath: string;
  releasePath: string;
  buildId: string;
  pid: number;
}>;
declare global {
  var __lifeOsPreviewLaunch: LaunchBinding | undefined;
}

// This expression is replaced at Next build time. Runtime flags cannot turn a
// normal Hosted/Supabase artifact into a Preview artifact.
export function isPreviewComposition() {
  return process.env.LIFE_OS_BUILD_COMPOSITION === "personal-preview-v2";
}
function privatePath(path: string, directory = false) {
  if (
    !isAbsolute(path) ||
    resolve(path) !== path ||
    realpathSync(path) !== path
  )
    throw new Error("PREVIEW_GRANT_DENIED");
  const stat = lstatSync(path);
  if (
    stat.isSymbolicLink() ||
    (directory ? !stat.isDirectory() : !stat.isFile() || stat.nlink !== 1) ||
    stat.uid !== process.getuid?.() ||
    (stat.mode & 0o777) !== (directory ? 0o700 : 0o600)
  )
    throw new Error("PREVIEW_GRANT_DENIED");
  return stat;
}
export function currentPreviewGrant(
  path: string,
  owner: string,
  origin?: string,
  login?: string,
): PreviewGrant {
  if (!isPreviewComposition()) throw new Error("PREVIEW_COMPOSITION_REQUIRED");
  const launch = globalThis.__lifeOsPreviewLaunch;
  if (
    !launch ||
    launch.pid !== process.pid ||
    launch.releasePath !== process.cwd()
  )
    throw new Error("PREVIEW_LAUNCH_REQUIRED");
  if (relative(launch.releasePath, launch.grantPath).split("/")[0] !== "..")
    throw new Error("PREVIEW_GRANT_DENIED");
  privatePath(dirname(launch.grantPath), true);
  privatePath(launch.grantPath);
  const grant = grantSchema.parse(
    JSON.parse(readFileSync(launch.grantPath, "utf8")),
  );
  const marker = JSON.parse(
    readFileSync(
      resolve(launch.releasePath, ".next/life-preview-composition.json"),
      "utf8",
    ),
  );
  if (
    marker.version !== 2 ||
    marker.buildId !== launch.buildId ||
    readFileSync(
      resolve(launch.releasePath, ".next/BUILD_ID"),
      "utf8",
    ).trim() !== launch.buildId
  )
    throw new Error("PREVIEW_COMPOSITION_REQUIRED");
  const db = privatePath(path);
  privatePath(dirname(path), true);
  if (
    grant.host !== hostname() ||
    grant.uid !== process.getuid?.() ||
    grant.device !== db.dev ||
    grant.inode !== db.ino ||
    grant.owner !== owner ||
    (origin !== undefined && grant.origin !== origin) ||
    (login !== undefined && grant.login !== login)
  )
    throw new Error("PREVIEW_GRANT_DENIED");
  return Object.freeze(grant);
}

declare const brand: unique symbol;
export type PreviewResetAdmission = Readonly<{
  instance: string;
  session: string;
  [brand]: true;
}>;
type AdmissionPolicy = {
  path: string;
  owner: string;
  origin: string;
  login: string;
  instance: string;
};
const serverGlobal = globalThis as typeof globalThis & {
  __lifeOsPreviewAdmissions?: WeakMap<object, AdmissionPolicy>;
};
// Next route bundles share the process-owned runtime. Preserve opaque object
// identity across those bundles, as the existing OwnerContext boundary does.
const admissions = (serverGlobal.__lifeOsPreviewAdmissions ??= new WeakMap<
  object,
  AdmissionPolicy
>());
// Called only after authenticated Manual request + Origin/Host admission.
export function admitPreviewReset(
  policy: { path: string; owner: string; origin: string; login: string },
  session: string,
): PreviewResetAdmission {
  const grant = currentPreviewGrant(
    policy.path,
    policy.owner,
    policy.origin,
    policy.login,
  );
  const admission = Object.freeze({
    instance: grant.instance,
    session,
  }) as PreviewResetAdmission;
  admissions.set(admission, { ...policy, instance: grant.instance });
  return admission;
}
export function requirePreviewReset(
  admission: PreviewResetAdmission,
  path: string,
  owner: string,
) {
  const policy = admissions.get(admission);
  if (
    !policy ||
    policy.path !== path ||
    policy.owner !== owner ||
    currentPreviewGrant(path, owner, policy.origin, policy.login).instance !==
      policy.instance
  )
    throw new Error("PREVIEW_RESET_DENIED");
  return admission;
}
