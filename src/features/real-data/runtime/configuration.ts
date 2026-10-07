import "server-only";
import { assertNoRetiredProofConfiguration } from "../sqlite/runtime-configuration";

export type ApplicationRuntimeConfiguration =
  | Readonly<{ backend: "supabase" }>
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
    return Object.freeze({ backend: "supabase" });
  }
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
