import { defineConfig } from "drizzle-kit";
import { readDbConfig } from "./db/config";
import { loadDatabaseEnvironment } from "./scripts/environment";
loadDatabaseEnvironment(process.env.DB_ENV);
// 生成 SQL 不需要数据库凭据，也不会建立连接。
export default defineConfig({
  dialect: "mysql",
  schema: "./db/schema.ts",
  out: "./drizzle/mysql57",
  ...(process.env.DB_COMMAND === "generate" ? {} : { dbCredentials: readDbConfig() }),
});