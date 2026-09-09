import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import Database from "better-sqlite3";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createDbClient } from "../db/client";
import { loadDatabaseEnvironment } from "./environment";
import { readDbConfig } from "../db/config";
import { DatabaseOperationError, describeDatabaseError, inspectMigrationState, readMigrationHistory } from "./migrations";

let stage = "参数与环境检查";

function main() {
  const [command, environment] = process.argv.slice(2);
  if (!["generate", "migrate", "check", "status", "studio"].includes(command)) throw new Error("不支持的数据库命令");
  if (command === "studio" && environment !== "development") throw new Error("Studio 仅允许开发环境");
  loadDatabaseEnvironment(environment);
  if (command === "generate" || command === "studio") {
    stage = "Drizzle 工具调用";
    const require = createRequire(import.meta.url);
    const kit = resolve(dirname(require.resolve("drizzle-kit")), "bin.cjs");
    const result = spawnSync(process.execPath, [kit, command], {
      stdio: "inherit", env: { ...process.env, DB_ENV: environment, DB_COMMAND: command },
    });
    if (result.error || result.status !== 0) throw new Error("Drizzle 命令执行失败");
    return;
  }
  const folder = resolve("drizzle");
  stage = "迁移文件检查";
  const history = command === "check" ? undefined : readMigrationHistory(folder);
  if (command === "status") {
    stage = "只读状态检查";
    // 不复用会创建目录、空库及切换 WAL 的应用连接工厂。
    const connection = new Database(readDbConfig().filename, { readonly: true, fileMustExist: true });
    try {
      const state = inspectMigrationState(connection, history!);
      if (state.pending) throw new DatabaseOperationError("存在待执行迁移", `还有 ${state.pending} 项迁移，请备份并停止并发写入后升级`);
      console.log("数据库状态正常：迁移历史、SQL 哈希及必要业务表检查通过");
    } finally { connection.close(); }
    return;
  }
  stage = "数据库连接";
  const { connection, db } = createDbClient();
  try {
    db.get(sql`SELECT 1`);
    if (command === "check") {
      console.log("SQLite 连接检查成功；此命令可能初始化空库，不代表业务表或迁移已就绪");
      return;
    }
    stage = "迁移历史检查";
    const state = inspectMigrationState(connection, history!);
    if (state.pending === 0) {
      console.log("迁移历史完整，无待执行迁移");
      return;
    }
    stage = "迁移事务执行";
    migrate(db, { migrationsFolder: folder });
    console.log("SQLite 迁移完成");
  } finally {
    connection.close();
  }
}

try { main(); } catch (error) {
  console.error(`数据库操作失败（阶段：${stage}）；${describeDatabaseError(error)}`);
  process.exitCode = 1;
}

