import Database from "better-sqlite3";
import path from "path";

import {
  __clearTestDbPath,
  __resetDb,
  __setTestDbPath,
  currentTimestamp,
  getDb,
  getDbPath,
  initializeSchema,
  normalizeOptionalString,
} from "@/lib/db";
import { createTempDbPath, cleanupTempDb } from "@/test/db-test-utils";

describe("lib/db", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    __resetDb();
    __clearTestDbPath();
  });

  test("normalizeOptionalString trims and normalizes blanks", () => {
    expect(normalizeOptionalString(undefined)).toBeNull();
    expect(normalizeOptionalString(null)).toBeNull();
    expect(normalizeOptionalString("  ")).toBeNull();
    expect(normalizeOptionalString(" hello ")).toBe("hello");
  });

  test("currentTimestamp returns unix seconds as string", () => {
    expect(currentTimestamp()).toMatch(/^\d+$/);
  });

  test("getDbPath uses temporary test database path when provided", () => {
    const dbPath = createTempDbPath("db-path");

    __setTestDbPath(dbPath);

    expect(getDbPath()).toBe(dbPath);

    cleanupTempDb(dbPath);
  });

  test("getDbPath respects configured runtime database path", () => {
    const cwd = path.join(process.cwd(), ".temp", "runtime-db-root");
    vi.stubEnv("SQLITE_DATABASE_PATH", path.join("storage", "runtime.db"));

    expect(getDbPath({ cwd })).toBe(
      path.join(cwd, "storage", "runtime.db")
    );
  });

  test("getDbPath rejects a blank configured database path", () => {
    vi.stubEnv("SQLITE_DATABASE_PATH", "   ");

    expect(() => getDbPath()).toThrow("SQLITE_DATABASE_PATH 不能为空");
  });

  test("getDb reuses connection until reset and initializes schema", () => {
    const dbPath = createTempDbPath("db-instance");

    __setTestDbPath(dbPath);

    const firstDb = getDb();
    const secondDb = getDb();

    expect(firstDb).toBe(secondDb);

    const sqlite = new Database(dbPath, { readonly: true });
    const tables = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as Array<{ name: string }>;
    sqlite.close();

    expect(tables.map((table) => table.name)).toEqual(
      expect.arrayContaining(["payroll_record", "payroll_sheet", "personnel"])
    );

    cleanupTempDb(dbPath);
  });

  test("initializeSchema can be called repeatedly", () => {
    const dbPath = createTempDbPath("db-schema");
    const sqlite = new Database(dbPath);

    initializeSchema(sqlite);
    initializeSchema(sqlite);

    const columns = sqlite
      .prepare("PRAGMA table_info(payroll_record)")
      .all() as Array<{ name: string }>;

    expect(columns.some((column) => column.name === "export_weight")).toBe(true);

    sqlite.close();
    cleanupTempDb(dbPath);
  });
});
