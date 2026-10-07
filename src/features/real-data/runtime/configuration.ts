import "server-only";
import { assertNoRetiredProofConfiguration } from "../sqlite/runtime-configuration";

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
    }>;

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
