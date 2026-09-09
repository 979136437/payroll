import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { readDbConfig } from "./config";
import * as schema from "./schema";

export function createDbClient(config = readDbConfig()) {
  mkdirSync(dirname(config.filename), { recursive: true });
  const connection = new Database(config.filename, { timeout: 5000 });
  try {
    // WAL 允许查询与写入并行；FULL 保证工资数据事务提交时同步到持久存储。
    connection.pragma("journal_mode = WAL");
    connection.pragma("foreign_keys = ON");
    connection.pragma("synchronous = FULL");
    return { connection, db: drizzle(connection, { schema }) };
  } catch (error) {
    connection.close();
    throw error;
  }
}

type DbClient = ReturnType<typeof createDbClient>;
const cache = globalThis as typeof globalThis & { payrollSqlite?: DbClient };
let productionClient: DbClient | undefined;

export function getDbClient() {
  // 热更新会重新执行模块，开发连接保存在全局以避免重复打开文件。
  if (process.env.NODE_ENV !== "production") return (cache.payrollSqlite ??= createDbClient());
  return (productionClient ??= createDbClient());
}

