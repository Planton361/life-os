// Only the operator CLI calls this protocol. No HTTP/Action, deployment hook,
// login or merge invokes it. Every stage is explicit and independently gated.
export async function linuxPreviewOperation(operation, io) {
  if (!["build", "prove", "provision", "start", "revoke"].includes(operation))
    throw new Error("LINUX_OPERATOR_COMMAND_INVALID");
  await io.authorize();
  if (operation === "revoke") return io.revoke();
  await io.verifySource();
  if (operation === "build") {
    await io.assertInactive();
    const release = await io.build();
    await io.authorize();
    await io.verifySource();
    return io.saveBuild(release);
  }
  await io.verifyRelease();
  if (operation === "prove") {
    await io.assertInactive();
    const proof = await io.backupAndRestore();
    await io.proveRestoredApplication(proof);
    await io.authorize();
    await io.verifySource();
    return io.saveProof(proof);
  }
  await io.verifyProof();
  await io.assertPortAndWriterFree();
  await io.authorize();
  await io.verifySource();
  if (operation === "provision") return io.provision();
  await io.verifyGrant();
  return io.start();
}
