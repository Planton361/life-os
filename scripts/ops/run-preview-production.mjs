import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { boundary, readJson } from "./preview-cd-host.mjs";
// Separate, frozen Worker allowlist launcher. Generic Hosted startup neither
// reads a grant nor installs this process-local binding.
const releasePath = process.cwd();
const grantPath = process.env.LIFE_OS_PREVIEW_GRANT_PATH;
if (
  process.versions.node !== "24.21.0" ||
  process.env.LIFE_OS_APPLICATION_RUNTIME !== "sqlite-hosted" ||
  !grantPath ||
  process.argv.slice(2).length
)
  throw new Error("PREVIEW_LAUNCH_DENIED");
boundary(grantPath);
boundary(dirname(grantPath), { directory: true });
const marker = readJson(
  join(releasePath, ".next/life-preview-composition.json"),
);
const buildId = readFileSync(
  join(releasePath, ".next/BUILD_ID"),
  "utf8",
).trim();
if (marker.version !== 2 || marker.buildId !== buildId)
  throw new Error("PREVIEW_COMPOSITION_REQUIRED");
Object.defineProperty(globalThis, "__lifeOsPreviewLaunch", {
  value: Object.freeze({ grantPath, releasePath, buildId, pid: process.pid }),
  writable: false,
  configurable: false,
});
delete process.env.LIFE_OS_PREVIEW_GRANT_PATH;
await import("./run-production.mjs");
