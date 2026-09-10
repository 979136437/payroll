import { existsSync, readFileSync, mkdtempSync, mkdirSync, writeFileSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { readDbConfig } from "../db/config";
import { runMigrations } from "../scripts/migrations";
import * as schema from "../db/schema";
export const migrationFolder = resolve("drizzle/mysql57");
const local = resolve(".env.mysql-test.local");
const settings: Record<string, string | undefined> = existsSync(local)
  ? Object.fromEntries(readFileSync(local, "utf8").trim().split(/\r?\n/).map(line => {
    const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1)];
  })) : {};
// 仅接受显式测试配置，不加载开发或生产环境文件。
for (const key of ["HOST", "PORT", "USER", "PASSWORD"]) {
  if (process.env["TEST_MYSQL_" + key]) settings["DB_" + key] = process.env["TEST_MYSQL_" + key];
}
export const mysqlAvailable = ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD"].every(key => settings[key]);
export function fixtureFolder() {
  const folder = mkdtempSync(join(tmpdir(), "payroll-mysql-migrations-"));
  cpSync(migrationFolder, folder, { recursive: true });
  return folder;
}
export async function openFixture(migrated = true, folder = migrationFolder) {
  const config = readDbConfig({ ...settings, NODE_ENV: "test", DB_NAME: "payroll_test_" + randomUUID().replaceAll("-", "") });
  const admin = await mysql.createConnection({ ...config, database: undefined });
  try {
    // 名称来自 UUID 和固定前缀，测试结束保留数据库，不自动清理。
    await admin.query(`CREATE DATABASE \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`);
  } finally { await admin.end(); }
  const connection = await mysql.createConnection(config);
  try {
    if (migrated) await runMigrations(connection, folder);
    return { config, connection, db: drizzle(connection, { schema, mode: "default" }) };
  } catch (error) { await connection.end(); throw error; }
}
export async function seed(connection: mysql.Connection) {
  await connection.query("INSERT INTO persons(id,name,gender,created_at,updated_at) VALUES (7,'测试人员','男',1000,1000)");
  await connection.query("INSERT INTO payroll_sheets(id,name,created_at,updated_at) VALUES (8,'测试工资表',1000,1000)");
  await connection.query("INSERT INTO payroll_records(id,payroll_sheet_id,person_id,actual_amount,created_at,updated_at) VALUES (9,8,7,12345,1000,1000)");
}
export function commandFolder() {
  const root = mkdtempSync(join(tmpdir(), "payroll-mysql-command-"));
  mkdirSync(join(root, "drizzle"));
  cpSync(migrationFolder, join(root, "drizzle/mysql57"), { recursive: true });
  writeFileSync(join(root, ".env.production"), "");
  return root;
}