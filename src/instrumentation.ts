export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertNoRetiredProofConfiguration } = await import("./features/real-data/sqlite/runtime-configuration");
    try {
      assertNoRetiredProofConfiguration();
      const { prepareApplicationRuntime } = await import("./features/real-data/runtime/application-context");
      await prepareApplicationRuntime();
      const { applicationRuntimeConfiguration } = await import("./features/real-data/runtime/configuration");
      const config = applicationRuntimeConfiguration();
      if (config.backend === "sqlite-hosted") {
        // Next 16.2.2 fetches Server Action redirect RSC using this origin.
        // Its startup default is loopback, which replaces Host during fetch.
        // Re-enter the real gateway rather than relaxing Host/identity checks.
        process.env.__NEXT_PRIVATE_ORIGIN = config.origin;
      }
    }
    catch (error) {
      const code = error instanceof Error && /^[A-Z_]+$/.test(error.message) ? error.message : "LIFE_OS_RUNTIME_STARTUP_DENIED";
      process.stderr.write(`${code}\n`);
      process.exit(1);
    }
  }
}
