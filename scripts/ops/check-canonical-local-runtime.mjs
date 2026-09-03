#!/usr/bin/env node
import {
  CANONICAL_TARGET_PROJECT,
  DEFAULT_CLI_PROJECT,
  assertCanonicalTargetRuntime,
  localRuntimeClassification,
} from "./local-runtime-contract.mjs";

async function main() {
  const canonicalTarget = await assertCanonicalTargetRuntime();
  const classification = await localRuntimeClassification();

  console.log("CANONICAL_TARGET_READY");
  console.log(`CANONICAL_TARGET_PROJECT=${CANONICAL_TARGET_PROJECT}`);
  console.log(
    classification.defaultCli.running
      ? `DEFAULT_CLI_DIFFERENT_STACK_PRESENT=${DEFAULT_CLI_PROJECT}`
      : "DEFAULT_CLI_DIFFERENT_STACK_NOT_RUNNING",
  );
  console.log(
    classification.legacySourceRunning
      ? "LEGACY_SOURCE_RUNNING_READ_ONLY"
      : classification.legacySourcePresent
        ? "LEGACY_SOURCE_PRESENT_NOT_RUNNING"
        : "LEGACY_SOURCE_NOT_RUNNING",
  );
  console.log(`TARGET_DB_CONTAINER=${canonicalTarget.containerName}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "RUNTIME_GUARD_FAILED");
  process.exitCode = 1;
});
