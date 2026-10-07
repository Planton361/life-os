import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { applicationRuntimeConfiguration } from "./configuration";
describe("application runtime selector", () => {
  const synthetic = {
    LIFE_OS_APPLICATION_RUNTIME: "sqlite-synthetic",
    LIFE_OS_SYNTHETIC_SQLITE_PATH: "/synthetic/acceptance.db",
    LIFE_OS_SYNTHETIC_ORIGIN: "http://127.0.0.1:3116",
    LIFE_OS_SYNTHETIC_AUTH: "issue",
  };
  it("keeps personal operation on Supabase unless explicitly selected", () => {
    expect(applicationRuntimeConfiguration({})).toEqual({
      backend: "supabase",
    });
    expect(
      applicationRuntimeConfiguration({
        LIFE_OS_APPLICATION_RUNTIME: "supabase",
      }),
    ).toEqual({ backend: "supabase" });
    expect(() =>
      applicationRuntimeConfiguration({
        LIFE_OS_SYNTHETIC_SQLITE_PATH: "/synthetic/acceptance.db",
      }),
    ).toThrow("SYNTHETIC_CONFIGURATION_WITHOUT_SELECTOR");
  });
  it("requires an explicit server-side authentication policy and loopback proof origin", () => {
    expect(applicationRuntimeConfiguration(synthetic)).toMatchObject({
      backend: "sqlite-synthetic",
      issueAuthentication: true,
    });
    expect(
      applicationRuntimeConfiguration({
        ...synthetic,
        LIFE_OS_SYNTHETIC_AUTH: "blocked",
      }),
    ).toMatchObject({ issueAuthentication: false });
    for (const origin of [
      "https://example.com",
      "http://127.0.0.1:3116/path",
      "http://user:password@localhost:3116",
      "file:///tmp/proof",
    ])
      expect(() =>
        applicationRuntimeConfiguration({
          ...synthetic,
          LIFE_OS_SYNTHETIC_ORIGIN: origin,
        }),
      ).toThrow();
    expect(() =>
      applicationRuntimeConfiguration({
        ...synthetic,
        LIFE_OS_SYNTHETIC_AUTH: undefined,
      }),
    ).toThrow("SYNTHETIC_APPLICATION_CONFIGURATION_REQUIRED");
    expect(() =>
      applicationRuntimeConfiguration({
        LIFE_OS_APPLICATION_RUNTIME: "sqlite",
      }),
    ).toThrow("APPLICATION_RUNTIME_SELECTOR_INVALID");
  });
});
