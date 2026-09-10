import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { readDbConfig } from "./config";
import * as schema from "./schema";

export function createDbClient(config = readDbConfig()) {
  const connection = mysql.createPool({ ...config, waitForConnections: true, queueLimit: 10 });
  return { connection, db: drizzle(connection, { schema, mode: "default" }) };
}
type DbClient = ReturnType<typeof createDbClient>;
const cache = globalThis as typeof globalThis & { payrollMysql?: DbClient };
let productionClient: DbClient | undefined;
export function getDbClient() {
  // 连接池按需连接；开发热更新复用，导入模块不访问数据库。
  if (process.env.NODE_ENV !== "production") return (cache.payrollMysql ??= createDbClient());
  return (productionClient ??= createDbClient());
}

/** 就绪探针限制排队和查询总时间；超时后销毁连接，避免探针长期占用连接池。 */
export async function checkDatabase(timeout = 5000) {
  const pool = getDbClient().connection;
  let connection: mysql.PoolConnection | undefined;
  let expired = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      (async () => {
        const acquired = await pool.getConnection();
        if (expired) { acquired.release(); return; }
        connection = acquired;
        await connection.query({ sql: "SELECT 1", timeout });
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          expired = true;
          connection?.destroy();
          reject(new Error("数据库检查超时"));
        }, timeout);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    if (!expired) connection?.release();
  }
}