import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Connection, RowDataPacket } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { z } from "zod";

export class DatabaseOperationError extends Error {
  constructor(public readonly category: string, message: string) { super(message); }
}
const journalSchema = z.object({
  version: z.literal("7"), dialect: z.literal("mysql"),
  entries: z.array(z.object({
    idx: z.number().int().nonnegative(), version: z.literal("5"),
    when: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    tag: z.string().regex(/^[a-zA-Z0-9_-]+$/), breakpoints: z.boolean(),
  })).min(1),
});
export function readMigrationHistory(folder: string) {
  try {
    const journal = journalSchema.parse(JSON.parse(readFileSync(resolve(folder, "meta/_journal.json"), "utf8")));
    const tags = new Set<string>();
    return journal.entries.map((entry, index) => {
      if (entry.idx !== index || tags.has(entry.tag) || (index > 0 && entry.when <= journal.entries[index - 1].when)) throw new Error();
      tags.add(entry.tag);
      const sql = readFileSync(resolve(folder, entry.tag + ".sql"), "utf8");
      if (!sql.trim()) throw new Error();
      return { ...entry, hash: createHash("sha256").update(sql).digest("hex") };
    });
  } catch {
    throw new DatabaseOperationError("迁移文件无效", "请检查 MySQL 迁移目录、日志格式、顺序及 SQL 文件");
  }
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function validateDatabaseVersion(connection: Connection) {
  // const [rows] = await connection.query<RowDataPacket[]>("SELECT VERSION() AS version");
  // const version = String(rows[0].version);
  // const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  // const supported = match && ((Number(match[1]) === 5 && Number(match[2]) === 7 && Number(match[3]) >= 9) ||
  //   (Number(match[1]) === 8 && (Number(match[2]) > 0 || Number(match[3]) >= 16)));
  // if (!supported || /mariadb/i.test(version)) {
  //   throw new DatabaseOperationError("数据库版本不支持", "必须使用 MySQL 5.7.9 及以上的 5.7 版本，或 MySQL 8.0.16 及以上的 8.x 版本");
  // }
}
export const requiredTables = ["persons", "payroll_sheets", "payroll_records"];
export async function inspectMigrationState(connection: Connection, history: ReturnType<typeof readMigrationHistory>) {
  const [rows] = await connection.query<RowDataPacket[]>("SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()");
  const tables = new Set(rows.map(row => String(row.name)));
  if (tables.has("__payroll_migration_guard")) {
    const [dirty] = await connection.query<RowDataPacket[]>("SELECT id FROM __payroll_migration_guard");
    if (dirty.length) throw new DatabaseOperationError("迁移未完成", "之前的迁移可能留下部分结构；请核对并恢复，禁止直接重试或清空业务库");
  }
  const [applied] = tables.has("__drizzle_migrations")
    ? await connection.query<RowDataPacket[]>("SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at")
    : [[]];
  if (applied.length > history.length || applied.some((row, index) => Number(row.created_at) !== history[index].when || row.hash !== history[index].hash)) {
    throw new DatabaseOperationError("迁移历史不一致", "已应用历史必须是当前 SQL 哈希和时间的完整前缀；不得改写历史");
  }
  if (applied.length === 0 && [...tables].some(name => !["__drizzle_migrations", "__payroll_migration_guard"].includes(name))) {
    throw new DatabaseOperationError("目标库非空", "首次迁移需要独立空库；检测到已有表，未覆盖数据");
  }
  if (applied.length > 0) {
    const missingTables = requiredTables.filter(name => !tables.has(name));
    if (missingTables.length) {
      throw new DatabaseOperationError("业务结构缺失", `必要业务表缺失：${missingTables.join("、")}`);
    }

  }
  return { applied: applied.length, pending: history.length - applied.length };
}
export async function runMigrations(connection: Connection, folder: string) {
  const history = readMigrationHistory(folder);
  await validateDatabaseVersion(connection);
  // 命名锁属于单连接；哈希缩短锁名，并隔离不同业务库。
  const [locked] = await connection.query<RowDataPacket[]>("SELECT GET_LOCK(CONCAT('payroll:', MD5(DATABASE())), 0) AS acquired");
  if (Number(locked[0].acquired) !== 1) throw new DatabaseOperationError("数据库占用", "已有迁移正在运行，请稍后重试");
  try {
    const state = await inspectMigrationState(connection, history);
    if (!state.pending) return state;
    await connection.query("CREATE TABLE IF NOT EXISTS __payroll_migration_guard (id INT PRIMARY KEY) ENGINE=InnoDB");
    // MySQL DDL 隐式提交，持久标记确保中断后不会误报可安全重试。
    await connection.query("INSERT INTO __payroll_migration_guard (id) VALUES (1)");
    await migrate(drizzle(connection), { migrationsFolder: folder });
    await connection.query("DELETE FROM __payroll_migration_guard WHERE id = 1");
    return await inspectMigrationState(connection, history);
  } finally {
    await connection.query("SELECT RELEASE_LOCK(CONCAT('payroll:', MD5(DATABASE())))");
  }
}
export function describeDatabaseError(error: unknown): string {
  console.error(error);
  if (error instanceof DatabaseOperationError) return `类别：${error.category}；${error.message}`;
  const causes: unknown[] = [error];
  for (let index = 0; index < causes.length && index < 5; index++) {
    const current = causes[index];
    if (!(current instanceof Error)) continue;
    const code = (current as Error & { code?: string }).code;
    if (code === "ER_BAD_DB_ERROR") return "类别：数据库不存在；请核对对应环境的 DB_NAME，或先在 MySQL 控制台创建目标数据库";
    if (["ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "PROTOCOL_CONNECTION_LOST"].includes(code ?? "")) return "类别：连接失败；请检查地址、端口、网络和数据库服务";
    if (["ER_ACCESS_DENIED_ERROR", "ER_DBACCESS_DENIED_ERROR"].includes(code ?? "")) return "类别：权限不足；请检查账号和目标库权限";
    if (["ER_DUP_ENTRY", "ER_SIGNAL_EXCEPTION", "ER_CHECK_CONSTRAINT_VIOLATED", "ER_NO_REFERENCED_ROW_2", "ER_ROW_IS_REFERENCED_2"].includes(code ?? "")) return "类别：约束冲突；请核对输入";
    if (current.cause) causes.push(current.cause);
  }
  return "类别：配置或执行失败；请检查 DB_* 配置和命令参数，未输出敏感详情";
}
