import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// 独立统计新功能，不降低已有数据库逻辑的覆盖率门槛。
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["features/**/*.test.{ts,tsx}", "tests/table-selection.test.ts"],
    coverage: {
      provider: "v8", clean: false, reportsDirectory: "coverage/features",
      include: ["features/*/model/*.ts", "features/demo/initial-data.ts", "lib/table-selection.ts"],
      exclude: ["**/*.test.ts"],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
