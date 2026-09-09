import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { expect, it } from "vitest";
import { createDbClient } from "../db/client";

it("SQLite SQL 迁移可执行且重复执行不会重复应用", () => {
  const directory = mkdtempSync(join(tmpdir(), "payroll-migration-test-"));
  mkdirSync(join(directory, "meta"));
  writeFileSync(join(directory, "meta", "_journal.json"), JSON.stringify({
    version: "7", dialect: "sqlite",
    entries: [{ idx: 0, version: "6", when: 1, tag: "0000_test", breakpoints: true }],
  }));
  writeFileSync(join(directory, "0000_test.sql"), "CREATE TABLE migration_probe (id INTEGER PRIMARY KEY);");
  const { connection, db } = createDbClient({ filename: join(directory, "test.sqlite") });
  try {
    migrate(db, { migrationsFolder: directory });
    migrate(db, { migrationsFolder: directory });
    expect(connection.prepare("SELECT count(*) AS count FROM __drizzle_migrations").get()).toEqual({ count: 1 });
    expect(connection.prepare("SELECT count(*) AS count FROM migration_probe").get()).toEqual({ count: 0 });
  } finally { connection.close(); }
});

