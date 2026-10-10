import { createHash } from "node:crypto";
import { readFileSync, readdirSync, existsSync, lstatSync } from "node:fs";
import { join } from "node:path";
import { NODE, PNPM, deny } from "./preview-cd-core.mjs";
import { boundary, readJson } from "./preview-cd-host.mjs";

// Frozen v1 contract at the explicitly approved pre-v2 revision. Never selected
// from a missing file or caller-controlled legacy flag. New v9 revisions require
// a separately reviewed contract, not a guessed compatibility exception.
export const V9_SHA = "6705607afa033e555b800901366837d6bbef73a2";
export function compatibilityFingerprintV9(release) {
  const pkg = JSON.parse(readFileSync(join(release, "package.json"), "utf8"));
  if (pkg.engines.node !== NODE || pkg.packageManager !== `pnpm@${PNPM}`)
    deny("TOOLCHAIN_CHANGED");
  const paths = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = join(dir, entry.name);
      if (entry.isSymbolicLink()) deny("SOURCE_BOUNDARY_INVALID");
      if (entry.isDirectory()) walk(file);
      else if (
        !entry.name.endsWith(".test.ts") &&
        /schema|catalog|runtime\.ts$|runtime-configuration|owner-context|bootstrap|writer-lease|file-boundary|codecs|request-boundary|gateway|hosted/.test(
          entry.name,
        )
      )
        paths.push(file);
    }
  }
  walk(join(release, "src/features/real-data/sqlite"));
  paths.push(
    join(release, "src/instrumentation.ts"),
    join(release, "src/features/real-data/runtime/application-context.ts"),
    join(release, "src/features/real-data/runtime/configuration.ts"),
    join(release, "scripts/ops/run-production.mjs"),
  );
  const hash = createHash("sha256").update(
    JSON.stringify({
      node: pkg.engines.node,
      pnpm: pkg.packageManager,
      driver: pkg.dependencies["better-sqlite3"],
      next: pkg.dependencies.next,
    }),
  );
  for (const name of ["next.config.ts", ".npmrc", "pnpm-workspace.yaml"]) {
    const file = join(release, name);
    hash.update(name).update(existsSync(file) ? readFileSync(file) : "ABSENT");
  }
  for (const path of paths.sort())
    hash.update(path.slice(release.length)).update(readFileSync(path));
  return hash.digest("hex");
}

export const V9_COMPATIBILITY =
  "44fa483a4ef6a52b6f6c68576744753ff6185d7b09c72e91800b6452e54dd11a";
const V9_SOURCE_DIGEST =
  "9b53526d78ecf0dbf62d995b28d56679385e40f3056c2f54bc6bfa3931b4e4cc";
const V9_WORKER_FILES = {
  "preview-cd.mjs":
    "5620c155f55fa8b72e3d1a2922651483a74a80a8bd4ca6b0b16ad69ea206ead6",
  "preview-cd-host.mjs":
    "637b1d0b5f76a42448e051602766cfaf5f7a17afb6c3e1236dc42175b5c5d924",
  "preview-cd-core.mjs":
    "b1a76a055c41a107e5a9a4a5445eac6c434af2d68905eabc1b3a1bab07eaba18",
  "preview-cd-preflight.mjs":
    "e8a3f8f5e7b8de50c2ac49da24065a03e12089a6994ae57e276b4bfec327f82a",
  "preview-cd-build-command.mjs":
    "fe2f90d77b944a5ebb2b47bcbb7ba92018e22560caed49cb65f4225fe40bba29",
  "managed-process.mjs":
    "1fe964bf17c585db419c2c4ee71821972ed97051a3230897844c03e3c4036276",
  "run-production.mjs":
    "ea28e5646bf2c34e71b9aebf70d9f4f4e00e6c388cf420c7f8d655585fb36b7f",
};

const sourceInputs = [
  ".npmrc",
  ".node-version",
  ".nvmrc",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "next.config.ts",
  "tsconfig.json",
  "postcss.config.mjs",
  "eslint.config.mjs",
  "src",
  "scripts",
];
// Exact shipped source inventory at V9_SHA, including unselected v1 fingerprint
// files. Reject mixed/modified source even if its legacy fingerprint still matches.
export function frozenV9SourceDigest(root) {
  const hash = createHash("sha256");
  function visit(relative) {
    const file = join(root, relative);
    if (!existsSync(file)) {
      hash.update(relative).update("ABSENT");
      return;
    }
    const stat = boundary(file, { directory: false, privateMode: false });
    hash.update(relative).update(readFileSync(file));
    return stat;
  }
  function walk(relative) {
    const file = join(root, relative);
    if (["src", "scripts"].includes(relative) || relative.includes("/")) {
      // lstat prevents a linked directory from entering the frozen inventory.
      const stat = lstatSync(file);
      if (stat.isDirectory()) {
        boundary(file, { directory: true, privateMode: false });
        for (const name of readdirSync(file).sort())
          walk(relative + "/" + name);
        return;
      }
    }
    visit(relative);
  }
  sourceInputs.forEach(walk);
  return hash.digest("hex");
}
export function validateV9Release(release) {
  boundary(release.path, { directory: true });
  if (
    release.sha !== V9_SHA ||
    !/^[A-Za-z0-9_-]{1,100}$/.test(release.buildId) ||
    release.compatibility !== V9_COMPATIBILITY
  )
    deny("UPGRADE_V9_CONTRACT_UNKNOWN");
  boundary(join(release.path, ".next"), {
    directory: true,
    privateMode: false,
  });
  boundary(join(release.path, ".next/BUILD_ID"), { privateMode: false });
  // Manifest always required here; legacy=true never waives a check.
  const manifest = readJson(join(release.path, "preview-release.json"));
  if (
    manifest.sha !== release.sha ||
    manifest.buildId !== release.buildId ||
    manifest.compatibility !== V9_COMPATIBILITY ||
    readFileSync(join(release.path, ".next/BUILD_ID"), "utf8").trim() !==
      release.buildId ||
    compatibilityFingerprintV9(release.path) !== V9_COMPATIBILITY ||
    frozenV9SourceDigest(release.path) !== V9_SOURCE_DIGEST
  )
    deny("UPGRADE_V9_IDENTITY_CHANGED");
}
export function validateV9WorkerSource(path) {
  boundary(path, { directory: true });
  for (const [name, digest] of Object.entries(V9_WORKER_FILES)) {
    const file = join(path, "scripts/ops", name);
    boundary(file, { privateMode: false });
    if (
      createHash("sha256").update(readFileSync(file)).digest("hex") !== digest
    )
      deny("UPGRADE_V9_WORKER_CHANGED");
  }
}
