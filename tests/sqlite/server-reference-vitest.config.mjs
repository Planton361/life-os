import { fileURLToPath } from "node:url";
const config = {
  root: process.cwd(),
  resolve: {
    alias: {
      "server-only": fileURLToPath(
        new URL("./server-only-reference.mjs", import.meta.url),
      ),
    },
  },
  test: {
    include: [
      "src/features/real-data/supabase/repositories/supabase-education-repository.test.ts",
      "src/features/real-data/supabase/repositories/supabase-work-knowledge-repository.test.ts",
    ],
  },
};

export default config;
