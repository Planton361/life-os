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
let synthetic:
  | {
      path: string;
      ownerId: string;
      store: import("../sqlite/runtime").SqliteRuntime;
    }
  | undefined;

export async function prepareApplicationRuntime() {
  const config = applicationRuntimeConfiguration();
  if (config.backend === "supabase") return;
  if (!synthetic) {
    const { verifySyntheticApplicationDatabase } =
      await import("../sqlite/synthetic-readiness");
    const { applicationRuntime } = await import("../sqlite/runtime");
    const verified = verifySyntheticApplicationDatabase(config.path);
    synthetic = {
      path: config.path,
      ownerId: verified.ownerId,
      store: applicationRuntime(config.path),
    };
  }
  if (synthetic.path !== config.path)
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
  if (!config.issueAuthentication)
    return { ok: false, error: "unauthenticated" };
  // No write-capable context exists before Origin/Host admission, even for a
  // valid synthetic owner. No cookie, query or form field is consulted here.
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
  if (!synthetic) throw new Error("SYNTHETIC_APPLICATION_RUNTIME_REQUIRED");
  const { issueOwnerContext } = await import("../sqlite/owner-context");
  const {
    sqliteApplicationRepositories,
    sqliteApplicationUseCases,
    sqliteApplicationScopes,
  } = await import("./sqlite-adapter");
  const owner = issueOwnerContext(synthetic.ownerId);
  const { sqliteApplicationReads } = await import("./sqlite-read-services");
  const repositories = admitApplicationRepositories(
    sqliteApplicationRepositories(synthetic.store, owner),
    access,
  );
  const useCases = admitRepository(
    sqliteApplicationUseCases(synthetic.store, owner),
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
    user: Object.freeze({ id: synthetic.ownerId }),
    repositories,
    data: Object.freeze({
      repositories,
      useCases,
      scopes: sqliteApplicationScopes(synthetic.store, owner),
      reads: sqliteApplicationReads(synthetic.store, owner),
    }),
  });
}
