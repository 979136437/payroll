import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { expect, it } from "vitest";
const require = createRequire(import.meta.url);
it.each(["development", "production"])("环境文件隔离：%s", environment => {
  const directory = mkdtempSync(join(tmpdir(), "payroll-env-test-"));
  for (const name of ["development", "production"]) writeFileSync(join(directory, ".env." + name + ".local"),
    `DB_HOST=${name}.example.com\nDB_PORT=3306\nDB_NAME=payroll_测试\nDB_USER=test\nDB_PASSWORD=fixture\n`.replace("payroll_测试", "payroll_" + name));
  const source = `import { loadDatabaseEnvironment } from ${JSON.stringify(resolve("scripts/environment.ts"))};
    import { readDbConfig } from ${JSON.stringify(resolve("db/config.ts"))};
    loadDatabaseEnvironment(${JSON.stringify(environment)}, ${JSON.stringify(directory)});
    console.log(readDbConfig().host);`;
  const result = spawnSync(process.execPath, [require.resolve("tsx/cli"), "-e", source], {
    env: { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("DB_") && !key.startsWith("__NEXT"))), NODE_ENV: "test" },
    encoding: "utf8",
  });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout.trim()).toBe(environment + ".example.com");
});