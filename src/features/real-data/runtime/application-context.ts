import "server-only";
import { headers } from "next/headers";
import { applicationRuntimeConfiguration } from "./configuration";
import {
  admitApplicationRepositories,
  type ApplicationRepositories,
} from "./repositories";
import type { SupabaseServerAuthError } from "@/lib/supabase/server";
import type { ApplicationUseCases } from "./use-cases";
import { admitRepository } from "./repositories";
import type { ApplicationReadServices } from "./read-services";

export type ApplicationScopes = Readonly<{
  ownsActiveGoal(userId: string, id: string): Promise<boolean>;
  ownsActiveProject(userId: string, id: string): Promise<boolean>;
}>;
export type ApplicationData = Readonly<{
  repositories: ApplicationRepositories;
  useCases: ApplicationUseCases;
  scopes: ApplicationScopes;
  reads: ApplicationReadServices;
}>;

export type AuthenticatedApplicationContext =
  | Readonly<{
      ok: true;
      user: Readonly<{ id: string }>;
      repositories: ApplicationRepositories;
      data: ApplicationData;
    }>
  | Readonly<{ ok: false; error: SupabaseServerAuthError }>;

// Trusted metadata is cached with the process-owned application runtime. It is
// never serialized or returned through an Action or a Client Component prop.
let sqlite:
  | {
      path: string;
      ownerId: string;
      store: import("../sqlite/runtime").SqliteRuntime;
    }
  | undefined;

export async function prepareApplicationRuntime() {
  const config = applicationRuntimeConfiguration();
  if (config.backend === "supabase") return;
  if (!sqlite) {
    const verified =
      config.backend === "sqlite-hosted"
        ? (
            await import("../sqlite/production-bootstrap")
          ).verifyProductionApplicationDatabase(config.path)
        : (
            await import("../sqlite/synthetic-readiness")
          ).verifySyntheticApplicationDatabase(config.path);
    const { applicationRuntime } = await import("../sqlite/runtime");
    sqlite = {
      path: config.path,
      ownerId: verified.ownerId,
      store: applicationRuntime(config.path),
    };
  }
  if (sqlite.path !== config.path)
    throw new Error("SQLITE_SINGLETON_PATH_CHANGED");
}

export async function createAuthenticatedApplicationContext(
  access: "read" | "write" = "read",
): Promise<AuthenticatedApplicationContext> {
  const config = applicationRuntimeConfiguration();
  if (config.backend === "supabase") {
    const { createAuthenticatedSupabaseServerClient } =
      await import("@/lib/supabase/server");
    const auth = await createAuthenticatedSupabaseServerClient();
    if (!auth.ok) return auth;
    const {
      supabaseApplicationRepositories,
      supabaseApplicationUseCases,
      supabaseApplicationScopes,
      supabaseApplicationReads,
    } = await import("./supabase-adapter");
    const repositories = admitApplicationRepositories(
      supabaseApplicationRepositories(auth.client, auth.user.id),
      access,
    );
    const useCases = admitRepository(
      supabaseApplicationUseCases(auth.client),
      access,
      [
        "getGoalOutcome",
        "getGoalOutcomeSummaries",
        "readProjectDepth",
        "readTaskDependencyGraph",
      ],
    );
    return Object.freeze({
      ok: true,
      user: Object.freeze({ id: auth.user.id }),
      repositories,
      data: Object.freeze({
        repositories,
        useCases,
        scopes: supabaseApplicationScopes(auth.client, auth.user.id),
        reads: supabaseApplicationReads(auth.client, auth.user.id),
      }),
    });
  }
  if (config.backend === "sqlite-synthetic" && !config.issueAuthentication)
    return { ok: false, error: "unauthenticated" };
  // No write-capable context exists before Origin/Host admission, even for a
  // valid SQLite owner. No cookie, query or form field is consulted here.
  if (access === "write") {
    const { assertBrowserWriteOrigin } =
      await import("../sqlite/request-boundary");
    try {
      assertBrowserWriteOrigin(new Headers(await headers()), config.origin);
    } catch {
      return { ok: false, error: "auth_error" };
    }
  }
  await prepareApplicationRuntime();
  if (!sqlite) throw new Error("SQLITE_APPLICATION_RUNTIME_REQUIRED");
  const { issueOwnerContext } = await import("../sqlite/owner-context");
  const {
    sqliteApplicationRepositories,
    sqliteApplicationUseCases,
    sqliteApplicationScopes,
  } = await import("./sqlite-adapter");
  const owner =
    config.backend === "sqlite-hosted"
      ? (await import("../sqlite/request-boundary")).authenticateGatewayRequest(
          new Headers(await headers()),
          { ...config, ownerId: sqlite.ownerId },
        )
      : issueOwnerContext(sqlite.ownerId);
  if (!owner) return { ok: false, error: "unauthenticated" };
  const { sqliteApplicationReads } = await import("./sqlite-read-services");
  const repositories = admitApplicationRepositories(
    sqliteApplicationRepositories(sqlite.store, owner),
    access,
  );
  const useCases = admitRepository(
    sqliteApplicationUseCases(sqlite.store, owner),
    access,
    [
      "getGoalOutcome",
      "getGoalOutcomeSummaries",
      "readProjectDepth",
      "readTaskDependencyGraph",
    ],
  );
  return Object.freeze({
    ok: true,
    user: Object.freeze({ id: sqlite.ownerId }),
    repositories,
    data: Object.freeze({
      repositories,
      useCases,
      scopes: sqliteApplicationScopes(sqlite.store, owner),
      reads: sqliteApplicationReads(sqlite.store, owner),
    }),
  });
}
