import { deny } from "./preview-cd-core.mjs";
// Versioned operator protocol, not normal deploy/self-update. Persist a recovery
// checkpoint BEFORE touching the canonical schema. No phase ever resets data.
export async function upgradeExistingProtocol(io) {
  await io.authorize();
  const prepared = await io.prepareCompatiblePair();
  await io.authorize();
  let checkpoint = await io.originalCheckpoint();
  await io.save({ phase: "release-prepared", prepared, checkpoint });
  await io.stopFrozenWorker();
  await io.freeSingleWriter();
  try {
    checkpoint = await io.backupAndProveRecovery(prepared);
    await io.save({ phase: "prepared", prepared, checkpoint });
    await io.armNewWorker(prepared);
    await io.authorize();
    await io.migrateSameFile();
  } catch (error) {
    // Read committed schema from disk, including a lost migration response.
    const version = await io.schemaVersion();
    if (version === 9) {
      await io.save({ phase: "aborted-v9", prepared, checkpoint });
      await io.restoreOldWorker(checkpoint);
    } else await io.save({ phase: "recovery-required-v10", prepared, checkpoint });
    throw error;
  }
  if ((await io.schemaVersion()) !== 10) deny("UPGRADE_SCHEMA_INVALID");
  await io.publishCompatiblePair(prepared);
  await io.save({ phase: "committed-v10", prepared, checkpoint });
  try {
    await io.startAndProve(prepared.candidate);
  } catch {
    await io.freeSingleWriter();
    await io.startAndProve(prepared.fallback);
    await io.selectFallback(prepared.fallback);
  }
  await io.save({ phase: "complete-v10", prepared, checkpoint });
  return { upgrade: "PROVISIONED_V2", reset: "NOT_PERFORMED" };
}
export async function recoverExistingProtocol(io, journal) {
  if (
    !journal?.prepared ||
    !journal?.checkpoint ||
    journal.phase === "complete-v10"
  )
    deny("UPGRADE_RECOVERY_CHECKPOINT_REQUIRED");
  await io.authorize();
  await io.stopFrozenWorker();
  await io.freeSingleWriter();
  const schema = await io.schemaVersion();
  if (schema === 9) {
    await io.restoreOldWorker(journal.checkpoint);
    await io.save({ ...journal, phase: "aborted-v9" });
    return { recovery: "V9_ORIGINAL", reset: "NOT_PERFORMED" };
  }
  if (schema !== 10) deny("UPGRADE_RECOVERY_SCHEMA_UNKNOWN");
  await io.armNewWorker(journal.prepared);
  await io.publishCompatiblePair(journal.prepared);
  await io.startAndProve(journal.prepared.fallback);
  await io.selectFallback(journal.prepared.fallback);
  await io.save({ ...journal, phase: "complete-v10" });
  return { recovery: "V10_COMPATIBLE_FALLBACK", reset: "NOT_PERFORMED" };
}
