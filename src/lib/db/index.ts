import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;
let sqliteInstance: Database.Database | null = null;
let testDbPath: string | null = null;

export function getDbPath(options?: { cwd?: string; dbPath?: string }): string {
  const explicitPath = options?.dbPath ?? testDbPath;
  if (explicitPath) {
    ensureParentDirectory(explicitPath);
    return explicitPath;
  }

  const cwd = options?.cwd ?? process.cwd();
  const configuredPath = process.env.SQLITE_DATABASE_PATH;
  if (configuredPath !== undefined) {
    const trimmedPath = configuredPath.trim();
    if (!trimmedPath) {
      throw new Error("SQLITE_DATABASE_PATH 不能为空");
    }

    const resolvedPath = path.isAbsolute(trimmedPath)
      ? trimmedPath
      : path.join(cwd, trimmedPath);
    ensureParentDirectory(resolvedPath);
    return resolvedPath;
  }

  const defaultPath = path.join(cwd, "data", "payroll.db");
  ensureParentDirectory(defaultPath);
  return defaultPath;
}

function ensureParentDirectory(filePath: string) {
  const directory = path.dirname(filePath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

export function initializeSchema(db: Database.Database) {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS personnel (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sort_index INTEGER NOT NULL DEFAULT 0,
      gender TEXT,
      ethnicity TEXT,
      native_place TEXT,
      id_card_number TEXT UNIQUE,
      payroll_card_number TEXT,
      bank_name TEXT,
      job_type TEXT,
      start_date TEXT,
      end_date TEXT,
      phone_number TEXT,
      remark TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payroll_sheet (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payroll_record (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payroll_sheet_id INTEGER NOT NULL,
      personnel_id INTEGER NOT NULL,
      export_weight INTEGER,
      attendance_days REAL,
      wage_standard REAL,
      gross_pay REAL,
      deduction_amount REAL,
      net_pay REAL NOT NULL,
      payee_signature TEXT,
      remark TEXT,
      updated_at TEXT NOT NULL,
      UNIQUE(payroll_sheet_id, personnel_id),
      FOREIGN KEY(payroll_sheet_id) REFERENCES payroll_sheet(id),
      FOREIGN KEY(personnel_id) REFERENCES personnel(id)
    );
  `);

  const columns = db
    .prepare("PRAGMA table_info(personnel)")
    .all() as { name: string }[];
  const hasSortIndex = columns.some((c) => c.name === "sort_index");
  if (!hasSortIndex) {
    db.exec(
      "ALTER TABLE personnel ADD COLUMN sort_index INTEGER NOT NULL DEFAULT 0"
    );
  }

  const prColumns = db
    .prepare("PRAGMA table_info(payroll_record)")
    .all() as { name: string }[];
  const hasExportWeight = prColumns.some((c) => c.name === "export_weight");
  if (!hasExportWeight) {
    db.exec("ALTER TABLE payroll_record ADD COLUMN export_weight INTEGER");
  }
}

export function getDb(options?: { dbPath?: string }) {
  if (!dbInstance) {
    const dbPath = getDbPath({ dbPath: options?.dbPath });
    const sqlite = new Database(dbPath);
    initializeSchema(sqlite);
    sqliteInstance = sqlite;
    dbInstance = drizzle(sqlite, { schema });
  }
  return dbInstance;
}

export function __resetDb() {
  sqliteInstance?.close();
  sqliteInstance = null;
  dbInstance = null;
}

export function __setTestDbPath(dbPath: string | null) {
  __resetDb();
  testDbPath = dbPath;
}

export function __clearTestDbPath() {
  __resetDb();
  testDbPath = null;
}

export function currentTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

export function normalizeOptionalString(
  value: string | null | undefined
): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}
