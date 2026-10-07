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

describe("hosted selector", () => {
  const hosted = {
    LIFE_OS_APPLICATION_RUNTIME: "sqlite-hosted",
    LIFE_OS_HOSTED_SQLITE_PATH: "/var/lib/life-os/canonical.db",
    LIFE_OS_HOSTED_ORIGIN: "https://life-os.owner-tailnet.ts.net",
    LIFE_OS_HOSTED_OWNER_LOGIN: "owner@example.invalid",
  };
  it("uses only explicit server configuration and keeps absent-selector Supabase", () => {
    expect(applicationRuntimeConfiguration(hosted)).toEqual({
      backend: "sqlite-hosted",
      path: hosted.LIFE_OS_HOSTED_SQLITE_PATH,
      origin: hosted.LIFE_OS_HOSTED_ORIGIN,
      ownerLogin: hosted.LIFE_OS_HOSTED_OWNER_LOGIN,
    });
    expect(
      applicationRuntimeConfiguration({
        NEXT_PUBLIC_LIFE_OS_APPLICATION_RUNTIME: "sqlite-hosted",
      }),
    ).toEqual({ backend: "supabase" });
    expect(() =>
      applicationRuntimeConfiguration({
        ...hosted,
        LIFE_OS_APPLICATION_RUNTIME: undefined,
      }),
    ).toThrow("HOSTED_CONFIGURATION_WITHOUT_SELECTOR");
    expect(() =>
      applicationRuntimeConfiguration({
        ...hosted,
        LIFE_OS_SYNTHETIC_AUTH: "issue",
      }),
    ).toThrow("MIXED_SQLITE_CONFIGURATION_DENIED");
  });
  it("rejects incomplete identity and origins outside the accepted private topology", () => {
    for (const login of [
      undefined,
      "",
      " owner@example.invalid",
      "owner,other",
      "owner\nother",
    ])
      expect(() =>
        applicationRuntimeConfiguration({
          ...hosted,
          LIFE_OS_HOSTED_OWNER_LOGIN: login,
        }),
      ).toThrow();
    for (const origin of [
      "http://life-os.owner-tailnet.ts.net",
      "https://public.example.com",
      hosted.LIFE_OS_HOSTED_ORIGIN + "/path",
      "https://user:pass@life-os.owner-tailnet.ts.net",
      hosted.LIFE_OS_HOSTED_ORIGIN + ":3000",
    ])
      expect(() =>
        applicationRuntimeConfiguration({
          ...hosted,
          LIFE_OS_HOSTED_ORIGIN: origin,
        }),
      ).toThrow();
  });
});
