import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "features/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8", clean: false,
      include: ["db/config.ts", "db/client.ts", "scripts/environment.ts", "scripts/migrations.ts"],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
