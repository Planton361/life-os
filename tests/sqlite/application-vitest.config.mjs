import { fileURLToPath } from "node:url";
const configuration = {
  root: process.cwd(),
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("../../src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./server-only-reference.mjs", import.meta.url),
      ),
    },
  },
  test: {
    include: [
      "src/features/real-data/runtime/**/*.test.ts",
      "src/features/real-data/sqlite/**/*.test.ts",
      "src/features/real-data/domain/**/*.test.ts",
      "src/features/real-data/schemas/**/*.test.ts",
      "src/features/entities/workbench/**/*.test.ts",
    ],
  },
};

export default configuration;
