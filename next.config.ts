import type { NextConfig } from "next";

const legacyEducationRoutes = [
  "/education/research-ideas",
  "/education/research-fields",
  "/education/research-notes",
  "/education/master-thesis",
] as const;

const disposableDistDir =
  process.env.LIFE_OS_E2E_RUNTIME === "DISPOSABLE" &&
  /^\.next-e2e-\d+-\d+$/.test(process.env.LIFE_OS_E2E_DIST_DIR ?? "")
    ? process.env.LIFE_OS_E2E_DIST_DIR
    : undefined;

const nextConfig: NextConfig = {
  // Next 16.2.2 supports this worker budget; recheck on framework upgrades.
  experimental: { cpus: 2 },
  ...(disposableDistDir
    ? {
        distDir: disposableDistDir,
        typescript: { tsconfigPath: `${disposableDistDir}.tsconfig.json` },
      }
    : {}),
  async redirects() {
    return legacyEducationRoutes.map((source) => ({
      source,
      destination: "/education/scientific-work",
      permanent: false,
    }));
  },
};

export default nextConfig;
