import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { expect, it } from "vitest";

const require = createRequire(import.meta.url);
it.each(["development", "production"])("实际环境文件与路径隔离：%s", (environment) => {
  // 临时测试文件保留，不自动执行文件删除。
  const directory = mkdtempSync(join(tmpdir(), "payroll-env-test-"));
  const productionFile = join(directory, "production.sqlite").replaceAll("\\", "/");
  writeFileSync(join(directory, ".env.development.local"), "DEV_ONLY=value\n", "utf8");
  writeFileSync(join(directory, ".env.production.local"), "DB_FILE=" + productionFile + "\n", "utf8");
  const childEnv = {
    ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("DB_") && !key.startsWith("__NEXT") && key !== "DEV_ONLY")),
    NODE_ENV: "test" as const,
  };
  const source = `
    import { loadDatabaseEnvironment } from ${JSON.stringify(resolve("scripts/environment.ts"))};
    import { readDbConfig } from ${JSON.stringify(resolve("db/config.ts"))};
    loadDatabaseEnvironment(${JSON.stringify(environment)}, ${JSON.stringify(directory)});
    console.log(JSON.stringify({filename: readDbConfig().filename, devOnly: process.env.DEV_ONLY}));
  `;
  const result = spawnSync(process.execPath, [require.resolve("tsx/cli"), "-e", source], { env: childEnv, encoding: "utf8" });
  expect(result.status, result.stderr).toBe(0);
  const loaded = JSON.parse(result.stdout.trim());
  expect(loaded.filename).toBe(environment === "development" ? join(tmpdir(), "payroll", "payroll.sqlite") : productionFile);
  expect(loaded.devOnly).toBe(environment === "development" ? "value" : undefined);
});

