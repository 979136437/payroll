import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { DatabaseOperationError, describeDatabaseError, inspectMigrationState, readMigrationHistory } from "../scripts/migrations";
import { fixtureFolder, migrationFolder, openFixture, seed } from "./database-fixtures";

const require = createRequire(import.meta.url);
function commandFixture() {
  const root = mkdtempSync(join(tmpdir(), "payroll-command-"));
  cpSync(migrationFolder, join(root, "drizzle"), { recursive: true });
  const filename = join(root, "database.sqlite");
  return { root, filename, run(command: string, environment = "production") {
    return spawnSync(process.execPath, [require.resolve("tsx/cli"), resolve("scripts/database.ts"), command, environment], {
      cwd: root, encoding: "utf8", timeout: 15000,
      env: { ...process.env, DB_FILE: filename, NODE_ENV: "production" },
    });
  } };
}

describe("迁移文件校验", () => {
  it("读取真实历史及哈希", () => {
    const history = readMigrationHistory(migrationFolder);
    expect(history).toHaveLength(2);
    expect(history[0].hash).toMatch(/^[a-f0-9]{64}$/);
  });
  it.each(["缺目录", "损坏日志", "空历史", "缺 SQL", "空 SQL", "错误方言", "重复时间", "跳号", "重复标签", "路径穿越"])("拒绝无效历史：%s", kind => {
    const folder = fixtureFolder();
    const journalPath = join(folder, "meta/_journal.json");
    const journal = JSON.parse(readFileSync(journalPath, "utf8"));
    if (kind === "空历史") journal.entries = [];
    if (kind === "缺 SQL") journal.entries[0].tag = "missing";
    if (kind === "错误方言") journal.dialect = "postgresql";
    if (kind === "重复时间") journal.entries[1].when = journal.entries[0].when;
    if (kind === "跳号") journal.entries[1].idx = 3;
    if (kind === "重复标签") journal.entries[1].tag = journal.entries[0].tag;
    if (kind === "路径穿越") journal.entries[0].tag = "../private";
    writeFileSync(journalPath, kind === "损坏日志" ? "{敏感测试内容" : JSON.stringify(journal));
    if (kind === "空 SQL") writeFileSync(join(folder, journal.entries[0].tag + ".sql"), " \n");
    expect(() => readMigrationHistory(kind === "缺目录" ? join(folder, "absent") : folder)).toThrow(DatabaseOperationError);
  });
});

describe("已应用历史与必要业务表", () => {
  it.each(["空库", "待升级", "完整", "错误哈希", "错误时间", "超前历史", "缺表"])("检查状态：%s", kind => {
    const history = readMigrationHistory(migrationFolder);
    const connection = kind === "空库" ? new Database(":memory:") : openFixture(kind === "待升级").connection;
    try {
      if (kind === "错误哈希") connection.exec("UPDATE __drizzle_migrations SET hash='不同内容'");
      if (kind === "错误时间") connection.exec("UPDATE __drizzle_migrations SET created_at=1");
      if (kind === "超前历史") connection.exec("INSERT INTO __drizzle_migrations(hash,created_at) VALUES ('未知历史',9999999999999)");
      if (kind === "缺表") connection.exec("ALTER TABLE payroll_records RENAME TO missing_records");
      if (["错误哈希", "错误时间", "超前历史", "缺表"].includes(kind)) expect(() => inspectMigrationState(connection, history)).toThrow(DatabaseOperationError);
      else expect(inspectMigrationState(connection, history).pending).toBe(kind === "空库" ? 2 : kind === "待升级" ? 1 : 0);
    } finally { connection.close(); }
  });
});

describe("命令退出码与只读状态检查", () => {
  it("缺库检查不创建文件，迁移后状态成功，再次迁移报告无待执行项", () => {
    const fixture = commandFixture();
    expect(fixture.run("status").status).toBe(1);
    expect(existsSync(fixture.filename)).toBe(false);
    const migrated = fixture.run("migrate");
    expect(migrated.status, migrated.stderr).toBe(0);
    const before = readFileSync(fixture.filename);
    expect(fixture.run("status").status).toBe(0);
    expect(readFileSync(fixture.filename)).toEqual(before);
    expect(fixture.run("migrate").stdout).toContain("无待执行迁移");
  });
  it("连接检查可创建空库但不误报业务就绪", () => {
    const fixture = commandFixture();
    const result = fixture.run("check");
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("不代表业务表或迁移已就绪");
    expect(fixture.run("status").status).toBe(1);
  });
  it.each(["缺 SQL", "损坏日志", "空历史"])("无效迁移文件在打开数据库前失败：%s", kind => {
    const fixture = commandFixture();
    const path = join(fixture.root, "drizzle/meta/_journal.json");
    const journal = JSON.parse(readFileSync(path, "utf8"));
    if (kind === "缺 SQL") journal.entries[0].tag = "missing";
    if (kind === "空历史") journal.entries = [];
    writeFileSync(path, kind === "损坏日志" ? "损坏日志" : JSON.stringify(journal));
    const result = fixture.run("migrate");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("迁移文件检查");
    expect(result.stderr).not.toContain(fixture.root);
    expect(existsSync(fixture.filename)).toBe(false);
  });
  it.each(["待升级", "哈希不一致", "缺表", "旧数据非法"])("异常状态或迁移返回非零：%s", kind => {
    const fixture = commandFixture();
    const { connection } = openFixture(kind === "待升级" || kind === "旧数据非法", fixture.filename);
    if (kind === "哈希不一致") connection.exec("UPDATE __drizzle_migrations SET hash='敏感测试内容'");
    if (kind === "缺表") connection.exec("ALTER TABLE payroll_records RENAME TO missing_records");
    if (kind === "旧数据非法") { seed(connection); connection.exec("UPDATE payroll_records SET actual_amount='敏感测试内容'"); }
    connection.close();
    const result = fixture.run(kind === "旧数据非法" ? "migrate" : "status");
    expect(result.status).toBe(1);
    expect(result.stderr).not.toContain("敏感测试内容");
    expect(result.stderr).not.toContain(fixture.root);
    if (kind === "旧数据非法") expect(result.stderr).toContain("旧数据金额无效");
  });
  it.each([["unknown", "production"], ["studio", "production"], ["check", "staging"]])("拒绝无效命令或环境 %s %s", (command, environment) => {
    expect(commandFixture().run(command, environment).status).toBe(1);
  });
  it("缺迁移目录不能报告成功", () => {
    const root = mkdtempSync(join(tmpdir(), "payroll-missing-"));
    mkdirSync(join(root, "meta"));
    expect(() => readMigrationHistory(root)).toThrow(/迁移目录/);
  });
});

describe("脱敏错误分类", () => {
  it.each([
    ["SQLITE_BUSY", "数据库占用"], ["SQLITE_LOCKED", "数据库占用"],
    ["SQLITE_CANTOPEN", "文件访问失败"], ["EACCES", "文件访问失败"],
    ["SQLITE_CONSTRAINT_CHECK", "约束冲突"], ["SQLITE_ERROR", "配置或执行失败"],
  ])("固定错误码 %s 不泄露原始内容", (code, expected) => {
    const error = Object.assign(new Error("身份证和路径等敏感内容"), { code });
    const result = describeDatabaseError(new Error("包含绑定参数", { cause: error }));
    expect(result).toContain(expected);
    expect(result).not.toMatch(/敏感内容|绑定参数/);
  });
  it("未知异常不直接输出", () => {
    expect(describeDatabaseError("秘密")).not.toContain("秘密");
    expect(describeDatabaseError(new Error("秘密"))).not.toContain("秘密");
  });
});
