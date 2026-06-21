import type { NextConfig } from "next";

const legacyEducationRoutes = [
  "/education/research-ideas",
  "/education/research-fields",
  "/education/research-notes",
  "/education/master-thesis",
] as const;

const nextConfig: NextConfig = {
  async redirects() {
    return legacyEducationRoutes.map((source) => ({
      source,
      destination: "/education/scientific-work",
      permanent: false,
    }));
  },
};

export default nextConfig;
