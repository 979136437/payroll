import path from "node:path";

import { defineConfig } from "drizzle-kit";

type ServerEnvInput = Partial<Record<"NODE_ENV" | "SQLITE_DATABASE_PATH", string>>;

type ServerEnv = {
  NODE_ENV: "development" | "production" | "test";
  SQLITE_DATABASE_PATH: string;
};

function readTrimmedValue(value: string | undefined, fallback: string): string {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    if (value === undefined) {
      return fallback;
    }

    throw new Error("Database path cannot be blank.");
  }

  return trimmedValue;
}

export function getServerEnv(input: ServerEnvInput = process.env): ServerEnv {
  const nodeEnv = input.NODE_ENV === "production" || input.NODE_ENV === "test" ? input.NODE_ENV : "development";

  return {
    NODE_ENV: nodeEnv,
    SQLITE_DATABASE_PATH: readTrimmedValue(input.SQLITE_DATABASE_PATH, path.join("data", "payroll.db")),
  };
}

export function resolveDrizzleDatabasePath(options?: { cwd?: string; envInput?: ServerEnvInput }) {
  const cwd = options?.cwd ?? process.cwd();
  const env = getServerEnv(options?.envInput);

  return path.isAbsolute(env.SQLITE_DATABASE_PATH)
    ? env.SQLITE_DATABASE_PATH
    : path.join(cwd, env.SQLITE_DATABASE_PATH);
}

export function createDrizzleConfig(options?: { cwd?: string; envInput?: ServerEnvInput }) {
  return defineConfig({
    dbCredentials: {
      url: resolveDrizzleDatabasePath(options),
    },
    dialect: "sqlite",
    out: "./drizzle",
    schema: "./src/lib/db/schema.ts",
  });
}

export default createDrizzleConfig();
