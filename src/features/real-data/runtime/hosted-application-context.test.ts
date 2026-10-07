import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { bootstrapProductionDatabase } from "../sqlite/production-bootstrap";
import type { SqliteRuntime } from "../sqlite/runtime";
const request = vi.hoisted(() => ({
  headers: new Headers({
    origin: "https://life-os.owner-tailnet.ts.net",
    host: "life-os.owner-tailnet.ts.net",
    "tailscale-user-login": "owner@example.invalid",
  }),
}));
const supabase = vi.hoisted(() => ({
  authenticate: vi.fn(() => {
    throw new Error("SUPABASE_CALL_IN_SQLITE_PROOF");
  }),
}));
vi.mock("next/headers", () => ({ headers: async () => request.headers }));
vi.mock("@/lib/supabase/server", () => ({
  createAuthenticatedSupabaseServerClient: supabase.authenticate,
}));
import {
  readManualProfile,
  writeManualProfile,
  resetManualProfile,
} from "@/features/profile-data/manual-profile-store";
import { createAuthenticatedApplicationContext } from "./application-context";

const owner = "11600000-0000-4000-8000-000000000001";
let path: string;
const global = globalThis as typeof globalThis & {
  __lifeOsSqliteRuntime?: { path: string; store: SqliteRuntime };
};
beforeAll(() => {
  const directory = mkdtempSync(
    join(realpathSync(tmpdir()), "life-os-118-production-context-"),
  );
  path = join(directory, "canonical.db");
  bootstrapProductionDatabase(path, {
    ownerId: owner,
    displayName: "Hosted owner",
    timezone: "Europe/Berlin",
  });
  vi.stubEnv("LIFE_OS_APPLICATION_RUNTIME", "sqlite-hosted");
  vi.stubEnv("LIFE_OS_HOSTED_SQLITE_PATH", path);
  vi.stubEnv("LIFE_OS_HOSTED_ORIGIN", "https://life-os.owner-tailnet.ts.net");
  vi.stubEnv("LIFE_OS_HOSTED_OWNER_LOGIN", "owner@example.invalid");
});
afterAll(() => {
  global.__lifeOsSqliteRuntime?.store.close();
  delete global.__lifeOsSqliteRuntime;
  vi.unstubAllEnvs();
});

describe("hosted application composition using fresh canonical runtime", () => {
  it("derives owner server-side, uses normal applicationRuntime and admits actual writes", async () => {
    const auth = await createAuthenticatedApplicationContext("write");
    expect(auth.ok).toBe(true);
    if (!auth.ok) throw new Error("auth");
    expect(auth.user.id).toBe(owner);
    expect(Object.keys(auth)).toEqual(["ok", "user", "repositories", "data"]);
    const result = await auth.repositories.tasks.createTask({
      userId: owner,
      profileId: owner,
      title: "Application composition task",
    });
    expect(result.ok).toBe(true);
    const read = await createAuthenticatedApplicationContext();
    if (!read.ok) throw new Error("auth");
    const tasks = await read.repositories.tasks.getTasksByUser({
      userId: owner,
      profileId: owner,
    });
    expect(
      tasks.ok &&
        tasks.data.some((t) => t.title === "Application composition task"),
    ).toBe(true);
    expect(global.__lifeOsSqliteRuntime?.path).toBe(path);
    expect(() =>
      read.repositories.tasks.createTask({
        userId: owner,
        profileId: owner,
        title: "Denied read write",
      }),
    ).toThrow("APPLICATION_WRITE_CONTEXT_REQUIRED");
    const project = await auth.repositories.projects.createProject({
      userId: owner,
      profileId: owner,
      title: "Composition Project",
      status: "active",
    });
    if (!project.ok) throw new Error("project");
    const depth = await read.data.useCases.readProjectDepth(
      owner,
      project.data.id,
    );
    expect(depth.context.project_id).toBe(project.data.id);
    await expect(
      read.data.useCases.readProjectDepth(randomUUID(), project.data.id),
    ).rejects.toThrow("OWNER_DENIED");
    expect(JSON.stringify(auth.user)).not.toContain(path);
  });
  it("adapts exact native Skill revisions for the normal form contract", async () => {
    const auth = await createAuthenticatedApplicationContext("write");
    if (!auth.ok) throw new Error("auth");
    const created = await auth.data.useCases.skillDevelopmentCommand({
      operation: "skill.create",
      commandId: randomUUID(),
      skillId: null,
      expectedRevision: null,
      payload: { name: "Composition Skill" },
    });
    expect(created.error).toBeNull();
    const id = (created.data as { skill_id: string }).skill_id;
    const read = await auth.data.reads.skillDevelopment(id);
    const revision = (
      read.data as unknown as { skill: { development_revision: number } }
    ).skill.development_revision;
    expect(revision).toBe(0);
    const target = await auth.data.useCases.skillDevelopmentCommand({
      operation: "target.create",
      commandId: randomUUID(),
      skillId: id,
      expectedRevision: revision,
      payload: { title: "Composition Target", description: null },
    });
    expect(target.error).toBeNull();
    const updated = await auth.data.reads.skillDevelopment(id);
    expect(
      (updated.data as unknown as { targets: { title: string }[] }).targets[0]
        .title,
    ).toBe("Composition Target");
  });
  it("never uses legacy personal JSON in hosted mode", async () => {
    const profile = await readManualProfile();
    expect(profile.tasks).toEqual([]);
    expect(profile.projects).toEqual([]);
    await expect(writeManualProfile(profile)).rejects.toThrow(
      "SYNTHETIC_PERSONAL_PROFILE_WRITE_DENIED",
    );
    await expect(resetManualProfile()).rejects.toThrow(
      "SYNTHETIC_PERSONAL_PROFILE_WRITE_DENIED",
    );
  });
  it("rejects forged owner/profile inputs even after valid Origin admission", async () => {
    const auth = await createAuthenticatedApplicationContext("write");
    if (!auth.ok) throw new Error("auth");
    const result = await auth.repositories.tasks.createTask({
      userId: randomUUID(),
      profileId: owner,
      title: "Forged owner",
    });
    expect(result.ok).toBe(false);
    const other = await auth.repositories.inbox.createInboxItem({
      userId: owner,
      profileId: randomUUID(),
      title: "Forged profile",
    });
    expect(other.ok).toBe(false);
  });
  it.each([
    { origin: "http://evil.invalid", host: "life-os.owner-tailnet.ts.net" },
    { origin: "https://life-os.owner-tailnet.ts.net", host: "evil.invalid" },
    {
      origin: "https://life-os.owner-tailnet.ts.net",
      host: "life-os.owner-tailnet.ts.net",
      "tailscale-user-login": "owner@example.invalid",
      "x-forwarded-host": "evil.invalid",
    },
    {
      origin: "https://life-os.owner-tailnet.ts.net",
      host: "life-os.owner-tailnet.ts.net",
      "tailscale-user-login": "owner@example.invalid",
      "sec-fetch-site": "cross-site",
    },
    { host: "life-os.owner-tailnet.ts.net" },
  ])(
    "denies invalid browser boundary %j before issuing context",
    async (headers) => {
      request.headers = new Headers(
        Object.entries(headers).filter(
          (entry): entry is [string, string] => entry[1] !== undefined,
        ),
      );
      expect(await createAuthenticatedApplicationContext("write")).toEqual({
        ok: false,
        error: "auth_error",
      });
      request.headers = new Headers({
        origin: "https://life-os.owner-tailnet.ts.net",
        host: "life-os.owner-tailnet.ts.net",
        "tailscale-user-login": "owner@example.invalid",
      });
    },
  );
  it.each([
    null,
    "other@example.invalid",
    "owner@example.invalid, owner@example.invalid",
  ])("denies missing/wrong/ambiguous gateway %s", async (login) => {
    const saved = request.headers;
    request.headers = new Headers({
      host: "life-os.owner-tailnet.ts.net",
      origin: "https://life-os.owner-tailnet.ts.net",
      cookie: `userId=${owner}; profileId=${owner}`,
      userId: owner,
    });
    if (login !== null) request.headers.set("tailscale-user-login", login);
    try {
      expect(await createAuthenticatedApplicationContext()).toEqual({
        ok: false,
        error: "unauthenticated",
      });
      expect(await createAuthenticatedApplicationContext("write")).toEqual({
        ok: false,
        error: "unauthenticated",
      });
      expect(supabase.authenticate).not.toHaveBeenCalled();
    } finally {
      request.headers = saved;
    }
  });
});
