import path from "node:path";
import { defineConfig } from "vitest/config";

const alias = {
  "@": path.resolve(__dirname, "./src"),
};

const coverageConfig = {
  provider: "v8" as const,
  reporter: ["text", "html"],
  include: ["src/**/*.{ts,tsx}", "drizzle.config.ts"],
  exclude: [
    "**/*.d.ts",
    "**/*.test.{ts,tsx}",
    "src/components/ui/**",
    "src/app/layout.tsx",
    "src/app/globals.css",
    "src/test/**",
  ],
  thresholds: {
    statements: 80,
    branches: 70,
    functions: 80,
    lines: 80,
    "src/lib/services/**": {
      statements: 95,
      branches: 85,
      functions: 95,
      lines: 95,
    },
    "src/app/api/**": {
      statements: 95,
      branches: 85,
      functions: 95,
      lines: 95,
    },
    "src/lib/api.ts": {
      statements: 95,
      branches: 85,
      functions: 95,
      lines: 95,
    },
  },
};

export default defineConfig({
  resolve: {
    alias,
  },
  test: {
    coverage: coverageConfig,
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          globals: true,
          include: ["drizzle.config.test.ts", "src/**/*.test.ts"],
          exclude: ["src/**/*.test.tsx"],
          setupFiles: ["./src/test/setup.node.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "jsdom",
          environment: "jsdom",
          globals: true,
          include: ["src/**/*.test.tsx"],
          setupFiles: ["./src/test/setup.ts"],
        },
      },
    ],
  },
});
