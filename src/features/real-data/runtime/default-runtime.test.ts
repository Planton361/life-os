import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const adapters = vi.hoisted(() => ({
  authenticate: vi.fn(),
  verifySqlite: vi.fn(() => { throw new Error("DEFAULT_MUST_NOT_OPEN_SQLITE"); }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createAuthenticatedSupabaseServerClient: adapters.authenticate,
}));
vi.mock("../sqlite/synthetic-readiness", () => ({
  verifySyntheticApplicationDatabase: adapters.verifySqlite,
}));
import { createAuthenticatedApplicationContext } from "./application-context";

beforeEach(() => {
  for (const key of ["LIFE_OS_APPLICATION_RUNTIME", "LIFE_OS_SYNTHETIC_SQLITE_PATH", "LIFE_OS_SYNTHETIC_ORIGIN", "LIFE_OS_SYNTHETIC_AUTH"])
    vi.stubEnv(key, undefined);
  adapters.authenticate.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe("preserved default personal composition", () => {
  it("retains the existing Supabase authentication failure without SQLite activation", async () => {
    const failure = { ok: false, error: "unauthenticated" };
    adapters.authenticate.mockResolvedValueOnce(failure);
    expect(await createAuthenticatedApplicationContext()).toBe(failure);
    expect(adapters.authenticate).toHaveBeenCalledOnce();
    expect(adapters.verifySqlite).not.toHaveBeenCalled();
  });
  it("composes the existing Supabase adapters from its authenticated owner", async () => {
    const ownerId = "11600000-0000-4000-8000-000000000042";
    adapters.authenticate.mockResolvedValueOnce({ ok: true, user: { id: ownerId }, client: {} });
    const context = await createAuthenticatedApplicationContext();
    expect(context.ok && context.user.id).toBe(ownerId);
    expect(adapters.verifySqlite).not.toHaveBeenCalled();
    if (!context.ok) throw new Error("auth");
    expect(() => context.repositories.tasks.createTask({ userId: ownerId, profileId: ownerId, title: "Default read cannot write" })).toThrow("APPLICATION_WRITE_CONTEXT_REQUIRED");
  });
});
