import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import mysql, { type RowDataPacket, type Connection } from "mysql2/promise";
import { describe, expect, it } from "vitest";
import { DatabaseOperationError, describeDatabaseError, inspectMigrationState, readMigrationHistory, runMigrations, validateDatabaseVersion } from "../scripts/migrations";
import { fixtureFolder, migrationFolder, openFixture, mysqlAvailable, commandFolder } from "./database-fixtures";
const require = createRequire(import.meta.url);

describe("迁移文件校验", () => {
  it("读取 MySQL 历史", () => {
    expect(readMigrationHistory(migrationFolder)[0].hash).toMatch(/^[a-f0-9]{64}$/);
  });
  it.each(["缺目录","损坏日志","空历史","缺 SQL","空 SQL","错误方言","重复时间","跳号","重复标签","路径穿越"])("拒绝无效历史：%s", kind => {
    const folder = fixtureFolder();
    const path = join(folder,"meta/_journal.json");
    const journal = JSON.parse(readFileSync(path,"utf8"));
    if (kind === "空历史") journal.entries = [];
    if (kind === "缺 SQL") journal.entries[0].tag = "missing";
    if (kind === "错误方言") journal.dialect = "sqlite";
    if (kind === "跳号") journal.entries[0].idx = 3;
    if (kind === "路径穿越") journal.entries[0].tag = "../secret";
    if (kind === "重复时间" || kind === "重复标签") journal.entries.push({
      ...journal.entries[0], idx: journal.entries.length,
      tag: kind === "重复标签" ? journal.entries[0].tag : "duplicate_time",
      when: kind === "重复时间" ? journal.entries[0].when : journal.entries.at(-1).when + 1,
    });
    writeFileSync(path,kind === "损坏日志" ? "{" : JSON.stringify(journal));
    if (kind === "空 SQL") writeFileSync(join(folder,journal.entries[0].tag + ".sql")," ");
    expect(() => readMigrationHistory(kind === "缺目录" ? join(folder,"absent") : folder)).toThrow(DatabaseOperationError);
  });
  it.each(["5.6.51","5.7.8","8.0.15","10.11.1-MariaDB","未知"])("拒绝版本 %s", async version => {
    await expect(validateDatabaseVersion({ query: async () => [[{ version }]] } as unknown as Connection)).rejects.toThrow("MySQL");
  });
});
describe.skipIf(!mysqlAvailable)("真实迁移状态与命令", () => {
  it("空库、重复迁移、命名锁和哈希不一致", async () => {
    const { connection,config } = await openFixture(false);
    const history = readMigrationHistory(migrationFolder);
    try {
      expect((await inspectMigrationState(connection,history)).pending).toBe(history.length);
      const other = await mysql.createConnection(config);
      try {
        await other.query("SELECT GET_LOCK(CONCAT('payroll:',MD5(DATABASE())),0)");
        await expect(runMigrations(connection,migrationFolder)).rejects.toThrow("已有迁移");
      } finally { await other.end(); }
      await runMigrations(connection,migrationFolder);
      expect((await runMigrations(connection,migrationFolder)).pending).toBe(0);
      await connection.query("UPDATE __drizzle_migrations SET hash='不匹配'");
      await expect(inspectMigrationState(connection,history)).rejects.toThrow("完整前缀");
    } finally { await connection.end(); }
  });
  it("非空库拒绝初始化，DDL 部分失败保留标记并阻止重试", async () => {
    const { connection } = await openFixture(false);
    try {
      const folder = fixtureFolder();
      const tag = readMigrationHistory(folder)[0].tag;
      appendFileSync(join(folder,tag + ".sql"),"\n--> statement-breakpoint\nSELECT * FROM missing_failure_probe;\n");
      await expect(runMigrations(connection,folder)).rejects.toThrow();
      await expect(runMigrations(connection,folder)).rejects.toThrow("部分结构");
      const [tables] = await connection.query<RowDataPacket[]>("SHOW TABLES");
      expect(tables.length).toBeGreaterThan(1);
    } finally { await connection.end(); }
    const existing = await openFixture(false);
    try {
      await existing.connection.query("CREATE TABLE existing_data(id INT)");
      await expect(runMigrations(existing.connection,migrationFolder)).rejects.toThrow("独立空库");
    } finally { await existing.connection.end(); }
  });
  it("缺失表或触发器不能报告就绪", async () => {
    const { connection } = await openFixture();
    try {
      // 重命名保留数据，不删除业务表。
      await connection.query("RENAME TABLE payroll_records TO archived_records");
      await expect(inspectMigrationState(connection,readMigrationHistory(migrationFolder))).rejects.toThrow("必要业务表");
    } finally { await connection.end(); }
    const partial = await openFixture(false);
    try {
      const folder = fixtureFolder();
      const entry = readMigrationHistory(folder)[0];
      const path = join(folder,entry.tag + ".sql");
      const source = readFileSync(path,"utf8");
      writeFileSync(path,source.slice(0,source.lastIndexOf("--> statement-breakpoint",source.indexOf("-- 仅业务字段"))));
      // 此用例仅验证初始迁移缺少触发器，不执行依赖该触发器的后续迁移。
      const journalPath = join(folder, "meta/_journal.json");
      const journal = JSON.parse(readFileSync(journalPath, "utf8"));
      journal.entries = journal.entries.slice(0, 1);
      writeFileSync(journalPath, JSON.stringify(journal));
      await expect(runMigrations(partial.connection,folder)).rejects.toThrow("触发器");
    } finally { await partial.connection.end(); }
  });
  it("命令退出码、只读状态、缺配置和生成命令校验", async () => {
    const { connection,config } = await openFixture(false);
    await connection.end();
    const root = commandFolder();
    const run = (command:string,environment="production") => spawnSync(process.execPath,[require.resolve("tsx/cli"),resolve("scripts/database.ts"),command,environment], {
      cwd:root,encoding:"utf8",timeout:15000,
      env:{ ...process.env,NODE_ENV:"production",DB_HOST:config.host,DB_PORT:String(config.port),DB_USER:config.user,DB_PASSWORD:config.password,DB_NAME:config.database },
    });
    expect(run("check").stdout).toContain("不代表业务表");
    expect(run("status").status).toBe(1);
    const migrated = run("migrate");
    expect(migrated.status,migrated.stderr).toBe(0);
    expect(run("status").status).toBe(0);
    expect(run("migrate").stdout).toContain("无待执行迁移");
    for (const [command,env] of [["unknown","production"],["studio","production"],["check","staging"]]) expect(run(command,env).status).toBe(1);
  },30000);
});
describe("错误脱敏", () => {
  it("目标库不存在时给出可操作提示，且不泄露库名或误报 DDL", () => {
    const error = Object.assign(new Error("敏感库名"), { code: "ER_BAD_DB_ERROR" });
    const message = describeDatabaseError(new Error("敏感连接信息", { cause: error }));
    expect(message).toContain("数据库不存在");
    expect(message).toContain("DB_NAME");
    expect(message).not.toMatch(/敏感|DDL/);
    expect(describeDatabaseError(new Error("敏感配置"))).not.toContain("DDL");
  });
  it.each([["ECONNREFUSED","连接失败"],["ETIMEDOUT","连接失败"],["ER_ACCESS_DENIED_ERROR","权限不足"],["ER_DUP_ENTRY","约束冲突"],["OTHER","配置或执行失败"]])("%s", (code,category) => {
    const error = new Error("敏感参数",{ cause:Object.assign(new Error("密码"),{code}) });
    expect(describeDatabaseError(error)).toContain(category);
    expect(describeDatabaseError(error)).not.toMatch(/敏感参数|密码/);
  });
  it("未知异常不泄露内容", () => expect(describeDatabaseError("秘密")).not.toContain("秘密"));
});
