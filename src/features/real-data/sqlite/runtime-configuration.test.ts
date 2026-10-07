import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { assertNoRetiredProofConfiguration } from "./runtime-configuration";

it("rejects retired proof configuration instead of falling through to profile data", () => {
  expect(() => assertNoRetiredProofConfiguration({})).not.toThrow();
  for (const key of ["LIFE_OS_37_PROOF", "LIFE_OS_37_SQLITE_DB", "LIFE_OS_37_OWNER_TOKEN"])
    for (const value of ["", "1", "synthetic-placeholder"])
      expect(() => assertNoRetiredProofConfiguration({ [key]: value })).toThrow("RETIRED_SQLITE_PROOF_CONFIGURATION_DENIED");
});
