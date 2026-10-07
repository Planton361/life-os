import { afterEach, describe, expect, it, vi } from "vitest";

const prepare = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("./application-context", () => ({ prepareApplicationRuntime: prepare }));
import { register } from "../../../instrumentation";

afterEach(() => {
  vi.unstubAllEnvs();
  prepare.mockClear();
});

describe("Next Server Action redirect origin", () => {
  it("re-enters the configured hosted gateway after canonical startup preflight", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.stubEnv("__NEXT_PRIVATE_ORIGIN", "http://127.0.0.1:3000");
    vi.stubEnv("LIFE_OS_APPLICATION_RUNTIME", "sqlite-hosted");
    vi.stubEnv("LIFE_OS_HOSTED_SQLITE_PATH", "/private/canonical.db");
    vi.stubEnv("LIFE_OS_HOSTED_ORIGIN", "https://life-os.owner-tailnet.ts.net");
    vi.stubEnv("LIFE_OS_HOSTED_OWNER_LOGIN", "owner@example.invalid");
    prepare.mockImplementationOnce(async () => {
      expect(process.env.__NEXT_PRIVATE_ORIGIN).toBe("http://127.0.0.1:3000");
    });
    await register();
    expect(prepare).toHaveBeenCalledOnce();
    expect(process.env.__NEXT_PRIVATE_ORIGIN).toBe("https://life-os.owner-tailnet.ts.net");
  });

  it.each([undefined, "supabase", "sqlite-synthetic"])("preserves Next's origin for %s", async (backend) => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.stubEnv("__NEXT_PRIVATE_ORIGIN", "http://127.0.0.1:3000");
    vi.stubEnv("LIFE_OS_APPLICATION_RUNTIME", backend);
    if (backend === "sqlite-synthetic") {
      vi.stubEnv("LIFE_OS_SYNTHETIC_SQLITE_PATH", "/private/synthetic.db");
      vi.stubEnv("LIFE_OS_SYNTHETIC_ORIGIN", "http://127.0.0.1:3116");
      vi.stubEnv("LIFE_OS_SYNTHETIC_AUTH", "issue");
    }
    await register();
    expect(process.env.__NEXT_PRIVATE_ORIGIN).toBe("http://127.0.0.1:3000");
  });
});
