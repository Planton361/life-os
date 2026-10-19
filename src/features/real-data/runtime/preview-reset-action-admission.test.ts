import { beforeEach, expect, it, vi } from "vitest";
import { authenticateGatewayRequest } from "../sqlite/request-boundary";

const f = vi.hoisted(() => ({
  profile: "manual",
  header: new Headers(),
  runtimeAvailable: true,
  grant: true,
  prepare: vi.fn(),
  execute: vi.fn(),
  receipt: vi.fn(),
  admission: vi.fn(),
  jar: new Map<string, string>(),
}));
const policy = {
  ownerId: "22222222-2222-4222-8222-222222222222",
  ownerLogin: "fixture@example.test",
  origin: "https://fixture.ts.net",
};
vi.mock("next/headers", () => ({
  headers: async () => f.header,
  cookies: async () => ({
    get: (name: string) => ({ value: f.jar.get(name) }),
    set: (name: string, value: string) => f.jar.set(name, value),
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/profile-data/profile-cookie", () => ({
  getCurrentLifeOsProfileId: async () => f.profile,
}));
vi.mock("./application-context", () => ({
  authenticatedPreviewRuntime: async () => {
    const owner = authenticateGatewayRequest(f.header, policy);
    if (!f.runtimeAvailable || !owner) return null;
    return {
      owner,
      userId: policy.ownerId,
      config: { ...policy, path: "disposable-fixture" },
      store: {
        preparePreviewReset: f.prepare,
        executePreviewReset: f.execute,
        previewResetReceipt: f.receipt,
      },
    };
  },
}));
vi.mock("../sqlite/preview-grant", () => ({
  admitPreviewReset: (...args: unknown[]) => {
    f.admission(...args);
    if (!f.grant) throw new Error("PREVIEW_GRANT_DENIED");
    return {};
  },
}));
import {
  preparePreviewResetAction,
  executePreviewResetAction,
  previewResetReceiptAction,
} from "../actions/preview-reset.actions";
const input = {
  token: "a".repeat(72),
  commandId: "33333333-3333-4333-8333-333333333333",
  confirmation: "ZURÜCKSETZEN",
};
beforeEach(() => {
  vi.clearAllMocks();
  f.profile = "manual";
  f.runtimeAvailable = true;
  f.grant = true;
  f.header = new Headers({
    host: "fixture.ts.net",
    origin: policy.origin,
    "tailscale-user-login": policy.ownerLogin,
    "sec-fetch-site": "same-origin",
  });
  f.jar.clear();
  f.jar.set(
    "life-preview-reset-session",
    "44444444-4444-4444-8444-444444444444",
  );
});
async function denyAll() {
  expect((await preparePreviewResetAction()).ok).toBe(false);
  expect((await executePreviewResetAction(input)).ok).toBe(false);
  expect(
    (await previewResetReceiptAction({ commandId: input.commandId })).ok,
  ).toBe(false);
  expect(f.prepare).not.toHaveBeenCalled();
  expect(f.execute).not.toHaveBeenCalled();
  expect(f.receipt).not.toHaveBeenCalled();
}
it.each(["demo", "empty"])(
  "direct endpoints deny %s independently of UI",
  async (profile) => {
    f.profile = profile;
    await denyAll();
  },
);
it("no Preview runtime (Supabase/synthetic/standard) or revoked grant cannot call reset", async () => {
  f.runtimeAvailable = false;
  await denyAll();
  f.runtimeAvailable = true;
  f.grant = false;
  await denyAll();
});
it.each([
  ["tailscale-user-login", "foreign@example.test"],
  ["host", "foreign.ts.net"],
  ["origin", "https://foreign.ts.net"],
  ["x-forwarded-host", "foreign.ts.net"],
  ["sec-fetch-site", "cross-site"],
  ["tailscale-user-login", ""],
])("direct endpoints deny forged %s", async (key, value) => {
  f.header.set(key, value);
  await denyAll();
});
it("strict execute/receipt input rejects client owner/table/SQL and inexact confirmation", async () => {
  for (const value of [
    { ...input, owner: policy.ownerId },
    { ...input, tables: ["tasks"] },
    { ...input, sql: "DELETE FROM tasks" },
    { ...input, confirmation: "ZURÜCKSETZEN " },
  ])
    expect((await executePreviewResetAction(value)).ok).toBe(false);
  expect(
    (
      await previewResetReceiptAction({
        commandId: input.commandId,
        owner: policy.ownerId,
      })
    ).ok,
  ).toBe(false);
  expect(f.execute).not.toHaveBeenCalled();
  expect(f.receipt).not.toHaveBeenCalled();
});
