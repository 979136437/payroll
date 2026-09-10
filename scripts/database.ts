import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import mysql from "mysql2/promise";
import { loadDatabaseEnvironment } from "./environment";
import { readDbConfig } from "../db/config";
import { DatabaseOperationError, describeDatabaseError, inspectMigrationState, readMigrationHistory, runMigrations, validateDatabaseVersion } from "./migrations";

let stage = "参数与环境检查";
async function main() {
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
  stage = "迁移文件检查";
  const folder = resolve("drizzle/migrations");
  const history = command === "check" ? undefined : readMigrationHistory(folder);
  stage = "数据库连接";
  const connection = await mysql.createConnection(readDbConfig());
  try {
    await connection.query({ sql: "SELECT 1", timeout: 5000 });
    if (command === "check") {
      console.log("MySQL 连接检查成功；不代表业务表或迁移已就绪");
      return;
    }
    stage = "数据库版本检查";
    await validateDatabaseVersion(connection);
    if (command === "status") {
      stage = "只读状态检查";
      const state = await inspectMigrationState(connection, history!);
      if (state.pending) throw new DatabaseOperationError("存在待执行迁移", `还有 ${state.pending} 项迁移`);
      console.log("数据库状态正常：迁移历史、SQL 哈希、业务表及触发器检查通过");
    } else {
      stage = "迁移执行";
      await runMigrations(connection, folder);
      console.log("MySQL 迁移完成，无待执行迁移");
    }
  } finally { await connection.end(); }
}
main().catch(error => {
  console.error(`数据库操作失败（阶段：${stage}）；${describeDatabaseError(error)}`);
  // 只读检查不会执行 DDL，只有进入迁移阶段才提示部分生效风险。
  if (stage === "迁移执行") console.error("迁移 DDL 可能已部分生效；请核对迁移状态后再处理，禁止直接清库重试");
  process.exitCode = 1;
});
