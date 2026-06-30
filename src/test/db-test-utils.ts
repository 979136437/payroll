import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  __clearTestDbPath,
  __resetDb,
  __setTestDbPath,
} from "@/lib/db";

export function createTempDbPath(prefix = "payroll-vitest") {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
  return path.join(tempDir, "payroll.db");
}

export function useTempDb(prefix?: string) {
  const dbPath = createTempDbPath(prefix);
  __setTestDbPath(dbPath);
  return dbPath;
}

export function cleanupTempDb(dbPath: string) {
  __resetDb();
  __clearTestDbPath();

  const directory = path.dirname(dbPath);
  fs.rmSync(directory, { force: true, recursive: true });
}
