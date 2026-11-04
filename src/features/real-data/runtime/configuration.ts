import "server-only";
import { join } from "node:path";
import { assertNoRetiredProofConfiguration } from "../sqlite/runtime-configuration";

// Fixed, git-ignored location: the review runtime never opens another file.
export const reviewDatabasePath = (cwd = process.cwd()) =>
  join(cwd, ".local", "review", "life-os-review.db");

export type ApplicationRuntimeConfiguration =
  | Readonly<{ backend: "supabase" }>
  | Readonly<{
      backend: "sqlite-hosted";
      path: string;
      origin: string;
      ownerLogin: string;
    }>
  | Readonly<{
      backend: "sqlite-synthetic";
      path: string;
      origin: string;
      issueAuthentication: boolean;
    }>
  | Readonly<{ backend: "sqlite-review"; path: string; origin: string }>;

export function applicationRuntimeConfiguration(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): ApplicationRuntimeConfiguration {
  assertNoRetiredProofConfiguration(environment);
  const mode = environment.LIFE_OS_APPLICATION_RUNTIME;
  if (mode === undefined || mode === "supabase") {
    if (
      [
        "LIFE_OS_SYNTHETIC_SQLITE_PATH",
        "LIFE_OS_SYNTHETIC_ORIGIN",
        "LIFE_OS_SYNTHETIC_AUTH",
      ].some((key) => environment[key] !== undefined)
    )
      throw new Error("SYNTHETIC_CONFIGURATION_WITHOUT_SELECTOR");
    if (
      [
        "LIFE_OS_HOSTED_SQLITE_PATH",
        "LIFE_OS_HOSTED_ORIGIN",
        "LIFE_OS_HOSTED_OWNER_LOGIN",
      ].some((key) => environment[key] !== undefined)
    )
      throw new Error("HOSTED_CONFIGURATION_WITHOUT_SELECTOR");
    if (
      ["LIFE_OS_REVIEW_SQLITE_PATH", "LIFE_OS_REVIEW_ORIGIN"].some(
        (key) => environment[key] !== undefined,
      )
    )
      throw new Error("REVIEW_CONFIGURATION_WITHOUT_SELECTOR");
    return Object.freeze({ backend: "supabase" });
  }
  const hostedKeys = [
    "LIFE_OS_HOSTED_SQLITE_PATH",
    "LIFE_OS_HOSTED_ORIGIN",
    "LIFE_OS_HOSTED_OWNER_LOGIN",
  ];
  if (mode === "sqlite-hosted") {
    if (
      [
        "LIFE_OS_SYNTHETIC_SQLITE_PATH",
        "LIFE_OS_SYNTHETIC_ORIGIN",
        "LIFE_OS_SYNTHETIC_AUTH",
        "LIFE_OS_REVIEW_SQLITE_PATH",
        "LIFE_OS_REVIEW_ORIGIN",
      ].some((key) => environment[key] !== undefined)
    )
      throw new Error("MIXED_SQLITE_CONFIGURATION_DENIED");
    const path = environment.LIFE_OS_HOSTED_SQLITE_PATH;
    const origin = environment.LIFE_OS_HOSTED_ORIGIN;
    const ownerLogin = environment.LIFE_OS_HOSTED_OWNER_LOGIN;
    if (
      !path ||
      !origin ||
      !ownerLogin ||
      ownerLogin !== ownerLogin.trim() ||
      /[\s,\x00-\x1f]/.test(ownerLogin)
    )
      throw new Error("HOSTED_APPLICATION_CONFIGURATION_REQUIRED");
    const url = new URL(origin);
    if (
      url.origin !== origin ||
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !url.hostname.endsWith(".ts.net") ||
      url.port
    )
      throw new Error("HOSTED_APPLICATION_ORIGIN_INVALID");
    return Object.freeze({
      backend: "sqlite-hosted",
      path,
      origin,
      ownerLogin,
    });
  }
  if (hostedKeys.some((key) => environment[key] !== undefined))
    throw new Error("HOSTED_CONFIGURATION_WITHOUT_SELECTOR");
  const reviewKeys = ["LIFE_OS_REVIEW_SQLITE_PATH", "LIFE_OS_REVIEW_ORIGIN"];
  if (mode === "sqlite-review") {
    if (
      [
        "LIFE_OS_SYNTHETIC_SQLITE_PATH",
        "LIFE_OS_SYNTHETIC_ORIGIN",
        "LIFE_OS_SYNTHETIC_AUTH",
      ].some((key) => environment[key] !== undefined)
    )
      throw new Error("MIXED_SQLITE_CONFIGURATION_DENIED");
    // Local development review only; never a production or preview runtime.
    if (environment.NODE_ENV === "production")
      throw new Error("REVIEW_RUNTIME_PRODUCTION_DENIED");
    const path = environment.LIFE_OS_REVIEW_SQLITE_PATH;
    const origin = environment.LIFE_OS_REVIEW_ORIGIN;
    if (!path || !origin) throw new Error("REVIEW_APPLICATION_CONFIGURATION_REQUIRED");
    if (path !== reviewDatabasePath()) throw new Error("REVIEW_DATABASE_PATH_DENIED");
    const url = new URL(origin);
    if (
      url.origin !== origin ||
      url.protocol !== "http:" ||
      !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
    )
      throw new Error("REVIEW_APPLICATION_ORIGIN_INVALID");
    return Object.freeze({ backend: "sqlite-review", path, origin });
  }
  if (reviewKeys.some((key) => environment[key] !== undefined))
    throw new Error("REVIEW_CONFIGURATION_WITHOUT_SELECTOR");
  if (mode !== "sqlite-synthetic")
    throw new Error("APPLICATION_RUNTIME_SELECTOR_INVALID");
  const path = environment.LIFE_OS_SYNTHETIC_SQLITE_PATH;
  const origin = environment.LIFE_OS_SYNTHETIC_ORIGIN;
  const auth = environment.LIFE_OS_SYNTHETIC_AUTH;
  if (!path || !origin || (auth !== "issue" && auth !== "blocked"))
    throw new Error("SYNTHETIC_APPLICATION_CONFIGURATION_REQUIRED");
  const url = new URL(origin);
  if (
    url.origin !== origin ||
    url.username ||
    url.password ||
    !["http:", "https:"].includes(url.protocol) ||
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
  )
    throw new Error("SYNTHETIC_APPLICATION_ORIGIN_INVALID");
  return Object.freeze({
    backend: "sqlite-synthetic",
    path,
    origin,
    issueAuthentication: auth === "issue",
  });
}
