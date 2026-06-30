import path from "node:path";

import { createDrizzleConfig, getServerEnv, resolveDrizzleDatabasePath } from "./drizzle.config";

describe("drizzle.config", () => {
  test("getServerEnv falls back to development defaults", () => {
    expect(getServerEnv({})).toEqual({
      NODE_ENV: "development",
      SQLITE_DATABASE_PATH: path.join("data", "payroll.db"),
    });
  });

  test("getServerEnv trims provided database path", () => {
    expect(
      getServerEnv({
        NODE_ENV: "test",
        SQLITE_DATABASE_PATH: "  custom/test.db  ",
      })
    ).toEqual({
      NODE_ENV: "test",
      SQLITE_DATABASE_PATH: "custom/test.db",
    });
  });

  test("resolveDrizzleDatabasePath joins cwd for relative paths", () => {
    expect(
      resolveDrizzleDatabasePath({
        cwd: "C:/workspace/project",
        envInput: { SQLITE_DATABASE_PATH: "data/app.db" },
      })
    ).toBe(path.join("C:/workspace/project", "data/app.db"));
  });

  test("resolveDrizzleDatabasePath keeps absolute paths", () => {
    expect(
      resolveDrizzleDatabasePath({
        cwd: "C:/workspace/project",
        envInput: { SQLITE_DATABASE_PATH: "C:/data/app.db" },
      })
    ).toBe("C:/data/app.db");
  });

  test("createDrizzleConfig uses resolved sqlite url", () => {
    const config = createDrizzleConfig({
      cwd: "C:/workspace/project",
      envInput: { SQLITE_DATABASE_PATH: "db.sqlite" },
    });

    expect(config).toMatchObject({
      dialect: "sqlite",
      out: "./drizzle",
      schema: "./src/lib/db/schema.ts",
      dbCredentials: {
        url: path.join("C:/workspace/project", "db.sqlite"),
      },
    });
  });
});
