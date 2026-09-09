import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createDbClient } from "../db/client";
import { loadDatabaseEnvironment } from "./environment";

function main() {
  const [command, environment] = process.argv.slice(2);
  if (!["generate", "migrate", "check", "studio"].includes(command)) throw new Error("不支持的数据库命令");
  if (command === "studio" && environment !== "development") throw new Error("Studio 仅允许开发环境");
  loadDatabaseEnvironment(environment);
  if (command === "generate" || command === "studio") {
    const require = createRequire(import.meta.url);
    const kit = resolve(dirname(require.resolve("drizzle-kit")), "bin.cjs");
    const result = spawnSync(process.execPath, [kit, command], {
      stdio: "inherit", env: { ...process.env, DB_ENV: environment, DB_COMMAND: command },
    });
    if (result.error || result.status !== 0) throw new Error("Drizzle 命令执行失败");
    return;
  }
  const { connection, db } = createDbClient();
  try {
    db.get(sql`SELECT 1`);
    if (command === "check") {
      console.log("SQLite 连接检查成功");
      return;
    }
    const folder = resolve("drizzle");
    if (!existsSync(folder) || !readdirSync(folder).some((file) => file.endsWith(".sql"))) {
      console.log("连接成功，无待执行迁移");
      return;
    }
    migrate(db, { migrationsFolder: folder });
    console.log("SQLite 迁移完成");
  } finally {
    connection.close();
  }
}

try { main(); } catch {
  console.error("数据库操作失败，请检查运行环境、DB_FILE、目录权限及迁移文件");
  process.exitCode = 1;
}

