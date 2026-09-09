import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "../db/schema";

export const migrationFolder = resolve("drizzle");
export function fixtureFolder(initialOnly = false) {
  // 按项目约束保留隔离测试目录，不自动删除文件。
  const folder = mkdtempSync(join(tmpdir(), "payroll-integrity-"));
  mkdirSync(join(folder, "meta"));
  const journal = JSON.parse(readFileSync(join(migrationFolder, "meta/_journal.json"), "utf8"));
  if (initialOnly) journal.entries = journal.entries.slice(0, 1);
  for (const entry of journal.entries) writeFileSync(join(folder, entry.tag + ".sql"), readFileSync(join(migrationFolder, entry.tag + ".sql")));
  writeFileSync(join(folder, "meta/_journal.json"), JSON.stringify(journal));
  return folder;
}

export function openFixture(initialOnly = false, filename = ":memory:") {
  const connection = new Database(filename);
  connection.pragma("foreign_keys = ON");
  connection.pragma("recursive_triggers = ON");
  const db = drizzle(connection, { schema });
  migrate(db, { migrationsFolder: initialOnly ? fixtureFolder(true) : migrationFolder });
  return { connection, db };
}

export function seed(connection: Database.Database) {
  connection.prepare("INSERT INTO persons(id,name,gender,created_at,updated_at) VALUES (7, '测试人员', '男', 1000, 1000)").run();
  connection.prepare("INSERT INTO payroll_sheets(id,name,created_at,updated_at) VALUES (8, '测试工资表', 1000, 1000)").run();
  connection.prepare("INSERT INTO payroll_records(id,payroll_sheet_id,person_id,actual_amount,created_at,updated_at) VALUES (9,8,7,12345,1000,1000)").run();
}
