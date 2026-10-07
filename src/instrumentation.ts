export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertNoRetiredProofConfiguration } = await import("./features/real-data/sqlite/runtime-configuration");
    try {
      assertNoRetiredProofConfiguration();
      const { prepareApplicationRuntime } = await import("./features/real-data/runtime/application-context");
      await prepareApplicationRuntime();
    }
    catch (error) {
      const code = error instanceof Error && /^[A-Z_]+$/.test(error.message) ? error.message : "LIFE_OS_RUNTIME_STARTUP_DENIED";
      process.stderr.write(`${code}\n`);
      process.exit(1);
    }
  }
}
