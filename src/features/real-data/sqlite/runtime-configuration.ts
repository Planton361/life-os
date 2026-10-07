import "server-only";

export function assertNoRetiredProofConfiguration(environment: Readonly<Record<string, string | undefined>> = process.env) {
  if (["LIFE_OS_37_PROOF", "LIFE_OS_37_SQLITE_DB", "LIFE_OS_37_OWNER_TOKEN"].some(key => environment[key] !== undefined))
    throw new Error("RETIRED_SQLITE_PROOF_CONFIGURATION_DENIED");
}
